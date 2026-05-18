import React from "react";
import { C, DIAS, DIAS_FULL, MESES } from "../lib/constants.js";
import { gs, hoy, fmtD, fmtFechaLegible } from "../lib/utils.js";
import { Btn } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

export default function Agenda() {
  const {
    turnos, cfg,
    isMobile, openM, setDlg, cById, iById,
    getSemana, turnosAbonados, semOff, setSemOff,
    nowTime, agendaDiaIdx, setAgendaDiaIdx,
    horas, getFeriado,
    diasBloqueados, setDayConfigFecha,
    draggingId, setDraggingId, dragOver, setDragOver,
  } = useAdmin();

  const dias = getSemana(); const h = hoy(); const extra = turnosAbonados(); const all = [...turnos, ...extra];
  const timeCol = isMobile ? 30 : 52;
  const cellMinH = isMobile ? 32 : 40;
  const nowHr = nowTime.getHours();
  const nowPct = (nowTime.getMinutes() / 60) * 100;

  if (isMobile) {
    const idxSafe = Math.min(Math.max(agendaDiaIdx, 0), 6);
    const diaActual = dias[idxSafe];
    const fsActual = fmtD(diaActual);
    return <div>
      {/* Header semana + nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, whiteSpace: "nowrap" }}>{dias[0].getDate()} {MESES[dias[0].getMonth()]} — {dias[6].getDate()} {MESES[dias[6].getMonth()]}</div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Btn sm onClick={() => setSemOff(o => o - 1)} style={{ padding: "6px 9px", minWidth: 32 }}>←</Btn>
          <Btn sm onClick={() => { setSemOff(0); setAgendaDiaIdx((new Date().getDay() + 6) % 7); }}>Hoy</Btn>
          <Btn sm onClick={() => setSemOff(o => o + 1)} style={{ padding: "6px 9px", minWidth: 32 }}>→</Btn>
        </div>
      </div>
      {/* Pills de día */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 14 }}>
        {dias.map((d, i) => {
          const fs = fmtD(d); const isSel = i === idxSafe; const isH = fs === h;
          const cnt = all.filter(t => t.fecha === fs && t.estado !== "cancelado").length;
          const feriado = getFeriado(fs);
          const bloqueado = diasBloqueados.find(b => b.fecha === fs && b.tipo === 'bloqueado');
          const especial = diasBloqueados.find(b => b.fecha === fs && b.tipo === 'horario');
          return <button key={i} onClick={() => setAgendaDiaIdx(i)}
            style={{ padding: "8px 2px", borderRadius: 10,
              background: isSel ? C.coral : bloqueado ? "rgba(240,96,96,0.12)" : especial ? "rgba(52,212,144,0.08)" : feriado ? "rgba(245,192,96,0.08)" : isH ? "rgba(224,91,40,0.1)" : C.bgElev,
              border: `1px solid ${isSel ? C.coral : bloqueado ? C.redBd : especial ? C.greenBd : feriado ? C.yellowBd : isH ? C.coralD : C.border}`,
              color: isSel ? "#fff" : bloqueado ? C.red : especial ? C.green : feriado ? C.yellow : isH ? C.coral : C.t1,
              cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 0, transition: "all 0.15s" }}>
            <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.85, letterSpacing: 0.2 }}>{DIAS[d.getDay()].slice(0, 3).toUpperCase()}</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{d.getDate()}</span>
            <span style={{ fontSize: 8, fontWeight: 600, marginTop: 1, opacity: bloqueado || especial || feriado || cnt > 0 ? 1 : 0 }}>
              {bloqueado ? "🔒" : especial ? "🕐" : feriado ? "🇵🇾" : cnt > 0 ? `${cnt}t` : "·"}
            </span>
          </button>;
        })}
      </div>
      {/* Título día seleccionado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
        <div style={{ fontSize: 13, color: C.t2, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          {fsActual === h ? "Hoy" : `${DIAS_FULL[diaActual.getDay()]} ${diaActual.getDate()}`}
          {getFeriado(fsActual) && <span style={{ fontSize: 10, color: C.yellow }}>🇵🇾 Feriado</span>}
          {diasBloqueados.find(b => b.fecha === fsActual && b.tipo === "bloqueado") && <span style={{ fontSize: 10, color: C.red }}>🔒 Cerrado</span>}
          {diasBloqueados.find(b => b.fecha === fsActual && b.tipo === "horario") && <span style={{ fontSize: 10, color: C.green }}>🕐 Especial</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.t3 }}>{all.filter(t => t.fecha === fsActual && t.estado !== "cancelado").length} de {horas.length}</span>
          <button onClick={() => setDayConfigFecha(fsActual)} style={{ background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: C.t2, fontFamily: "var(--font-sans)" }}>⚙️</button>
        </div>
      </div>
      {/* Lista de horas vertical */}
      <div style={{ display: "grid", gap: 5 }}>
        {horas.map(hr => {
          const t = all.find(t => t.fecha === fsActual && t.hora === hr && t.estado !== "cancelado");
          const c = t ? cById(t.cliente_id) : null;
          const isPico = hr >= cfg.hora_pico_inicio && hr < cfg.hora_pico_fin;
          const isToday = fsActual === h;
          const isNowHr = isToday && hr === nowHr;
          const isPast = isToday && hr < nowHr;
          const ins = t ? iById(t.instructor_id) : null;
          return <div key={hr}
            onClick={() => t ? openM("verTurno", { ...t, cliente: c, instructor: ins }) : openM("turno", { fecha: fsActual, hora: hr, tipo: "ocasional" })}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: t ? (t.tipo === "abono" ? "rgba(160,128,255,0.06)" : t.tipo === "clase" ? "rgba(90,160,240,0.06)" : "rgba(224,91,40,0.06)") : isPast ? C.bg : isPico ? "rgba(224,91,40,0.03)" : C.bgElev,
              border: `1px solid ${isNowHr ? C.coral : t ? (t.tipo === "abono" ? C.purpleBd : t.tipo === "clase" ? "rgba(90,160,240,0.3)" : C.coralD) : C.border}`,
              opacity: isPast && !t ? 0.5 : 1,
              cursor: "pointer",
              position: "relative",
              minHeight: 48,
              overflow: "hidden",
            }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isNowHr ? C.coral : t ? (t.tipo === "abono" ? C.purple : t.tipo === "clase" ? C.info : C.coral) : C.t2, minWidth: 42, flexShrink: 0 }}>{hr}:00</div>
            {t ? <>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.bgElev, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.t2, flexShrink: 0 }}>{c?.nombre?.[0] || "?"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.nombre || "?"}</div>
                <div style={{ fontSize: 10, color: C.t2, marginTop: 2, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: t.tipo === "abono" ? C.purpleBg : t.tipo === "clase" ? C.infoBg : C.redBg, color: t.tipo === "abono" ? C.purple : t.tipo === "clase" ? C.info : C.coral }}>{t.tipo}</span>
                  {isPico && <span style={{ color: C.coral, fontWeight: 600 }}>pico</span>}
                  {t.estado === "pendiente_pago" && <span style={{ color: C.yellow, fontWeight: 600 }}>pend. pago</span>}
                </div>
              </div>
              {t.precio > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: t.tipo === "abono" ? C.purple : t.tipo === "clase" ? C.info : C.coral, flexShrink: 0 }}>{gs(t.precio).replace("Gs ", "")}</div>}
            </> : <div style={{ flex: 1, fontSize: 12, color: isPast ? C.t3 : isPico ? C.coral : C.t3, opacity: isPast ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{isPast ? "—" : "Libre"}</span>
              {!isPast && isPico && <span style={{ fontSize: 10, padding: "1px 5px", background: "rgba(224,91,40,0.1)", border: `1px solid ${C.coralD}`, borderRadius: 4, color: C.coral, fontWeight: 600 }}>pico</span>}
            </div>}
            {isNowHr && <div style={{ position: "absolute", left: 0, right: 0, top: `${nowPct}%`, height: 2, background: C.red, pointerEvents: "none", boxShadow: "0 0 6px rgba(240,96,96,0.7)", zIndex: 2 }} />}
          </div>;
        })}
      </div>
      {/* Leyenda */}
      <div style={{ display: "flex", gap: 10, marginTop: 12, fontSize: 10.5, color: C.t3, flexWrap: "wrap", justifyContent: "center" }}>
        <span><span style={{ width: 9, height: 9, borderRadius: 2, background: C.redBg, border: `1px solid ${C.coral}`, display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />Ocasional</span>
        <span><span style={{ width: 9, height: 9, borderRadius: 2, background: C.purpleBg, border: `1px solid ${C.purple}`, display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />Abonado</span>
        <span><span style={{ width: 9, height: 9, borderRadius: 2, background: C.infoBg, border: `1px solid ${C.info}`, display: "inline-block", marginRight: 4, verticalAlign: "middle" }} />Clase</span>
      </div>
    </div>;
  }
  /* ── DESKTOP ── */
  const bCell = `1px solid ${C.border}`;
  const cellBg = (fs, hr, t, isDragTarget) => {
    if (isDragTarget) return "rgba(224,91,40,0.15)";
    if (t) return t.tipo === "abono" ? "rgba(140,100,255,0.10)" : t.tipo === "clase" ? "rgba(90,160,240,0.10)" : "rgba(224,91,40,0.10)";
    const isToday = fs === h; const isPast = isToday && hr < nowHr;
    if (isPast) return C.bgCard;
    if (hr >= cfg.hora_pico_inicio && hr < cfg.hora_pico_fin) return "rgba(224,91,40,0.03)";
    return C.bgCard;
  };
  return <div>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.coral, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>AGENDA</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: C.t1, letterSpacing: -0.5, lineHeight: 1.1 }}>Agenda</div>
        <div style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>Vista semanal de turnos</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => openM("horarios", {})} style={{ height: 38, padding: "0 14px", borderRadius: 10, background: C.bgElev, border: bCell, color: C.t2, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-sans)" }}>⏱ Horarios</button>
        <button onClick={() => setSemOff(o => o - 1)} style={{ width: 38, height: 38, borderRadius: 10, background: C.bgElev, border: bCell, color: C.t1, cursor: "pointer", fontSize: 18, fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <button onClick={() => setSemOff(0)} style={{ height: 38, padding: "0 18px", borderRadius: 10, background: C.bgElev, border: bCell, color: C.t1, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)" }}>Hoy</button>
        <button onClick={() => setSemOff(o => o + 1)} style={{ width: 38, height: 38, borderRadius: 10, background: C.bgElev, border: bCell, color: C.t1, cursor: "pointer", fontSize: 18, fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        <button onClick={() => openM("turno", { fecha: h, hora: cfg.hora_inicio, tipo: "ocasional" })} style={{ height: 38, padding: "0 20px", borderRadius: 10, background: C.coral, border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 7, boxShadow: "0 4px 16px rgba(224,91,40,0.4)" }}>
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: -1 }}>+</span>Reservar
        </button>
      </div>
    </div>
    {/* Grilla */}
    <div style={{ borderRadius: 14, overflow: "hidden", border: bCell, background: C.bgCard }}>
      {/* Fila header: esquina + 7 días */}
      <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7,1fr)" }}>
        <div style={{ borderBottom: bCell, borderRight: bCell, background: C.bgCard }} />
        {dias.map((d, i) => {
          const fs = fmtD(d);
          const isH = fs === h;
          const cnt = all.filter(t => t.fecha === fs && t.estado !== "cancelado").length;
          const feriado = getFeriado(fs);
          const bloqueado = diasBloqueados.find(b => b.fecha === fs);
          const especial = bloqueado?.tipo === "horario" ? bloqueado : null;
          return <div key={i} onClick={() => setDayConfigFecha(fs)}
            style={{ borderBottom: bCell, borderRight: i < 6 ? bCell : "none",
              background: bloqueado?.tipo === "bloqueado" ? "rgba(240,96,96,0.04)" : especial ? "rgba(52,212,144,0.04)" : isH ? "rgba(224,91,40,0.07)" : feriado ? "rgba(245,192,96,0.04)" : C.bgCard,
              padding: "10px 6px", textAlign: "center", position: "relative", cursor: "pointer",
              transition: "background 0.15s" }}
            title="Configurar este día">
            {isH && <div style={{ position: "absolute", top: 5, right: 5, fontSize: 9, fontWeight: 700, color: "#fff", background: C.coral, padding: "2px 5px", borderRadius: 5 }}>{String(nowTime.getHours()).padStart(2, "0")}:{String(nowTime.getMinutes()).padStart(2, "0")}</div>}
            <div style={{ fontSize: 10, fontWeight: 600, color: bloqueado?.tipo === "bloqueado" ? C.red : especial ? C.green : isH ? C.coral : feriado ? C.yellow : C.t3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{DIAS[d.getDay()]}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: bloqueado?.tipo === "bloqueado" ? C.red : especial ? C.green : isH ? C.coral : feriado ? C.yellow : C.t1 }}>{d.getDate()}</div>
            {feriado && !bloqueado && <div style={{ fontSize: 8, color: C.yellow, fontWeight: 600, marginTop: 2 }}>🇵🇾 Feriado</div>}
            {bloqueado?.tipo === "bloqueado" && <div style={{ fontSize: 8, color: C.red, fontWeight: 600, marginTop: 2 }}>🔒 Cerrado</div>}
            {especial && <div style={{ fontSize: 8, color: C.green, fontWeight: 600, marginTop: 2 }}>🕐 {especial.hora_inicio}–{especial.hora_fin}h</div>}
            {!feriado && !bloqueado && (cnt > 0
              ? <div style={{ marginTop: 4 }}>
                <div style={{ width: "50%", margin: "0 auto", height: 3, borderRadius: 2, background: C.bgElev, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round(cnt / horas.length * 100))}%`, background: cnt / horas.length > 0.7 ? C.red : cnt / horas.length > 0.4 ? C.yellow : C.green }} />
                </div>
              </div>
              : <div style={{ marginTop: 4, height: 7 }} />
            )}
          </div>;
        })}
      </div>
      {/* Filas de horas */}
      {horas.map((hr, hrIdx) => (
        <div key={hr} style={{ display: "grid", gridTemplateColumns: "52px repeat(7,1fr)" }}>
          <div style={{ borderBottom: hrIdx < horas.length - 1 ? bCell : "none", borderRight: bCell, padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 11, color: C.t3, minHeight: 40, fontWeight: 500, background: C.bgCard }}>
            {hr}:00
          </div>
          {dias.map((d, di) => {
            const fs = fmtD(d);
            const t = all.find(t => t.fecha === fs && t.hora === hr && t.estado !== "cancelado");
            const c = t ? cById(t.cliente_id) : null;
            const isToday = fs === h;
            const isNowHr = isToday && hr === nowHr;
            const isPast = isToday && hr < nowHr;
            const isDragTarget = !t && dragOver?.fecha === fs && dragOver?.hora === hr && draggingId;
            const apellido = c?.nombre?.split(" ").slice(-1)[0] || "";
            const inicial = c?.nombre?.[0]?.toUpperCase() || "";
            const label = t ? (inicial + ". " + apellido) : "";
            return <div key={di}
              onClick={() => !draggingId && (t ? openM("verTurno", { ...t, cliente: c, instructor: iById(t.instructor_id) }) : openM("turno", { fecha: fs, hora: hr, tipo: "ocasional" }))}
              onDragEnter={e => { if (!t) { e.preventDefault(); setDragOver({ fecha: fs, hora: hr }); } }}
              onDragOver={e => { if (!t) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault();
                const raw = e.dataTransfer.getData("text/plain");
                const id = Number(raw);
                if (!id || t) { setDraggingId(null); setDragOver(null); return; }
                const orig = turnos.find(x => x.id === id);
                if (orig && (orig.fecha !== fs || orig.hora !== hr)) {
                  setDlg({ type: "dragReprogram", turnoId: id, newFecha: fs, newHora: hr, nombre: cById(orig.cliente_id)?.nombre || "?", fechaLabel: fmtFechaLegible(fs) });
                }
                setDraggingId(null); setDragOver(null);
              }}
              style={{
                borderBottom: hrIdx < horas.length - 1 ? bCell : "none",
                borderRight: di < 6 ? bCell : "none",
                background: cellBg(fs, hr, t, isDragTarget),
                outline: isDragTarget ? `2px dashed ${C.coral}` : "none", outlineOffset: -2,
                opacity: isPast && !t ? 0.35 : 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 40, padding: "0 4px", position: "relative",
                cursor: draggingId ? (t ? "not-allowed" : "copy") : "pointer",
                transition: "background 0.1s",
              }}>
              {t && <span
                draggable={!t._gen}
                onDragStart={t._gen ? undefined : e => { setDraggingId(t.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(t.id)); }}
                onDragEnd={t._gen ? undefined : () => { setDraggingId(null); setDragOver(null); }}
                style={{
                  fontSize: 11, fontWeight: 600,
                  color: t.tipo === "abono" ? C.purple : t.tipo === "clase" ? C.info : C.coral,
                  background: t.tipo === "abono" ? C.purpleBg : t.tipo === "clase" ? C.infoBg : C.redBg,
                  border: `1px solid ${t.tipo === "abono" ? C.purpleBd : t.tipo === "clase" ? "rgba(90,160,240,0.3)" : C.coralD}`,
                  borderRadius: 8, padding: "4px 10px",
                  maxWidth: "95%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  lineHeight: 1.3, cursor: t._gen ? "default" : "grab",
                }}>
                {label}
              </span>}
              {isNowHr && <div style={{ position: "absolute", top: `${nowPct}%`, left: 0, right: 0, height: 2, background: C.red, zIndex: 3, pointerEvents: "none", boxShadow: "0 0 6px rgba(240,96,96,0.7)" }} />}
            </div>;
          })}
        </div>
      ))}
    </div>
    {/* Leyenda */}
    <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: C.t3, flexWrap: "wrap" }}>
      <span><span style={{ width: 10, height: 10, borderRadius: 3, background: C.redBg, border: `1px solid ${C.coral}`, display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />Ocasional</span>
      <span><span style={{ width: 10, height: 10, borderRadius: 3, background: C.purpleBg, border: `1px solid ${C.purple}`, display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />Abonado</span>
      <span><span style={{ width: 10, height: 10, borderRadius: 3, background: C.infoBg, border: `1px solid ${C.info}`, display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />Clase</span>
      <span>· Arrastrá un turno para reprogramarlo</span>
    </div>
  </div>;
}
