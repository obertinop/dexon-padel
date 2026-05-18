import React, { useState, useEffect } from "react";
import { C, ADMIN_TEL, LOGO, LOGO_STYLE_DARK } from "../lib/constants.js";
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

  const page = {
    minHeight: "100vh",
    background: C.bg,
    color: C.t1,
    fontFamily: "var(--font-sans)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
  };

  const ticket = {
    width: "100%",
    maxWidth: 440,
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
  };

  const infoRow = (label, value, color) => (
    <div key={label} style={{background:C.bgElev,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.border}`}}>
      <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>{label}</div>
      <div style={{fontSize:13,fontWeight:700,color:color||C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div>
    </div>
  );

  const TornEdge = () => (
    <div style={{display:"flex",alignItems:"center",background:C.bgCard,height:22,position:"relative"}}>
      <div style={{position:"absolute",left:-11,width:22,height:22,borderRadius:"50%",background:C.bg,zIndex:1}}/>
      <div style={{flex:1,borderTop:`2px dashed ${C.border}`,margin:"0 16px"}}/>
      <div style={{position:"absolute",right:-11,width:22,height:22,borderRadius:"50%",background:C.bg,zIndex:1}}/>
    </div>
  );

  const BtnPrimary = ({onClick, children, color="#E05B28"}) => (
    <button onClick={onClick} style={{width:"100%",padding:"14px",background:color,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",letterSpacing:-0.2}}>
      {children}
    </button>
  );

  const BtnGhost = ({onClick, children}) => (
    <button onClick={onClick} style={{width:"100%",padding:"12px",background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"var(--font-sans)"}}>
      {children}
    </button>
  );

  if (estado === "verificando") return (
    <div style={page}>
      <div style={ticket}>
        <div style={{background:`linear-gradient(135deg,#0A1628,#0F2040)`,padding:"36px 24px",textAlign:"center"}}>
          <img src={LOGO} alt="DEXON" style={{height:36,marginBottom:24,...LOGO_STYLE_DARK}}/>
          <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(255,255,255,0.05)",border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px",animation:"spin 2s linear infinite"}}>
            ⏳
          </div>
          <div style={{fontSize:20,fontWeight:700,color:C.t1,marginBottom:6}}>Verificando pago…</div>
          <div style={{fontSize:13,color:C.t3,lineHeight:1.6}}>Estamos confirmando tu transacción con Pagopar</div>
        </div>
        <TornEdge/>
        <div style={{background:C.bgCard,padding:"20px 22px"}}>
          <div style={{height:12,borderRadius:6,background:C.bgElev,marginBottom:10}}/>
          <div style={{height:12,borderRadius:6,background:C.bgElev,width:"70%"}}/>
        </div>
      </div>
    </div>
  );

  if (estado === "pagado") return (
    <div style={page}>
      <div style={ticket}>
        <div style={{background:`linear-gradient(135deg,#071E12,#0A2A18)`,padding:"32px 24px 26px",textAlign:"center",position:"relative"}}>
          <img src={LOGO} alt="DEXON" style={{height:32,marginBottom:20,...LOGO_STYLE_DARK}}/>
          <div style={{width:76,height:76,borderRadius:"50%",background:"rgba(52,212,144,0.12)",border:`2px solid ${C.greenBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px",boxShadow:"0 0 40px rgba(52,212,144,0.2)"}}>
            ✓
          </div>
          <div style={{fontSize:24,fontWeight:800,color:C.green,marginBottom:6,letterSpacing:-0.3}}>¡Pago confirmado!</div>
          <div style={{fontSize:13,color:"rgba(52,212,144,0.65)",lineHeight:1.5}}>Tu turno está reservado, ¡nos vemos en la cancha!</div>
        </div>
        <TornEdge/>
        <div style={{background:C.bgCard,padding:"20px 22px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {infoRow("Total pagado", gs(parseFloat(datos.monto)), C.green)}
            {infoRow("Método", datos.forma_pago)}
            {infoRow("Comprobante", `#${datos.numero_pedido}`)}
            {infoRow("Estado", "Confirmado ✓", C.green)}
          </div>
          <div style={{background:"rgba(52,212,144,0.06)",border:`1px solid ${C.greenBd}`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:3}}>¿Qué sigue?</div>
            <div style={{fontSize:12,color:"rgba(52,212,144,0.8)",lineHeight:1.6}}>Recibirás un WhatsApp con la confirmación. Presentate 5 minutos antes de tu turno.</div>
          </div>
          <BtnPrimary onClick={()=>window.location.href="/reservar"}>Volver al portal</BtnPrimary>
        </div>
      </div>
    </div>
  );

  if (estado === "pendiente") return (
    <div style={page}>
      <div style={ticket}>
        <div style={{background:`linear-gradient(135deg,#1A1500,#221B00)`,padding:"32px 24px 26px",textAlign:"center"}}>
          <img src={LOGO} alt="DEXON" style={{height:32,marginBottom:20,...LOGO_STYLE_DARK}}/>
          <div style={{width:76,height:76,borderRadius:"50%",background:"rgba(245,192,96,0.1)",border:`2px solid ${C.yellowBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px"}}>
            ⏳
          </div>
          <div style={{fontSize:22,fontWeight:800,color:C.yellow,marginBottom:6,letterSpacing:-0.3}}>Pago pendiente</div>
          <div style={{fontSize:13,color:"rgba(245,192,96,0.6)",lineHeight:1.5}}>Tu pago aún no fue acreditado</div>
        </div>
        <TornEdge/>
        <div style={{background:C.bgCard,padding:"20px 22px 24px"}}>
          {datos?.mensaje_resultado_pago && (
            <div style={{background:C.bgElev,borderRadius:12,padding:"12px 16px",marginBottom:16,border:`1px solid ${C.border}`,fontSize:13,color:C.t2,lineHeight:1.7}}
              dangerouslySetInnerHTML={{__html:datos.mensaje_resultado_pago.descripcion}}/>
          )}
          <div style={{background:"rgba(245,192,96,0.06)",border:`1px solid ${C.yellowBd}`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.yellow,marginBottom:3}}>¿Elegiste boca de cobranza?</div>
            <div style={{fontSize:12,color:"rgba(245,192,96,0.75)",lineHeight:1.6}}>Acercate al local indicado para completar el pago. Tu reserva se confirma al acreditarse.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <BtnGhost onClick={()=>window.location.reload()}>🔄 Verificar de nuevo</BtnGhost>
            <BtnGhost onClick={()=>window.location.href="/reservar"}>Volver al portal</BtnGhost>
          </div>
        </div>
      </div>
    </div>
  );

  if (estado === "cancelado") return (
    <div style={page}>
      <div style={ticket}>
        <div style={{background:`linear-gradient(135deg,#1A0808,#220A0A)`,padding:"32px 24px 26px",textAlign:"center"}}>
          <img src={LOGO} alt="DEXON" style={{height:32,marginBottom:20,...LOGO_STYLE_DARK}}/>
          <div style={{width:76,height:76,borderRadius:"50%",background:"rgba(255,80,80,0.1)",border:`2px solid ${C.redBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px"}}>
            ✕
          </div>
          <div style={{fontSize:22,fontWeight:800,color:C.red,marginBottom:6,letterSpacing:-0.3}}>Pago cancelado</div>
          <div style={{fontSize:13,color:"rgba(255,80,80,0.6)",lineHeight:1.5}}>El pago no fue completado</div>
        </div>
        <TornEdge/>
        <div style={{background:C.bgCard,padding:"20px 22px 24px"}}>
          <div style={{background:"rgba(255,80,80,0.06)",border:`1px solid ${C.redBd}`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <div style={{fontSize:12,color:"rgba(255,80,80,0.8)",lineHeight:1.6}}>Podés intentar nuevamente o reservar por transferencia bancaria.</div>
          </div>
          <BtnPrimary onClick={()=>window.location.href="/reservar"}>Volver a reservar</BtnPrimary>
        </div>
      </div>
    </div>
  );

  return (
    <div style={page}>
      <div style={ticket}>
        <div style={{background:`linear-gradient(135deg,#1A0808,#220A0A)`,padding:"32px 24px 26px",textAlign:"center"}}>
          <img src={LOGO} alt="DEXON" style={{height:32,marginBottom:20,...LOGO_STYLE_DARK}}/>
          <div style={{width:76,height:76,borderRadius:"50%",background:"rgba(255,80,80,0.1)",border:`2px solid ${C.redBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 16px"}}>
            !
          </div>
          <div style={{fontSize:22,fontWeight:800,color:C.red,marginBottom:6,letterSpacing:-0.3}}>Error al verificar</div>
          <div style={{fontSize:13,color:"rgba(255,80,80,0.6)",lineHeight:1.5}}>No pudimos consultar el estado de tu pago</div>
        </div>
        <TornEdge/>
        <div style={{background:C.bgCard,padding:"20px 22px 24px"}}>
          <div style={{background:"rgba(255,80,80,0.06)",border:`1px solid ${C.redBd}`,borderRadius:12,padding:"12px 16px",marginBottom:16}}>
            <div style={{fontSize:12,color:"rgba(255,80,80,0.8)",lineHeight:1.6}}>Si ya realizaste el pago, contactanos por WhatsApp y te ayudamos a confirmar tu reserva.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <BtnPrimary onClick={()=>window.open(`https://wa.me/${ADMIN_TEL}`,"_blank")} color="#25D366">
              Contactar por WhatsApp
            </BtnPrimary>
            <BtnGhost onClick={()=>window.location.href="/reservar"}>Volver al portal</BtnGhost>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultadoPago;
