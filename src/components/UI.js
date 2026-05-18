import React, { useEffect, useRef } from "react";
import { C, inp, lbl } from "../lib/constants.js";
import { useIsMobile } from "../lib/hooks.js";
import { initials, avatarBg, avatarFg } from "../lib/utils.js";

// ── AVATAR ──
export const Avatar = ({nombre,size=36}) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:avatarBg(nombre),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:700,color:avatarFg(nombre),flexShrink:0,border:`1.5px solid ${avatarFg(nombre)}22`}}>
    {initials(nombre)}
  </div>
);

// ── WHATSAPP ICON ──
export const WhatsAppIcon = ({size=14,color="#25D366"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{flexShrink:0,display:"block"}} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
  </svg>
);

// ── BADGE ──
export const Badge = ({type,children}) => {
  const m = {
    ok:[C.greenBg,C.green,C.greenBd], warn:[C.yellowBg,C.yellow,C.yellowBd],
    danger:[C.redBg,C.red,C.redBd], info:[C.infoBg,C.info,"#0E2A50"],
    coral:["#2A1008",C.coral,"#4A1A08"], purple:[C.purpleBg,C.purple,C.purpleBd],
    gray:[C.bgElev,C.t3,C.border],
  };
  const [bg,color,bd] = m[type]||m.gray;
  return <span style={{background:bg,color,border:`1px solid ${bd}`,fontSize:11,padding:"3px 9px",borderRadius:100,fontWeight:600,display:"inline-block",whiteSpace:"nowrap"}}>{children}</span>;
};

// ── BTN ──
export const Btn = ({v="default",sm,children,...p}) => {
  const s = {
    primary:{background:`linear-gradient(135deg,${C.coral},${C.coralD})`,color:"#fff",border:"none",boxShadow:"0 4px 14px rgba(224,91,40,0.3)"},
    ghost:{background:C.bgElev,color:C.t1,border:`1px solid ${C.border}`},
    danger:{background:C.redBg,color:C.red,border:`1px solid ${C.redBd}`},
    success:{background:C.greenBg,color:C.green,border:`1px solid ${C.greenBd}`},
    blue:{background:`linear-gradient(135deg,${C.blue},${C.blueM})`,color:"#fff",border:"none"},
    default:{background:C.bgElev,color:C.t1,border:`1px solid ${C.border}`},
  };
  return <button {...p} style={{padding:sm?"5px 12px":"8px 16px",borderRadius:8,fontSize:sm?12:13,cursor:"pointer",fontFamily:"var(--font-sans)",fontWeight:500,transition:"all 0.15s",...(s[v]||s.default),...p.style}}>{children}</button>;
};

// ── FORM HELPERS ──
export const FG = ({label,children}) => <div style={{marginBottom:14}}>{label&&<label style={lbl}>{label}</label>}{children}</div>;
export const Inp = ({label,...p}) => {
  const ref = useRef();
  useEffect(()=>{if(ref.current&&document.activeElement!==ref.current)ref.current.value=p.value??"";},[p.value]);
  return <FG label={label}><input ref={ref} {...p} style={inp} defaultValue={p.value??""} onChange={p.onChange}/></FG>;
};
export const Sel = ({label,children,...p}) => <FG label={label}><select {...p} style={inp}>{children}</select></FG>;
export const R2 = ({children,isMobile}) => <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>{children}</div>;
export const Div = () => <div style={{height:"1px",background:C.border,margin:"16px 0"}}/>;
export const Empty = ({t}) => <div style={{textAlign:"center",padding:"40px 0",color:C.t3,fontSize:13}}>{t}</div>;

// ── ESTADO/TIPO BADGES ──
export const estadoBadge = e => {
  if(e==="confirmado") return <Badge type="ok">Confirmado</Badge>;
  if(e==="cancelado") return <Badge type="danger">Cancelado</Badge>;
  if(e==="no_show") return <Badge type="warn">No show</Badge>;
  return <Badge type="gray">Reservado</Badge>;
};
export const tipoBadge = t => {
  if(t==="abono") return <Badge type="purple">Abono</Badge>;
  if(t==="clase") return <Badge type="info">Clase</Badge>;
  if(t==="bloqueado") return <Badge type="gray">Bloqueado</Badge>;
  return <Badge type="coral">Ocasional</Badge>;
};

// ── MODAL ──
export const Modal = ({show,onClose,title,children,width=420}) => {
  const isMobile = useIsMobile();
  if(!show) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.8)",backdropFilter:"blur(4px)",padding:isMobile?"12px 10px calc(12px + env(safe-area-inset-bottom))":"24px 16px",overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:width,background:C.bgCard,borderRadius:isMobile?14:18,boxShadow:"0 24px 80px rgba(0,0,0,0.7)",border:`1px solid ${C.borderL}`,flexShrink:0}}>
        <div style={{padding:isMobile?"14px 16px 12px":"18px 22px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:isMobile?15:16,fontWeight:600,color:C.t1}}>{title}</span>
          <button onClick={onClose} aria-label="Cerrar" style={{border:"none",background:C.bgElev,cursor:"pointer",fontSize:14,color:C.t2,padding:"5px 10px",borderRadius:8,lineHeight:1}}>×</button>
        </div>
        <div style={{padding:isMobile?16:22}}>{children}</div>
      </div>
    </div>
  );
};

// ── DIALOG ──
export const Dialog = ({show,title,msg,onOk,onCancel,okLabel="Confirmar",okV="danger"}) => {
  if(!show) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)"}}>
      <div style={{background:C.bgCard,borderRadius:18,padding:"28px",width:340,boxShadow:"0 24px 60px rgba(0,0,0,0.7)",border:`1px solid ${C.borderL}`}}>
        <div style={{fontSize:16,fontWeight:600,marginBottom:8,color:C.t1}}>{title}</div>
        <div style={{fontSize:14,color:C.t2,marginBottom:24,lineHeight:1.6}}>{msg}</div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn onClick={onCancel}>Cancelar</Btn>
          <Btn v={okV} onClick={onOk}>{okLabel}</Btn>
        </div>
      </div>
    </div>
  );
};
