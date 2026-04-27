import { useState, useEffect, useCallback, useRef } from "react";

// ── CONSTANTES GLOBALES ──
const SUPA_URL = "https://wirsrkuxzltedqdkrdak.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcnNya3V4emx0ZWRxZGtyZGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjEzMjMsImV4cCI6MjA5MjYzNzMyM30.BjxD2R5bgBUHyalpwFhRzsGEzOnCx4PH9Sb65d609VI";
const ADMIN_TEL = "595994199173";
const LOGO = "/logo.png";

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DIAS_FULL = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Paleta de colores
const BR = {
  coral:"#D85A30", coralL:"#FAECE7", coralD:"#993C1D",
  blue:"#0F1C3F", blueM:"#1A2F6B", blueL:"#E6EEFF",
  dark:"#08101F",
  ok:"#3B6D11", okL:"#EAF3DE",
  warn:"#854F0B", warnL:"#FAEEDA",
  danger:"#A32D2D", dangerL:"#FCEBEB",
  info:"#185FA5", infoL:"#E6F1FB",
  purple:"#3C3489", purpleL:"#EEEDFE",
};
// Textos modo oscuro
const TX = { p:"#E8EEFF", s:"#9AAAD4", t:"#6677AA" };

// Estilos base modo oscuro
const inp = { padding:"8px 12px", border:"1px solid #2A3F6B", borderRadius:8, fontSize:13, width:"100%", background:"#0F1C3F", color:TX.p, fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" };
const card = { background:"#111E40", border:"1px solid #1E3070", borderRadius:14, padding:"16px 18px" };
const metric = { background:"#0D1830", borderRadius:12, padding:"14px 16px", border:"1px solid #1A2B5A" };
const lbl = { fontSize:12, color:TX.s, fontWeight:500, marginBottom:5, display:"block" };

// ── AUTH ──
const auth = {
  login: async (email, pw) => {
    const r = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{ apikey:SUPA_KEY, "Content-Type":"application/json" },
      body: JSON.stringify({ email, password:pw }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error_description||"Credenciales incorrectas");
    return d;
  },
  logout: async (token) => {
    await fetch(`${SUPA_URL}/auth/v1/logout`, { method:"POST", headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${token}` } });
  },
};

// ── DB ──
const api = async (path, opts={}, token) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    headers:{ apikey:SUPA_KEY, Authorization:`Bearer ${token||SUPA_KEY}`, "Content-Type":"application/json", ...(opts.prefer?{Prefer:opts.prefer}:{}) },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
const db = {
  get: (t,p,tk) => api(`${t}?${p||""}`,{},tk),
  post: (t,b,tk) => api(t,{method:"POST",body:JSON.stringify(b),prefer:"return=representation"},tk),
  patch: (t,id,b,tk) => api(`${t}?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(b),prefer:"return=representation"},tk),
  del: (t,id,tk) => api(`${t}?id=eq.${id}`,{method:"DELETE"},tk),
};

// ── HELPERS ──
const gs = n => "Gs "+Math.round(n||0).toLocaleString("es-PY");
const hoy = () => new Date().toISOString().slice(0,10);
const fmtD = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const initials = n => n?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
const avatarBg = n => { const c=["#1A3570","#0D3020","#3A1A10","#2A1A40","#0A2A3A","#1A2A0A"]; return c[(n||"").charCodeAt(0)%c.length]; };
const avatarFg = n => { const c=["#7EAAFF","#7ADDA8","#F5A882","#B8A0F5","#7ACCE0","#A8D47A"]; return c[(n||"").charCodeAt(0)%c.length]; };

// ── COMPONENTES BASE ──
const Avatar = ({nombre,size=36}) => <div style={{width:size,height:size,borderRadius:"50%",background:avatarBg(nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:600,color:avatarFg(nombre),flexShrink:0}}>{initials(nombre)}</div>;

const Badge = ({type,children}) => {
  const m = {
    ok:["#0D2E1A","#7ADDA8"], warn:["#2A1A0A","#F5C07A"], danger:["#2A0A0A","#F58282"],
    info:["#0A1A3A","#7EAAFF"], coral:["#3A1A0A","#F5A882"], purple:["#1A0A3A","#B8A0F5"],
    gray:["#1A2B5A",TX.s],
  };
  const [bg,color] = m[type]||m.gray;
  return <span style={{background:bg,color,fontSize:11,padding:"3px 9px",borderRadius:100,fontWeight:500,display:"inline-block",whiteSpace:"nowrap"}}>{children}</span>;
};

const Btn = ({v="default",sm,children,...p}) => {
  const s = {
    primary:{background:`linear-gradient(135deg,${BR.coral},${BR.coralD})`,color:"#fff",border:"none"},
    ghost:{background:"#1A2B5A",color:TX.p,border:"1px solid #2A3F6B"},
    danger:{background:"#2A0A0A",color:"#F58282",border:"1px solid #5A1010"},
    success:{background:"#0D2E1A",color:"#7ADDA8",border:"1px solid #1A5A30"},
    blue:{background:`linear-gradient(135deg,${BR.blue},${BR.blueM})`,color:"#fff",border:"none"},
    default:{background:"#1A2B5A",color:TX.p,border:"1px solid #2A3F6B"},
  };
  return <button {...p} style={{padding:sm?"5px 12px":"8px 16px",borderRadius:8,fontSize:sm?12:13,cursor:"pointer",fontFamily:"var(--font-sans)",fontWeight:400,...(s[v]||s.default),...p.style}}>{children}</button>;
};

const FG = ({label,children}) => <div style={{marginBottom:14}}>{label&&<label style={lbl}>{label}</label>}{children}</div>;
const Inp = ({label,...p}) => {
  const ref = useRef();
  useEffect(()=>{if(ref.current&&document.activeElement!==ref.current)ref.current.value=p.value??"";},[p.value]);
  return <FG label={label}><input ref={ref} {...p} style={inp} defaultValue={p.value??""} onChange={p.onChange}/></FG>;
};
const Sel = ({label,children,...p}) => <FG label={label}><select {...p} style={inp}>{children}</select></FG>;
const R2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{children}</div>;
const Div = () => <div style={{height:"1px",background:"#1E3070",margin:"16px 0"}}/>;
const Empty = ({t}) => <div style={{textAlign:"center",padding:"40px 0",color:TX.t,fontSize:13}}>{t}</div>;

const estadoBadge = e => {
  if(e==="confirmado") return <Badge type="ok">✓ Confirmado</Badge>;
  if(e==="cancelado") return <Badge type="danger">✗ Cancelado</Badge>;
  if(e==="no_show") return <Badge type="warn">No show</Badge>;
  return <Badge type="gray">Reservado</Badge>;
};
const tipoBadge = t => {
  if(t==="abono") return <Badge type="purple">Abono</Badge>;
  if(t==="clase") return <Badge type="info">Clase</Badge>;
  if(t==="bloqueado") return <Badge type="gray">Bloqueado</Badge>;
  return <Badge type="coral">Ocasional</Badge>;
};

// ── MODAL ──
const Modal = ({show,onClose,title,children,width=420}) => {
  if(!show) return null;
  return <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.75)",padding:"24px 16px",overflowY:"auto"}}>
    <div style={{width:"100%",maxWidth:width,backgroundColor:"#111E40",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",border:"1px solid #1E3070",flexShrink:0}}>
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #1E3070",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:16,fontWeight:500,color:TX.p}}>{title}</span>
        <button onClick={onClose} style={{border:"none",background:"#1A2B5A",cursor:"pointer",fontSize:16,color:TX.s,padding:"5px 9px",borderRadius:6}}>×</button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>;
};

// ── DIALOG ──
const Dialog = ({show,title,msg,onOk,onCancel,okLabel="Confirmar",okV="danger"}) => {
  if(!show) return null;
  return <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.8)"}}>
    <div style={{backgroundColor:"#111E40",borderRadius:14,padding:"24px",width:340,boxShadow:"0 8px 40px rgba(0,0,0,0.6)",border:"1px solid #1E3070"}}>
      <div style={{fontSize:15,fontWeight:500,marginBottom:8,color:TX.p}}>{title}</div>
      <div style={{fontSize:13,color:TX.s,marginBottom:20}}>{msg}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onCancel}>Cancelar</Btn>
        <Btn v={okV} onClick={onOk}>{okLabel}</Btn>
      </div>
    </div>
  </div>;
};

// ── LOGIN ──
const Login = ({onLogin}) => {
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const doLogin = async () => {
    if(!email||!pw) return;
    setLoading(true); setErr("");
    try {
      const d = await auth.login(email,pw);
      localStorage.setItem("dx_token",d.access_token);
      localStorage.setItem("dx_user",JSON.stringify({id:d.user.id,email:d.user.email}));
      onLogin(d.access_token,d.user);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(160deg,${BR.dark},${BR.blue})`}}>
    <div style={{width:380,padding:"44px 36px",background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",borderRadius:20,border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 32px 80px rgba(0,0,0,0.5)"}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <img src={LOGO} alt="DEXON" onError={e=>{e.target.style.display="none";}} style={{height:72,marginBottom:12,objectFit:"contain"}}/>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:3,textTransform:"uppercase"}}>Sistema de gestión</div>
      </div>
      {err&&<div style={{background:"rgba(216,90,48,0.15)",color:"#F5A882",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:16}}>{err}</div>}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontWeight:500,display:"block",marginBottom:6}}>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,fontSize:14,color:"#fff",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box"}} placeholder="tu@email.com"/>
      </div>
      <div style={{marginBottom:28}}>
        <label style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontWeight:500,display:"block",marginBottom:6}}>Contraseña</label>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",padding:"12px 14px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,fontSize:14,color:"#fff",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box"}} placeholder="••••••••"/>
      </div>
      <button onClick={doLogin} disabled={loading} style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${BR.coral},${BR.coralD})`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
        {loading?"Ingresando...":"Ingresar"}
      </button>
    </div>
  </div>;
};

// ── PORTAL CLIENTE ──
const PortalCliente = () => {
  const [cfg,setCfg] = useState({nombre_club:"DEXON PADEL",hora_inicio:10,hora_fin:24,tarifa_base:80000,tarifa_pico:100000,hora_pico_inicio:19,hora_pico_fin:22});
  const [turnos,setTurnos] = useState([]);
  const [clientes,setClientes] = useState([]);
  const [loading,setLoading] = useState(true);
  const [fecha,setFecha] = useState(hoy());
  const [slotsSel,setSlotsSel] = useState([]);
  const [paso,setPaso] = useState("lista");
  const [form,setForm] = useState({nombre:"",telefono:""});
  const [saving,setSaving] = useState(false);
  const [msg,setMsg] = useState("");
  const [clima,setClima] = useState({});

  useEffect(()=>{
    const load = async () => {
      try {
        const [cf,tu,cl] = await Promise.all([db.get("config","limit=1"),db.get("turnos","order=fecha.asc,hora.asc"),db.get("clientes","order=nombre.asc")]);
        if(cf?.[0]) setCfg(cf[0]);
        setTurnos(tu||[]);
        setClientes(cl||[]);
      } catch(e){console.error(e);}
      setLoading(false);
    };
    load();
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-25.65&longitude=-54.77&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FAsuncion&forecast_days=7")
      .then(r=>r.json()).then(d=>{
        const dias={};
        d.daily.time.forEach((f,i)=>{dias[f]={max:Math.round(d.daily.temperature_2m_max[i]),min:Math.round(d.daily.temperature_2m_min[i]),lluvia:d.daily.precipitation_probability_max[i],code:d.daily.weathercode[i]};});
        setClima(dias);
      }).catch(()=>{});
  },[]);

  const horasArr = Array.from({length:cfg.hora_fin-cfg.hora_inicio},(_,i)=>cfg.hora_inicio+i);
  const precioH = h => h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin?cfg.tarifa_pico:cfg.tarifa_base;
  const ocupado = h => turnos.find(t=>t.fecha===fecha&&t.hora===h&&t.estado!=="cancelado");
  const pasado = h => fecha===hoy()&&h<=new Date().getHours();
  const climaFecha = clima[fecha];
  const climaIcon = code => {if(!code&&code!==0)return"🌤";if(code===0)return"☀️";if(code<=2)return"⛅";if(code<=48)return"☁️";if(code<=67)return"🌧️";return"⛈️";};
  const libres = horasArr.filter(h=>!ocupado(h)&&!pasado(h));
  const ocupados = horasArr.filter(h=>ocupado(h)||pasado(h));
  const totalSel = slotsSel.reduce((a,h)=>a+precioH(h),0);

  const toggleSlot = h => {
    if(slotsSel.includes(h)){setSlotsSel(slotsSel.filter(s=>s!==h));return;}
    if(slotsSel.length===0){setSlotsSel([h]);return;}
    const min=Math.min(...slotsSel);const max=Math.max(...slotsSel);
    if(h===min-1||h===max+1) setSlotsSel([...slotsSel,h].sort((a,b)=>a-b));
    else setSlotsSel([h]);
  };

  const buscarCliente = () => {
    const n=form.nombre.trim().toLowerCase();const t=form.telefono.trim().replace(/\D/g,"");
    const pN=clientes.filter(c=>c.nombre.toLowerCase()===n);
    const pT=t?clientes.filter(c=>c.telefono.replace(/\D/g,"")===t):[];
    if(pN.length>0&&pT.length>0&&pN[0].id===pT[0].id)return{match:"total",cliente:pN[0]};
    if(pN.length>0)return{match:"parcial_nombre",cliente:pN[0]};
    if(pT.length>0)return{match:"parcial_tel",cliente:pT[0]};
    return{match:"nuevo",cliente:null};
  };

  const reservar = async () => {
    if(!form.nombre.trim()||!form.telefono.trim()){setMsg("Completá tu nombre y teléfono.");return;}
    if(slotsSel.length===0){setMsg("Seleccioná al menos un horario.");return;}
    setSaving(true);setMsg("");
    try {
      const {match,cliente}=buscarCliente();
      let clienteId=cliente?.id;
      let nota="Reservado desde portal";
      if(match==="nuevo"){const[c]=await db.post("clientes",{nombre:form.nombre.trim(),telefono:form.telefono.trim(),nivel:"intermedio",notas:"Registrado desde portal"});clienteId=c.id;}
      else if(match==="parcial_nombre"){nota=`⚠️ Nombre coincide pero tel diferente (reg: ${cliente.telefono})`;clienteId=cliente.id;}
      else if(match==="parcial_tel"){nota=`⚠️ Tel coincide pero nombre diferente (reg: ${cliente.nombre})`;clienteId=cliente.id;}
      for(const h of slotsSel){
        await db.post("turnos",{fecha,hora:h,tipo:"ocasional",estado:"reservado",cliente_id:clienteId,precio:precioH(h),sena:0,saldo:precioH(h),notas:nota});
      }
      setPaso("confirmado");
    } catch(e){setMsg("Error al reservar. Intentá de nuevo.");}
    setSaving(false);
  };

  const abrirWsp = () => {
    const horasStr=slotsSel.map(h=>`${h}:00`).join(", ");
    const msg=encodeURIComponent(`Hola! Reservé en *${cfg.nombre_club}* para el *${fecha}*.\n\nHorarios: *${horasStr}hs*\nTotal: *${gs(totalSel)}*\n\nNombre: ${form.nombre}\nTeléfono: ${form.telefono}\n\nQuedo esperando confirmación. ¡Gracias!`);
    window.open(`https://wa.me/${ADMIN_TEL}?text=${msg}`,"_blank");
  };

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(160deg,${BR.dark},${BR.blue})`,color:"rgba(255,255,255,0.5)",fontFamily:"var(--font-sans)"}}>Cargando...</div>;

  const inpPortal = {width:"100%",padding:"12px 14px",border:"1px solid #1E3A7A",borderRadius:10,fontSize:15,color:"#fff",background:"#0D1830",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box"};

  return <div style={{minHeight:"100vh",background:"#081020",fontFamily:"var(--font-sans)"}}>
    {/* HEADER */}
    <div style={{background:`linear-gradient(160deg,${BR.dark},${BR.blue})`,boxShadow:"0 4px 24px rgba(0,0,0,0.4)"}}>
      <div style={{maxWidth:480,margin:"0 auto",padding:"18px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src={LOGO} alt="DEXON" onError={e=>{e.target.style.display="none";}} style={{height:40,objectFit:"contain"}}/>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{cfg.nombre_club}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:1.5,textTransform:"uppercase",marginTop:1}}>Tavapy · Alto Paraná</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>{gs(cfg.tarifa_base)}/hora</div>
            <div style={{fontSize:11,color:BR.coral,fontWeight:500,marginTop:2}}>Pico: {gs(cfg.tarifa_pico)}</div>
          </div>
        </div>
        <div style={{marginTop:14,padding:"10px 14px",background:"rgba(255,255,255,0.05)",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>📱</span>
          <div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>¿Consultas? Escribinos</div>
            <a href={`https://wa.me/${ADMIN_TEL}`} target="_blank" rel="noreferrer" style={{fontSize:13,color:"#25D366",fontWeight:500,textDecoration:"none"}}>WhatsApp DEXON PADEL →</a>
          </div>
        </div>
      </div>
    </div>

    <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px"}}>
      {paso==="lista"&&<>
        {/* Selector fecha */}
        <div style={{background:"#111E40",borderRadius:14,border:"1px solid #1E3070",padding:"16px 18px",marginBottom:12}}>
          <label style={{fontSize:12,color:TX.s,fontWeight:600,display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>¿Qué día querés jugar?</label>
          <input type="date" value={fecha} min={hoy()} onChange={e=>{setFecha(e.target.value);setSlotsSel([]);}} style={{...inpPortal,fontSize:16,fontWeight:500}}/>
        </div>

        {/* Clima */}
        {climaFecha&&<div style={{background:"#111E40",borderRadius:14,border:"1px solid #1E3070",padding:"14px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:38}}>{climaIcon(climaFecha.code)}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:TX.p}}>Pronóstico — Tavapy</div>
            <div style={{fontSize:13,color:TX.s,marginTop:3}}>{climaFecha.max}° máx · {climaFecha.min}° mín · {climaFecha.lluvia}% lluvia</div>
          </div>
          {climaFecha.lluvia>=60&&<Badge type="info">🌧 Posible lluvia</Badge>}
          {climaFecha.lluvia<30&&<Badge type="ok">☀️ Buen día</Badge>}
        </div>}

        {/* Horarios */}
        <div style={{background:"#111E40",borderRadius:14,border:"1px solid #1E3070",overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid #1E3070"}}>
            <div style={{fontSize:14,fontWeight:600,color:TX.p}}>Horarios disponibles</div>
            <div style={{fontSize:12,color:TX.s,marginTop:2}}>{libres.length} de {horasArr.length} turnos libres</div>
          </div>
          {libres.length===0&&<div style={{padding:"28px",textAlign:"center",color:TX.t,fontSize:13}}>No hay horarios disponibles para este día.</div>}
          {libres.map(h=>{
            const isPico=h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin;
            const selec=slotsSel.includes(h);
            return <div key={h} onClick={()=>toggleSlot(h)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:"1px solid #1A2B5A",cursor:"pointer",background:selec?"#1A3570":"#111E40"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:12,background:selec?BR.blueM:isPico?"rgba(216,90,48,0.2)":"#0D1830",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:selec?"#fff":isPico?BR.coral:TX.s}}>
                  {h}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:500,color:TX.p}}>{h}:00 — {h+1}:00 hs</div>
                  <div style={{fontSize:12,color:TX.s,marginTop:1}}>{isPico?"Horario pico 🔥":"Tarifa normal"}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:selec?"#7EAAFF":isPico?BR.coral:TX.p}}>{gs(precioH(h))}</div>
                {selec&&<div style={{fontSize:11,color:"#7EAAFF",marginTop:2}}>✓ Seleccionado</div>}
              </div>
            </div>;
          })}
        </div>

        {ocupados.length>0&&<div style={{background:"#0D1830",borderRadius:14,border:"1px solid #1A2B5A",overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"12px 18px",borderBottom:"1px solid #1A2B5A"}}>
            <div style={{fontSize:13,fontWeight:500,color:TX.t}}>No disponibles</div>
          </div>
          {ocupados.map(h=><div key={h} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 18px",borderBottom:"1px solid #0F1830",opacity:0.5}}>
            <div style={{fontSize:13,color:TX.t}}>{h}:00 — {h+1}:00 hs</div>
            <div style={{fontSize:12,color:TX.t,background:"#0A1020",padding:"3px 10px",borderRadius:100}}>Ocupado</div>
          </div>)}
        </div>}

        {slotsSel.length>0&&<>
          <div style={{background:"#111E40",borderRadius:12,padding:"12px 16px",marginBottom:12,border:"1px solid #2A3F7A"}}>
            <div style={{fontSize:12,color:TX.s,marginBottom:4}}>Seleccionados · {slotsSel.length}hs</div>
            <div style={{fontSize:14,fontWeight:600,color:TX.p}}>{slotsSel.map(h=>`${h}:00`).join(" · ")} hs</div>
            <div style={{fontSize:13,color:BR.coral,marginTop:4,fontWeight:500}}>Total: {gs(totalSel)}</div>
            <div style={{fontSize:11,color:TX.t,marginTop:4}}>Tocá horas consecutivas para extender tu turno</div>
          </div>
          <button onClick={()=>setPaso("datos")} style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${BR.coral},${BR.coralD})`,color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
            Reservar {slotsSel.length} hora{slotsSel.length>1?"s":""} →
          </button>
        </>}
      </>}

      {paso==="datos"&&<>
        <button onClick={()=>{setPaso("lista");setMsg("");}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:TX.s,marginBottom:16,fontFamily:"var(--font-sans)"}}>← Volver</button>
        <div style={{background:"#111E40",borderRadius:14,border:"1px solid #1E3070",padding:"22px"}}>
          <div style={{fontSize:16,fontWeight:600,color:TX.p,marginBottom:16}}>Confirmá tu reserva</div>
          <div style={{background:`linear-gradient(135deg,${BR.blue},${BR.blueM})`,borderRadius:12,padding:"14px 18px",marginBottom:20}}>
            <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{fecha} · {slotsSel.map(h=>`${h}:00`).join(" — ")} hs</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:4}}>{slotsSel.length} hora{slotsSel.length>1?"s":""} · Total: {gs(totalSel)} · Se abona al llegar</div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,color:TX.s,fontWeight:600,display:"block",marginBottom:6}}>Nombre completo</label>
            <input type="text" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} style={inpPortal} placeholder="Tu nombre y apellido"/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,color:TX.s,fontWeight:600,display:"block",marginBottom:6}}>Teléfono</label>
            <input type="tel" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} style={inpPortal} placeholder="0981-123456"/>
          </div>
          {msg&&<div style={{background:"#2A0A0A",color:"#F58282",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:14}}>{msg}</div>}
          <button onClick={reservar} disabled={saving} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${BR.coral},${BR.coralD})`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
            {saving?"Reservando...":"Confirmar reserva"}
          </button>
        </div>
      </>}

      {paso==="confirmado"&&<div style={{background:"#111E40",borderRadius:14,border:"1px solid #1E3070",padding:"36px 24px",textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:"#0D2E1A",border:"2px solid #1A5A30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px"}}>✅</div>
        <div style={{fontSize:22,fontWeight:700,color:TX.p,marginBottom:8}}>¡Reserva registrada!</div>
        <div style={{fontSize:14,color:TX.s,marginBottom:20,lineHeight:1.7}}>Tu turno fue registrado para el <strong style={{color:TX.p}}>{fecha}</strong> a las <strong style={{color:TX.p}}>{slotsSel.map(h=>`${h}:00`).join(" — ")}hs</strong>.</div>
        <div style={{background:"#0D1830",borderRadius:12,padding:"16px",marginBottom:20,textAlign:"left",border:"1px solid #1A2B5A"}}>
          <div style={{fontSize:13,color:TX.s,lineHeight:2.2}}>
            <div>📍 {cfg.nombre_club} — Tavapy, Alto Paraná</div>
            <div>💰 {gs(totalSel)} · {slotsSel.length} hora{slotsSel.length>1?"s":""} — se abona al llegar</div>
          </div>
        </div>
        <div style={{background:"#0D2E1A",borderRadius:12,padding:"14px 16px",marginBottom:20,border:"1px solid #1A5A30",textAlign:"left"}}>
          <div style={{fontSize:13,fontWeight:600,color:"#7ADDA8",marginBottom:6}}>⚠️ Importante</div>
          <div style={{fontSize:13,color:"#5ABDA8",lineHeight:1.6}}>Para asegurar tu turno, confirmá por WhatsApp tocando el botón de abajo.</div>
        </div>
        <button onClick={abrirWsp} style={{width:"100%",padding:"15px",background:"#25D366",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)",marginBottom:10}}>
          📱 Confirmar por WhatsApp
        </button>
        <button onClick={()=>{setPaso("lista");setSlotsSel([]);setForm({nombre:"",telefono:""}); }} style={{width:"100%",padding:"11px",background:"transparent",color:TX.s,border:"1px solid #1E3070",borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
          Hacer otra reserva
        </button>
      </div>}
    </div>
  </div>;
};

// ── APP PRINCIPAL ──
export default function App() {
  const esPortal = window.location.pathname.startsWith("/reservar");
  if(esPortal) return <PortalCliente/>;

  const [tab,setTab] = useState("hoy");
  const [session,setSession] = useState(()=>{
    const tk=localStorage.getItem("dx_token");
    const u=localStorage.getItem("dx_user");
    return tk?{token:tk,user:u?JSON.parse(u):null}:null;
  });
  const [data,setData] = useState({turnos:[],clientes:[],abonos:[],planes:[],instructores:[],caja:[],stock:[],espera:[],abono_turnos:[],cfg:{id:1,nombre_club:"DEXON PADEL",hora_inicio:10,hora_fin:24,tarifa_base:80000,tarifa_pico:100000,hora_pico_inicio:19,hora_pico_fin:22}});
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [semOff,setSemOff] = useState(0);
  const [modal,setModal] = useState(null);
  const [dlg,setDlg] = useState(null);
  const [form,setForm] = useState({});
  const [clima,setClima] = useState(null);
  const tk = session?.token;

  const load = useCallback(async()=>{
    if(!tk) return; setLoading(true);
    try {
      const [tu,cl,ab,pl,ins,ca,st,es,cf,at] = await Promise.all([
        db.get("turnos","order=fecha.asc,hora.asc",tk),
        db.get("clientes","order=nombre.asc",tk),
        db.get("abonos","order=fecha_vencimiento.asc",tk),
        db.get("planes","order=precio.asc",tk),
        db.get("instructores","order=nombre.asc",tk),
        db.get("caja","order=fecha.desc,id.desc",tk),
        db.get("stock","order=nombre.asc",tk),
        db.get("espera","order=fecha.asc,hora.asc",tk),
        db.get("config","limit=1",tk),
        db.get("abono_turnos","order=abono_id.asc",tk),
      ]);
      setData(prev=>({turnos:tu||[],clientes:cl||[],abonos:ab||[],planes:pl||[],instructores:ins||[],caja:ca||[],stock:st||[],espera:es||[],abono_turnos:at||[],cfg:cf?.[0]||prev.cfg}));
    } catch(e){console.error(e);}
    setLoading(false);
  },[tk]);

  useEffect(()=>{if(tk)load();},[load,tk]);

  useEffect(()=>{
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-25.65&longitude=-54.77&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FAsuncion&forecast_days=5")
      .then(r=>r.json()).then(d=>{
        const dias=d.daily.time.map((f,i)=>({fecha:f,max:Math.round(d.daily.temperature_2m_max[i]),min:Math.round(d.daily.temperature_2m_min[i]),lluvia:d.daily.precipitation_probability_max[i],code:d.daily.weathercode[i]}));
        setClima(dias);
      }).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!session) return;
    let timer=setTimeout(doLogout,15*60*1000);
    const reset=()=>{clearTimeout(timer);timer=setTimeout(doLogout,15*60*1000);};
    const evs=["mousedown","keydown","touchstart","scroll"];
    evs.forEach(e=>window.addEventListener(e,reset));
    return()=>{clearTimeout(timer);evs.forEach(e=>window.removeEventListener(e,reset));};
  },[session]);

  const doLogout = async()=>{
    if(session?.token) await auth.logout(session.token);
    localStorage.removeItem("dx_token");
    localStorage.removeItem("dx_user");
    setSession(null);
  };

  if(!session) return <Login onLogin={(token,user)=>setSession({token,user})}/>;

  const {turnos,clientes,abonos,planes,instructores,caja,stock,abono_turnos,cfg} = data;
  const horas = Array.from({length:cfg.hora_fin-cfg.hora_inicio},(_,i)=>cfg.hora_inicio+i);
  const cById = id=>clientes.find(c=>c.id===id);
  const pById = id=>planes.find(p=>p.id===id);
  const iById = id=>instructores.find(i=>i.id===id);
  const sf = k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const openM = (name,f={})=>{setForm(f);setModal(name);};
  const closeM = ()=>{setModal(null);setForm({});};
  const precioTurno = h=>h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin?cfg.tarifa_pico:cfg.tarifa_base;
  const climaIcon = code=>{if(!code&&code!==0)return"🌤";if(code===0)return"☀️";if(code<=2)return"⛅";if(code<=48)return"☁️";if(code<=67)return"🌧️";return"⛈️";};

  const getSemana = ()=>{
    const h=new Date();const l=new Date(h);
    l.setDate(h.getDate()-((h.getDay()+6)%7)+semOff*7);
    return Array.from({length:7},(_,i)=>{const d=new Date(l);d.setDate(l.getDate()+i);return d;});
  };

  const turnosAbonados = ()=>{
    const dias=getSemana();const gen=[];
    abonos.filter(a=>a.estado==="activo").forEach(ab=>{
      const slots=abono_turnos.filter(at=>at.abono_id===ab.id);
      dias.forEach(d=>{
        slots.forEach(s=>{
          if(s.dia===d.getDay()){
            const fs=fmtD(d);
            if(!turnos.find(t=>t.fecha===fs&&t.hora===s.hora&&t.estado!=="cancelado"))
              gen.push({fecha:fs,hora:s.hora,tipo:"abono",estado:"reservado",cliente_id:ab.cliente_id,abono_id:ab.id,_gen:true});
          }
        });
      });
    });
    return gen;
  };

  // ── ACCIONES ──
  const guardarTurno = async()=>{
    if(!form.cliente_id||!form.fecha||form.hora===undefined)return;
    if(turnos.find(t=>t.fecha===form.fecha&&t.hora===Number(form.hora)&&t.estado!=="cancelado")){alert("Ese horario ya está ocupado.");return;}
    setSaving(true);
    try {
      const precio=form.tipo==="clase"?Number(form.precio_clase||0):precioTurno(Number(form.hora));
      const sena=Number(form.sena||0);
      const[t]=await db.post("turnos",{fecha:form.fecha,hora:Number(form.hora),tipo:form.tipo||"ocasional",estado:"reservado",cliente_id:Number(form.cliente_id),instructor_id:form.instructor_id?Number(form.instructor_id):null,precio,sena,saldo:precio-sena,notas:form.notas||""},tk);
      if(sena>0)await db.post("caja",{descripcion:`Seña - ${cById(Number(form.cliente_id))?.nombre||"?"}`,tipo:"ingreso",categoria:"reserva",monto:sena,fecha:form.fecha,turno_id:t.id},tk);
      await load();closeM();
      const c=cById(Number(form.cliente_id));
      if(c?.telefono){const msg=`¡Hola ${c.nombre}! 🎾\nTu reserva en *${cfg.nombre_club}* está confirmada:\n📅 *${form.fecha}* a las *${Number(form.hora)}:00hs*\n💰 *${gs(precio)}*\n¡Te esperamos!`;setDlg({type:"wsp",cliente:c,msg});}
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const confirmarTurno = async t=>{
    setSaving(true);
    try{const saldo=t.precio-(t.sena||0);await db.patch("turnos",t.id,{estado:"confirmado",cobrado:true,saldo:0},tk);if(saldo>0)await db.post("caja",{descripcion:`Reserva - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"ingreso",categoria:t.tipo==="clase"?"clase":"reserva",monto:saldo,fecha:t.fecha,turno_id:t.id},tk);await load();setDlg(null);}
    catch(e){alert(e.message);}
    setSaving(false);
  };
  const cancelarTurno = async t=>{
    setSaving(true);
    try{await db.patch("turnos",t.id,{estado:"cancelado"},tk);if(t.sena>0)await db.post("caja",{descripcion:`Dev. seña - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"egreso",categoria:"reserva",monto:t.sena,fecha:hoy(),turno_id:t.id},tk);await load();setDlg(null);closeM();}
    catch(e){alert(e.message);}
    setSaving(false);
  };
  const noShow = async t=>{setSaving(true);try{await db.patch("turnos",t.id,{estado:"no_show"},tk);await load();setDlg(null);closeM();}catch(e){alert(e.message);}setSaving(false);};
  const guardarCliente = async()=>{
    if(!form.nombre?.trim())return;setSaving(true);
    try{const p={nombre:form.nombre.trim(),telefono:form.telefono||"",nivel:form.nivel||"intermedio",notas:form.notas||""};if(form.id)await db.patch("clientes",form.id,p,tk);else await db.post("clientes",p,tk);await load();closeM();}
    catch(e){alert(e.message);}setSaving(false);
  };
  const eliminarCliente = async id=>{setSaving(true);try{await db.del("clientes",id,tk);await load();setDlg(null);closeM();}catch(e){alert(e.message);}setSaving(false);};
  const guardarAbono = async()=>{
    if(!form.cliente_id||!form.plan_id||!form.fecha_inicio)return;
    if(!form.slots||form.slots.length===0){alert("Agregá al menos un turno fijo.");return;}
    setSaving(true);
    try{const plan=pById(Number(form.plan_id));const ini=new Date(form.fecha_inicio);const venc=new Date(ini);venc.setMonth(venc.getMonth()+1);const precio=Number(form.precio_acordado||plan?.precio||0);const[ab]=await db.post("abonos",{cliente_id:Number(form.cliente_id),plan_id:Number(form.plan_id),precio_acordado:precio,fecha_inicio:fmtD(ini),fecha_vencimiento:fmtD(venc),estado:"activo",turno_hora:null},tk);for(const s of form.slots)await db.post("abono_turnos",{abono_id:ab.id,dia:Number(s.dia),hora:Number(s.hora)},tk);await db.post("caja",{descripcion:`Abono ${plan?.nombre||""} - ${cById(Number(form.cliente_id))?.nombre||"?"}`,tipo:"ingreso",categoria:"abono",monto:precio,fecha:fmtD(ini),abono_id:ab.id},tk);await load();closeM();}
    catch(e){alert(e.message);}setSaving(false);
  };
  const cancelarAbono = async id=>{setSaving(true);try{await db.patch("abonos",id,{estado:"cancelado"},tk);await load();setDlg(null);}catch(e){alert(e.message);}setSaving(false);};
  const guardarPlan = async()=>{if(!form.nombre||!form.horas_semana||!form.precio)return;setSaving(true);try{if(form.id)await db.patch("planes",form.id,{nombre:form.nombre,horas_semana:Number(form.horas_semana),precio:Number(form.precio)},tk);else await db.post("planes",{nombre:form.nombre,horas_semana:Number(form.horas_semana),precio:Number(form.precio)},tk);await load();closeM();}catch(e){alert(e.message);}setSaving(false);};
  const guardarInstructor = async()=>{if(!form.nombre?.trim())return;setSaving(true);try{await db.post("instructores",{nombre:form.nombre.trim(),telefono:form.telefono||"",tarifa_clase:Number(form.tarifa_clase||0)},tk);await load();closeM();}catch(e){alert(e.message);}setSaving(false);};
  const guardarMovCaja = async()=>{if(!form.descripcion||!form.monto)return;setSaving(true);try{await db.post("caja",{descripcion:form.descripcion,tipo:form.tipo||"egreso",categoria:form.categoria||"gasto",monto:Number(form.monto),fecha:form.fecha||hoy()},tk);await load();closeM();}catch(e){alert(e.message);}setSaving(false);};
  const eliminarMovCaja = async id=>{setSaving(true);try{await db.del("caja",id,tk);await load();setDlg(null);}catch(e){alert(e.message);}setSaving(false);};
  const guardarStock = async()=>{if(!form.nombre?.trim()||form.cantidad===undefined)return;setSaving(true);try{const p={nombre:form.nombre,categoria:form.categoria||"general",cantidad:Number(form.cantidad),minimo:Number(form.minimo||0),precio_venta:Number(form.precio_venta||0),precio_costo:Number(form.precio_costo||0)};if(form.id)await db.patch("stock",form.id,p,tk);else await db.post("stock",p,tk);await load();closeM();}catch(e){alert(e.message);}setSaving(false);};
  const moverStock = async()=>{if(!form.stock_id||!form.cantidad_mov)return;setSaving(true);try{const item=stock.find(s=>s.id===Number(form.stock_id));if(!item)return;const delta=form.tipo_mov==="entrada"?Number(form.cantidad_mov):-Number(form.cantidad_mov);await db.patch("stock",item.id,{cantidad:Math.max(0,item.cantidad+delta)},tk);await db.post("stock_movimientos",{stock_id:item.id,tipo:form.tipo_mov,cantidad:Number(form.cantidad_mov),motivo:form.motivo||"",fecha:hoy()},tk);if(form.tipo_mov==="salida"&&item.precio_venta>0)await db.post("caja",{descripcion:`Venta - ${item.nombre} x${form.cantidad_mov}`,tipo:"ingreso",categoria:"stock",monto:item.precio_venta*Number(form.cantidad_mov),fecha:hoy()},tk);if(form.tipo_mov==="entrada"&&item.precio_costo>0)await db.post("caja",{descripcion:`Compra - ${item.nombre} x${form.cantidad_mov}`,tipo:"egreso",categoria:"stock",monto:item.precio_costo*Number(form.cantidad_mov),fecha:hoy()},tk);await load();closeM();}catch(e){alert(e.message);}setSaving(false);};
  const guardarConfig = async()=>{setSaving(true);try{await db.patch("config",cfg.id,{nombre_club:form.nombre_club,hora_inicio:Number(form.hora_inicio),hora_fin:Number(form.hora_fin),tarifa_base:Number(form.tarifa_base),tarifa_pico:Number(form.tarifa_pico),hora_pico_inicio:Number(form.hora_pico_inicio),hora_pico_fin:Number(form.hora_pico_fin)},tk);await load();closeM();}catch(e){alert(e.message);}setSaving(false);};

  const enviarWsp = (tel,msg)=>{const t=(tel||"").replace(/\D/g,"");const n=t.startsWith("595")?t:t.startsWith("0")?"595"+t.slice(1):"595"+t;window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`,"_blank");};

  const TABS=[{id:"hoy",l:"Hoy"},{id:"agenda",l:"Agenda"},{id:"clientes",l:"Clientes"},{id:"abonados",l:"Abonados"},{id:"caja",l:"Caja"},{id:"stock",l:"Stock"},{id:"stats",l:"Stats"},{id:"config",l:"Config"}];

  // ── VISTAS ADMIN ──
  const Hoy=()=>{
    const h=hoy();const mes=h.slice(0,7);
    const tHoy=turnos.filter(t=>t.fecha===h&&t.estado!=="cancelado").sort((a,b)=>a.hora-b.hora);
    const ingH=caja.filter(m=>m.fecha===h&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    const pendCobro=tHoy.filter(t=>t.estado==="reservado"&&t.tipo!=="abono");
    const vencidos=abonos.filter(a=>a.fecha_vencimiento<h&&a.estado==="activo");
    const stockBajo=stock.filter(s=>s.minimo>0&&s.cantidad<=s.minimo);
    return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div><div style={{fontSize:22,fontWeight:500,color:TX.p}}>{cfg.nombre_club}</div><div style={{fontSize:13,color:TX.s,marginTop:2}}>{new Date().toLocaleDateString("es-PY",{weekday:"long",day:"numeric",month:"long"})}</div></div>
        <Btn v="primary" onClick={()=>openM("turno",{fecha:h,hora:cfg.hora_inicio,tipo:"ocasional"})}>+ Reservar</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[{l:"Ingresos hoy",v:gs(ingH)},{l:"Ingresos mes",v:gs(ingM)},{l:"Balance mes",v:gs(ingM-egrM),c:ingM-egrM>=0?BR.ok:BR.danger},{l:"Turnos hoy",v:tHoy.length,sub:pendCobro.length>0?`${pendCobro.length} pendientes`:null}].map((m,i)=>
          <div key={i} style={metric}><div style={{fontSize:12,color:TX.s,marginBottom:6}}>{m.l}</div><div style={{fontSize:21,fontWeight:500,color:m.c||TX.p}}>{m.v}</div>{m.sub&&<div style={{fontSize:11,color:"#F5C07A",marginTop:3}}>{m.sub}</div>}</div>
        )}
      </div>
      {clima&&<div style={{...card,marginBottom:16}}>
        <div style={{fontWeight:500,fontSize:13,marginBottom:12,color:TX.s}}>Pronóstico — Alto Paraná</div>
        <div style={{display:"flex",gap:8,overflowX:"auto"}}>
          {clima.map((d,i)=>{const esH=d.fecha===h;const ll=d.lluvia>=60;return<div key={i} style={{flex:1,minWidth:70,textAlign:"center",padding:"10px 8px",borderRadius:10,background:esH?"#1A3570":ll?"#0A1A3A":"#0D1830",border:esH?`1px solid ${BR.coral}`:"1px solid #1A2B5A"}}>
            <div style={{fontSize:11,color:TX.s,marginBottom:4}}>{esH?"Hoy":DIAS[new Date(d.fecha+"T12:00:00").getDay()]}</div>
            <div style={{fontSize:22,marginBottom:4}}>{climaIcon(d.code)}</div>
            <div style={{fontSize:14,fontWeight:500,color:TX.p}}>{d.max}°</div>
            <div style={{fontSize:11,color:TX.s}}>{d.min}°</div>
            <div style={{fontSize:11,marginTop:4,color:ll?BR.info:BR.ok,fontWeight:500}}>{d.lluvia}%💧</div>
          </div>;})}
        </div>
      </div>}
      {(vencidos.length>0||stockBajo.length>0)&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {vencidos.length>0&&<div style={{flex:1,background:"#2A1A0A",borderRadius:10,padding:"9px 14px",fontSize:13,color:"#F5C07A",border:"1px solid #5A3010"}}>{vencidos.length} abono{vencidos.length>1?"s":""} vencido{vencidos.length>1?"s":""}</div>}
        {stockBajo.length>0&&<div style={{flex:1,background:"#2A0A0A",borderRadius:10,padding:"9px 14px",fontSize:13,color:"#F58282",border:"1px solid #5A1010"}}>{stockBajo.map(s=>s.nombre).join(", ")} — stock bajo</div>}
      </div>}
      <div style={card}>
        <div style={{fontWeight:500,marginBottom:14,fontSize:14,color:TX.p}}>Turnos de hoy</div>
        {tHoy.length===0?<Empty t="Sin turnos para hoy"/>:<div style={{display:"grid",gap:8}}>
          {tHoy.map(t=>{const c=cById(t.cliente_id);const ins=iById(t.instructor_id);return<div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:"#0D1830",border:"1px solid #1A2B5A",cursor:"pointer"}} onClick={()=>openM("verTurno",{...t,cliente:c,instructor:ins})}>
            <div style={{fontSize:16,fontWeight:500,color:BR.coral,minWidth:44}}>{t.hora}:00</div>
            <Avatar nombre={c?.nombre} size={36}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:13,color:TX.p}}>{c?.nombre||"?"}</div><div style={{fontSize:11,color:TX.s,marginTop:2,display:"flex",gap:6,flexWrap:"wrap"}}>{tipoBadge(t.tipo)} {estadoBadge(t.estado)}{ins&&<span>· {ins.nombre}</span>}{t.sena>0&&<span style={{color:BR.ok}}>· Seña: {gs(t.sena)}</span>}</div></div>
            {t.estado==="reservado"&&<div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
              <Btn v="success" sm onClick={()=>setDlg({type:"confirmar",t})}>✓ Cobrar {gs(t.precio-(t.sena||0))}</Btn>
              <Btn v="danger" sm onClick={()=>setDlg({type:"cancelar",t})}>✗</Btn>
            </div>}
          </div>;})}
        </div>}
      </div>
    </div>;
  };

  const Agenda=()=>{
    const dias=getSemana();const h=hoy();const extra=turnosAbonados();const all=[...turnos,...extra];
    return<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:500,color:TX.p}}>{dias[0].getDate()} {MESES[dias[0].getMonth()]} — {dias[6].getDate()} {MESES[dias[6].getMonth()]}</div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>setSemOff(o=>o-1)}>← Ant.</Btn><Btn onClick={()=>setSemOff(0)}>Hoy</Btn><Btn onClick={()=>setSemOff(o=>o+1)}>Sig. →</Btn>
          <Btn v="primary" onClick={()=>openM("turno",{fecha:h,hora:cfg.hora_inicio,tipo:"ocasional"})}>+ Reservar</Btn>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:`52px repeat(7,1fr)`,gap:1,background:"#1A2B5A",borderRadius:10,overflow:"hidden",minWidth:600}}>
          <div style={{background:"#0D1830"}}/>
          {dias.map((d,i)=>{const isH=fmtD(d)===h;const cnt=all.filter(t=>t.fecha===fmtD(d)&&t.estado!=="cancelado").length;return<div key={i} style={{background:isH?"#1A3570":"#0D1830",padding:"10px 4px",textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:500,color:isH?BR.coral:TX.s}}>{DIAS[d.getDay()]}</div>
            <div style={{fontSize:16,fontWeight:500,color:isH?BR.coral:TX.p,margin:"2px 0"}}>{d.getDate()}</div>
            {cnt>0?<div style={{fontSize:10,color:BR.coral,fontWeight:500}}>{cnt}t</div>:<div style={{height:14}}/>}
          </div>;})}
          {horas.map(h=><>
            <div key={`t${h}`} style={{background:"#0D1830",padding:"0 10px",display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:11,color:TX.t,minHeight:40}}>{h}:00</div>
            {dias.map((d,di)=>{const fs=fmtD(d);const t=all.find(t=>t.fecha===fs&&t.hora===h&&t.estado!=="cancelado");const c=t?cById(t.cliente_id):null;const isPico=h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin;return<div key={`${h}-${di}`} onClick={()=>t?openM("verTurno",{...t,cliente:c,instructor:iById(t.instructor_id)}):openM("turno",{fecha:fs,hora:h,tipo:"ocasional"})} style={{background:t?(t.tipo==="abono"?"#1A0A3A":t.tipo==="clase"?"#0A1A3A":"#3A1A0A"):(isPico?"rgba(216,90,48,0.08)":"#111E40"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",minHeight:40}}>
              {t&&<span style={{fontSize:11,fontWeight:500,color:t.tipo==="abono"?"#B8A0F5":t.tipo==="clase"?"#7EAAFF":"#F5A882",background:t.tipo==="abono"?"#2A1050":t.tipo==="clase"?"#0A1A5A":"#5A2A0A",borderRadius:5,padding:"2px 7px",maxWidth:"92%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c?.nombre?.split(" ")[0]||"?"}</span>}
            </div>;})}
          </>)}
        </div>
      </div>
      <div style={{display:"flex",gap:12,marginTop:10,fontSize:12,color:TX.t}}>
        <span><span style={{width:10,height:10,borderRadius:2,background:"#5A2A0A",display:"inline-block",marginRight:4}}/>Ocasional</span>
        <span><span style={{width:10,height:10,borderRadius:2,background:"#2A1050",display:"inline-block",marginRight:4}}/>Abonado</span>
        <span><span style={{width:10,height:10,borderRadius:2,background:"#0A1A5A",display:"inline-block",marginRight:4}}/>Clase</span>
      </div>
    </div>;
  };

  const Clientes=()=>{
    const [q,setQ]=useState("");
    const lista=clientes.filter(c=>c.nombre.toLowerCase().includes(q.toLowerCase()));
    return<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:500,color:TX.p}}>Clientes <span style={{fontSize:13,color:TX.s,fontWeight:400}}>({clientes.length})</span></span>
        <div style={{display:"flex",gap:8}}>
          <input style={{...inp,width:200}} placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)}/>
          <Btn v="primary" onClick={()=>openM("cliente",{nivel:"intermedio"})}>+ Agregar</Btn>
        </div>
      </div>
      <div style={{display:"grid",gap:8}}>
        {lista.map(c=>{const ab=abonos.find(a=>a.cliente_id===c.id&&a.estado==="activo");const resC=turnos.filter(t=>t.cliente_id===c.id).length;return<div key={c.id} style={{...card,display:"flex",alignItems:"center",gap:14,padding:"12px 16px",cursor:"pointer"}} onClick={()=>openM("cliente",{...c})}>
          <Avatar nombre={c.nombre} size={40}/>
          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,color:TX.p}}>{c.nombre}</div><div style={{fontSize:12,color:TX.s,marginTop:2}}>{c.telefono||"Sin teléfono"} · {resC} turnos · {c.nivel}</div>{c.notas&&<div style={{fontSize:11,color:TX.t,marginTop:2}}>{c.notas}</div>}</div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
            {ab?<Badge type="purple">{pById(ab.plan_id)?.nombre||"Abonado"}</Badge>:<Badge type="gray">Ocasional</Badge>}
            {c.deuda>0&&<Badge type="danger">Debe {gs(c.deuda)}</Badge>}
            <Btn sm v="ghost" onClick={()=>openM("turno",{fecha:hoy(),hora:cfg.hora_inicio,tipo:"ocasional",cliente_id:c.id})}>Reservar</Btn>
            {!ab&&<Btn sm v="ghost" onClick={()=>openM("abono",{cliente_id:c.id,fecha_inicio:hoy(),slots:[]})}>Abonar</Btn>}
          </div>
        </div>;})}
      </div>
    </div>;
  };

  const Abonados=()=>{
    const h=hoy();
    const diasAbono=ab=>{const slots=abono_turnos.filter(at=>at.abono_id===ab.id);return slots.length===0?"Sin turno fijo":slots.map(s=>`${DIAS_FULL[s.dia]} ${s.hora}:00`).join(" · ");};
    const venc=abonos.filter(a=>a.fecha_vencimiento<h&&a.estado==="activo");
    const vig=abonos.filter(a=>a.fecha_vencimiento>=h&&a.estado==="activo");
    return<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:500,color:TX.p}}>Abonados</span>
        <div style={{display:"flex",gap:8}}><Btn v="ghost" onClick={()=>openM("plan",{})}>Gestionar planes</Btn><Btn v="primary" onClick={()=>openM("abono",{fecha_inicio:hoy(),slots:[]})}>+ Nuevo abono</Btn></div>
      </div>
      {venc.length>0&&<div style={{background:"#2A1A0A",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#F5C07A",border:"1px solid #5A3010",marginBottom:14}}>{venc.length} abono{venc.length>1?"s":""} vencido{venc.length>1?"s":""}</div>}
      <div style={{display:"grid",gap:8}}>
        {[...venc,...vig].map(ab=>{const c=cById(ab.cliente_id);const pl=pById(ab.plan_id);const v=ab.fecha_vencimiento<h;return<div key={ab.id} style={{...card,padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Avatar nombre={c?.nombre} size={40}/>
            <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14,color:TX.p}}>{c?.nombre||"?"}</div><div style={{fontSize:12,color:TX.s,marginTop:2}}>{pl?.nombre||"Plan"} · {gs(ab.precio_acordado)}/mes</div><div style={{fontSize:12,color:TX.t,marginTop:2}}>{diasAbono(ab)}</div></div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
              {v?<Badge type="danger">Vencido {ab.fecha_vencimiento?.slice(5)}</Badge>:<Badge type="ok">Hasta {ab.fecha_vencimiento?.slice(5)}</Badge>}
              <div style={{display:"flex",gap:6}}>
                {v&&<Btn v="primary" sm onClick={()=>openM("abono",{cliente_id:ab.cliente_id,plan_id:ab.plan_id,precio_acordado:ab.precio_acordado,fecha_inicio:hoy(),slots:abono_turnos.filter(at=>at.abono_id===ab.id).map(at=>({dia:at.dia,hora:at.hora}))})}>Renovar</Btn>}
                <Btn v="danger" sm onClick={()=>setDlg({type:"cancelarAbono",id:ab.id,nombre:c?.nombre})}>Cancelar</Btn>
              </div>
            </div>
          </div>
        </div>;})}
      </div>
    </div>;
  };

  const Caja=()=>{
    const h=hoy();const mes=h.slice(0,7);
    const ingH=caja.filter(m=>m.fecha===h&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    return<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <div style={metric}><div style={{fontSize:12,color:TX.s,marginBottom:6}}>Ingresos hoy</div><div style={{fontSize:21,fontWeight:500,color:TX.p}}>{gs(ingH)}</div></div>
        <div style={metric}><div style={{fontSize:12,color:TX.s,marginBottom:6}}>Ingresos mes</div><div style={{fontSize:21,fontWeight:500,color:TX.p}}>{gs(ingM)}</div></div>
        <div style={metric}><div style={{fontSize:12,color:TX.s,marginBottom:6}}>Balance mes</div><div style={{fontSize:21,fontWeight:500,color:ingM-egrM>=0?BR.ok:BR.danger}}>{gs(ingM-egrM)}</div></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:16,fontWeight:500,color:TX.p}}>Movimientos</span>
        <Btn v="primary" onClick={()=>openM("movCaja",{tipo:"egreso",categoria:"gasto",fecha:hoy()})}>+ Registrar gasto</Btn>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",borderRadius:10,overflow:"hidden"}}>
          <thead><tr>{["Fecha","Descripción","Categoría","Monto",""].map((h,i)=><th key={i} style={{textAlign:i>=3?"right":"left",padding:"10px 14px",fontSize:12,fontWeight:500,color:TX.s,borderBottom:"1px solid #1E3070",background:"#0D1830"}}>{h}</th>)}</tr></thead>
          <tbody>{caja.map(m=><tr key={m.id} style={{background:"#111E40"}}>
            <td style={{padding:"10px 14px",fontSize:13,borderBottom:"1px solid #1A2B5A",color:TX.s}}>{m.fecha.slice(8)}/{m.fecha.slice(5,7)}</td>
            <td style={{padding:"10px 14px",fontSize:13,borderBottom:"1px solid #1A2B5A",color:TX.p}}>{m.descripcion}</td>
            <td style={{padding:"10px 14px",fontSize:13,borderBottom:"1px solid #1A2B5A"}}><Badge type={m.tipo==="ingreso"?"ok":"danger"}>{m.categoria||m.tipo}</Badge></td>
            <td style={{padding:"10px 14px",fontSize:13,borderBottom:"1px solid #1A2B5A",textAlign:"right",fontWeight:500,color:m.tipo==="ingreso"?"#7ADDA8":"#F58282"}}>{m.tipo==="egreso"?"- ":""}{gs(m.monto)}</td>
            <td style={{padding:"10px 14px",fontSize:13,borderBottom:"1px solid #1A2B5A",textAlign:"right"}}><Btn sm v="danger" onClick={()=>setDlg({type:"eliminarMov",id:m.id,desc:m.descripcion})}>×</Btn></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>;
  };

  const Stock=()=>{
    const cats=[...new Set(stock.map(s=>s.categoria))];const bajo=stock.filter(s=>s.minimo>0&&s.cantidad<=s.minimo);
    return<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:500,color:TX.p}}>Stock</span>
        <div style={{display:"flex",gap:8}}><Btn v="ghost" onClick={()=>openM("moverStock",{tipo_mov:"salida"})}>Registrar movimiento</Btn><Btn v="primary" onClick={()=>openM("stockItem",{categoria:"pelotas",cantidad:"0",minimo:"0"})}>+ Producto</Btn></div>
      </div>
      {bajo.length>0&&<div style={{background:"#2A0A0A",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#F58282",border:"1px solid #5A1010",marginBottom:14}}>Stock bajo: {bajo.map(s=>s.nombre).join(", ")}</div>}
      {cats.map(cat=><div key={cat} style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:500,color:TX.t,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>{cat}</div>
        <div style={{display:"grid",gap:8}}>{stock.filter(s=>s.categoria===cat).map(s=>{const b=s.minimo>0&&s.cantidad<=s.minimo;return<div key={s.id} style={{...card,display:"flex",alignItems:"center",gap:14,padding:"12px 16px",cursor:"pointer"}} onClick={()=>openM("stockItem",{...s})}>
          <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14,color:TX.p}}>{s.nombre}</div>{(s.precio_venta>0||s.precio_costo>0)&&<div style={{fontSize:12,color:TX.s,marginTop:2}}>Venta: {gs(s.precio_venta)} · Costo: {gs(s.precio_costo)}</div>}</div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}><div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:500,color:b?"#F58282":TX.p}}>{s.cantidad}</div><div style={{fontSize:10,color:TX.t}}>unidades</div></div>{b&&<Badge type="danger">Bajo</Badge>}</div>
        </div>;})}
        </div>
      </div>)}
    </div>;
  };

  const Stats=()=>{
    const h=hoy();const mes=h.slice(0,7);
    const ult7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return fmtD(d);});
    const porDia=ult7.map(f=>({f,v:caja.filter(m=>m.fecha===f&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0)}));
    const maxV=Math.max(...porDia.map(d=>d.v),1);
    const ingM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const proy=Math.round(ingM/new Date().getDate()*30);
    const topC=clientes.map(c=>({...c,n:turnos.filter(t=>t.cliente_id===c.id&&t.estado==="confirmado").length})).sort((a,b)=>b.n-a.n).slice(0,5);
    const hPico=horas.map(h=>({h,n:turnos.filter(t=>t.hora===h&&t.estado!=="cancelado").length})).sort((a,b)=>b.n-a.n).slice(0,6);
    const maxH=Math.max(...hPico.map(x=>x.n),1);
    return<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[{l:"Ingresos mes",v:gs(ingM)},{l:"Proyección",v:gs(proy),c:BR.info},{l:"Total reservas",v:turnos.length},{l:"Abonados activos",v:abonos.filter(a=>a.estado==="activo"&&a.fecha_vencimiento>=h).length}].map((m,i)=>
          <div key={i} style={metric}><div style={{fontSize:12,color:TX.s,marginBottom:6}}>{m.l}</div><div style={{fontSize:21,fontWeight:500,color:m.c||TX.p}}>{m.v}</div></div>
        )}
      </div>
      <div style={{...card,marginBottom:12}}>
        <div style={{fontWeight:500,marginBottom:16,fontSize:14,color:TX.p}}>Ingresos últimos 7 días</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
          {porDia.map((d,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:"100%",background:d.v>0?BR.coral:"#1A2B5A",borderRadius:"4px 4px 0 0",height:Math.max(d.v/maxV*80,4)}}/>
            <div style={{fontSize:10,color:TX.t}}>{d.f.slice(8)}/{d.f.slice(5,7)}</div>
          </div>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={card}><div style={{fontWeight:500,marginBottom:14,fontSize:14,color:TX.p}}>Horarios pico</div>{hPico.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #1A2B5A"}}><span style={{fontSize:13,minWidth:48,color:TX.p}}>{x.h}:00</span><div style={{flex:1,height:6,background:"#1A2B5A",borderRadius:3,overflow:"hidden"}}><div style={{width:`${x.n/maxH*100}%`,height:"100%",background:BR.coral,borderRadius:3}}/></div><span style={{fontSize:12,color:TX.s,minWidth:16}}>{x.n}</span></div>)}</div>
        <div style={card}><div style={{fontWeight:500,marginBottom:14,fontSize:14,color:TX.p}}>Top clientes</div>{topC.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #1A2B5A"}}><Avatar nombre={c.nombre} size={28}/><span style={{flex:1,fontSize:13,color:TX.p}}>{c.nombre}</span><Badge type="info">{c.n} turnos</Badge></div>)}</div>
      </div>
    </div>;
  };

  const Config=()=><div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <span style={{fontSize:16,fontWeight:500,color:TX.p}}>Configuración</span>
      <div style={{display:"flex",gap:8}}><Btn v="ghost" onClick={()=>openM("instructor",{})}>+ Instructor</Btn><Btn v="primary" onClick={()=>openM("config",{...cfg})}>Editar</Btn></div>
    </div>
    <div style={{...card,display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:16}}>
      {[{l:"Club",v:cfg.nombre_club},{l:"Tarifa base",v:gs(cfg.tarifa_base)},{l:"Tarifa pico",v:gs(cfg.tarifa_pico)},{l:"Horario pico",v:`${cfg.hora_pico_inicio}:00 - ${cfg.hora_pico_fin}:00`},{l:"Apertura",v:`${cfg.hora_inicio}:00`},{l:"Cierre",v:`${cfg.hora_fin}:00`}].map((r,i)=>
        <div key={i}><div style={{fontSize:12,color:TX.s,marginBottom:4}}>{r.l}</div><div style={{fontSize:15,fontWeight:500,color:TX.p}}>{r.v}</div></div>
      )}
    </div>
    {instructores.length>0&&<div style={{...card,marginBottom:12}}><div style={{fontWeight:500,marginBottom:12,fontSize:14,color:TX.p}}>Instructores</div>{instructores.map(i=><div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1E3070",fontSize:13}}><span style={{fontWeight:500,color:TX.p}}>{i.nombre}</span><span style={{color:TX.s}}>{gs(i.tarifa_clase)}/clase</span></div>)}</div>}
    <div style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontWeight:500,fontSize:14,color:TX.p}}>Planes de abono</div><Btn sm v="ghost" onClick={()=>openM("plan",{})}>+ Plan</Btn></div>{planes.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1E3070",fontSize:13}}><div><span style={{fontWeight:500,color:TX.p}}>{p.nombre}</span><span style={{color:TX.s,marginLeft:8}}>{p.horas_semana}hs/sem</span></div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontWeight:500,color:TX.p}}>{gs(p.precio)}/mes</span><Btn sm v="ghost" onClick={()=>openM("plan",{...p})}>Editar</Btn></div></div>)}</div>
  </div>;

  const DiasSel=({value,onChange})=>{const sel=(value||"").split(",").filter(Boolean).map(Number);const toggle=d=>{const n=sel.includes(d)?sel.filter(x=>x!==d):[...sel,d];onChange(n.join(","));};return<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>{DIAS_FULL.map((nm,i)=><button key={i} type="button" onClick={()=>toggle(i)} style={{padding:"5px 11px",borderRadius:8,fontSize:12,cursor:"pointer",border:"1px solid",fontFamily:"var(--font-sans)",borderColor:sel.includes(i)?BR.coral:"#2A3F6B",background:sel.includes(i)?"#3A1A0A":"#0F1C3F",color:sel.includes(i)?BR.coral:TX.s}}>{nm.slice(0,3)}</button>)}</div>;};

  return <div style={{fontFamily:"var(--font-sans)",maxWidth:940,margin:"0 auto",background:"#081020",minHeight:"100vh"}}>
    <div style={{background:`linear-gradient(160deg,${BR.dark},${BR.blue})`,boxShadow:"0 2px 16px rgba(0,0,0,0.4)"}}>
      <div style={{display:"flex",alignItems:"center",padding:"0 8px"}}>
        <img src={LOGO} alt="DEXON" onError={e=>{e.target.style.display="none";}} style={{height:32,objectFit:"contain",marginRight:8,flexShrink:0,padding:"8px 0"}}/>
        <div style={{display:"flex",flex:1,overflowX:"auto"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"13px 14px",fontSize:13,border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",color:tab===t.id?"#fff":"rgba(255,255,255,0.45)",borderBottom:tab===t.id?`2px solid ${BR.coral}`:"2px solid transparent",fontWeight:tab===t.id?600:400,fontFamily:"var(--font-sans)"}}>{t.l}</button>)}
        </div>
        <button onClick={doLogout} style={{padding:"6px 12px",margin:"0 4px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"var(--font-sans)",background:"rgba(216,90,48,0.08)",color:BR.coral,border:`1px solid ${BR.coralD}`",whiteSpace:"nowrap",flexShrink:0}}>Salir</button>
      </div>
    </div>

    <div style={{padding:"18px 12px"}}>
      {loading?<div style={{textAlign:"center",padding:80,color:TX.s,fontSize:13}}>Cargando...</div>:(
        <>{tab==="hoy"&&<Hoy/>}{tab==="agenda"&&<Agenda/>}{tab==="clientes"&&<Clientes/>}{tab==="abonados"&&<Abonados/>}{tab==="caja"&&<Caja/>}{tab==="stock"&&<Stock/>}{tab==="stats"&&<Stats/>}{tab==="config"&&<Config/>}</>
      )}
    </div>

    {/* MODALES */}
    <Modal show={modal==="turno"} onClose={closeM} title="Nueva reserva">
      <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}><option value="">Seleccioná un cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel>
      <R2><Inp label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/><FG label="Hora"><select style={inp} value={form.hora??""} onChange={sf("hora")}>{horas.map(h=><option key={h} value={h}>{h}:00{h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin?" 🔥":""}</option>)}</select></FG></R2>
      <Sel label="Tipo" value={form.tipo||"ocasional"} onChange={sf("tipo")}><option value="ocasional">Ocasional</option><option value="clase">Clase con instructor</option><option value="bloqueado">Bloquear horario</option></Sel>
      {form.tipo==="clase"&&<><Sel label="Instructor" value={form.instructor_id||""} onChange={sf("instructor_id")}><option value="">Sin instructor</option>{instructores.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}</Sel><Inp label="Precio clase (Gs)" type="number" value={form.precio_clase||""} onChange={sf("precio_clase")}/></>}
      {form.tipo==="ocasional"&&<><div style={{background:"#0D1830",borderRadius:8,padding:"10px 12px",fontSize:13,marginBottom:14,color:TX.s}}>Precio: <strong style={{color:TX.p}}>{gs(precioTurno(Number(form.hora||cfg.hora_inicio)))}</strong>{Number(form.hora)>=cfg.hora_pico_inicio&&Number(form.hora)<cfg.hora_pico_fin&&<span style={{color:BR.coral}}> (pico)</span>}</div><Inp label="Seña (Gs) — opcional" type="number" value={form.sena||""} onChange={sf("sena")}/></>}
      <Inp label="Notas" type="text" value={form.notas||""} onChange={sf("notas")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarTurno} disabled={saving}>{saving?"Guardando...":"Guardar reserva"}</Btn></div>
    </Modal>

    <Modal show={modal==="verTurno"} onClose={closeM} title="Detalle del turno">
      {form.cliente&&<><div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}><Avatar nombre={form.cliente.nombre} size={48}/><div><div style={{fontSize:16,fontWeight:500,color:TX.p}}>{form.cliente.nombre}</div><div style={{fontSize:13,color:TX.s}}>{form.cliente.telefono}</div></div></div>
      <div style={{...metric,marginBottom:14,display:"grid",gap:8}}>
        {[["Fecha/Hora",`${form.fecha} · ${form.hora}:00hs`],["Tipo",tipoBadge(form.tipo)],["Estado",estadoBadge(form.estado)],["Precio",gs(form.precio)],form.sena>0&&["Seña",<span style={{color:"#7ADDA8"}}>{gs(form.sena)}</span>],form.sena>0&&["Saldo",<strong style={{color:TX.p}}>{gs(form.precio-(form.sena||0))}</strong>],form.instructor&&["Instructor",form.instructor.nombre],form.notas&&["Notas",form.notas]].filter(Boolean).map(([k,v],i)=>
          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:TX.s}}>{k}</span><span style={{color:TX.p}}>{v}</span></div>
        )}
      </div>
      <Div/>
      {form.estado==="reservado"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <Btn v="success" onClick={()=>{closeM();setDlg({type:"confirmar",t:form});}}>✓ Cobrar y confirmar {gs(form.precio-(form.sena||0))}</Btn>
        <Btn v="ghost" onClick={()=>{closeM();setDlg({type:"noshow",t:form});}}>Marcar como no show</Btn>
        <Btn v="danger" onClick={()=>{closeM();setDlg({type:"cancelar",t:form});}}>Cancelar turno</Btn>
      </div>}
      {form.estado==="confirmado"&&form.cliente?.telefono&&<Btn v="success" onClick={()=>enviarWsp(form.cliente.telefono,`¡Hola ${form.cliente.nombre}! Tu turno en ${cfg.nombre_club} del ${form.fecha} a las ${form.hora}:00hs fue confirmado. ¡Gracias!`)}>Enviar WhatsApp</Btn>}
      </>}
    </Modal>

    <Modal show={modal==="cliente"} onClose={closeM} title={form.id?"Editar cliente":"Nuevo cliente"}>
      <Inp label="Nombre completo" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
      <Inp label="Teléfono" type="text" value={form.telefono||""} onChange={sf("telefono")}/>
      <R2><Sel label="Nivel" value={form.nivel||"intermedio"} onChange={sf("nivel")}><option value="principiante">Principiante</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></Sel></R2>
      <Inp label="Notas" type="text" value={form.notas||""} onChange={sf("notas")}/>
      <Div/><div style={{display:"flex",justifyContent:"space-between"}}>
        {form.id&&<Btn v="danger" onClick={()=>setDlg({type:"eliminarCliente",id:form.id,nombre:form.nombre})}>Eliminar</Btn>}
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarCliente} disabled={saving}>{saving?"Guardando...":form.id?"Guardar cambios":"Agregar"}</Btn></div>
      </div>
    </Modal>

    <Modal show={modal==="abono"} onClose={closeM} title="Registrar abono">
      <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}><option value="">Seleccioná un cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel>
      <Sel label="Plan" value={form.plan_id||""} onChange={e=>{const p=pById(Number(e.target.value));setForm(f=>({...f,plan_id:e.target.value,precio_acordado:p?.precio||""}));}}><option value="">Seleccioná un plan</option>{planes.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.horas_semana}hs/sem — {gs(p.precio)}</option>)}</Sel>
      <Inp label="Precio acordado (Gs)" type="number" value={form.precio_acordado||""} onChange={sf("precio_acordado")}/>
      <Inp label="Fecha de inicio" type="date" value={form.fecha_inicio||""} onChange={sf("fecha_inicio")}/>
      <Div/>
      <div style={{marginBottom:14}}><label style={lbl}>Turnos fijos semanales</label>
        {(form.slots||[]).map((slot,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
          <select style={{...inp,flex:1}} value={slot.dia} onChange={e=>setForm(f=>({...f,slots:f.slots.map((s,j)=>j===i?{...s,dia:e.target.value}:s)}))}>{DIAS_FULL.map((d,j)=><option key={j} value={j}>{d}</option>)}</select>
          <select style={{...inp,flex:1}} value={slot.hora} onChange={e=>setForm(f=>({...f,slots:f.slots.map((s,j)=>j===i?{...s,hora:e.target.value}:s)}))}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select>
          <button type="button" onClick={()=>setForm(f=>({...f,slots:f.slots.filter((_,j)=>j!==i)}))} style={{border:"none",background:"#2A0A0A",color:"#F58282",borderRadius:6,padding:"6px 10px",cursor:"pointer"}}>×</button>
        </div>)}
        <button type="button" onClick={()=>setForm(f=>({...f,slots:[...(f.slots||[]),{dia:1,hora:cfg.hora_inicio}]}))} style={{border:`1px dashed ${BR.coral}`,background:"transparent",color:BR.coral,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"var(--font-sans)",fontSize:13,width:"100%",marginTop:4}}>+ Agregar turno</button>
      </div>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarAbono} disabled={saving}>{saving?"Guardando...":"Registrar abono"}</Btn></div>
    </Modal>

    <Modal show={modal==="plan"} onClose={closeM} title={form.id?"Editar plan":"Nuevo plan"}>
      <Inp label="Nombre" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
      <R2><Inp label="Horas por semana" type="number" value={form.horas_semana||""} onChange={sf("horas_semana")}/><Inp label="Precio mensual (Gs)" type="number" value={form.precio||""} onChange={sf("precio")}/></R2>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarPlan} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    <Modal show={modal==="instructor"} onClose={closeM} title="Nuevo instructor">
      <Inp label="Nombre" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
      <Inp label="Teléfono" type="text" value={form.telefono||""} onChange={sf("telefono")}/>
      <Inp label="Tarifa por clase (Gs)" type="number" value={form.tarifa_clase||""} onChange={sf("tarifa_clase")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarInstructor} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    <Modal show={modal==="movCaja"} onClose={closeM} title="Registrar movimiento">
      <Inp label="Descripción" type="text" value={form.descripcion||""} onChange={sf("descripcion")} autoFocus/>
      <R2><Inp label="Monto (Gs)" type="number" value={form.monto||""} onChange={sf("monto")}/><Sel label="Tipo" value={form.tipo||"egreso"} onChange={sf("tipo")}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></Sel></R2>
      <Sel label="Categoría" value={form.categoria||"gasto"} onChange={sf("categoria")}><option value="gasto">Gasto operativo</option><option value="stock">Stock</option><option value="otro">Otro</option></Sel>
      <Inp label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarMovCaja} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    <Modal show={modal==="stockItem"} onClose={closeM} title={form.id?"Editar producto":"Nuevo producto"}>
      <Inp label="Nombre" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
      <Sel label="Categoría" value={form.categoria||"general"} onChange={sf("categoria")}><option value="pelotas">Pelotas</option><option value="paletas">Paletas</option><option value="bebidas">Bebidas</option><option value="accesorios">Accesorios</option><option value="general">General</option></Sel>
      <R2><Inp label="Cantidad actual" type="number" value={form.cantidad??""} onChange={sf("cantidad")}/><Inp label="Stock mínimo" type="number" value={form.minimo??""} onChange={sf("minimo")}/></R2>
      <R2><Inp label="Precio venta (Gs)" type="number" value={form.precio_venta??""} onChange={sf("precio_venta")}/><Inp label="Precio costo (Gs)" type="number" value={form.precio_costo??""} onChange={sf("precio_costo")}/></R2>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarStock} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    <Modal show={modal==="moverStock"} onClose={closeM} title="Movimiento de stock">
      <Sel label="Producto" value={form.stock_id||""} onChange={sf("stock_id")}><option value="">Seleccioná un producto</option>{stock.map(s=><option key={s.id} value={s.id}>{s.nombre} (stock: {s.cantidad})</option>)}</Sel>
      <R2><Sel label="Tipo" value={form.tipo_mov||"salida"} onChange={sf("tipo_mov")}><option value="entrada">Entrada</option><option value="salida">Salida / Venta</option></Sel><Inp label="Cantidad" type="number" value={form.cantidad_mov||""} onChange={sf("cantidad_mov")}/></R2>
      <Inp label="Motivo" type="text" value={form.motivo||""} onChange={sf("motivo")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={moverStock} disabled={saving}>{saving?"Guardando...":"Confirmar"}</Btn></div>
    </Modal>

    <Modal show={modal==="config"} onClose={closeM} title="Configuración">
      <Inp label="Nombre del club" type="text" value={form.nombre_club||""} onChange={sf("nombre_club")}/>
      <R2><Inp label="Tarifa base (Gs)" type="number" value={form.tarifa_base||""} onChange={sf("tarifa_base")}/><Inp label="Tarifa pico (Gs)" type="number" value={form.tarifa_pico||""} onChange={sf("tarifa_pico")}/></R2>
      <R2><FG label="Hora pico inicio"><select style={inp} value={form.hora_pico_inicio??""} onChange={sf("hora_pico_inicio")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></FG><FG label="Hora pico fin"><select style={inp} value={form.hora_pico_fin??""} onChange={sf("hora_pico_fin")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></FG></R2>
      <R2><FG label="Apertura"><select style={inp} value={form.hora_inicio??""} onChange={sf("hora_inicio")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></FG><FG label="Cierre"><select style={inp} value={form.hora_fin??""} onChange={sf("hora_fin")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></FG></R2>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarConfig} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    <Dialog show={dlg?.type==="confirmar"} title="Confirmar cobro" msg={`¿Cobrar ${gs((dlg?.t?.precio||0)-(dlg?.t?.sena||0))} a ${cById(dlg?.t?.cliente_id)?.nombre||"?"}?`} onOk={()=>confirmarTurno(dlg.t)} onCancel={()=>setDlg(null)} okLabel="✓ Confirmar" okV="success"/>
    <Dialog show={dlg?.type==="cancelar"} title="Cancelar turno" msg={`¿Cancelar turno de ${cById(dlg?.t?.cliente_id)?.nombre||"?"}?${dlg?.t?.sena>0?" La seña se devuelve en caja.":""}`} onOk={()=>cancelarTurno(dlg.t)} onCancel={()=>setDlg(null)} okLabel="Cancelar turno" okV="danger"/>
    <Dialog show={dlg?.type==="noshow"} title="No show" msg={`¿Marcar a ${cById(dlg?.t?.cliente_id)?.nombre||"?"} como no show?`} onOk={()=>noShow(dlg.t)} onCancel={()=>setDlg(null)} okLabel="Marcar" okV="danger"/>
    <Dialog show={dlg?.type==="eliminarCliente"} title="Eliminar cliente" msg={`¿Eliminar a ${dlg?.nombre}?`} onOk={()=>eliminarCliente(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Eliminar" okV="danger"/>
    <Dialog show={dlg?.type==="cancelarAbono"} title="Cancelar abono" msg={`¿Cancelar el abono de ${dlg?.nombre}?`} onOk={()=>cancelarAbono(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Cancelar abono" okV="danger"/>
    <Dialog show={dlg?.type==="eliminarMov"} title="Eliminar movimiento" msg={`¿Eliminar "${dlg?.desc}" de caja?`} onOk={()=>eliminarMovCaja(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Eliminar" okV="danger"/>

    {dlg?.type==="wsp"&&<div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.8)"}}>
      <div style={{backgroundColor:"#111E40",borderRadius:14,padding:"24px",width:360,boxShadow:"0 8px 40px rgba(0,0,0,0.6)",border:"1px solid #1E3070"}}>
        <div style={{fontSize:15,fontWeight:500,marginBottom:8,color:TX.p}}>✅ Reserva guardada</div>
        <div style={{fontSize:13,color:TX.s,marginBottom:12}}>¿Enviás confirmación a {dlg.cliente.nombre}?</div>
        <div style={{background:"#0D1830",borderRadius:8,padding:"10px 12px",fontSize:12,color:TX.s,marginBottom:16,lineHeight:1.6}}>{dlg.msg}</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setDlg(null)}>Omitir</Btn>
          <Btn v="success" onClick={()=>{enviarWsp(dlg.cliente.telefono,dlg.msg);setDlg(null);}}>Enviar WhatsApp</Btn>
        </div>
      </div>
    </div>}
  </div>;
}