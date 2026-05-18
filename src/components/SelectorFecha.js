import React, { useState } from "react";
import { C, DIAS } from "../lib/constants.js";
import { hoy, fmtFechaLegible } from "../lib/utils.js";

const SelectorFecha = ({value, onChange, min}) => {
  const [mostrar, setMostrar] = useState(false);
  const hoyStr = hoy();
  const diasArr = Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()+i);
    return d.toISOString().slice(0,10);
  }).filter(f=>f>=(min||hoyStr));

  const getInfo = (fechaStr) => {
    const fecha=new Date(fechaStr+"T00:00:00");
    const manana=new Date(new Date().getTime()+86400000).toISOString().slice(0,10);
    if(fechaStr===hoyStr) return {top:"Hoy",sub:"hoy"};
    if(fechaStr===manana) return {top:"Manana",sub:"manana"};
    const meses=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return {top:`${DIAS[fecha.getDay()]} ${fecha.getDate()}`,sub:meses[fecha.getMonth()]};
  };

  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setMostrar(!mostrar)} style={{width:"100%",padding:"14px 16px",border:`1px solid ${mostrar?C.coral:C.border}`,borderRadius:12,fontSize:15,color:value?C.t1:C.t3,background:C.bgElev,fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",minHeight:52}}>
        <span style={{fontWeight:500}}>{value ? fmtFechaLegible(value) : "Selecciona una fecha"}</span>
        <span style={{fontSize:10,color:C.t3}}>v</span>
      </button>
      {mostrar&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:C.bgCard,border:`1px solid ${C.borderL}`,borderRadius:14,maxHeight:260,overflowY:"auto",zIndex:100,boxShadow:"0 16px 40px rgba(0,0,0,0.5)"}}>
          {diasArr.map(f=>{
            const i=getInfo(f); const sel=f===value;
            return (
              <button key={f} onClick={()=>{onChange(f);setMostrar(false);}} style={{width:"100%",padding:"13px 16px",border:"none",background:sel?C.bgHover:"transparent",color:sel?C.coral:C.t1,fontFamily:"var(--font-sans)",fontSize:14,cursor:"pointer",textAlign:"left",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:sel?700:500}}>{i.top}</span>
                <span style={{fontSize:12,color:sel?C.coral:C.t3}}>{i.sub}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SelectorFecha;
