import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { C } from "../lib/constants.js";
import { Btn } from "./UI.js";

const LOGO_SRC = "/dexon-mark.svg";
const SIZE = 480;

function generarQrConLogo(url) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, url, { width: SIZE, margin: 2, errorCorrectionLevel: "H", color: { dark: "#000000", light: "#FFFFFF" } })
      .then(() => {
        const ctx = canvas.getContext("2d");
        const logo = new Image();
        const dibujarLogo = () => {
          const logoSize = SIZE * 0.2;
          const boxSize = logoSize + 20;
          const bx = (SIZE - boxSize) / 2, by = (SIZE - boxSize) / 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(bx, by, boxSize, boxSize);

          // El isotipo viene como un cuadrado negro con "dexon" recortado en
          // negativo. Para dejar solo las letras en negro sólido (sin el
          // cuadrado), se rellena un canvas aparte de negro y se "borra" con
          // el isotipo como máscara — queda únicamente el trazo de las letras.
          const tmp = document.createElement("canvas");
          tmp.width = logoSize; tmp.height = logoSize;
          const tctx = tmp.getContext("2d");
          tctx.fillStyle = "#000";
          tctx.fillRect(0, 0, logoSize, logoSize);
          tctx.globalCompositeOperation = "destination-out";
          tctx.drawImage(logo, 0, 0, logoSize, logoSize);

          const lx = (SIZE - logoSize) / 2, ly = (SIZE - logoSize) / 2;
          ctx.drawImage(tmp, lx, ly);
          resolve(canvas.toDataURL("image/png"));
        };
        logo.onload = dibujarLogo;
        logo.onerror = () => resolve(canvas.toDataURL("image/png")); // sin logo si no carga
        logo.src = LOGO_SRC;
      })
      .catch(reject);
  });
}

export default function QRCompartir({ path, descripcion, filename = "qr.png" }) {
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
      <Btn v="primary" onClick={descargar} disabled={!dataUrl}>Descargar QR</Btn>
    </div>
  </div>;
}
