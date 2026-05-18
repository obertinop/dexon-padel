import React, { useState, useEffect, useCallback, useRef } from "react";

// ── lib ──
import { C, DIAS, DIAS_FULL, MESES, card, metric, inp, lbl, LOGO, LOGO_STYLE_DARK } from "./lib/constants.js";
import { auth, api, db, apiHeaders } from "./lib/api.js";
import { useIsMobile, useFeriados } from "./lib/hooks.js";
import { gs, hoy, fmtFechaLegible, fmtD, initials, avatarBg, avatarFg, genRefCode } from "./lib/utils.js";

// ── components ──
import Login from "./components/Login.js";
import PortalCliente from "./components/PortalCliente.js";
import LandingPage from "./components/LandingPage.js";
import ResultadoPago from "./components/ResultadoPago.js";
import WhatsAppPanel, { ReenviarConfirmacionBtn } from "./components/WhatsAppPanel.js";
import DiasBloquedosPanel from "./components/DiasBloquedosPanel.js";
import { Avatar, WhatsAppIcon, Badge, Btn, FG, Inp, Sel, R2, Div, Empty, estadoBadge, tipoBadge, Modal, Dialog } from "./components/UI.js";

// ── context & tabs ──
import { AdminContext } from "./context/AdminContext.js";
import HoyTab from "./tabs/Hoy.js";
import PendientesTab from "./tabs/Pendientes.js";
import AgendaTab from "./tabs/Agenda.js";
import ClientesTab from "./tabs/Clientes.js";
import AbonadosTab from "./tabs/Abonados.js";
import CajaTab from "./tabs/Caja.js";
import StockTab from "./tabs/Stock.js";
import StatsTab from "./tabs/Stats.js";
import ConfigTab from "./tabs/Config.js";

export default function App() {
  const isMobile = useIsMobile();
  const esResultado = window.location.pathname.startsWith("/reserva-resultado");
  if(esResultado) return <ResultadoPago/>;
  const esPortal = window.location.pathname.startsWith("/reservar");
  if(esPortal) return <PortalCliente/>;
  const esAdmin = window.location.pathname.startsWith("/admin");
  if(!esAdmin) return <LandingPage onAdmin={()=>window.location.href="/admin"}/>;

  const [tab,setTab] = useState("agenda");
  const [navOpen,setNavOpen] = useState(false);
  const [cajaFechaIni,setCajaFechaIni] = useState("");
  const [cajaFechaFin,setCajaFechaFin] = useState("");
  const [cajaTipo,setCajaTipo] = useState("");
  const [isRefreshing,setIsRefreshing] = useState(false);
  const [session,setSession] = useState(()=>{
    const tk=localStorage.getItem("dx_token");
    const u=localStorage.getItem("dx_user");
    return tk?{token:tk,user:u?JSON.parse(u):null}:null;
  });
  const [data,setData] = useState({turnos:[],clientes:[],abonos:[],planes:[],instructores:[],caja:[],stock:[],espera:[],abono_turnos:[],codigos_ref:[],turno_items:[],cfg:{id:1,nombre_club:"DEXON PADEL",hora_inicio:10,hora_fin:24,tarifa_base:80000,tarifa_pico:100000,hora_pico_inicio:19,hora_pico_fin:22}});
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [semOff,setSemOff] = useState(0);
  const [modal,setModal] = useState(null);
  const [dlg,setDlg] = useState(null);
  const [form,setForm] = useState({});
  const [msg,setMsg] = useState("");
  const [msgType,setMsgType] = useState("info");
  const msgTimerRef = useRef(null);
  const notify = useCallback((text,type="info")=>{
    setMsg(text);
    setMsgType(type);
    if(msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current=setTimeout(()=>setMsg(""), type==="error"?4000:2600);
  },[]);
  const [reprogramFecha,setReprogramFecha] = useState("");
  const [reprogramHora,setReprogramHora] = useState("");
  const [clima,setClima] = useState(null);
  const [waConvAbierta,setWaConvAbierta] = useState(null);
  const [waNoLeidos,setWaNoLeidos] = useState(0);
  const [pendSel,setPendSel] = useState(new Set());
  const [pendFiltro,setPendFiltro] = useState("todos");
  const [cmdOpen,setCmdOpen] = useState(false);
  const [cmdQ,setCmdQ] = useState("");
  const {getFeriado,feriados} = useFeriados();
  const [diasBloqueados,setDiasBloqueados] = useState([]);
  const [dayConfigFecha,setDayConfigFecha] = useState(null);
  const [draggingId,setDraggingId] = useState(null);
  const [dragOver,setDragOver] = useState(null);
  useEffect(()=>{
    const clear=()=>{setDraggingId(null);setDragOver(null);};
    document.addEventListener("dragend",clear);
    return()=>document.removeEventListener("dragend",clear);
  },[]);
  const [nowTime,setNowTime] = useState(()=>new Date());
  const [agendaDiaIdx,setAgendaDiaIdx] = useState(()=>((new Date().getDay()+6)%7));
  const [sidebarCol,setSidebarCol] = useState(()=>localStorage.getItem("dx_sidebarCol")==="1");
  useEffect(()=>{localStorage.setItem("dx_sidebarCol",sidebarCol?"1":"0");},[sidebarCol]);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const [iosBannerDismissed,setIosBannerDismissed] = useState(()=>!!localStorage.getItem("dx_ios_banner_dismissed"));
  const showIosBanner = isIOS && !isStandalone && !iosBannerDismissed;
  const tk = session?.token;

  const load = useCallback(async()=>{
    if(!tk) return;
    setIsRefreshing(true);
    try {
      const [tu,cl,ab,pl,ins,ca,st,es,cf,at,cr,ti,db2] = await Promise.all([
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
        db.get("codigos_referido","order=created_at.desc",tk),
        db.get("turno_items","order=created_at.asc",tk),
        db.get("dias_bloqueados","order=fecha.asc",tk),
      ]);
      setData(prev=>({turnos:tu||[],clientes:cl||[],abonos:ab||[],planes:pl||[],instructores:ins||[],caja:ca||[],stock:st||[],espera:es||[],abono_turnos:at||[],codigos_ref:cr||[],turno_items:ti||[],cfg:cf?.[0]||prev.cfg}));
      setDiasBloqueados(db2||[]);
    } catch(e){console.error(e);}
    setIsRefreshing(false);
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

  useEffect(()=>{
    if(!tk) return;
    const loadWaBadge=()=>fetch("/api/whatsapp/mensajes?limit=500").then(r=>r.json()).then(d=>setWaNoLeidos(Array.isArray(d)?d.filter(m=>!m.leido).length:0)).catch(()=>{});
    loadWaBadge();
    const interval=setInterval(()=>{load();loadWaBadge();},10*1000);
    return()=>clearInterval(interval);
  },[tk,load]);

  useEffect(()=>{
    const h=(e)=>{
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setCmdOpen(o=>{if(!o)setCmdQ("");return !o;});}
      if(e.key==="Escape")setCmdOpen(false);
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);

  useEffect(()=>{
    const t=setInterval(()=>setNowTime(new Date()),60000);
    return()=>clearInterval(t);
  },[]);

  const doLogout = async()=>{
    if(session?.token) await auth.logout(session.token);
    localStorage.removeItem("dx_token");
    localStorage.removeItem("dx_user");
    setSession(null);
  };

  if(!session) return <Login onLogin={(token,user)=>setSession({token,user})}/>;

  const {turnos,clientes,abonos,planes,instructores,caja,stock,abono_turnos,codigos_ref,turno_items,cfg} = data;
  const getHorasForDay = (dayOfWeek)=>{
    if(!cfg.horarios_por_dia) return Array.from({length:cfg.hora_fin-cfg.hora_inicio},(_,i)=>cfg.hora_inicio+i);
    try {
      const hor=JSON.parse(cfg.horarios_por_dia);
      const h=hor[dayOfWeek]||{inicio:cfg.hora_inicio,fin:cfg.hora_fin};
      return Array.from({length:h.fin-h.inicio},(_,i)=>h.inicio+i);
    } catch { return Array.from({length:cfg.hora_fin-cfg.hora_inicio},(_,i)=>cfg.hora_inicio+i); }
  };
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
    if(turnos.find(t=>t.fecha===form.fecha&&t.hora===Number(form.hora)&&t.estado!=="cancelado")){notify("Ese horario ya está ocupado","error");return;}
    setSaving(true);
    try {
      const precio=form.tipo==="clase"?Number(form.precio_clase||0):precioTurno(Number(form.hora));
      const sena=Number(form.sena||0);
      const[t]=await db.post("turnos",{fecha:form.fecha,hora:Number(form.hora),tipo:form.tipo||"ocasional",estado:"reservado",cliente_id:Number(form.cliente_id),instructor_id:form.instructor_id?Number(form.instructor_id):null,precio,sena,saldo:precio-sena,notas:form.notas||""},tk);
      if(sena>0)await db.post("caja",{descripcion:`Seña - ${cById(Number(form.cliente_id))?.nombre||"?"}`,tipo:"ingreso",categoria:"reserva",monto:sena,fecha:form.fecha,turno_id:t.id},tk);
      await load();closeM();
      const c=cById(Number(form.cliente_id));
      if(c?.telefono){const wm=`¡Hola ${c.nombre}! 🎾\nTu reserva en *${cfg.nombre_club}* está confirmada:\n📅 *${form.fecha}* a las *${Number(form.hora)}:00hs*\n💰 *${gs(precio)}*\n¡Te esperamos!`;setDlg({type:"wsp",cliente:c,msg:wm});}
    } catch(e){notify(e.message,"error");}
    setSaving(false);
  };

  const confirmarTurno = async t=>{
    setSaving(true);
    try{const saldo=t.precio-(t.sena||0);await db.patch("turnos",t.id,{estado:"confirmado",cobrado:true,saldo:0},tk);if(saldo>0)await db.post("caja",{descripcion:`Reserva - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"ingreso",categoria:t.tipo==="clase"?"clase":"reserva",monto:saldo,fecha:t.fecha,turno_id:t.id},tk);
    const[c]=await db.get("clientes",`id=eq.${t.cliente_id}`,tk);if(c?.telefono){fetch("/api/whatsapp/enviar",{method:"POST",headers:apiHeaders(),body:JSON.stringify({tipo:"confirmacion_manual",nombre:c.nombre,telefono:c.telefono,fecha:fmtFechaLegible(t.fecha),horarios:`${t.hora}:00hs`,monto:gs(t.precio),forma_pago:t.metodo_pago==="transferencia"?"Transferencia bancaria":"Efectivo"})}).catch(()=>{});}
    setDlg(null);await load();}
    catch(e){notify(e.message,"error");}
    setSaving(false);
  };
  const cancelarTurno = async t=>{
    setSaving(true);
    try{await db.patch("turnos",t.id,{estado:"cancelado"},tk);if(t.sena>0)await db.post("caja",{descripcion:`Dev. seña - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"egreso",categoria:"reserva",monto:t.sena,fecha:hoy(),turno_id:t.id},tk);setDlg(null);closeM();await load();}
    catch(e){notify(e.message,"error");}
    setSaving(false);
  };
  const noShow = async t=>{setSaving(true);try{await db.patch("turnos",t.id,{estado:"no_show"},tk);setDlg(null);closeM();await load();}catch(e){notify(e.message,"error");}setSaving(false);};
  const confirmarBulk = async ids=>{
    setSaving(true);
    try{
      await Promise.all(ids.map(async id=>{
        const t=turnos.find(x=>x.id===id);if(!t)return;
        const saldo=t.precio-(t.sena||0);
        await db.patch("turnos",id,{estado:"confirmado",cobrado:true,saldo:0},tk);
        if(saldo>0)await db.post("caja",{descripcion:`Reserva - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"ingreso",categoria:t.tipo==="clase"?"clase":"reserva",monto:saldo,fecha:t.fecha,turno_id:t.id},tk);
        const[c]=await db.get("clientes",`id=eq.${t.cliente_id}`,tk);
        if(c?.telefono){fetch("/api/whatsapp/enviar",{method:"POST",headers:apiHeaders(),body:JSON.stringify({tipo:"confirmacion_manual",nombre:c.nombre,telefono:c.telefono,fecha:fmtFechaLegible(t.fecha),horarios:`${t.hora}:00hs`,monto:gs(t.precio),forma_pago:t.metodo_pago==="transferencia"?"Transferencia bancaria":"Efectivo"})}).catch(()=>{});}
      }));
      await load();notify(`${ids.length} turno${ids.length!==1?"s":""} confirmado${ids.length!==1?"s":""}!`,"ok");
      setPendSel(new Set());
    }catch(e){notify(e.message,"error");}
    setSaving(false);
  };
  const cancelarBulk = async ids=>{
    setSaving(true);
    try{
      await Promise.all(ids.map(async id=>{
        const t=turnos.find(x=>x.id===id);if(!t)return;
        await db.patch("turnos",id,{estado:"cancelado"},tk);
        if(t.sena>0)await db.post("caja",{descripcion:`Dev. seña - ${cById(t.cliente_id)?.nombre||"?"}`,tipo:"egreso",categoria:"reserva",monto:t.sena,fecha:hoy(),turno_id:t.id},tk);
      }));
      await load();notify(`${ids.length} turno${ids.length!==1?"s":""} cancelado${ids.length!==1?"s":""}!`,"ok");
      setPendSel(new Set());
    }catch(e){notify(e.message,"error");}
    setSaving(false);
  };
  const guardarCliente = async()=>{
    if(!form.nombre?.trim())return;setSaving(true);
    try{const p={nombre:form.nombre.trim(),telefono:form.telefono||"",nivel:form.nivel||"intermedio",notas:form.notas||"",referrer_code:form.referrer_code||null,saldo_favor:Number(form.saldo_favor||0)};if(form.id)await db.patch("clientes",form.id,p,tk);else await db.post("clientes",p,tk);await load();closeM();}
    catch(e){notify(e.message,"error");}setSaving(false);
  };
  const eliminarCliente = async id=>{setSaving(true);try{await db.del("clientes",id,tk);await load();setDlg(null);closeM();}catch(e){notify(e.message,"error");}setSaving(false);};
  const guardarAbono = async()=>{
    if(!form.cliente_id||!form.plan_id||!form.fecha_inicio)return;
    if(!form.slots||form.slots.length===0){notify("Agregá al menos un turno fijo","error");return;}
    setSaving(true);
    try{
      const plan=pById(Number(form.plan_id));
      const ini=new Date(form.fecha_inicio);
      const venc=new Date(ini);venc.setMonth(venc.getMonth()+1);
      const precio=Number(form.precio_acordado||plan?.precio||0);
      const[ab]=await db.post("abonos",{cliente_id:Number(form.cliente_id),plan_id:Number(form.plan_id),precio_acordado:precio,fecha_inicio:fmtD(ini),fecha_vencimiento:fmtD(venc),estado:"activo",turno_hora:null},tk);
      for(const s of form.slots) await db.post("abono_turnos",{abono_id:ab.id,dia:Number(s.dia),hora:Number(s.hora)},tk);
      await db.post("caja",{descripcion:`Abono ${plan?.nombre||""} - ${cById(Number(form.cliente_id))?.nombre||"?"}`,tipo:"ingreso",categoria:"abono",monto:precio,fecha:fmtD(ini),abono_id:ab.id},tk);
      // Materializar turnos reales para las próximas 5 semanas
      await materilarizarTurnosAbono(ab.id,Number(form.cliente_id),form.slots,fmtD(venc));
      await load();closeM();
    }catch(e){notify(e.message,"error");}setSaving(false);
  };

  const materilarizarTurnosAbono = async(abonoId,clienteId,slots,fechaVenc)=>{
    const hoy_=new Date();
    const turnosACrear=[];
    for(let semana=0;semana<5;semana++){
      for(const s of slots){
        // Encontrar el próximo día de la semana indicado
        const d=new Date(hoy_);
        const diasHasta=(Number(s.dia)-d.getDay()+7)%7+(semana*7);
        d.setDate(d.getDate()+diasHasta);
        const fs=fmtD(d);
        if(fs>fechaVenc) continue;
        // Solo si no hay ya un turno en ese horario
        const yaExiste=turnos.find(t=>t.fecha===fs&&t.hora===Number(s.hora)&&t.estado!=="cancelado");
        if(!yaExiste) turnosACrear.push({fecha:fs,hora:Number(s.hora),tipo:"abono",estado:"confirmado",cliente_id:clienteId,abono_id:abonoId,precio:0,sena:0,saldo:0,notas:"Turno fijo de abono"});
      }
    }
    if(turnosACrear.length>0) await db.post("turnos",turnosACrear,tk);
  };
  const cancelarAbono = async id=>{setSaving(true);try{await db.patch("abonos",id,{estado:"cancelado"},tk);await load();setDlg(null);}catch(e){notify(e.message,"error");}setSaving(false);};
  const guardarPlan = async()=>{if(!form.nombre||!form.horas_semana||!form.precio)return;setSaving(true);try{if(form.id)await db.patch("planes",form.id,{nombre:form.nombre,horas_semana:Number(form.horas_semana),precio:Number(form.precio)},tk);else await db.post("planes",{nombre:form.nombre,horas_semana:Number(form.horas_semana),precio:Number(form.precio)},tk);await load();closeM();}catch(e){notify(e.message,"error");}setSaving(false);};
  const guardarInstructor = async()=>{if(!form.nombre?.trim())return;setSaving(true);try{await db.post("instructores",{nombre:form.nombre.trim(),telefono:form.telefono||"",tarifa_clase:Number(form.tarifa_clase||0)},tk);await load();closeM();}catch(e){notify(e.message,"error");}setSaving(false);};
  const guardarMovCaja = async()=>{if(!form.descripcion||!form.monto)return;setSaving(true);try{await db.post("caja",{descripcion:form.descripcion,tipo:form.tipo||"egreso",categoria:form.categoria||"gasto",monto:Number(form.monto),fecha:form.fecha||hoy()},tk);await load();closeM();}catch(e){notify(e.message,"error");}setSaving(false);};
  const eliminarMovCaja = async id=>{setSaving(true);try{await db.del("caja",id,tk);await load();setDlg(null);}catch(e){notify(e.message,"error");}setSaving(false);};
  const guardarStock = async()=>{if(!form.nombre?.trim()||form.cantidad===undefined)return;setSaving(true);try{const p={nombre:form.nombre,categoria:form.categoria||"general",cantidad:Number(form.cantidad),minimo:Number(form.minimo||0),precio_venta:Number(form.precio_venta||0),precio_costo:Number(form.precio_costo||0)};if(form.id)await db.patch("stock",form.id,p,tk);else await db.post("stock",p,tk);await load();closeM();}catch(e){notify(e.message,"error");}setSaving(false);};
  const moverStock = async()=>{if(!form.stock_id||!form.cantidad_mov)return;setSaving(true);try{const item=stock.find(s=>s.id===Number(form.stock_id));if(!item)return;const delta=form.tipo_mov==="entrada"?Number(form.cantidad_mov):-Number(form.cantidad_mov);await db.patch("stock",item.id,{cantidad:Math.max(0,item.cantidad+delta)},tk);await db.post("stock_movimientos",{stock_id:item.id,tipo:form.tipo_mov,cantidad:Number(form.cantidad_mov),motivo:form.motivo||"",fecha:hoy()},tk);if(form.tipo_mov==="salida"&&item.precio_venta>0)await db.post("caja",{descripcion:`Venta - ${item.nombre} x${form.cantidad_mov}`,tipo:"ingreso",categoria:"stock",monto:item.precio_venta*Number(form.cantidad_mov),fecha:hoy()},tk);if(form.tipo_mov==="entrada"&&item.precio_costo>0)await db.post("caja",{descripcion:`Compra - ${item.nombre} x${form.cantidad_mov}`,tipo:"egreso",categoria:"stock",monto:item.precio_costo*Number(form.cantidad_mov),fecha:hoy()},tk);await load();closeM();}catch(e){notify(e.message,"error");}setSaving(false);};
  const guardarConfig = async()=>{setSaving(true);try{
    const dias=Array.isArray(form.desc_martes_jueves_dias)?form.desc_martes_jueves_dias:(typeof form.desc_martes_jueves_dias==="string"?(()=>{try{return JSON.parse(form.desc_martes_jueves_dias);}catch{return[2,4];}})():[2,4]);
    await db.patch("config",cfg.id,{nombre_club:form.nombre_club,hora_inicio:Number(form.hora_inicio),hora_fin:Number(form.hora_fin),tarifa_base:Number(form.tarifa_base),tarifa_pico:Number(form.tarifa_pico),hora_pico_inicio:Number(form.hora_pico_inicio),hora_pico_fin:Number(form.hora_pico_fin),desc_martes_jueves_enabled:form.desc_martes_jueves_enabled||false,desc_martes_jueves_percent:Number(form.desc_martes_jueves_percent||20),desc_martes_jueves_dias:JSON.stringify(dias),referral_discount_percent:Number(form.referral_discount_percent||10)},tk);
    await load();closeM();
  }catch(e){notify(e.message,"error");}setSaving(false);};

  const enviarWsp = (tel,msg)=>{const t=(tel||"").replace(/\D/g,"");const n=t.startsWith("595")?t:t.startsWith("0")?"595"+t.slice(1):"595"+t;window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`,"_blank");};

  // ── Códigos de referido ──
  const guardarCodigoRef = async()=>{
    if(!form.codigo?.trim()||!form.nombre?.trim()) return;
    setSaving(true);
    try {
      const p={codigo:form.codigo.trim().toUpperCase(),nombre:form.nombre.trim(),tipo:form.tipo||"socio",descuento_pct:Number(form.descuento_pct||10),max_usos:form.max_usos?Number(form.max_usos):null,activo:form.activo!==false,notas:form.notas||""};
      if(form.id) await db.patch("codigos_referido",form.id,p,tk);
      else { p.usos_actuales=0; await db.post("codigos_referido",p,tk); }
      await load(); closeM();
    } catch(e){notify(e.message,"error");}
    setSaving(false);
  };
  const eliminarCodigoRef = async id=>{setSaving(true);try{await db.del("codigos_referido",id,tk);await load();setDlg(null);}catch(e){notify(e.message,"error");}setSaving(false);};

  // ── Items vendidos en turno (pendiente de cobro — no registra caja hasta cobro manual) ──
  const agregarItemTurno = async()=>{
    if(!form.id||!form.item_stock_id||!form.item_cantidad) return;
    setSaving(true);
    try {
      const item=stock.find(s=>s.id===Number(form.item_stock_id));
      if(!item) return;
      const cant=Number(form.item_cantidad);
      const precioUnit=Number(form.item_precio_unit||item.precio_venta||0);
      // Solo registra el item y descuenta stock. Caja queda para cobro manual.
      await db.post("turno_items",{turno_id:form.id,stock_id:item.id,nombre:item.nombre,cantidad:cant,precio_unitario:precioUnit,cobrado:false},tk);
      await db.patch("stock",item.id,{cantidad:Math.max(0,item.cantidad-cant)},tk);
      await load();
      setForm(f=>({...f,item_stock_id:"",item_cantidad:1,item_precio_unit:""}));
    } catch(e){notify(e.message,"error");}
    setSaving(false);
  };
  const cobrarItemsTurno = async(turnoId)=>{
    const items=turno_items.filter(i=>i.turno_id===turnoId&&!i.cobrado);
    if(!items.length) return;
    setSaving(true);
    try {
      const turno=turnos.find(t=>t.id===turnoId);
      const cliente=clientes.find(c=>c.id===turno?.cliente_id);
      for(const i of items){
        await db.post("caja",{descripcion:`Venta ${i.nombre} x${i.cantidad}${cliente?` — ${cliente.nombre}`:""}`,tipo:"ingreso",categoria:"stock",monto:i.precio_unitario*i.cantidad,fecha:turno?.fecha||hoy(),turno_id:turnoId},tk);
        await db.patch("turno_items",i.id,{cobrado:true},tk);
      }
      await load();
    } catch(e){notify(e.message,"error");}
    setSaving(false);
  };
  const eliminarItemTurno = async(itemId,stockId,cant)=>{
    setSaving(true);
    try {
      const item=stock.find(s=>s.id===stockId);
      await db.del("turno_items",itemId,tk);
      if(item) await db.patch("stock",stockId,{cantidad:item.cantidad+cant},tk);
      await load();
    } catch(e){notify(e.message,"error");}
    setSaving(false);
  };

  const TABS=[
    {id:"agenda",l:"Agenda",ic:"📅"},
    {id:"hoy",l:"Hoy",ic:"🕐"},
    {id:"pendientes",l:"Pendientes",ic:"⏳"},
    {id:"clientes",l:"Clientes",ic:"👥"},
    {id:"abonados",l:"Abonados",ic:"⭐"},
    {id:"caja",l:"Caja",ic:"💰"},
    {id:"stock",l:"Stock",ic:"📦"},
    {id:"stats",l:"Stats",ic:"📊"},
    {id:"whatsapp",l:"WhatsApp",ic:"wa"},
    {id:"config",l:"Config",ic:"⚙️"},
  ];

  // ── VISTAS ADMIN ── (extracted to src/tabs/ — see imports at top)
  const navBtn=(t)=>{
    const activa=tab===t.id;
    const pendientesN=t.id==="pendientes"?turnos.filter(x=>x.estado==="pendiente_pago").length:0;
    const waN=t.id==="whatsapp"?waNoLeidos:0;
    const badge=pendientesN||waN;
    const isWA=t.id==="whatsapp";
    const collapsed=sidebarCol&&!isMobile;
    const icon=t.ic==="wa"?<WhatsAppIcon size={18}/>:<span style={{fontSize:16,lineHeight:1}}>{t.ic}</span>;
    const pick=()=>{setTab(t.id);setNavOpen(false);};
    return <button key={t.id} onClick={pick} title={collapsed?t.l:undefined}
      onMouseEnter={e=>{if(!activa)e.currentTarget.style.background=C.bgElev;}}
      onMouseLeave={e=>{if(!activa)e.currentTarget.style.background="transparent";}}
      style={{display:"flex",alignItems:"center",gap:collapsed?0:12,justifyContent:collapsed?"center":"flex-start",width:"100%",padding:collapsed?"12px 0":"12px 14px",marginBottom:3,background:activa?"rgba(224,91,40,0.10)":"transparent",border:"none",borderLeft:`3px solid ${activa?C.coral:"transparent"}`,borderRadius:"0 10px 10px 0",cursor:"pointer",color:activa?C.t1:C.t2,fontFamily:"var(--font-sans)",fontSize:13.5,fontWeight:activa?700:500,position:"relative",transition:"background 0.15s, color 0.15s",textAlign:"left"}}>
      <span style={{width:22,display:"inline-flex",alignItems:"center",justifyContent:"center",position:"relative"}}>{icon}
        {collapsed&&badge>0&&<span style={{position:"absolute",top:-5,right:-7,background:isWA?"#25D366":C.coral,color:"#fff",borderRadius:8,padding:"0 4px",fontSize:9,fontWeight:700,minWidth:14,textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.4)",lineHeight:"14px",height:14}}>{badge}</span>}
      </span>
      {!collapsed&&<span style={{flex:1}}>{t.l}</span>}
      {!collapsed&&badge>0&&<span style={{background:isWA?"#25D366":C.coral,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10.5,fontWeight:700,minWidth:18,textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}>{badge}</span>}
    </button>;
  };

  const tabActual=TABS.find(t=>t.id===tab);

  const DiaConfigModal=()=>{
    const diaActual = diasBloqueados.find(d=>d.fecha===dayConfigFecha);
    const feriado = getFeriado(dayConfigFecha);
    const [tipo,setTipo] = useState(diaActual?.tipo||"normal");
    const [motivo,setMotivo] = useState(diaActual?.motivo||"");
    const [hIni,setHIni] = useState(diaActual?.hora_inicio??cfg.hora_inicio);
    const [hFin,setHFin] = useState(diaActual?.hora_fin??cfg.hora_fin);
    const [savingDia,setSavingDia] = useState(false);
    const hOptions = Array.from({length:24},(_,i)=>i);
    const guardar = async()=>{
      setSavingDia(true);
      try{
        if(tipo==="normal"){
          if(diaActual) await api(`dias_bloqueados?id=eq.${diaActual.id}`,{method:"DELETE"},tk);
        } else if(diaActual){
          await api(`dias_bloqueados?id=eq.${diaActual.id}`,{method:"PATCH",body:JSON.stringify({tipo,motivo,hora_inicio:tipo==="horario"?Number(hIni):null,hora_fin:tipo==="horario"?Number(hFin):null}),prefer:"return=representation"},tk);
        } else {
          await api("dias_bloqueados",{method:"POST",body:JSON.stringify({fecha:dayConfigFecha,tipo,motivo,hora_inicio:tipo==="horario"?Number(hIni):null,hora_fin:tipo==="horario"?Number(hFin):null}),prefer:"return=representation"},tk);
        }
        await load(); setDayConfigFecha(null);
      }catch(e){notify(e.message,"error");}
      setSavingDia(false);
    };
    const label = dayConfigFecha ? fmtFechaLegible(dayConfigFecha) : "";
    return <Modal show={!!dayConfigFecha} onClose={()=>setDayConfigFecha(null)} title={`Configurar — ${label}`} width={400}>
      {feriado&&<div style={{background:"rgba(245,192,96,0.08)",border:`1px solid ${C.yellowBd}`,borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>🇵🇾</span>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:C.yellow}}>{feriado.localName}</div>
          <div style={{fontSize:11,color:C.t3,marginTop:2}}>Feriado nacional</div>
        </div>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {[{v:"normal",label:"Normal",desc:"Horario habitual del día",icon:"✅"},
          {v:"horario",label:"Horario especial",desc:"Definís apertura y cierre para este día",icon:"🕐"},
          {v:"bloqueado",label:"Cancha cerrada",desc:"No se pueden hacer reservas",icon:"🔒"},
        ].map(op=><button key={op.v} onClick={()=>setTipo(op.v)}
          style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,
            border:`2px solid ${tipo===op.v?C.coral:C.border}`,
            background:tipo===op.v?"rgba(224,91,40,0.08)":"transparent",
            cursor:"pointer",textAlign:"left",fontFamily:"var(--font-sans)"}}>
          <span style={{fontSize:20,flexShrink:0}}>{op.icon}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:tipo===op.v?C.coral:C.t1}}>{op.label}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:1}}>{op.desc}</div>
          </div>
        </button>)}
      </div>
      {tipo==="horario"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div><label style={lbl}>Apertura</label>
          <select value={hIni} onChange={e=>setHIni(Number(e.target.value))} style={inp}>
            {hOptions.map(h=><option key={h} value={h}>{h}:00</option>)}
          </select>
        </div>
        <div><label style={lbl}>Cierre</label>
          <select value={hFin} onChange={e=>setHFin(Number(e.target.value))} style={inp}>
            {hOptions.map(h=><option key={h} value={h}>{h}:00</option>)}
          </select>
        </div>
      </div>}
      {tipo==="bloqueado"&&<div style={{marginBottom:16}}>
        <label style={lbl}>Motivo</label>
        <input value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ej: Mantenimiento, lluvia..." style={inp}/>
      </div>}
      <button onClick={guardar} disabled={savingDia} style={{width:"100%",padding:"12px",background:C.coral,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:savingDia?"wait":"pointer",fontFamily:"var(--font-sans)"}}>
        {savingDia?"Guardando...":"Guardar"}
      </button>
    </Modal>;
  };

  const skeletonBg=`linear-gradient(90deg,${C.bgElev} 25%,${C.bgCard} 50%,${C.bgElev} 75%)`;
  const SK=({h=60,r=10,mb=8})=><div style={{height:h,borderRadius:r,marginBottom:mb,background:skeletonBg,backgroundSize:"400% 100%",animation:"shimmer 1.5s ease infinite"}}/>;
  const contenidoTab=loading
    ?<div style={{display:"grid",gap:0}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:12}}>{[0,1,2,3].map(i=><SK key={i} h={76} r={12} mb={0}/>)}</div>
      <SK h={52}/><SK h={52}/><SK h={52}/><SK h={52}/><SK h={52}/>
    </div>
    :<>{tab==="hoy"&&<HoyTab/>}{tab==="pendientes"&&<PendientesTab/>}{tab==="agenda"&&<AgendaTab/>}{tab==="clientes"&&<ClientesTab/>}{tab==="abonados"&&<AbonadosTab/>}{tab==="caja"&&<CajaTab/>}{tab==="stock"&&<StockTab/>}{tab==="stats"&&<StatsTab/>}{tab==="whatsapp"&&<WhatsAppPanel convAbierta={waConvAbierta} setConvAbierta={setWaConvAbierta} setWaNoLeidos={setWaNoLeidos} notify={notify} isMobile={isMobile}/>}{tab==="config"&&<ConfigTab/>}</>;

  const adminCtxValue = {
    // data
    turnos, clientes, abonos, planes, instructores, caja, stock, abono_turnos, codigos_ref, turno_items, cfg,
    diasBloqueados, feriados,
    // state
    isMobile, saving, setSaving, semOff, setSemOff,
    nowTime, agendaDiaIdx, setAgendaDiaIdx,
    pendSel, setPendSel, pendFiltro, setPendFiltro,
    cajaFechaIni, setCajaFechaIni, cajaFechaFin, setCajaFechaFin, cajaTipo, setCajaTipo,
    draggingId, setDraggingId, dragOver, setDragOver,
    dayConfigFecha, setDayConfigFecha,
    reprogramFecha, setReprogramFecha, reprogramHora, setReprogramHora,
    modal, setModal, form, setForm, dlg, setDlg,
    tk,
    // derived
    horas,
    // functions
    load, notify, openM, closeM, sf,
    cById, pById, iById,
    getSemana, turnosAbonados, getHorasForDay, precioTurno,
    getFeriado, enviarWsp,
    // actions
    guardarTurno, confirmarTurno, cancelarTurno, noShow,
    confirmarBulk, cancelarBulk,
    guardarCliente, eliminarCliente,
    guardarAbono, cancelarAbono, materilarizarTurnosAbono,
    guardarPlan, guardarInstructor,
    guardarMovCaja, eliminarMovCaja,
    guardarStock, moverStock,
    guardarConfig,
    guardarCodigoRef, eliminarCodigoRef,
    agregarItemTurno, cobrarItemsTurno, eliminarItemTurno,
    db,
  };

  return <AdminContext.Provider value={adminCtxValue}><div style={{fontFamily:"var(--font-sans)",background:C.bg,minHeight:"100vh",...(isMobile?{paddingTop:"calc(56px + env(safe-area-inset-top))"}:{display:"flex",alignItems:"stretch"})}}>
    <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    {showIosBanner&&<div style={{position:"fixed",bottom:`calc(env(safe-area-inset-bottom) + 80px)`,left:12,right:12,zIndex:9999,background:"#1C2B4A",border:`1px solid ${C.borderL}`,borderRadius:16,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",display:"flex",gap:12,alignItems:"flex-start"}}>
      <div style={{fontSize:28,lineHeight:1}}>📲</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:3}}>Instalá DEXON en tu iPhone</div>
        <div style={{fontSize:12,color:C.t2,lineHeight:1.5}}>Tocá <strong style={{color:C.t1}}>Compartir</strong> <span style={{fontSize:14}}>⎙</span> y luego <strong style={{color:C.t1}}>Agregar a inicio</strong> para acceso rápido sin browser.</div>
      </div>
      <button onClick={()=>{localStorage.setItem("dx_ios_banner_dismissed","1");setIosBannerDismissed(true);}} style={{background:"none",border:"none",color:C.t3,fontSize:18,cursor:"pointer",padding:"0 2px",lineHeight:1,flexShrink:0}}>✕</button>
    </div>}
    {isMobile&&navOpen&&<div onClick={()=>setNavOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1500,backdropFilter:"blur(2px)",animation:"fadeIn 0.18s ease-out"}}/>}
    <aside style={{
      width:isMobile?276:(sidebarCol?68:224),
      flexShrink:0,
      transition:isMobile?"transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)":"width 0.22s ease",
      ...(isMobile
        ?{position:"fixed",top:0,left:0,height:"100vh",zIndex:1501,transform:navOpen?"translateX(0)":"translateX(-100%)",boxShadow:navOpen?"4px 0 32px rgba(0,0,0,0.5)":"none"}
        :{position:"sticky",top:0,height:"100vh",boxShadow:"2px 0 24px rgba(0,0,0,0.25)"}),
      background:C.bgCard,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",zIndex:isMobile?1501:50,
      paddingTop:isMobile?"env(safe-area-inset-top)":0
    }}>
      <div style={{padding:sidebarCol&&!isMobile?"18px 12px 14px":"18px 18px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,justifyContent:sidebarCol&&!isMobile?"center":"flex-start"}}>
        <img src={LOGO} alt="DEXON" onError={e=>{e.target.style.display="none";}} style={{height:52,...LOGO_STYLE_DARK}}/>
        {!(sidebarCol&&!isMobile)&&<>
          <span style={{flex:1,fontSize:11,color:C.t3,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Admin</span>
          {!isMobile&&<button onClick={()=>{setCmdOpen(true);setCmdQ("");}} title="Búsqueda rápida (⌘K)" style={{fontSize:10,color:C.t3,background:C.bgElev,border:`1px solid ${C.border}`,borderRadius:5,padding:"3px 7px",cursor:"pointer",fontFamily:"var(--font-sans)",flexShrink:0,transition:"color 0.15s"}}>⌘K</button>}
          {isMobile&&<button onClick={()=>setNavOpen(false)} aria-label="Cerrar menú" style={{background:"none",border:"none",color:C.t2,fontSize:22,cursor:"pointer",padding:4,fontFamily:"var(--font-sans)",lineHeight:1}}>×</button>}
        </>}
      </div>
      <nav style={{flex:1,overflowY:"auto",padding:"12px 0"}}>
        {TABS.map(t=>navBtn(t))}
      </nav>
      <div style={{borderTop:`1px solid ${C.border}`,padding:sidebarCol&&!isMobile?"10px 8px":"12px 14px"}}>
        {!(sidebarCol&&!isMobile)&&<div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10,opacity:isRefreshing?1:0.55,transition:"opacity 0.3s"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:isRefreshing?C.coral:C.t3,animation:isRefreshing?"pulse 1s infinite":"none"}}/>
          <span style={{fontSize:10.5,color:C.t3,letterSpacing:0.2}}>Auto-sync</span>
        </div>}
        {!isMobile&&<button onClick={()=>setSidebarCol(s=>!s)} title={sidebarCol?"Expandir menú":"Colapsar menú"} style={{width:"100%",padding:"8px",borderRadius:9,cursor:"pointer",fontFamily:"var(--font-sans)",background:"transparent",color:C.t3,border:`1px solid ${C.border}`,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:11,fontWeight:600,transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.background=C.bgElev;e.currentTarget.style.color=C.t2;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.t3;}}>
          {sidebarCol?"›":"‹  Colapsar"}
        </button>}
        <button onClick={doLogout} title={sidebarCol?"Cerrar sesión":undefined} style={{width:"100%",padding:sidebarCol&&!isMobile?"9px 0":"9px 12px",borderRadius:9,fontSize:sidebarCol&&!isMobile?16:12.5,cursor:"pointer",fontFamily:"var(--font-sans)",fontWeight:600,background:`rgba(224,91,40,0.08)`,color:C.coral,border:`1px solid ${C.coralD}`}}>{sidebarCol&&!isMobile?"⎋":"Cerrar sesión"}</button>
      </div>
    </aside>

    {/* MOBILE: barra superior compacta */}
    {isMobile&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:1000,background:C.bgCard,boxShadow:"0 2px 20px rgba(0,0,0,0.4)",borderBottom:`1px solid ${C.border}`,paddingTop:"max(6px, env(safe-area-inset-top))"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px 10px 8px",minHeight:48}}>
        <button onClick={()=>setNavOpen(true)} aria-label="Abrir menú" style={{width:38,height:38,borderRadius:9,background:"transparent",border:`1px solid ${C.border}`,color:C.t1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"var(--font-sans)",position:"relative"}}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          {(turnos.filter(x=>x.estado==="pendiente_pago").length+waNoLeidos)>0&&<span style={{position:"absolute",top:-3,right:-3,width:9,height:9,borderRadius:"50%",background:C.coral,border:`2px solid ${C.bgCard}`}}/>}
        </button>
        <img src={LOGO} alt="DEXON" onError={e=>{e.target.style.display="none";}} style={{height:40,flexShrink:0,...LOGO_STYLE_DARK}}/>
        <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:7,overflow:"hidden"}}>
          {tabActual?.ic==="wa"?<WhatsAppIcon size={15}/>:<span style={{fontSize:15,lineHeight:1,flexShrink:0}}>{tabActual?.ic}</span>}
          <span style={{fontSize:15,fontWeight:700,color:C.t1,letterSpacing:-0.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tabActual?.l}</span>
        </div>
        <button onClick={()=>{setCmdOpen(true);setCmdQ("");}} aria-label="Búsqueda rápida" style={{width:36,height:36,borderRadius:9,background:"transparent",border:`1px solid ${C.border}`,color:C.t2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"var(--font-sans)"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:5,opacity:isRefreshing?1:0.5,transition:"opacity 0.3s",flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:isRefreshing?C.coral:C.t3,animation:isRefreshing?"pulse 1s infinite":"none"}}/>
        </div>
      </div>
    </div>}

    {/* CONTENIDO */}
    <main style={{flex:1,minWidth:0,...(isMobile?{}:{maxWidth:`calc(100% - ${sidebarCol?68:224}px)`})}}>
      <div style={{maxWidth:(isMobile&&tab==="whatsapp")?"none":1040,margin:"0 auto",padding:(isMobile&&tab==="whatsapp")?0:(isMobile?"14px 12px":"24px 28px"),paddingBottom:(isMobile&&tab==="whatsapp")?0:(isMobile?"calc(env(safe-area-inset-bottom) + 88px)":"env(safe-area-inset-bottom)")}}>
        {contenidoTab}
      </div>
    </main>

    {/* FAB (mobile) */}
    {(()=>{
      if(!isMobile||navOpen||modal||dlg||cmdOpen) return null;
      const fabs={
        agenda:{l:"Reservar",a:()=>openM("turno",{fecha:hoy(),hora:cfg.hora_inicio,tipo:"ocasional"})},
        hoy:{l:"Reservar",a:()=>openM("turno",{fecha:hoy(),hora:cfg.hora_inicio,tipo:"ocasional"})},
        pendientes:{l:"Reservar",a:()=>openM("turno",{fecha:hoy(),hora:cfg.hora_inicio,tipo:"ocasional"})},
        clientes:{l:"Cliente",a:()=>openM("cliente",{nivel:"intermedio"})},
        abonados:{l:"Abono",a:()=>openM("abono",{fecha_inicio:hoy(),slots:[]})},
        caja:{l:"Movimiento",a:()=>openM("movCaja",{tipo:"egreso",categoria:"gasto",fecha:hoy()})},
        stock:{l:"Producto",a:()=>openM("stockItem",{categoria:"pelotas",cantidad:"0",minimo:"0"})},
      };
      const f=fabs[tab];
      if(!f) return null;
      return <button onClick={f.a} aria-label={`Nuevo: ${f.l}`} style={{position:"fixed",right:18,bottom:`calc(20px + env(safe-area-inset-bottom))`,width:58,height:58,borderRadius:"50%",background:`linear-gradient(135deg, ${C.coral}, ${C.coralD})`,color:"#fff",border:"none",cursor:"pointer",boxShadow:"0 8px 24px rgba(224,91,40,0.5), 0 2px 6px rgba(0,0,0,0.3)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)",transition:"transform 0.15s ease-out, box-shadow 0.15s"}}
        onTouchStart={e=>{e.currentTarget.style.transform="scale(0.92)";}}
        onTouchEnd={e=>{e.currentTarget.style.transform="scale(1)";}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
      </button>;
    })()}

    {/* MODALES */}
    <Modal show={modal==="turno"} onClose={closeM} title="Nueva reserva">
      <Sel label="Cliente" value={form.cliente_id||""} onChange={sf("cliente_id")}><option value="">Seleccioná un cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Sel>
      <R2 isMobile={isMobile}><Inp label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/><FG label="Hora"><select style={inp} value={form.hora??""} onChange={sf("hora")}>{getHorasForDay(form.fecha?new Date(form.fecha+"T00:00:00").getDay():new Date().getDay()).map(h=><option key={h} value={h}>{h}:00{h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin?" 🔥":""}</option>)}</select></FG></R2>
      <Sel label="Tipo" value={form.tipo||"ocasional"} onChange={sf("tipo")}><option value="ocasional">Ocasional</option><option value="clase">Clase con instructor</option><option value="bloqueado">Bloquear horario</option></Sel>
      {form.tipo==="clase"&&<><Sel label="Instructor" value={form.instructor_id||""} onChange={sf("instructor_id")}><option value="">Sin instructor</option>{instructores.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}</Sel><Inp label="Precio clase (Gs)" type="number" value={form.precio_clase||""} onChange={sf("precio_clase")}/></>}
      {form.tipo==="ocasional"&&<><div style={{background:C.bg,borderRadius:8,padding:"10px 12px",fontSize:13,marginBottom:14,color:C.t2}}>Precio: <strong style={{color:C.t1}}>{gs(precioTurno(Number(form.hora||cfg.hora_inicio)))}</strong>{Number(form.hora)>=cfg.hora_pico_inicio&&Number(form.hora)<cfg.hora_pico_fin&&<span style={{color:C.coral}}> (pico)</span>}</div><Inp label="Seña (Gs) — opcional" type="number" value={form.sena||""} onChange={sf("sena")}/></>}
      <Inp label="Notas" type="text" value={form.notas||""} onChange={sf("notas")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarTurno} disabled={saving}>{saving?"Guardando...":"Guardar reserva"}</Btn></div>
    </Modal>

    <Modal show={modal==="verTurno"} onClose={closeM} title="Turno">
      {form.cliente&&<><div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}><Avatar nombre={form.cliente.nombre} size={48}/><div><div style={{fontSize:16,fontWeight:600,color:C.t1}}>{form.cliente.nombre}</div><div style={{fontSize:13,color:C.t2}}>{form.cliente.telefono}</div></div></div>
      <div style={{...card,marginBottom:14}}>
        <div style={{fontSize:12,color:C.t2,fontWeight:600,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Turno actual</div>
        <div style={{display:"grid",gap:6}}>
          {[["Fecha",form.fecha],["Hora",`${form.hora}:00`],["Precio",gs(form.precio)]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
              <span style={{color:C.t2}}>{k}</span><span style={{color:C.t1,fontWeight:500}}>{v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.t2}}>Tipo</span><span>{tipoBadge(form.tipo)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.t2}}>Estado</span><span>{estadoBadge(form.estado)}</span>
          </div>
        </div>
      </div>
      {form.estado!=="cancelado"&&<div style={{...card,background:C.greenBg,border:`1px solid ${C.greenBd}`,marginBottom:14}}>
        <div style={{fontSize:12,color:C.green,fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}}>Reprogramar turno</div>
        <R2 isMobile={isMobile}>
          <FG label="Nueva fecha"><input type="date" value={reprogramFecha||form.fecha||""} onChange={e=>setReprogramFecha(e.target.value)} style={inp}/></FG>
          <FG label="Nueva hora"><select style={inp} value={String(reprogramHora||form.hora||"")} onChange={e=>setReprogramHora(e.target.value)}>{getHorasForDay(reprogramFecha?new Date(reprogramFecha+"T00:00:00").getDay():new Date(form.fecha+"T00:00:00").getDay()).map(h=><option key={h} value={String(h)}>{h}:00{h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin?" 🔥":""}</option>)}</select></FG>
        </R2>
        <FG label="Motivo"><select style={inp} value={form.motivo_reprog||""} onChange={e=>setForm(f=>({...f,motivo_reprog:e.target.value}))}>
          <option value="">Seleccionar motivo...</option>
          <option value="cliente_solicito">Cliente lo solicitó</option>
          <option value="conflicto_cancha">Conflicto de cancha</option>
          <option value="instructor_no_disponible">Instructor no disponible</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="clima">Condiciones climáticas</option>
          <option value="otro">Otro</option>
        </select></FG>
        <Btn v="primary" onClick={async()=>{
          const nF=reprogramFecha||form.fecha;const nH=reprogramHora||form.hora;
          if(!form.id||!nF||!nH){notify("Completá todos los datos","error");return;}
          const existe=turnos.find(t=>t.id!==form.id&&t.fecha===nF&&t.hora===Number(nH)&&t.estado!=="cancelado");
          if(existe){notify("Ese horario ya está ocupado","error");return;}
          setSaving(true);
          try{
            await db.patch("turnos",form.id,{fecha:nF,hora:Number(nH),motivo_reprog:form.motivo_reprog||""},tk);
            if(form.cliente?.telefono){const motivos={cliente_solicito:"a tu solicitud",conflicto_cancha:"por conflicto de cancha",instructor_no_disponible:"por indisponibilidad de instructor",mantenimiento:"por mantenimiento",clima:"por condiciones climáticas",otro:"por motivos internos"};const razon=motivos[form.motivo_reprog]||"";fetch("/api/whatsapp/enviar",{method:"POST",headers:apiHeaders(),body:JSON.stringify({tipo:"reprogramacion",nombre:form.cliente.nombre,telefono:form.cliente.telefono,fecha:fmtFechaLegible(nF),horarios:`${nH}:00hs`,motivo:razon})}).catch(()=>{});}
            await load();notify("Turno reprogramado","ok");setTimeout(()=>{closeM();setReprogramFecha("");setReprogramHora("");},700);
          }catch(e){console.error(e);notify("Error al reprogramar","error");}
          setSaving(false);
        }} style={{width:"100%",marginTop:10}} disabled={saving}>{saving?"Guardando...":"Reprogramar y avisar"}</Btn>
      </div>}
      {form.estado==="reservado"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <Btn v="success" onClick={()=>{closeM();setDlg({type:"confirmar",t:form});}}>✓ Cobrar y confirmar {gs(form.precio-(form.sena||0))}</Btn>
        {form.cliente?.telefono&&<ReenviarConfirmacionBtn turno={form} cliente={form.cliente} notify={notify}/>}
        <Btn v="ghost" onClick={()=>{closeM();setDlg({type:"noshow",t:form});}}>Marcar como no show</Btn>
        <Btn v="danger" onClick={()=>{closeM();setDlg({type:"cancelar",t:form});}}>Cancelar turno</Btn>
      </div>}
      {form.estado==="confirmado"&&form.cliente?.telefono&&<ReenviarConfirmacionBtn turno={form} cliente={form.cliente} notify={notify}/>}

      {/* ── Productos vendidos en el turno ── */}
      {form.id&&(()=>{
        const items=turno_items.filter(i=>i.turno_id===form.id);
        const pendientes=items.filter(i=>!i.cobrado);
        const cobrados=items.filter(i=>i.cobrado);
        const totalPend=pendientes.reduce((a,i)=>a+i.precio_unitario*i.cantidad,0);
        const stockDisp=stock.filter(s=>s.cantidad>0);
        return <><Div/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontWeight:600,fontSize:13,color:C.t1}}>Productos en este turno</span>
            {pendientes.length>0&&<Btn sm v="success" onClick={()=>cobrarItemsTurno(form.id)} disabled={saving}>💰 Cobrar {gs(totalPend)}</Btn>}
          </div>
          {items.length>0&&<div style={{background:C.bg,borderRadius:8,border:`1px solid ${C.border}`,marginBottom:10,overflow:"hidden"}}>
            {items.map(i=><div key={i.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
              <span style={{flex:1,color:C.t1,fontWeight:500}}>{i.nombre}</span>
              <span style={{color:C.t3}}>x{i.cantidad}</span>
              <span style={{color:i.cobrado?C.green:C.yellow,fontWeight:600,minWidth:70,textAlign:"right"}}>{gs(i.precio_unitario*i.cantidad)}</span>
              <span style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:i.cobrado?C.greenBg:C.yellowBg,color:i.cobrado?C.green:C.yellow,border:`1px solid ${i.cobrado?C.greenBd:C.yellowBd}`,whiteSpace:"nowrap"}}>{i.cobrado?"Cobrado":"Pendiente"}</span>
              {!i.cobrado&&<button onClick={()=>eliminarItemTurno(i.id,i.stock_id,i.cantidad)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:17,padding:"0 2px",lineHeight:1}}>×</button>}
            </div>)}
            {(pendientes.length>0||cobrados.length>0)&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",fontSize:12,color:C.t2}}>
              {pendientes.length>0&&<span>Pendiente: <strong style={{color:C.yellow}}>{gs(totalPend)}</strong></span>}
              {cobrados.length>0&&<span>Cobrado: <strong style={{color:C.green}}>{gs(cobrados.reduce((a,i)=>a+i.precio_unitario*i.cantidad,0))}</strong></span>}
            </div>}
          </div>}
          {stockDisp.length>0&&<div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div style={{flex:2,minWidth:130}}>
              <label style={{fontSize:11,color:C.t2,display:"block",marginBottom:4}}>Producto</label>
              <select style={inp} value={form.item_stock_id||""} onChange={e=>{const s=stock.find(x=>x.id===Number(e.target.value));setForm(f=>({...f,item_stock_id:e.target.value,item_precio_unit:s?.precio_venta||0,item_cantidad:1}));}}>
                <option value="">Seleccionar...</option>
                {stockDisp.map(s=><option key={s.id} value={s.id}>{s.nombre} (stock: {s.cantidad})</option>)}
              </select>
            </div>
            <div style={{width:65}}>
              <label style={{fontSize:11,color:C.t2,display:"block",marginBottom:4}}>Cant.</label>
              <input type="number" min={1} style={{...inp,width:"100%"}} value={form.item_cantidad||1}
                onChange={e=>setForm(f=>({...f,item_cantidad:e.target.value}))}/>
            </div>
            <div style={{flex:1,minWidth:90}}>
              <label style={{fontSize:11,color:C.t2,display:"block",marginBottom:4}}>Precio unit. (Gs)</label>
              <input type="number" style={inp} value={form.item_precio_unit||""} placeholder="Auto"
                onChange={e=>setForm(f=>({...f,item_precio_unit:e.target.value}))}/>
            </div>
            {form.item_stock_id&&<div style={{fontSize:12,color:C.green,fontWeight:600,paddingBottom:8,whiteSpace:"nowrap"}}>
              = {gs(Number(form.item_precio_unit||0)*Number(form.item_cantidad||1))}
            </div>}
            <Btn v="success" sm onClick={agregarItemTurno} disabled={saving||!form.item_stock_id}>+ Agregar</Btn>
          </div>}
        </>;
      })()}
      </>}
    </Modal>

    <Modal show={modal==="cliente"} onClose={closeM} title={form.id?"Editar cliente":"Nuevo cliente"} width={500}>
      <Inp label="Nombre completo" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
      <Inp label="Teléfono" type="text" value={form.telefono||""} onChange={sf("telefono")}/>
      <R2 isMobile={isMobile}><Sel label="Nivel" value={form.nivel||"intermedio"} onChange={sf("nivel")}><option value="principiante">Principiante</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></Sel></R2>
      <Inp label="Notas" type="text" value={form.notas||""} onChange={sf("notas")}/>
      {form.id&&<><Div/>
        <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:10}}>Referidos</div>
        <div style={{background:C.bg,borderRadius:10,padding:"12px 14px",marginBottom:10,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,color:C.t2,marginBottom:4}}>Código de referido</div>
          {form.referrer_code
            ?<div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:14,fontWeight:700,color:C.yellow,letterSpacing:1.5,flex:1}}>{form.referrer_code}</span>
                <Btn sm v="ghost" onClick={()=>navigator.clipboard.writeText(form.referrer_code)}>Copiar</Btn>
                <Btn sm v="ghost" onClick={()=>setForm(f=>({...f,referrer_code:genRefCode(f.nombre,f.telefono)}))}>Regen.</Btn>
              </div>
            :<div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:C.t3,flex:1}}>Sin código asignado</span>
                <Btn sm v="primary" onClick={()=>setForm(f=>({...f,referrer_code:genRefCode(f.nombre,f.telefono)}))}>Generar</Btn>
              </div>}
        </div>
        <R2 isMobile={isMobile}><Inp label="Saldo a favor (Gs)" type="number" value={form.saldo_favor||0} onChange={sf("saldo_favor")}/></R2>
      </>}
      {form.id&&<>
        <Div/>
        <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:12}}>Historial</div>
        {(()=>{const mt=turnos.filter(t=>t.cliente_id===form.id);const ma=abonos.filter(a=>a.cliente_id===form.id);const mc=mt.filter(t=>t.estado==="confirmado");const tg=mc.reduce((a,t)=>a+(t.precio||0),0);return<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
          <div style={{...metric,textAlign:"center"}}><div style={{fontSize:11,color:C.t2}}>Turnos</div><div style={{fontSize:16,fontWeight:700,color:C.t1,marginTop:4}}>{mt.length}</div></div>
          <div style={{...metric,textAlign:"center"}}><div style={{fontSize:11,color:C.t2}}>Confirm.</div><div style={{fontSize:16,fontWeight:700,color:C.green,marginTop:4}}>{mc.length}</div></div>
          <div style={{...metric,textAlign:"center"}}><div style={{fontSize:11,color:C.t2}}>Abonos</div><div style={{fontSize:16,fontWeight:700,color:C.coral,marginTop:4}}>{ma.length}</div></div>
          <div style={{...metric,textAlign:"center"}}><div style={{fontSize:11,color:C.t2}}>Total</div><div style={{fontSize:13,fontWeight:700,color:C.info,marginTop:4}}>{gs(tg)}</div></div>
        </div>;})()} 
        {(()=>{const mt=turnos.filter(t=>t.cliente_id===form.id).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));if(mt.length===0)return<div style={{fontSize:12,color:C.t3,textAlign:"center",padding:"12px"}}>Sin turnos</div>;return<div style={{maxHeight:180,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8}}>{mt.slice(0,8).map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",borderBottom:`1px solid ${C.border}`,fontSize:11}}><div><div style={{color:C.t1,fontWeight:500}}>{t.fecha} {t.hora}:00</div><div style={{color:C.t2,marginTop:2}}>{gs(t.precio)}</div></div><div style={{textAlign:"right"}}>{estadoBadge(t.estado)}</div></div>)}</div>;})()} 
      </>}
      <Div/><div style={{display:"flex",justifyContent:"space-between"}}>
        {form.id&&<Btn v="danger" onClick={()=>setDlg({type:"eliminarCliente",id:form.id,nombre:form.nombre})}>Eliminar</Btn>}
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarCliente} disabled={saving}>{saving?"Guardando...":form.id?"Guardar":"Agregar"}</Btn></div>
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
          <button type="button" onClick={()=>setForm(f=>({...f,slots:f.slots.filter((_,j)=>j!==i)}))} style={{border:"none",background:C.redBg,color:C.red,borderRadius:6,padding:"6px 10px",cursor:"pointer"}}>×</button>
        </div>)}
        <button type="button" onClick={()=>setForm(f=>({...f,slots:[...(f.slots||[]),{dia:1,hora:cfg.hora_inicio}]}))} style={{border:`1px dashed ${C.coral}`,background:"transparent",color:C.coral,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"var(--font-sans)",fontSize:13,width:"100%",marginTop:4}}>+ Agregar turno</button>
      </div>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarAbono} disabled={saving}>{saving?"Guardando...":"Registrar abono"}</Btn></div>
    </Modal>

    <Modal show={modal==="plan"} onClose={closeM} title={form.id?"Editar plan":"Nuevo plan"}>
      <Inp label="Nombre" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
      <R2 isMobile={isMobile}><Inp label="Horas por semana" type="number" value={form.horas_semana||""} onChange={sf("horas_semana")}/><Inp label="Precio mensual (Gs)" type="number" value={form.precio||""} onChange={sf("precio")}/></R2>
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
      <R2 isMobile={isMobile}><Inp label="Monto (Gs)" type="number" value={form.monto||""} onChange={sf("monto")}/><Sel label="Tipo" value={form.tipo||"egreso"} onChange={sf("tipo")}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></Sel></R2>
      <Sel label="Categoría" value={form.categoria||"gasto"} onChange={sf("categoria")}><option value="gasto">Gasto operativo</option><option value="stock">Stock</option><option value="otro">Otro</option></Sel>
      <Inp label="Fecha" type="date" value={form.fecha||""} onChange={sf("fecha")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarMovCaja} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    <Modal show={modal==="stockItem"} onClose={closeM} title={form.id?"Editar producto":"Nuevo producto"}>
      <Inp label="Nombre" type="text" value={form.nombre||""} onChange={sf("nombre")} autoFocus/>
      <Sel label="Categoría" value={form.categoria||"general"} onChange={sf("categoria")}><option value="pelotas">Pelotas</option><option value="paletas">Paletas</option><option value="bebidas">Bebidas</option><option value="accesorios">Accesorios</option><option value="general">General</option></Sel>
      <R2 isMobile={isMobile}><Inp label="Cantidad actual" type="number" value={form.cantidad??""} onChange={sf("cantidad")}/><Inp label="Stock mínimo" type="number" value={form.minimo??""} onChange={sf("minimo")}/></R2>
      <R2 isMobile={isMobile}><Inp label="Precio venta (Gs)" type="number" value={form.precio_venta??""} onChange={sf("precio_venta")}/><Inp label="Precio costo (Gs)" type="number" value={form.precio_costo??""} onChange={sf("precio_costo")}/></R2>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarStock} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    <Modal show={modal==="moverStock"} onClose={closeM} title="Movimiento de stock">
      <Sel label="Producto" value={form.stock_id||""} onChange={sf("stock_id")}><option value="">Seleccioná un producto</option>{stock.map(s=><option key={s.id} value={s.id}>{s.nombre} (stock: {s.cantidad})</option>)}</Sel>
      <R2 isMobile={isMobile}><Sel label="Tipo" value={form.tipo_mov||"salida"} onChange={sf("tipo_mov")}><option value="entrada">Entrada</option><option value="salida">Salida / Venta</option></Sel><Inp label="Cantidad" type="number" value={form.cantidad_mov||""} onChange={sf("cantidad_mov")}/></R2>
      <Inp label="Motivo" type="text" value={form.motivo||""} onChange={sf("motivo")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={moverStock} disabled={saving}>{saving?"Guardando...":"Confirmar"}</Btn></div>
    </Modal>

    <Modal show={modal==="horarios"} onClose={closeM} title="Horarios por día">
      <div style={{marginBottom:16}}>
        {DIAS_FULL.map((dia,i)=>{
          let h={inicio:cfg.hora_inicio,fin:cfg.hora_fin};
          try{if(form.horarios_por_dia){const parsed=JSON.parse(form.horarios_por_dia);h=parsed[i]||h;}}catch(e){}
          return <div key={i} style={{marginBottom:14,padding:12,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:8}}>{dia}</div>
            <R2 isMobile={isMobile}>
              <FG label="Inicio"><select style={inp} value={Number(h.inicio)||0} onChange={e=>{try{const hor=form.horarios_por_dia?JSON.parse(form.horarios_por_dia):{};hor[i]={inicio:Number(e.target.value),fin:h.fin};setForm(f=>({...f,horarios_por_dia:JSON.stringify(hor)}));}catch(err){}}}>{Array.from({length:24},(_,j)=><option key={j} value={j}>{j}:00</option>)}</select></FG>
              <FG label="Fin"><select style={inp} value={Number(h.fin)||24} onChange={e=>{try{const hor=form.horarios_por_dia?JSON.parse(form.horarios_por_dia):{};hor[i]={inicio:h.inicio,fin:Number(e.target.value)};setForm(f=>({...f,horarios_por_dia:JSON.stringify(hor)}));}catch(err){}}}>{Array.from({length:25},(_,j)=><option key={j} value={j}>{j}:00</option>)}</select></FG>
            </R2>
          </div>;
        })}
      </div>
      <Div/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={closeM}>Cancelar</Btn>
        <Btn v="primary" onClick={async()=>{
          setSaving(true);
          try{const cfgId=cfg?.id;if(!cfgId){setSaving(false);return;}await db.patch("config",cfgId,{horarios_por_dia:form.horarios_por_dia||"{}"},tk);await load();notify("Horarios guardados","ok");setTimeout(()=>closeM(),700);}
          catch(e){console.error(e);notify("Error al guardar","error");}
          setSaving(false);
        }} disabled={saving}>{saving?"Guardando...":"Guardar horarios"}</Btn>
      </div>
    </Modal>

    <Modal show={modal==="config"} onClose={closeM} title="Configuración">
      <Inp label="Nombre del club" type="text" value={form.nombre_club||""} onChange={sf("nombre_club")}/>
      <R2 isMobile={isMobile}><Inp label="Tarifa base (Gs)" type="number" value={form.tarifa_base||""} onChange={sf("tarifa_base")}/><Inp label="Tarifa pico (Gs)" type="number" value={form.tarifa_pico||""} onChange={sf("tarifa_pico")}/></R2>
      <R2 isMobile={isMobile}><FG label="Hora pico inicio"><select style={inp} value={form.hora_pico_inicio??""} onChange={sf("hora_pico_inicio")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></FG><FG label="Hora pico fin"><select style={inp} value={form.hora_pico_fin??""} onChange={sf("hora_pico_fin")}>{horas.map(h=><option key={h} value={h}>{h}:00</option>)}</select></FG></R2>
      <R2 isMobile={isMobile}><FG label="Apertura"><select style={inp} value={form.hora_inicio??""} onChange={sf("hora_inicio")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></FG><FG label="Cierre"><select style={inp} value={form.hora_fin??""} onChange={sf("hora_fin")}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i}:00</option>)}</select></FG></R2>
      <Div/><div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:10}}>Descuentos por día</div>
      <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer"}}><input type="checkbox" checked={form.desc_martes_jueves_enabled||false} onChange={e=>setForm(f=>({...f,desc_martes_jueves_enabled:e.target.checked}))}/><span style={{fontSize:13,color:C.t2}}>Aplicar descuento automático en días específicos</span></label>
      {form.desc_martes_jueves_enabled&&<>
        <Inp label="Porcentaje de descuento (%)" type="number" value={form.desc_martes_jueves_percent||20} onChange={sf("desc_martes_jueves_percent")}/>
        <div style={{fontSize:12,color:C.t2,marginBottom:8}}>¿En qué días aplica?</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[{n:"Domingo",i:0},{n:"Lunes",i:1},{n:"Martes",i:2},{n:"Miércoles",i:3},{n:"Jueves",i:4},{n:"Viernes",i:5},{n:"Sábado",i:6}].map(({n,i})=>{
            const raw=form.desc_martes_jueves_dias;
            const diasDesc=Array.isArray(raw)?raw:(typeof raw==="string"?(()=>{try{return JSON.parse(raw);}catch{return[2,4];}})():[2,4]);
            return <label key={i} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"6px 10px",background:diasDesc.includes(i)?C.bgElev:C.bg,border:`1px solid ${diasDesc.includes(i)?C.borderL:C.border}`,borderRadius:8}}>
              <input type="checkbox" checked={diasDesc.includes(i)} onChange={e=>{const newDias=e.target.checked?[...diasDesc,i].sort():diasDesc.filter(d=>d!==i);setForm(f=>({...f,desc_martes_jueves_dias:newDias}));}} style={{width:16,height:16}}/>
              <span style={{fontSize:12,color:diasDesc.includes(i)?C.t1:C.t2}}>{n}</span>
            </label>;
          })}
        </div>
      </>}
      <Div/><div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:6}}>Programa de referidos</div>
      <div style={{fontSize:11,color:C.t2,marginBottom:10,lineHeight:1.5}}>El monto se descuenta al cliente que usa el código y se acredita como saldo a favor al referente.</div>
      <Inp label="Descuento por referido (%)" type="number" value={form.referral_discount_percent||10} onChange={sf("referral_discount_percent")}/>
      <Div/><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={closeM}>Cancelar</Btn><Btn v="primary" onClick={guardarConfig} disabled={saving}>{saving?"Guardando...":"Guardar"}</Btn></div>
    </Modal>

    {/* Modal crear/editar código de referido */}
    <Modal show={modal==="codigoRef"} onClose={closeM} title={form.id?"Editar código":"Nuevo código de referido"} width={460}>
      <R2 isMobile={isMobile}>
        <div>
          <label style={{fontSize:11,color:C.t2,display:"block",marginBottom:4}}>Código *</label>
          <input style={{...inp,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}} value={form.codigo||""} onChange={e=>setForm(f=>({...f,codigo:e.target.value.toUpperCase()}))} placeholder="GYM2024" autoFocus/>
        </div>
        <Sel label="Tipo" value={form.tipo||"socio"} onChange={sf("tipo")}>
          <option value="cliente">Cliente referido</option>
          <option value="socio">Socio / Gimnasio</option>
          <option value="empresa">Empresa</option>
          <option value="red_social">Red social</option>
          <option value="evento">Evento / Promo</option>
        </Sel>
      </R2>
      <Inp label="Nombre / descripción *" value={form.nombre||""} onChange={sf("nombre")} placeholder="Gym Energía, Instagram, Torneo verano…"/>
      <R2 isMobile={isMobile}>
        <Inp label="Descuento (%)" type="number" value={form.descuento_pct||10} onChange={sf("descuento_pct")}/>
        <Inp label="Límite de usos (vacío = ilimitado)" type="number" value={form.max_usos||""} onChange={sf("max_usos")} placeholder="Ej: 50"/>
      </R2>
      <Inp label="Notas internas" value={form.notas||""} onChange={sf("notas")} placeholder="Dónde circula, quién lo coordinó…"/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <input type="checkbox" id="cod_activo" checked={form.activo!==false} onChange={e=>setForm(f=>({...f,activo:e.target.checked}))} style={{cursor:"pointer"}}/>
        <label htmlFor="cod_activo" style={{fontSize:13,color:C.t1,cursor:"pointer"}}>Código activo</label>
      </div>
      <Div/>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={closeM}>Cancelar</Btn>
        <Btn v="primary" onClick={guardarCodigoRef} disabled={saving}>{saving?"Guardando...":form.id?"Guardar cambios":"Crear código"}</Btn>
      </div>
    </Modal>

    <Dialog show={dlg?.type==="eliminarCodigo"} title="Eliminar código" msg={`¿Eliminar el código "${dlg?.codigo}"? Se perderá el historial de usos.`} onOk={()=>eliminarCodigoRef(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Eliminar" okV="danger"/>

    <Dialog show={dlg?.type==="confirmar"} title="Confirmar cobro" msg={`¿Cobrar ${gs((dlg?.t?.precio||0)-(dlg?.t?.sena||0))} a ${cById(dlg?.t?.cliente_id)?.nombre||"?"}?`} onOk={()=>confirmarTurno(dlg.t)} onCancel={()=>setDlg(null)} okLabel="✓ Confirmar" okV="success"/>
    <Dialog show={dlg?.type==="cancelar"} title="Cancelar turno" msg={`¿Cancelar turno de ${cById(dlg?.t?.cliente_id)?.nombre||"?"}?${dlg?.t?.sena>0?" La seña se devuelve en caja.":""}`} onOk={()=>cancelarTurno(dlg.t)} onCancel={()=>setDlg(null)} okLabel="Cancelar turno" okV="danger"/>
    <Dialog show={dlg?.type==="noshow"} title="No show" msg={`¿Marcar a ${cById(dlg?.t?.cliente_id)?.nombre||"?"} como no show?`} onOk={()=>noShow(dlg.t)} onCancel={()=>setDlg(null)} okLabel="Marcar" okV="danger"/>
    <Dialog show={dlg?.type==="eliminarCliente"} title="Eliminar cliente" msg={`¿Eliminar a ${dlg?.nombre}?`} onOk={()=>eliminarCliente(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Eliminar" okV="danger"/>
    <Dialog show={dlg?.type==="cancelarAbono"} title="Cancelar abono" msg={`¿Cancelar el abono de ${dlg?.nombre}?`} onOk={()=>cancelarAbono(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Cancelar abono" okV="danger"/>
    <Dialog show={dlg?.type==="eliminarMov"} title="Eliminar movimiento" msg={`¿Eliminar "${dlg?.desc}" de caja?`} onOk={()=>eliminarMovCaja(dlg.id)} onCancel={()=>setDlg(null)} okLabel="Eliminar" okV="danger"/>
    <DiaConfigModal/>
    <Dialog show={dlg?.type==="dragReprogram"} title="Reprogramar turno" msg={`¿Mover el turno de ${dlg?.nombre} al ${dlg?.fechaLabel||dlg?.newFecha} a las ${dlg?.newHora}:00?`} onOk={async()=>{setSaving(true);try{await db.patch("turnos",dlg.turnoId,{fecha:dlg.newFecha,hora:dlg.newHora},tk);await load();notify("Turno reprogramado","ok");}catch(e){notify(e.message,"error");}setSaving(false);setDlg(null);}} onCancel={()=>setDlg(null)} okLabel="Mover" okV="primary"/>

    {dlg?.type==="wsp"&&<div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.8)"}}>
      <div style={{backgroundColor:C.bgCard,borderRadius:16,padding:"24px",width:360,boxShadow:"0 8px 40px rgba(0,0,0,0.6)",border:`1px solid ${C.border}`}}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:8,color:C.t1}}>Reserva guardada</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:12}}>¿Enviás confirmación a {dlg.cliente.nombre}?</div>
        <div style={{background:C.bg,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.t2,marginBottom:16,lineHeight:1.6}}>{dlg.msg}</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setDlg(null)}>Omitir</Btn>
          <Btn v="success" onClick={()=>{enviarWsp(dlg.cliente.telefono,dlg.msg);setDlg(null);}}>Enviar WhatsApp</Btn>
        </div>
      </div>
    </div>}

    {cmdOpen&&(()=>{
      const q=cmdQ.toLowerCase().trim();
      const acciones=[
        {ic:"📅",l:"Nueva reserva hoy",k:"reserva turno",a:()=>{setCmdOpen(false);openM("turno",{fecha:hoy(),hora:cfg.hora_inicio,tipo:"ocasional"});}},
        {ic:"👥",l:"Nuevo cliente",k:"cliente agregar",a:()=>{setCmdOpen(false);openM("cliente",{nivel:"intermedio"});}},
        {ic:"⭐",l:"Nuevo abono",k:"abono plan",a:()=>{setCmdOpen(false);openM("abono",{fecha_inicio:hoy(),slots:[]});}},
        {ic:"💰",l:"Registrar gasto",k:"caja egreso gasto",a:()=>{setCmdOpen(false);openM("movCaja",{tipo:"egreso",categoria:"gasto",fecha:hoy()});}},
        {ic:"📦",l:"Nuevo producto / stock",k:"stock producto",a:()=>{setCmdOpen(false);openM("stockItem",{categoria:"pelotas",cantidad:"0",minimo:"0"});}},
      ].filter(a=>!q||a.k.includes(q)||a.l.toLowerCase().includes(q));
      const tabsFilt=TABS.filter(t=>!q||t.l.toLowerCase().includes(q)||t.id.includes(q));
      const clientesFilt=clientes.filter(c=>c.nombre.toLowerCase().includes(q)||(c.telefono||"").includes(q)).slice(0,5);
      const ItemRow=({ic,l,sub,onClick,badge})=>(
        <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 18px",background:"transparent",border:"none",color:C.t1,cursor:"pointer",textAlign:"left",transition:"background 0.1s",borderBottom:`1px solid rgba(255,255,255,0.04)`,fontFamily:"var(--font-sans)"}}
          onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <span style={{width:28,height:28,borderRadius:8,background:C.bgElev,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{ic}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:500,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l}</div>
            {sub&&<div style={{fontSize:11,color:C.t3}}>{sub}</div>}
          </div>
          {badge&&<span style={{fontSize:10,color:C.t3,background:C.bgElev,padding:"2px 7px",borderRadius:5,border:`1px solid ${C.border}`,flexShrink:0}}>{badge}</span>}
        </button>
      );
      const SectionHead=({l})=>(
        <div style={{padding:"8px 18px 4px",fontSize:10,fontWeight:700,color:C.t3,letterSpacing:1,textTransform:"uppercase"}}>{l}</div>
      );
      return <div style={{position:"fixed",inset:0,zIndex:99997,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:isMobile?24:80,paddingLeft:16,paddingRight:16,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(5px)",animation:"fadeIn 0.12s ease-out"}} onClick={()=>setCmdOpen(false)}>
        <div style={{width:"100%",maxWidth:580,background:C.bgCard,borderRadius:16,border:`1px solid ${C.borderL}`,boxShadow:"0 24px 80px rgba(0,0,0,0.65)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:`1px solid ${C.border}`}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><circle cx="11" cy="11" r="8" stroke={C.t3} strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke={C.t3} strokeWidth="2" strokeLinecap="round"/></svg>
            <input autoFocus value={cmdQ} onChange={e=>setCmdQ(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setCmdOpen(false);}} placeholder="Buscar clientes, acciones, secciones..." style={{flex:1,background:"transparent",border:"none",color:C.t1,fontSize:15,outline:"none",fontFamily:"var(--font-sans)"}}/>
            <span onClick={()=>setCmdOpen(false)} style={{fontSize:11,color:C.t3,background:C.bgElev,padding:"3px 8px",borderRadius:5,border:`1px solid ${C.border}`,flexShrink:0,cursor:"pointer"}}>ESC</span>
          </div>
          <div style={{maxHeight:420,overflowY:"auto"}}>
            {acciones.length>0&&<><SectionHead l="Acciones rápidas"/>
              {acciones.map((a,i)=><ItemRow key={i} ic={a.ic} l={a.l} onClick={a.a}/>)}
            </>}
            {tabsFilt.length>0&&<><SectionHead l="Secciones"/>
              {tabsFilt.map(t=><ItemRow key={t.id} ic={t.ic==="wa"?<WhatsAppIcon size={14}/>:<span>{t.ic}</span>} l={t.l} onClick={()=>{setTab(t.id);setCmdOpen(false);}} badge={tab===t.id?"Activa":null}/>)}
            </>}
            {clientesFilt.length>0&&q.length>0&&<><SectionHead l="Clientes"/>
              {clientesFilt.map(c=><ItemRow key={c.id} ic={<Avatar nombre={c.nombre} size={22}/>} l={c.nombre} sub={c.telefono} onClick={()=>{setCmdOpen(false);openM("turno",{fecha:hoy(),hora:cfg.hora_inicio,tipo:"ocasional",cliente_id:c.id});}}/>)}
            </>}
            {acciones.length===0&&tabsFilt.length===0&&(clientesFilt.length===0||q.length===0)&&q.length>0&&(
              <div style={{padding:"32px",textAlign:"center",color:C.t3,fontSize:13}}>Sin resultados para "{cmdQ}"</div>
            )}
          </div>
          {!isMobile&&<div style={{padding:"8px 18px",borderTop:`1px solid ${C.border}`,display:"flex",gap:16,fontSize:11,color:C.t3}}>
            <span>↵ seleccionar</span>
            <span>ESC cerrar</span>
            <span style={{marginLeft:"auto"}}>⌘K para abrir / cerrar</span>
          </div>}
        </div>
      </div>;
    })()}

    {msg&&(()=>{
      const palette={
        ok:{bg:C.greenBg,bd:C.greenBd,fg:C.green,icon:"✓"},
        error:{bg:C.redBg,bd:C.redBd,fg:C.red,icon:"✕"},
        info:{bg:C.bgCard,bd:C.border,fg:C.t1,icon:"ℹ"},
      };
      const p=palette[msgType]||palette.info;
      return <div onClick={()=>{setMsg("");if(msgTimerRef.current)clearTimeout(msgTimerRef.current);}} style={{position:"fixed",bottom:`calc(${isMobile?92:24}px + env(safe-area-inset-bottom))`,left:"50%",transform:"translateX(-50%)",background:p.bg,color:p.fg,border:`1px solid ${p.bd}`,borderRadius:12,padding:"11px 18px",fontSize:14,fontWeight:500,zIndex:99998,boxShadow:"0 6px 28px rgba(0,0,0,0.45)",display:"flex",alignItems:"center",gap:10,cursor:"pointer",maxWidth:"calc(100vw - 32px)",animation:"fadeIn 0.18s ease-out"}}>
        <span style={{fontSize:14,fontWeight:700,flexShrink:0,width:20,height:20,borderRadius:"50%",background:p.fg,color:p.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>{p.icon}</span>
        <span style={{lineHeight:1.4,wordBreak:"break-word"}}>{msg}</span>
      </div>;
    })()}
  </div></AdminContext.Provider>;
}
