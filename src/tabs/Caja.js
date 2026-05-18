import React from "react";
import { C, inp, lbl } from "../lib/constants.js";
import { gs, hoy, fmtD } from "../lib/utils.js";
import { Badge, Btn, Empty } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Caja() {
  const {
    caja, isMobile, openM, setDlg,
    cajaFechaIni, setCajaFechaIni,
    cajaFechaFin, setCajaFechaFin,
    cajaTipo, setCajaTipo,
  } = useAdmin();

  const h = hoy(); const mes = h.slice(0, 7);
  const ingH = caja.filter(m => m.fecha === h && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const ingM = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const egrM = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
  let cajaFiltrada = caja;
  if (cajaFechaIni) cajaFiltrada = cajaFiltrada.filter(m => m.fecha >= cajaFechaIni);
  if (cajaFechaFin) cajaFiltrada = cajaFiltrada.filter(m => m.fecha <= cajaFechaFin);
  if (cajaTipo) cajaFiltrada = cajaFiltrada.filter(m => m.tipo === cajaTipo);
  return <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: isMobile ? 6 : 10, marginBottom: 16 }}>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "10px 10px" : "16px 20px", minWidth: 0 }}><div style={{ fontSize: isMobile ? 10 : 12, color: C.t2, marginBottom: 4 }}>Hoy</div><div style={{ fontSize: isMobile ? 14 : 21, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gs(ingH)}</div></div>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "10px 10px" : "16px 20px", minWidth: 0 }}><div style={{ fontSize: isMobile ? 10 : 12, color: C.t2, marginBottom: 4 }}>Mes</div><div style={{ fontSize: isMobile ? 14 : 21, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gs(ingM)}</div></div>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "10px 10px" : "16px 20px", minWidth: 0 }}><div style={{ fontSize: isMobile ? 10 : 12, color: C.t2, marginBottom: 4 }}>Balance</div><div style={{ fontSize: isMobile ? 14 : 21, fontWeight: 600, color: ingM - egrM >= 0 ? C.green : C.red, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gs(ingM - egrM)}</div></div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8 }}>
      <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.t1 }}>Movimientos</span>
      <Btn v="primary" sm={isMobile} onClick={() => openM("movCaja", { tipo: "egreso", categoria: "gasto", fecha: hoy() })}>{isMobile ? "+ Gasto" : "+ Registrar gasto"}</Btn>
    </div>
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 14 }}>
      {(() => {
        const ayer = fmtD(new Date(Date.now() - 86400000));
        const hace7 = fmtD(new Date(Date.now() - 7 * 86400000));
        const hace30 = fmtD(new Date(Date.now() - 30 * 86400000));
        const inicioMes = h.slice(0, 8) + "01";
        const chips = [
          { l: "Hoy", act: cajaFechaIni === h && cajaFechaFin === h, a: () => { setCajaFechaIni(h); setCajaFechaFin(h); } },
          { l: "Ayer", act: cajaFechaIni === ayer && cajaFechaFin === ayer, a: () => { setCajaFechaIni(ayer); setCajaFechaFin(ayer); } },
          { l: "7 días", act: cajaFechaIni === hace7 && cajaFechaFin === h, a: () => { setCajaFechaIni(hace7); setCajaFechaFin(h); } },
          { l: "Este mes", act: cajaFechaIni === inicioMes && cajaFechaFin === h, a: () => { setCajaFechaIni(inicioMes); setCajaFechaFin(h); } },
          { l: "30 días", act: cajaFechaIni === hace30 && cajaFechaFin === h, a: () => { setCajaFechaIni(hace30); setCajaFechaFin(h); } },
        ];
        return <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {chips.map(c => <button key={c.l} onClick={c.a} style={{ padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: c.act ? 700 : 500, border: `1px solid ${c.act ? C.coral : C.border}`, background: c.act ? "rgba(224,91,40,0.12)" : "transparent", color: c.act ? C.coral : C.t2, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" }}>{c.l}</button>)}
        </div>;
      })()}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr auto", gap: isMobile ? 8 : 10, alignItems: "flex-end" }}>
        <div><label style={lbl}>Desde</label><input type="date" value={cajaFechaIni} onChange={e => setCajaFechaIni(e.target.value)} style={{ ...inp, fontSize: 13 }} /></div>
        <div><label style={lbl}>Hasta</label><input type="date" value={cajaFechaFin} onChange={e => setCajaFechaFin(e.target.value)} style={{ ...inp, fontSize: 13 }} /></div>
        <div style={isMobile ? { gridColumn: "1 / -1" } : {}}><label style={lbl}>Tipo</label><select value={cajaTipo} onChange={e => setCajaTipo(e.target.value)} style={{ ...inp, fontSize: 13 }}><option value="">Todos</option><option value="ingreso">Ingresos</option><option value="egreso">Egresos</option></select></div>
        <Btn sm v="ghost" onClick={() => { setCajaFechaIni(""); setCajaFechaFin(""); setCajaTipo(""); }} style={isMobile ? { gridColumn: "1 / -1" } : {}}>Limpiar filtros</Btn>
      </div>
    </div>
    {isMobile
      ? <div style={{ display: "grid", gap: 8 }}>
        {cajaFiltrada.length === 0 && <Empty t="Sin movimientos" />}
        {cajaFiltrada.map(m => <div key={m.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Badge type={m.tipo === "ingreso" ? "ok" : "danger"}>{m.categoria || m.tipo}</Badge>
              <span style={{ fontSize: 11, color: C.t3 }}>{m.fecha.slice(8)}/{m.fecha.slice(5, 7)}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.descripcion}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.tipo === "ingreso" ? C.green : C.red, whiteSpace: "nowrap" }}>{m.tipo === "egreso" ? "- " : ""}{gs(m.monto)}</div>
            <button onClick={() => setDlg({ type: "eliminarMov", id: m.id, desc: m.descripcion })} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBd}`, borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Eliminar</button>
          </div>
        </div>)}
      </div>
      : <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 10, overflow: "hidden" }}>
          <thead><tr>{["Fecha", "Descripción", "Categoría", "Monto", ""].map((h, i) => <th key={i} style={{ textAlign: i >= 3 ? "right" : "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.t2, borderBottom: `1px solid ${C.border}`, background: C.bg }}>{h}</th>)}</tr></thead>
          <tbody>{cajaFiltrada.map(m => <tr key={m.id} style={{ background: C.bgCard }}>
            <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.t2 }}>{m.fecha.slice(8)}/{m.fecha.slice(5, 7)}</td>
            <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.t1 }}>{m.descripcion}</td>
            <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}` }}><Badge type={m.tipo === "ingreso" ? "ok" : "danger"}>{m.categoria || m.tipo}</Badge></td>
            <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 600, color: m.tipo === "ingreso" ? C.green : C.red }}>{m.tipo === "egreso" ? "- " : ""}{gs(m.monto)}</td>
            <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, textAlign: "right" }}><Btn sm v="danger" onClick={() => setDlg({ type: "eliminarMov", id: m.id, desc: m.descripcion })}>×</Btn></td>
          </tr>)}</tbody>
        </table>
      </div>}
  </div>;
}
