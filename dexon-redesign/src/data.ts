/* ============================================================
   DEXON PADEL — domain types, mock data & helpers
   (constants + utils + seed data consolidated here)
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

export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DIAS_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/* ---------- formatters ---------- */
export const gs = (n: number) =>
  "₲ " + Math.round(n || 0).toLocaleString("es-PY");
export const gsK = (n: number) =>
  n >= 1_000_000 ? "₲ " + (n / 1_000_000).toFixed(1) + "M" : "₲ " + Math.round(n / 1000) + "k";
export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
export const fmtFecha = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const fmtFechaLarga = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${DIAS_FULL[(d.getDay() + 6) % 7]} ${d.getDate()} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][d.getMonth()]}`;
};
export const hora = (h: number) => `${String(h).padStart(2, "0")}:00`;

/* deterministic ISO date helpers around a fixed "today" for the demo */
export const TODAY = "2026-05-29";
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekFrom = (iso: string) =>
  Array.from({ length: 7 }, (_, i) => addDays(iso, i));

/* avatar tint from name */
const TINTS = ["#E05B28", "#2BA77A", "#E0A93B", "#5B8DEF", "#C2557A", "#7B6BE0"];
export const tint = (name: string) =>
  TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

/* ---------- types ---------- */
export type Nivel = "principiante" | "intermedio" | "avanzado" | "competitivo";
export type EstadoTurno = "reservado" | "confirmado" | "pendiente_pago" | "cancelado" | "no_show" | "completado";
export type TipoTurno = "ocasional" | "abono" | "clase" | "torneo";

export interface Cliente {
  id: number; nombre: string; telefono: string; nivel: Nivel;
  saldoFavor: number; visitas: number; ultimaVisita: string; ref?: string; notas?: string;
}
export interface Turno {
  id: number; fecha: string; hora: number; tipo: TipoTurno; estado: EstadoTurno;
  clienteId: number; precio: number; sena: number; cancha: 1 | 2; instructorId?: number; notas?: string;
}
export interface Abono {
  id: number; clienteId: number; plan: string; precio: number; inicio: string; vence: string;
  estado: "activo" | "vencido" | "cancelado"; slots: { dia: number; hora: number }[];
}
export interface MovCaja {
  id: number; fecha: string; desc: string; tipo: "ingreso" | "egreso";
  categoria: "reserva" | "abono" | "clase" | "stock" | "gasto" | "sueldo"; monto: number;
}
export interface ItemStock {
  id: number; nombre: string; categoria: string; cantidad: number; minimo: number; venta: number; costo: number;
}
export interface Plan { id: number; nombre: string; horasSemana: number; precio: number; popular?: boolean; }
export interface Instructor { id: number; nombre: string; tel: string; tarifa: number; nivel: string; clases: number; }
export interface WaMsg { id: number; clienteId: number; texto: string; entrante: boolean; hora: string; leido: boolean; }

/* ---------- seed data ---------- */
export const clientes: Cliente[] = [
  { id: 1, nombre: "Lucas Giménez", telefono: "0981 234 567", nivel: "avanzado", saldoFavor: 0, visitas: 48, ultimaVisita: "2026-05-27", ref: "LUCAS10" },
  { id: 2, nombre: "Sofía Martínez", telefono: "0985 112 940", nivel: "intermedio", saldoFavor: 40000, visitas: 31, ultimaVisita: "2026-05-28" },
  { id: 3, nombre: "Mateo Rolón", telefono: "0971 884 220", nivel: "competitivo", saldoFavor: 0, visitas: 72, ultimaVisita: "2026-05-29", ref: "MATEO" },
  { id: 4, nombre: "Valentina Cáceres", telefono: "0982 553 117", nivel: "principiante", saldoFavor: 0, visitas: 9, ultimaVisita: "2026-05-25" },
  { id: 5, nombre: "Diego Fernández", telefono: "0961 778 003", nivel: "intermedio", saldoFavor: 0, visitas: 22, ultimaVisita: "2026-05-26" },
  { id: 6, nombre: "Camila Benítez", telefono: "0975 332 881", nivel: "avanzado", saldoFavor: 20000, visitas: 40, ultimaVisita: "2026-05-29" },
  { id: 7, nombre: "Joaquín Ayala", telefono: "0991 220 564", nivel: "intermedio", saldoFavor: 0, visitas: 15, ultimaVisita: "2026-05-22" },
  { id: 8, nombre: "Martina Duarte", telefono: "0983 901 447", nivel: "principiante", saldoFavor: 0, visitas: 6, ultimaVisita: "2026-05-20" },
];

export const instructores: Instructor[] = [
  { id: 1, nombre: "Pablo Riquelme", tel: "0981 555 010", tarifa: 120000, nivel: "Ex-profesional · WPT", clases: 18 },
  { id: 2, nombre: "Andrea Vega", tel: "0985 555 220", tarifa: 110000, nivel: "Coach certificada FPP", clases: 24 },
];

export const planes: Plan[] = [
  { id: 1, nombre: "Mensual 1x", horasSemana: 1, precio: 280000 },
  { id: 2, nombre: "Mensual 2x", horasSemana: 2, precio: 520000, popular: true },
  { id: 3, nombre: "Mensual 3x", horasSemana: 3, precio: 720000 },
];

export const abonos: Abono[] = [
  { id: 1, clienteId: 3, plan: "Mensual 3x", precio: 720000, inicio: "2026-05-10", vence: "2026-06-10", estado: "activo", slots: [{ dia: 1, hora: 20 }, { dia: 3, hora: 20 }, { dia: 5, hora: 21 }] },
  { id: 2, clienteId: 1, plan: "Mensual 2x", precio: 520000, inicio: "2026-05-15", vence: "2026-06-15", estado: "activo", slots: [{ dia: 2, hora: 19 }, { dia: 4, hora: 19 }] },
  { id: 3, clienteId: 6, plan: "Mensual 2x", precio: 520000, inicio: "2026-04-28", vence: "2026-05-28", estado: "vencido", slots: [{ dia: 0, hora: 18 }, { dia: 5, hora: 18 }] },
];

const precioH = (h: number) => (h >= CLUB.picoIni && h < CLUB.picoFin ? CLUB.tarifaPico : CLUB.tarifaBase);
let tid = 0;
const mk = (fecha: string, hora: number, clienteId: number, estado: EstadoTurno, tipo: TipoTurno, cancha: 1 | 2, sena = 0, instructorId?: number): Turno =>
  ({ id: ++tid, fecha, hora, tipo, estado, clienteId, cancha, precio: tipo === "clase" ? 130000 : precioH(hora), sena, instructorId });

export const turnos: Turno[] = [
  // hoy
  mk(TODAY, 10, 4, "confirmado", "ocasional", 1, 80000),
  mk(TODAY, 17, 8, "confirmado", "clase", 2, 0, 2),
  mk(TODAY, 19, 1, "confirmado", "abono", 1),
  mk(TODAY, 19, 2, "reservado", "ocasional", 2, 40000),
  mk(TODAY, 20, 3, "confirmado", "abono", 1),
  mk(TODAY, 20, 5, "pendiente_pago", "ocasional", 2),
  mk(TODAY, 21, 6, "reservado", "ocasional", 1, 50000),
  mk(TODAY, 22, 7, "pendiente_pago", "ocasional", 2),
  // mañana y resto de la semana
  mk(addDays(TODAY, 1), 19, 1, "confirmado", "abono", 1),
  mk(addDays(TODAY, 1), 20, 2, "reservado", "ocasional", 2, 40000),
  mk(addDays(TODAY, 1), 21, 4, "pendiente_pago", "ocasional", 1),
  mk(addDays(TODAY, 2), 20, 3, "confirmado", "abono", 1),
  mk(addDays(TODAY, 2), 18, 6, "reservado", "ocasional", 2),
  mk(addDays(TODAY, 3), 19, 1, "confirmado", "abono", 1),
  mk(addDays(TODAY, 3), 21, 5, "reservado", "ocasional", 2, 50000),
  mk(addDays(TODAY, 4), 21, 3, "confirmado", "abono", 1),
  mk(addDays(TODAY, 4), 17, 7, "confirmado", "clase", 2, 0, 1),
  // historial (completados)
  mk(addDays(TODAY, -1), 20, 1, "completado", "abono", 1),
  mk(addDays(TODAY, -1), 19, 2, "completado", "ocasional", 2, 40000),
  mk(addDays(TODAY, -2), 21, 3, "completado", "abono", 1),
  mk(addDays(TODAY, -3), 18, 6, "no_show", "ocasional", 2),
];

export const caja: MovCaja[] = [
  { id: 1, fecha: TODAY, desc: "Reserva — Valentina Cáceres", tipo: "ingreso", categoria: "reserva", monto: 80000 },
  { id: 2, fecha: TODAY, desc: "Clase — Martina Duarte", tipo: "ingreso", categoria: "clase", monto: 130000 },
  { id: 3, fecha: TODAY, desc: "Venta — Pelotas Head x2", tipo: "ingreso", categoria: "stock", monto: 90000 },
  { id: 4, fecha: TODAY, desc: "Bebidas (compra)", tipo: "egreso", categoria: "stock", monto: 220000 },
  { id: 5, fecha: addDays(TODAY, -1), desc: "Abono Mensual 2x — Lucas Giménez", tipo: "ingreso", categoria: "abono", monto: 520000 },
  { id: 6, fecha: addDays(TODAY, -1), desc: "Reserva — Sofía Martínez", tipo: "ingreso", categoria: "reserva", monto: 100000 },
  { id: 7, fecha: addDays(TODAY, -2), desc: "Sueldo instructor", tipo: "egreso", categoria: "sueldo", monto: 1200000 },
  { id: 8, fecha: addDays(TODAY, -2), desc: "Mantenimiento césped", tipo: "egreso", categoria: "gasto", monto: 350000 },
  { id: 9, fecha: addDays(TODAY, -3), desc: "Reserva — Mateo Rolón", tipo: "ingreso", categoria: "reserva", monto: 100000 },
];

export const stock: ItemStock[] = [
  { id: 1, nombre: "Pelotas Head Padel Pro x3", categoria: "Pelotas", cantidad: 24, minimo: 10, venta: 45000, costo: 28000 },
  { id: 2, nombre: "Agua mineral 500ml", categoria: "Bebidas", cantidad: 6, minimo: 24, venta: 8000, costo: 4000 },
  { id: 3, nombre: "Gatorade", categoria: "Bebidas", cantidad: 18, minimo: 12, venta: 15000, costo: 9000 },
  { id: 4, nombre: "Grip Wilson", categoria: "Accesorios", cantidad: 9, minimo: 6, venta: 25000, costo: 14000 },
  { id: 5, nombre: "Muñequera DEXON", categoria: "Merch", cantidad: 3, minimo: 8, venta: 35000, costo: 18000 },
  { id: 6, nombre: "Alquiler paleta", categoria: "Alquiler", cantidad: 8, minimo: 4, venta: 20000, costo: 0 },
];

export const waMsgs: WaMsg[] = [
  { id: 1, clienteId: 2, texto: "Hola! Quedó confirmado mi turno de hoy 19hs?", entrante: true, hora: "13:42", leido: false },
  { id: 2, clienteId: 2, texto: "Sí Sofía, confirmadísimo 🎾 Cancha 2, 19:00. Te esperamos!", entrante: false, hora: "13:45", leido: true },
  { id: 3, clienteId: 5, texto: "Puedo pagar en efectivo al llegar?", entrante: true, hora: "14:10", leido: false },
  { id: 4, clienteId: 7, texto: "Se me complicó, puedo reprogramar para mañana?", entrante: true, hora: "15:01", leido: false },
];

/* ---------- derived helpers ---------- */
export const cById = (id: number) => clientes.find((c) => c.id === id);
export const iById = (id: number) => instructores.find((i) => i.id === id);
export const precioTurno = precioH;

export const estadoLabel: Record<EstadoTurno, string> = {
  reservado: "Reservado", confirmado: "Confirmado", pendiente_pago: "Pendiente pago",
  cancelado: "Cancelado", no_show: "No-show", completado: "Completado",
};
export const tipoLabel: Record<TipoTurno, string> = {
  ocasional: "Ocasional", abono: "Abono", clase: "Clase", torneo: "Torneo",
};

/* landing content */
export const servicios = [
  { icon: "🎾", titulo: "Cancha profesional", desc: "Panorámica de cristal, césped premium WPT y medidas reglamentarias." },
  { icon: "💡", titulo: "Iluminación LED", desc: "Jugá de día o de noche con luz uniforme, sin sombras ni reflejos." },
  { icon: "📅", titulo: "Reserva online 24/7", desc: "Elegí horario, pagá la seña y listo. Confirmación instantánea por WhatsApp." },
  { icon: "🏆", titulo: "Clases y torneos", desc: "Profesores certificados y torneos por categoría todos los meses." },
  { icon: "🥤", titulo: "Buffet & pro shop", desc: "Bebidas, alquiler de paletas, pelotas y accesorios en el lugar." },
  { icon: "🅿️", titulo: "Estacionamiento", desc: "Amplio, iluminado y seguro. Llegás, jugás y te vas tranquilo." },
];

export const testimonios = [
  { nombre: "Mateo Rolón", nivel: "Competitivo", texto: "La mejor cancha de la zona, sin discusión. El sistema de reserva me cambió la vida, ya no pierdo tiempo coordinando por mensajes.", tint: "#E05B28" },
  { nombre: "Sofía Martínez", nivel: "Intermedio", texto: "Empecé de cero con las clases de Andrea y en 3 meses ya juego partidos. Ambiente increíble y gente copada.", tint: "#2BA77A" },
  { nombre: "Lucas Giménez", nivel: "Avanzado", texto: "Tengo mi abono fijo los martes y jueves. Cancha impecable siempre, y la iluminación de noche es otro nivel.", tint: "#5B8DEF" },
];

export const faqs = [
  { q: "¿Cómo reservo un turno?", a: "Entrás a la sección Reservar, elegís el día y el horario disponible, abonás la seña online (o elegís pagar en el club) y recibís la confirmación por WhatsApp al instante." },
  { q: "¿Cuánto sale jugar?", a: `La tarifa base es ${gs(CLUB.tarifaBase)} por hora. En horario pico (${CLUB.picoIni}:00 a ${CLUB.picoFin}:00) es ${gs(CLUB.tarifaPico)}. Los abonos mensuales tienen precio preferencial.` },
  { q: "¿Necesito llevar paleta y pelotas?", a: "No es obligatorio. Tenemos alquiler de paletas y venta de pelotas en el pro shop. Igual podés traer tu equipo si preferís." },
  { q: "¿Qué pasa si llueve?", a: "Si el horario queda inhabilitado por lluvia, reprogramás sin costo o te queda el saldo a favor para tu próxima reserva." },
  { q: "¿Tienen clases para principiantes?", a: "Sí. Trabajamos con profesores certificados y armamos grupos por nivel, desde cero hasta competitivo." },
  { q: "¿Puedo cancelar una reserva?", a: "Sí, hasta 6 horas antes sin costo. La seña queda como saldo a favor para tu próxima reserva." },
];

export const stats = [
  { n: "2", l: "canchas premium" },
  { n: "850+", l: "jugadores activos" },
  { n: "14h", l: "abiertos por día" },
  { n: "4.9", l: "estrellas Google" },
];
