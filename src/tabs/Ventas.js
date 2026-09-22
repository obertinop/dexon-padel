import React from "react";
import { C, inp, lbl } from "../lib/constants.js";
import { gs, hoy, fmtD } from "../lib/utils.js";
import { Badge, Btn, Empty } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

const METODO_LABEL = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta", saldo_favor: "Saldo" };
const metodoBadgeType = m => (m === "saldo_favor" ? "purple" : m === "efectivo" ? "ok" : "info");
const resumenItems = its => its.map(i => `${i.nombre} x${i.cantidad}`).join(", ");

export default function Ventas() {
  const {
    ventas, venta_items, clientes, isMobile, openM, setDlg,
    ventaFechaIni, setVentaFechaIni, ventaFechaFin, setVentaFechaFin, ventaMetodo, setVentaMetodo,
  } = useAdmin();

  const h = hoy(); const mes = h.slice(0, 7);
  const activas = ventas.filter(v => !v.anulada);
  const ventasHoy = activas.filter(v => v.fecha === h);
  const ventasMes = activas.filter(v => v.fecha.startsWith(mes));
  const totalHoy = ventasHoy.reduce((a, v) => a + v.total, 0);
  const totalMes = ventasMes.reduce((a, v) => a + v.total, 0);
  const ticketProm = ventasMes.length ? totalMes / ventasMes.length : 0;

  let filtradas = ventas;
  if (ventaFechaIni) filtradas = filtradas.filter(v => v.fecha >= ventaFechaIni);
  if (ventaFechaFin) filtradas = filtradas.filter(v => v.fecha <= ventaFechaFin);
  if (ventaMetodo) filtradas = filtradas.filter(v => v.metodo_pago === ventaMetodo);

  const cById = id => clientes.find(c => c.id === id);
  const itemsDe = id => venta_items.filter(i => i.venta_id === id);

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 12 : 16, gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.t1 }}>Ventas</span>
      {!isMobile && <Btn v="primary" onClick={() => openM("venta", { descuento_pct: 0, metodo_pago: "efectivo", carrito: [] })}>+ Nueva venta</Btn>}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: isMobile ? 6 : 10, marginBottom: 16 }}>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "10px 10px" : "16px 20px", minWidth: 0 }}><div style={{ fontSize: isMobile ? 10 : 12, color: C.t2, marginBottom: 4 }}>Hoy</div><div style={{ fontSize: isMobile ? 14 : 21, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gs(totalHoy)}</div><div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{ventasHoy.length} venta{ventasHoy.length !== 1 ? "s" : ""}</div></div>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "10px 10px" : "16px 20px", minWidth: 0 }}><div style={{ fontSize: isMobile ? 10 : 12, color: C.t2, marginBottom: 4 }}>Mes</div><div style={{ fontSize: isMobile ? 14 : 21, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gs(totalMes)}</div><div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{ventasMes.length} venta{ventasMes.length !== 1 ? "s" : ""}</div></div>
      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "10px 10px" : "16px 20px", minWidth: 0 }}><div style={{ fontSize: isMobile ? 10 : 12, color: C.t2, marginBottom: 4 }}>Ticket prom.</div><div style={{ fontSize: isMobile ? 14 : 21, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gs(ticketProm)}</div></div>
    </div>

    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 14 }}>
      {(() => {
        const ayer = fmtD(new Date(Date.now() - 86400000));
        const hace7 = fmtD(new Date(Date.now() - 7 * 86400000));
        const inicioMes = h.slice(0, 8) + "01";
        const chips = [
          { l: "Hoy", act: ventaFechaIni === h && ventaFechaFin === h, a: () => { setVentaFechaIni(h); setVentaFechaFin(h); } },
          { l: "Ayer", act: ventaFechaIni === ayer && ventaFechaFin === ayer, a: () => { setVentaFechaIni(ayer); setVentaFechaFin(ayer); } },
          { l: "7 días", act: ventaFechaIni === hace7 && ventaFechaFin === h, a: () => { setVentaFechaIni(hace7); setVentaFechaFin(h); } },
          { l: "Este mes", act: ventaFechaIni === inicioMes && ventaFechaFin === h, a: () => { setVentaFechaIni(inicioMes); setVentaFechaFin(h); } },
        ];
        return <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {chips.map(c => <button key={c.l} onClick={c.a} style={{ padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: c.act ? 700 : 500, border: `1px solid ${c.act ? C.coral : C.border}`, background: c.act ? "rgba(224,91,40,0.12)" : "transparent", color: c.act ? C.coral : C.t2, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.15s" }}>{c.l}</button>)}
        </div>;
      })()}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr auto", gap: isMobile ? 8 : 10, alignItems: "flex-end" }}>
        <div><label style={lbl}>Desde</label><input type="date" value={ventaFechaIni} onChange={e => setVentaFechaIni(e.target.value)} style={{ ...inp, fontSize: 13 }} /></div>
        <div><label style={lbl}>Hasta</label><input type="date" value={ventaFechaFin} onChange={e => setVentaFechaFin(e.target.value)} style={{ ...inp, fontSize: 13 }} /></div>
        <div style={isMobile ? { gridColumn: "1 / -1" } : {}}><label style={lbl}>Método</label><select value={ventaMetodo} onChange={e => setVentaMetodo(e.target.value)} style={{ ...inp, fontSize: 13 }}><option value="">Todos</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="saldo_favor">Saldo</option></select></div>
        <Btn sm v="ghost" onClick={() => { setVentaFechaIni(""); setVentaFechaFin(""); setVentaMetodo(""); }} style={isMobile ? { gridColumn: "1 / -1" } : {}}>Limpiar filtros</Btn>
      </div>
    </div>

    {isMobile
      ? <div style={{ display: "grid", gap: 8 }}>
        {filtradas.length === 0 && <Empty t="Sin ventas" />}
        {filtradas.map(v => { const c = cById(v.cliente_id); const its = itemsDe(v.id); return <div key={v.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 14px", opacity: v.anulada ? 0.55 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <Badge type={metodoBadgeType(v.metodo_pago)}>{METODO_LABEL[v.metodo_pago] || v.metodo_pago}</Badge>
            {v.anulada && <Badge type="danger">Anulada</Badge>}
            <span style={{ fontSize: 11, color: C.t3 }}>{v.fecha.slice(8)}/{v.fecha.slice(5, 7)}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.t1, marginBottom: 4 }}>{c ? c.nombre : "Venta sin cliente"}</div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumenItems(its)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>{gs(v.total)}</span>
            {!v.anulada && <button onClick={() => setDlg({ type: "anularVenta", v })} style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBd}`, borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Anular</button>}
          </div>
        </div>; })}
      </div>
      : <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 10, overflow: "hidden" }}>
          <thead><tr>{["Fecha", "Cliente", "Productos", "Método", "Total", "Estado", ""].map((th, i) => <th key={i} style={{ textAlign: i >= 4 ? "right" : "left", padding: "10px 14px", fontSize: 12, fontWeight: 600, color: C.t2, borderBottom: `1px solid ${C.border}`, background: C.bg }}>{th}</th>)}</tr></thead>
          <tbody>{filtradas.length === 0 && <tr><td colSpan={7}><Empty t="Sin ventas" /></td></tr>}
            {filtradas.map(v => { const c = cById(v.cliente_id); const its = itemsDe(v.id); return <tr key={v.id} style={{ background: C.bgCard, opacity: v.anulada ? 0.55 : 1 }}>
              <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.t2 }}>{v.fecha.slice(8)}/{v.fecha.slice(5, 7)}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.t1 }}>{c ? c.nombre : "—"}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, color: C.t2, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resumenItems(its)}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}` }}><Badge type={metodoBadgeType(v.metodo_pago)}>{METODO_LABEL[v.metodo_pago] || v.metodo_pago}</Badge></td>
              <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, textAlign: "right", fontWeight: 600, color: C.t1 }}>{gs(v.total)}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>{v.anulada && <Badge type="danger">Anulada</Badge>}</td>
              <td style={{ padding: "10px 14px", fontSize: 13, borderBottom: `1px solid ${C.border}`, textAlign: "right" }}>{!v.anulada && <Btn sm v="danger" onClick={() => setDlg({ type: "anularVenta", v })}>Anular</Btn>}</td>
            </tr>; })}
          </tbody>
        </table>
      </div>}
  </div>;
}
