import React from "react";
import { C } from "../lib/constants.js";
import { gs } from "../lib/utils.js";
import { Badge, Btn } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Config() {
  const {
    cfg, instructores, planes, codigos_ref, turnos, clientes,
    isMobile, openM, setDlg,
  } = useAdmin();

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: C.t1 }}>Configuración</span>
      <div style={{ display: "flex", gap: 8 }}><Btn v="ghost" onClick={() => openM("instructor", {})}>+ Instructor</Btn><Btn v="primary" onClick={() => openM("config", { ...cfg })}>Editar</Btn></div>
    </div>
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20, marginBottom: 16 }}>
      {[{ l: "Club", v: cfg.nombre_club }, { l: "Tarifa base", v: gs(cfg.tarifa_base) }, { l: "Tarifa pico", v: gs(cfg.tarifa_pico) }, { l: "Horario pico", v: `${cfg.hora_pico_inicio}:00 - ${cfg.hora_pico_fin}:00` }, { l: "Apertura", v: `${cfg.hora_inicio}:00` }, { l: "Cierre", v: `${cfg.hora_fin}:00` }].map((r, i) =>
        <div key={i}><div style={{ fontSize: 12, color: C.t2, marginBottom: 4 }}>{r.l}</div><div style={{ fontSize: 15, fontWeight: 600, color: C.t1 }}>{r.v}</div></div>
      )}
    </div>
    {instructores.length > 0 && <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 12 }}><div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: C.t1 }}>Instructores</div>{instructores.map(i => <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ fontWeight: 600, color: C.t1 }}>{i.nombre}</span><span style={{ color: C.t2 }}>{gs(i.tarifa_clase)}/clase</span></div>)}</div>}
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={{ fontWeight: 600, fontSize: 14, color: C.t1 }}>Planes de abono</div><Btn sm v="ghost" onClick={() => openM("plan", {})}>+ Plan</Btn></div>{planes.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}><div><span style={{ fontWeight: 600, color: C.t1 }}>{p.nombre}</span><span style={{ color: C.t2, marginLeft: 8 }}>{p.horas_semana}hs/sem</span></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontWeight: 600, color: C.t1 }}>{gs(p.precio)}/mes</span><Btn sm v="ghost" onClick={() => openM("plan", { ...p })}>Editar</Btn></div></div>)}</div>

    {/* ── CÓDIGOS DE REFERIDO ── */}
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.t1 }}>Códigos de referido</div>
          <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>Gym, socios, redes sociales, eventos — con descuento propio y límite de usos</div>
        </div>
        <Btn v="primary" sm onClick={() => openM("codigoRef", { tipo: "socio", descuento_pct: 10, activo: true })}>+ Nuevo</Btn>
      </div>

      {/* Stats globales */}
      {codigos_ref.length > 0 && (() => {
        const totalUsos = codigos_ref.reduce((a, c) => a + c.usos_actuales, 0);
        const activos = codigos_ref.filter(c => c.activo).length;
        const descTotal = turnos.filter(t => t.applied_referral_code).reduce((a, t) => a + (t.referral_discount_amount || 0), 0);
        return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "12px 0" }}>
          {[["Códigos activos", activos, C.green], ["Total usos", totalUsos, C.info], ["Descuentos otorgados", gs(descTotal), C.yellow]].map(([l, v, col]) =>
            <div key={l} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: col }}>{v}</div>
              <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>{l}</div>
            </div>
          )}
        </div>;
      })()}

      {codigos_ref.length === 0
        ? <div style={{ textAlign: "center", padding: "28px 0", color: C.t3, fontSize: 13 }}>Sin códigos creados. Usá "+" para agregar uno.</div>
        : <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {codigos_ref.map(cr => {
            const pct = cr.max_usos ? Math.round(cr.usos_actuales / cr.max_usos * 100) : null;
            const tipoCol = { cliente: C.info, socio: C.green, empresa: C.coral, red_social: "#25D366", evento: C.yellow }[cr.tipo] || C.t2;
            const usadoresTurnos = turnos.filter(t => t.applied_referral_code === cr.codigo);
            const usadoresUnicos = [...new Set(usadoresTurnos.map(t => t.cliente_id))];
            return <div key={cr.id} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${cr.activo ? C.border : C.redBd}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: C.yellow, letterSpacing: 2 }}>{cr.codigo}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${tipoCol}22`, color: tipoCol, fontWeight: 600 }}>{cr.tipo}</span>
                    {!cr.activo && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: C.redBg, color: C.red, fontWeight: 600 }}>Inactivo</span>}
                  </div>
                  <div style={{ fontSize: 13, color: C.t1, marginTop: 3 }}>{cr.nombre}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <Btn sm v="ghost" onClick={() => openM("codigoRef", { ...cr })}>Editar</Btn>
                  <Btn sm v="danger" onClick={() => setDlg({ type: "eliminarCodigo", id: cr.id, codigo: cr.codigo })}>×</Btn>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.t2, flexWrap: "wrap", alignItems: "center" }}>
                <span>Descuento: <strong style={{ color: C.t1 }}>{cr.descuento_pct}%</strong></span>
                <span>Usos: <strong style={{ color: cr.usos_actuales > 0 ? C.green : C.t1 }}>{cr.usos_actuales}</strong>{cr.max_usos && <span style={{ color: C.t3 }}>/{cr.max_usos}</span>}</span>
                <span>Clientes únicos: <strong style={{ color: C.t1 }}>{usadoresUnicos.length}</strong></span>
                {cr.max_usos && <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 80, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct >= 90 ? C.red : pct >= 60 ? C.yellow : C.green, borderRadius: 2, transition: "width .3s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: C.t3 }}>{pct}%</span>
                </div>}
                {cr.notas && <span style={{ color: C.t3, fontStyle: "italic" }}>· {cr.notas}</span>}
              </div>
              {/* Últimos usuarios */}
              {usadoresTurnos.length > 0 && <div style={{ marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...new Set(usadoresTurnos.map(t => t.cliente_id))].slice(0, 5).map(cid => {
                  const cl = clientes.find(c => c.id === cid);
                  return cl ? <span key={cid} style={{ fontSize: 11, background: C.bgElev, color: C.t2, padding: "2px 8px", borderRadius: 8 }}>{cl.nombre}</span> : null;
                })}
                {usadoresUnicos.length > 5 && <span style={{ fontSize: 11, color: C.t3 }}>+{usadoresUnicos.length - 5} más</span>}
              </div>}
            </div>;
          })}
        </div>}
    </div>
  </div>;
}
