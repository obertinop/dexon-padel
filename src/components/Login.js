import React, { useState } from "react";
import { C, LOGO, LOGO_STYLE_DARK } from "../lib/constants.js";
import { auth } from "../lib/api.js";

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

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(ellipse 80% 80% at 50% -20%, rgba(26,48,112,0.5) 0%, ${C.bg} 70%)`}}>
      <div style={{position:"fixed",inset:0,opacity:0.03,backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>
      <div style={{width:400,padding:"44px 40px",background:"rgba(12,22,40,0.95)",backdropFilter:"blur(20px)",borderRadius:24,border:`1px solid ${C.borderL}`,boxShadow:"0 40px 100px rgba(0,0,0,0.6)",position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <img src={LOGO} alt="DEXON" onError={e=>{e.target.style.display="none";}} style={{height:120,marginBottom:14,...LOGO_STYLE_DARK}}/>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:3,textTransform:"uppercase",fontWeight:500}}>Panel de administracion</div>
        </div>
        {err&&<div style={{background:"rgba(224,91,40,0.12)",color:"#FF8060",border:"1px solid rgba(224,91,40,0.3)",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:18}}>{err}</div>}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,color:C.t2,fontWeight:500,display:"block",marginBottom:7}}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",padding:"13px 16px",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,fontSize:14,color:"#fff",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box"}} placeholder="admin@dexon.com.py"/>
        </div>
        <div style={{marginBottom:28}}>
          <label style={{fontSize:12,color:C.t2,fontWeight:500,display:"block",marginBottom:7}}>Contrasena</label>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{width:"100%",padding:"13px 16px",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,fontSize:14,color:"#fff",fontFamily:"var(--font-sans)",outline:"none",boxSizing:"border-box"}} placeholder="..."/>
        </div>
        <button onClick={doLogin} disabled={loading} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${C.coral},${C.coralD})`,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-sans)",boxShadow:"0 8px 24px rgba(224,91,40,0.35)",opacity:loading?0.7:1}}>
          {loading?"Ingresando...":"Ingresar"}
        </button>
      </div>
    </div>
  );
};

export default Login;
