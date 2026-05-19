// src/components/MiCuenta.js
// ─────────────────────────────────────────────────────────────
// Portal "Mi cuenta" del cliente Dexon Padel.
// Flujo: login (teléfono) → OTP por WhatsApp (template "dexon_codigo")
//        → registro si es primera vez → dashboard con turnos, abono,
//          referidos, perfil, notif, pagos, favoritos.
//
// Para implementar:
//   1. Ejecutar implementation/01-migration.sql en Supabase
//   2. Subir los archivos de implementation/api/cliente/* a /api/cliente/
//   3. Crear el template "dexon_codigo" en Meta Business Manager con 1 param
//   4. Copiar este archivo a src/components/MiCuenta.js
//   5. Copiar implementation/src/lib/cliente-api.js a src/lib/
//   6. Agregar la ruta en App.js (ver implementation/00-README.md)
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useRef } from "react";
import { C, DIAS_FULL, MESES, LOGO, LOGO_STYLE_DARK } from "../lib/constants.js";
import { Btn, Badge, Modal, Avatar } from "./UI.js";
import { clienteAuth, clienteData, clienteSession } from "../lib/cliente-api.js";

// ── HELPERS ─────────────────────────────────────────────────
const fmtGs = (n) => "₲ " + new Intl.NumberFormat("es-PY").format(Number(n || 0));
const fmtFecha = (d) => {
  const dx = new Date(d);
  return `${DIAS_FULL[dx.getDay()]} ${dx.getDate()} ${MESES[dx.getMonth()]}`;
};
const hhmm = (d) => {
  const dx = new Date(d);
  return `${String(dx.getHours()).padStart(2, "0")}:${String(dx.getMinutes()).padStart(2, "0")}`;
};

// ── ICONOS (line, sin emoji) ────────────────────────────────
const I = ({ d, sz = 20, sw = 1.8, fill = "none", children }) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d} />}
  </svg>
);
const Ico = {
  back: (p) => <I {...p}><path d="M19 12H5M11 5l-7 7 7 7" /></I>,
  bell: (p) => <I {...p}><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2zM10 20a2 2 0 0 0 4 0" /></I>,
  cal: (p) => <I {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></I>,
  check: (p) => <I {...p}><path d="M5 12l5 5L20 7" /></I>,
  chev: (p) => <I {...p}><path d="M9 6l6 6-6 6" /></I>,
  copy: (p) => <I {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></I>,
  crown: (p) => <I {...p}><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" /></I>,
  edit: (p) => <I {...p}><path d="M4 20h4l11-11-4-4L4 16v4z" /></I>,
  gift: (p) => <I {...p}><rect x="3" y="9" width="18" height="12" rx="1" /><path d="M3 13h18M12 9v12M8 9a2 2 0 1 1 0-4c1.5 0 4 4 4 4s-2.5 0-4 0zM16 9a2 2 0 1 0 0-4c-1.5 0-4 4-4 4s2.5 0 4 0z" /></I>,
  heart: (p) => <I {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></I>,
  home: (p) => <I {...p}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9z" /></I>,
  logout: (p) => <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></I>,
  pin: (p) => <I {...p}><path d="M12 22s-7-7-7-12a7 7 0 1 1 14 0c0 5-7 12-7 12z" /><circle cx="12" cy="10" r="2.5" /></I>,
  plus: (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>,
  right: (p) => <I {...p}><path d="M5 12h14M13 5l7 7-7 7" /></I>,
  rot: (p) => <I {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></I>,
  share: (p) => <I {...p}><path d="M12 4v12M8 8l4-4 4 4M4 20h16" /></I>,
  spark: (p) => <I {...p}><path d="M12 3l1.5 5L19 9.5 13.5 11 12 16l-1.5-5L5 9.5 10.5 8 12 3z" /></I>,
  trash: (p) => <I {...p}><path d="M4 7h16M9 7V4h6v3m-7 0v13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" /></I>,
  trophy: (p) => <I {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0V4zM5 4h2v3a2 2 0 0 1-2-2V4zm14 0h-2v3a2 2 0 0 0 2-2V4zM9 17h6v3H9z" /></I>,
  user: (p) => <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>,
  wa: (p) => <I {...p} fill="currentColor" sw={0}><path d="M12.05 2C6.5 2 2 6.5 2 12.05c0 1.78.47 3.52 1.36 5.05L2 22l5.05-1.32a10 10 0 0 0 5 1.32C17.55 22 22 17.55 22 12.05 22 6.5 17.55 2 12.05 2z" /></I>,
  wallet: (p) => <I {...p}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2" /></I>,
};

// ── ESTILOS BASE ────────────────────────────────────────────
const page = { minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "var(--font-sans)", paddingBottom: 110 };
const card = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 };
const inp = { width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 14, color: C.t1, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", fontWeight: 500 };

function useIsDesktop() {
  const [desk, setDesk] = useState(() => window.innerWidth >= 900);
  useEffect(() => {
    const fn = () => setDesk(window.innerWidth >= 900);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return desk;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function MiCuenta() {
  const isDesktop = useIsDesktop();

  // Auth state
  const [session, setSession] = useState(() => clienteSession.get());
  const [authStep, setAuthStep] = useState("login"); // login | verify | register
  const [authData, setAuthData] = useState({ tel: "", isNew: false });

  // Data state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Nav state
  const [tab, setTab] = useState("home");
  const [stack, setStack] = useState([{ screen: "home", payload: null }]);
  const [toast, setToast] = useState("");

  // Fetch data al loguearse
  useEffect(() => {
    if (!session) return;
    let alive = true;
    setLoading(true);
    clienteData.me()
      .then(d => { if (alive) setData(d); })
      .catch(e => {
        if (e.message.includes("Sesión") || e.message.includes("401")) {
          clienteSession.clear();
          setSession(null);
        }
        setError(e.message);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [session]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const refresh = () => clienteData.me().then(setData).catch(() => {});

  const go = (screen, payload) => {
    if (["home", "reservas", "referido", "perfil"].includes(screen)) {
      setTab(screen);
      setStack([{ screen, payload }]);
    } else {
      setStack([...stack, { screen, payload }]);
    }
  };
  const back = () => stack.length > 1 && setStack(stack.slice(0, -1));
  const current = stack[stack.length - 1];

  const onLogout = () => { clienteAuth.logout(); setSession(null); setData(null); setStack([{ screen: "home" }]); setAuthStep("login"); };

  // ── AUTH FLOW ─────────────────────────────────────────────
  if (!session) {
    return (
      <div style={page}>
        {authStep === "login" && (
          <LoginScreen
            onSent={(tel, isNew) => { setAuthData({ tel, isNew }); setAuthStep("verify"); }}
          />
        )}
        {authStep === "verify" && (
          <VerifyScreen
            tel={authData.tel}
            isNew={authData.isNew}
            onBack={() => setAuthStep("login")}
            onVerified={(d) => {
              setSession({ token: d.token, cliente: d.cliente });
              showToast(`¡Bienvenido, ${d.cliente.nombre}!`);
            }}
            onNeedsRegister={() => setAuthStep("register")}
          />
        )}
        {authStep === "register" && (
          <RegisterScreen
            tel={authData.tel}
            onBack={() => setAuthStep("verify")}
            onDone={(d) => {
              setSession({ token: d.token, cliente: d.cliente });
              showToast("¡Cuenta creada!");
            }}
          />
        )}
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  // ── LOADING ───────────────────────────────────────────────
  if (loading && !data) {
    return <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.t2 }}>Cargando tu cuenta…</div>
    </div>;
  }

  if (!data) return null;

  // ── ROUTER DE PANTALLAS ──────────────────────────────────
  const renderScreen = () => {
    const { screen, payload } = current;
    switch (screen) {
      case "home":      return <Dashboard data={data} go={go} />;
      case "reservas":  return <Reservas data={data} go={go} />;
      case "reservaDetalle": return <ReservaDetalle turno={payload} go={go} back={back} showToast={showToast} refresh={refresh} />;
      case "reagendar": return <Reagendar turno={payload} back={back} showToast={showToast} refresh={refresh} />;
      case "reservar":  return <Reservar back={back} showToast={showToast} refresh={refresh} />;
      case "referido":  return <Referido data={data} back={() => go("home")} showToast={showToast} />;
      case "perfil":    return <Perfil data={data} go={go} onLogout={onLogout} showToast={showToast} refresh={refresh} />;
      case "pagos":     return <Pagos data={data} back={back} />;
      case "abonos":    return <Abonos data={data} back={back} />;
      case "notif":     return <Notif data={data} back={back} showToast={showToast} />;
      case "favoritos": return <Favoritos data={data} back={back} go={go} showToast={showToast} refresh={refresh} />;
      default:          return <Dashboard data={data} go={go} />;
    }
  };

  const showNav = ["home", "reservas", "referido", "perfil"].includes(current.screen) && stack.length === 1;
  const navChange = (id) => id === "reservar" ? go("reservar") : (setTab(id), setStack([{ screen: id }]));

  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "var(--font-sans)", display: "flex" }}>
        <Sidebar active={tab} onChange={navChange} cliente={data.cliente} onLogout={onLogout} canBack={stack.length > 1} onBack={back} />
        <main style={{ flex: 1, marginLeft: 260, minHeight: "100vh" }}>
          <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 32px 60px" }}>
            {renderScreen()}
          </div>
        </main>
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  return (
    <div style={page}>
      {renderScreen()}
      {showNav && <BottomNav active={tab} onChange={navChange} />}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AUTH SCREENS
// ─────────────────────────────────────────────────────────────
function LoginScreen({ onSent }) {
  const [tel, setTel] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const isDesktop = useIsDesktop();

  const submit = async () => {
    if (tel.replace(/\D/g, "").length < 8) return setErr("Número incompleto");
    setLoading(true); setErr("");
    try {
      const d = await clienteAuth.sendCode(tel);
      onSent(tel, d.isNewClient);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const form = (
    <>
      <h1 style={{ fontSize: isDesktop ? 34 : 30, fontWeight: 800, margin: "0 0 12px", letterSpacing: -1, lineHeight: 1.1 }}>
        Tu cancha,<br/><span style={{ color: C.coral }}>tu cuenta.</span>
      </h1>
      <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.6, marginBottom: 28 }}>
        Ingresá tu número de WhatsApp y te enviamos un código para entrar.
      </p>
      <label style={{ fontSize: 12, color: C.t2, fontWeight: 600, marginBottom: 8, display: "block" }}>WhatsApp</label>
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "0 4px 0 14px", marginBottom: 12 }}>
        <span style={{ color: C.t2, fontWeight: 600, paddingRight: 10, borderRight: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>🇵🇾 +595</span>
        <input value={tel} onChange={e => setTel(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="0994 821 477" inputMode="tel"
          style={{ flex: 1, padding: "16px 14px", background: "transparent", border: "none", color: C.t1, fontSize: 16, fontFamily: "inherit", outline: "none", fontWeight: 500, letterSpacing: 0.5 }} />
      </div>
      {err && <div style={{ background: C.redBg, border: `1px solid ${C.redBd}`, color: C.red, padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{err}</div>}
      <Btn v="primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: "16px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}>
        {loading ? "Enviando código…" : "Continuar →"}
      </Btn>
      <div style={{ marginTop: 18, fontSize: 12, color: C.t3, textAlign: "center", lineHeight: 1.5 }}>
        Te enviamos un código por WhatsApp.<br/>Al continuar aceptás los Términos y la Política de privacidad.
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", background: C.bg }}>
        {/* Left — branding */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 56px",
          background: `radial-gradient(ellipse 100% 80% at 10% 110%, rgba(224,91,40,0.30) 0%, ${C.bg} 60%)`,
          borderRight: `1px solid ${C.border}` }}>
          <img src={LOGO} alt="Dexon" style={{ height: 64, ...LOGO_STYLE_DARK, alignSelf: "flex-start" }} />
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, marginBottom: 20 }}>
              Tu cancha,<br/><span style={{ color: C.coral }}>tu cuenta.</span>
            </div>
            <div style={{ fontSize: 16, color: C.t2, lineHeight: 1.7, maxWidth: 380 }}>
              Mirá tus próximos turnos, reagendá, cancelá y controlá tu saldo — todo en un lugar.
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.t3 }}>© {new Date().getFullYear()} Dexon Padel</div>
        </div>
        {/* Right — form */}
        <div style={{ width: 460, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 56px" }}>
          {form}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "70px 24px 40px", minHeight: "100vh", display: "flex", flexDirection: "column",
      background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(224,91,40,0.18) 0%, ${C.bg} 60%)` }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <img src={LOGO} alt="Dexon" style={{ height: 64, ...LOGO_STYLE_DARK }} />
      </div>
      {form}
    </div>
  );
}

function VerifyScreen({ tel, isNew, onBack, onVerified, onNeedsRegister }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(45);
  const [loading, setLoading] = useState(false);
  const refs = useRef([...Array(6)].map(() => React.createRef()));

  useEffect(() => {
    if (seconds <= 0) return;
    const i = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(i);
  }, [seconds]);

  const submit = async (codeStr) => {
    setLoading(true); setError("");
    try {
      const d = await clienteAuth.verifyCode({ telefono: tel, codigo: codeStr });
      onVerified(d);
    } catch (e) {
      if (e.message.includes("Completá nombre")) onNeedsRegister();
      else setError(e.message);
    }
    setLoading(false);
  };

  const setDigit = (i, v) => {
    if (v && !/^\d$/.test(v)) return;
    const nc = [...code]; nc[i] = v; setCode(nc); setError("");
    if (v && i < 5) refs.current[i + 1].current?.focus();
    if (nc.every(d => d !== "")) submit(nc.join(""));
  };
  const onKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1].current?.focus();
  };

  const resend = async () => {
    try { await clienteAuth.sendCode(tel); setSeconds(45); } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ padding: "60px 24px 40px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <button onClick={onBack} style={iconBtnStyle(36)}><Ico.back sz={18} /></button>

      <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#25D366", marginTop: 32, marginBottom: 20 }}>
        <Ico.wa sz={30} />
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 10px", letterSpacing: -0.5 }}>Ingresá el código</h1>
      <p style={{ fontSize: 14, color: C.t2, lineHeight: 1.6, marginBottom: 32 }}>
        Te enviamos un código de 6 dígitos por WhatsApp al <b style={{ color: C.t1 }}>+595 {tel}</b>.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {code.map((d, i) => (
          <input key={i} ref={refs.current[i]} value={d}
            onChange={e => setDigit(i, e.target.value.slice(-1))}
            onKeyDown={e => onKeyDown(i, e)}
            inputMode="numeric" maxLength={1} autoFocus={i === 0}
            style={{ flex: 1, minWidth: 0, height: 56, textAlign: "center", fontSize: 24, fontWeight: 700,
              background: d ? "rgba(224,91,40,0.12)" : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${d ? C.coral : (error ? C.redBd : C.border)}`,
              borderRadius: 14, color: C.t1, fontFamily: "inherit", outline: "none" }} />
        ))}
      </div>

      {error && <div style={{ background: C.redBg, border: `1px solid ${C.redBd}`, color: C.red, padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}
      {loading && <div style={{ color: C.t2, fontSize: 13 }}>Verificando…</div>}

      <div style={{ fontSize: 13, color: C.t2 }}>
        {seconds > 0
          ? <>Podés reenviarlo en <b style={{ color: C.t1 }}>{seconds}s</b></>
          : <button onClick={resend} style={{ background: "none", border: "none", color: C.coral, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 13 }}>Reenviar código →</button>}
      </div>
    </div>
  );
}

function RegisterScreen({ tel, onBack, onDone }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [refCode, setRefCode] = useState("");
  const [codigo, setCodigo] = useState("");      // OTP que ya tipearon
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!nombre.trim() || !apellido.trim()) return setErr("Completá nombre y apellido");
    if (!/^\d{6}$/.test(codigo)) return setErr("Falta el código de WhatsApp");
    setLoading(true); setErr("");
    try {
      const d = await clienteAuth.verifyCode({ telefono: tel, codigo, nombre, apellido, codigo_referido: refCode });
      onDone(d);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ padding: "60px 24px 40px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <button onClick={onBack} style={iconBtnStyle(36)}><Ico.back sz={18} /></button>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "28px 0 10px", letterSpacing: -0.5 }}>Bienvenido a Dexon</h1>
      <p style={{ fontSize: 14, color: C.t2, marginBottom: 22 }}>Es tu primera vez. Completá tus datos para crear la cuenta.</p>

      <Field label="Nombre"><input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Pablo" /></Field>
      <Field label="Apellido"><input style={inp} value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Obertino" /></Field>
      <Field label="Código de verificación (WhatsApp)"><input style={inp} value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="6 dígitos" /></Field>
      <Field label="Código de referido (opcional)"><input style={inp} value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())} placeholder="REF-XXXXXXXX" /></Field>

      {err && <div style={{ background: C.redBg, border: `1px solid ${C.redBd}`, color: C.red, padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{err}</div>}

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        <Btn v="primary" disabled={loading} onClick={submit} style={{ width: "100%", padding: "16px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}>
          {loading ? "Creando…" : "Crear cuenta →"}
        </Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD — variante "Feed" (mobile app modern, cards apiladas)
// ─────────────────────────────────────────────────────────────
function Dashboard({ data, go }) {
  const { cliente, proximas, abono } = data;
  const next = proximas[0];
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div style={{ paddingTop: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
            ¿Listo para jugar, <span style={{ color: C.coral }}>{cliente.nombre}?</span>
          </div>
          <div style={{ fontSize: 14, color: C.t2, marginTop: 4 }}>Acá tenés todo lo de tu cuenta en un vistazo.</div>
        </div>

        {/* Grid 2 columnas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Próximo turno */}
          {next ? (
            <div onClick={() => go("reservaDetalle", next)} style={{ ...card, padding: 0, overflow: "hidden", cursor: "pointer", gridColumn: "1 / -1" }}>
              <div style={{ background: `linear-gradient(135deg, ${C.coralD}, ${C.coral})`, padding: "12px 22px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Tu próximo turno</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,0.18)", padding: "3px 9px", borderRadius: 100 }}>{countdown(next.inicio)}</span>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 0.95, letterSpacing: -2 }}>{hhmm(next.inicio)}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtFecha(next.inicio)}</div>
                  <div style={{ fontSize: 14, color: C.t2 }}>{next.cancha || "Cancha 1"} · {next.duracion || 60} min</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <Ico.chev sz={22} stroke={C.t3} />
                </div>
              </div>
            </div>
          ) : (
            <div onClick={() => go("reservar")} style={{ ...card, gridColumn: "1 / -1", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, background: "rgba(224,91,40,0.08)", borderColor: `${C.coral}44` }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.coral}, ${C.coralD})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Ico.plus sz={22} /></div>
              <div><div style={{ fontWeight: 700, fontSize: 16 }}>Reservar tu próximo turno</div><div style={{ fontSize: 13, color: C.t2 }}>Mirá horarios libres esta semana</div></div>
              <div style={{ marginLeft: "auto" }}><Ico.chev sz={20} stroke={C.t3} /></div>
            </div>
          )}

          {/* Saldo */}
          <div onClick={() => go("referido")} style={{ ...card, cursor: "pointer" }}>
            <div style={{ color: C.coral, marginBottom: 8 }}><Ico.wallet sz={22} /></div>
            <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Saldo a favor</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>{fmtGs(cliente.saldo_favor)}</div>
            <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>Acumulable · usalo en tu próxima reserva</div>
          </div>

          {/* Abono o favoritos */}
          {abono ? (
            <div onClick={() => go("abonos")} style={{ ...card, cursor: "pointer", background: "linear-gradient(135deg, #1A0A40, #120A30)", borderColor: C.purpleBd }}>
              <div style={{ color: C.purple, marginBottom: 8 }}><Ico.crown sz={22} /></div>
              <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Abono activo</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{abono.descripcion || "Semanal"}</div>
              <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>{abono.dia} {abono.hora}</div>
            </div>
          ) : (
            <div style={{ ...card, opacity: 0.4 }}>
              <div style={{ color: C.t3, marginBottom: 8 }}><Ico.heart sz={22} /></div>
              <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Favoritos</div>
              <div style={{ fontSize: 13, color: C.t2, marginTop: 4 }}>Próximamente</div>
            </div>
          )}
        </div>

        {/* Próximos (resto) */}
        {proximas.length > 1 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Próximos turnos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {proximas.slice(1, 5).map(t => <ReservaRow key={t.id} t={t} onClick={() => go("reservaDetalle", t)} big />)}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <img src={LOGO} alt="Dexon" style={{ height: 64, ...LOGO_STYLE_DARK }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => go("notif")} style={iconBtnStyle(40)}><Ico.bell /></button>
          <button onClick={() => go("perfil")} style={{ ...iconBtnStyle(40), padding: 0 }}>
            <Avatar nombre={cliente.nombre} size={36} />
          </button>
        </div>
      </div>

      <div style={{ padding: "12px 20px 18px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
          ¿Listo para jugar,<br/><span style={{ color: C.coral }}>{cliente.nombre}?</span>
        </div>
      </div>

      {/* Hero ticket */}
      {next ? (
        <div style={{ padding: "0 20px 18px" }}>
          <div onClick={() => go("reservaDetalle", next)} style={{ ...card, padding: 0, overflow: "hidden", cursor: "pointer" }}>
            <div style={{ background: `linear-gradient(135deg, ${C.coralD}, ${C.coral})`, padding: "12px 18px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Tu próximo turno</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,0.18)", padding: "3px 9px", borderRadius: 100 }}>
                {countdown(next.inicio)}
              </span>
            </div>
            <div style={{ padding: "20px 22px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
                <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 0.95, letterSpacing: -2 }}>{hhmm(next.inicio).split(":")[0]}</div>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtFecha(next.inicio)}</div>
                  <div style={{ fontSize: 13, color: C.t2 }}>{next.cancha || "Cancha 1"} · {next.duracion || 60}min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 20px 18px" }}>
          <FeedCard onClick={() => go("reservar")} accent icon={<Ico.plus />} title="Reservar tu próximo turno" subtitle="Mirá horarios libres esta semana" />
        </div>
      )}

      <FeedCard onClick={() => go("referido")} icon={<Ico.wallet />} title={fmtGs(cliente.saldo_favor)} subtitle="Saldo a favor · usalo en tu próxima reserva" />
      {abono && <FeedCard onClick={() => go("abonos")} icon={<Ico.crown />} title="Abono activo" subtitle={`Activo · renueva ${fmtFecha(abono.fecha_renovacion || abono.creado_en)}`} />}
      <FeedCard icon={<Ico.heart />} title="Tus horarios favoritos" subtitle="Próximamente" style={{ opacity: 0.4 }} />

      {/* Próximas */}
      {proximas.length > 1 && <>
        <SectionTitle>Próximos</SectionTitle>
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {proximas.slice(1, 4).map(t => <ReservaRow key={t.id} t={t} onClick={() => go("reservaDetalle", t)} />)}
        </div>
      </>}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// RESERVAS (tabs próximas / historial)
// ─────────────────────────────────────────────────────────────
function Reservas({ data, go }) {
  const [tab, setTab] = useState("proximas");
  const list = tab === "proximas" ? data.proximas : data.pasadas;
  return (
    <>
      <Header title="Mis turnos" />
      <div style={{ padding: "8px 20px 14px" }}>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: 4, display: "flex" }}>
          {[["proximas", "Próximos", data.proximas.length], ["pasadas", "Historial", data.pasadas.length]].map(([id, lbl, n]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "10px", border: "none", borderRadius: 10,
              background: tab === id ? `linear-gradient(135deg, ${C.coral}, ${C.coralD})` : "transparent",
              color: tab === id ? "#fff" : C.t2, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {lbl} <span style={{ background: tab === id ? "rgba(255,255,255,0.25)" : C.bgElev, padding: "1px 7px", borderRadius: 100, fontSize: 11 }}>{n}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {list.length === 0 && <Empty t="No tenés turnos por acá" />}
        {list.map(t => <ReservaRow key={t.id} t={t} onClick={() => go("reservaDetalle", t)} big />)}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// DETALLE de turno
// ─────────────────────────────────────────────────────────────
function ReservaDetalle({ turno, go, back, showToast, refresh }) {
  const horasFalta = (new Date(turno.inicio).getTime() - Date.now()) / 3600000;
  const puedeReagendar = horasFalta >= 12 && turno.tipo !== "abono";
  const puedeCancelar = horasFalta >= 12 && turno.tipo !== "abono";
  const [confirmCancel, setConfirmCancel] = useState(false);

  const cancelar = async () => {
    try {
      await clienteData.cancelarTurno(turno.id);
      showToast("Turno cancelado");
      await refresh();
      back();
    } catch (e) { showToast(e.message); }
  };

  return (
    <>
      <Header title="Detalle del turno" onBack={back} />
      <div style={{ padding: "8px 20px 20px" }}>
        <div style={{ background: `linear-gradient(160deg, ${C.coralD}, ${C.coral})`, borderRadius: 22, padding: "22px",
          color: "#fff", marginBottom: 16, boxShadow: "0 14px 36px rgba(224,91,40,0.3)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
            {fmtFecha(turno.inicio)}
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, letterSpacing: -2, marginBottom: 10 }}>{hhmm(turno.inicio)}</div>
          <div style={{ fontSize: 14, opacity: 0.95, display: "flex", alignItems: "center", gap: 6 }}>
            <Ico.pin sz={14} /> {turno.cancha || "Cancha 1"} · {turno.duracion || 60} min
          </div>
        </div>

        <div style={{ ...card, marginBottom: 12 }}>
          <Row label="Estado">{
            turno.tipo === "abono" ? <Badge type="purple">Abono</Badge> :
            !turno.pagado ? <Badge type="warn">Pendiente</Badge> :
            <Badge type="ok">Confirmado</Badge>
          }</Row>
          {turno.precio > 0 && <Row label="Precio"><b>{fmtGs(turno.precio)}</b></Row>}
          <Row label="Código"><span style={{ color: C.t2, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{String(turno.id).slice(-8).toUpperCase()}</span></Row>
        </div>

        <div style={{ ...card, marginBottom: 16, background: "rgba(224,91,40,0.08)", borderColor: `${C.coral}33` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ color: C.coral }}><Ico.spark sz={18} /></div>
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>
              Podés reagendar o cancelar sin costo hasta <b style={{ color: C.t1 }}>12 horas antes</b> del turno.
              {!puedeReagendar && turno.tipo !== "abono" && <span style={{ color: C.yellow }}> Ya no estás a tiempo — escribinos al club.</span>}
            </div>
          </div>
        </div>

        {puedeReagendar && <Btn v="ghost" onClick={() => go("reagendar", turno)} style={{ width: "100%", padding: "14px", borderRadius: 14, marginBottom: 10 }}>↻ Reagendar turno</Btn>}
        {puedeCancelar && <Btn v="danger" onClick={() => setConfirmCancel(true)} style={{ width: "100%", padding: "14px", borderRadius: 14 }}>Cancelar turno</Btn>}
      </div>

      <Modal show={confirmCancel} onClose={() => setConfirmCancel(false)} title="¿Cancelar turno?">
        <div style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Vas a cancelar tu turno del <b style={{ color: C.t1 }}>{fmtFecha(turno.inicio)} a las {hhmm(turno.inicio)}</b>. Esta acción no se puede deshacer.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn onClick={() => setConfirmCancel(false)}>No, mantener</Btn>
          <Btn v="danger" onClick={cancelar}>Sí, cancelar</Btn>
        </div>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// REAGENDAR + RESERVAR — usan selector de slot común
// ─────────────────────────────────────────────────────────────
function Reagendar({ turno, back, showToast, refresh }) {
  const [selected, setSelected] = useState(null);
  const [slots, setSlots] = useState([]);
  const [dayIdx, setDayIdx] = useState(0);

  const dias = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); d.setHours(0, 0, 0, 0); return d; });
  }, []);

  useEffect(() => {
    const d = dias[dayIdx];
    const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    clienteData.disponibilidad(ymd).then(r => setSlots(r?.slots || [])).catch(() => setSlots([]));
  }, [dayIdx]);

  const confirmar = async () => {
    try {
      const slot = slots.find(s => s.inicio === selected);
      await clienteData.reagendarTurno(turno.id, selected, slot?.duracion);
      showToast("Turno reagendado");
      await refresh();
      back();
    } catch (e) { showToast(e.message); }
  };

  return (
    <>
      <Header title="Reagendar turno" onBack={back} subtitle={`Original: ${fmtFecha(turno.inicio)} ${hhmm(turno.inicio)}`} />
      <DaysPicker dias={dias} value={dayIdx} onChange={(i) => { setDayIdx(i); setSelected(null); }} />
      <SectionTitle>Horarios disponibles</SectionTitle>
      <SlotsGrid slots={slots} selected={selected} onSelect={setSelected} />
      {selected && (
        <div style={{ position: "sticky", bottom: 0, padding: "12px 20px 28px", background: `linear-gradient(180deg, rgba(6,13,26,0) 0%, ${C.bg} 30%)` }}>
          <Btn v="primary" onClick={confirmar} style={{ width: "100%", padding: "16px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}>Confirmar reagendamiento</Btn>
        </div>
      )}
    </>
  );
}

function Reservar({ back, showToast, refresh }) {
  useEffect(() => {
    const sess = clienteSession.get();
    if (sess?.cliente) {
      const { nombre, apellido, telefono } = sess.cliente;
      const params = new URLSearchParams({
        nombre: `${nombre} ${apellido}`.trim(),
        telefono: telefono || "",
      });
      window.location.href = `/reservar?${params}`;
    } else {
      window.location.href = "/reservar";
    }
  }, []);
  return <div style={{ padding: 40, textAlign: "center", color: C.t2 }}>Cargando reserva…</div>;
}

// ─────────────────────────────────────────────────────────────
// REFERIDO + PERFIL + PAGOS + ABONOS + NOTIF + FAVORITOS
// ─────────────────────────────────────────────────────────────
function Referido({ data, back, showToast }) {
  const { cliente, referidos } = data;
  const REF_PCT = data.ref_pct || 10;
  const shareText = `Vení a jugar al pádel a Dexon. Reservá con mi código ${cliente.referrer_code} y obtenés ${REF_PCT}% de saldo a favor en tu primera reserva. https://dexon.com.py`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Dexon Padel", text: shareText }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      showToast("Texto copiado al portapapeles");
    }
  };
  const copy = async () => { await navigator.clipboard.writeText(cliente.referrer_code); showToast("Código copiado"); };

  return (
    <>
      <Header title="Invitá amigos" onBack={back} />
      <div style={{ padding: "8px 20px 30px" }}>
        <div style={{ background: `linear-gradient(160deg, ${C.coralD}, ${C.coral})`, borderRadius: 22, padding: "24px 22px",
          color: "#fff", marginBottom: 18, boxShadow: "0 14px 36px rgba(224,91,40,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Ico.gift sz={20} /><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Programa de referidos</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 8 }}>
            Obtené <span style={{ background: "rgba(255,255,255,0.18)", padding: "2px 10px", borderRadius: 8 }}>{REF_PCT}% de saldo</span><br/>por cada amigo que reserve.
          </div>
          <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.5 }}>
            Se acredita en tu cuenta y lo usás en tu próxima reserva.<br/>
            <span style={{ opacity: 0.8 }}>Es acumulable — cuantos más amigos, más saldo.</span>
          </div>
        </div>

        <div style={{ background: C.bgCard, border: `1.5px dashed ${C.coral}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Tu código</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.coral, fontFamily: "ui-monospace, monospace", letterSpacing: 1.5 }}>{cliente.referrer_code}</div>
            <button onClick={copy} style={iconBtnStyle(36)}><Ico.copy sz={16} /></button>
          </div>
        </div>

        <Btn v="primary" onClick={share} style={{ width: "100%", padding: "16px", borderRadius: 14, fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
          Compartir con amigos
        </Btn>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div style={card}><Lbl>Amigos</Lbl><Big>{referidos.total}</Big></div>
          <div style={card}><Lbl>Saldo acumulado</Lbl><Big color={C.coral}>{fmtGs(cliente.saldo_favor)}</Big></div>
        </div>

        <SectionTitle>Tus invitados</SectionTitle>
        <div style={{ padding: "0 0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {referidos.lista.length === 0 && <Empty t="Todavía no invitaste a nadie" />}
          {referidos.lista.map(r => (
            <div key={r.id} style={{ ...card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar nombre={`${r.nombre} ${r.apellido || ""}`} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.nombre} {r.apellido}</div>
                <div style={{ fontSize: 11, color: C.t3 }}>{fmtFecha(r.creado_en)}</div>
              </div>
              <Badge type="ok">+ {fmtGs(20000)}</Badge>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Perfil({ data, go, onLogout, showToast, refresh }) {
  const { cliente } = data;
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(cliente.nombre);
  const [email, setEmail] = useState(cliente.email || "");

  const save = async () => {
    try { await clienteData.updatePerfil({ nombre, email }); showToast("Datos actualizados"); setEditing(false); await refresh(); }
    catch (e) { showToast(e.message); }
  };

  return (
    <>
      <Header title="Mi cuenta" />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ padding: "8px 0 18px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Avatar nombre={cliente.nombre} size={84} />
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>{cliente.nombre}</div>
      </div>

      <div style={{ paddingBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionLabel>Datos personales</SectionLabel>
          <button onClick={() => editing ? save() : setEditing(true)} style={{ background: "none", border: "none", color: C.coral, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {editing ? "Guardar" : "Editar"}
          </button>
        </div>
        {editing ? (
          <div style={card}>
            <Field label="Nombre"><input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} /></Field>
            <Field label="Email (opcional)"><input style={inp} value={email} onChange={e => setEmail(e.target.value)} /></Field>
            <Field label="WhatsApp"><input style={{ ...inp, color: C.t3 }} value={cliente.telefono} disabled /></Field>
          </div>
        ) : (
          <div style={card}>
            <Row label="Nombre"><span style={{ fontWeight: 600 }}>{cliente.nombre}</span></Row>
            <Row label="WhatsApp"><span style={{ fontWeight: 600 }}>{cliente.telefono}</span></Row>
            <Row label="Email"><span style={{ color: cliente.email ? C.t1 : C.t3 }}>{cliente.email || "—"}</span></Row>
          </div>
        )}
      </div>

      <div style={{ paddingBottom: 16 }}>
        <SectionLabel>Mi actividad</SectionLabel>
        <div style={{ ...card, padding: 0, overflow: "hidden", marginTop: 10 }}>
          <MenuItem icon={<Ico.cal />} label="Mis turnos" sub={`${data.proximas.length} próximos`} onClick={() => go("reservas")} />
          {data.abono && <MenuItem icon={<Ico.crown />} label="Mi abono" sub="Activo" onClick={() => go("abonos")} />}
          <MenuItem icon={<Ico.heart />} label="Favoritos" sub="Próximamente" />
          <MenuItem icon={<Ico.wallet />} label="Pagos" sub={`${data.pagos.length} movimientos`} onClick={() => go("pagos")} last />
        </div>
      </div>

      <div style={{ paddingBottom: 16 }}>
        <SectionLabel>Ajustes</SectionLabel>
        <div style={{ ...card, padding: 0, overflow: "hidden", marginTop: 10 }}>
          <MenuItem icon={<Ico.bell />} label="Notificaciones" sub="WhatsApp, recordatorios" onClick={() => go("notif")} />
          <MenuItem icon={<Ico.gift />} label="Código de referido" sub="Compartir e invitar" onClick={() => go("referido")} last />
        </div>
      </div>

      <div style={{ paddingBottom: 30 }}>
        <Btn v="danger" onClick={onLogout} style={{ width: "100%", padding: "14px", borderRadius: 14 }}>↩ Cerrar sesión</Btn>
      </div>
      </div>
    </>
  );
}

function Pagos({ data, back }) {
  const total = data.pagos.reduce((s, p) => s + Number(p.precio || 0), 0);
  return (
    <>
      <Header title="Historial de pagos" onBack={back} />
      <div style={{ padding: "8px 20px 30px" }}>
        <div style={{ ...card, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><Lbl>Total gastado</Lbl><Big>{fmtGs(total)}</Big></div>
          <div style={{ color: C.coral }}><Ico.wallet sz={32} /></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.pagos.length === 0 && <Empty t="No tenés pagos registrados" />}
          {data.pagos.map(p => (
            <div key={p.id} style={{ ...card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: C.bgElev, color: C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico.wallet sz={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Turno {fmtFecha(p.inicio)}</div>
                <div style={{ fontSize: 11, color: C.t3 }}>{p.metodo_pago || "Pago online"} · {fmtFecha(p.pagado_en || p.inicio)}</div>
              </div>
              <b style={{ fontSize: 15 }}>{fmtGs(p.precio)}</b>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Abonos({ data, back }) {
  const { abono } = data;
  if (!abono) return <><Header title="Mi abono" onBack={back} /><Empty t="No tenés un abono activo" /></>;
  return (
    <>
      <Header title="Mi abono" onBack={back} />
      <div style={{ padding: "8px 20px 30px" }}>
        <div style={{ background: `linear-gradient(135deg, #2A1A60, #120A30)`, border: `1px solid ${C.purpleBd}`, borderRadius: 22, padding: 22, marginBottom: 16 }}>
          <Badge type="purple">Activo</Badge>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{abono.descripcion || "Abono semanal"}</div>
          <div style={{ fontSize: 13, color: C.t2, marginBottom: 14 }}>{abono.dia} {abono.hora}</div>
          <Row label="Próximo cobro"><b>{fmtGs(abono.precio_mensual || 0)}</b></Row>
          <Row label="Renueva"><b>{abono.fecha_renovacion ? fmtFecha(abono.fecha_renovacion) : "—"}</b></Row>
        </div>
        <Btn v="ghost" style={{ width: "100%", padding: "14px", borderRadius: 14 }}>Hablar con el club</Btn>
      </div>
    </>
  );
}

function Notif({ data, back, showToast }) {
  const [n, setN] = useState(data.cliente.notif);
  const toggle = async (k) => {
    const nv = { ...n, [k]: !n[k] };
    setN(nv);
    try { await clienteData.updateNotif(nv); showToast("Preferencia guardada"); }
    catch (e) { setN(n); showToast(e.message); }
  };
  return (
    <>
      <Header title="Notificaciones" onBack={back} />
      <div style={{ padding: "8px 20px 30px" }}>
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <ToggleRow icon={<Ico.wa />} label="Recordatorios" sub="Aviso 1h antes por WhatsApp" on={n.recordatorio} onToggle={() => toggle("recordatorio")} />
          <ToggleRow icon={<Ico.spark />} label="Promos y descuentos" sub="Avisos de descuentos especiales" on={n.promo} onToggle={() => toggle("promo")} />
          <ToggleRow icon={<Ico.bell />} label="Resumen mensual por email" sub="Estadísticas, torneos" on={n.email_resumen} onToggle={() => toggle("email_resumen")} />
          <ToggleRow icon={<Ico.bell />} label="Avisos urgentes por SMS" sub="Cancelaciones por lluvia" on={n.sms_urgente} onToggle={() => toggle("sms_urgente")} last />
        </div>
      </div>
    </>
  );
}

function Favoritos({ back }) {
  return (
    <>
      <Header title="Favoritos" onBack={back} />
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ color: C.t3, marginBottom: 16 }}><Ico.heart sz={48} /></div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Próximamente</div>
        <div style={{ fontSize: 13, color: C.t2, maxWidth: 280, margin: "0 auto" }}>
          Pronto vas a poder guardar tus horarios habituales y reservarlos con un toque.
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────
function Header({ title, onBack, subtitle }) {
  const isDesktop = useIsDesktop();
  if (isDesktop) {
    return (
      <div style={{ padding: "32px 0 20px", display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ ...iconBtnStyle(36), marginRight: 4 }}><Ico.back sz={18} /></button>
        )}
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: C.t2, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "sticky", top: 0, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, zIndex: 10, minHeight: 64 }}>
      {onBack
        ? <button onClick={onBack} style={iconBtnStyle(36)}><Ico.back sz={18} /></button>
        : <img src={LOGO} alt="Dexon" style={{ height: 64, ...LOGO_STYLE_DARK }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.t2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Sidebar({ active, onChange, cliente, onLogout, canBack, onBack }) {
  const navItems = [
    { id: "home",     label: "Inicio",   icon: <Ico.home sz={18} /> },
    { id: "reservas", label: "Mis turnos", icon: <Ico.cal sz={18} /> },
    { id: "referido", label: "Referidos", icon: <Ico.gift sz={18} /> },
    { id: "perfil",   label: "Mi cuenta", icon: <Ico.user sz={18} /> },
  ];
  const parts = (cliente.nombre || "").trim().split(" ");
  const initials = (parts[0]?.[0] || "") + (parts[1]?.[0] || "").toUpperCase();

  return (
    <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, background: C.bgCard, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", zIndex: 50 }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <img src={LOGO} alt="Dexon" style={{ height: 64, ...LOGO_STYLE_DARK }} />
      </div>

      {/* User card */}
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${C.coral}, ${C.coralD})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cliente.nombre}</div>
            <div style={{ fontSize: 11, color: C.t2 }}>{fmtGs(cliente.saldo_favor)} a favor</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 12px", overflowY: "auto" }}>
        {/* Botón reservar */}
        <button onClick={() => onChange("reservar")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 6, border: "none", borderRadius: 12, background: `linear-gradient(135deg, ${C.coral}, ${C.coralD})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 18px rgba(224,91,40,0.3)" }}>
          <Ico.plus sz={18} /> Reservar turno
        </button>

        {navItems.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onChange(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", marginBottom: 2, border: "none", borderRadius: 12, background: isActive ? `rgba(224,91,40,0.12)` : "transparent", color: isActive ? C.coral : C.t2, fontWeight: isActive ? 700 : 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s" }}>
              {item.icon} {item.label}
            </button>
          );
        })}

        {canBack && (
          <button onClick={onBack} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 12, background: "transparent", color: C.t2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            <Ico.back sz={16} /> Volver
          </button>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 12px 20px", borderTop: `1px solid ${C.border}` }}>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "none", borderRadius: 12, background: "transparent", color: C.t3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          <Ico.logout sz={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ active, onChange }) {
  const tabs = [
    { id: "home", label: "Inicio", icon: <Ico.home /> },
    { id: "reservas", label: "Turnos", icon: <Ico.cal /> },
    { id: "reservar", label: "", icon: <Ico.plus sz={24} />, primary: true },
    { id: "referido", label: "Amigos", icon: <Ico.gift /> },
    { id: "perfil", label: "Cuenta", icon: <Ico.user /> },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, paddingBottom: 16, zIndex: 100 }}>
      <div style={{ margin: "0 16px", background: "rgba(12,22,40,0.92)", backdropFilter: "blur(20px)", border: `1px solid ${C.border}`, borderRadius: 24, padding: "8px 6px", display: "flex", justifyContent: "space-around", alignItems: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
        {tabs.map(t => t.primary ? (
          <button key={t.id} onClick={() => onChange(t.id)} style={{ background: `linear-gradient(135deg, ${C.coral}, ${C.coralD})`, border: "none", width: 50, height: 50, borderRadius: 16, color: "#fff", cursor: "pointer", boxShadow: "0 8px 20px rgba(224,91,40,0.4)", transform: "translateY(-8px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>{t.icon}</button>
        ) : (
          <button key={t.id} onClick={() => onChange(t.id)} style={{ background: "none", border: "none", flex: 1, padding: "8px 4px", color: active === t.id ? C.coral : C.t3, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReservaRow({ t, onClick, big }) {
  const pending = !t.pagado && t.tipo !== "abono";
  return (
    <div onClick={onClick} style={{ ...card, padding: big ? 16 : "12px 14px", display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}>
      <div style={{ width: 52, height: big ? 64 : 52, borderRadius: 14, background: t.tipo === "abono" ? C.purpleBg : C.bgElev, border: `1px solid ${t.tipo === "abono" ? C.purpleBd : C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 9, color: C.t3, fontWeight: 700 }}>{["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"][new Date(t.inicio).getDay()]}</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{new Date(t.inicio).getDate()}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{hhmm(t.inicio)} · {t.duracion || 60}min</div>
        <div style={{ fontSize: 12, color: C.t2 }}>{t.cancha || "Cancha 1"}</div>
      </div>
      {t.tipo === "abono" ? <Badge type="purple">Abono</Badge> :
       pending ? <Badge type="warn">Por pagar</Badge> :
       <Badge type="ok">OK</Badge>}
    </div>
  );
}

function FeedCard({ icon, title, subtitle, onClick, accent, style: extraStyle }) {
  return (
    <div onClick={onClick} style={{ margin: "0 20px 10px", background: accent ? "rgba(224,91,40,0.12)" : C.bgCard, border: `1px solid ${accent ? `${C.coral}55` : C.border}`, borderRadius: 18, padding: "16px 18px", cursor: onClick ? "pointer" : "default", display: "flex", alignItems: "center", gap: 14, ...extraStyle }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: accent ? `linear-gradient(135deg, ${C.coral}, ${C.coralD})` : C.bgElev, color: accent ? "#fff" : C.coral, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div><div style={{ fontSize: 12, color: C.t2 }}>{subtitle}</div></div>
      <Ico.chev sz={18} stroke={C.t3} />
    </div>
  );
}

function MenuItem({ icon, label, sub, onClick, last }) {
  return (
    <button onClick={onClick} disabled={!onClick} style={{ width: "100%", background: "none", border: "none", borderBottom: last ? "none" : `1px solid ${C.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, color: onClick ? C.t1 : C.t3, cursor: onClick ? "pointer" : "default", fontFamily: "inherit", textAlign: "left", opacity: onClick ? 1 : 0.5 }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: C.bgElev, color: onClick ? C.coral : C.t3, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: C.t3 }}>{sub}</div></div>
      {onClick && <Ico.chev sz={18} />}
    </button>
  );
}

function ToggleRow({ icon, label, sub, on, onToggle, last }) {
  return (
    <div onClick={onToggle} style={{ padding: "14px 16px", borderBottom: last ? "none" : `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: C.bgElev, color: on ? C.coral : C.t3, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: C.t3 }}>{sub}</div></div>
      <div style={{ width: 48, height: 28, borderRadius: 100, background: on ? C.coral : C.bgElev, border: `1px solid ${on ? C.coral : C.border}`, position: "relative", transition: "all 0.2s" }}>
        <div style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.3)", transition: "left 0.2s" }} />
      </div>
    </div>
  );
}

function DaysPicker({ dias, value, onChange }) {
  return (
    <div style={{ padding: "8px 0 12px", overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 8, padding: "0 20px" }}>
        {dias.map((d, i) => (
          <button key={i} onClick={() => onChange(i)} style={{ flexShrink: 0, padding: "10px 12px", background: value === i ? `linear-gradient(135deg, ${C.coral}, ${C.coralD})` : C.bgCard, border: `1px solid ${value === i ? "transparent" : C.border}`, borderRadius: 14, color: value === i ? "#fff" : C.t1, fontFamily: "inherit", cursor: "pointer", minWidth: 60 }}>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, textTransform: "uppercase" }}>{["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"][d.getDay()]}</div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, marginTop: 2 }}>{d.getDate()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SlotsGrid({ slots, selected, onSelect }) {
  return (
    <div style={{ padding: "0 20px 120px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {slots.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: C.t3 }}>No hay horarios para este día</div>}
      {slots.map(s => {
        const isSel = selected === s.inicio;
        return (
          <button key={s.inicio} onClick={() => onSelect(s.inicio)}
            style={{ padding: "14px 6px", background: isSel ? `linear-gradient(135deg, ${C.coral}, ${C.coralD})` : C.bgCard, border: `1px solid ${isSel ? "transparent" : C.border}`, borderRadius: 12, color: isSel ? "#fff" : C.t1, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            {hhmm(s.inicio)}
          </button>
        );
      })}
    </div>
  );
}

// ── Mini helpers ───────────────────────────────────────────
const iconBtnStyle = (sz = 40, color = C.t1) => ({ background: C.bgElev, border: `1px solid ${C.border}`, width: sz, height: sz, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color, cursor: "pointer", flexShrink: 0 });
const LogoText = ({ size = 22 }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: size + 6, height: size + 6, borderRadius: 8, background: `linear-gradient(135deg, ${C.coral}, ${C.coralD})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: size * 0.6 }}>D</div>
    <div style={{ color: C.t1, fontWeight: 900, fontSize: size, letterSpacing: 2 }}>DEXON</div>
  </div>
);
const Row = ({ label, children }) => <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 12, color: C.t2 }}>{label}</span><div>{children}</div></div>;
const Field = ({ label, children }) => <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, color: C.t2, fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>{children}</div>;
const SectionTitle = ({ children }) => <div style={{ padding: "16px 20px 12px", fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: 0.5, textTransform: "uppercase" }}>{children}</div>;
const SectionLabel = ({ children }) => <div style={{ fontSize: 13, fontWeight: 700, color: C.t2, letterSpacing: 0.5, textTransform: "uppercase" }}>{children}</div>;
const Lbl = ({ children }) => <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{children}</div>;
const Big = ({ children, color }) => <div style={{ fontSize: 22, fontWeight: 800, color: color || C.t1, letterSpacing: -0.5 }}>{children}</div>;
const Empty = ({ t }) => <div style={{ textAlign: "center", padding: "40px 0", color: C.t3, fontSize: 13 }}>{t}</div>;
const Toast = ({ msg }) => <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(52,212,144,0.18)", border: `1px solid ${C.greenBd}`, color: C.green, padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{msg}</div>;

function countdown(target) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const dias = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (dias >= 1) return `Faltan ${dias}d ${h}h`;
  if (h >= 1) return `Faltan ${h}h ${m}m`;
  return `Faltan ${m}m`;
}
