import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://wirsrkuxzltedqdkrdak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcnNya3V4emx0ZWRxZGtyZGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjEzMjMsImV4cCI6MjA5MjYzNzMyM30.BjxD2R5bgBUHyalpwFhRzsGEzOnCx4PH9Sb65d609VI";

const api = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...(opts.prefer ? { Prefer: opts.prefer } : {}), ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const db = {
  get: (t, p = "") => api(`${t}?${p}`),
  post: (t, b) => api(t, { method: "POST", body: JSON.stringify(b), prefer: "return=representation" }),
  patch: (t, id, b) => api(`${t}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(b), prefer: "return=representation" }),
  del: (t, id) => api(`${t}?id=eq.${id}`, { method: "DELETE" }),
};

const gs = (n) => "Gs " + Math.round(n || 0).toLocaleString("es-PY");
const today = () => new Date().toISOString().slice(0, 10);
const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmtD = (d) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");

// ── ESTILOS BASE ──
const C = {
  coral: "#D85A30", coralL: "#FAECE7", coralD: "#993C1D",
  ok: "#3B6D11", okL: "#EAF3DE",
  warn: "#854F0B", warnL: "#FAEEDA",
  danger: "#A32D2D", dangerL: "#FCEBEB",
  info: "#185FA5", infoL: "#E6F1FB",
};
const card = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 18px" };
const metric = { background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 16px" };
const btn = (primary, danger) => ({
  padding: "7px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 400,
  border: primary ? "none" : `0.5px solid ${danger ? C.danger : "var(--color-border-secondary)"}`,
  background: primary ? C.coral : danger ? C.dangerL : "var(--color-background-primary)",
  color: primary ? "#fff" : danger ? C.danger : "var(--color-text-primary)",
});
const inp = { padding: "8px 11px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 13, width: "100%", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)", outline: "none" };
const lbl = { fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 4, display: "block" };
const th = { textAlign: "left", padding: "9px 12px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" };
const td = { padding: "9px 12px", fontSize: 13, borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)" };

const Badge = ({ type, children }) => {
  const m = { ok:[C.okL,C.ok], warn:[C.warnL,C.warn], danger:[C.dangerL,C.danger], info:[C.infoL,C.info], gray:["var(--color-background-secondary)","var(--color-text-secondary)"] };
  const [bg, color] = m[type] || m.gray;
  return <span style={{ background: bg, color, fontSize: 11, padding: "2px 8px", borderRadius: 100, fontWeight: 500, display: "inline-block", whiteSpace: "nowrap" }}>{children}</span>;
};

// ── INPUT CONTROLADO SIN RE-RENDER (fix bug escritura) ──
const Field = ({ label, ...props }) => {
  const ref = useRef();
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.value = props.value ?? ""; }, [props.value]);
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={lbl}>{label}</label>}
      <input ref={ref} {...props} style={inp} defaultValue={props.value ?? ""} onChange={e => props.onChange && props.onChange(e)} />
    </div>
  );
};

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={lbl}>{label}</label>}
    <select {...props} style={inp}>{children}</select>
  </div>
);

// ── MODAL ──
const Modal = ({ show, onClose, title, width, children }) => {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ ...card, width: width || 380, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Row = ({ children, gap }) => <div style={{ display: "grid", gridTemplateColumns: `repeat(${children.length},1fr)`, gap: gap || 12, marginBottom: 0 }}>{children}</div>;
const Divider = () => <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "16px 0" }} />;
const Spin = () => <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-secondary)", fontSize: 13 }}>Cargando...</div>;

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState({ clientes: [], reservas: [], caja: [], mensualidades: [], config: { hora_inicio: 10, hora_fin: 24, tarifa_hora: 80000, nombre_club: "DEXON PADEL" } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [semOff, setSemOff] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busq, setBusq] = useState("");
  const [cierreHoy, setCierreHoy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl, re, ca, me, cf] = await Promise.all([
        db.get("clientes","order=nombre.asc"),
        db.get("reservas","order=fecha.asc,hora.asc"),
        db.get("caja","order=fecha.desc,id.desc"),
        db.get("mensualidades","order=fecha_vencimiento.asc"),
        db.get("configuracion","limit=1"),
      ]);
      setData({ clientes: cl||[], reservas: re||[], caja: ca||[], mensualidades: me||[], config: cf?.[0] || { hora_inicio:10, hora_fin:24, tarifa_hora:80000, nombre_club:"DEXON PADEL" } });
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const { clientes, reservas, caja, mensualidades, config } = data;
  const horas = Array.from({ length: config.hora_fin - config.hora_inicio }, (_, i) => config.hora_inicio + i);
  const cById = (id) => clientes.find(c => c.id === id);
  const openM = (name, f={}) => { setForm(f); setModal(name); };
  const closeM = () => { setModal(null); setForm({}); };
  const sf = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const getSemana = () => {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay()+6)%7) + semOff*7);
    return Array.from({length:7},(_,i) => { const d=new Date(lunes); d.setDate(lunes.getDate()+i); return d; });
  };

  // ACCIONES
  const guardarReserva = async () => {
    if (!form.cliente_id || !form.fecha || form.hora === undefined) return;
    if (reservas.find(r => r.fecha===form.fecha && r.hora===Number(form.hora))) { alert("Ese turno ya está ocupado."); return; }
    setSaving(true);
    try {
      const [res] = await db.post("reservas", { cliente_id: Number(form.cliente_id), fecha: form.fecha, hora: Number(form.hora), tipo_pago: form.tipo_pago||"efectivo" });
      if (form.tipo_pago !== "mensualidad") {
        const c = cById(Number(form.cliente_id));
        await db.post("caja", { descripcion: `Reserva - ${c?.nombre||""}`, tipo:"ingreso", monto: config.tarifa_hora, fecha: form.fecha, reserva_id: res.id });
      }
      await load(); closeM();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarCliente = async () => {
    if (!form.nombre?.trim()) return;
    setSaving(true);
    try {
      await db.post("clientes", { nombre: form.nombre.trim(), telefono: form.telefono||"", tipo: form.tipo||"ocasional" });
      await load(); closeM();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarMensualidad = async () => {
    if (!form.cliente_id || !form.monto || !form.fecha_inicio) return;
    setSaving(true);
    try {
      const ini = new Date(form.fecha_inicio);
      const venc = new Date(ini); venc.setMonth(venc.getMonth()+1);
      await db.post("mensualidades", { cliente_id: Number(form.cliente_id), plan: form.plan||"Mensual", monto: Number(form.monto), fecha_inicio: form.fecha_inicio, fecha_vencimiento: fmtD(venc), estado:"pagado" });
      await db.post("caja", { descripcion: `Mensualidad - ${cById(Number(form.cliente_id))?.nombre||""}`, tipo:"ingreso", monto: Number(form.monto), fecha: form.fecha_inicio });
      await load(); closeM();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarMovimiento = async () => {
    if (!form.descripcion || !form.monto) return;
    setSaving(true);
    try {
      await db.post("caja", { descripcion: form.descripcion, tipo: form.tipo||"ingreso", monto: Number(form.monto), fecha: form.fecha||today() });
      await load(); closeM();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarConfig = async () => {
    setSaving(true);
    try {
      await db.patch("configuracion", config.id, { hora_inicio: Number(form.hora_inicio), hora_fin: Number(form.hora_fin), tarifa_hora: Number(form.tarifa_hora), nombre_club: form.nombre_club });
      await load(); closeM();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const eliminarReserva = async (id) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm("¿Eliminar esta reserva?")) return;
    await db.del("reservas", id); await load();
  };

  const whatsapp = (c, r) => {
    const msg = encodeURIComponent(`Hola ${c.nombre}, tu turno en ${config.nombre_club} está confirmado para el ${r.fecha} a las ${r.hora}:00hs. ¡Te esperamos!`);
    const tel = (c.telefono||"").replace(/\D/g,"");
    window.open(`https://wa.me/595${tel.startsWith("0")?tel.slice(1):tel}?text=${msg}`,"_blank");
  };

  const hacerCierre = () => {
    const hoy = today();
    const ingH = caja.filter(m=>m.fecha===hoy&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrH = caja.filter(m=>m.fecha===hoy&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    const resH = reservas.filter(r=>r.fecha===hoy);
    const movH = caja.filter(m=>m.fecha===hoy);
    setCierreHoy({ ingH, egrH, balance: ingH-egrH, resH, movH });
    openM("cierre");
  };

  // ── TABS ──
  const TABS = [
    { id:"dashboard", label:"Dashboard" },
    { id:"calendario", label:"Calendario" },
    { id:"clientes", label:"Clientes" },
    { id:"mensualidades", label:"Mensualidades" },
    { id:"caja", label:"Caja" },
    { id:"stats", label:"Estadísticas" },
    { id:"config", label:"Config" },
  ];

  // ── DASHBOARD ──
  const Dashboard = () => {
    const hoy = today();
    const mes = hoy.slice(0,7);
    const resHoy = reservas.filter(r=>r.fecha===hoy);
    const ingHoy = caja.filter(m=>m.fecha===hoy&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingMes = caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrMes = caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    const deudores = mensualidades.filter(m=>m.fecha_vencimiento<hoy);
    const proximas = reservas.filter(r=>r.fecha>=hoy).slice(0,6);
    const ocup = Math.round(resHoy.length/horas.length*100);

    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:500 }}>{config.nombre_club}</div>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)" }}>{new Date().toLocaleDateString("es-PY",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <button style={btn(false)} onClick={hacerCierre}>Cierre del día</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
          {[
            { label:"Ingresos hoy", value: gs(ingHoy) },
            { label:"Ingresos del mes", value: gs(ingMes) },
            { label:"Balance del mes", value: gs(ingMes-egrMes), color: ingMes-egrMes>=0?C.ok:C.danger },
            { label:"Ocupación hoy", value: `${ocup}%`, sub:`${resHoy.length}/${horas.length} turnos` },
          ].map((m,i)=>(
            <div key={i} style={metric}>
              <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>{m.label}</div>
              <div style={{ fontSize:20, fontWeight:500, color: m.color||"var(--color-text-primary)" }}>{m.value}</div>
              {m.sub && <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 }}>{m.sub}</div>}
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div style={card}>
            <div style={{ fontWeight:500, marginBottom:12, fontSize:14 }}>Próximas reservas</div>
            {proximas.length===0 ? <p style={{ fontSize:13, color:"var(--color-text-secondary)" }}>Sin reservas próximas</p> :
              proximas.map(r=>{
                const c=cById(r.cliente_id);
                return <div key={r.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", fontSize:13 }}>
                  <span>{c?.nombre||"?"}</span>
                  <span style={{ color:"var(--color-text-secondary)" }}>{r.fecha.slice(5)} · {r.hora}:00</span>
                </div>;
              })}
          </div>
          <div style={card}>
            <div style={{ fontWeight:500, marginBottom:12, fontSize:14 }}>Mensualidades vencidas</div>
            {deudores.length===0 ? <div style={{ fontSize:13, color:C.ok }}>✓ Todo al día</div> :
              deudores.slice(0,5).map(m=>{
                const c=cById(m.cliente_id);
                return <div key={m.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", fontSize:13 }}>
                  <span>{c?.nombre||"?"}</span>
                  <Badge type="danger">Venc. {m.fecha_vencimiento?.slice(5)}</Badge>
                </div>;
              })}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight:500, marginBottom:14, fontSize:14 }}>Movimientos recientes</div>
          {caja.slice(0,5).map(m=>(
            <div key={m.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", fontSize:13 }}>
              <div>
                <span>{m.descripcion}</span>
                <span style={{ marginLeft:8, color:"var(--color-text-tertiary)", fontSize:11 }}>{m.fecha.slice(8)}/{m.fecha.slice(5,7)}</span>
              </div>
              <span style={{ fontWeight:500, color: m.tipo==="ingreso"?C.ok:C.danger }}>{m.tipo==="egreso"?"- ":""}{gs(m.monto)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── CALENDARIO ──
  const Calendario = () => {
    const dias = getSemana();
    const hoy = today();
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:500 }}>
            {dias[0].getDate()} {MESES[dias[0].getMonth()]} — {dias[6].getDate()} {MESES[dias[6].getMonth()]}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={btn(false)} onClick={()=>setSemOff(o=>o-1)}>← Ant.</button>
            <button style={btn(false)} onClick={()=>setSemOff(0)}>Hoy</button>
            <button style={btn(false)} onClick={()=>setSemOff(o=>o+1)}>Sig. →</button>
            <button style={btn(true)} onClick={()=>openM("reserva",{fecha:hoy,hora:config.hora_inicio,tipo_pago:"efectivo"})}>+ Reserva</button>
          </div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:`52px repeat(7,1fr)`, gap:1, background:"var(--color-border-tertiary)", borderRadius:8, overflow:"hidden", fontSize:12, minWidth:600 }}>
            <div style={{ background:"var(--color-background-secondary)", padding:"8px 4px" }}/>
            {dias.map((d,i)=>{
              const isH = fmtD(d)===hoy;
              const resD = reservas.filter(r=>r.fecha===fmtD(d)).length;
              return <div key={i} style={{ background: isH?"#FAECE7":"var(--color-background-secondary)", padding:"8px 4px", textAlign:"center" }}>
                <div style={{ fontWeight:500, color: isH?C.coral:"var(--color-text-secondary)", fontSize:11 }}>{DIAS[d.getDay()]}</div>
                <div style={{ fontSize:15, fontWeight:500, color: isH?C.coral:"var(--color-text-primary)" }}>{d.getDate()}</div>
                {resD>0 && <div style={{ fontSize:10, color:C.coral }}>{resD} turno{resD>1?"s":""}</div>}
              </div>;
            })}
            {horas.map(h=>(
              <>
                <div key={`t${h}`} style={{ background:"var(--color-background-secondary)", padding:"0 8px", display:"flex", alignItems:"center", justifyContent:"flex-end", fontSize:11, color:"var(--color-text-tertiary)", minHeight:38 }}>{h}:00</div>
                {dias.map((d,di)=>{
                  const fs=fmtD(d);
                  const res=reservas.find(r=>r.fecha===fs&&r.hora===h);
                  const c=res?cById(res.cliente_id):null;
                  return <div key={`${h}-${di}`}
                    onClick={()=>res?openM("verRes",{...res,cliente:c}):openM("reserva",{fecha:fs,hora:h,tipo_pago:"efectivo"})}
                    style={{ background: res?"#FAECE7":"var(--color-background-primary)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", minHeight:38, transition:"background .1s" }}>
                    {res && <span style={{ fontSize:11, color:C.coralD, fontWeight:500, background:"#F5C4B3", borderRadius:4, padding:"2px 6px", maxWidth:"90%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {c?.nombre?.split(" ")[0]||"?"}
                    </span>}
                  </div>;
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── CLIENTES ──
  const Clientes = () => {
    const hoy = today();
    const lista = clientes.filter(c=>c.nombre.toLowerCase().includes(busq.toLowerCase()));
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontSize:15, fontWeight:500 }}>Clientes ({clientes.length})</span>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...inp, width:200 }} placeholder="Buscar..." defaultValue={busq} onChange={e=>setBusq(e.target.value)} />
            <button style={btn(true)} onClick={()=>openM("cliente",{tipo:"ocasional"})}>+ Agregar</button>
          </div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              <th style={th}>Nombre</th><th style={th}>Teléfono</th><th style={th}>Tipo</th>
              <th style={th}>Mensualidad</th><th style={th}>Reservas</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {lista.map(c=>{
                const mens = mensualidades.filter(m=>m.cliente_id===c.id).sort((a,b)=>b.fecha_vencimiento?.localeCompare(a.fecha_vencimiento));
                const ult = mens[0];
                const vencida = ult&&ult.fecha_vencimiento<hoy;
                const resC = reservas.filter(r=>r.cliente_id===c.id).length;
                return <tr key={c.id}>
                  <td style={td}><span style={{ fontWeight:500 }}>{c.nombre}</span></td>
                  <td style={td}><span style={{ color:"var(--color-text-secondary)" }}>{c.telefono||"—"}</span></td>
                  <td style={td}><Badge type={c.tipo==="mensualero"?"info":"gray"}>{c.tipo}</Badge></td>
                  <td style={td}>
                    {c.tipo==="mensualero"
                      ? ult ? <Badge type={vencida?"danger":"ok"}>{vencida?`Vencida ${ult.fecha_vencimiento?.slice(5)}`:`Hasta ${ult.fecha_vencimiento?.slice(5)}`}</Badge>
                             : <Badge type="warn">Sin mensualidad</Badge>
                      : "—"}
                  </td>
                  <td style={td}>{resC}</td>
                  <td style={td}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button style={{ ...btn(false), padding:"4px 10px", fontSize:12 }} onClick={()=>openM("reserva",{cliente_id:c.id,fecha:hoy,hora:config.hora_inicio,tipo_pago:"efectivo"})}>Reservar</button>
                      {c.tipo==="mensualero" && <button style={{ ...btn(false), padding:"4px 10px", fontSize:12 }} onClick={()=>openM("mensualidad",{cliente_id:c.id,monto:"",fecha_inicio:hoy,plan:"Mensual"})}>Mensualidad</button>}
                    </div>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── MENSUALIDADES ──
  const Mensualidades = () => {
    const hoy = today();
    const venc = mensualidades.filter(m=>m.fecha_vencimiento<hoy);
    const vig = mensualidades.filter(m=>m.fecha_vencimiento>=hoy);
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontSize:15, fontWeight:500 }}>Mensualidades</span>
          <button style={btn(true)} onClick={()=>openM("mensualidad",{fecha_inicio:hoy,plan:"Mensual"})}>+ Registrar cobro</button>
        </div>
        {venc.length>0 && <div style={{ background:C.warnL, color:C.warn, borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:14 }}>
          {venc.length} mensualidad{venc.length>1?"es":""} vencida{venc.length>1?"s":""}
        </div>}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr><th style={th}>Cliente</th><th style={th}>Plan</th><th style={th}>Monto</th><th style={th}>Inicio</th><th style={th}>Vencimiento</th><th style={th}>Estado</th><th style={th}></th></tr></thead>
            <tbody>
              {[...venc,...vig].map(m=>{
                const c=cById(m.cliente_id);
                const v=m.fecha_vencimiento<hoy;
                return <tr key={m.id}>
                  <td style={td}>{c?.nombre||"?"}</td>
                  <td style={td}>{m.plan}</td>
                  <td style={td}>{gs(m.monto)}</td>
                  <td style={td}>{m.fecha_inicio}</td>
                  <td style={td}>{m.fecha_vencimiento}</td>
                  <td style={td}><Badge type={v?"danger":"ok"}>{v?"Vencida":"Vigente"}</Badge></td>
                  <td style={td}>
                    {v && <button style={{ ...btn(true), padding:"4px 10px", fontSize:12 }}
                      onClick={()=>openM("mensualidad",{cliente_id:m.cliente_id,monto:m.monto,fecha_inicio:hoy,plan:m.plan})}>Renovar</button>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── CAJA ──
  const Caja = () => {
    const hoy = today();
    const mes = hoy.slice(0,7);
    const ingH = caja.filter(m=>m.fecha===hoy&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingM = caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrM = caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          <div style={metric}><div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>Ingresos hoy</div><div style={{ fontSize:20, fontWeight:500 }}>{gs(ingH)}</div></div>
          <div style={metric}><div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>Ingresos del mes</div><div style={{ fontSize:20, fontWeight:500 }}>{gs(ingM)}</div></div>
          <div style={metric}><div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>Balance del mes</div><div style={{ fontSize:20, fontWeight:500, color:ingM-egrM>=0?C.ok:C.danger }}>{gs(ingM-egrM)}</div></div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontSize:15, fontWeight:500 }}>Movimientos</span>
          <div style={{ display:"flex", gap:8 }}>
            <button style={btn(false)} onClick={hacerCierre}>Cierre del día</button>
            <button style={btn(true)} onClick={()=>openM("movimiento",{tipo:"ingreso",fecha:hoy})}>+ Registrar</button>
          </div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr><th style={th}>Fecha</th><th style={th}>Descripción</th><th style={th}>Tipo</th><th style={{ ...th, textAlign:"right" }}>Monto</th></tr></thead>
            <tbody>
              {caja.map(m=><tr key={m.id}>
                <td style={td}>{m.fecha.slice(8)}/{m.fecha.slice(5,7)}</td>
                <td style={td}>{m.descripcion}</td>
                <td style={td}><Badge type={m.tipo==="ingreso"?"ok":"danger"}>{m.tipo}</Badge></td>
                <td style={{ ...td, textAlign:"right", fontWeight:500, color:m.tipo==="ingreso"?C.ok:C.danger }}>{m.tipo==="egreso"?"- ":""}{gs(m.monto)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── ESTADÍSTICAS ──
  const Stats = () => {
    const hoy = today();
    const mes = hoy.slice(0,7);
    const ultimos7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-6+i); return fmtD(d); });
    const porDia = ultimos7.map(f=>({ fecha:f, ing: caja.filter(m=>m.fecha===f&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0) }));
    const maxIng = Math.max(...porDia.map(d=>d.ing),1);
    const horasPico = horas.map(h=>({ hora:h, count: reservas.filter(r=>r.hora===h).length })).sort((a,b)=>b.count-a.count).slice(0,5);
    const topClientes = clientes.map(c=>({ ...c, total: reservas.filter(r=>r.cliente_id===c.id).length })).sort((a,b)=>b.total-a.total).slice(0,5);
    const ingMes = caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const diasMes = new Date().getDate();
    const proyeccion = Math.round(ingMes/diasMes*30);

    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <div style={metric}><div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>Ingresos del mes</div><div style={{ fontSize:20, fontWeight:500 }}>{gs(ingMes)}</div></div>
          <div style={metric}><div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>Proyección mensual</div><div style={{ fontSize:20, fontWeight:500, color:C.info }}>{gs(proyeccion)}</div></div>
        </div>

        <div style={{ ...card, marginBottom:12 }}>
          <div style={{ fontWeight:500, marginBottom:14, fontSize:14 }}>Ingresos últimos 7 días</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
            {porDia.map((d,i)=>(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:10, color:"var(--color-text-secondary)" }}>{d.ing>0?gs(d.ing):""}</div>
                <div style={{ width:"100%", background: d.ing>0?C.coral:"var(--color-background-secondary)", borderRadius:"4px 4px 0 0", height: Math.max(d.ing/maxIng*90,4), transition:"height .3s" }}/>
                <div style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{d.fecha.slice(8)}/{d.fecha.slice(5,7)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={card}>
            <div style={{ fontWeight:500, marginBottom:12, fontSize:14 }}>Horarios pico</div>
            {horasPico.map((h,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", fontSize:13 }}>
                <span>{h.hora}:00 hs</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:60, height:6, background:"var(--color-background-secondary)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${h.count/Math.max(horasPico[0]?.count,1)*100}%`, height:"100%", background:C.coral, borderRadius:3 }}/>
                  </div>
                  <span style={{ color:"var(--color-text-secondary)", fontSize:12 }}>{h.count}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{ fontWeight:500, marginBottom:12, fontSize:14 }}>Top clientes</div>
            {topClientes.map((c,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", fontSize:13 }}>
                <span>{c.nombre}</span>
                <Badge type="info">{c.total} reservas</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── CONFIG ──
  const Config = () => (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:15, fontWeight:500 }}>Configuración</span>
        <button style={btn(true)} onClick={()=>openM("config",{...config})}>Editar</button>
      </div>
      <div style={{ ...card, display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {[
          { label:"Nombre del club", value:config.nombre_club },
          { label:"Tarifa por hora", value:gs(config.tarifa_hora) },
          { label:"Hora de apertura", value:`${config.hora_inicio}:00` },
          { label:"Hora de cierre", value:`${config.hora_fin}:00` },
          { label:"Turnos disponibles por día", value: config.hora_fin-config.hora_inicio },
          { label:"Ingreso máximo diario", value: gs((config.hora_fin-config.hora_inicio)*config.tarifa_hora) },
        ].map((r,i)=>(
          <div key={i}>
            <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:4 }}>{r.label}</div>
            <div style={{ fontSize:15, fontWeight:500 }}>{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"var(--font-sans)", padding:"0 2px", maxWidth:900, margin:"0 auto" }}>
      <div style={{ display:"flex", gap:2, borderBottom:"0.5px solid var(--color-border-tertiary)", marginBottom:0, overflowX:"auto" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"9px 14px", fontSize:13, border:"none", background:"none", cursor:"pointer", whiteSpace:"nowrap",
            color: tab===t.id?"var(--color-text-primary)":"var(--color-text-secondary)",
            borderBottom: tab===t.id?`2px solid ${C.coral}`:"2px solid transparent",
            fontWeight: tab===t.id?500:400,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"16px 0" }}>
        {loading ? <Spin/> : (
          <>
            {tab==="dashboard" && <Dashboard/>}
            {tab==="calendario" && <Calendario/>}
            {tab==="clientes" && <Clientes/>}
            {tab==="mensualidades" && <Mensualidades/>}
            {tab==="caja" && <Caja/>}
            {tab==="stats" && <Stats/>}
            {tab==="config" && <Config/>}
          </>
        )}
      </div>

      {/* MODALES */}
      <Modal show={modal==="reserva"} onClose={closeM} title="Nueva reserva">
        <Select label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}>
          <option value="">Seleccioná un cliente</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
        <Row><Field label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/><div style={{marginBottom:12}}><label style={lbl}>Hora</label><select style={inp} value={form.hora??""} onChange={sf("hora")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></div></Row>
        <Select label="Tipo de pago" value={form.tipo_pago||"efectivo"} onChange={sf("tipo_pago")}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="mensualidad">Mensualidad (no genera cobro)</option>
        </Select>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <button style={btn(false)} onClick={closeM}>Cancelar</button>
          <button style={btn(true)} onClick={guardarReserva} disabled={saving}>{saving?"Guardando...":"Guardar reserva"}</button>
        </div>
      </Modal>

      <Modal show={modal==="verRes"} onClose={closeM} title="Detalle de reserva">
        {form.cliente && <>
          <div style={{ fontSize:18, fontWeight:500, marginBottom:12 }}>{form.cliente.nombre}</div>
          <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:6 }}>{form.fecha} · {form.hora}:00 hs</div>
          <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:16 }}>Pago: {form.tipo_pago}</div>
          <Divider/>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ ...btn(false), flex:1, background:C.okL, borderColor:C.ok, color:C.ok }} onClick={()=>whatsapp(form.cliente,form)}>WhatsApp</button>
            <button style={{ ...btn(false), flex:1 }} onClick={()=>{eliminarReserva(form.id);closeM();}}>Cancelar turno</button>
          </div>
        </>}
      </Modal>

      <Modal show={modal==="cliente"} onClose={closeM} title="Agregar cliente">
        <Field label="Nombre completo" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
        <Field label="Teléfono" type="text" value={form.telefono||""} onChange={sf("telefono")}/>
        <Select label="Tipo" value={form.tipo||"ocasional"} onChange={sf("tipo")}>
          <option value="ocasional">Ocasional</option>
          <option value="mensualero">Mensualero</option>
        </Select>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <button style={btn(false)} onClick={closeM}>Cancelar</button>
          <button style={btn(true)} onClick={guardarCliente} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
        </div>
      </Modal>

      <Modal show={modal==="mensualidad"} onClose={closeM} title="Registrar mensualidad">
        <Select label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}>
          <option value="">Seleccioná un cliente</option>
          {clientes.filter(c=>c.tipo==="mensualero").map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
        <Field label="Plan (ej: Mensual, 3x semana)" type="text" value={form.plan||""} onChange={sf("plan")}/>
        <Field label="Monto (Gs)" type="number" value={form.monto||""} onChange={sf("monto")}/>
        <Field label="Fecha de inicio" type="date" value={form.fecha_inicio||""} onChange={sf("fecha_inicio")}/>
        <div style={{ fontSize:12, color:"var(--color-text-secondary)", marginBottom:12 }}>El vencimiento se calcula a 30 días automáticamente.</div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button style={btn(false)} onClick={closeM}>Cancelar</button>
          <button style={btn(true)} onClick={guardarMensualidad} disabled={saving}>{saving?"Guardando...":"Registrar cobro"}</button>
        </div>
      </Modal>

      <Modal show={modal==="movimiento"} onClose={closeM} title="Registrar movimiento">
        <Field label="Descripción" type="text" value={form.descripcion||""} onChange={sf("descripcion")} autoFocus/>
        <Row>
          <Field label="Monto (Gs)" type="number" value={form.monto||""} onChange={sf("monto")}/>
          <Select label="Tipo" value={form.tipo||"ingreso"} onChange={sf("tipo")}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>
        </Row>
        <Field label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <button style={btn(false)} onClick={closeM}>Cancelar</button>
          <button style={btn(true)} onClick={guardarMovimiento} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
        </div>
      </Modal>

      <Modal show={modal==="config"} onClose={closeM} title="Configuración">
        <Field label="Nombre del club" type="text" value={form.nombre_club||""} onChange={sf("nombre_club")}/>
        <Field label="Tarifa por hora (Gs)" type="number" value={form.tarifa_hora||""} onChange={sf("tarifa_hora")}/>
        <Row>
          <div style={{marginBottom:12}}><label style={lbl}>Hora apertura</label><select style={inp} value={form.hora_inicio??""} onChange={sf("hora_inicio")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></div>
          <div style={{marginBottom:12}}><label style={lbl}>Hora cierre</label><select style={inp} value={form.hora_fin??""} onChange={sf("hora_fin")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></div>
        </Row>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
          <button style={btn(false)} onClick={closeM}>Cancelar</button>
          <button style={btn(true)} onClick={guardarConfig} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
        </div>
      </Modal>

      <Modal show={modal==="cierre"} onClose={closeM} title="Cierre del día" width={420}>
        {cierreHoy && <>
          <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:16 }}>Resumen de {today()}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            <div style={metric}><div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>Ingresos</div><div style={{ fontSize:18, fontWeight:500, color:C.ok }}>{gs(cierreHoy.ingH)}</div></div>
            <div style={metric}><div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>Egresos</div><div style={{ fontSize:18, fontWeight:500, color:C.danger }}>{gs(cierreHoy.egrH)}</div></div>
            <div style={metric}><div style={{ fontSize:11, color:"var(--color-text-secondary)" }}>Balance</div><div style={{ fontSize:18, fontWeight:500, color:cierreHoy.balance>=0?C.ok:C.danger }}>{gs(cierreHoy.balance)}</div></div>
          </div>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>Turnos del día ({cierreHoy.resH.length})</div>
          {cierreHoy.resH.length===0 ? <p style={{ fontSize:13, color:"var(--color-text-secondary)", marginBottom:12 }}>Sin turnos hoy</p> :
            cierreHoy.resH.map(r=>{
              const c=cById(r.cliente_id);
              return <div key={r.id} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                <span>{c?.nombre||"?"}</span><span style={{ color:"var(--color-text-secondary)" }}>{r.hora}:00 · {r.tipo_pago}</span>
              </div>;
            })}
          <Divider/>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <button style={btn(true)} onClick={closeM}>Cerrar</button>
          </div>
        </>}
      </Modal>
    </div>
  );
}