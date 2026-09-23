import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { C } from "../lib/constants.js";
import { Btn } from "./UI.js";

const LOGO_SRC = "/dexon-mark.svg";
const LOGO_RASTER_SIZE = 240; // resolución del logo embebido, independiente del tamaño de impresión del SVG

// El isotipo viene como un cuadrado negro con "dexon" recortado en negativo.
// Para dejar solo las letras en negro sólido (sin el cuadrado) se rellena un
// canvas de negro y se "borra" con el isotipo como máscara — queda
// únicamente el trazo de las letras, con fondo transparente.
function extraerLetrasPng() {
  return new Promise((resolve, reject) => {
    const logo = new Image();
    logo.onload = () => {
      const tmp = document.createElement("canvas");
      tmp.width = LOGO_RASTER_SIZE; tmp.height = LOGO_RASTER_SIZE;
      const tctx = tmp.getContext("2d");
      tctx.fillStyle = "#000";
      tctx.fillRect(0, 0, LOGO_RASTER_SIZE, LOGO_RASTER_SIZE);
      tctx.globalCompositeOperation = "destination-out";
      tctx.drawImage(logo, 0, 0, LOGO_RASTER_SIZE, LOGO_RASTER_SIZE);
      resolve(tmp.toDataURL("image/png"));
    };
    logo.onerror = reject;
    logo.src = LOGO_SRC;
  });
}

// QR como SVG vectorial (no pixela al imprimirlo grande) con el logo
// embebido como una pequeña imagen dentro del mismo SVG.
async function generarQrConLogo(url) {
  const [svgStr, logoPng] = await Promise.all([
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 2, color: { dark: "#000000", light: "#FFFFFF" } }),
    extraerLetrasPng(),
  ]);

  const w = Number(svgStr.match(/viewBox="0 0 ([\d.]+) [\d.]+"/)[1]);
  const logoSize = w * 0.2;
  const boxSize = logoSize + w * 0.0417;
  const bx = (w - boxSize) / 2, by = bx;
  const lx = (w - logoSize) / 2, ly = lx;

  const overlay = `<rect x="${bx}" y="${by}" width="${boxSize}" height="${boxSize}" fill="#fff"/><image x="${lx}" y="${ly}" width="${logoSize}" height="${logoSize}" href="${logoPng}"/>`;
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
