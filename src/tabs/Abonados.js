import React from "react";
import { C, DIAS_FULL } from "../lib/constants.js";
import { gs, hoy } from "../lib/utils.js";
import { Avatar, Badge, Btn } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Abonados() {
  const {
    abonos, clientes, planes, abono_turnos,
    isMobile, openM, setDlg, cById, pById,
    saving, setSaving, materilarizarTurnosAbono, load,
  } = useAdmin();

  const h = hoy();
  const diasAbono = ab => {
    const slots = abono_turnos.filter(at => at.abono_id === ab.id);
    return slots.length === 0 ? "Sin turno fijo" : slots.map(s => `${DIAS_FULL[s.dia]} ${s.hora}:00`).join(" · ");
  };
  const venc = abonos.filter(a => a.fecha_vencimiento < h && a.estado === "activo");
  const vig = abonos.filter(a => a.fecha_vencimiento >= h && a.estado === "activo");
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 12 : 16, gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.t1 }}>Abonados</span>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn v="ghost" sm={isMobile} onClick={() => openM("plan", {})}>{isMobile ? "Planes" : "Gestionar planes"}</Btn>
        {!isMobile && <Btn v="primary" onClick={() => openM("abono", { fecha_inicio: hoy(), slots: [] })}>+ Nuevo abono</Btn>}
      </div>
    </div>
    {venc.length > 0 && <div style={{ background: C.yellowBg, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.yellow, border: `1px solid ${C.yellowBd}`, marginBottom: 14 }}>{venc.length} abono{venc.length > 1 ? "s" : ""} vencido{venc.length > 1 ? "s" : ""}</div>}
    <div style={{ display: "grid", gap: 8 }}>
      {[...venc, ...vig].map(ab => { const c = cById(ab.cliente_id); const pl = pById(ab.plan_id); const v = ab.fecha_vencimiento < h; return <div key={ab.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "12px 14px" : "14px 16px" }}>
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 10 : 14, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, ...(isMobile ? { width: "100%" } : { flex: 1 }) }}>
            <Avatar nombre={c?.nombre} size={isMobile ? 36 : 40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.nombre || "?"}</div>
              <div style={{ fontSize: 12, color: C.t2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl?.nombre || "Plan"} · {gs(ab.precio_acordado)}/mes</div>
              {!isMobile && <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{diasAbono(ab)}</div>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-end", gap: isMobile ? 8 : 8, ...(isMobile ? { width: "100%", justifyContent: "space-between" } : {}) }}>
            {v ? <Badge type="danger">Vencido {ab.fecha_vencimiento?.slice(5)}</Badge> : <Badge type="ok">Hasta {ab.fecha_vencimiento?.slice(5)}</Badge>}
            <div style={{ display: "flex", gap: 6 }}>
              {v && <Btn v="primary" sm onClick={() => openM("abono", { cliente_id: ab.cliente_id, plan_id: ab.plan_id, precio_acordado: ab.precio_acordado, fecha_inicio: hoy(), slots: abono_turnos.filter(at => at.abono_id === ab.id).map(at => ({ dia: at.dia, hora: at.hora })) })}>Renovar</Btn>}
              {!v && <Btn v="ghost" sm onClick={async () => { setSaving(true); const slots = abono_turnos.filter(at => at.abono_id === ab.id).map(at => ({ dia: at.dia, hora: at.hora })); await materilarizarTurnosAbono(ab.id, ab.cliente_id, slots, ab.fecha_vencimiento); await load(); setSaving(false); }}>Generar turnos</Btn>}
              <Btn v="danger" sm onClick={() => setDlg({ type: "cancelarAbono", id: ab.id, nombre: c?.nombre })}>Cancelar</Btn>
            </div>
          </div>
        </div>
      </div>; })}
    </div>
  </div>;
}
