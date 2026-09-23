import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { C } from "../lib/constants.js";
import { Btn } from "./UI.js";

const LOGO_SRC = "/dexon-mark.svg";
const LOGO_RASTER_SIZE = 320; // resolución del logo embebido, independiente del tamaño de impresión del SVG

// El isotipo viene como un cuadrado negro (1024x1024) con "dexon" recortado
// en negativo, pero el trazo real del wordmark es ancho y bajo — ocupa solo
// una franja angosta en el medio del cuadrado. Se rellena un canvas de negro
// y se "borra" con el isotipo como máscara (queda el trazo en negro sólido,
// fondo transparente), y después se recorta al bounding box real del trazo
// para no arrastrar el margen vacío del cuadrado original.
function extraerLetrasPng() {
  return new Promise((resolve, reject) => {
    const logo = new Image();
    logo.onload = () => {
      const raw = document.createElement("canvas");
      raw.width = LOGO_RASTER_SIZE; raw.height = LOGO_RASTER_SIZE;
      const rctx = raw.getContext("2d");
      rctx.fillStyle = "#000";
      rctx.fillRect(0, 0, LOGO_RASTER_SIZE, LOGO_RASTER_SIZE);
      rctx.globalCompositeOperation = "destination-out";
      rctx.drawImage(logo, 0, 0, LOGO_RASTER_SIZE, LOGO_RASTER_SIZE);

      const { data } = rctx.getImageData(0, 0, LOGO_RASTER_SIZE, LOGO_RASTER_SIZE);
      let minX = LOGO_RASTER_SIZE, minY = LOGO_RASTER_SIZE, maxX = 0, maxY = 0;
      for (let y = 0; y < LOGO_RASTER_SIZE; y++) {
        for (let x = 0; x < LOGO_RASTER_SIZE; x++) {
          if (data[(y * LOGO_RASTER_SIZE + x) * 4 + 3] > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const pad = Math.round(LOGO_RASTER_SIZE * 0.02);
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(LOGO_RASTER_SIZE - 1, maxX + pad); maxY = Math.min(LOGO_RASTER_SIZE - 1, maxY + pad);
      const cw = maxX - minX + 1, ch = maxY - minY + 1;

      const cropped = document.createElement("canvas");
      cropped.width = cw; cropped.height = ch;
      cropped.getContext("2d").drawImage(raw, minX, minY, cw, ch, 0, 0, cw, ch);
      resolve({ dataUrl: cropped.toDataURL("image/png"), w: cw, h: ch });
    };
    logo.onerror = reject;
    logo.src = LOGO_SRC;
  });
}

// Un módulo cae dentro de alguno de los tres "ojos" (patrones de esquina,
// 7x7 módulos) si se lo dibuja aparte, redondeado, en vez de como punto.
function esOjo(row, col, size) {
  const enEsquina = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7;
  return enEsquina(row, col) || enEsquina(row, col - (size - 7)) || enEsquina(row - (size - 7), col);
}

function ojo(r0, c0) {
  return `<rect x="${c0}" y="${r0}" width="7" height="7" rx="1.6" fill="#000"/>` +
    `<rect x="${c0 + 1}" y="${r0 + 1}" width="5" height="5" rx="1.2" fill="#fff"/>` +
    `<rect x="${c0 + 2}" y="${r0 + 2}" width="3" height="3" rx="0.8" fill="#000"/>`;
}

// QR dibujado módulo por módulo con esquinas suavizadas (no el patrón
// estándar de cuadrados duros), con los tres ojos de las esquinas también
// redondeados — para que se sienta diseñado junto con la píldora del logo,
// no una pegatina genérica encima. Los módulos casi no pierden área
// respecto a un cuadrado normal (solo se suavizan las esquinas): se probó
// con puntos/círculos de verdad y perdían tanta área que, cerca del logo,
// dejaban de decodificar — el redondeo tiene que ser sutil, no un punto.
// Sigue siendo SVG vectorial (no pixela al imprimir grande), con el logo
// embebido como imagen chica adentro.
async function generarQrConLogo(url) {
  const [qr, logo] = await Promise.all([
    QRCode.create(url, { errorCorrectionLevel: "H" }),
    extraerLetrasPng(),
  ]);

  const size = qr.modules.size;
  const margin = 2;
  const w = size + margin * 2;
  const moduleRx = 0.22; // radio de esquina de cada módulo, en unidades de módulo

  let modules = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!qr.modules.get(row, col) || esOjo(row, col, size)) continue;
      modules += `<rect x="${col + margin}" y="${row + margin}" width="1" height="1" rx="${moduleRx}"/>`;
    }
  }

  const eyes = ojo(margin, margin) + ojo(margin, margin + size - 7) + ojo(margin + size - 7, margin);

  // El recuadro blanco no puede ser muy ancho aunque el área total sea baja:
  // una franja angosta que cruza gran parte del QR daña más módulos de los
  // que tolera la corrección de errores que un bloque compacto de igual
  // área. Se fija el ancho del recuadro y se deriva el resto del wordmark
  // ya recortado (que es ancho y bajo).
  const padXRatio = 0.14, padYRatio = 0.3;
  const bw = w * 0.4;
  const logoW = bw / (1 + padXRatio * 2);
  const logoH = logoW * (logo.h / logo.w);
  const bh = logoH * (1 + padYRatio * 2);
  const lx = (w - logoW) / 2, ly = (w - logoH) / 2;
  const bx = (w - bw) / 2, by = (w - bh) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" shape-rendering="crispEdges">` +
    `<rect width="${w}" height="${w}" fill="#fff"/>` +
    `<g fill="#000">${modules}</g>` +
    eyes +
    `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="#fff"/>` +
    `<image x="${lx}" y="${ly}" width="${logoW}" height="${logoH}" href="${logo.dataUrl}"/>` +
    `</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export default function QRCompartir({ path, descripcion, filename = "qr.svg" }) {
  const url = `${window.location.origin}${path}`;
  const [dataUrl, setDataUrl] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setDataUrl(null);
    generarQrConLogo(url).then(d => { if (!cancelado) setDataUrl(d); }).catch(() => { if (!cancelado) setDataUrl(null); });
    return () => { cancelado = true; };
  }, [url]);

  const copiar = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); });
  };

  const descargar = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl; a.download = filename; a.click();
  };

  return <div style={{ textAlign: "center" }}>
    {descripcion && <div style={{ fontSize: 12, color: C.t2, marginBottom: 14, lineHeight: 1.5 }}>{descripcion}</div>}
    <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "inline-block", marginBottom: 14 }}>
      {dataUrl
        ? <img src={dataUrl} alt="Código QR" style={{ width: 220, height: 220, display: "block" }} />
        : <div style={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>Generando...</div>}
    </div>
    <div style={{ fontSize: 12, color: C.t3, wordBreak: "break-all", marginBottom: 14 }}>{url}</div>
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
      <Btn v="ghost" onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar link"}</Btn>
      <Btn v="ghost" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Abrir</Btn>
      <Btn v="primary" onClick={descargar} disabled={!dataUrl}>Descargar QR (SVG)</Btn>
    </div>
  </div>;
}
