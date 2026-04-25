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
const DIAS_FULL = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const fmtD = (d) => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");

const CORAL = "#D85A30";
const theme = {
  btn: (v="default") => {
    const s = { padding:"8px 16px", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"var(--font-sans)", fontWeight:400, border:"none", transition:"opacity .15s" };
    if (v==="primary") return { ...s, background:CORAL, color:"#fff" };
    if (v==="ghost") return { ...s, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", border:"0.5px solid var(--color-border-tertiary)" };
    if (v==="danger") return { ...s, background:"#FCEBEB", color:"#A32D2D", border:"0.5px solid #F09595" };
    if (v==="success") return { ...s, background:"#EAF3DE", color:"#3B6D11", border:"0.5px solid #97C459" };
    return { ...s, background:"var(--color-background-primary)", color:"var(--color-text-primary)", border:"0.5px solid var(--color-border-secondary)" };
  },
  inp: { padding:"8px 12px", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, fontSize:13, width:"100%", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" },
  card: { background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"16px 18px" },
  metric: { background:"var(--color-background-secondary)", borderRadius:10, padding:"14px 16px" },
  label: { fontSize:12, color:"var(--color-text-secondary)", fontWeight:500, marginBottom:5, display:"block" },
  th: { textAlign:"left", padding:"10px 14px", fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", borderBottom:"0.5px solid var(--color-border-tertiary)", whiteSpace:"nowrap", background:"var(--color-background-secondary)" },
  td: { padding:"10px 14px", fontSize:13, borderBottom:"0.5px solid var(--color-border-tertiary)", color:"var(--color-text-primary)", verticalAlign:"middle" },
};

const Badge = ({ type, children }) => {
  const m = { ok:["#EAF3DE","#3B6D11"], warn:["#FAEEDA","#854F0B"], danger:["#FCEBEB","#A32D2D"], info:["#E6F1FB","#185FA5"], coral:["#FAECE7","#993C1D"], purple:["#EEEDFE","#3C3489"], gray:["var(--color-background-secondary)","var(--color-text-secondary)"] };
  const [bg,color] = m[type]||m.gray;
  return <span style={{ background:bg, color, fontSize:11, padding:"3px 9px", borderRadius:100, fontWeight:500, display:"inline-block", whiteSpace:"nowrap" }}>{children}</span>;
};

// Input sin re-render bug
const Field = ({ label, ...props }) => {
  const ref = useRef();
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.value = props.value ?? ""; }, [props.value]);
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={theme.label}>{label}</label>}
      <input ref={ref} {...props} style={theme.inp} defaultValue={props.value ?? ""} onChange={props.onChange} />
    </div>
  );
};

const Sel = ({ label, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={theme.label}>{label}</label>}
    <select {...props} style={theme.inp}>{children}</select>
  </div>
);

const Row2 = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>{children}</div>;

// Drawer lateral en vez de modal oscuro
const Drawer = ({ show, onClose, title, children, width=380 }) => {
  if (!show) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", justifyContent:"flex-end" }}>
      <div style={{ flex:1, cursor:"pointer" }} onClick={onClose}/>
      <div style={{ width, background:"var(--color-background-primary)", borderLeft:"0.5px solid var(--color-border-tertiary)", height:"100%", overflowY:"auto", display:"flex", flexDirection:"column", boxShadow:"-8px 0 32px rgba(0,0,0,0.08)" }}>
        <div style={{ padding:"20px 20px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", paddingBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <span style={{ fontSize:16, fontWeight:500 }}>{title}</span>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", fontSize:22, color:"var(--color-text-secondary)", lineHeight:1, padding:4 }}>×</button>
        </div>
        <div style={{ padding:20, flex:1, overflowY:"auto" }}>{children}</div>
      </div>
    </div>
  );
};

// Modal pequeño para confirmaciones
const Dialog = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", inset:0 }} onClick={onClose}/>
      <div style={{ position:"relative", background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:14, padding:"24px 24px 20px", width:340, boxShadow:"0 8px 40px rgba(0,0,0,0.12)" }}>
        <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
};

const Divider = () => <div style={{ height:"0.5px", background:"var(--color-border-tertiary)", margin:"16px 0" }}/>;
const Spin = () => <div style={{ textAlign:"center", padding:80, color:"var(--color-text-secondary)", fontSize:13 }}>Cargando...</div>;
const Empty = ({text}) => <div style={{ textAlign:"center", padding:"32px 0", color:"var(--color-text-tertiary)", fontSize:13 }}>{text}</div>;

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [clientes, setClientes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [caja, setCaja] = useState([]);
  const [mensualidades, setMensualidades] = useState([]);
  const [stock, setStock] = useState([]);
  const [config, setConfig] = useState({ hora_inicio:10, hora_fin:24, tarifa_hora:80000, nombre_club:"DEXON PADEL" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [semOff, setSemOff] = useState(0);
  const [drawer, setDrawer] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [busq, setBusq] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cl,re,ca,me,cf] = await Promise.all([
        db.get("clientes","order=nombre.asc"),
        db.get("reservas","order=fecha.asc,hora.asc"),
        db.get("caja","order=fecha.desc,id.desc"),
        db.get("mensualidades","order=fecha_vencimiento.asc"),
        db.get("configuracion","limit=1"),
      ]);
      // stock — puede que no exista la tabla aún
      let st = [];
      try { st = await db.get("stock","order=nombre.asc") || []; } catch(e) {}
      setClientes(cl||[]); setReservas(re||[]); setCaja(ca||[]); setMensualidades(me||[]); setStock(st);
      if (cf?.[0]) setConfig(cf[0]);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const horas = Array.from({length: config.hora_fin - config.hora_inicio}, (_,i) => config.hora_inicio+i);
  const cById = (id) => clientes.find(c=>c.id===id);
  const sf = (k) => (e) => setForm(f=>({...f,[k]:e.target.value}));
  const openD = (name, f={}) => { setForm(f); setDrawer(name); };
  const closeD = () => { setDrawer(null); setForm({}); };

  const getSemana = () => {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate()-((hoy.getDay()+6)%7)+semOff*7);
    return Array.from({length:7},(_,i)=>{ const d=new Date(lunes); d.setDate(lunes.getDate()+i); return d; });
  };

  // ── ACCIONES ──
  const guardarReserva = async () => {
    if (!form.cliente_id||!form.fecha||form.hora===undefined) return;
    if (reservas.find(r=>r.fecha===form.fecha&&r.hora===Number(form.hora))) { alert("Turno ocupado."); return; }
    setSaving(true);
    try {
      const [res] = await db.post("reservas",{cliente_id:Number(form.cliente_id),fecha:form.fecha,hora:Number(form.hora),tipo_pago:form.tipo_pago||"efectivo"});
      if (form.tipo_pago!=="mensualidad") {
        const c=cById(Number(form.cliente_id));
        await db.post("caja",{descripcion:`Reserva - ${c?.nombre||""}`,tipo:"ingreso",monto:config.tarifa_hora,fecha:form.fecha,reserva_id:res.id});
      }
      await load(); closeD();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarCliente = async () => {
    if (!form.nombre?.trim()) return;
    setSaving(true);
    try {
      await db.post("clientes",{nombre:form.nombre.trim(),telefono:form.telefono||"",tipo:form.tipo||"ocasional",nivel:form.nivel||"intermedio",notas:form.notas||""});
      await load(); closeD();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarMensualidad = async () => {
    if (!form.cliente_id||!form.monto||!form.fecha_inicio) return;
    setSaving(true);
    try {
      const ini=new Date(form.fecha_inicio);
      const venc=new Date(ini); venc.setMonth(venc.getMonth()+1);
      // turno fijo — crear reservas para las próximas 4 semanas
      const turnosDias = form.turno_dias ? form.turno_dias.split(",").map(Number) : [];
      const turnoHora = form.turno_hora ? Number(form.turno_hora) : null;
      if (turnosDias.length>0 && turnoHora!==null) {
        const curr = new Date(ini);
        for (let i=0;i<28;i++) {
          if (turnosDias.includes(curr.getDay())) {
            const fstr = fmtD(curr);
            if (!reservas.find(r=>r.fecha===fstr&&r.hora===turnoHora)) {
              await db.post("reservas",{cliente_id:Number(form.cliente_id),fecha:fstr,hora:turnoHora,tipo_pago:"mensualidad"});
            }
          }
          curr.setDate(curr.getDate()+1);
        }
      }
      await db.post("mensualidades",{cliente_id:Number(form.cliente_id),plan:form.plan||"Mensual",monto:Number(form.monto),fecha_inicio:form.fecha_inicio,fecha_vencimiento:fmtD(venc),estado:"pagado",turno_dias:form.turno_dias||"",turno_hora:turnoHora});
      await db.post("caja",{descripcion:`Mensualidad - ${cById(Number(form.cliente_id))?.nombre||""}`,tipo:"ingreso",monto:Number(form.monto),fecha:form.fecha_inicio});
      await load(); closeD();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarMovimiento = async () => {
    if (!form.descripcion||!form.monto) return;
    setSaving(true);
    try {
      await db.post("caja",{descripcion:form.descripcion,tipo:form.tipo||"ingreso",monto:Number(form.monto),fecha:form.fecha||today()});
      await load(); closeD();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarConfig = async () => {
    setSaving(true);
    try {
      await db.patch("configuracion",config.id,{hora_inicio:Number(form.hora_inicio),hora_fin:Number(form.hora_fin),tarifa_hora:Number(form.tarifa_hora),nombre_club:form.nombre_club});
      await load(); closeD();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const guardarStock = async () => {
    if (!form.nombre?.trim()||!form.cantidad) return;
    setSaving(true);
    try {
      if (form.id) {
        await db.patch("stock",form.id,{nombre:form.nombre,categoria:form.categoria||"general",cantidad:Number(form.cantidad),minimo:Number(form.minimo||0),precio_venta:Number(form.precio_venta||0),precio_costo:Number(form.precio_costo||0)});
      } else {
        await db.post("stock",{nombre:form.nombre,categoria:form.categoria||"general",cantidad:Number(form.cantidad),minimo:Number(form.minimo||0),precio_venta:Number(form.precio_venta||0),precio_costo:Number(form.precio_costo||0)});
      }
      await load(); closeD();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const moverStock = async () => {
    if (!form.stock_id||!form.cantidad_mov) return;
    setSaving(true);
    try {
      const item = stock.find(s=>s.id===Number(form.stock_id));
      if (!item) return;
      const nueva = item.cantidad + (form.tipo_mov==="entrada"?1:-1)*Number(form.cantidad_mov);
      await db.patch("stock",item.id,{cantidad:Math.max(0,nueva)});
      if (form.tipo_mov==="salida"&&item.precio_venta>0) {
        await db.post("caja",{descripcion:`Venta - ${item.nombre}`,tipo:"ingreso",monto:item.precio_venta*Number(form.cantidad_mov),fecha:today()});
      }
      await load(); closeD();
    } catch(e) { alert(e.message); }
    setSaving(false);
  };

  const eliminarReserva = async (id) => {
    await db.del("reservas",id); await load(); setDialog(null);
  };

  const whatsapp = (c, r) => {
    const msg = encodeURIComponent(`Hola ${c.nombre}, tu turno en ${config.nombre_club} está confirmado para el ${r.fecha} a las ${r.hora}:00hs. ¡Te esperamos!`);
    const tel = (c.telefono||"").replace(/\D/g,"");
    window.open(`https://wa.me/595${tel.startsWith("0")?tel.slice(1):tel}?text=${msg}`,"_blank");
  };

  const initials = (nombre) => nombre?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
  const avatarColor = (nombre) => { const colors=["#E6F1FB","#EAF3DE","#FAECE7","#FAEEDA","#EEEDFE","#E1F5EE"]; const idx=(nombre||"").charCodeAt(0)%colors.length; return colors[idx]; };
  const avatarText = (nombre) => { const colors=["#185FA5","#3B6D11","#993C1D","#854F0B","#3C3489","#085041"]; const idx=(nombre||"").charCodeAt(0)%colors.length; return colors[idx]; };

  // ── TABS ──
  const TABS = [{id:"dashboard",label:"Dashboard"},{id:"calendario",label:"Calendario"},{id:"clientes",label:"Clientes"},{id:"mensualidades",label:"Mensualeros"},{id:"caja",label:"Caja"},{id:"stock",label:"Stock"},{id:"stats",label:"Estadísticas"},{id:"config",label:"Config"}];

  // ── DASHBOARD ──
  const Dashboard = () => {
    const hoy = today();
    const mes = hoy.slice(0,7);
    const resHoy = reservas.filter(r=>r.fecha===hoy);
    const ingHoy = caja.filter(m=>m.fecha===hoy&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingMes = caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrMes = caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    const deudores = mensualidades.filter(m=>m.fecha_vencimiento<hoy);
    const stockBajo = stock.filter(s=>s.cantidad<=s.minimo&&s.minimo>0);
    const proximas = reservas.filter(r=>r.fecha>=hoy).slice(0,5);

    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:500 }}>{config.nombre_club}</div>
            <div style={{ fontSize:13, color:"var(--color-text-secondary)", marginTop:2 }}>{new Date().toLocaleDateString("es-PY",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <button style={theme.btn("primary")} onClick={()=>openD("reserva",{fecha:hoy,hora:config.hora_inicio,tipo_pago:"efectivo"})}>+ Nueva reserva</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
          {[
            {label:"Ingresos hoy",value:gs(ingHoy)},
            {label:"Ingresos del mes",value:gs(ingMes)},
            {label:"Balance del mes",value:gs(ingMes-egrMes),color:ingMes-egrMes>=0?"#3B6D11":"#A32D2D"},
            {label:"Ocupación hoy",value:`${Math.round(resHoy.length/horas.length*100)}%`,sub:`${resHoy.length}/${horas.length} turnos`},
          ].map((m,i)=>(
            <div key={i} style={theme.metric}>
              <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{m.label}</div>
              <div style={{fontSize:21,fontWeight:500,color:m.color||"var(--color-text-primary)"}}>{m.value}</div>
              {m.sub&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:3}}>{m.sub}</div>}
            </div>
          ))}
        </div>

        {(deudores.length>0||stockBajo.length>0) && (
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            {deudores.length>0&&<div style={{ flex:1, background:"#FAEEDA", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#854F0B" }}>
              {deudores.length} mensualidad{deudores.length>1?"es":""} vencida{deudores.length>1?"s":""}
            </div>}
            {stockBajo.length>0&&<div style={{ flex:1, background:"#FCEBEB", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#A32D2D" }}>
              {stockBajo.length} producto{stockBajo.length>1?"s":""} con stock bajo
            </div>}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={theme.card}>
            <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Turnos de hoy</div>
            {resHoy.length===0?<Empty text="Sin turnos hoy"/>:resHoy.map(r=>{
              const c=cById(r.cliente_id);
              return <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:avatarColor(c?.nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,color:avatarText(c?.nombre),flexShrink:0}}>{initials(c?.nombre)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{c?.nombre||"?"}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{r.hora}:00 hs · {r.tipo_pago}</div>
                </div>
              </div>;
            })}
          </div>
          <div style={theme.card}>
            <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Próximas reservas</div>
            {proximas.length===0?<Empty text="Sin reservas próximas"/>:proximas.map(r=>{
              const c=cById(r.cliente_id);
              return <div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
                <span style={{fontWeight:500}}>{c?.nombre||"?"}</span>
                <span style={{color:"var(--color-text-secondary)"}}>{r.fecha.slice(5)} · {r.hora}:00</span>
              </div>;
            })}
          </div>
        </div>

        <div style={{...theme.card,marginTop:12}}>
          <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Últimos movimientos</div>
          {caja.slice(0,5).map(m=>(
            <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
              <div>
                <span>{m.descripcion}</span>
                <span style={{marginLeft:8,color:"var(--color-text-tertiary)",fontSize:11}}>{m.fecha.slice(8)}/{m.fecha.slice(5,7)}</span>
              </div>
              <span style={{fontWeight:500,color:m.tipo==="ingreso"?"#3B6D11":"#A32D2D"}}>{m.tipo==="egreso"?"- ":""}{gs(m.monto)}</span>
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:500}}>{dias[0].getDate()} {MESES[dias[0].getMonth()]} — {dias[6].getDate()} {MESES[dias[6].getMonth()]}</div>
          <div style={{display:"flex",gap:8}}>
            <button style={theme.btn()} onClick={()=>setSemOff(o=>o-1)}>← Ant.</button>
            <button style={theme.btn()} onClick={()=>setSemOff(0)}>Hoy</button>
            <button style={theme.btn()} onClick={()=>setSemOff(o=>o+1)}>Sig. →</button>
            <button style={theme.btn("primary")} onClick={()=>openD("reserva",{fecha:hoy,hora:config.hora_inicio,tipo_pago:"efectivo"})}>+ Reserva</button>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:`52px repeat(7,1fr)`,gap:1,background:"var(--color-border-tertiary)",borderRadius:10,overflow:"hidden",minWidth:580}}>
            <div style={{background:"var(--color-background-secondary)",padding:"10px 4px"}}/>
            {dias.map((d,i)=>{
              const isH=fmtD(d)===hoy;
              const cnt=reservas.filter(r=>r.fecha===fmtD(d)).length;
              return <div key={i} style={{background:isH?"#FAECE7":"var(--color-background-secondary)",padding:"10px 4px",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:500,color:isH?CORAL:"var(--color-text-secondary)"}}>{DIAS[d.getDay()]}</div>
                <div style={{fontSize:16,fontWeight:500,color:isH?CORAL:"var(--color-text-primary)",margin:"2px 0"}}>{d.getDate()}</div>
                {cnt>0?<div style={{fontSize:10,color:CORAL,fontWeight:500}}>{cnt}t</div>:<div style={{fontSize:10,color:"transparent"}}>·</div>}
              </div>;
            })}
            {horas.map(h=>(
              <>
                <div key={`t${h}`} style={{background:"var(--color-background-secondary)",padding:"0 10px",display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:11,color:"var(--color-text-tertiary)",minHeight:40}}>{h}:00</div>
                {dias.map((d,di)=>{
                  const fs=fmtD(d);
                  const res=reservas.find(r=>r.fecha===fs&&r.hora===h);
                  const c=res?cById(res.cliente_id):null;
                  const isMens=res?.tipo_pago==="mensualidad";
                  return <div key={`${h}-${di}`}
                    onClick={()=>res?openD("verRes",{...res,cliente:c}):openD("reserva",{fecha:fs,hora:h,tipo_pago:"efectivo"})}
                    style={{background:res?(isMens?"#EEEDFE":"#FAECE7"):"var(--color-background-primary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",minHeight:40,transition:"background .1s"}}>
                    {res&&<span style={{fontSize:11,color:isMens?"#3C3489":CORAL,fontWeight:500,background:isMens?"#CECBF6":"#F5C4B3",borderRadius:5,padding:"2px 7px",maxWidth:"92%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {c?.nombre?.split(" ")[0]||"?"}
                    </span>}
                  </div>;
                })}
              </>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:12,marginTop:10,fontSize:12,color:"var(--color-text-secondary)"}}>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"#F5C4B3",display:"inline-block"}}/> Ocasional</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:"#CECBF6",display:"inline-block"}}/> Mensualero</span>
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:16,fontWeight:500}}>Clientes <span style={{fontSize:13,color:"var(--color-text-secondary)",fontWeight:400}}>({clientes.length})</span></span>
          <div style={{display:"flex",gap:8}}>
            <input style={{...theme.inp,width:200}} placeholder="Buscar..." defaultValue={busq} onChange={e=>setBusq(e.target.value)}/>
            <button style={theme.btn("primary")} onClick={()=>openD("cliente",{tipo:"ocasional",nivel:"intermedio"})}>+ Agregar</button>
          </div>
        </div>
        <div style={{display:"grid",gap:8}}>
          {lista.map(c=>{
            const mens=mensualidades.filter(m=>m.cliente_id===c.id).sort((a,b)=>b.fecha_vencimiento?.localeCompare(a.fecha_vencimiento));
            const ult=mens[0];
            const vencida=ult&&ult.fecha_vencimiento<hoy;
            const resC=reservas.filter(r=>r.cliente_id===c.id).length;
            return <div key={c.id} style={{...theme.card,display:"flex",alignItems:"center",gap:14,padding:"12px 16px"}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:avatarColor(c.nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:avatarText(c.nombre),flexShrink:0}}>{initials(c.nombre)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:500,fontSize:14}}>{c.nombre}</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{c.telefono||"Sin teléfono"} · {resC} reservas</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <Badge type={c.tipo==="mensualero"?"purple":"gray"}>{c.tipo}</Badge>
                {c.tipo==="mensualero"&&(ult?<Badge type={vencida?"danger":"ok"}>{vencida?"Vencida":`Hasta ${ult.fecha_vencimiento?.slice(5)}`}</Badge>:<Badge type="warn">Sin mensualidad</Badge>)}
                <button style={{...theme.btn("ghost"),padding:"5px 12px",fontSize:12}} onClick={()=>openD("reserva",{cliente_id:c.id,fecha:today(),hora:config.hora_inicio,tipo_pago:"efectivo"})}>Reservar</button>
                {c.tipo==="mensualero"&&<button style={{...theme.btn("ghost"),padding:"5px 12px",fontSize:12}} onClick={()=>openD("mensualidad",{cliente_id:c.id,monto:"",fecha_inicio:today(),plan:"Mensual"})}>Mensualidad</button>}
              </div>
            </div>;
          })}
        </div>
      </div>
    );
  };

  // ── MENSUALEROS ──
  const Mensualidades = () => {
    const hoy = today();
    const venc = mensualidades.filter(m=>m.fecha_vencimiento<hoy);
    const vig = mensualidades.filter(m=>m.fecha_vencimiento>=hoy);
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:16,fontWeight:500}}>Mensualeros</span>
          <button style={theme.btn("primary")} onClick={()=>openD("mensualidad",{fecha_inicio:today(),plan:"Mensual"})}>+ Registrar cobro</button>
        </div>
        {venc.length>0&&<div style={{background:"#FAEEDA",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#854F0B",marginBottom:14}}>{venc.length} mensualidad{venc.length>1?"es":""} vencida{venc.length>1?"s":""} — recordá renovar</div>}
        <div style={{display:"grid",gap:8}}>
          {[...venc,...vig].map(m=>{
            const c=cById(m.cliente_id);
            const v=m.fecha_vencimiento<hoy;
            const dias=m.turno_dias?m.turno_dias.split(",").filter(Boolean).map(d=>DIAS_FULL[Number(d)]).join(", "):"Sin turno fijo";
            return <div key={m.id} style={{...theme.card,padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:avatarColor(c?.nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:avatarText(c?.nombre),flexShrink:0}}>{initials(c?.nombre)}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:500,fontSize:14}}>{c?.nombre||"?"}</div>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{m.plan} · {gs(m.monto)}/mes</div>
                  <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:1}}>Turno: {dias} {m.turno_hora!==null?`· ${m.turno_hora}:00hs`:""}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                  <Badge type={v?"danger":"ok"}>{v?"Vencida":"Vigente"} {m.fecha_vencimiento?.slice(5)}</Badge>
                  {v&&<button style={{...theme.btn("primary"),padding:"5px 12px",fontSize:12}} onClick={()=>openD("mensualidad",{cliente_id:m.cliente_id,monto:m.monto,fecha_inicio:today(),plan:m.plan,turno_dias:m.turno_dias,turno_hora:m.turno_hora})}>Renovar</button>}
                </div>
              </div>
            </div>;
          })}
        </div>
      </div>
    );
  };

  // ── CAJA ──
  const Caja = () => {
    const hoy=today(); const mes=hoy.slice(0,7);
    const ingH=caja.filter(m=>m.fecha===hoy&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    return (
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          <div style={theme.metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Ingresos hoy</div><div style={{fontSize:21,fontWeight:500}}>{gs(ingH)}</div></div>
          <div style={theme.metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Ingresos del mes</div><div style={{fontSize:21,fontWeight:500}}>{gs(ingM)}</div></div>
          <div style={theme.metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Balance del mes</div><div style={{fontSize:21,fontWeight:500,color:ingM-egrM>=0?"#3B6D11":"#A32D2D"}}>{gs(ingM-egrM)}</div></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:16,fontWeight:500}}>Movimientos</span>
          <button style={theme.btn("primary")} onClick={()=>openD("movimiento",{tipo:"ingreso",fecha:hoy})}>+ Registrar</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",borderRadius:10,overflow:"hidden"}}>
            <thead><tr><th style={theme.th}>Fecha</th><th style={theme.th}>Descripción</th><th style={theme.th}>Tipo</th><th style={{...theme.th,textAlign:"right"}}>Monto</th></tr></thead>
            <tbody>
              {caja.map(m=><tr key={m.id}>
                <td style={theme.td}>{m.fecha.slice(8)}/{m.fecha.slice(5,7)}</td>
                <td style={theme.td}>{m.descripcion}</td>
                <td style={theme.td}><Badge type={m.tipo==="ingreso"?"ok":"danger"}>{m.tipo}</Badge></td>
                <td style={{...theme.td,textAlign:"right",fontWeight:500,color:m.tipo==="ingreso"?"#3B6D11":"#A32D2D"}}>{m.tipo==="egreso"?"- ":""}{gs(m.monto)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── STOCK ──
  const Stock = () => {
    const bajo = stock.filter(s=>s.cantidad<=s.minimo&&s.minimo>0);
    const cats = [...new Set(stock.map(s=>s.categoria))];
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:16,fontWeight:500}}>Stock</span>
          <div style={{display:"flex",gap:8}}>
            <button style={theme.btn()} onClick={()=>openD("moverStock",{tipo_mov:"salida"})}>Registrar movimiento</button>
            <button style={theme.btn("primary")} onClick={()=>openD("stockItem",{categoria:"pelotas",minimo:"5"})}>+ Producto</button>
          </div>
        </div>
        {bajo.length>0&&<div style={{background:"#FCEBEB",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#A32D2D",marginBottom:14}}>Stock bajo: {bajo.map(s=>s.nombre).join(", ")}</div>}
        {stock.length===0?<Empty text="No hay productos en stock. Creá el SQL de la tabla stock en Supabase primero."/>:(
          cats.map(cat=>(
            <div key={cat} style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>{cat}</div>
              <div style={{display:"grid",gap:8}}>
                {stock.filter(s=>s.categoria===cat).map(s=>{
                  const bajo=s.cantidad<=s.minimo&&s.minimo>0;
                  return <div key={s.id} style={{...theme.card,display:"flex",alignItems:"center",gap:14,padding:"12px 16px"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:500,fontSize:14}}>{s.nombre}</div>
                      {s.precio_venta>0&&<div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>Venta: {gs(s.precio_venta)} · Costo: {gs(s.precio_costo)}</div>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:22,fontWeight:500,color:bajo?"#A32D2D":"var(--color-text-primary)"}}>{s.cantidad}</div>
                        <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>unidades</div>
                      </div>
                      {bajo&&<Badge type="danger">Stock bajo</Badge>}
                      <button style={{...theme.btn("ghost"),padding:"5px 12px",fontSize:12}} onClick={()=>openD("stockItem",{...s})}>Editar</button>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // ── STATS ──
  const Stats = () => {
    const hoy=today(); const mes=hoy.slice(0,7);
    const ult7=Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-6+i); return fmtD(d); });
    const porDia=ult7.map(f=>({fecha:f,ing:caja.filter(m=>m.fecha===f&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0)}));
    const maxIng=Math.max(...porDia.map(d=>d.ing),1);
    const horasPico=horas.map(h=>({hora:h,count:reservas.filter(r=>r.hora===h).length})).sort((a,b)=>b.count-a.count).slice(0,6);
    const maxH=Math.max(...horasPico.map(h=>h.count),1);
    const topC=clientes.map(c=>({...c,total:reservas.filter(r=>r.cliente_id===c.id).length})).sort((a,b)=>b.total-a.total).slice(0,5);
    const ingMes=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const proy=Math.round(ingMes/new Date().getDate()*30);
    const totalRes=reservas.length;
    const mensualeros=clientes.filter(c=>c.tipo==="mensualero").length;

    return (
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[
            {label:"Ingresos del mes",value:gs(ingMes)},
            {label:"Proyección mensual",value:gs(proy),color:"#185FA5"},
            {label:"Total reservas",value:totalRes},
            {label:"Mensualeros activos",value:mensualeros},
          ].map((m,i)=>(
            <div key={i} style={theme.metric}>
              <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{m.label}</div>
              <div style={{fontSize:21,fontWeight:500,color:m.color||"var(--color-text-primary)"}}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{...theme.card,marginBottom:12}}>
          <div style={{fontWeight:500,marginBottom:16,fontSize:14}}>Ingresos últimos 7 días</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
            {porDia.map((d,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:"100%",background:d.ing>0?CORAL:"var(--color-background-secondary)",borderRadius:"4px 4px 0 0",height:Math.max(d.ing/maxIng*80,4)}}/>
                <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{d.fecha.slice(8)}/{d.fecha.slice(5,7)}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={theme.card}>
            <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Horarios pico</div>
            {horasPico.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <span style={{fontSize:13,minWidth:50}}>{h.hora}:00</span>
                <div style={{flex:1,height:6,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${h.count/maxH*100}%`,height:"100%",background:CORAL,borderRadius:3}}/>
                </div>
                <span style={{fontSize:12,color:"var(--color-text-secondary)",minWidth:20}}>{h.count}</span>
              </div>
            ))}
          </div>
          <div style={theme.card}>
            <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Top clientes</div>
            {topC.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:avatarColor(c.nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,color:avatarText(c.nombre),flexShrink:0}}>{initials(c.nombre)}</div>
                <span style={{flex:1,fontSize:13}}>{c.nombre}</span>
                <Badge type="info">{c.total}</Badge>
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:500}}>Configuración</span>
        <button style={theme.btn("primary")} onClick={()=>openD("config",{...config})}>Editar</button>
      </div>
      <div style={{...theme.card,display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {[
          {label:"Nombre del club",value:config.nombre_club},
          {label:"Tarifa por hora",value:gs(config.tarifa_hora)},
          {label:"Apertura",value:`${config.hora_inicio}:00`},
          {label:"Cierre",value:`${config.hora_fin}:00`},
          {label:"Turnos disponibles/día",value:config.hora_fin-config.hora_inicio},
          {label:"Ingreso máximo diario",value:gs((config.hora_fin-config.hora_inicio)*config.tarifa_hora)},
        ].map((r,i)=>(
          <div key={i}>
            <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>{r.label}</div>
            <div style={{fontSize:15,fontWeight:500}}>{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── DÍAS SEMANA SELECTOR ──
  const DiaSelector = ({value, onChange}) => {
    const sel = value ? value.split(",").filter(Boolean).map(Number) : [];
    const toggle = (d) => {
      const nuevo = sel.includes(d) ? sel.filter(x=>x!==d) : [...sel,d];
      onChange(nuevo.join(","));
    };
    return (
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {DIAS_FULL.map((nombre,i)=>(
          <button key={i} type="button" onClick={()=>toggle(i)} style={{padding:"5px 10px",borderRadius:8,fontSize:12,cursor:"pointer",border:"0.5px solid",fontFamily:"var(--font-sans)",borderColor:sel.includes(i)?CORAL:"var(--color-border-secondary)",background:sel.includes(i)?"#FAECE7":"var(--color-background-primary)",color:sel.includes(i)?CORAL:"var(--color-text-secondary)"}}>
            {nombre.slice(0,3)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={{fontFamily:"var(--font-sans)",maxWidth:920,margin:"0 auto",padding:"0 2px"}}>
      <div style={{display:"flex",gap:0,borderBottom:"0.5px solid var(--color-border-tertiary)",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 16px",fontSize:13,border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",color:tab===t.id?"var(--color-text-primary)":"var(--color-text-secondary)",borderBottom:tab===t.id?`2px solid ${CORAL}`:"2px solid transparent",fontWeight:tab===t.id?500:400,fontFamily:"var(--font-sans)"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"18px 0"}}>
        {loading?<Spin/>:(
          <>
            {tab==="dashboard"&&<Dashboard/>}
            {tab==="calendario"&&<Calendario/>}
            {tab==="clientes"&&<Clientes/>}
            {tab==="mensualidades"&&<Mensualidades/>}
            {tab==="caja"&&<Caja/>}
            {tab==="stock"&&<Stock/>}
            {tab==="stats"&&<Stats/>}
            {tab==="config"&&<Config/>}
          </>
        )}
      </div>

      {/* ── DRAWERS ── */}
      <Drawer show={drawer==="reserva"} onClose={closeD} title="Nueva reserva">
        <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}>
          <option value="">Seleccioná un cliente</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Sel>
        <Row2>
          <Field label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/>
          <div style={{marginBottom:14}}><label style={theme.label}>Hora</label><select style={theme.inp} value={form.hora??""} onChange={sf("hora")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></div>
        </Row2>
        <Sel label="Tipo de pago" value={form.tipo_pago||"efectivo"} onChange={sf("tipo_pago")}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="mensualidad">Mensualidad (sin cobro)</option>
        </Sel>
        <Divider/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={theme.btn()} onClick={closeD}>Cancelar</button>
          <button style={theme.btn("primary")} onClick={guardarReserva} disabled={saving}>{saving?"Guardando...":"Guardar reserva"}</button>
        </div>
      </Drawer>

      <Drawer show={drawer==="verRes"} onClose={closeD} title="Detalle de reserva">
        {form.cliente&&<>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:avatarColor(form.cliente.nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:500,color:avatarText(form.cliente.nombre)}}>{initials(form.cliente.nombre)}</div>
            <div>
              <div style={{fontSize:16,fontWeight:500}}>{form.cliente.nombre}</div>
              <div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{form.cliente.telefono}</div>
            </div>
          </div>
          <div style={{...theme.metric,marginBottom:14}}>
            <div style={{fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Fecha:</span> {form.fecha} · {form.hora}:00 hs</div>
            <div style={{fontSize:13,marginTop:6}}><span style={{color:"var(--color-text-secondary)"}}>Pago:</span> {form.tipo_pago}</div>
          </div>
          <Divider/>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button style={{...theme.btn("success"),textAlign:"center"}} onClick={()=>whatsapp(form.cliente,form)}>Confirmar por WhatsApp</button>
            <button style={{...theme.btn("danger"),textAlign:"center"}} onClick={()=>setDialog({type:"confirmar",res:form})}>Cancelar turno</button>
          </div>
        </>}
      </Drawer>

      <Drawer show={drawer==="cliente"} onClose={closeD} title="Agregar cliente">
        <Field label="Nombre completo" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
        <Field label="Teléfono" type="text" value={form.telefono||""} onChange={sf("telefono")}/>
        <Row2>
          <Sel label="Tipo" value={form.tipo||"ocasional"} onChange={sf("tipo")}>
            <option value="ocasional">Ocasional</option>
            <option value="mensualero">Mensualero</option>
          </Sel>
          <Sel label="Nivel" value={form.nivel||"intermedio"} onChange={sf("nivel")}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </Sel>
        </Row2>
        <Field label="Notas (opcional)" type="text" value={form.notas||""} onChange={sf("notas")}/>
        <Divider/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={theme.btn()} onClick={closeD}>Cancelar</button>
          <button style={theme.btn("primary")} onClick={guardarCliente} disabled={saving}>{saving?"Guardando...":"Guardar cliente"}</button>
        </div>
      </Drawer>

      <Drawer show={drawer==="mensualidad"} onClose={closeD} title="Registrar mensualidad">
        <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}>
          <option value="">Seleccioná un cliente</option>
          {clientes.filter(c=>c.tipo==="mensualero").map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Sel>
        <Field label="Plan (ej: 2x semana, Ilimitado)" type="text" value={form.plan||""} onChange={sf("plan")}/>
        <Field label="Monto mensual (Gs)" type="number" value={form.monto||""} onChange={sf("monto")}/>
        <Field label="Fecha de inicio" type="date" value={form.fecha_inicio||""} onChange={sf("fecha_inicio")}/>
        <Divider/>
        <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8}}>Turno fijo semanal (opcional)</div>
        <div style={{marginBottom:14}}>
          <label style={theme.label}>Días de la semana</label>
          <DiaSelector value={form.turno_dias||""} onChange={v=>setForm(f=>({...f,turno_dias:v}))}/>
        </div>
        <div style={{marginBottom:14}}><label style={theme.label}>Hora del turno fijo</label><select style={theme.inp} value={form.turno_hora??""} onChange={sf("turno_hora")}><option value="">Sin turno fijo</option>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></div>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:16}}>Si configurás turno fijo, se reserva automáticamente en el calendario por los próximos 28 días.</div>
        <Divider/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={theme.btn()} onClick={closeD}>Cancelar</button>
          <button style={theme.btn("primary")} onClick={guardarMensualidad} disabled={saving}>{saving?"Guardando...":"Registrar cobro"}</button>
        </div>
      </Drawer>

      <Drawer show={drawer==="movimiento"} onClose={closeD} title="Registrar movimiento">
        <Field label="Descripción" type="text" value={form.descripcion||""} onChange={sf("descripcion")} autoFocus/>
        <Row2>
          <Field label="Monto (Gs)" type="number" value={form.monto||""} onChange={sf("monto")}/>
          <Sel label="Tipo" value={form.tipo||"ingreso"} onChange={sf("tipo")}>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Sel>
        </Row2>
        <Field label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/>
        <Divider/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={theme.btn()} onClick={closeD}>Cancelar</button>
          <button style={theme.btn("primary")} onClick={guardarMovimiento} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
        </div>
      </Drawer>

      <Drawer show={drawer==="stockItem"} onClose={closeD} title={form.id?"Editar producto":"Nuevo producto"}>
        <Field label="Nombre del producto" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
        <Sel label="Categoría" value={form.categoria||"general"} onChange={sf("categoria")}>
          <option value="pelotas">Pelotas</option>
          <option value="paletas">Paletas</option>
          <option value="bebidas">Bebidas</option>
          <option value="accesorios">Accesorios</option>
          <option value="general">General</option>
        </Sel>
        <Row2>
          <Field label="Cantidad actual" type="number" value={form.cantidad||""} onChange={sf("cantidad")}/>
          <Field label="Stock mínimo (alerta)" type="number" value={form.minimo||""} onChange={sf("minimo")}/>
        </Row2>
        <Row2>
          <Field label="Precio venta (Gs)" type="number" value={form.precio_venta||""} onChange={sf("precio_venta")}/>
          <Field label="Precio costo (Gs)" type="number" value={form.precio_costo||""} onChange={sf("precio_costo")}/>
        </Row2>
        <Divider/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={theme.btn()} onClick={closeD}>Cancelar</button>
          <button style={theme.btn("primary")} onClick={guardarStock} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
        </div>
      </Drawer>

      <Drawer show={drawer==="moverStock"} onClose={closeD} title="Movimiento de stock">
        <Sel label="Producto" value={form.stock_id||""} onChange={sf("stock_id")}>
          <option value="">Seleccioná un producto</option>
          {stock.map(s=><option key={s.id} value={s.id}>{s.nombre} (stock: {s.cantidad})</option>)}
        </Sel>
        <Sel label="Tipo de movimiento" value={form.tipo_mov||"salida"} onChange={sf("tipo_mov")}>
          <option value="entrada">Entrada (compra/reposición)</option>
          <option value="salida">Salida (venta/uso)</option>
        </Sel>
        <Field label="Cantidad" type="number" value={form.cantidad_mov||""} onChange={sf("cantidad_mov")}/>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:16}}>Si es salida y el producto tiene precio de venta, se registra automáticamente en caja.</div>
        <Divider/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={theme.btn()} onClick={closeD}>Cancelar</button>
          <button style={theme.btn("primary")} onClick={moverStock} disabled={saving}>{saving?"Guardando...":"Confirmar"}</button>
        </div>
      </Drawer>

      <Drawer show={drawer==="config"} onClose={closeD} title="Configuración">
        <Field label="Nombre del club" type="text" value={form.nombre_club||""} onChange={sf("nombre_club")}/>
        <Field label="Tarifa por hora (Gs)" type="number" value={form.tarifa_hora||""} onChange={sf("tarifa_hora")}/>
        <Row2>
          <div style={{marginBottom:14}}><label style={theme.label}>Hora apertura</label><select style={theme.inp} value={form.hora_inicio??""} onChange={sf("hora_inicio")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={theme.label}>Hora cierre</label><select style={theme.inp} value={form.hora_fin??""} onChange={sf("hora_fin")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></div>
        </Row2>
        <Divider/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={theme.btn()} onClick={closeD}>Cancelar</button>
          <button style={theme.btn("primary")} onClick={guardarConfig} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
        </div>
      </Drawer>

      {/* ── DIALOG CONFIRMACIÓN ── */}
      <Dialog show={!!dialog} onClose={()=>setDialog(null)} title="¿Cancelar este turno?">
        {dialog&&<>
          <div style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:20}}>Esta acción no se puede deshacer.</div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button style={theme.btn()} onClick={()=>setDialog(null)}>No, volver</button>
            <button style={theme.btn("danger")} onClick={()=>{eliminarReserva(dialog.res.id);closeD();}}>Sí, cancelar turno</button>
          </div>
        </>}
      </Dialog>
    </div>
  );
}