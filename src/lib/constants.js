// ── CONSTANTES GLOBALES ──
export const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://dexon-padel.obertinop.workers.dev';
export const ADMIN_TEL = import.meta.env.VITE_ADMIN_TEL;
export const LOGO = "/logo.svg";
export const LOGO_STYLE_DARK = { objectFit: "contain", filter: "brightness(0) invert(1)" };
export const LOGO_STYLE_LIGHT = { objectFit: "contain" };

export const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
export const DIAS_FULL = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
export const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── PALETA ──
export const C = {
  bg:"#060D1A", bgCard:"#0C1628", bgElev:"#101D38", bgHover:"#162240",
  border:"#1A2E55", borderL:"#223870",
  coral:"#E05B28", coralL:"#FF7040", coralD:"#B84520", coralAlpha:"rgba(224,91,40,0.12)",
  blue:"#0A1628", blueM:"#1A3070",
  t1:"#EEF2FF", t2:"#8AA0CC", t3:"#4A6088",
  green:"#34D490", greenBg:"#071E12", greenBd:"#0F4025",
  yellow:"#F5C060", yellowBg:"#1A1208", yellowBd:"#3A2A10",
  red:"#F06060", redBg:"#1A0808", redBd:"#4A1010",
  purple:"#A080FF", purpleBg:"#120A30", purpleBd:"#2A1A60",
  info:"#5AA0F0", infoBg:"#081830",
};
// ── ESTILOS BASE ──
export const inp = { padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, width:"100%", background:C.blue, color:C.t1, fontFamily:"var(--font-sans)", outline:"none", boxSizing:"border-box" };
export const card = { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px" };
export const metric = { background:C.bg, borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}` };
export const lbl = { fontSize:12, color:C.t2, fontWeight:500, marginBottom:5, display:"block" };
