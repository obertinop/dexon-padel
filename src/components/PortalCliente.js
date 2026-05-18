import React, { useState, useEffect } from "react";
import { C, DIAS, ADMIN_TEL, LOGO, LOGO_STYLE_DARK, card } from "../lib/constants.js";
import { useIsMobile, useFeriados } from "../lib/hooks.js";
import { db, apiHeaders } from "../lib/api.js";
import { hoy, fmtFechaLegible, gs, avatarBg, avatarFg, initials } from "../lib/utils.js";
import { Badge } from "./UI.js";
import CalendarioMini from "./CalendarioMini.js";

const PortalCliente = () => {
  const isMobile = useIsMobile();
  const {getFeriado, feriados} = useFeriados();
  const [cfg,setCfg] = useState({nombre_club:"DEXON PADEL",hora_inicio:10,hora_fin:24,tarifa_base:80000,tarifa_pico:100000,hora_pico_inicio:19,hora_pico_fin:22});
  const [turnos,setTurnos] = useState([]);
  const [clientes,setClientes] = useState([]);
  const [loading,setLoading] = useState(true);
  const [fecha,setFecha] = useState(hoy());
  const [slotsSel,setSlotsSel] = useState([]);
  const [paso,setPaso] = useState("lista");
  const [form,setForm] = useState({nombre:"",telefono:"",documento:""});
  const [saving,setSaving] = useState(false);
  const [msg,setMsg] = useState("");
  const [clima,setClima] = useState({});
  const [metodoPago,setMetodoPago] = useState("transferencia");
  const [referrerCode,setReferrerCode] = useState("");
  const [miCodigo,setMiCodigo] = useState("");
  const [usarSaldo,setUsarSaldo] = useState(false);
  const [clienteEncontrado,setClienteEncontrado] = useState(null);
  const [codigosRef,setCodigosRef] = useState([]);
  const [abonoTurnos,setAbonoTurnos] = useState([]);
  const [diasBloqueados,setDiasBloqueados] = useState([]);

  const isDiaBloqueado = f => diasBloqueados.find(d=>d.fecha===f&&d.tipo==='bloqueado')||null;
  const feriadoDates = feriados.map(f=>f.date);
  const blockedDates = diasBloqueados.filter(d=>d.tipo==='bloqueado').map(d=>d.fecha);

  useEffect(()=>{
    const load = async () => {
      try {
        const [cf,tu,cl,cr,at,db2] = await Promise.all([db.get("config","limit=1"),db.get("turnos","order=fecha.asc,hora.asc"),db.get("clientes","order=nombre.asc"),db.get("codigos_referido","activo=eq.true"),db.get("abono_turnos","select=dia,hora"),db.get("dias_bloqueados","order=fecha.asc")]);
        if(cf?.[0]) setCfg(cf[0]);
        setTurnos(tu||[]);
        setClientes(cl||[]);
        setCodigosRef(cr||[]);
        setAbonoTurnos(at||[]);
        setDiasBloqueados(db2||[]);
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

  const horasArr = (() => {
    const especial = diasBloqueados.find(d=>d.fecha===fecha&&d.tipo==='horario');
    if(especial) return Array.from({length:especial.hora_fin-especial.hora_inicio},(_,i)=>especial.hora_inicio+i);
    try {
      if(cfg.horarios_por_dia) {
        const parsed = JSON.parse(cfg.horarios_por_dia);
        const dayOfWeek = new Date(fecha+"T00:00:00").getDay();
        const h = parsed[dayOfWeek];
        if(h) return Array.from({length:h.fin-h.inicio},(_,i)=>h.inicio+i);
      }
    } catch(e){}
    return Array.from({length:cfg.hora_fin-cfg.hora_inicio},(_,i)=>cfg.hora_inicio+i);
  })();
  const precioH = h => h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin?cfg.tarifa_pico:cfg.tarifa_base;
  const parseDias = (raw) => { if(Array.isArray(raw))return raw; if(typeof raw==="string"){try{return JSON.parse(raw);}catch{return[2,4];}} return[2,4]; };
  const diaTieneDesc = () => {
    if(!cfg.desc_martes_jueves_enabled) return false;
    if(!fecha) return false;
    return parseDias(cfg.desc_martes_jueves_dias).includes(new Date(fecha+"T00:00:00").getDay());
  };
  const descPct = Number(cfg.desc_martes_jueves_percent)||20;
  const precioConDesc = (h) => {
    const base = precioH(h);
    if(!diaTieneDesc()) return base;
    return Math.round(base * (1 - descPct/100));
  };
  const refCodeNorm = referrerCode.trim().toUpperCase();
  const miTelNorm = form.telefono.trim().replace(/\D/g,"");
  // Verificar primero en codigos_referido institucionales, luego en clientes
  const codigoInstit = refCodeNorm.length>=4 ? codigosRef.find(c=>c.codigo===refCodeNorm&&c.activo&&(c.max_usos===null||c.usos_actuales<c.max_usos)) : null;
  const refMatch = (!codigoInstit && refCodeNorm.length>=4) ? clientes.find(c=>c.referrer_code===refCodeNorm) : null;
  const refValido = !!codigoInstit || (!!refMatch && (!miTelNorm || refMatch.telefono?.replace(/\D/g,"") !== miTelNorm));
  const refDescPct = codigoInstit ? Number(codigoInstit.descuento_pct)||10 : Number(cfg.referral_discount_percent)||10;
  const saldoDisponible = clienteEncontrado?.saldo_favor || 0;
  const diaFecha = fecha ? new Date(fecha+"T00:00:00").getDay() : -1;
  const ocupado = h => turnos.find(t=>t.fecha===fecha&&t.hora===h&&t.estado!=="cancelado") || abonoTurnos.find(at=>at.dia===diaFecha&&at.hora===h);
  const pasado = h => fecha===hoy()&&h<=new Date().getHours();
  const climaFecha = clima[fecha];
  const climaIcon = code => {if(!code&&code!==0)return"🌤";if(code===0)return"☀️";if(code<=2)return"⛅";if(code<=48)return"☁️";if(code<=67)return"🌧️";return"⛈️";};
  const libres = horasArr.filter(h=>!ocupado(h)&&!pasado(h));
  const ocupados = horasArr.filter(h=>ocupado(h)||pasado(h));
  const subtotalSel = slotsSel.reduce((a,h)=>a+precioConDesc(h),0);
  const subtotalSinDesc = slotsSel.reduce((a,h)=>a+precioH(h),0);
  const ahorroDia = subtotalSinDesc - subtotalSel;
  const descRef = refValido ? Math.round(subtotalSel * refDescPct / 100) : 0;
  const descSaldo = usarSaldo ? Math.min(saldoDisponible, subtotalSel - descRef) : 0;
  const totalSel = Math.max(0, subtotalSel - descRef - descSaldo);

  const toggleSlot = h => {
    if(slotsSel.includes(h)){setSlotsSel(slotsSel.filter(s=>s!==h));return;}
    if(slotsSel.length===0){setSlotsSel([h]);return;}
    const min=Math.min(...slotsSel);const max=Math.max(...slotsSel);
    if(h===min-1||h===max+1) setSlotsSel([...slotsSel,h].sort((a,b)=>a-b));
    else setSlotsSel([h]);
  };

  useEffect(()=>{
    const t = form.telefono.trim().replace(/\D/g,"");
    if(t.length<6){setClienteEncontrado(null);return;}
    const found = clientes.find(c=>c.telefono?.replace(/\D/g,"")===t);
    setClienteEncontrado(found||null);
    if(!found) setUsarSaldo(false);
  },[form.telefono,clientes]);

  const buscarCliente = () => {
    const n=form.nombre.trim().toLowerCase();const t=form.telefono.trim().replace(/\D/g,"");
    const pN=clientes.filter(c=>c.nombre.toLowerCase()===n);
    const pT=t?clientes.filter(c=>c.telefono?.replace(/\D/g,"")===t):[];
    if(pN.length>0&&pT.length>0&&pN[0].id===pT[0].id)return{match:"total",cliente:pN[0]};
    if(pN.length>0)return{match:"parcial_nombre",cliente:pN[0]};
    if(pT.length>0)return{match:"parcial_tel",cliente:pT[0]};
    return{match:"nuevo",cliente:null};
  };

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.bg,gap:16}}>
      <div style={{width:48,height:48,borderRadius:"50%",border:`3px solid ${C.border}`,borderTopColor:C.coral,animation:"spin 0.8s linear infinite"}}/>
      <div style={{color:C.t3,fontSize:13}}>Cargando disponibilidad...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Estilos portal
  const inpP = {width:"100%",padding:"14px 16px",border:`1px solid ${C.border}`,borderRadius:12,fontSize:15,color:C.t1,background:C.bgElev,fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box",minHeight:52};

  // Indicador de pasos
  const pasos = ["lista","datos","confirmado"];
  const pasoIdx = pasos.indexOf(paso);
  const StepBar = () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:24,padding:"0 8px"}}>
      {[{i:0,l:"Horario"},{i:1,l:"Datos y pago"}].map(({i,l})=>(
        <div key={i} style={{display:"flex",alignItems:"center",flex:i<2?"1":"0"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,
              background:pasoIdx>i?C.green:pasoIdx===i?C.coral:C.bgElev,
              color:pasoIdx>=i?"#fff":C.t3,
              border:`2px solid ${pasoIdx>i?C.green:pasoIdx===i?C.coral:C.border}`,
              transition:"all 0.3s"
            }}>
              {pasoIdx>i?"✓":i+1}
            </div>
            <div style={{fontSize:10,color:pasoIdx>=i?C.t2:C.t3,fontWeight:pasoIdx===i?600:400}}>{l}</div>
          </div>
          {i<2&&<div style={{flex:1,height:2,background:pasoIdx>i?C.green:C.border,marginBottom:18,marginLeft:4,marginRight:4,transition:"background 0.3s"}}/>}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",fontFamily:"var(--font-sans)",background:C.bg}}>
      <style>{`@keyframes pSlide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* HEADER */}
      <div style={{background:`linear-gradient(180deg, #0A1830 0%, ${C.bg} 100%)`,borderBottom:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle, rgba(224,91,40,0.18) 0%, transparent 60%)",pointerEvents:"none",zIndex:0}}/>
        <div style={{position:"absolute",top:10,right:-30,width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle, rgba(52,212,144,0.10) 0%, transparent 70%)",pointerEvents:"none",zIndex:0}}/>
        <div style={{maxWidth:500,margin:"0 auto",padding:isMobile?"6px 16px":"4px 20px",position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <img src={LOGO} alt="DEXON" onError={e=>{e.target.style.display="none";}} style={{height:isMobile?72:76,...LOGO_STYLE_DARK}}/>
            </div>
            <a href={`https://wa.me/${ADMIN_TEL}`} target="_blank" rel="noreferrer"
               style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.25)",borderRadius:10,textDecoration:"none",minHeight:40}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              <span style={{fontSize:13,color:"#25D366",fontWeight:600}}>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{maxWidth:600,margin:"0 auto",padding:isMobile?"20px 14px 40px":"20px 32px 36px"}}>
       <div key={paso} style={{animation:"pSlide 0.3s ease-out"}}>

        {/* PASO LISTA */}
        {paso==="lista"&&(isMobile?(
          /* ── MOBILE: layout original ── */
          <>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:C.t2,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:0.6}}>Día de juego</div>
            <CalendarioMini value={fecha} onChange={e=>{setFecha(e);setSlotsSel([]);}} min={hoy()} blockedDates={blockedDates} feriadoDates={feriadoDates}/>
          </div>
          {isDiaBloqueado(fecha)&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:14,padding:"14px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:28,flexShrink:0}}>🔒</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.red}}>Cancha cerrada</div>
              <div style={{fontSize:12,color:"#E8A8A8",marginTop:2,lineHeight:1.4}}>{isDiaBloqueado(fecha).motivo||"No disponible este día."}</div>
            </div>
          </div>}
          {!isDiaBloqueado(fecha)&&getFeriado(fecha)&&<div style={{background:"rgba(245,192,96,0.08)",border:`1px solid ${C.yellowBd}`,borderRadius:14,padding:"14px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:28,flexShrink:0}}>🇵🇾</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.yellow}}>Feriado nacional — {getFeriado(fecha).localName}</div>
              <div style={{fontSize:12,color:"#E8C898",marginTop:2,lineHeight:1.4}}>El horario puede estar extendido. Consultá disponibilidad.</div>
            </div>
          </div>}
          {climaFecha&&<div style={{...card,marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
            <div style={{fontSize:36,flexShrink:0}}>{climaIcon(climaFecha.code)}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.t1}}>Pronostico — Tavapy</div>
              <div style={{fontSize:12,color:C.t2,marginTop:3}}>{climaFecha.max}° max · {climaFecha.min}° min · {climaFecha.lluvia}% lluvia</div>
            </div>
            {climaFecha.lluvia>=60&&<Badge type="info">Lluvia probable</Badge>}
            {climaFecha.lluvia<20&&<Badge type="ok">Buen dia</Badge>}
          </div>}
          {diaTieneDesc()&&<div style={{background:`linear-gradient(135deg,${C.yellowBg},rgba(58,42,16,0.8))`,border:`1px solid ${C.yellowBd}`,borderRadius:14,padding:"14px 18px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:28,flexShrink:0}}>🎉</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.yellow}}>Dia de descuento — {descPct}% off</div>
              <div style={{fontSize:12,color:"#E8C898",marginTop:2,lineHeight:1.4}}>Descuento aplicado automaticamente en todos los precios.</div>
            </div>
          </div>}
          <div style={{marginBottom:10}}>
            {libres.length>0&&libres.length<=3&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,background:"rgba(240,96,96,0.08)",border:"1px solid rgba(240,96,96,0.25)",marginBottom:8}}>
              <span style={{fontSize:16}}>⚡</span>
              <span style={{fontSize:13,fontWeight:600,color:C.red}}>¡Solo {libres.length} horario{libres.length!==1?"s":""} disponible{libres.length!==1?"s":""}!</span>
            </div>}
            <div style={{display:"flex",gap:2,height:7,borderRadius:6,overflow:"hidden"}}>
              {horasArr.map(h=>{const occ=!!(ocupado(h)||pasado(h));const pico=h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin;return<div key={h} style={{flex:1,background:occ?C.redBg:pico?"rgba(224,91,40,0.5)":C.green,opacity:occ?0.7:1}}/>;  })}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:C.t3}}>
              <span>{cfg.hora_inicio}:00</span>
              <span style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:1,background:C.green,display:"inline-block"}}/>Libre</span>
                <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:1,background:"rgba(224,91,40,0.5)",display:"inline-block"}}/>Pico</span>
                <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:1,background:C.redBg,display:"inline-block"}}/>Ocupado</span>
              </span>
              <span>{cfg.hora_fin}:00</span>
            </div>
          </div>
          <div style={{...card,overflow:"hidden",marginBottom:12,padding:0}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:C.t1}}>Horarios disponibles</div>
                <div style={{fontSize:12,color:C.t3,marginTop:3,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:libres.length<=3&&libres.length>0?C.red:C.green,fontWeight:700}}>{libres.length}</span>
                  <span>de</span>
                  <span style={{color:C.t2,fontWeight:600}}>{horasArr.length}</span>
                  <span>disponibles</span>
                </div>
              </div>
              {slotsSel.length>0&&<div style={{background:"rgba(224,91,40,0.12)",color:C.coral,fontSize:12,fontWeight:700,padding:"5px 11px",borderRadius:20,border:`1px solid ${C.coralD}`,flexShrink:0}}>{slotsSel.length} seleccionado{slotsSel.length>1?"s":""}</div>}
            </div>
            {libres.length===0&&<div style={{padding:"32px",textAlign:"center",color:C.t3,fontSize:13}}>Sin horarios disponibles para este dia.</div>}
            {libres.map(h=>{
              const isPico=h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin;
              const selec=slotsSel.includes(h);
              const tieneDesc=diaTieneDesc();
              const precioOriginal=precioH(h);
              const precioFinal=precioConDesc(h);
              return (
                <div key={h} onClick={()=>toggleSlot(h)}
                     style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                             background:selec?`linear-gradient(90deg,${C.bgHover},${C.bgElev})`:"transparent",
                             transition:"background 0.15s"}}>
                  <div style={{width:52,height:52,borderRadius:14,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                               background:selec?C.coral:isPico?"rgba(224,91,40,0.1)":C.bgElev,
                               border:`1.5px solid ${selec?C.coral:isPico?C.coralAlpha:C.border}`,
                               transition:"all 0.15s"}}>
                    <div style={{fontSize:16,fontWeight:700,color:selec?"#fff":isPico?C.coral:C.t1,lineHeight:1}}>{h}</div>
                    <div style={{fontSize:9,color:selec?"rgba(255,255,255,0.7)":C.t3,marginTop:2}}>hs</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,color:C.t1}}>{h}:00 — {h+1}:00</div>
                    <div style={{fontSize:12,color:C.t3,marginTop:2,display:"flex",alignItems:"center",gap:6}}>
                      {isPico?<span style={{color:C.coral}}>Horario pico</span>:<span>Tarifa normal</span>}
                      {tieneDesc&&<span style={{color:C.yellow}}>· -{descPct}%</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {tieneDesc&&<div style={{fontSize:11,color:C.t3,textDecoration:"line-through",lineHeight:1,marginBottom:2}}>{gs(precioOriginal)}</div>}
                    <div style={{fontSize:15,fontWeight:700,color:selec?C.coral:tieneDesc?C.yellow:C.t1}}>{gs(precioFinal)}</div>
                  </div>
                  <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${selec?C.coral:C.border}`,background:selec?C.coral:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                    {selec&&<svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              );
            })}
          </div>
          {ocupados.length>0&&<div style={{...card,padding:0,marginBottom:16,opacity:0.6}}>
            <div style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:500,color:C.t3}}>No disponibles</div>
            </div>
            {ocupados.map(h=>(
              <div key={h} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderBottom:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,color:C.t3}}>{h}:00 — {h+1}:00</div>
                <span style={{fontSize:11,background:C.bgElev,color:C.t3,padding:"3px 10px",borderRadius:100,border:`1px solid ${C.border}`}}>Ocupado</span>
              </div>
            ))}
          </div>}
          {slotsSel.length>0&&<>
            <div style={{...card,marginBottom:12,background:C.bgElev}}>
              <div style={{fontSize:12,color:C.t3,marginBottom:8}}>Seleccionados · {slotsSel.length}h</div>
              <div style={{fontSize:14,fontWeight:600,color:C.t1,marginBottom:10}}>{slotsSel.map(h=>`${h}:00`).join(" · ")} hs</div>
              {ahorroDia>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.t2,marginBottom:4}}><span>Subtotal</span><span style={{textDecoration:"line-through"}}>{gs(subtotalSinDesc)}</span></div>}
              {ahorroDia>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.yellow,marginBottom:6}}><span>Descuento del dia (-{descPct}%)</span><span>-{gs(ahorroDia)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:17,color:C.coral,fontWeight:800,paddingTop:8,borderTop:`1px solid ${C.border}`}}><span>Total</span><span>{gs(totalSel)}</span></div>
            </div>
            <button onClick={()=>setPaso("datos")}
              style={{width:"100%",padding:"16px",background:`linear-gradient(135deg,${C.coral},${C.coralD})`,color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",boxShadow:"0 8px 24px rgba(224,91,40,0.35)"}}>
              Reservar {slotsSel.length} hora{slotsSel.length>1?"s":""} →
            </button>
          </>}
          </>
        ):(
          /* ── DESKTOP: 2 columnas ── */
          <>
          <StepBar/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:36,alignItems:"start"}}>
            {/* COLUMNA IZQUIERDA */}
            <div>
              <h1 style={{fontSize:28,fontWeight:900,color:C.t1,margin:"0 0 6px",letterSpacing:-0.8,lineHeight:1.1}}>¿Cuándo querés jugar?</h1>
              <p style={{fontSize:13,color:C.t2,margin:"0 0 16px",lineHeight:1.5}}>Elegí día y horarios disponibles. Podés reservar hasta 4 horas seguidas.</p>
              {/* Pills de fecha */}
              <div style={{display:"flex",gap:8,marginBottom:18,overflowX:"auto",paddingBottom:4}}>
                {Array.from({length:14},(_,i)=>{
                  const d=new Date(); d.setDate(d.getDate()+i);
                  const ds=d.toISOString().slice(0,10);
                  const sel=ds===fecha;
                  return(
                    <button key={ds} onClick={()=>{setFecha(ds);setSlotsSel([]);}}
                      style={{flexShrink:0,minWidth:60,padding:"10px 8px",borderRadius:12,
                        border:`2px solid ${sel?C.coral:C.border}`,
                        background:sel?C.coral:"transparent",
                        cursor:"pointer",fontFamily:"var(--font-sans)",textAlign:"center",
                        transition:"all 0.15s"}}>
                      <div style={{fontSize:9,color:sel?"rgba(255,255,255,0.75)":C.t3,fontWeight:700,letterSpacing:1,marginBottom:4}}>{i===0?"HOY":DIAS[d.getDay()].toUpperCase()}</div>
                      <div style={{fontSize:20,fontWeight:800,color:sel?"#fff":C.t1}}>{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
              {/* Banners feriado / bloqueado / descuento */}
              {isDiaBloqueado(fecha)&&<div style={{background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:18}}>🔒</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.red}}>Cancha cerrada</div>
                  <div style={{fontSize:12,color:"#E8A8A8",marginTop:2}}>{isDiaBloqueado(fecha).motivo||"No disponible este día."}</div>
                </div>
              </div>}
              {!isDiaBloqueado(fecha)&&getFeriado(fecha)&&<div style={{background:"rgba(245,192,96,0.08)",border:`1px solid ${C.yellowBd}`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:18}}>🇵🇾</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.yellow}}>Feriado nacional — {getFeriado(fecha).localName}</div>
                  <div style={{fontSize:12,color:"#E8C898",marginTop:2}}>El horario puede estar extendido. Consultá disponibilidad.</div>
                </div>
              </div>}
              {diaTieneDesc()&&<div style={{background:`linear-gradient(135deg,${C.yellowBg},rgba(58,42,16,0.8))`,border:`1px solid ${C.yellowBd}`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:18}}>🎉</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.yellow}}>Día de descuento — {descPct}% off</div>
                  <div style={{fontSize:12,color:"#E8C898",marginTop:2}}>Descuento aplicado automáticamente en todos los precios.</div>
                </div>
              </div>}
              {/* Header de slots */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.t2,textTransform:"uppercase",letterSpacing:1.5}}>
                  Horarios disponibles{fecha?` · ${DIAS[diaFecha]?.toUpperCase()} ${new Date(fecha+"T00:00:00").getDate()}`:""}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.t2}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:C.coral,display:"inline-block"}}/>
                  Hora pico
                </div>
              </div>
              {/* Grid 4 columnas */}
              {libres.length===0&&<div style={{padding:"48px 0",textAlign:"center",color:C.t3,fontSize:14}}>Sin horarios disponibles para este día.</div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
                {horasArr.map(h=>{
                  const occ=!!(ocupado(h)||pasado(h));
                  const sel=slotsSel.includes(h);
                  const isPico=h>=cfg.hora_pico_inicio&&h<cfg.hora_pico_fin;
                  const tieneDesc=diaTieneDesc();
                  const precioFinal=precioConDesc(h);
                  const precioOriginal=precioH(h);
                  return(
                    <div key={h} onClick={()=>!occ&&toggleSlot(h)}
                      style={{padding:"12px 10px",borderRadius:12,
                        border:`2px solid ${sel?C.coral:occ?"rgba(255,255,255,0.06)":isPico?C.coralAlpha:C.border}`,
                        background:sel?`linear-gradient(135deg,${C.coral},${C.coralD})`:occ?C.bgElev:isPico?"rgba(224,91,40,0.04)":"rgba(255,255,255,0.02)",
                        cursor:occ?"default":"pointer",
                        opacity:occ?0.45:1,
                        position:"relative",
                        transition:"all 0.15s",
                        userSelect:"none"}}>
                      {isPico&&!occ&&!sel&&<span style={{position:"absolute",top:10,right:12,width:7,height:7,borderRadius:"50%",background:C.coral}}/>}
                      {sel&&<span style={{position:"absolute",top:10,right:12,display:"flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,0.25)"}}>
                        <svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>}
                      <div style={{fontSize:16,fontWeight:800,color:sel?"#fff":occ?C.t3:C.t1,marginBottom:4,lineHeight:1}}>{h}:00</div>
                      {occ
                        ?<div style={{fontSize:12,color:C.t3}}>Reservado</div>
                        :<>
                          {tieneDesc&&<div style={{fontSize:11,color:sel?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.3)",textDecoration:"line-through",lineHeight:1,marginBottom:2}}>{gs(precioOriginal)}</div>}
                          <div style={{fontSize:13,fontWeight:600,color:sel?"rgba(255,255,255,0.85)":tieneDesc?C.yellow:C.t2}}>{gs(precioFinal)}</div>
                        </>
                      }
                    </div>
                  );
                })}
              </div>
              {/* Leyenda */}
              <div style={{display:"flex",gap:16,fontSize:11,color:C.t3}}>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:2,background:C.coral,display:"inline-block"}}/>Seleccionado</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:C.coral,display:"inline-block"}}/>Hora pico</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:2,background:C.bgElev,border:`1px solid ${C.border}`,display:"inline-block"}}/>Reservado</span>
              </div>
            </div>
            {/* COLUMNA DERECHA — Sticky */}
            <div style={{position:"sticky",top:20}}>
              <div style={{background:C.bgCard,borderRadius:18,border:`1px solid ${C.border}`,padding:"20px 20px",boxShadow:"0 12px 48px rgba(0,0,0,0.35)"}}>
                <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Tu reserva</div>
                {slotsSel.length>0?(
                  <>
                    <div style={{fontSize:20,fontWeight:800,color:C.t1,marginBottom:4}}>{fmtFechaLegible(fecha)}</div>
                    <div style={{fontSize:15,fontWeight:700,color:C.coral,marginBottom:16}}>
                      {Math.min(...slotsSel)}:00 — {Math.max(...slotsSel)+1}:00
                    </div>
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginBottom:12,display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.t2}}>
                        <span>{slotsSel.length} horario{slotsSel.length>1?"s":""}</span>
                        <span>{gs(subtotalSinDesc)}</span>
                      </div>
                      {ahorroDia>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.yellow}}>
                        <span>Descuento {DIAS[diaFecha]?.toLowerCase()}</span>
                        <span>— {gs(ahorroDia)}</span>
                      </div>}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingTop:4,borderTop:`1px solid ${C.border}`}}>
                      <span style={{fontSize:14,fontWeight:700,color:C.t1}}>Total</span>
                      <span style={{fontSize:22,fontWeight:900,color:C.coral}}>{gs(totalSel)}</span>
                    </div>
                    <button onClick={()=>setPaso("datos")}
                      style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${C.coral},${C.coralD})`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",boxShadow:"0 8px 24px rgba(224,91,40,0.35)",marginBottom:12,transition:"opacity 0.15s"}}>
                      Continuar →
                    </button>
                    <div style={{textAlign:"center",fontSize:11,color:C.t3,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                      <svg width="11" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Pago seguro · Pagopar / Transferencia
                    </div>
                  </>
                ):(
                  <div style={{textAlign:"center",padding:"24px 0",color:C.t3}}>
                    <div style={{fontSize:36,marginBottom:10}}>📅</div>
                    <div style={{fontSize:14,fontWeight:600,color:C.t2,marginBottom:4}}>Seleccioná un horario</div>
                    <div style={{fontSize:12,lineHeight:1.5}}>Podés elegir hasta<br/>4 horas seguidas</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
        ))}

        {/* PASO DATOS */}
        {paso==="datos"&&<>
          <StepBar/>
          <button onClick={()=>{setPaso("lista");setMsg("");}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.t2,marginBottom:20,fontFamily:"var(--font-sans)",padding:0}}>
            ← Volver
          </button>
          <div style={{...card,padding:"24px"}}>
            {/* Resumen */}
            <div style={{background:`linear-gradient(135deg,${C.bgHover},${C.bgElev})`,borderRadius:12,padding:"12px 16px",marginBottom:16,border:`1px solid ${C.borderL}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.t1}}>{fmtFechaLegible(fecha)}</div>
                <div style={{fontSize:12,color:C.t2,marginTop:2}}>{slotsSel.map(h=>`${h}:00`).join(" — ")} hs</div>
              </div>
              <div style={{fontSize:16,fontWeight:800,color:C.coral}}>{gs(totalSel)}</div>
            </div>

            {/* Welcome card cliente reconocido */}
            {clienteEncontrado&&<div style={{background:`linear-gradient(135deg,rgba(52,212,144,0.10),rgba(52,212,144,0.02))`,border:`1px solid ${C.greenBd}`,borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10,animation:"pSlide 0.25s ease-out"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:avatarBg(clienteEncontrado.nombre),color:avatarFg(clienteEncontrado.nombre),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0}}>{initials(clienteEncontrado.nombre)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.green}}>¡Hola de nuevo, {clienteEncontrado.nombre.split(" ")[0]}!</div>
                <div style={{fontSize:11,color:"#5ABDA8",marginTop:1}}>
                  {(()=>{const tu=turnos.filter(t=>t.cliente_id===clienteEncontrado.id).length;return tu>0?`${tu} turno${tu!==1?"s":""} con nosotros.`:"Bienvenido al portal.";})()}
                  {clienteEncontrado.saldo_favor>0&&<span> Saldo: <strong>{gs(clienteEncontrado.saldo_favor)}</strong></span>}
                </div>
              </div>
            </div>}

            {/* Nombre y teléfono */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <label style={{fontSize:12,color:C.t2,fontWeight:600,display:"block",marginBottom:6}}>Nombre completo</label>
                <input type="text" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} style={inpP} placeholder="Tu nombre"/>
              </div>
              <div>
                <label style={{fontSize:12,color:C.t2,fontWeight:600,display:"block",marginBottom:6}}>Teléfono</label>
                <input type="tel" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} style={inpP} placeholder="0981 xxx xxx"/>
              </div>
            </div>

            {/* Saldo a favor */}
            {clienteEncontrado && saldoDisponible>0 && (
              <div style={{background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:12,padding:"10px 14px",marginBottom:12}}>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${usarSaldo?C.green:C.border}`,background:usarSaldo?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}} onClick={()=>setUsarSaldo(s=>!s)}>
                    {usarSaldo&&<svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{fontSize:12,color:C.green,fontWeight:600}}>Usar {gs(saldoDisponible)} de saldo a favor</div>
                </label>
              </div>
            )}

            {/* Método de pago */}
            <div style={{fontSize:11,color:C.t2,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Método de pago</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {id:"transferencia",title:"Transferencia",sub:"UENO · Comprobante WA",icon:"🏦"},
                {id:"pagopar",title:"Pago online",sub:"Tarjeta · PIX · Tigo · QR",icon:"💳"},
              ].map(({id,title,sub,icon})=>(
                <div key={id} onClick={()=>setMetodoPago(id)}
                     style={{border:`2px solid ${metodoPago===id?C.coral:C.border}`,borderRadius:12,padding:"10px 12px",cursor:"pointer",background:metodoPago===id?C.coralAlpha:C.bgElev,transition:"all 0.15s",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontSize:16,flexShrink:0}}>{icon}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:metodoPago===id?C.coral:C.t1}}>{title}</div>
                    <div style={{fontSize:10,color:C.t3,lineHeight:1.3}}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Datos transferencia */}
            {metodoPago==="transferencia"&&(
              <div style={{background:C.bgElev,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:12,color:C.t1,lineHeight:1.9}}>
                  <div><span style={{color:C.t3}}>Banco:</span> <strong>UENO</strong></div>
                  <div><span style={{color:C.t3}}>Alias:</span> <strong style={{letterSpacing:1.2,color:C.coral}}>80168039-5</strong></div>
                  <div><span style={{color:C.t3}}>Concepto:</span> <strong>Reserva DEXON</strong></div>
                </div>
                <div style={{marginTop:10,padding:"8px 12px",background:C.greenBg,borderRadius:8,border:`1px solid ${C.greenBd}`,fontSize:11,color:"#5ABDA8",lineHeight:1.7}}>
                  1. Transferí al alias <strong>80168039-5</strong><br/>
                  2. Tocá el botón verde<br/>
                  3. Enviá el comprobante por WhatsApp
                </div>
              </div>
            )}

            {/* Datos pagopar */}
            {metodoPago==="pagopar"&&(
              <div style={{background:C.bgElev,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}>
                <label style={{fontSize:12,color:C.t2,fontWeight:600,display:"block",marginBottom:6}}>Cédula de identidad <span style={{color:C.coral}}>*</span></label>
                <input type="text" inputMode="numeric" value={form.documento} onChange={e=>setForm(f=>({...f,documento:e.target.value.replace(/\D/g,"")}))} style={inpP} placeholder="Número de CI (sin puntos)"/>
                <div style={{fontSize:11,color:C.t3,marginTop:4}}>Requerido por la pasarela de pago.</div>
              </div>
            )}

            {/* Código referido */}
            <div style={{background:C.bgElev,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${refValido?C.greenBd:refMatch&&!refValido?C.redBd:C.border}`,transition:"border-color 0.2s"}}>
              <label style={{fontSize:12,color:C.t2,fontWeight:600,display:"block",marginBottom:6}}>Código de referido <span style={{color:C.t3,fontWeight:400}}>(opcional · {refDescPct}% off)</span></label>
              <input type="text" value={referrerCode} onChange={e=>setReferrerCode(e.target.value.toUpperCase())} style={{...inpP,textTransform:"uppercase",letterSpacing:1}} placeholder="REF-ABCD1234"/>
              {refValido&&<div style={{fontSize:11,color:C.green,marginTop:6,display:"flex",alignItems:"center",gap:5}}>✓ {codigoInstit?codigoInstit.nombre:`Código de ${refMatch?.nombre||"referido"}`} — {refDescPct}% ({gs(descRef)})</div>}
              {refMatch&&!refValido&&<div style={{fontSize:11,color:C.red,marginTop:6}}>No podés usar tu propio código</div>}
              {refCodeNorm.length>=4&&!refValido&&!refMatch&&<div style={{fontSize:11,color:C.yellow,marginTop:6}}>Código no encontrado</div>}
            </div>

            {/* Desglose si hay descuentos */}
            {(ahorroDia>0||descRef>0||descSaldo>0)&&<div style={{background:`linear-gradient(135deg,${C.bgHover},${C.bgElev})`,borderRadius:10,padding:"10px 14px",marginBottom:12,border:`1px solid ${C.borderL}`,fontSize:12}}>
              {ahorroDia>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.yellow,marginBottom:2}}><span>Descuento del día (-{descPct}%)</span><span>-{gs(ahorroDia)}</span></div>}
              {descRef>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.green,marginBottom:2}}><span>Código referido</span><span>-{gs(descRef)}</span></div>}
              {descSaldo>0&&<div style={{display:"flex",justifyContent:"space-between",color:C.green,marginBottom:2}}><span>Saldo a favor</span><span>-{gs(descSaldo)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,color:C.t1,marginTop:6,paddingTop:6,borderTop:`1px solid ${C.border}`}}><span>Total</span><span style={{color:C.coral}}>{gs(totalSel)}</span></div>
            </div>}

            {msg&&<div style={{background:C.redBg,color:C.red,border:`1px solid ${C.redBd}`,borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:12}}>{msg}</div>}

            {metodoPago==="transferencia"?(
              <button onClick={async()=>{
                if(!form.nombre.trim()||!form.telefono.trim()){setMsg("Completá tu nombre y teléfono.");return;}
                setSaving(true);setMsg("");
                try {
                  const r = await fetch("/api/reservar",{method:"POST",headers:apiHeaders(),body:JSON.stringify({nombre:form.nombre.trim(),telefono:form.telefono.trim(),fecha,slots:slotsSel,referrerCode:refValido?refCodeNorm:null,usarSaldo:usarSaldo&&descSaldo>0})});
                  const d = await r.json();
                  if(!r.ok){setMsg(d.error||"Error al guardar. Intentalo de nuevo.");setSaving(false);return;}
                  setMiCodigo(d.referrer_code||"");
                  const horasStr=slotsSel.map(h=>`${h}:00`).join(", ");
                  fetch("/api/whatsapp/enviar",{method:"POST",headers:apiHeaders(),body:JSON.stringify({tipo:"transferencia_pendiente",nombre:form.nombre.trim(),telefono:form.telefono.trim(),fecha:fmtFechaLegible(fecha),horarios:horasStr+"hs",monto:gs(d.total||totalSel)})}).catch(()=>{});
                  setPaso("confirmado");
                } catch(e){console.error(e);setMsg("Error de conexión. Intentá de nuevo.");}
                setSaving(false);
              }} disabled={saving}
                style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${C.coral},${C.coralD})`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",boxShadow:"0 6px 20px rgba(224,91,40,0.3)",opacity:saving?0.7:1}}>
                {saving?"Guardando...":"Confirmar reserva →"}
              </button>
            ):(
              <button onClick={async()=>{
                if(!form.nombre.trim()||!form.telefono.trim()){setMsg("Completá tus datos.");return;}
                if(!form.documento.trim()){setMsg("Ingresá tu cédula de identidad.");return;}
                if(slotsSel.length===0){setMsg("Seleccioná al menos un horario.");return;}
                setSaving(true);setMsg("");
                try {
                  const r = await fetch("/api/pagopar/crear-pago",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre:form.nombre.trim(),telefono:form.telefono.trim(),documento:form.documento.trim(),fecha,slots:slotsSel,total:totalSel,referrerCode:refValido?refCodeNorm:null,usarSaldo:usarSaldo&&descSaldo>0,saldoUsado:descSaldo})});
                  const d = await r.json();
                  if(!r.ok||!d.checkout_url){setMsg((d.error||"Error iniciando pago.")+(d.detail?` (${d.detail})`:""));console.error("[crear-pago]",d);setSaving(false);return;}
                  window.location.href = d.checkout_url;
                } catch(e){console.error(e);setMsg("Error de conexión. Intentá de nuevo.");setSaving(false);}
              }} disabled={saving||!form.documento.trim()}
                style={{width:"100%",padding:"15px",background:!form.documento.trim()?"#1A2A48":`linear-gradient(135deg,${C.coral},${C.coralD})`,color:!form.documento.trim()?C.t3:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:(!form.documento.trim()||saving)?"not-allowed":"pointer",fontFamily:"var(--font-sans)",boxShadow:form.documento.trim()?"0 6px 20px rgba(224,91,40,0.3)":"none",opacity:saving?0.7:1,transition:"all 0.2s"}}>
                {saving?"Procesando...":(!form.documento.trim()?"Ingresá tu CI para continuar":"Pagar online →")}
              </button>
            )}
          </div>
        </>}

        {/* PASO CONFIRMADO */}
        {paso==="confirmado"&&<>
          {/* Ticket */}
          <div style={{borderRadius:20,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",marginBottom:16}}>
            {/* Header */}
            <div style={{background:metodoPago==="transferencia"?`linear-gradient(135deg,#071E12,#0A2A18)`:`linear-gradient(135deg,#071E12,#092A18)`,padding:"20px 20px 16px",textAlign:"center",position:"relative"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(52,212,144,0.15)",border:`2px solid ${C.greenBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px",boxShadow:"0 0 24px rgba(52,212,144,0.2)"}}>
                {metodoPago==="transferencia"?"⏳":"✓"}
              </div>
              <div style={{fontSize:18,fontWeight:800,color:C.green,marginBottom:4,letterSpacing:-0.3}}>
                {metodoPago==="transferencia"?"¡Reserva recibida!":"¡Reserva confirmada!"}
              </div>
              <div style={{fontSize:13,color:"rgba(52,212,144,0.65)",lineHeight:1.5}}>
                {metodoPago==="transferencia"?"Te avisamos al confirmar tu transferencia":"Tu turno está reservado, ¡nos vemos!"}
              </div>
            </div>
            {/* Torn edge */}
            <div style={{display:"flex",alignItems:"center",background:C.bgCard,height:22,position:"relative"}}>
              <div style={{position:"absolute",left:-11,width:22,height:22,borderRadius:"50%",background:C.bg,zIndex:1}}/>
              <div style={{flex:1,borderTop:`2px dashed ${C.border}`,margin:"0 16px"}}/>
              <div style={{position:"absolute",right:-11,width:22,height:22,borderRadius:"50%",background:C.bg,zIndex:1}}/>
            </div>
            {/* Body */}
            <div style={{background:C.bgCard,padding:"18px 22px 22px"}}>
              <div style={{textAlign:"center",marginBottom:16}}>
                <div style={{fontSize:11,color:C.t3,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{cfg.nombre_club} · Tavapy</div>
                <div style={{fontSize:20,fontWeight:800,color:C.t1,letterSpacing:-0.3}}>{fmtFechaLegible(fecha)}</div>
                <div style={{fontSize:18,fontWeight:700,color:C.coral,marginTop:4}}>{slotsSel.map(h=>`${h}:00`).join(" — ")} hs</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                {[{l:"Duración",v:`${slotsSel.length}h`},{l:"Total",v:gs(totalSel)},{l:"A nombre de",v:form.nombre.split(" ")[0]},{l:"Método",v:metodoPago==="transferencia"?"Transferencia":"Pago online"}].map(({l,v})=>(
                  <div key={l} style={{background:C.bgElev,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
                  </div>
                ))}
              </div>
              {metodoPago==="transferencia"&&<div style={{background:"rgba(52,212,144,0.06)",border:`1px solid ${C.greenBd}`,borderRadius:12,padding:"12px 16px",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:4}}>Próximo paso</div>
                <div style={{fontSize:12,color:"#5ABDA8",lineHeight:1.6}}>Transferí al alias <strong>80168039-5</strong> (UENO) y enviá el comprobante respondiendo el WhatsApp que te mandamos.</div>
              </div>}
              {/* Botón compartir */}
              {(()=>{
                const txt=`🎾 Reservé en ${cfg.nombre_club}\n📅 ${fmtFechaLegible(fecha)}\n🕐 ${slotsSel.map(h=>`${h}:00`).join(" — ")} hs\n💰 ${gs(totalSel)}\n\n👉 https://www.dexon.com.py`;
                const share=async()=>{
                  if(navigator.share){
                    try{await navigator.share({title:"Mi reserva en DEXON Padel",text:txt});}catch(e){}
                  } else {
                    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,"_blank");
                  }
                };
                return <button onClick={share} style={{width:"100%",padding:"12px",background:C.bgElev,color:C.t1,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=C.bgHover;e.currentTarget.style.borderColor=C.coralD;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=C.bgElev;e.currentTarget.style.borderColor=C.border;}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Compartir mi turno
                </button>;
              })()}
            </div>
          </div>

          {miCodigo&&(
            <div style={{background:"linear-gradient(135deg,#1A0A30,#0A1820)",borderRadius:14,padding:"18px",marginBottom:12,border:`1px solid ${C.purpleBd}`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.yellow,marginBottom:12}}>Tu codigo de referido</div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{flex:1,background:C.bg,border:`1.5px dashed ${C.yellowBd}`,borderRadius:10,padding:"12px",fontSize:18,fontWeight:800,color:C.yellow,letterSpacing:2,textAlign:"center"}}>{miCodigo}</div>
                <button onClick={()=>{navigator.clipboard.writeText(miCodigo);setMsg("Copiado!");setTimeout(()=>setMsg(""),1500);}} style={{padding:"12px 16px",background:C.yellowBg,color:C.yellow,border:`1px solid ${C.yellowBd}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",whiteSpace:"nowrap"}}>Copiar</button>
              </div>
              <div style={{fontSize:12,color:"#E8C898",lineHeight:1.6,marginBottom:12}}>Compartilo con amigos. Cuando reserven con tu codigo, ambos obtienen descuento.</div>
              <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`Reservá en ${cfg.nombre_club} con mi código *${miCodigo}* y obtenés ${refDescPct}% de descuento.\n\n👉 Reservá acá: https://www.dexon.com.py`)}`,"_blank")}
                style={{width:"100%",padding:"11px",background:"#25D366",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                Compartir por WhatsApp
              </button>
            </div>
          )}

          <button onClick={()=>{setPaso("lista");setSlotsSel([]);setForm({nombre:"",telefono:"",documento:""});setReferrerCode("");setMiCodigo("");setUsarSaldo(false);}}
            style={{width:"100%",padding:"13px",background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:12,fontSize:14,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
            Volver al inicio
          </button>
        </>}
       </div>
      </div>
    </div>
  );
};


export default PortalCliente;
