import React from "react";
import { C } from "../lib/constants.js";
import { gs } from "../lib/utils.js";
import { Badge, Btn } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Stock() {
  const {
    stock, isMobile, openM,
  } = useAdmin();

  const cats = [...new Set(stock.map(s => s.categoria))]; const bajo = stock.filter(s => s.minimo > 0 && s.cantidad <= s.minimo);
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 12 : 16, gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.t1 }}>Stock</span>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn v="ghost" sm={isMobile} onClick={() => openM("moverStock", { tipo_mov: "salida" })}>{isMobile ? "Movim." : "Registrar movimiento"}</Btn>
        {!isMobile && <Btn v="primary" onClick={() => openM("stockItem", { categoria: "pelotas", cantidad: "0", minimo: "0" })}>+ Producto</Btn>}
      </div>
    </div>
    {bajo.length > 0 && <div style={{ background: C.redBg, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.red, border: `1px solid ${C.redBd}`, marginBottom: 14 }}>Stock bajo: {bajo.map(s => s.nombre).join(", ")}</div>}
    {cats.map(cat => <div key={cat} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{cat}</div>
      <div style={{ display: "grid", gap: 8 }}>{stock.filter(s => s.categoria === cat).map(s => { const b = s.minimo > 0 && s.cantidad <= s.minimo; return <div key={s.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => openM("stockItem", { ...s })}>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14, color: C.t1 }}>{s.nombre}</div>{(s.precio_venta > 0 || s.precio_costo > 0) && <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>Venta: {gs(s.precio_venta)} · Costo: {gs(s.precio_costo)}</div>}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: b ? C.red : C.t1 }}>{s.cantidad}</div><div style={{ fontSize: 10, color: C.t3 }}>unidades</div></div>{b && <Badge type="danger">Bajo</Badge>}</div>
      </div>; })}
      </div>
    </div>)}
  </div>;
}
