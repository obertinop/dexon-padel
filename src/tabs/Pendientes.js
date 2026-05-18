import React from "react";
import { C } from "../lib/constants.js";
import { gs, hoy, fmtFechaLegible, fmtD } from "../lib/utils.js";
import { Avatar, Btn, estadoBadge, tipoBadge, Empty } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Pendientes() {
  const {
    turnos, clientes, isMobile, saving,
    openM, setDlg, cById, getSemana,
    pendSel, setPendSel, pendFiltro, setPendFiltro,
    confirmarBulk, cancelarBulk, notify, load,
  } = useAdmin();

  const h = hoy();
  const sem = getSemana(); const semIni = fmtD(sem[0]); const semFin = fmtD(sem[6]);
  const pending_raw = turnos.filter(t => t.estado === "pendiente_pago").sort((a, b) => a.fecha !== b.fecha ? a.fecha.localeCompare(b.fecha) : a.hora - b.hora);
  const filtered = pending_raw.filter(t => {
    if (pendFiltro === "hoy") return t.fecha === h;
    if (pendFiltro === "semana") return t.fecha >= semIni && t.fecha <= semFin;
    if (pendFiltro === "pagopar") return t.metodo_pago === "pagopar";
    if (pendFiltro === "transferencia") return t.metodo_pago === "transferencia";
    return true;
  });
  const toggleSel = id => setPendSel(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const selAll = filtered.length > 0 && pendSel.size >= filtered.length;
  const selSome = pendSel.size > 0 && pendSel.size < filtered.length;
  const chips = [
    { id: "todos", l: "Todos", n: pending_raw.length },
    { id: "hoy", l: "Hoy", n: pending_raw.filter(t => t.fecha === h).length },
    { id: "semana", l: "Esta semana", n: pending_raw.filter(t => t.fecha >= semIni && t.fecha <= semFin).length },
    { id: "pagopar", l: "Pagopar", n: pending_raw.filter(t => t.metodo_pago === "pagopar").length },
    { id: "transferencia", l: "Transferencia", n: pending_raw.filter(t => t.metodo_pago === "transferencia").length },
  ];
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>Pendientes de confirmación</span>
      <span style={{ fontSize: 12, color: C.t2, background: C.bgElev, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>{pending_raw.length} pendiente{pending_raw.length !== 1 ? "s" : ""}</span>
    </div>
    {/* Filter chips */}
    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
      {chips.map(c => { const act = pendFiltro === c.id; return <button key={c.id} onClick={() => { setPendFiltro(c.id); setPendSel(new Set()); }} style={{ padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: act ? 700 : 500, border: `1px solid ${act ? C.coral : C.border}`, background: act ? "rgba(224,91,40,0.12)" : "transparent", color: act ? C.coral : C.t2, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
        {c.l}{c.n > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: act ? C.coral : C.bgElev, color: act ? "#fff" : C.t3, borderRadius: 10, padding: "0 5px", minWidth: 16, textAlign: "center" }}>{c.n}</span>}
      </button>; })}
    </div>
    {/* Bulk action bar */}
    {pendSel.size > 0 && <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 10, padding: "10px 14px", borderRadius: 10, background: "rgba(224,91,40,0.08)", border: `1px solid ${C.coralD}`, marginBottom: 12, position: "sticky", top: isMobile ? 60 : 0, zIndex: 10, backdropFilter: "blur(8px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
        <span style={{ fontSize: 13, color: C.coral, fontWeight: 600 }}>{pendSel.size} seleccionado{pendSel.size !== 1 ? "s" : ""}</span>
        {isMobile && <button onClick={() => setPendSel(new Set())} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>×</button>}
      </div>
      <div style={{ display: "flex", gap: 6, ...(isMobile ? { flex: 1 } : {}) }}>
        <Btn v="success" sm onClick={() => confirmarBulk([...pendSel])} disabled={saving} style={isMobile ? { flex: 1 } : {}}>✓ Confirmar ({pendSel.size})</Btn>
        <Btn v="danger" sm onClick={() => cancelarBulk([...pendSel])} disabled={saving} style={isMobile ? { flex: 1 } : {}}>✗ Cancelar</Btn>
        {!isMobile && <button onClick={() => setPendSel(new Set())} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>×</button>}
      </div>
    </div>}
    {filtered.length === 0 ? <Empty t="Sin resultados" /> : <div style={{ display: "grid", gap: 8 }}>
      {/* Select-all row */}
      {filtered.length > 1 && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px" }}>
        <input type="checkbox" checked={selAll} ref={el => { if (el) el.indeterminate = selSome; }} onChange={() => selAll ? setPendSel(new Set()) : setPendSel(new Set(filtered.map(t => t.id)))} style={{ width: 15, height: 15, accentColor: C.coral, cursor: "pointer" }} />
        <span style={{ fontSize: 11, color: C.t3 }}>Seleccionar todos ({filtered.length})</span>
      </div>}
      {filtered.map(t => { const c = cById(t.cliente_id); const fechaStr = fmtFechaLegible(t.fecha); const isSel = pendSel.has(t.id); return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: isSel ? "rgba(224,91,40,0.07)" : C.bg, border: `1px solid ${isSel ? C.coralD : C.borderL}`, cursor: "pointer", transition: "all 0.15s" }} onClick={() => openM("verTurno", { ...t, cliente: c })}>
        <div onClick={e => { e.stopPropagation(); toggleSel(t.id); }} style={{ flexShrink: 0, padding: "2px 4px", cursor: "pointer" }}>
          <input type="checkbox" checked={isSel} onChange={() => toggleSel(t.id)} onClick={e => e.stopPropagation()} style={{ width: 15, height: 15, accentColor: C.coral, cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 50, gap: 2 }}>
          <div style={{ fontSize: 11, color: C.t2 }}>📅</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.coral }}>{fechaStr.split(" ")[0]}</div>
          <div style={{ fontSize: 11, color: C.t3 }}>{t.hora}:00</div>
        </div>
        <Avatar nombre={c?.nombre} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.t1 }}>{c?.nombre || "?"}</div>
          <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>📱 {c?.telefono || "Sin teléfono"}</div>
          <div style={{ fontSize: 11, color: C.t2, marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {tipoBadge(t.tipo)} {estadoBadge(t.estado)}
            {t.metodo_pago === "pagopar" && <span style={{ fontSize: 10, padding: "2px 7px", background: C.infoBg, color: C.info, borderRadius: 5, border: `1px solid rgba(90,160,240,0.3)` }}>Pagopar{t.pagopar_forma_pago ? ` · ${t.pagopar_forma_pago}` : ""}</span>}
            {t.metodo_pago === "transferencia" && <span style={{ fontSize: 10, padding: "2px 7px", background: C.greenBg, color: C.green, borderRadius: 5, border: `1px solid ${C.greenBd}` }}>Transferencia</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.coral }}>{gs(t.precio)}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {t.metodo_pago === "pagopar" && t.pagopar_hash && <Btn sm onClick={async e => {
              e.stopPropagation();
              try {
                const r = await fetch(`/api/pagopar/consultar?hash=${t.pagopar_hash}`); const d = await r.json(); const res = d?.resultado?.[0];
                if (!res) { notify("No se pudo consultar el estado", "error"); return; }
                if (res.pagado) { notify(`Pagado el ${res.fecha_pago} · ${res.forma_pago}`, "ok"); load(); }
                else if (res.cancelado) { notify("Pago cancelado/expirado en Pagopar", "error"); }
                else { notify(res.mensaje_resultado_pago?.titulo || "Pago aún pendiente", "info"); }
              }
              catch (err) { notify("Error consultando Pagopar", "error"); }
            }}>🔍 Verificar</Btn>}
            <Btn v="success" sm onClick={e => { e.stopPropagation(); setDlg({ type: "confirmar", t }); }}>💰 Confirmar</Btn>
            <Btn v="danger" sm onClick={e => { e.stopPropagation(); setDlg({ type: "cancelar", t }); }}>✗</Btn>
          </div>
        </div>
      </div>; })}
    </div>}
  </div>;
}
