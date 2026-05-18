import React, { useState } from "react";
import { C, inp } from "../lib/constants.js";
import { gs, hoy } from "../lib/utils.js";
import { Avatar, Badge, Btn } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Clientes() {
  const {
    clientes, turnos, abonos, planes, cfg,
    isMobile, openM, cById, pById,
  } = useAdmin();

  const [q, setQ] = useState("");
  const qLow = q.trim().toLowerCase();
  const qTel = q.trim().replace(/\D/g, "");
  const lista = clientes.filter(c => !qLow || c.nombre.toLowerCase().includes(qLow) || (qTel && (c.telefono || "").replace(/\D/g, "").includes(qTel)));
  const highlight = (text, query) => {
    if (!query || !text) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return <>{text.slice(0, idx)}<mark style={{ background: "rgba(224,91,40,0.25)", color: C.coral, padding: "0 2px", borderRadius: 3 }}>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
  };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 10 : 16, gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.t1 }}>Clientes <span style={{ fontSize: 13, color: C.t2, fontWeight: 400 }}>({lista.length}{q ? ` de ${clientes.length}` : ""})</span></span>
      {!isMobile && <Btn v="primary" onClick={() => openM("cliente", { nivel: "intermedio" })}>+ Agregar</Btn>}
    </div>
    <div style={{ marginBottom: 12 }}>
      <input style={{ ...inp, fontSize: 14, padding: "10px 14px", ...(isMobile ? {} : { maxWidth: 320 }) }} placeholder="Buscar nombre o teléfono..." value={q} onChange={e => setQ(e.target.value)} />
    </div>
    <div style={{ display: "grid", gap: 8 }}>
      {lista.length === 0 && q && <div style={{ textAlign: "center", padding: "32px", color: C.t3, fontSize: 13 }}>Sin resultados para "{q}"</div>}
      {lista.map(c => { const ab = abonos.find(a => a.cliente_id === c.id && a.estado === "activo"); const resC = turnos.filter(t => t.cliente_id === c.id).length; return <div key={c.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, cursor: "pointer" }} onClick={() => openM("cliente", { ...c })}>
        <Avatar nombre={c.nombre} size={isMobile ? 36 : 40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qLow ? highlight(c.nombre, q.trim()) : c.nombre}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: C.t2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qTel && c.telefono ? highlight(c.telefono, qTel) : (c.telefono || "Sin teléfono")} · {resC} turnos</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            {ab ? <Badge type="purple">{pById(ab.plan_id)?.nombre || "Abonado"}</Badge> : <Badge type="gray">Ocasional</Badge>}
            {c.saldo_favor > 0 && <span style={{ fontSize: 10, color: C.green, background: C.greenBg, padding: "1px 6px", borderRadius: 5, border: `1px solid ${C.greenBd}` }}>+{gs(c.saldo_favor)}</span>}
            {c.deuda > 0 && <Badge type="danger">Debe {gs(c.deuda)}</Badge>}
            {c.referrer_code && !isMobile && <span style={{ fontSize: 11, color: C.yellow, background: C.yellowBg, padding: "2px 7px", borderRadius: 5, letterSpacing: .5, border: `1px solid ${C.yellowBd}` }}>{c.referrer_code}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <Btn sm v="ghost" onClick={() => openM("turno", { fecha: hoy(), hora: cfg.hora_inicio, tipo: "ocasional", cliente_id: c.id })}>{isMobile ? "📅" : "Reservar"}</Btn>
          {!ab && !isMobile && <Btn sm v="ghost" onClick={() => openM("abono", { cliente_id: c.id, fecha_inicio: hoy(), slots: [] })}>Abonar</Btn>}
        </div>
      </div>; })}
    </div>
  </div>;
}
