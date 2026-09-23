import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { C } from "../lib/constants.js";
import { Btn } from "./UI.js";

export default function QRLista() {
  const url = `${window.location.origin}/precios`;
  const [dataUrl, setDataUrl] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: "#060D1A", light: "#FFFFFF" } })
      .then(setDataUrl).catch(() => setDataUrl(null));
  }, [url]);

  const copiar = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); });
  };

  const descargar = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl; a.download = "lista-precios-qr.png"; a.click();
  };

  return <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 12, color: C.t2, marginBottom: 14, lineHeight: 1.5 }}>Apunta a la lista de precios pública, conectada con el stock activo. Imprimí este QR para las mesas o la recepción.</div>
    <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "inline-block", marginBottom: 14 }}>
      {dataUrl
        ? <img src={dataUrl} alt="QR de la lista de precios" style={{ width: 220, height: 220, display: "block" }} />
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
