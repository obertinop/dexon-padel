import React, { useState } from "react";
import { C } from "../lib/constants.js";

const CalendarioMini = ({value, onChange, min, blockedDates=[], feriadoDates=[]}) => {
  const minStr = min || new Date().toISOString().slice(0,10);
  const initDate = value ? new Date(value+"T00:00:00") : new Date();
  const [mes, setMes] = useState(()=>new Date(initDate.getFullYear(), initDate.getMonth(), 1));
  const y=mes.getFullYear(), m=mes.getMonth();
  const firstWd=new Date(y,m,1).getDay();
  const offset=(firstWd===0?6:firstWd-1);
  const dim=new Date(y,m+1,0).getDate();
  const cells=[...Array(offset).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
  while(cells.length%7!==0) cells.push(null);
  const todayStr=new Date().toISOString().slice(0,10);
  const fmtCell=(d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const MESES_FULL=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DIA_NAMES=["Lu","Ma","Mi","Ju","Vi","Sá","Do"];
  return (
    <div style={{background:C.bgElev,borderRadius:14,border:`1px solid ${C.border}`,padding:"14px 16px",userSelect:"none"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setMes(new Date(y,m-1,1))} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:20,padding:"0 6px",lineHeight:1,fontFamily:"var(--font-sans)"}}>‹</button>
        <span style={{fontSize:14,fontWeight:700,color:C.t1}}>{MESES_FULL[m]} {y}</span>
        <button onClick={()=>setMes(new Date(y,m+1,1))} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:20,padding:"0 6px",lineHeight:1,fontFamily:"var(--font-sans)"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {DIA_NAMES.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:C.t3,fontWeight:600,paddingBottom:4}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((day,i)=>{
          if(!day) return <div key={i}/>;
          const ds=fmtCell(day);
          const isBlocked=blockedDates.includes(ds);
          const isFeriado=feriadoDates.includes(ds);
          const disabled=ds<minStr||isBlocked;
          const selected=ds===value;
          const isToday=ds===todayStr;
          return <button key={i} disabled={disabled} onClick={()=>!disabled&&onChange(ds)}
            title={isBlocked?"Cancha cerrada":isFeriado?"Feriado nacional":""}
            style={{padding:"7px 2px",borderRadius:8,position:"relative",
              border:`1px solid ${selected?C.coral:isToday?C.coralD:isFeriado?"rgba(245,192,96,0.4)":"transparent"}`,
              background:selected?C.coral:isBlocked?C.redBg:isToday?"rgba(224,91,40,0.1)":"transparent",
              color:disabled?C.t3:selected?"#fff":isFeriado?C.yellow:C.t1,
              fontSize:13,fontWeight:selected?700:isToday?600:400,
              cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,
              fontFamily:"var(--font-sans)",textAlign:"center",transition:"all 0.1s"}}>
            {day}
            {isFeriado&&!isBlocked&&<span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:C.yellow,display:"block"}}/>}
            {isBlocked&&<span style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:C.red,display:"block"}}/>}
          </button>;
        })}
      </div>
      {(blockedDates.length>0||feriadoDates.length>0)&&<div style={{display:"flex",gap:12,marginTop:10,fontSize:10,color:C.t3}}>
        {feriadoDates.length>0&&<span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:C.yellow,display:"inline-block"}}/>Feriado</span>}
        {blockedDates.length>0&&<span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:C.red,display:"inline-block"}}/>Cerrado</span>}
      </div>}
    </div>
  );
};

export default CalendarioMini;
