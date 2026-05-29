/* ============================================================
   DEXON PADEL — tipos, helpers y contenido estático del rediseño
   (los datos en vivo vienen de Supabase vía el store)
   ============================================================ */

export const CLUB = {
  nombre: "DEXON PADEL",
  ciudad: "Tavapy",
  region: "Alto Paraná, Paraguay",
  tel: "+595 981 086 046",
  wa: "595981086046",
  email: "hola@dexon.com.py",
  apertura: 10,
  cierre: 24,
  tarifaBase: 80000,
  tarifaPico: 100000,
  picoIni: 19,
  picoFin: 22,
};

/* Lunes-first para mostrar; convertir getDay() con (d+6)%7 */
export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DIAS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_FULL = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

/* ---------- formatters ---------- */
export const gs = (n: number) => "₲ " + Math.round(n || 0).toLocaleString("es-PY");
export const gsK = (n: number) =>
  n >= 1_000_000 ? "₲ " + (n / 1_000_000).toFixed(1) + "M" : "₲ " + Math.round((n || 0) / 1000) + "k";
export const initials = (name: string) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
export const dowMon = (iso: string) => (new Date(iso + "T00:00:00").getDay() + 6) % 7;
export const fmtFecha = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${DIAS[dowMon(iso)]} ${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const fmtFechaLarga = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return `${DIAS_FULL[dowMon(iso)]} ${d.getDate()} de ${MESES_FULL[d.getMonth()]}`;
};
export const hora = (h: number) => `${String(h).padStart(2, "0")}:00`;

/* fechas reales */
export const TODAY = new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekFrom = (iso: string) => Array.from({ length: 7 }, (_, i) => addDays(iso, i));

const TINTS = ["#E05B28", "#2BA77A", "#E0A93B", "#5B8DEF", "#C2557A", "#7B6BE0"];
export const tint = (name: string) =>
  TINTS[[...(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

/* precio de un slot dado el cfg real */
export const precioTurno = (h: number, cfg: any) => {
  const pi = cfg?.hora_pico_inicio ?? CLUB.picoIni;
  const pf = cfg?.hora_pico_fin ?? CLUB.picoFin;
  return h >= pi && h < pf ? (cfg?.tarifa_pico ?? CLUB.tarifaPico) : (cfg?.tarifa_base ?? CLUB.tarifaBase);
};

/* ---------- tipos ---------- */
export type Nivel = "principiante" | "intermedio" | "avanzado" | "competitivo";
export type EstadoTurno = "reservado" | "confirmado" | "pendiente_pago" | "cancelado" | "no_show" | "completado";
export type TipoTurno = "ocasional" | "abono" | "clase" | "torneo";

export interface Cliente {
  id: number; nombre: string; telefono: string; nivel?: Nivel;
  saldo_favor?: number; deuda?: number; referrer_code?: string; notas?: string;
}
export interface Turno {
  id: number; fecha: string; hora: number; tipo: TipoTurno; estado: EstadoTurno;
  cliente_id: number; precio: number; sena: number; saldo?: number; cancha?: number;
  instructor_id?: number; abono_id?: number; notas?: string; metodo_pago?: string;
  pagopar_hash?: string; cobrado?: boolean;
}
export interface Abono {
  id: number; cliente_id: number; plan_id: number; precio_acordado: number;
  fecha_inicio: string; fecha_vencimiento: string; estado: "activo" | "vencido" | "cancelado";
}
export interface MovCaja {
  id: number; fecha: string; descripcion: string; tipo: "ingreso" | "egreso";
  categoria: string; monto: number; turno_id?: number; abono_id?: number;
}
export interface ItemStock {
  id: number; nombre: string; categoria: string; cantidad: number; minimo: number;
  precio_venta: number; precio_costo: number;
}
export interface Plan { id: number; nombre: string; horas_semana: number; precio: number; }
export interface Instructor { id: number; nombre: string; telefono?: string; tarifa_clase: number; }

export const estadoLabel: Record<EstadoTurno, string> = {
  reservado: "Reservado", confirmado: "Confirmado", pendiente_pago: "Pendiente pago",
  cancelado: "Cancelado", no_show: "No-show", completado: "Completado",
};
export const tipoLabel: Record<TipoTurno, string> = {
  ocasional: "Ocasional", abono: "Abono", clase: "Clase", torneo: "Torneo",
};
export const NIVELES: Nivel[] = ["principiante", "intermedio", "avanzado", "competitivo"];

/* ---------- contenido estático de la landing ---------- */
export const servicios = [
  { icon: "🎾", titulo: "Cancha profesional", desc: "Panorámica de cristal, césped premium WPT y medidas reglamentarias." },
  { icon: "💡", titulo: "Iluminación LED", desc: "Jugá de día o de noche con luz uniforme, sin sombras ni reflejos." },
  { icon: "📅", titulo: "Reserva online 24/7", desc: "Elegí horario, pagá la seña y listo. Confirmación instantánea por WhatsApp." },
  { icon: "🏆", titulo: "Clases y torneos", desc: "Profesores certificados y torneos por categoría todos los meses." },
  { icon: "🥤", titulo: "Buffet & pro shop", desc: "Bebidas, alquiler de paletas, pelotas y accesorios en el lugar." },
  { icon: "🅿️", titulo: "Estacionamiento", desc: "Amplio, iluminado y seguro. Llegás, jugás y te vas tranquilo." },
];
export const testimonios = [
  { nombre: "Mateo Rolón", nivel: "Competitivo", texto: "La mejor cancha de la zona, sin discusión. El sistema de reserva me cambió la vida, ya no pierdo tiempo coordinando por mensajes." },
  { nombre: "Sofía Martínez", nivel: "Intermedio", texto: "Empecé de cero con las clases y en 3 meses ya juego partidos. Ambiente increíble y gente copada." },
  { nombre: "Lucas Giménez", nivel: "Avanzado", texto: "Tengo mi abono fijo los martes y jueves. Cancha impecable siempre, y la iluminación de noche es otro nivel." },
];
export const faqs = [
  { q: "¿Cómo reservo un turno?", a: "Entrás a Reservar, elegís el día y el horario disponible, abonás la seña (o pagás en el club) y recibís la confirmación por WhatsApp al instante." },
  { q: "¿Cuánto sale jugar?", a: `La tarifa base es ${gs(CLUB.tarifaBase)} por hora. En horario pico (${CLUB.picoIni}:00 a ${CLUB.picoFin}:00) es ${gs(CLUB.tarifaPico)}. Los abonos mensuales tienen precio preferencial.` },
  { q: "¿Necesito llevar paleta y pelotas?", a: "No es obligatorio. Tenemos alquiler de paletas y venta de pelotas en el pro shop." },
  { q: "¿Qué pasa si llueve?", a: "Si el horario queda inhabilitado por lluvia, reprogramás sin costo o te queda el saldo a favor para tu próxima reserva." },
  { q: "¿Tienen clases para principiantes?", a: "Sí. Trabajamos con profesores certificados y armamos grupos por nivel, desde cero hasta competitivo." },
  { q: "¿Puedo cancelar una reserva?", a: "Sí, hasta 6 horas antes sin costo. La seña queda como saldo a favor." },
];
export const stats = [
  { n: "2", l: "canchas premium" },
  { n: "850+", l: "jugadores activos" },
  { n: "14h", l: "abiertos por día" },
  { n: "4.9", l: "estrellas Google" },
];
export const planesMkt = [
  { nombre: "Mensual 1x", horas: 1, precio: 280000 },
  { nombre: "Mensual 2x", horas: 2, precio: 520000, popular: true },
  { nombre: "Mensual 3x", horas: 3, precio: 720000 },
];
export const instructoresMkt = [
  { nombre: "Pablo Riquelme", nivel: "Ex-profesional · WPT", tarifa: 120000 },
  { nombre: "Andrea Vega", nivel: "Coach certificada FPP", tarifa: 110000 },
];
