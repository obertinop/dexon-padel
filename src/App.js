import { useState, useEffect, useCallback, useRef } from "react";

const URL = "https://wirsrkuxzltedqdkrdak.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpcnNya3V4emx0ZWRxZGtyZGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjEzMjMsImV4cCI6MjA5MjYzNzMyM30.BjxD2R5bgBUHyalpwFhRzsGEzOnCx4PH9Sb65d609VI";

const q = async (path, opts = {}) => {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(opts.prefer ? { Prefer: opts.prefer } : {}), ...opts.headers },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
const db = {
  get: (t, p = "") => q(`${t}?${p}`),
  post: (t, b) => q(t, { method: "POST", body: JSON.stringify(b), prefer: "return=representation" }),
  patch: (t, id, b) => q(`${t}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(b), prefer: "return=representation" }),
  del: (t, id) => q(`${t}?id=eq.${id}`, { method: "DELETE" }),
};

const gs = n => "Gs " + Math.round(n || 0).toLocaleString("es-PY");
const hoy = () => new Date().toISOString().slice(0, 10);
const fmtD = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const DIAS_FULL = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];


const C = { coral:"#D85A30", coralL:"#FAECE7", ok:"#3B6D11", okL:"#EAF3DE", warn:"#854F0B", warnL:"#FAEEDA", danger:"#A32D2D", dangerL:"#FCEBEB", info:"#185FA5", infoL:"#E6F1FB", purple:"#3C3489", purpleL:"#EEEDFE" };

const badge = (type, txt) => {
  const m = { ok:[C.okL,C.ok], warn:[C.warnL,C.warn], danger:[C.dangerL,C.danger], info:[C.infoL,C.info], coral:[C.coralL,C.coral], purple:[C.purpleL,C.purple], gray:["var(--color-background-secondary)","var(--color-text-secondary)"] };
  const [bg,color] = m[type]||m.gray;
  return <span style={{background:bg,color,fontSize:11,padding:"3px 9px",borderRadius:100,fontWeight:500,display:"inline-block",whiteSpace:"nowrap"}}>{txt}</span>;
};

const estadoBadge = e => {
  if (e==="confirmado") return badge("ok","✓ Confirmado");
  if (e==="cancelado") return badge("danger","✗ Cancelado");
  if (e==="no_show") return badge("warn","No show");
  return badge("gray","Reservado");
};

const tipoBadge = t => {
  if (t==="abono") return badge("purple","Abono");
  if (t==="clase") return badge("info","Clase");
  if (t==="bloqueado") return badge("gray","Bloqueado");
  return badge("coral","Ocasional");
};

const inp = {padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:8,fontSize:13,width:"100%",background:"var(--color-background-primary)",color:"var(--color-text-primary)",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box"};
const card = {background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:12,padding:"16px 18px"};
const metric = {background:"var(--color-background-secondary)",borderRadius:10,padding:"14px 16px"};
const lbl = {fontSize:12,color:"var(--color-text-secondary)",fontWeight:500,marginBottom:5,display:"block"};
const Btn = ({v="default",sm,children,...p}) => {
  const styles = {
    primary:{background:C.coral,color:"#fff",border:"none"},
    ghost:{background:"var(--color-background-secondary)",color:"var(--color-text-primary)",border:"0.5px solid var(--color-border-tertiary)"},
    danger:{background:C.dangerL,color:C.danger,border:`0.5px solid #F09595`},
    success:{background:C.okL,color:C.ok,border:`0.5px solid #97C459`},
    default:{background:"var(--color-background-primary)",color:"var(--color-text-primary)",border:"0.5px solid var(--color-border-secondary)"},
  };
  return <button {...p} style={{padding:sm?"5px 12px":"8px 16px",borderRadius:8,fontSize:sm?12:13,cursor:"pointer",fontFamily:"var(--font-sans)",fontWeight:400,...(styles[v]||styles.default),...p.style}}>{children}</button>;
};
const FG = ({label,children}) => <div style={{marginBottom:14}}>{label&&<label style={lbl}>{label}</label>}{children}</div>;
const Inp = ({label,...p}) => { const ref=useRef(); useEffect(()=>{if(ref.current&&document.activeElement!==ref.current)ref.current.value=p.value??"";},[p.value]); return <FG label={label}><input ref={ref} {...p} style={inp} defaultValue={p.value??""} onChange={p.onChange}/></FG>; };
const Sel = ({label,children,...p}) => <FG label={label}><select {...p} style={inp}>{children}</select></FG>;
const R2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{children}</div>;
const Div = () => <div style={{height:"0.5px",background:"var(--color-border-tertiary)",margin:"16px 0"}}/>;
const Empty = ({t}) => <div style={{textAlign:"center",padding:"40px 0",color:"var(--color-text-tertiary)",fontSize:13}}>{t}</div>;

const initials = n => n?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
const avatarBg = n => { const c=["#E6F1FB","#EAF3DE","#FAECE7","#FAEEDA","#EEEDFE","#E1F5EE"]; return c[(n||"").charCodeAt(0)%c.length]; };
const avatarFg = n => { const c=["#185FA5","#3B6D11","#993C1D","#854F0B","#3C3489","#085041"]; return c[(n||"").charCodeAt(0)%c.length]; };
const Avatar = ({nombre,size=36}) => <div style={{width:size,height:size,borderRadius:"50%",background:avatarBg(nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:500,color:avatarFg(nombre),flexShrink:0}}>{initials(nombre)}</div>;

// Drawer lateral
const Drawer = ({show,onClose,title,children}) => {
  if (!show) return null;
  return <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.55)",overflowY:"auto",padding:"24px 16px"}}>
    <div style={{width:"100%",maxWidth:500,backgroundColor:"#ffffff",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",border:"1px solid #e0e0e0",flexShrink:0}}>
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #e0e0e0",display:"flex",justifyContent:"space-between",alignItems:"center",backgroundColor:"#ffffff",borderRadius:"14px 14px 0 0"}}>
        <span style={{fontSize:16,fontWeight:500,color:"#111"}}>{title}</span>
        <button onClick={onClose} style={{border:"none",background:"#f0f0f0",cursor:"pointer",fontSize:16,color:"#666",padding:"5px 9px",borderRadius:6}}>×</button>
      </div>
      <div style={{padding:20,backgroundColor:"#ffffff",borderRadius:"0 0 14px 14px"}}>{children}</div>
    </div>
  </div>;
};

// Dialog confirmación
const Dialog = ({show,title,msg,onOk,onCancel,okLabel="Confirmar",okV="danger"}) => {
  if (!show) return null;
  return <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.55)"}}>
    <div style={{backgroundColor:"#ffffff",borderRadius:14,padding:"24px",width:340,boxShadow:"0 8px 40px rgba(0,0,0,0.25)",border:"1px solid #e0e0e0"}}>
      <div style={{fontSize:15,fontWeight:500,marginBottom:8,color:"#111"}}>{title}</div>
      <div style={{fontSize:13,color:"#666",marginBottom:20}}>{msg}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onCancel}>Cancelar</Btn>
        <Btn v={okV} onClick={onOk}>{okLabel}</Btn>
      </div>
    </div>
  </div>;
};

export default function App() {
  const [tab, setTab] = useState("hoy");
  const [data, setData] = useState({turnos:[],clientes:[],abonos:[],planes:[],instructores:[],caja:[],stock:[],espera:[],cfg:{nombre_club:"DEXON PADEL",hora_inicio:10,hora_fin:24,tarifa_base:80000,tarifa_pico:100000,hora_pico_inicio:19,hora_pico_fin:22}});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [semOff, setSemOff] = useState(0);
  const [drawer, setDrawer] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [form, setForm] = useState({});
  const [busq, setBusq] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tu,cl,ab,pl,ins,ca,st,es,cf,at] = await Promise.all([
        db.get("turnos","order=fecha.asc,hora.asc"),
        db.get("clientes","order=nombre.asc"),
        db.get("abonos","order=fecha_vencimiento.asc"),
        db.get("planes","order=precio.asc"),
        db.get("instructores","order=nombre.asc"),
        db.get("caja","order=fecha.desc,id.desc"),
        db.get("stock","order=nombre.asc"),
        db.get("espera","order=fecha.asc,hora.asc"),
        db.get("config","limit=1"),
        db.get("abono_turnos","order=abono_id.asc"),
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setData(prev=>({turnos:tu||[],clientes:cl||[],abonos:ab||[],planes:pl||[],instructores:ins||[],caja:ca||[],stock:st||[],espera:es||[],cfg:cf?.[0]||prev.cfg,abono_turnos:at||[]}));
    } catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const {turnos,clientes,abonos,planes,instructores,caja,stock,espera,cfg,abono_turnos=[]} = data;
  const horas = Array.from({length:cfg.hora_fin-cfg.hora_inicio},(_,i)=>cfg.hora_inicio+i);
  const cById = id => clientes.find(c=>c.id===id);
  const pById = id => planes.find(p=>p.id===id);
  const iById = id => instructores.find(i=>i.id===id);
  const sf = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const openD = (name,f={}) => {setForm(f);setDrawer(name);};
  const closeD = () => {setDrawer(null);setForm({});};

  const precioTurno = (hora) => hora>=cfg.hora_pico_inicio&&hora<cfg.hora_pico_fin ? cfg.tarifa_pico : cfg.tarifa_base;

  // Generar turnos de abonados en el calendario
  const turnosAbonados = () => {
    const dias=getSemana();
    const generados=[];
    abonos.filter(a=>a.estado==="activo").forEach(ab=>{
      const slots=abono_turnos.filter(at=>at.abono_id===ab.id);
      dias.forEach(d=>{
        slots.forEach(slot=>{
          if (slot.dia===d.getDay()) {
            const fs=fmtD(d);
            const existe=turnos.find(t=>t.fecha===fs&&t.hora===slot.hora&&t.estado!=="cancelado");
            if (!existe) generados.push({fecha:fs,hora:slot.hora,tipo:"abono",estado:"reservado",cliente_id:ab.cliente_id,abono_id:ab.id,_generado:true});
          }
        });
      });
    });
    return generados;
  };

  const getSemana = () => {
    const h=new Date(); const l=new Date(h);
    l.setDate(h.getDate()-((h.getDay()+6)%7)+semOff*7);
    return Array.from({length:7},(_,i)=>{const d=new Date(l);d.setDate(l.getDate()+i);return d;});
  };

  // ── ACCIONES ──
  const confirmarTurno = async (t) => {
    setSaving(true);
    try {
      const saldo = t.precio-(t.sena||0);
      await db.patch("turnos",t.id,{estado:"confirmado",cobrado:true,saldo});
      await db.post("caja",{descripcion:`${t.tipo==="clase"?"Clase":"Reserva"} - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"ingreso",categoria:t.tipo==="clase"?"clase":"reserva",monto:saldo,fecha:t.fecha,turno_id:t.id});
      await load();setDlg(null);
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const cancelarTurno = async (t) => {
    setSaving(true);
    try {
      await db.patch("turnos",t.id,{estado:"cancelado"});
      // Si tenía seña cobrada, registrar devolución en caja
      if (t.sena>0) {
        await db.post("caja",{descripcion:`Devolución seña - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"egreso",categoria:"reserva",monto:t.sena,fecha:hoy(),turno_id:t.id});
      }
      // Notificar lista de espera
      const enEspera=espera.filter(e=>e.fecha===t.fecha&&e.hora===t.hora);
      if (enEspera.length>0) {
        await db.patch("espera",enEspera[0].id,{notificado:true});
      }
      await load();setDlg(null);closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const noShow = async (t) => {
    setSaving(true);
    try {
      await db.patch("turnos",t.id,{estado:"no_show"});
      await load();setDlg(null);closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarTurno = async () => {
    if (!form.cliente_id||!form.fecha||form.hora===undefined) return;
    const existe=turnos.find(t=>t.fecha===form.fecha&&t.hora===Number(form.hora)&&t.estado!=="cancelado");
    if (existe){alert("Ese horario ya está ocupado.");return;}
    setSaving(true);
    try {
      const precio=form.tipo==="clase"?Number(form.precio_clase||0):precioTurno(Number(form.hora));
      const sena=Number(form.sena||0);
      const [t]=await db.post("turnos",{fecha:form.fecha,hora:Number(form.hora),tipo:form.tipo||"ocasional",estado:"reservado",cliente_id:Number(form.cliente_id),instructor_id:form.instructor_id?Number(form.instructor_id):null,precio,sena,saldo:precio-sena,notas:form.notas||""});
      if (sena>0) {
        await db.post("caja",{descripcion:`Seña - ${cById(Number(form.cliente_id))?.nombre||"?"}`,tipo:"ingreso",categoria:"reserva",monto:sena,fecha:form.fecha,turno_id:t.id});
      }
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarCliente = async () => {
    if (!form.nombre?.trim()) return;
    setSaving(true);
    try {
      if (form.id) await db.patch("clientes",form.id,{nombre:form.nombre.trim(),telefono:form.telefono||"",nivel:form.nivel||"intermedio",notas:form.notas||""});
      else await db.post("clientes",{nombre:form.nombre.trim(),telefono:form.telefono||"",nivel:form.nivel||"intermedio",notas:form.notas||""});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const eliminarCliente = async (id) => {
    setSaving(true);
    try {
      await db.del("clientes",id);
      await load();setDlg(null);closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const cancelarAbono = async (id) => {
    setSaving(true);
    try {
      await db.patch("abonos",id,{estado:"cancelado"});
      await load();setDlg(null);
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarAbono = async () => {
    if (!form.cliente_id||!form.plan_id||!form.fecha_inicio) return;
    if (!form.slots||form.slots.length===0){alert("Agregá al menos un turno fijo.");return;}
    setSaving(true);
    try {
      const plan=pById(Number(form.plan_id));
      const ini=new Date(form.fecha_inicio);
      const venc=new Date(ini);venc.setMonth(venc.getMonth()+1);
      const precio=Number(form.precio_acordado||plan?.precio||0);
      const [ab]=await db.post("abonos",{cliente_id:Number(form.cliente_id),plan_id:Number(form.plan_id),precio_acordado:precio,fecha_inicio:fmtD(ini),fecha_vencimiento:fmtD(venc),estado:"activo",turno_hora:null});
      // Guardar slots
      for (const slot of form.slots) {
        await db.post("abono_turnos",{abono_id:ab.id,dia:Number(slot.dia),hora:Number(slot.hora)});
      }
      await db.post("caja",{descripcion:`Abono ${plan?.nombre||""} - ${cById(Number(form.cliente_id))?.nombre||"?"}`,tipo:"ingreso",categoria:"abono",monto:precio,fecha:fmtD(ini),abono_id:ab.id});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarPlan = async () => {
    if (!form.nombre||!form.horas_semana||!form.precio) return;
    setSaving(true);
    try {
      if (form.id) await db.patch("planes",form.id,{nombre:form.nombre,horas_semana:Number(form.horas_semana),precio:Number(form.precio)});
      else await db.post("planes",{nombre:form.nombre,horas_semana:Number(form.horas_semana),precio:Number(form.precio)});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarInstructor = async () => {
    if (!form.nombre?.trim()) return;
    setSaving(true);
    try {
      await db.post("instructores",{nombre:form.nombre.trim(),telefono:form.telefono||"",tarifa_clase:Number(form.tarifa_clase||0)});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarMovCaja = async () => {
    if (!form.descripcion||!form.monto) return;
    setSaving(true);
    try {
      await db.post("caja",{descripcion:form.descripcion,tipo:form.tipo||"egreso",categoria:form.categoria||"gasto",monto:Number(form.monto),fecha:form.fecha||hoy()});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarStock = async () => {
    if (!form.nombre?.trim()||form.cantidad===undefined) return;
    setSaving(true);
    try {
      if (form.id) await db.patch("stock",form.id,{nombre:form.nombre,categoria:form.categoria||"general",cantidad:Number(form.cantidad),minimo:Number(form.minimo||0),precio_venta:Number(form.precio_venta||0),precio_costo:Number(form.precio_costo||0)});
      else await db.post("stock",{nombre:form.nombre,categoria:form.categoria||"general",cantidad:Number(form.cantidad),minimo:Number(form.minimo||0),precio_venta:Number(form.precio_venta||0),precio_costo:Number(form.precio_costo||0)});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const moverStock = async () => {
    if (!form.stock_id||!form.cantidad_mov) return;
    setSaving(true);
    try {
      const item=stock.find(s=>s.id===Number(form.stock_id));
      if (!item) return;
      const delta=form.tipo_mov==="entrada"?Number(form.cantidad_mov):-Number(form.cantidad_mov);
      await db.patch("stock",item.id,{cantidad:Math.max(0,item.cantidad+delta)});
      await db.post("stock_movimientos",{stock_id:item.id,tipo:form.tipo_mov,cantidad:Number(form.cantidad_mov),motivo:form.motivo||"",fecha:hoy()});
      if (form.tipo_mov==="salida"&&item.precio_venta>0) {
        await db.post("caja",{descripcion:`Venta - ${item.nombre} x${form.cantidad_mov}`,tipo:"ingreso",categoria:"stock",monto:item.precio_venta*Number(form.cantidad_mov),fecha:hoy()});
      }
      if (form.tipo_mov==="entrada"&&item.precio_costo>0) {
        await db.post("caja",{descripcion:`Compra - ${item.nombre} x${form.cantidad_mov}`,tipo:"egreso",categoria:"stock",monto:item.precio_costo*Number(form.cantidad_mov),fecha:hoy()});
      }
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const agregarEspera = async () => {
    if (!form.cliente_id||!form.fecha_esp||form.hora_esp===undefined) return;
    setSaving(true);
    try {
      await db.post("espera",{cliente_id:Number(form.cliente_id),fecha:form.fecha_esp,hora:Number(form.hora_esp)});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const guardarConfig = async () => {
    setSaving(true);
    try {
      await db.patch("config",cfg.id,{nombre_club:form.nombre_club,hora_inicio:Number(form.hora_inicio),hora_fin:Number(form.hora_fin),tarifa_base:Number(form.tarifa_base),tarifa_pico:Number(form.tarifa_pico),hora_pico_inicio:Number(form.hora_pico_inicio),hora_pico_fin:Number(form.hora_pico_fin)});
      await load();closeD();
    } catch(e){alert(e.message);}
    setSaving(false);
  };

  const whatsapp = (c,t,msg) => {
    const tel=(c.telefono||"").replace(/\D/g,"");
    const m=msg||`Hola ${c.nombre}, tu turno en ${cfg.nombre_club} está confirmado para el ${t.fecha} a las ${t.hora}:00hs. ¡Te esperamos!`;
    window.open(`https://wa.me/595${tel.startsWith("0")?tel.slice(1):tel}?text=${encodeURIComponent(m)}`,"_blank");
  };



  const TABS=[{id:"hoy",l:"Hoy"},{id:"agenda",l:"Agenda"},{id:"clientes",l:"Clientes"},{id:"abonados",l:"Abonados"},{id:"caja",l:"Caja"},{id:"stock",l:"Stock"},{id:"stats",l:"Stats"},{id:"config",l:"Config"}];

  // ══ HOY ══
  const Hoy = () => {
    const h=hoy(); const mes=h.slice(0,7);
    const tHoy=turnos.filter(t=>t.fecha===h&&t.estado!=="cancelado");
    const ingH=caja.filter(m=>m.fecha===h&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    const pendCobro=tHoy.filter(t=>t.estado==="reservado"&&t.tipo!=="abono");
    const vencidos=abonos.filter(a=>a.fecha_vencimiento<h&&a.estado==="activo");
    const stockBajo=stock.filter(s=>s.minimo>0&&s.cantidad<=s.minimo);
    const esperaHoy=espera.filter(e=>e.fecha===h&&!e.notificado);

    return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:22,fontWeight:500}}>{cfg.nombre_club}</div>
          <div style={{fontSize:13,color:"var(--color-text-secondary)",marginTop:2}}>{new Date().toLocaleDateString("es-PY",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        <Btn v="primary" onClick={()=>openD("turno",{fecha:h,hora:cfg.hora_inicio,tipo:"ocasional"})}>+ Reservar</Btn>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[{l:"Ingresos hoy",v:gs(ingH)},{l:"Ingresos mes",v:gs(ingM)},{l:"Balance mes",v:gs(ingM-egrM),c:ingM-egrM>=0?C.ok:C.danger},{l:"Turnos hoy",v:tHoy.length,sub:`${pendCobro.length} pendientes de cobro`}].map((m,i)=>
          <div key={i} style={metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{m.l}</div><div style={{fontSize:21,fontWeight:500,color:m.c||"var(--color-text-primary)"}}>{m.v}</div>{m.sub&&<div style={{fontSize:11,color:C.warn,marginTop:3}}>{m.sub}</div>}</div>
        )}
      </div>

      {(vencidos.length>0||stockBajo.length>0||esperaHoy.length>0)&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {vencidos.length>0&&<div style={{background:C.warnL,borderRadius:10,padding:"9px 14px",fontSize:13,color:C.warn,flex:1}}>{vencidos.length} abono{vencidos.length>1?"s":""} vencido{vencidos.length>1?"s":""}</div>}
        {stockBajo.length>0&&<div style={{background:C.dangerL,borderRadius:10,padding:"9px 14px",fontSize:13,color:C.danger,flex:1}}>{stockBajo.map(s=>s.nombre).join(", ")} — stock bajo</div>}
        {esperaHoy.length>0&&<div style={{background:C.infoL,borderRadius:10,padding:"9px 14px",fontSize:13,color:C.info,flex:1}}>{esperaHoy.length} en lista de espera hoy</div>}
      </div>}

      <div style={{...card}}>
        <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Turnos de hoy</div>
        {tHoy.length===0?<Empty t="Sin turnos para hoy"/>:
          <div style={{display:"grid",gap:8}}>
            {tHoy.sort((a,b)=>a.hora-b.hora).map(t=>{
              const c=cById(t.cliente_id);
              const ins=iById(t.instructor_id);
              return <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)"}}>
                <div style={{fontSize:15,fontWeight:500,color:C.coral,minWidth:44}}>{t.hora}:00</div>
                <Avatar nombre={c?.nombre} size={36}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:13}}>{c?.nombre||"?"}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:1}}>
                    {tipoBadge(t.tipo)} {estadoBadge(t.estado)}
                    {ins&&<span style={{marginLeft:6,fontSize:11,color:"var(--color-text-secondary)"}}> · {ins.nombre}</span>}
                    {t.sena>0&&<span style={{marginLeft:6,color:C.ok,fontSize:11}}>Seña: {gs(t.sena)}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  {t.estado==="reservado"&&<>
                    <Btn v="success" sm onClick={()=>setDlg({type:"confirmar",t})}>✓ Cobrar {gs(t.precio-(t.sena||0))}</Btn>
                    <Btn v="ghost" sm onClick={()=>setDlg({type:"noshow",t})}>No show</Btn>
                    <Btn v="danger" sm onClick={()=>setDlg({type:"cancelar",t})}>Cancelar</Btn>
                  </>}
                  {t.estado==="confirmado"&&<Btn v="ghost" sm onClick={()=>{if(c)whatsapp(c,t);}}>WhatsApp</Btn>}
                  {t.estado!=="reservado"&&<Btn v="ghost" sm onClick={()=>openD("verTurno",{...t,cliente:c,instructor:ins})}>Ver</Btn>}
                </div>
              </div>;
            })}
          </div>
        }
      </div>
    </div>;
  };

  // ══ AGENDA ══
  const Agenda = () => {
    const dias=getSemana();
    const h=hoy();
    const extra=turnosAbonados();
    const allTurnos=[...turnos,...extra];

    return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:500}}>{dias[0].getDate()} {MESES[dias[0].getMonth()]} — {dias[6].getDate()} {MESES[dias[6].getMonth()]}</div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>setSemOff(o=>o-1)}>← Ant.</Btn>
          <Btn onClick={()=>setSemOff(0)}>Hoy</Btn>
          <Btn onClick={()=>setSemOff(o=>o+1)}>Sig. →</Btn>
          <Btn v="primary" onClick={()=>openD("turno",{fecha:h,hora:cfg.hora_inicio,tipo:"ocasional"})}>+ Reservar</Btn>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:`52px repeat(7,1fr)`,gap:1,background:"var(--color-border-tertiary)",borderRadius:10,overflow:"hidden",minWidth:600}}>
          <div style={{background:"var(--color-background-secondary)"}}/>
          {dias.map((d,i)=>{
            const isH=fmtD(d)===h;
            const cnt=allTurnos.filter(t=>t.fecha===fmtD(d)&&t.estado!=="cancelado").length;
            return <div key={i} style={{background:isH?"#FAECE7":"var(--color-background-secondary)",padding:"10px 4px",textAlign:"center"}}>
              <div style={{fontSize:11,fontWeight:500,color:isH?C.coral:"var(--color-text-secondary)"}}>{DIAS[d.getDay()]}</div>
              <div style={{fontSize:16,fontWeight:500,color:isH?C.coral:"var(--color-text-primary)",margin:"2px 0"}}>{d.getDate()}</div>
              {cnt>0?<div style={{fontSize:10,color:C.coral,fontWeight:500}}>{cnt}t</div>:<div style={{height:14}}/>}
            </div>;
          })}
          {horas.map(h=><>
            <div key={`t${h}`} style={{background:"var(--color-background-secondary)",padding:"0 10px",display:"flex",alignItems:"center",justifyContent:"flex-end",fontSize:11,color:"var(--color-text-tertiary)",minHeight:40}}>{h}:00</div>
            {dias.map((d,di)=>{
              const fs=fmtD(d);
              const t=allTurnos.find(t=>t.fecha===fs&&t.hora===h&&t.estado!=="cancelado");
              const c=t?cById(t.cliente_id):null;
              const isPico=h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin;
              const bgColor=t?(t.tipo==="abono"?C.purpleL:t.tipo==="clase"?C.infoL:C.coralL):(isPico?"rgba(216,90,48,0.04)":"var(--color-background-primary)");
              return <div key={`${h}-${di}`} onClick={()=>t?openD("verTurno",{...t,cliente:c,instructor:iById(t.instructor_id)}):openD("turno",{fecha:fs,hora:h,tipo:"ocasional"})}
                style={{background:bgColor,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",minHeight:40}}>
                {t&&<span style={{fontSize:11,fontWeight:500,color:t.tipo==="abono"?C.purple:t.tipo==="clase"?C.info:C.coral,background:t.tipo==="abono"?"#CECBF6":t.tipo==="clase"?"#B8D4F7":"#F5C4B3",borderRadius:5,padding:"2px 7px",maxWidth:"92%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {c?.nombre?.split(" ")[0]||"?"}
                </span>}
              </div>;
            })}
          </>)}
        </div>
      </div>
      <div style={{display:"flex",gap:12,marginTop:10,fontSize:12,color:"var(--color-text-secondary)"}}>
        <span><span style={{width:10,height:10,borderRadius:2,background:"#F5C4B3",display:"inline-block",marginRight:4}}/>Ocasional</span>
        <span><span style={{width:10,height:10,borderRadius:2,background:"#CECBF6",display:"inline-block",marginRight:4}}/>Abonado</span>
        <span><span style={{width:10,height:10,borderRadius:2,background:"#B8D4F7",display:"inline-block",marginRight:4}}/>Clase</span>
        <span style={{marginLeft:"auto",color:C.coral}}>Sombreado = horario pico</span>
      </div>
    </div>;
  };

  // ══ CLIENTES ══
  const Clientes = () => {
    const lista=clientes.filter(c=>c.nombre.toLowerCase().includes(busq.toLowerCase()));
    return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:500}}>Clientes <span style={{fontSize:13,color:"var(--color-text-secondary)",fontWeight:400}}>({clientes.length})</span></span>
        <div style={{display:"flex",gap:8}}>
          <input style={{...inp,width:200}} placeholder="Buscar..." defaultValue={busq} onChange={e=>setBusq(e.target.value)}/>
          <Btn v="primary" onClick={()=>openD("cliente",{nivel:"intermedio"})}>+ Agregar</Btn>
        </div>
      </div>
      <div style={{display:"grid",gap:8}}>
        {lista.map(c=>{
          const ab=abonos.find(a=>a.cliente_id===c.id&&a.estado==="activo");
          const resC=turnos.filter(t=>t.cliente_id===c.id).length;
          return <div key={c.id} style={{...card,display:"flex",alignItems:"center",gap:14,padding:"12px 16px"}}>
            <Avatar nombre={c.nombre} size={40}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:500,fontSize:14}}>{c.nombre}</div>
              <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{c.telefono||"Sin teléfono"} · {resC} turnos · {c.nivel}</div>
              {c.notas&&<div style={{fontSize:11,color:"var(--color-text-tertiary)",marginTop:2}}>{c.notas}</div>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
              {ab?badge("purple",pById(ab.plan_id)?.nombre||"Abonado"):badge("gray","Ocasional")}
              {c.deuda>0&&badge("danger",`Debe ${gs(c.deuda)}`)}
              <Btn sm v="ghost" onClick={()=>openD("turno",{fecha:hoy(),hora:cfg.hora_inicio,tipo:"ocasional",cliente_id:c.id})}>Reservar</Btn>
              {!ab&&<Btn sm v="ghost" onClick={()=>openD("abono",{cliente_id:c.id,fecha_inicio:hoy()})}>Abonar</Btn>}
            </div>
          </div>;
        })}
      </div>
    </div>;
  };

  // ══ ABONADOS ══
  const Abonados = () => {
    const h=hoy();
    const venc=abonos.filter(a=>a.fecha_vencimiento<h&&a.estado==="activo");
    const vig=abonos.filter(a=>a.fecha_vencimiento>=h&&a.estado==="activo");
    const diasAbono=ab=>{
      const slots=abono_turnos.filter(at=>at.abono_id===ab.id);
      if (slots.length===0) return "Sin turno fijo";
      return slots.map(s=>`${DIAS_FULL[s.dia]} ${s.hora}:00`).join(" · ");
    };
    return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:500}}>Abonados</span>
        <div style={{display:"flex",gap:8}}>
          <Btn v="ghost" onClick={()=>openD("plan",{})}>Gestionar planes</Btn>
          <Btn v="primary" onClick={()=>openD("abono",{fecha_inicio:hoy()})}>+ Nuevo abono</Btn>
        </div>
      </div>
      {venc.length>0&&<div style={{background:C.warnL,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.warn,marginBottom:14}}>{venc.length} abono{venc.length>1?"s":""} vencido{venc.length>1?"s":""} — recordá renovar</div>}
      <div style={{display:"grid",gap:8}}>
        {[...venc,...vig].map(ab=>{
          const c=cById(ab.cliente_id);
          const pl=pById(ab.plan_id);
          const v=ab.fecha_vencimiento<h;
          return <div key={ab.id} style={{...card,padding:"14px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <Avatar nombre={c?.nombre} size={40}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:14}}>{c?.nombre||"?"}</div>
                <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>{pl?.nombre||"Plan"} · {gs(ab.precio_acordado)}/mes</div>
                <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginTop:2}}>{diasAbono(ab)}{ab.turno_hora!==null&&ab.turno_hora!==undefined?` · ${ab.turno_hora}:00hs`:""}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
                {v?badge("danger",`Vencido ${ab.fecha_vencimiento?.slice(5)}`):badge("ok",`Hasta ${ab.fecha_vencimiento?.slice(5)}`)}
                <div style={{display:"flex",gap:6}}>
                  {v&&<Btn v="primary" sm onClick={()=>openD("abono",{cliente_id:ab.cliente_id,plan_id:ab.plan_id,precio_acordado:ab.precio_acordado,fecha_inicio:hoy(),slots:abono_turnos.filter(at=>at.abono_id===ab.id).map(at=>({dia:at.dia,hora:at.hora}))})}>Renovar</Btn>}
                  <Btn v="danger" sm onClick={()=>setDlg({type:"cancelarAbono",id:ab.id,nombre:cById(ab.cliente_id)?.nombre})}>Cancelar</Btn>
                </div>
              </div>
            </div>
          </div>;
        })}
      </div>
    </div>;
  };

  // ══ CAJA ══
  const Caja = () => {
    const h=hoy();const mes=h.slice(0,7);
    const ingH=caja.filter(m=>m.fecha===h&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const ingM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const egrM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="egreso").reduce((a,m)=>a+m.monto,0);
    const porCat=["reserva","abono","clase","stock","gasto","otro"].map(cat=>({cat,ing:caja.filter(m=>m.categoria===cat&&m.tipo==="ingreso"&&m.fecha.startsWith(mes)).reduce((a,m)=>a+m.monto,0),egr:caja.filter(m=>m.categoria===cat&&m.tipo==="egreso"&&m.fecha.startsWith(mes)).reduce((a,m)=>a+m.monto,0)})).filter(x=>x.ing>0||x.egr>0);
    return <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <div style={metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Ingresos hoy</div><div style={{fontSize:21,fontWeight:500}}>{gs(ingH)}</div></div>
        <div style={metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Ingresos mes</div><div style={{fontSize:21,fontWeight:500}}>{gs(ingM)}</div></div>
        <div style={metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>Balance mes</div><div style={{fontSize:21,fontWeight:500,color:ingM-egrM>=0?C.ok:C.danger}}>{gs(ingM-egrM)}</div></div>
      </div>
      {porCat.length>0&&<div style={{...card,marginBottom:16}}>
        <div style={{fontWeight:500,marginBottom:12,fontSize:14}}>Ingresos del mes por categoría</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {porCat.map(x=><div key={x.cat} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:"var(--color-text-secondary)",textTransform:"capitalize",marginBottom:4}}>{x.cat}</div>
            {x.ing>0&&<div style={{fontSize:14,fontWeight:500,color:C.ok}}>{gs(x.ing)}</div>}
            {x.egr>0&&<div style={{fontSize:14,fontWeight:500,color:C.danger}}>- {gs(x.egr)}</div>}
          </div>)}
        </div>
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:16,fontWeight:500}}>Movimientos</span>
        <Btn v="primary" onClick={()=>openD("movCaja",{tipo:"egreso",categoria:"gasto",fecha:hoy()})}>+ Registrar gasto</Btn>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",borderRadius:10,overflow:"hidden"}}>
          <thead><tr>
            <th style={{...{textAlign:"left",padding:"10px 14px",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"},...{}}}>Fecha</th>
            <th style={{textAlign:"left",padding:"10px 14px",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>Descripción</th>
            <th style={{textAlign:"left",padding:"10px 14px",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>Categoría</th>
            <th style={{textAlign:"right",padding:"10px 14px",fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",borderBottom:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-secondary)"}}>Monto</th>
          </tr></thead>
          <tbody>
            {caja.map(m=><tr key={m.id}>
              <td style={{padding:"10px 14px",fontSize:13,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{m.fecha.slice(8)}/{m.fecha.slice(5,7)}</td>
              <td style={{padding:"10px 14px",fontSize:13,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{m.descripcion}</td>
              <td style={{padding:"10px 14px",fontSize:13,borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{badge(m.tipo==="ingreso"?"ok":"danger",m.categoria||m.tipo)}</td>
              <td style={{padding:"10px 14px",fontSize:13,borderBottom:"0.5px solid var(--color-border-tertiary)",textAlign:"right",fontWeight:500,color:m.tipo==="ingreso"?C.ok:C.danger}}>{m.tipo==="egreso"?"- ":""}{gs(m.monto)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>;
  };

  // ══ STOCK ══
  const Stock = () => {
    const cats=[...new Set(stock.map(s=>s.categoria))];
    const bajo=stock.filter(s=>s.minimo>0&&s.cantidad<=s.minimo);
    return <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontSize:16,fontWeight:500}}>Stock</span>
        <div style={{display:"flex",gap:8}}>
          <Btn v="ghost" onClick={()=>openD("moverStock",{tipo_mov:"salida"})}>Registrar movimiento</Btn>
          <Btn v="primary" onClick={()=>openD("stockItem",{categoria:"pelotas",cantidad:"0",minimo:"0"})}>+ Producto</Btn>
        </div>
      </div>
      {bajo.length>0&&<div style={{background:C.dangerL,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.danger,marginBottom:14}}>Stock bajo: {bajo.map(s=>s.nombre).join(", ")}</div>}
      {cats.map(cat=><div key={cat} style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>{cat}</div>
        <div style={{display:"grid",gap:8}}>
          {stock.filter(s=>s.categoria===cat).map(s=>{
            const bajo=s.minimo>0&&s.cantidad<=s.minimo;
            return <div key={s.id} style={{...card,display:"flex",alignItems:"center",gap:14,padding:"12px 16px"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:14}}>{s.nombre}</div>
                {(s.precio_venta>0||s.precio_costo>0)&&<div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2}}>Venta: {gs(s.precio_venta)} · Costo: {gs(s.precio_costo)} · Margen: {gs(s.precio_venta-s.precio_costo)}</div>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:24,fontWeight:500,color:bajo?C.danger:"var(--color-text-primary)"}}>{s.cantidad}</div>
                  <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>unidades</div>
                </div>
                {bajo&&badge("danger","Stock bajo")}
                <Btn sm v="ghost" onClick={()=>openD("stockItem",{...s})}>Editar</Btn>
              </div>
            </div>;
          })}
        </div>
      </div>)}
    </div>;
  };

  // ══ STATS ══
  const Stats = () => {
    const h=hoy();const mes=h.slice(0,7);
    const ult7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return fmtD(d);});
    const porDia=ult7.map(f=>({f,v:caja.filter(m=>m.fecha===f&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0)}));
    const maxV=Math.max(...porDia.map(d=>d.v),1);
    const ingM=caja.filter(m=>m.fecha.startsWith(mes)&&m.tipo==="ingreso").reduce((a,m)=>a+m.monto,0);
    const proy=Math.round(ingM/new Date().getDate()*30);
    const topC=clientes.map(c=>({...c,n:turnos.filter(t=>t.cliente_id===c.id&&t.estado==="confirmado").length})).sort((a,b)=>b.n-a.n).slice(0,5);
    const hPico=horas.map(h=>({h,n:turnos.filter(t=>t.hora===h&&t.estado!=="cancelado").length})).sort((a,b)=>b.n-a.n).slice(0,6);
    const maxH=Math.max(...hPico.map(x=>x.n),1);
    const ocup=Math.round(turnos.filter(t=>t.fecha.startsWith(mes)&&t.estado!=="cancelado").length/(horas.length*new Date().getDate())*100);
    return <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[{l:"Ingresos del mes",v:gs(ingM)},{l:"Proyección mensual",v:gs(proy),c:C.info},{l:"Ocupación del mes",v:`${ocup}%`},{l:"Abonados activos",v:abonos.filter(a=>a.estado==="activo"&&a.fecha_vencimiento>=h).length}].map((m,i)=>
          <div key={i} style={metric}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:6}}>{m.l}</div><div style={{fontSize:21,fontWeight:500,color:m.c||"var(--color-text-primary)"}}>{m.v}</div></div>
        )}
      </div>
      <div style={{...card,marginBottom:12}}>
        <div style={{fontWeight:500,marginBottom:16,fontSize:14}}>Ingresos últimos 7 días</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
          {porDia.map((d,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:"100%",background:d.v>0?C.coral:"var(--color-background-secondary)",borderRadius:"4px 4px 0 0",height:Math.max(d.v/maxV*80,4)}}/>
            <div style={{fontSize:10,color:"var(--color-text-tertiary)"}}>{d.f.slice(8)}/{d.f.slice(5,7)}</div>
          </div>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={card}>
          <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Horarios pico</div>
          {hPico.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <span style={{fontSize:13,minWidth:48}}>{x.h}:00</span>
            <div style={{flex:1,height:6,background:"var(--color-background-secondary)",borderRadius:3,overflow:"hidden"}}><div style={{width:`${x.n/maxH*100}%`,height:"100%",background:C.coral,borderRadius:3}}/></div>
            <span style={{fontSize:12,color:"var(--color-text-secondary)",minWidth:16}}>{x.n}</span>
          </div>)}
        </div>
        <div style={card}>
          <div style={{fontWeight:500,marginBottom:14,fontSize:14}}>Top clientes</div>
          {topC.map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <Avatar nombre={c.nombre} size={28}/>
            <span style={{flex:1,fontSize:13}}>{c.nombre}</span>
            {badge("info",`${c.n} turnos`)}
          </div>)}
        </div>
      </div>
    </div>;
  };

  // ══ CONFIG ══
  const Config = () => <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <span style={{fontSize:16,fontWeight:500}}>Configuración</span>
      <div style={{display:"flex",gap:8}}>
        <Btn v="ghost" onClick={()=>openD("instructor",{})}>+ Instructor</Btn>
        <Btn v="primary" onClick={()=>openD("config",{...cfg})}>Editar</Btn>
      </div>
    </div>
    <div style={{...card,display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:16}}>
      {[{l:"Club",v:cfg.nombre_club},{l:"Tarifa base",v:gs(cfg.tarifa_base)},{l:"Tarifa pico",v:gs(cfg.tarifa_pico)},{l:"Horario pico",v:`${cfg.hora_pico_inicio}:00 - ${cfg.hora_pico_fin}:00`},{l:"Apertura",v:`${cfg.hora_inicio}:00`},{l:"Cierre",v:`${cfg.hora_fin}:00`}].map((r,i)=>
        <div key={i}><div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:4}}>{r.l}</div><div style={{fontSize:15,fontWeight:500}}>{r.v}</div></div>
      )}
    </div>
    {instructores.length>0&&<div style={card}>
      <div style={{fontWeight:500,marginBottom:12,fontSize:14}}>Instructores</div>
      {instructores.map(i=><div key={i.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
        <div><span style={{fontWeight:500}}>{i.nombre}</span><span style={{color:"var(--color-text-secondary)",marginLeft:8}}>{i.telefono}</span></div>
        <span style={{color:"var(--color-text-secondary)"}}>{gs(i.tarifa_clase)}/clase</span>
      </div>)}
    </div>}
    {planes.length>0&&<div style={{...card,marginTop:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontWeight:500,fontSize:14}}>Planes de abono</div>
        <Btn sm v="ghost" onClick={()=>openD("plan",{})}>+ Plan</Btn>
      </div>
      {planes.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"0.5px solid var(--color-border-tertiary)",fontSize:13}}>
        <div><span style={{fontWeight:500}}>{p.nombre}</span><span style={{color:"var(--color-text-secondary)",marginLeft:8}}>{p.horas_semana}hs/sem</span></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontWeight:500}}>{gs(p.precio)}/mes</span>
          <Btn sm v="ghost" onClick={()=>openD("plan",{...p})}>Editar</Btn>
        </div>
      </div>)}
    </div>}
  </div>;

  return (
    <div style={{fontFamily:"var(--font-sans)",maxWidth:940,margin:"0 auto",padding:"0 2px",position:"relative",minHeight:"100vh"}}>
      <div style={{display:"flex",borderBottom:"0.5px solid var(--color-border-tertiary)",overflowX:"auto"}}>
        {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 16px",fontSize:13,border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",color:tab===t.id?"var(--color-text-primary)":"var(--color-text-secondary)",borderBottom:tab===t.id?`2px solid ${C.coral}`:"2px solid transparent",fontWeight:tab===t.id?500:400,fontFamily:"var(--font-sans)"}}>{t.l}</button>)}
      </div>

      <div style={{padding:"18px 0"}}>
        {loading?<div style={{textAlign:"center",padding:80,color:"var(--color-text-secondary)",fontSize:13}}>Cargando...</div>:(
          <>
            {tab==="hoy"&&<Hoy/>}{tab==="agenda"&&<Agenda/>}{tab==="clientes"&&<Clientes/>}
            {tab==="abonados"&&<Abonados/>}{tab==="caja"&&<Caja/>}{tab==="stock"&&<Stock/>}
            {tab==="stats"&&<Stats/>}{tab==="config"&&<Config/>}
          </>
        )}
      </div>

      {/* DRAWER: TURNO */}
      <Drawer show={drawer==="turno"} onClose={closeD} title="Nueva reserva">
        <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}>
          <option value="">Seleccioná un cliente</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Sel>
        <R2>
          <Inp label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/>
          <FG label="Hora"><select style={inp} value={form.hora??""} onChange={sf("hora")}>{horas.map(h=><option key={h} value={h}>{h}:00 {h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin?"🔥":""}</option>)}</select></FG>
        </R2>
        <Sel label="Tipo de turno" value={form.tipo||"ocasional"} onChange={sf("tipo")}>
          <option value="ocasional">Ocasional</option>
          <option value="clase">Clase con instructor</option>
          <option value="bloqueado">Bloquear horario</option>
        </Sel>
        {form.tipo==="clase"&&<>
          <Sel label="Instructor" value={form.instructor_id||""} onChange={sf("instructor_id")}>
            <option value="">Sin instructor asignado</option>
            {instructores.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}
          </Sel>
          <Inp label="Precio de la clase (Gs)" type="number" value={form.precio_clase||""} onChange={sf("precio_clase")}/>
        </>}
        {form.tipo==="ocasional"&&<>
          <div style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--color-text-secondary)",marginBottom:14}}>
            Precio: <strong style={{color:"var(--color-text-primary)"}}>{gs(precioTurno(Number(form.hora||cfg.hora_inicio)))}</strong>
            {Number(form.hora)>=cfg.hora_pico_inicio&&Number(form.hora)<cfg.hora_pico_fin&&<span style={{color:C.coral}}> (horario pico)</span>}
          </div>
          <Inp label="Seña (Gs) — opcional" type="number" value={form.sena||""} onChange={sf("sena")}/>
        </>}
        <Inp label="Notas (opcional)" type="text" value={form.notas||""} onChange={sf("notas")}/>
        <Div/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={closeD}>Cancelar</Btn>
          <Btn v="primary" onClick={guardarTurno} disabled={saving}>{saving?"Guardando...":"Guardar reserva"}</Btn>
        </div>
      </Drawer>

      {/* DRAWER: VER TURNO */}
      <Drawer show={drawer==="verTurno"} onClose={closeD} title="Detalle del turno">
        {form.cliente&&<>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
            <Avatar nombre={form.cliente.nombre} size={48}/>
            <div><div style={{fontSize:16,fontWeight:500}}>{form.cliente.nombre}</div><div style={{fontSize:13,color:"var(--color-text-secondary)"}}>{form.cliente.telefono}</div></div>
          </div>
          <div style={{...metric,marginBottom:14,display:"grid",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Fecha / Hora</span><span>{form.fecha} · {form.hora}:00hs</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Tipo</span>{tipoBadge(form.tipo)}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Estado</span>{estadoBadge(form.estado)}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Precio</span><span>{gs(form.precio)}</span></div>
            {form.sena>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Seña</span><span style={{color:C.ok}}>{gs(form.sena)}</span></div>}
            {form.sena>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Saldo a cobrar</span><span style={{fontWeight:500}}>{gs(form.precio-(form.sena||0))}</span></div>}
            {form.instructor&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Instructor</span><span>{form.instructor.nombre}</span></div>}
            {form.notas&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--color-text-secondary)"}}>Notas</span><span>{form.notas}</span></div>}
          </div>
          <Div/>
          {form.estado==="reservado"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
            <Btn v="success" onClick={()=>{closeD();setDlg({type:"confirmar",t:form});}}>✓ Cobrar {gs(form.precio-(form.sena||0))}</Btn>
            <Btn v="ghost" onClick={()=>{closeD();setDlg({type:"noshow",t:form});}}>Marcar como no show</Btn>
            <Btn v="danger" onClick={()=>{closeD();setDlg({type:"cancelar",t:form});}}>Cancelar turno</Btn>
          </div>}
          {form.estado==="confirmado"&&<Btn v="success" onClick={()=>{if(form.cliente)whatsapp(form.cliente,form);}}>Enviar confirmación WhatsApp</Btn>}
          {form.estado==="cancelado"&&<div style={{fontSize:13,color:"var(--color-text-secondary)",textAlign:"center"}}>Turno cancelado{form.sena>0?" — seña devuelta en caja":""}</div>}
          <Div/>
          <Btn v="ghost" onClick={()=>openD("espera",{fecha_esp:form.fecha,hora_esp:form.hora})} style={{width:"100%",textAlign:"center"}}>+ Agregar a lista de espera</Btn>
        </>}
      </Drawer>

      {/* DRAWER: CLIENTE */}
      <Drawer show={drawer==="cliente"} onClose={closeD} title={form.id?"Editar cliente":"Nuevo cliente"}>
        <Inp label="Nombre completo" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
        <Inp label="Teléfono" type="text" value={form.telefono||""} onChange={sf("telefono")}/>
        <R2>
          <Sel label="Nivel" value={form.nivel||"intermedio"} onChange={sf("nivel")}>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </Sel>
        </R2>
        <Inp label="Notas" type="text" value={form.notas||""} onChange={sf("notas")}/>
        <Div/>
        <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
          {form.id&&<Btn v="danger" onClick={()=>setDlg({type:"eliminarCliente",id:form.id,nombre:form.nombre})}>Eliminar cliente</Btn>}
          <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
            <Btn onClick={closeD}>Cancelar</Btn>
            <Btn v="primary" onClick={guardarCliente} disabled={saving}>{saving?"Guardando...":form.id?"Guardar cambios":"Agregar cliente"}</Btn>
          </div>
        </div>
      </Drawer>

      {/* DRAWER: ABONO */}
      <Drawer show={drawer==="abono"} onClose={closeD} title="Registrar abono">
        <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}>
          <option value="">Seleccioná un cliente</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Sel>
        <Sel label="Plan" value={form.plan_id||""} onChange={e=>{const p=pById(Number(e.target.value));setForm(f=>({...f,plan_id:e.target.value,precio_acordado:p?.precio||""}));}}>
          <option value="">Seleccioná un plan</option>
          {planes.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.horas_semana}hs/sem — {gs(p.precio)}</option>)}
        </Sel>
        <Inp label="Precio acordado (Gs)" type="number" value={form.precio_acordado||""} onChange={sf("precio_acordado")}/>
        <Inp label="Fecha de inicio" type="date" value={form.fecha_inicio||""} onChange={sf("fecha_inicio")}/>
        <Div/>
        <div style={{marginBottom:10}}>
          <label style={lbl}>Turnos fijos semanales</label>
          <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:10}}>
            {form.plan_id?`Este plan incluye ${pById(Number(form.plan_id))?.horas_semana||0} hs/semana`:"Seleccioná un plan primero"}
          </div>
          {(form.slots||[]).map((slot,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
              <select style={{...inp,flex:1}} value={slot.dia} onChange={e=>setForm(f=>({...f,slots:f.slots.map((s,j)=>j===i?{...s,dia:e.target.value}:s)}))}>
                {DIAS_FULL.map((d,j)=><option key={j} value={j}>{d}</option>)}
              </select>
              <select style={{...inp,flex:1}} value={slot.hora} onChange={e=>setForm(f=>({...f,slots:f.slots.map((s,j)=>j===i?{...s,hora:e.target.value}:s)}))}>
                {horas.map(h=><option key={h} value={h}>{h}:00</option>)}
              </select>
              <button type="button" onClick={()=>setForm(f=>({...f,slots:f.slots.filter((_,j)=>j!==i)}))} style={{border:"none",background:C.dangerL,color:C.danger,borderRadius:6,padding:"6px 10px",cursor:"pointer",fontFamily:"var(--font-sans)",fontSize:13}}>×</button>
            </div>
          ))}
          <button type="button" onClick={()=>setForm(f=>({...f,slots:[...(f.slots||[]),{dia:1,hora:cfg.hora_inicio}]}))} style={{...{border:`0.5px dashed ${C.coral}`,background:"transparent",color:C.coral,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"var(--font-sans)",fontSize:13,width:"100%",marginTop:4}}}>+ Agregar turno</button>
        </div>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:16}}>El vencimiento se calcula a 30 días. Los turnos aparecen automáticamente en la agenda.</div>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={guardarAbono} disabled={saving}>{saving?"Guardando...":"Registrar abono"}</Btn></div>
      </Drawer>

      {/* DRAWER: PLAN */}
      <Drawer show={drawer==="plan"} onClose={closeD} title={form.id?"Editar plan":"Nuevo plan"}>
        <Inp label="Nombre del plan" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
        <R2>
          <Inp label="Horas por semana" type="number" value={form.horas_semana||""} onChange={sf("horas_semana")}/>
          <Inp label="Precio mensual (Gs)" type="number" value={form.precio||""} onChange={sf("precio")}/>
        </R2>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={guardarPlan} disabled={saving}>{saving?"Guardando...":"Guardar plan"}</Btn></div>
      </Drawer>

      {/* DRAWER: INSTRUCTOR */}
      <Drawer show={drawer==="instructor"} onClose={closeD} title="Nuevo instructor">
        <Inp label="Nombre" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
        <Inp label="Teléfono" type="text" value={form.telefono||""} onChange={sf("telefono")}/>
        <Inp label="Tarifa por clase (Gs)" type="number" value={form.tarifa_clase||""} onChange={sf("tarifa_clase")}/>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={guardarInstructor} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
      </Drawer>

      {/* DRAWER: MOV CAJA */}
      <Drawer show={drawer==="movCaja"} onClose={closeD} title="Registrar movimiento">
        <Inp label="Descripción" type="text" value={form.descripcion||""} onChange={sf("descripcion")} autoFocus/>
        <R2>
          <Inp label="Monto (Gs)" type="number" value={form.monto||""} onChange={sf("monto")}/>
          <Sel label="Tipo" value={form.tipo||"egreso"} onChange={sf("tipo")}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></Sel>
        </R2>
        <Sel label="Categoría" value={form.categoria||"gasto"} onChange={sf("categoria")}>
          <option value="gasto">Gasto operativo</option>
          <option value="stock">Stock / compra</option>
          <option value="otro">Otro</option>
        </Sel>
        <Inp label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={guardarMovCaja} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
      </Drawer>

      {/* DRAWER: STOCK ITEM */}
      <Drawer show={drawer==="stockItem"} onClose={closeD} title={form.id?"Editar producto":"Nuevo producto"}>
        <Inp label="Nombre" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
        <Sel label="Categoría" value={form.categoria||"general"} onChange={sf("categoria")}>
          <option value="pelotas">Pelotas</option><option value="paletas">Paletas</option><option value="bebidas">Bebidas</option><option value="accesorios">Accesorios</option><option value="general">General</option>
        </Sel>
        <R2><Inp label="Cantidad actual" type="number" value={form.cantidad??""} onChange={sf("cantidad")}/><Inp label="Stock mínimo (alerta)" type="number" value={form.minimo??""} onChange={sf("minimo")}/></R2>
        <R2><Inp label="Precio venta (Gs)" type="number" value={form.precio_venta??""} onChange={sf("precio_venta")}/><Inp label="Precio costo (Gs)" type="number" value={form.precio_costo??""} onChange={sf("precio_costo")}/></R2>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={guardarStock} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
      </Drawer>

      {/* DRAWER: MOVER STOCK */}
      <Drawer show={drawer==="moverStock"} onClose={closeD} title="Movimiento de stock">
        <Sel label="Producto" value={form.stock_id||""} onChange={sf("stock_id")}>
          <option value="">Seleccioná un producto</option>
          {stock.map(s=><option key={s.id} value={s.id}>{s.nombre} (stock: {s.cantidad})</option>)}
        </Sel>
        <R2>
          <Sel label="Tipo" value={form.tipo_mov||"salida"} onChange={sf("tipo_mov")}><option value="entrada">Entrada</option><option value="salida">Salida / Venta</option></Sel>
          <Inp label="Cantidad" type="number" value={form.cantidad_mov||""} onChange={sf("cantidad_mov")}/>
        </R2>
        <Inp label="Motivo" type="text" value={form.motivo||""} onChange={sf("motivo")}/>
        <div style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:16}}>Las salidas con precio registran ingreso en caja automáticamente. Las entradas registran el egreso.</div>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={moverStock} disabled={saving}>{saving?"Guardando...":"Confirmar"}</Btn></div>
      </Drawer>

      {/* DRAWER: LISTA ESPERA */}
      <Drawer show={drawer==="espera"} onClose={closeD} title="Agregar a lista de espera">
        <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}><option value="">Seleccioná un cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel>
        <R2>
          <Inp label="Fecha" type="date" value={form.fecha_esp||""} onChange={sf("fecha_esp")}/>
          <FG label="Hora"><select style={inp} value={form.hora_esp??""} onChange={sf("hora_esp")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></FG>
        </R2>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={agregarEspera} disabled={saving}>{saving?"Guardando...":"Agregar"}</Btn></div>
      </Drawer>

      {/* DRAWER: CONFIG */}
      <Drawer show={drawer==="config"} onClose={closeD} title="Configuración del club">
        <Inp label="Nombre del club" type="text" value={form.nombre_club||""} onChange={sf("nombre_club")}/>
        <R2><Inp label="Tarifa base (Gs)" type="number" value={form.tarifa_base||""} onChange={sf("tarifa_base")}/><Inp label="Tarifa pico (Gs)" type="number" value={form.tarifa_pico||""} onChange={sf("tarifa_pico")}/></R2>
        <R2>
          <FG label="Hora pico inicio"><select style={inp} value={form.hora_pico_inicio??""} onChange={sf("hora_pico_inicio")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></FG>
          <FG label="Hora pico fin"><select style={inp} value={form.hora_pico_fin??""} onChange={sf("hora_pico_fin")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></FG>
        </R2>
        <R2>
          <FG label="Apertura"><select style={inp} value={form.hora_inicio??""} onChange={sf("hora_inicio")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></FG>
          <FG label="Cierre"><select style={inp} value={form.hora_fin??""} onChange={sf("hora_fin")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></FG>
        </R2>
        <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeD}>Cancelar</Btn><Btn v="primary" onClick={guardarConfig} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
      </Drawer>

      {/* DIALOGS */}
      <Dialog show={dlg?.type==="confirmar"} title="Confirmar cobro" msg={`¿Cobrar ${gs((dlg?.t?.precio||0)-(dlg?.t?.sena||0))} a ${cById(dlg?.t?.cliente_id)?.nombre||"?"}? Se registra en caja.`} onOk={()=>confirmarTurno(dlg.t)} onCancel={()=>setDlg(null)} okLabel="✓ Confirmar cobro" okV="success"/>
      <Dialog show={dlg?.type==="cancelar"} title="Cancelar turno" msg={`¿Cancelar el turno de ${cById(dlg?.t?.cliente_id)?.nombre||"?"}?${dlg?.t?.sena>0?" La seña se devuelve como egreso en caja.":""}`} onOk={()=>cancelarTurno(dlg.t)} onCancel={()=>setDlg(null)} okLabel="Cancelar turno" okV="danger"/>
      <Dialog show={dlg?.type==="noshow"} title="Marcar como no show" msg={`${cById(dlg?.t?.cliente_id)?.nombre||"?"} no se presentó. ¿Confirmás?`} onOk={()=>noShow(dlg.t)} onCancel={()=>setDlg(null)} okLabel="Marcar no show" okV="danger"/>
      <Dialog show={dlg?.type==="eliminarCliente"} title="Eliminar cliente" msg={`¿Eliminar a ${dlg?.nombre}? Se borran todos sus turnos y datos.`} onOk={()=>eliminarCliente(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Eliminar" okV="danger"/>
      <Dialog show={dlg?.type==="cancelarAbono"} title="Cancelar abono" msg={`¿Cancelar el abono de ${dlg?.nombre}? Sus turnos fijos dejarán de aparecer en la agenda.`} onOk={()=>cancelarAbono(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Cancelar abono" okV="danger"/>
    </div>
  );


}