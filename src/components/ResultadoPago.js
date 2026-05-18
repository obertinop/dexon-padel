import React, { useState, useEffect } from "react";
import { C, ADMIN_TEL } from "../lib/constants.js";
import { gs } from "../lib/utils.js";

const ResultadoPago = () => {
  const [estado, setEstado] = useState("verificando");
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = params.get("hash");
    if (!hash) { setEstado("error"); return; }
    const consultar = async () => {
      try {
        const r = await fetch(`/api/pagopar/consultar?hash=${hash}`);
        const d = await r.json();
        if (d?.resultado?.[0]) {
          const res = d.resultado[0];
          setDatos(res);
          if (res.pagado) setEstado("pagado");
          else if (res.cancelado) setEstado("cancelado");
          else setEstado("pendiente");
        } else { setEstado("error"); }
      } catch(e) { console.error(e); setEstado("error"); }
    };
    consultar();
  }, []);

  const wrap = {minHeight:"100vh",background:C.bg,color:C.t1,fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",justifyContent:"center",padding:20};
  const cardSt = {background:C.bgCard,borderRadius:16,border:`1px solid ${C.border}`,padding:"36px 24px",textAlign:"center",maxWidth:420,width:"100%"};
  const iconSt = {width:72,height:72,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px"};

  if (estado==="verificando") return (
    <div style={wrap}><div style={cardSt}>
      <div style={{...iconSt,background:C.bgElev,border:`2px solid ${C.borderL}`}}>⏳</div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:8,color:C.t1}}>Verificando pago...</div>
      <div style={{fontSize:14,color:C.t2}}>Estamos confirmando tu transacción con Pagopar</div>
    </div></div>
  );
  if (estado==="pagado") return (
    <div style={wrap}><div style={cardSt}>
      <div style={{...iconSt,background:C.greenBg,border:`2px solid ${C.greenBd}`}}>✓</div>
      <div style={{fontSize:22,fontWeight:700,marginBottom:8,color:C.green}}>¡Pago confirmado!</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:20,lineHeight:1.7}}>
        Tu reserva está confirmada. Te esperamos en <strong style={{color:C.t1}}>DEXON Padel</strong>.
      </div>
      <div style={{background:C.bg,borderRadius:12,padding:16,marginBottom:20,textAlign:"left",border:`1px solid ${C.border}`,fontSize:13,color:C.t2,lineHeight:2}}>
        <div>💰 Monto: <strong style={{color:C.t1}}>{gs(parseFloat(datos.monto))}</strong></div>
        <div>💳 Método: <strong style={{color:C.t1}}>{datos.forma_pago}</strong></div>
        <div>🧾 Comprobante: <strong style={{color:C.t1}}>{datos.numero_pedido}</strong></div>
      </div>
      <button onClick={()=>window.location.href="/reservar"} style={{width:"100%",padding:14,background:C.coral,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
        Volver al portal
      </button>
    </div></div>
  );
  if (estado==="pendiente") return (
    <div style={wrap}><div style={cardSt}>
      <div style={{...iconSt,background:C.yellowBg,border:`2px solid ${C.yellowBd}`}}>⏳</div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:8,color:C.yellow}}>Pago pendiente</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:20,lineHeight:1.7}}>
        Tu pago aún no fue confirmado. Si elegiste boca de cobranza, acercate al local indicado.
      </div>
      {datos?.mensaje_resultado_pago&&(
        <div style={{background:C.bg,borderRadius:12,padding:14,marginBottom:20,textAlign:"left",border:`1px solid ${C.border}`,fontSize:13,color:C.t2,lineHeight:1.6}}
          dangerouslySetInnerHTML={{__html:datos.mensaje_resultado_pago.descripcion}}/>
      )}
      <button onClick={()=>window.location.reload()} style={{width:"100%",padding:12,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,cursor:"pointer",marginBottom:8,fontFamily:"var(--font-sans)"}}>
        Verificar de nuevo
      </button>
      <button onClick={()=>window.location.href="/reservar"} style={{width:"100%",padding:12,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
        Volver al portal
      </button>
    </div></div>
  );
  if (estado==="cancelado") return (
    <div style={wrap}><div style={cardSt}>
      <div style={{...iconSt,background:C.redBg,border:`2px solid ${C.redBd}`}}>×</div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:8,color:C.red}}>Pago cancelado</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:20,lineHeight:1.7}}>El pago fue cancelado. Podés intentar nuevamente.</div>
      <button onClick={()=>window.location.href="/reservar"} style={{width:"100%",padding:14,background:C.coral,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
        Volver a reservar
      </button>
    </div></div>
  );
  return (
    <div style={wrap}><div style={cardSt}>
      <div style={{...iconSt,background:C.redBg,border:`2px solid ${C.redBd}`}}>!</div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:8,color:C.red}}>Error verificando pago</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:20,lineHeight:1.7}}>No pudimos consultar el estado. Contactanos por WhatsApp si ya pagaste.</div>
      <button onClick={()=>window.open(`https://wa.me/${ADMIN_TEL}`,"_blank")} style={{width:"100%",padding:14,background:"#25D366",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:"pointer",marginBottom:10,fontFamily:"var(--font-sans)"}}>
        Contactar por WhatsApp
      </button>
      <button onClick={()=>window.location.href="/reservar"} style={{width:"100%",padding:12,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
        Volver al portal
      </button>
    </div></div>
  );
};


export default ResultadoPago;
