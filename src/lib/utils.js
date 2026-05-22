// ── HELPERS ──
export const gs = n => "Gs "+Math.round(n||0).toLocaleString("es-PY");
export const hoy = () => new Date().toISOString().slice(0,10);
export const fmtFechaLegible = (fechaStr) => {
  if (!fechaStr) return "";
  const hoyStr = hoy();
  const fecha = new Date(fechaStr + "T00:00:00");
  const mañanaStr = new Date(fecha.getTime() + 86400000).toISOString().slice(0,10);
  if (fechaStr === hoyStr) return "Hoy";
  if (fechaStr === mañanaStr) return "Mañana";
  const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${meses[fecha.getMonth()]}`;
};
export const fmtD = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
export const initials = n => n?.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?";
export const avatarBg = n => { const c=["#0D2248","#072A1A","#2A1008","#180A38","#062030","#0E2008"]; return c[(n||"").charCodeAt(0)%c.length]; };
export const avatarFg = n => { const c=["#6EA8FF","#5ADDA8","#F5A878","#B090F8","#6ACCE0","#90D470"]; return c[(n||"").charCodeAt(0)%c.length]; };
const limpiarTexto = s => s.normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/[^A-Z]/g,"");
const shuffleArr = arr => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const tieneSecOrig = (res, orig) => { for(let i=0;i<=res.length-3;i++){if(orig.includes(res.slice(i,i+3)))return true;} return false; };
const mezclarSinP = (chars, orig) => { for(let i=0;i<20;i++){const m=shuffleArr(chars);if(!tieneSecOrig(m.join(""),orig))return m;} return shuffleArr(chars); };
export const genRefCode = (nombre="", telefono="") => {
  const letras=[...limpiarTexto(nombre||"X")];
  const digitos=[...( telefono.replace(/\D/g,"")||"0000")];
  const pad="XYZWQK";
  while(letras.length<3)letras.push(pad[letras.length%pad.length]);
  while(digitos.length<4)digitos.push(String(digitos.length%10));
  const L=mezclarSinP(letras,limpiarTexto(nombre||""));
  const D=mezclarSinP(digitos,telefono.replace(/\D/g,"")||"");
  return `${L.slice(0,3).join("")}-${D.slice(0,4).join("")}`;
};
