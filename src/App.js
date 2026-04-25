import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://wirsrkuxzltedqdkrdak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcnNya3V4emx0ZWRxZGtyZGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjEzMjMsImV4cCI6MjA5MjYzNzMyM30.BjxD2R5bgBUHyalpwFhRzsGEzOnCx4PH9Sb65d609VI";

const api = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.method === "POST" ? "return=representation" : undefined,
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const db = {
  get: (table, params = "") => api(`${table}?${params}`),
  post: (table, body) => api(table, { method: "POST", body: JSON.stringify(body), headers: { Prefer: "return=representation" } }),
  patch: (table, id, body) => api(`${table}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { Prefer: "return=representation" } }),
  delete: (table, id) => api(`${table}?id=eq.${id}`, { method: "DELETE" }),
};

const gs = (n) => "Gs " + Math.round(n).toLocaleString("es-PY");
const todayStr = () => new Date().toISOString().slice(0, 10);
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const s = {
  nav: { display: "flex", gap: 4, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 0 },
  navBtn: (active) => ({ padding: "8px 16px", fontSize: 13, border: "none", background: "none", cursor: "pointer", color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)", borderBottom: active ? "2px solid #D85A30" : "2px solid transparent", fontWeight: active ? 500 : 400 }),
  panel: { padding: "16px 0" },
  card: { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px" },
  metric: { background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 16px" },
  btn: (primary) => ({ padding: "7px 14px", borderRadius: 8, border: primary ? "none" : "0.5px solid var(--color-border-secondary)", background: primary ? "#D85A30" : "var(--color-background-primary)", color: primary ? "#fff" : "var(--color-text-primary)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-sans)" }),
  input: { padding: "7px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 13, width: "100%", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" },
  label: { fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 4, display: "block" },
  th: { textAlign: "left", padding: "8px 10px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" },
  td: { padding: "8px 10px", fontSize: 13, borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)" },
};

const Badge = ({ type, children }) => {
  const styles = {
    ok: { background: "#EAF3DE", color: "#3B6D11" },
    warn: { background: "#FAEEDA", color: "#854F0B" },
    danger: { background: "#FCEBEB", color: "#A32D2D" },
    info: { background: "#E6F1FB", color: "#185FA5" },
    gray: { background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" },
  };
  return <span style={{ ...styles[type], fontSize: 11, padding: "2px 8px", borderRadius: 100, fontWeight: 500, display: "inline-block" }}>{children}</span>;
};

const Modal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ ...s.card, width: 360, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Spinner = () => <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-secondary)", fontSize: 13 }}>Cargando...</div>;

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [clientes, setClientes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [caja, setCaja] = useState([]);
  const [mensualidades, setMensualidades] = useState([]);
  const [config, setConfig] = useState({ hora_inicio: 10, hora_fin: 24, tarifa_hora: 80000, nombre_club: "DEXON PADEL" });
  const [loading, setLoading] = useState(true);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, re, ca, me, cf] = await Promise.all([
        db.get("clientes", "order=nombre.asc"),
        db.get("reservas", "order=fecha.asc,hora.asc"),
        db.get("caja", "order=fecha.desc,id.desc"),
        db.get("mensualidades", "order=fecha_vencimiento.asc"),
        db.get("configuracion", "limit=1"),
      ]);
      setClientes(cl || []);
      setReservas(re || []);
      setCaja(ca || []);
      setMensualidades(me || []);
      if (cf && cf[0]) setConfig(cf[0]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const horas = Array.from({ length: config.hora_fin - config.hora_inicio }, (_, i) => config.hora_inicio + i);

  const getSemana = () => {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) + semanaOffset * 7);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });
  };

  const fmtD = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  const clienteById = (id) => clientes.find(c => c.id === id);

  const openModal = (name, data = {}) => { setForm(data); setModal(name); };
  const closeModal = () => { setModal(null); setForm({}); };

  // GUARDAR RESERVA
  const guardarReserva = async () => {
    if (!form.cliente_id || !form.fecha || form.hora === undefined) return;
    const existe = reservas.find(r => r.fecha === form.fecha && r.hora === Number(form.hora));
    if (existe) { alert("Ese turno ya está ocupado."); return; }
    setSaving(true);
    try {
      const [res] = await db.post("reservas", { cliente_id: Number(form.cliente_id), fecha: form.fecha, hora: Number(form.hora), tipo_pago: form.tipo_pago || "efectivo" });
      if (form.tipo_pago !== "mensualidad") {
        const c = clienteById(Number(form.cliente_id));
        await db.post("caja", { descripcion: `Reserva - ${c?.nombre || ""}`, tipo: "ingreso", monto: config.tarifa_hora, fecha: form.fecha, reserva_id: res.id });
      }
      await loadAll();
      closeModal();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  // GUARDAR CLIENTE
  const guardarCliente = async () => {
    if (!form.nombre?.trim()) return;
    setSaving(true);
    try {
      await db.post("clientes", { nombre: form.nombre.trim(), telefono: form.telefono || "", tipo: form.tipo || "ocasional" });
      await loadAll();
      closeModal();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  // GUARDAR MENSUALIDAD
  const guardarMensualidad = async () => {
    if (!form.cliente_id || !form.monto || !form.fecha_inicio) return;
    setSaving(true);
    try {
      const inicio = new Date(form.fecha_inicio);
      const venc = new Date(inicio);
      venc.setMonth(venc.getMonth() + 1);
      await db.post("mensualidades", {
        cliente_id: Number(form.cliente_id),
        plan: form.plan || "Mensual",
        monto: Number(form.monto),
        fecha_inicio: form.fecha_inicio,
        fecha_vencimiento: fmtD(venc),
        estado: "pagado",
      });
      await db.post("caja", { descripcion: `Mensualidad - ${clienteById(Number(form.cliente_id))?.nombre || ""}`, tipo: "ingreso", monto: Number(form.monto), fecha: form.fecha_inicio });
      await loadAll();
      closeModal();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  // GUARDAR MOVIMIENTO
  const guardarMovimiento = async () => {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    try {
      await db.post("caja", { descripcion: form.descripcion, tipo: form.tipo || "ingreso", monto: Number(form.monto), fecha: form.fecha || todayStr() });
      await loadAll();
      closeModal();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  // GUARDAR CONFIG
  const guardarConfig = async () => {
    setSaving(true);
    try {
      await db.patch("configuracion", config.id, { hora_inicio: Number(form.hora_inicio), hora_fin: Number(form.hora_fin), tarifa_hora: Number(form.tarifa_hora), nombre_club: form.nombre_club });
      await loadAll();
      closeModal();
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  };

  // ELIMINAR RESERVA
  const eliminarReserva = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm("¿Eliminar esta reserva?")) return;
    await db.delete("reservas", id);
    await loadAll();
  };

  const whatsapp = (cliente, reserva) => {
    const msg = encodeURIComponent(`Hola ${cliente.nombre}, tu turno en ${config.nombre_club} está confirmado para el ${reserva.fecha} a las ${reserva.hora}:00hs. ¡Te esperamos!`);
    window.open(`https://wa.me/595${(cliente.telefono || "").replace(/\D/g, "").slice(1)}?text=${msg}`, "_blank");
  };

  // ── DASHBOARD ──
  const Dashboard = () => {
    const hoy = todayStr();
    const mes = hoy.slice(0, 7);
    const resHoy = reservas.filter(r => r.fecha === hoy);
    const ingHoy = caja.filter(m => m.fecha === hoy && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
    const ingMes = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
    const deudores = mensualidades.filter(m => m.estado !== "pagado" || m.fecha_vencimiento < hoy);
    const proximas = reservas.filter(r => r.fecha >= hoy).slice(0, 6);

    return (
      <div style={s.panel}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Ingresos hoy", value: gs(ingHoy) },
            { label: "Ingresos del mes", value: gs(ingMes) },
            { label: "Turnos hoy", value: `${resHoy.length}/${horas.length}` },
            { label: "Mensualeros", value: clientes.filter(c => c.tipo === "mensualero").length, sub: `${deudores.length} con deuda` },
          ].map((m, i) => (
            <div key={i} style={s.metric}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{m.value}</div>
              {m.sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={s.card}>
            <div style={{ fontWeight: 500, marginBottom: 12 }}>Próximas reservas</div>
            {proximas.length === 0 ? <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Sin reservas próximas</p> :
              proximas.map(r => {
                const c = clienteById(r.cliente_id);
                return <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
                  <span>{c?.nombre || "?"}</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>{r.fecha.slice(5)} · {r.hora}:00</span>
                </div>;
              })}
          </div>
          <div style={s.card}>
            <div style={{ fontWeight: 500, marginBottom: 12 }}>Mensualidades vencidas</div>
            {deudores.length === 0 ? <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Todo al día</p> :
              deudores.slice(0, 5).map(m => {
                const c = clienteById(m.cliente_id);
                return <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }}>
                  <span>{c?.nombre || "?"}</span>
                  <Badge type="danger">Venc. {m.fecha_vencimiento?.slice(5)}</Badge>
                </div>;
              })}
          </div>
        </div>
      </div>
    );
  };

  // ── CALENDARIO ──
  const Calendario = () => {
    const dias = getSemana();
    const p = dias[0]; const u = dias[6];
    return (
      <div style={s.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Semana {p.getDate()}/{p.getMonth() + 1} — {u.getDate()}/{u.getMonth() + 1}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={s.btn(false)} onClick={() => setSemanaOffset(o => o - 1)}>← Anterior</button>
            <button style={s.btn(false)} onClick={() => setSemanaOffset(o => o + 1)}>Siguiente →</button>
            <button style={s.btn(true)} onClick={() => openModal("reserva", { fecha: todayStr(), hora: config.hora_inicio, tipo_pago: "efectivo" })}>+ Nueva reserva</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `50px repeat(7,1fr)`, gap: 1, background: "var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden", fontSize: 12 }}>
          <div style={{ background: "var(--color-background-secondary)", padding: "6px 4px" }} />
          {dias.map((d, i) => {
            const isHoy = fmtD(d) === todayStr();
            return <div key={i} style={{ background: "var(--color-background-secondary)", padding: "6px 4px", textAlign: "center", fontWeight: 500, color: isHoy ? "#D85A30" : "var(--color-text-secondary)", fontSize: 11 }}>{DIAS[d.getDay()]} {d.getDate()}</div>;
          })}
          {horas.map(h => (
            <>
              <div key={`t${h}`} style={{ background: "var(--color-background-secondary)", padding: "6px 8px", textAlign: "right", fontSize: 11, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>{h}:00</div>
              {dias.map((d, di) => {
                const fs = fmtD(d);
                const res = reservas.find(r => r.fecha === fs && r.hora === h);
                const c = res ? clienteById(res.cliente_id) : null;
                return <div key={`${h}-${di}`}
                  onClick={() => res ? null : openModal("reserva", { fecha: fs, hora: h, tipo_pago: "efectivo" })}
                  style={{ background: res ? "#FAECE7" : "var(--color-background-primary)", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", cursor: res ? "default" : "pointer", minHeight: 34 }}>
                  {res && <span style={{ fontSize: 11, color: "#993C1D", fontWeight: 500, background: "#F5C4B3", borderRadius: 4, padding: "2px 5px", cursor: "pointer" }}
                    onClick={() => openModal("verReserva", { ...res, cliente: c })}>{c?.nombre?.split(" ")[0] || "?"}</span>}
                </div>;
              })}
            </>
          ))}
        </div>
      </div>
    );
  };

  // ── CLIENTES ──
  const Clientes = () => {
    const lista = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    const hoy = todayStr();
    return (
      <div style={s.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Clientes</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...s.input, width: 200 }} placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <button style={s.btn(true)} onClick={() => openModal("cliente", { tipo: "ocasional" })}>+ Agregar</button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={s.th}>Nombre</th><th style={s.th}>Teléfono</th><th style={s.th}>Tipo</th><th style={s.th}>Mensualidad</th><th style={s.th}>Reservas</th><th style={s.th}></th></tr></thead>
          <tbody>
            {lista.map(c => {
              const mens = mensualidades.filter(m => m.cliente_id === c.id).sort((a, b) => b.fecha_vencimiento?.localeCompare(a.fecha_vencimiento));
              const ultima = mens[0];
              const vencida = ultima && ultima.fecha_vencimiento < hoy;
              const resCount = reservas.filter(r => r.cliente_id === c.id).length;
              return <tr key={c.id} style={{ cursor: "default" }}>
                <td style={s.td}><span style={{ fontWeight: 500 }}>{c.nombre}</span></td>
                <td style={s.td}>{c.telefono}</td>
                <td style={s.td}><Badge type={c.tipo === "mensualero" ? "info" : "gray"}>{c.tipo}</Badge></td>
                <td style={s.td}>{c.tipo === "mensualero" ? (ultima ? <Badge type={vencida ? "danger" : "ok"}>{vencida ? "Vencida" : `Hasta ${ultima.fecha_vencimiento?.slice(5)}`}</Badge> : <Badge type="warn">Sin mensualidad</Badge>) : "—"}</td>
                <td style={s.td}>{resCount}</td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...s.btn(false), padding: "4px 10px", fontSize: 12 }} onClick={() => openModal("reserva", { cliente_id: c.id, fecha: todayStr(), hora: config.hora_inicio, tipo_pago: "efectivo" })}>Reservar</button>
                    {c.tipo === "mensualero" && <button style={{ ...s.btn(false), padding: "4px 10px", fontSize: 12 }} onClick={() => openModal("mensualidad", { cliente_id: c.id, monto: config.tarifa_hora * 20, fecha_inicio: todayStr(), plan: "Mensual" })}>Mensualidad</button>}
                  </div>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ── MENSUALIDADES ──
  const Mensualidades = () => {
    const hoy = todayStr();
    const vencidas = mensualidades.filter(m => m.fecha_vencimiento < hoy);
    const vigentes = mensualidades.filter(m => m.fecha_vencimiento >= hoy);
    return (
      <div style={s.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Mensualidades</span>
          <button style={s.btn(true)} onClick={() => openModal("mensualidad", { fecha_inicio: todayStr(), plan: "Mensual" })}>+ Registrar cobro</button>
        </div>
        {vencidas.length > 0 && <div style={{ background: "#FAEEDA", color: "#854F0B", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
          {vencidas.length} mensualidad{vencidas.length > 1 ? "es" : ""} vencida{vencidas.length > 1 ? "s" : ""}
        </div>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={s.th}>Cliente</th><th style={s.th}>Plan</th><th style={s.th}>Monto</th><th style={s.th}>Vencimiento</th><th style={s.th}>Estado</th><th style={s.th}></th></tr></thead>
          <tbody>
            {[...vencidas, ...vigentes].map(m => {
              const c = clienteById(m.cliente_id);
              const vencida = m.fecha_vencimiento < hoy;
              return <tr key={m.id}>
                <td style={s.td}>{c?.nombre || "?"}</td>
                <td style={s.td}>{m.plan}</td>
                <td style={s.td}>{gs(m.monto)}</td>
                <td style={s.td}>{m.fecha_vencimiento}</td>
                <td style={s.td}><Badge type={vencida ? "danger" : "ok"}>{vencida ? "Vencida" : "Vigente"}</Badge></td>
                <td style={s.td}>
                  {vencida && <button style={{ ...s.btn(true), padding: "4px 10px", fontSize: 12 }}
                    onClick={() => openModal("mensualidad", { cliente_id: m.cliente_id, monto: m.monto, fecha_inicio: todayStr(), plan: m.plan })}>Renovar</button>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ── CAJA ──
  const Caja = () => {
    const hoy = todayStr();
    const mes = hoy.slice(0, 7);
    const ingHoy = caja.filter(m => m.fecha === hoy && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
    const ingMes = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
    const egrMes = caja.filter(m => m.fecha.startsWith(mes) && m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
    return (
      <div style={s.panel}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
          <div style={s.metric}><div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Ingresos hoy</div><div style={{ fontSize: 20, fontWeight: 500 }}>{gs(ingHoy)}</div></div>
          <div style={s.metric}><div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Ingresos del mes</div><div style={{ fontSize: 20, fontWeight: 500 }}>{gs(ingMes)}</div></div>
          <div style={s.metric}><div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Balance del mes</div><div style={{ fontSize: 20, fontWeight: 500, color: ingMes - egrMes >= 0 ? "#3B6D11" : "#A32D2D" }}>{gs(ingMes - egrMes)}</div></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Movimientos</span>
          <button style={s.btn(true)} onClick={() => openModal("movimiento", { tipo: "ingreso", fecha: todayStr() })}>+ Registrar</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={s.th}>Fecha</th><th style={s.th}>Descripción</th><th style={s.th}>Tipo</th><th style={{ ...s.th, textAlign: "right" }}>Monto</th></tr></thead>
          <tbody>
            {caja.map(m => <tr key={m.id}>
              <td style={s.td}>{m.fecha.slice(8)}/{m.fecha.slice(5, 7)}</td>
              <td style={s.td}>{m.descripcion}</td>
              <td style={s.td}><Badge type={m.tipo === "ingreso" ? "ok" : "danger"}>{m.tipo}</Badge></td>
              <td style={{ ...s.td, textAlign: "right", fontWeight: 500, color: m.tipo === "ingreso" ? "#3B6D11" : "#A32D2D" }}>{m.tipo === "egreso" ? "- " : ""}{gs(m.monto)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    );
  };

  // ── CONFIG ──
  const Config = () => (
    <div style={s.panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Configuración</span>
        <button style={s.btn(true)} onClick={() => openModal("config", { ...config })}>Editar</button>
      </div>
      <div style={{ ...s.card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          { label: "Nombre del club", value: config.nombre_club },
          { label: "Tarifa por hora", value: gs(config.tarifa_hora) },
          { label: "Hora de apertura", value: `${config.hora_inicio}:00` },
          { label: "Hora de cierre", value: `${config.hora_fin}:00` },
        ].map((r, i) => <div key={i}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{r.label}</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>{r.value}</div>
        </div>)}
      </div>
    </div>
  );

  const tabs = ["dashboard", "calendario", "clientes", "mensualidades", "caja", "config"];
  const tabLabels = { dashboard: "Dashboard", calendario: "Calendario", clientes: "Clientes", mensualidades: "Mensualidades", caja: "Caja", config: "Config" };

  const FG = ({ label, children }) => <div style={{ marginBottom: 12 }}><label style={s.label}>{label}</label>{children}</div>;
  const Inp = (props) => <input style={s.input} {...props} />;
  const Sel = ({ children, ...props }) => <select style={s.input} {...props}>{children}</select>;

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "0 4px" }}>
      <div style={s.nav}>
        {tabs.map(t => <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>{tabLabels[t]}</button>)}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === "dashboard" && <Dashboard />}
          {tab === "calendario" && <Calendario />}
          {tab === "clientes" && <Clientes />}
          {tab === "mensualidades" && <Mensualidades />}
          {tab === "caja" && <Caja />}
          {tab === "config" && <Config />}
        </>
      )}

      {/* MODAL RESERVA */}
      <Modal show={modal === "reserva"} onClose={closeModal} title="Nueva reserva">
        <FG label="Cliente">
          <Sel value={form.cliente_id || ""} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
            <option value="">Seleccioná un cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Sel>
        </FG>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FG label="Fecha"><Inp type="date" value={form.fecha || ""} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></FG>
          <FG label="Hora">
            <Sel value={form.hora ?? ""} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}>
              {horas.map(h => <option key={h} value={h}>{h}:00</option>)}
            </Sel>
          </FG>
        </div>
        <FG label="Tipo de pago">
          <Sel value={form.tipo_pago || "efectivo"} onChange={e => setForm(f => ({ ...f, tipo_pago: e.target.value }))}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="mensualidad">Mensualidad</option>
          </Sel>
        </FG>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button style={s.btn(false)} onClick={closeModal}>Cancelar</button>
          <button style={s.btn(true)} onClick={guardarReserva} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </Modal>

      {/* MODAL VER RESERVA */}
      <Modal show={modal === "verReserva"} onClose={closeModal} title="Detalle de reserva">
        {form.cliente && <>
          <div style={{ fontSize: 14, marginBottom: 8 }}><span style={{ color: "var(--color-text-secondary)" }}>Cliente:</span> {form.cliente.nombre}</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}><span style={{ color: "var(--color-text-secondary)" }}>Teléfono:</span> {form.cliente.telefono}</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}><span style={{ color: "var(--color-text-secondary)" }}>Fecha:</span> {form.fecha} · {form.hora}:00hs</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}><span style={{ color: "var(--color-text-secondary)" }}>Pago:</span> {form.tipo_pago}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...s.btn(false), flex: 1, background: "#EAF3DE", borderColor: "#3B6D11", color: "#3B6D11" }} onClick={() => whatsapp(form.cliente, form)}>WhatsApp</button>
            <button style={{ ...s.btn(false), flex: 1, background: "#FCEBEB", borderColor: "#A32D2D", color: "#A32D2D" }} onClick={() => { eliminarReserva(form.id); closeModal(); }}>Cancelar turno</button>
          </div>
        </>}
      </Modal>

      {/* MODAL CLIENTE */}
      <Modal show={modal === "cliente"} onClose={closeModal} title="Agregar cliente">
        <FG label="Nombre completo"><Inp type="text" value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></FG>
        <FG label="Teléfono"><Inp type="text" value={form.telefono || ""} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></FG>
        <FG label="Tipo">
          <Sel value={form.tipo || "ocasional"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            <option value="ocasional">Ocasional</option>
            <option value="mensualero">Mensualero</option>
          </Sel>
        </FG>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button style={s.btn(false)} onClick={closeModal}>Cancelar</button>
          <button style={s.btn(true)} onClick={guardarCliente} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </Modal>

      {/* MODAL MENSUALIDAD */}
      <Modal show={modal === "mensualidad"} onClose={closeModal} title="Registrar mensualidad">
        <FG label="Cliente">
          <Sel value={form.cliente_id || ""} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
            <option value="">Seleccioná un cliente</option>
            {clientes.filter(c => c.tipo === "mensualero").map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Sel>
        </FG>
        <FG label="Plan"><Inp type="text" value={form.plan || ""} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} placeholder="Ej: Mensual, 3x semana..." /></FG>
        <FG label="Monto (Gs)"><Inp type="number" value={form.monto || ""} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></FG>
        <FG label="Fecha de inicio"><Inp type="date" value={form.fecha_inicio || ""} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} /></FG>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>El vencimiento se calcula automáticamente a 30 días.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={s.btn(false)} onClick={closeModal}>Cancelar</button>
          <button style={s.btn(true)} onClick={guardarMensualidad} disabled={saving}>{saving ? "Guardando..." : "Registrar cobro"}</button>
        </div>
      </Modal>

      {/* MODAL MOVIMIENTO */}
      <Modal show={modal === "movimiento"} onClose={closeModal} title="Registrar movimiento">
        <FG label="Descripción"><Inp type="text" value={form.descripcion || ""} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></FG>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FG label="Monto (Gs)"><Inp type="number" value={form.monto || ""} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} /></FG>
          <FG label="Tipo">
            <Sel value={form.tipo || "ingreso"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </Sel>
          </FG>
        </div>
        <FG label="Fecha"><Inp type="date" value={form.fecha || ""} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} /></FG>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button style={s.btn(false)} onClick={closeModal}>Cancelar</button>
          <button style={s.btn(true)} onClick={guardarMovimiento} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </Modal>

      {/* MODAL CONFIG */}
      <Modal show={modal === "config"} onClose={closeModal} title="Configuración">
        <FG label="Nombre del club"><Inp type="text" value={form.nombre_club || ""} onChange={e => setForm(f => ({ ...f, nombre_club: e.target.value }))} /></FG>
        <FG label="Tarifa por hora (Gs)"><Inp type="number" value={form.tarifa_hora || ""} onChange={e => setForm(f => ({ ...f, tarifa_hora: e.target.value }))} /></FG>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FG label="Hora de apertura">
            <Sel value={form.hora_inicio ?? ""} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}:00</option>)}
            </Sel>
          </FG>
          <FG label="Hora de cierre">
            <Sel value={form.hora_fin ?? ""} onChange={e => setForm(f => ({ ...f, hora_fin: e.target.value }))}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}:00</option>)}
            </Sel>
          </FG>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button style={s.btn(false)} onClick={closeModal}>Cancelar</button>
          <button style={s.btn(true)} onClick={guardarConfig} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </Modal>
    </div>
  );
}