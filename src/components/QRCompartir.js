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

// QR con el patrón estándar de cuadrados duros (el renderer SVG de la
// librería, vectorial — no pixela al imprimir grande). El logo va en una
// placa cuadrada con marco negro en el centro, con el mismo lenguaje
// visual que los "ojos" de las esquinas del propio QR (cuadrado negro con
// un cuadrado blanco adentro), en vez de una píldora o pegatina aparte.
async function generarQrConLogo(url) {
  const [svgStr, logo] = await Promise.all([
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 2, color: { dark: "#000000", light: "#FFFFFF" } }),
    extraerLetrasPng(),
  ]);

  const w = Number(svgStr.match(/viewBox="0 0 ([\d.]+) [\d.]+"/)[1]);

  const S = w * 0.32; // lado de la placa cuadrada
  const border = S * 0.06; // grosor del marco negro
  const bx = (w - S) / 2, by = (w - S) / 2;
  const inner = S - border * 2;
  const escala = Math.min((inner * 0.82) / logo.w, (inner * 0.82) / logo.h);
  const logoW = logo.w * escala, logoH = logo.h * escala;
  const lx = bx + (S - logoW) / 2, ly = by + (S - logoH) / 2;

  const overlay = `<rect x="${bx}" y="${by}" width="${S}" height="${S}" fill="#000"/>` +
    `<rect x="${bx + border}" y="${by + border}" width="${inner}" height="${inner}" fill="#fff"/>` +
    `<image x="${lx}" y="${ly}" width="${logoW}" height="${logoH}" href="${logo.dataUrl}"/>`;
  const composed = svgStr.replace("</svg>", overlay + "</svg>");
  return `data:image/svg+xml,${encodeURIComponent(composed)}`;
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
