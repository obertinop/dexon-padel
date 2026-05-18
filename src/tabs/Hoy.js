import React from "react";
import { C, DIAS, card, metric } from "../lib/constants.js";
import { gs, hoy } from "../lib/utils.js";
import { Avatar, Btn, estadoBadge, tipoBadge } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Hoy() {
  const {
    turnos, clientes, caja, stock, abonos, cfg,
    isMobile, clima, openM, setDlg, cById, iById,
  } = useAdmin();

  const h = hoy(); const mes = h.slice(0, 7);
  const tHoy = turnos.filter(t => t.fecha === h && (t.estado === "reservado" || t.estado === "pendiente_pago" || t.estado === "confirmado")).sort((a, b) => a.hora - b.hora);
  const ingH = caja.filter(m => m.fecha === h && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const ingM = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const egrM = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
  const pendCobro = tHoy.filter(t => t.estado === "reservado" && t.tipo !== "abono");
  const vencidos = abonos.filter(a => a.fecha_vencimiento < h && a.estado === "activo");
  const stockBajo = stock.filter(s => s.minimo > 0 && s.cantidad <= s.minimo);

  const climaIcon = code => { if (!code && code !== 0) return "🌤"; if (code === 0) return "☀️"; if (code <= 2) return "⛅"; if (code <= 48) return "☁️"; if (code <= 67) return "🌧️"; return "⛈️"; };

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 14 : 20, gap: 10 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cfg.nombre_club}</div>
        <div style={{ fontSize: isMobile ? 11 : 13, color: C.t2, marginTop: 2 }}>{new Date().toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" })}</div>
      </div>
      <Btn v="primary" sm={isMobile} onClick={() => openM("turno", { fecha: h, hora: cfg.hora_inicio, tipo: "ocasional" })}>{isMobile ? "+ Reservar" : "+ Reservar"}</Btn>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 8 : 10, marginBottom: 16 }}>
      {[{ l: "Ingresos hoy", v: gs(ingH) }, { l: "Ingresos mes", v: gs(ingM) }, { l: "Balance mes", v: gs(ingM - egrM), c: ingM - egrM >= 0 ? C.green : C.red }, { l: "Turnos hoy", v: tHoy.length, sub: pendCobro.length > 0 ? `${pendCobro.length} pendientes` : null }].map((m, i) =>
        <div key={i} style={{ ...metric, padding: isMobile ? "12px 14px" : metric.padding, minWidth: 0 }}><div style={{ fontSize: isMobile ? 11 : 12, color: C.t2, marginBottom: 4 }}>{m.l}</div><div style={{ fontSize: isMobile ? 17 : 21, fontWeight: 700, color: m.c || C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.v}</div>{m.sub && <div style={{ fontSize: 11, color: C.yellow, marginTop: 3 }}>{m.sub}</div>}</div>
      )}
    </div>
    {(() => {
      const horasHoy = Array.from({ length: cfg.hora_fin - cfg.hora_inicio }, (_, i) => cfg.hora_inicio + i);
      const ahoraHr = new Date().getHours();
      return <div style={{ ...card, marginBottom: 16, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>Cronograma de hoy</span>
          <span style={{ fontSize: 11, color: C.t3 }}>{tHoy.length} turno{tHoy.length !== 1 ? "s" : ""} · {horasHoy.length - (tHoy.length)} libres</span>
        </div>
        <div style={{ padding: "12px 14px 6px" }}>
          <div style={{ display: "flex", gap: 2, height: 46 }}>
            {horasHoy.map(hr => {
              const t = tHoy.find(x => x.hora === hr);
              const c2 = t ? cById(t.cliente_id) : null;
              const isPast = hr < ahoraHr; const isCurr = hr === ahoraHr;
              const isPico = hr >= cfg.hora_pico_inicio && hr < cfg.hora_pico_fin;
              const bgCell = t ? (t.tipo === "abono" ? C.purpleBg : t.tipo === "clase" ? C.infoBg : "#3A1A0A") : isPast ? C.bg : isPico ? "rgba(224,91,40,0.06)" : C.bgElev;
              const bdCell = isCurr ? C.coral : t ? (t.tipo === "abono" ? C.purpleBd : t.tipo === "clase" ? "rgba(90,160,240,0.4)" : C.coralD) : C.border;
              const fgCell = t ? (t.tipo === "abono" ? C.purple : t.tipo === "clase" ? C.info : C.coral) : isCurr ? C.coral : C.t3;
              return <div key={hr} title={t ? `${hr}:00 — ${c2?.nombre || "?"}` : `${hr}:00 — libre`}
                onClick={() => t && openM("verTurno", { ...t, cliente: c2, instructor: iById(t.instructor_id) })}
                style={{ flex: 1, borderRadius: 5, background: bgCell, border: `1.5px solid ${bdCell}`, opacity: isPast && !t ? 0.3 : 1, cursor: t ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, overflow: "hidden", position: "relative", transition: "transform 0.1s" }}
                onMouseEnter={e => { if (t) e.currentTarget.style.transform = "scaleY(1.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scaleY(1)"; }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: fgCell, lineHeight: 1 }}>{hr}</div>
                {t && <div style={{ fontSize: 7.5, color: fgCell, lineHeight: 1, maxWidth: "94%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c2?.nombre?.split(" ")[0]?.[0] || "?"}</div>}
                {isCurr && !t && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.coral, marginTop: 1 }} />}
              </div>;
            })}
          </div>
          <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
            {horasHoy.map(hr => <div key={hr} style={{ flex: 1, textAlign: "center", fontSize: 7, color: C.t3, lineHeight: 1 }}>{hr % 2 === 0 ? hr : ""}</div>)}
          </div>
        </div>
      </div>;
    })()}
    {clima && <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: C.t2 }}>Pronóstico — Alto Paraná</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {clima.map((d, i) => { const esH = d.fecha === h; const ll = d.lluvia >= 60; return <div key={i} style={{ flex: 1, minWidth: 70, textAlign: "center", padding: "10px 8px", borderRadius: 10, background: esH ? C.bgElev : ll ? "rgba(90,160,240,0.08)" : C.bg, border: `1px solid ${esH ? C.coral : C.border}` }}>
          <div style={{ fontSize: 11, color: C.t2, marginBottom: 4 }}>{esH ? "Hoy" : DIAS[new Date(d.fecha + "T12:00:00").getDay()]}</div>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{climaIcon(d.code)}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{d.max}°</div>
          <div style={{ fontSize: 11, color: C.t2 }}>{d.min}°</div>
          <div style={{ fontSize: 11, marginTop: 4, color: ll ? C.info : C.green, fontWeight: 500 }}>{d.lluvia}%💧</div>
        </div>; })}
      </div>
    </div>}
    {(vencidos.length > 0 || stockBajo.length > 0) && <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {vencidos.length > 0 && <div style={{ flex: 1, background: C.yellowBg, borderRadius: 10, padding: "9px 14px", fontSize: 13, color: C.yellow, border: `1px solid ${C.yellowBd}` }}>{vencidos.length} abono{vencidos.length > 1 ? "s" : ""} vencido{vencidos.length > 1 ? "s" : ""}</div>}
      {stockBajo.length > 0 && <div style={{ flex: 1, background: C.redBg, borderRadius: 10, padding: "9px 14px", fontSize: 13, color: C.red, border: `1px solid ${C.redBd}` }}>{stockBajo.map(s => s.nombre).join(", ")} — stock bajo</div>}
    </div>}
    <div style={card}>
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14, color: C.t1 }}>Turnos de hoy</div>
      {tHoy.length === 0 ? <div style={{ textAlign: "center", padding: "32px", color: C.t3, fontSize: 13 }}>Sin turnos para hoy</div> : <div style={{ display: "grid", gap: 8 }}>
        {tHoy.map(t => { const c = cById(t.cliente_id); const ins = iById(t.instructor_id); return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 12, padding: isMobile ? "10px 12px" : "10px 14px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => openM("verTurno", { ...t, cliente: c, instructor: ins })}>
          <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.coral, minWidth: isMobile ? 38 : 44, flexShrink: 0 }}>{t.hora}:00</div>
          <Avatar nombre={c?.nombre} size={isMobile ? 32 : 36} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.nombre || "?"}</div><div style={{ fontSize: 11, color: C.t2, marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>{tipoBadge(t.tipo)} {!isMobile && estadoBadge(t.estado)}{ins && !isMobile && <span>· {ins.nombre}</span>}{t.sena > 0 && !isMobile && <span style={{ color: C.green }}>· Seña: {gs(t.sena)}</span>}</div></div>
          {(t.estado === "reservado" || t.estado === "pendiente_pago") && <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <Btn v="success" sm onClick={() => setDlg({ type: "confirmar", t })}>{isMobile ? "💰" : (t.estado === "pendiente_pago" ? "💰 Confirmar pago" : `✓ Cobrar ${gs(t.precio - (t.sena || 0))}`)}</Btn>
            <Btn v="danger" sm onClick={() => setDlg({ type: "cancelar", t })}>✗</Btn>
          </div>}
        </div>; })}
      </div>}
    </div>
  </div>;
}
