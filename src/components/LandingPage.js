import React, { useState, useEffect, useRef } from "react";
import { C, LOGO, LOGO_STYLE_DARK, ADMIN_TEL } from "../lib/constants.js";
import { useIsMobile } from "../lib/hooks.js";
import { db } from "../lib/api.js";

function LandingPage({ onAdmin }) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroBtnVisible, setHeroBtnVisible] = useState(true);
  const heroBtnRef = useRef(null);
  const [dispHoy, setDispHoy] = useState(null); // null = cargando

  useEffect(() => {
    if (!isMobile) return;
    const el = heroBtnRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setHeroBtnVisible(e.isIntersecting),
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile]);

  useEffect(() => {
    const fecha = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD sin timezone
    Promise.all([
      db.get("config", "limit=1&select=hora_inicio,hora_fin"),
      db.get("turnos", `fecha=eq.${fecha}&estado=neq.cancelado&select=hora`),
    ]).then(([cfgArr, turnos]) => {
      const cfg = cfgArr?.[0];
      if (!cfg) return;
      const total = cfg.hora_fin - cfg.hora_inicio;
      const ocupados = (turnos || []).length;
      setDispHoy(Math.max(0, total - ocupados));
    }).catch(() => setDispHoy(null));
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const coral = C.coral;
  const coralD = C.coralD;

  const st = {
    page: { fontFamily:"var(--font-sans)", background:C.bg, color:C.t1, minHeight:"100vh", overflowX:"hidden" },
    nav: { position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(6,13,26,0.92)", backdropFilter:"blur(14px)", borderBottom:`1px solid ${C.border}`, padding:isMobile?"0 20px":"0 40px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" },
    navLink: { color:C.t2, fontSize:14, fontWeight:500, cursor:"pointer", transition:"color 0.2s", textDecoration:"none" },
    btnOutline: { padding:"8px 18px", border:`1px solid ${coral}`, borderRadius:8, background:"transparent", color:coral, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-sans)" },
    btnSolid: { padding:"8px 18px", border:"none", borderRadius:8, background:coral, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-sans)" },
    hero: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", textAlign:"center", padding:isMobile?"100px 24px 60px":"120px 40px 80px", position:"relative", overflow:"hidden" },
    heroBg: { position:"absolute", inset:0, background:`radial-gradient(ellipse 80% 60% at 50% 30%, rgba(15,30,56,0.9) 0%, ${C.bg} 70%)`, zIndex:0 },
    heroAccent: { position:"absolute", top:"20%", left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(224,91,40,0.14) 0%, transparent 70%)", zIndex:0 },
    heroContent: { position:"relative", zIndex:1, maxWidth:700 },
    heroBadge: { display:"inline-block", padding:"6px 16px", background:"rgba(224,91,40,0.12)", border:`1px solid rgba(224,91,40,0.3)`, borderRadius:20, fontSize:12, color:coral, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:24 },
    heroTitle: { fontSize:isMobile?38:66, fontWeight:900, lineHeight:1.05, margin:"0 0 20px", letterSpacing:-1.5, color:C.t1 },
    heroSub: { fontSize:isMobile?16:20, color:C.t2, lineHeight:1.6, marginBottom:40, maxWidth:520, margin:"0 auto 40px" },
    heroButtons: { display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" },
    btnHeroMain: { padding:isMobile?"14px 28px":"16px 40px", border:"none", borderRadius:12, background:coral, color:"#fff", fontSize:isMobile?15:17, fontWeight:700, cursor:"pointer", boxShadow:"0 8px 28px rgba(224,91,40,0.4)", fontFamily:"var(--font-sans)", transition:"transform 0.15s" },
    btnHeroSec: { padding:isMobile?"14px 28px":"16px 40px", border:`1.5px solid ${C.borderL}`, borderRadius:12, background:"transparent", color:C.t1, fontSize:isMobile?15:17, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-sans)" },
    section: { padding:isMobile?"60px 24px":"80px 40px", maxWidth:1100, margin:"0 auto" },
    sectionTitle: { fontSize:isMobile?26:38, fontWeight:800, marginBottom:12, letterSpacing:-0.5, color:C.t1 },
    sectionSub: { fontSize:15, color:C.t2, marginBottom:48, lineHeight:1.6 },
    divider: { width:48, height:4, background:coral, borderRadius:2, marginBottom:16 },
    grid2: { display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:20 },
    grid3: { display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3, 1fr)", gap:20 },
    featureCard: { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:18, padding:"28px 24px", transition:"border-color 0.2s" },
    featureIcon: { fontSize:32, marginBottom:16 },
    featureTitle: { fontSize:17, fontWeight:700, marginBottom:8, color:C.t1 },
    featureText: { fontSize:14, color:C.t2, lineHeight:1.7 },
    mapBox: { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden" },
    mapFrame: { width:"100%", height:isMobile?260:360, border:"none", display:"block" },
    mapInfo: { padding:"24px 28px" },
    mapInfoRow: { display:"flex", alignItems:"flex-start", gap:12, marginBottom:16 },
    mapInfoIcon: { fontSize:20, marginTop:2, flexShrink:0 },
    mapInfoText: { fontSize:14, color:C.t2, lineHeight:1.6 },
    mapInfoLabel: { fontWeight:700, color:C.t1, display:"block", marginBottom:2 },
    contactGrid: { display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:20, alignItems:"start" },
    contactCard: { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:18, padding:"28px 24px" },
    waBtn: { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:10, padding:"12px 24px", background:"#25D366", border:"none", borderRadius:10, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", textDecoration:"none", marginTop:20, lineHeight:1, whiteSpace:"nowrap", fontFamily:"var(--font-sans)" },
    scheduleRow: { display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}`, fontSize:14 },
    footer: { background:C.bgCard, borderTop:`1px solid ${C.border}`, padding:isMobile?"30px 24px":"40px 40px", textAlign:"center" },
    mobileMenu: { position:"fixed", top:64, left:0, right:0, background:C.bgElev, borderBottom:`1px solid ${C.border}`, zIndex:99, padding:"16px 24px", display:"flex", flexDirection:"column", gap:4 },
    mobileLink: { padding:"12px 0", fontSize:16, fontWeight:500, color:C.t2, cursor:"pointer", borderBottom:`1px solid ${C.bgCard}` },
  };

  return (
    <div style={st.page}>
      <style>{`
        @keyframes fabFall {
          0%   { transform: translateY(-52vh) scale(0.85); opacity: 0; }
          65%  { transform: translateY(8px)   scale(1.02); opacity: 1; }
          82%  { transform: translateY(-4px)  scale(0.99); }
          100% { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        @keyframes fabGlow {
          0%,100% { box-shadow: 0 8px 36px rgba(224,91,40,0.5), 0 0 0 0 rgba(224,91,40,0.2); }
          60%     { box-shadow: 0 8px 36px rgba(224,91,40,0.5), 0 0 0 16px rgba(224,91,40,0); }
        }
        .dexon-fab {
          animation: fabFall 0.55s cubic-bezier(0.34,1.4,0.64,1) forwards,
                     fabGlow 3s 0.6s ease-in-out infinite;
        }
        .dexon-fab:active { transform: scale(0.97) !important; }
      `}</style>
      <nav style={st.nav}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src={LOGO} alt="DEXON" style={{height:68,...LOGO_STYLE_DARK}} onError={e=>{e.target.style.display="none";}}/>
        </div>
        {!isMobile&&(
          <div style={{display:"flex",gap:28,alignItems:"center"}}>
            <span style={st.navLink} onClick={()=>scrollTo("nosotros")}>Quiénes somos</span>
            <span style={st.navLink} onClick={()=>scrollTo("cancha")}>La cancha</span>
            <span style={st.navLink} onClick={()=>scrollTo("ubicacion")}>Ubicación</span>
            <span style={st.navLink} onClick={()=>scrollTo("contacto")}>Contacto</span>
          </div>
        )}
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {!isMobile&&<button style={st.btnOutline} onClick={onAdmin}>Admin</button>}
          {!isMobile&&<button style={st.btnOutline} onClick={()=>window.location.href="/cuenta"}>Mi cuenta</button>}
          {!isMobile&&<button style={st.btnSolid} onClick={()=>window.location.href="/reservar"}>Reservar →</button>}
          {isMobile&&<button onClick={()=>window.location.href="/cuenta"} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 14px 7px 9px",borderRadius:100,border:"1px solid rgba(255,255,255,0.13)",background:"rgba(255,255,255,0.07)",color:C.t1,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)",WebkitBackdropFilter:"blur(12px)",backdropFilter:"blur(12px)"}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,rgba(224,91,40,0.5),rgba(180,50,10,0.7))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            Mi cuenta
          </button>}
          {isMobile&&<button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"none",color:C.t2,fontSize:22,cursor:"pointer",padding:"0 4px",fontFamily:"var(--font-sans)"}}>{menuOpen?"✕":"☰"}</button>}
        </div>
      </nav>

      {isMobile&&menuOpen&&(
        <div style={st.mobileMenu}>
          <div style={st.mobileLink} onClick={()=>scrollTo("nosotros")}>Quiénes somos</div>
          <div style={st.mobileLink} onClick={()=>scrollTo("cancha")}>La cancha</div>
          <div style={st.mobileLink} onClick={()=>scrollTo("ubicacion")}>Ubicación</div>
          <div style={st.mobileLink} onClick={()=>scrollTo("contacto")}>Contacto</div>
          <div style={st.mobileLink} onClick={()=>window.location.href="/cuenta"}>Mi cuenta</div>
          <div style={{...st.mobileLink,color:coral}} onClick={onAdmin}>Administración</div>
        </div>
      )}

      <section style={st.hero}>
        <div style={st.heroBg}/>
        <div style={st.heroAccent}/>
        <div style={st.heroContent}>
          <span style={st.heroBadge}>🎾 Tavapy · Alto Paraná · Paraguay</span>
          <h1 style={st.heroTitle}>
            Tu cancha de<br/><span style={{color:coral}}>pádel en Tavapy</span>
          </h1>
          <p style={st.heroSub}>
            Reservá tu turno fácil y rápido. Disfrutá del mejor pádel de la zona con instalaciones de primer nivel.
          </p>
          <div style={st.heroButtons}>
            {/* Desktop: botón estático en el hero */}
            {!isMobile&&<button style={st.btnHeroMain} onClick={()=>window.location.href="/reservar"}
              onMouseEnter={e=>e.target.style.transform="scale(1.03)"}
              onMouseLeave={e=>e.target.style.transform="scale(1)"}>
              Reservar cancha →
            </button>}
            {/* Mobile: botón en el hero que actúa de ancla para el FAB */}
            {isMobile&&<button ref={heroBtnRef}
              onClick={()=>window.location.href="/reservar"}
              style={{...st.btnHeroMain,display:"flex",alignItems:"center",gap:12,padding:"5px 5px 5px 22px",borderRadius:18,minWidth:260}}>
              <span style={{flex:1,textAlign:"left"}}>
                <span style={{display:"block",fontSize:15,fontWeight:800,letterSpacing:-0.3}}>Reservar cancha</span>
                <span style={{display:"block",fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:1}}>Elegí horario y pagá online</span>
              </span>
              <span style={{width:50,height:50,borderRadius:14,background:"rgba(0,0,0,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </button>}
            <button style={st.btnHeroSec} onClick={()=>scrollTo("nosotros")}>
              Conocer más
            </button>
          </div>
        </div>
      </section>

      <section id="nosotros" style={{background:C.bgCard}}>
        <div style={st.section}>
          <div style={st.divider}/>
          <h2 style={st.sectionTitle}>Quiénes somos</h2>
          <p style={st.sectionSub}>
            DEXON PADEL es el primer club de pádel de Tavapy, Alto Paraná. Nació con la misión de acercar este deporte a la comunidad local, con una cancha profesional, ambiente familiar y atención personalizada.
          </p>
          <div style={st.grid3}>
            {[
              {icon:"🏆",title:"Calidad profesional",text:"Cancha construida con materiales de primer nivel, iluminación LED y superficie reglamentaria para el mejor juego."},
              {icon:"👨‍👩‍👧",title:"Ambiente familiar",text:"Un espacio pensado para todos: principiantes, aficionados y jugadores avanzados. Venís con quien quieras."},
              {icon:"📅",title:"Reservas simples",text:"Sistema de reservas online disponible las 24 horas. Elegí tu horario, confirmá y listo."},
            ].map((f,i)=>(
              <div key={i} style={st.featureCard}>
                <div style={st.featureIcon}>{f.icon}</div>
                <div style={st.featureTitle}>{f.title}</div>
                <div style={st.featureText}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cancha">
        <div style={st.section}>
          <div style={st.divider}/>
          <h2 style={st.sectionTitle}>La cancha</h2>
          <p style={st.sectionSub}>Todo lo que necesitás para jugar al pádel en un solo lugar.</p>
          <div style={st.grid2}>
            {[
              {icon:"💡",title:"Iluminación LED",text:"Iluminación profesional para jugar de día o de noche sin inconvenientes."},
              {icon:"🎾",title:"Superficie reglamentaria",text:"Piso de césped sintético de alta calidad, homologado para competencia."},
              {icon:"🅿️",title:"Estacionamiento",text:"Amplio espacio para estacionar sin preocupaciones."},
              {icon:"🚿",title:"Vestuarios",text:"Instalaciones limpias y cómodas para cambiarte antes y después del partido."},
            ].map((f,i)=>(
              <div key={i} style={{...st.featureCard,display:"flex",gap:16,alignItems:"flex-start"}}>
                <span style={{fontSize:28,flexShrink:0}}>{f.icon}</span>
                <div>
                  <div style={st.featureTitle}>{f.title}</div>
                  <div style={st.featureText}>{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ubicacion" style={{background:C.bgCard}}>
        <div style={st.section}>
          <div style={st.divider}/>
          <h2 style={st.sectionTitle}>Dónde estamos</h2>
          <p style={st.sectionSub}>Encontranos en Tavapy, Alto Paraná. Fácil acceso desde Ciudad del Este y alrededores.</p>
          <div style={st.mapBox}>
            <iframe
              title="Ubicación DEXON PADEL"
              style={st.mapFrame}
              src="https://maps.google.com/maps?q=Tavapy,+Alto+Paraná,+Paraguay&output=embed&z=14"
              allowFullScreen=""
              loading="lazy"
            />
            <div style={st.mapInfo}>
              <div style={st.mapInfoRow}>
                <span style={st.mapInfoIcon}>📍</span>
                <div style={st.mapInfoText}>
                  <span style={st.mapInfoLabel}>Dirección</span>
                  Tavapy, Alto Paraná, Paraguay
                </div>
              </div>
              <div style={st.mapInfoRow}>
                <span style={st.mapInfoIcon}>🕐</span>
                <div style={st.mapInfoText}>
                  <span style={st.mapInfoLabel}>Horarios</span>
                  Lunes a Viernes: 18:00 – 24:00 · Sábados y Domingos: 10:00 – 24:00
                </div>
              </div>
              <div style={st.mapInfoRow}>
                <span style={st.mapInfoIcon}>📞</span>
                <div style={st.mapInfoText}>
                  <span style={st.mapInfoLabel}>Teléfono / WhatsApp</span>
                  <a href={`https://wa.me/${ADMIN_TEL}`} target="_blank" rel="noreferrer" style={{color:"#25D366",textDecoration:"none",fontWeight:600}}>
                    +595 994 952 201
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contacto">
        <div style={st.section}>
          <div style={st.divider}/>
          <h2 style={st.sectionTitle}>Contacto</h2>
          <p style={st.sectionSub}>¿Tenés dudas o querés coordinar algo especial? Escribinos y te respondemos rápido.</p>
          <div style={st.contactGrid}>
            <div style={st.contactCard}>
              <div style={{fontSize:28,marginBottom:16}}>💬</div>
              <div style={{fontSize:17,fontWeight:700,marginBottom:8,color:C.t1}}>WhatsApp</div>
              <div style={{fontSize:14,color:C.t2,lineHeight:1.7,marginBottom:4}}>
                La forma más rápida de contactarnos. Respondemos en minutos.
              </div>
              <div style={{fontSize:14,color:C.t2}}>Consultas · Reservas · Información general</div>
              <div style={{display:"flex",justifyContent:"center"}}>
                <a href={`https://wa.me/${ADMIN_TEL}?text=Hola%20DEXON%20PADEL%2C%20quer%C3%ADa%20consultar...`} target="_blank" rel="noreferrer" style={st.waBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Escribir por WhatsApp
                </a>
              </div>
            </div>
            <div style={st.contactCard}>
              {/* Horarios */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🕐</div>
                <div style={{fontSize:16,fontWeight:700,color:C.t1}}>Horarios</div>
              </div>
              {[
                {dia:"Lunes a Viernes",hrs:"18:00 – 24:00"},
                {dia:"Sábados",hrs:"10:00 – 24:00"},
                {dia:"Domingos",hrs:"10:00 – 24:00"},
              ].map((h,i)=>(
                <div key={i} style={st.scheduleRow}>
                  <span style={{color:C.t2}}>{h.dia}</span>
                  <span style={{color:C.t1,fontWeight:600}}>{h.hrs}</span>
                </div>
              ))}

              {/* Divider */}
              <div style={{height:1,background:C.border,margin:"22px 0"}}/>

              {/* Disponibilidad hoy */}
              {(() => {
                const loading = dispHoy === null;
                const sinTurnos = dispHoy === 0;
                const pocos = dispHoy > 0 && dispHoy <= 3;
                const color = sinTurnos ? C.red : pocos ? C.yellow : C.green;
                const dotBg = sinTurnos ? "rgba(240,80,80,0.15)" : pocos ? "rgba(245,192,96,0.15)" : "rgba(52,212,144,0.15)";
                const label = sinTurnos ? "Sin turnos disponibles hoy" : pocos ? `Solo ${dispHoy} turno${dispHoy > 1 ? "s" : ""} disponible${dispHoy > 1 ? "s" : ""} hoy` : `${dispHoy} turnos disponibles hoy`;
                return (
                  <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:14,background:dotBg,border:`1px solid ${color}22`}}>
                    {loading
                      ? <div style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${C.border}`,borderTopColor:C.coral,animation:"spin 0.8s linear infinite",flexShrink:0}}/>
                      : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:44,flexShrink:0}}>
                          <div style={{fontSize:26,fontWeight:900,color,lineHeight:1,letterSpacing:-1}}>{sinTurnos ? "0" : dispHoy}</div>
                          <div style={{width:20,height:3,borderRadius:2,background:color,marginTop:3,opacity:0.6}}/>
                        </div>
                    }
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:loading ? C.t2 : color}}>{loading ? "Consultando disponibilidad…" : label}</div>
                      <div style={{fontSize:11,color:C.t3,marginTop:2}}>{new Date().toLocaleDateString("es-PY",{weekday:"long",day:"numeric",month:"long"})}</div>
                    </div>
                  </div>
                );
              })()}
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          </div>
        </div>
      </section>

      {isMobile&&!heroBtnVisible&&(
        <button
          className="dexon-fab"
          onClick={()=>window.location.href="/reservar"}
          style={{
            position:"fixed", bottom:24, left:20, right:20,
            zIndex:200, border:"none", borderRadius:20,
            background:"linear-gradient(135deg,#F07040 0%,#E05828 50%,#C84618 100%)",
            cursor:"pointer", fontFamily:"var(--font-sans)",
            display:"flex", alignItems:"center",
            padding:"5px 5px 5px 22px", gap:0,
          }}
        >
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:-0.3}}>Reservar cancha</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>Elegí horario y pagá online</div>
          </div>
          <div style={{width:54,height:54,borderRadius:16,background:"rgba(0,0,0,0.22)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>
      )}

      <footer style={{...st.footer, paddingBottom: isMobile ? 96 : st.footer.paddingBottom}}>
        <div style={{fontSize:20,fontWeight:900,color:C.t1,letterSpacing:1,marginBottom:8}}>DEXON PADEL</div>
        <div style={{fontSize:13,color:C.t3,marginBottom:20}}>Tavapy · Alto Paraná · Paraguay</div>
        <div style={{display:"flex",gap:24,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
          {[["nosotros","Quiénes somos"],["cancha","La cancha"],["ubicacion","Ubicación"],["contacto","Contacto"]].map(([id,lbl])=>(
            <span key={id} style={{fontSize:13,color:C.t3,cursor:"pointer"}} onClick={()=>scrollTo(id)}>{lbl}</span>
          ))}
          <span style={{fontSize:13,color:coral,cursor:"pointer"}} onClick={onAdmin}>Administración</span>
        </div>
        <div style={{fontSize:12,color:C.t3}}>© {new Date().getFullYear()} DEXON PADEL · Todos los derechos reservados</div>
      </footer>
    </div>
  );
}


export default LandingPage;
