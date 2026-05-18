import React, { useState } from "react";
import { C, card, inp } from "../lib/constants.js";
import { api } from "../lib/api.js";

const DiasBloquedosPanel = ({diasBloqueados, tk, onReload}) => {
  const [fecha,setFecha] = useState("");
  const [motivo,setMotivo] = useState("");
  const [saving,setSaving] = useState(false);
  const agregar = async () => {
    if(!fecha) return;
    setSaving(true);
    try {
      await api("dias_bloqueados",{method:"POST",body:JSON.stringify({fecha,motivo}),prefer:"return=representation"},tk);
      setFecha(""); setMotivo(""); await onReload();
    } catch(e){}
    setSaving(false);
  };
  const eliminar = async (id) => {
    try { await api(`dias_bloqueados?id=eq.${id}`,{method:"DELETE"},tk); await onReload(); } catch(e){}
  };
  return <div style={{...card,marginBottom:12}}>
    <div style={{fontWeight:600,fontSize:14,color:C.t1,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
      🔒 Días bloqueados
      <span style={{fontSize:11,color:C.t3,fontWeight:400}}>Mantenimiento, lluvia, feriado especial</span>
    </div>
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{...inp,width:"auto",flex:"0 0 160px"}}/>
      <input placeholder="Motivo (ej: Mantenimiento)" value={motivo} onChange={e=>setMotivo(e.target.value)} style={{...inp,flex:1,minWidth:160}} onKeyDown={e=>e.key==="Enter"&&agregar()}/>
      <button onClick={agregar} disabled={saving||!fecha} style={{padding:"8px 16px",background:C.coral,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:saving||!fecha?"not-allowed":"pointer",opacity:saving||!fecha?0.5:1,fontFamily:"var(--font-sans)"}}>
        {saving?"...":"Bloquear"}
      </button>
    </div>
    {diasBloqueados.length===0
      ?<div style={{fontSize:12,color:C.t3,textAlign:"center",padding:"12px 0"}}>Sin días bloqueados</div>
      :<div style={{display:"flex",flexDirection:"column",gap:6}}>
        {diasBloqueados.map(d=><div key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8}}>
          <div>
            <span style={{fontSize:13,fontWeight:600,color:C.red}}>{d.fecha}</span>
            {d.motivo&&<span style={{fontSize:12,color:C.t2,marginLeft:8}}>{d.motivo}</span>}
          </div>
          <button onClick={()=>eliminar(d.id)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 4px",fontFamily:"var(--font-sans)"}}>×</button>
        </div>)}
      </div>
    }
  </div>;
};


export default DiasBloquedosPanel;
