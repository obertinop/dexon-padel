import React, { useState } from "react";
import { C, DIAS_FULL } from "../lib/constants.js";
import { gs, hoy } from "../lib/utils.js";
import { Avatar, Badge, Btn } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

const DIAS_GRILLA = [1, 2, 3, 4, 5, 6, 0];

export default function Abonados() {
  const {
    abonos, clientes, planes, abono_turnos, caja,
    isMobile, openM, setDlg, cById, pById,
    saving, setSaving, materilarizarTurnosAbono, load,
  } = useAdmin();

  const [filterPlan, setFilterPlan] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterDia, setFilterDia] = useState("");
  const [showGrilla, setShowGrilla] = useState(false);

  const h = hoy();

  const diasParaVencer = ab => {
    const diff = new Date(ab.fecha_vencimiento) - new Date(h);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const diasAbono = ab => {
    const slots = abono_turnos.filter(at => at.abono_id === ab.id);
    return slots.length === 0 ? "Sin turno fijo" : slots.map(s => `${DIAS_FULL[s.dia]} ${s.hora}:00`).join(" · ");
  };

  const pagoAbono = ab => caja.find(c => c.abono_id === ab.id);

  // Lista base ordenada: vencidos primero, luego vigentes por fecha vencimiento
  const venc = abonos.filter(a => a.fecha_vencimiento < h && a.estado === "activo");
  const vig  = abonos.filter(a => a.fecha_vencimiento >= h && a.estado === "activo");
  let lista = [...venc, ...vig];

  if (filterPlan)    lista = lista.filter(a => String(a.plan_id) === filterPlan);
  if (filterEstado === "vigentes")   lista = lista.filter(a => a.fecha_vencimiento >= h && diasParaVencer(a) > 5);
  if (filterEstado === "por_vencer") lista = lista.filter(a => diasParaVencer(a) >= 0 && diasParaVencer(a) <= 5);
  if (filterEstado === "vencidos")   lista = lista.filter(a => a.fecha_vencimiento < h);
  if (filterDia !== "") lista = lista.filter(a => abono_turnos.some(at => at.abono_id === a.id && String(at.dia) === filterDia));

  // Grilla semanal: slots de abonos activos vigentes
  const slotsActivos = abono_turnos.filter(at => {
    const ab = abonos.find(a => a.id === at.abono_id);
    return ab && ab.estado === "activo" && ab.fecha_vencimiento >= h;
  });
  const horasGrilla = [...new Set(slotsActivos.map(at => at.hora))].sort((a, b) => a - b);

  const chipStyle = active => ({
    border: `1px solid ${active ? C.coral : C.border}`,
    background: active ? "rgba(224,91,40,0.1)" : "transparent",
    color: active ? C.coral : C.t2,
    borderRadius: 20, padding: "4px 12px", fontSize: 12,
    cursor: "pointer", fontFamily: "var(--font-sans)",
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: isMobile ? 12 : 16, gap:8, flexWrap:"wrap" }}>
        <span style={{ fontSize: isMobile ? 14 : 16, fontWeight:600, color:C.t1 }}>Abonados</span>
        <div style={{ display:"flex", gap:6 }}>
          <Btn v="ghost" sm={isMobile} onClick={() => setShowGrilla(g => !g)}>{showGrilla ? "Ocultar grilla" : "Ver grilla"}</Btn>
          <Btn v="ghost" sm={isMobile} onClick={() => openM("plan", {})}>{isMobile ? "Planes" : "Gestionar planes"}</Btn>
          {!isMobile && <Btn v="primary" onClick={() => openM("abono", { fecha_inicio: hoy(), slots: [] })}>+ Nuevo abono</Btn>}
        </div>
      </div>

      {/* Grilla semanal de slots */}
      {showGrilla && (
        <div style={{ marginBottom:16, background:"rgba(255,255,255,0.02)", borderRadius:12, border:`1px solid ${C.border}`, padding:"12px 14px", overflowX:"auto" }}>
          <div style={{ fontSize:12, fontWeight:600, color:C.t2, marginBottom:10 }}>Slots ocupados por abonados activos</div>
          {horasGrilla.length === 0
            ? <div style={{ fontSize:12, color:C.t3 }}>Sin slots registrados</div>
            : <table style={{ borderCollapse:"collapse", fontSize:11, width:"100%" }}>
                <thead>
                  <tr>
                    <th style={{ padding:"4px 10px", color:C.t3, fontWeight:500, textAlign:"left", whiteSpace:"nowrap" }}>Hora</th>
                    {DIAS_GRILLA.map(d => (
                      <th key={d} style={{ padding:"4px 8px", color:C.t3, fontWeight:500, textAlign:"center" }}>
                        {DIAS_FULL[d].slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horasGrilla.map(hora => (
                    <tr key={hora}>
                      <td style={{ padding:"4px 10px", color:C.t2, whiteSpace:"nowrap" }}>{hora}:00</td>
                      {DIAS_GRILLA.map(dia => {
                        const ocup = slotsActivos.filter(at => at.hora === hora && at.dia === dia);
                        return (
                          <td key={dia} style={{ padding:"3px 4px", textAlign:"center" }}>
                            {ocup.length > 0 ? (
                              <div style={{ background:C.purpleBg, border:`1px solid ${C.purpleBd}`, borderRadius:4, padding:"2px 6px", fontSize:10, color:C.purple, whiteSpace:"nowrap" }}>
                                {ocup.map(at => cById(abonos.find(a => a.id === at.abono_id)?.cliente_id)?.nombre?.split(" ")[0] || "?").join(", ")}
                              </div>
                            ) : (
                              <span style={{ color:C.t3 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* Alerta vencidos */}
      {venc.length > 0 && (
        <div style={{ background:C.yellowBg, borderRadius:10, padding:"10px 14px", fontSize:13, color:C.yellow, border:`1px solid ${C.yellowBd}`, marginBottom:14 }}>
          {venc.length} abono{venc.length > 1 ? "s" : ""} vencido{venc.length > 1 ? "s" : ""}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        {[
          { k:"todos",      l:"Todos"      },
          { k:"vigentes",   l:"Vigentes"   },
          { k:"por_vencer", l:"Por vencer" },
          { k:"vencidos",   l:"Vencidos"   },
        ].map(({ k, l }) => (
          <button key={k} onClick={() => setFilterEstado(k)} style={chipStyle(filterEstado === k)}>{l}</button>
        ))}

        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ ...chipStyle(!!filterPlan), outline:"none" }}>
          <option value="">Todos los planes</option>
          {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <select value={filterDia} onChange={e => setFilterDia(e.target.value)} style={{ ...chipStyle(filterDia !== ""), outline:"none" }}>
          <option value="">Todos los días</option>
          {DIAS_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </div>

      {/* Lista de abonados */}
      <div style={{ display:"grid", gap:8 }}>
        {lista.length === 0 && (
          <div style={{ color:C.t3, fontSize:13, padding:"20px 0", textAlign:"center" }}>Sin resultados</div>
        )}
        {lista.map(ab => {
          const c       = cById(ab.cliente_id);
          const pl      = pById(ab.plan_id);
          const expired = ab.fecha_vencimiento < h;
          const dias_   = diasParaVencer(ab);
          const pronto  = !expired && dias_ <= 5;
          const pago    = pagoAbono(ab);

          // fecha_inicio para renovación anticipada: día siguiente al vencimiento actual
          const nextIni = expired
            ? hoy()
            : (() => { const d = new Date(ab.fecha_vencimiento); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();

          return (
            <div key={ab.id} style={{
              background: "rgba(255,255,255,0.03)", borderRadius:12,
              border: `1px solid ${expired ? "rgba(239,68,68,0.3)" : pronto ? C.yellowBd : C.border}`,
              padding: isMobile ? "12px 14px" : "14px 16px",
            }}>
              <div style={{ display:"flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 10 : 14, flexDirection: isMobile ? "column" : "row" }}>

                {/* Info cliente */}
                <div style={{ display:"flex", alignItems:"center", gap:10, ...(isMobile ? { width:"100%" } : { flex:1 }) }}>
                  <Avatar nombre={c?.nombre} size={isMobile ? 36 : 40} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize: isMobile ? 13 : 14, color:C.t1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {c?.nombre || "?"}
                    </div>
                    <div style={{ fontSize:12, color:C.t2, marginTop:2 }}>
                      {pl?.nombre || "Plan"} · {gs(ab.precio_acordado)}/mes
                    </div>
                    {!isMobile && (
                      <div style={{ fontSize:12, color:C.t3, marginTop:2 }}>{diasAbono(ab)}</div>
                    )}
                    {pago && (
                      <div style={{ fontSize:11, color:C.t3, marginTop:2 }}>
                        Cobrado {pago.fecha} · {gs(pago.monto)}
                      </div>
                    )}
                    {!pago && (
                      <div style={{ fontSize:11, color:C.yellow, marginTop:2 }}>Sin cobro registrado</div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display:"flex", flexDirection: isMobile ? "row" : "column", alignItems: isMobile ? "center" : "flex-end", gap:8, ...(isMobile ? { width:"100%", justifyContent:"space-between" } : {}) }}>
                  {expired
                    ? <Badge type="danger">Vencido {ab.fecha_vencimiento?.slice(5)}</Badge>
                    : pronto
                      ? <Badge type="warn">Vence en {dias_}d</Badge>
                      : <Badge type="ok">Hasta {ab.fecha_vencimiento?.slice(5)}</Badge>
                  }
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent: isMobile ? "flex-end" : "flex-end" }}>
                    {(expired || pronto) && (
                      <Btn v="primary" sm onClick={() => openM("abono", {
                        cliente_id: ab.cliente_id, plan_id: ab.plan_id,
                        precio_acordado: ab.precio_acordado, fecha_inicio: nextIni,
                        slots: abono_turnos.filter(at => at.abono_id === ab.id).map(at => ({ dia: at.dia, hora: at.hora })),
                      })}>Renovar</Btn>
                    )}
                    {!expired && (
                      <Btn v="ghost" sm onClick={() => openM("editarAbono", {
                        id: ab.id, nombre_cliente: c?.nombre,
                        slots: abono_turnos.filter(at => at.abono_id === ab.id).map(at => ({ dia: at.dia, hora: at.hora })),
                      })}>Editar</Btn>
                    )}
                    {!expired && (
                      <Btn v="ghost" sm onClick={async () => {
                        setSaving(true);
                        const slots = abono_turnos.filter(at => at.abono_id === ab.id).map(at => ({ dia: at.dia, hora: at.hora }));
                        await materilarizarTurnosAbono(ab.id, ab.cliente_id, slots, ab.fecha_vencimiento);
                        await load();
                        setSaving(false);
                      }} disabled={saving}>Generar</Btn>
                    )}
                    <Btn v="danger" sm onClick={() => setDlg({ type:"cancelarAbono", id:ab.id, nombre:c?.nombre })}>Cancelar</Btn>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
