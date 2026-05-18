import React from "react";
import { C, DIAS, DIAS_FULL } from "../lib/constants.js";
import { gs, hoy, fmtD } from "../lib/utils.js";
import { Avatar, Badge } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Stats() {
  const {
    turnos, clientes, caja, abonos, horas, isMobile,
  } = useAdmin();

  const h = hoy(); const mes = h.slice(0, 7);
  const ult7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return fmtD(d); });
  const porDia = ult7.map(f => ({ f, v: caja.filter(m => m.fecha === f && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0) }));
  const maxV = Math.max(...porDia.map(d => d.v), 1);
  const ingM = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const proy = Math.round(ingM / new Date().getDate() * 30);
  const topC = clientes.map(c => ({ ...c, n: turnos.filter(t => t.cliente_id === c.id && t.estado === "confirmado").length })).sort((a, b) => b.n - a.n).slice(0, 5);
  const hPico = horas.map(h => ({ h, n: turnos.filter(t => t.hora === h && t.estado !== "cancelado").length })).sort((a, b) => b.n - a.n).slice(0, 6);
  const maxH = Math.max(...hPico.map(x => x.n), 1);
  const porDow = Array.from({ length: 7 }, (_, d) => ({ d, n: turnos.filter(t => t.estado !== "cancelado" && new Date(t.fecha + "T00:00:00").getDay() === d).length }));
  const dowPop = [...porDow].sort((a, b) => b.n - a.n)[0];
  const maxDow = Math.max(...porDow.map(x => x.n), 1);
  const ordenDow = [1, 2, 3, 4, 5, 6, 0]; // Lun→Dom
  return <div>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 8 : 10, marginBottom: 16 }}>
      {[{ l: "Ingresos mes", v: gs(ingM) }, { l: "Proyección", v: gs(proy), c: C.info }, { l: "Total reservas", v: turnos.length }, { l: "Abonados activos", v: abonos.filter(a => a.estado === "activo" && a.fecha_vencimiento >= h).length }].map((m, i) =>
        <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "12px 14px" : "16px 20px", minWidth: 0 }}><div style={{ fontSize: isMobile ? 11 : 12, color: C.t2, marginBottom: isMobile ? 3 : 6 }}>{m.l}</div><div style={{ fontSize: isMobile ? 17 : 21, fontWeight: 600, color: m.c || C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.v}</div></div>
      )}
    </div>
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, color: C.t1 }}>Ingresos últimos 7 días</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
        {porDia.map((d, i) => <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: d.v > 0 ? C.coral : C.border, borderRadius: "4px 4px 0 0", height: Math.max(d.v / maxV * 80, 4), transition: "height 0.3s" }} />
          <div style={{ fontSize: 10, color: C.t3 }}>{d.f.slice(8)}/{d.f.slice(5, 7)}</div>
        </div>)}
      </div>
    </div>
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: C.t1 }}>Día más popular</span>
        <span style={{ fontSize: 12, color: C.coral, fontWeight: 700 }}>{DIAS_FULL[dowPop.d]} · {dowPop.n} turnos</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 70 }}>
        {ordenDow.map(d => { const x = porDow[d]; const isMax = d === dowPop.d && x.n > 0; return <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: isMax ? C.coral : C.t3, fontWeight: isMax ? 700 : 500 }}>{x.n}</div>
          <div style={{ width: "100%", background: isMax ? C.coral : x.n > 0 ? C.coralD : C.border, borderRadius: "4px 4px 0 0", height: Math.max(x.n / maxDow * 46, 3), transition: "height 0.3s", opacity: isMax ? 1 : 0.55 }} />
          <div style={{ fontSize: 10, color: isMax ? C.t1 : C.t3, fontWeight: isMax ? 600 : 400 }}>{DIAS[d]}</div>
        </div>; })}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}><div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14, color: C.t1 }}>Horarios pico</div>{hPico.map((x, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 13, minWidth: 48, color: C.t1 }}>{x.h}:00</span><div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${x.n / maxH * 100}%`, height: "100%", background: C.coral, borderRadius: 3 }} /></div><span style={{ fontSize: 12, color: C.t2, minWidth: 16 }}>{x.n}</span></div>)}</div>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}><div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14, color: C.t1 }}>Top clientes</div>{topC.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}><Avatar nombre={c.nombre} size={28} /><span style={{ flex: 1, fontSize: 13, color: C.t1 }}>{c.nombre}</span><Badge type="info">{c.n} turnos</Badge></div>)}</div>
    </div>
  </div>;
}
