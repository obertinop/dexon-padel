/* ============================================================
   DEXON PADEL — store admin (Supabase real vía src/lib/api.js)
   Replica las queries y acciones de la App.js original.
   ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
// @ts-ignore — módulos JS sin tipos
import { auth, db, api, apiHeaders } from "@/lib/api.js";
import { TODAY, addDays } from "@/data";

const empty = {
  turnos: [], clientes: [], abonos: [], planes: [], instructores: [], caja: [],
  stock: [], abono_turnos: [], codigos_ref: [], turno_items: [], diasBloqueados: [],
  cfg: { id: 1, nombre_club: "DEXON PADEL", hora_inicio: 10, hora_fin: 24, tarifa_base: 80000, tarifa_pico: 100000, hora_pico_inicio: 19, hora_pico_fin: 22 },
};

type AdminCtx = {
  data: typeof empty;
  loading: boolean;
  refreshing: boolean;
  tk: string | null;
  user: any;
  notice: { text: string; type: string } | null;
  notify: (t: string, type?: string) => void;
  load: () => Promise<void>;
  logout: () => Promise<void>;
  cById: (id: number) => any;
  pById: (id: number) => any;
  iById: (id: number) => any;
  precio: (h: number) => number;
  // acciones
  confirmarTurno: (t: any) => Promise<void>;
  cancelarTurno: (t: any) => Promise<void>;
  noShow: (t: any) => Promise<void>;
  confirmarBulk: (ids: number[]) => Promise<void>;
  cancelarBulk: (ids: number[]) => Promise<void>;
  crearTurno: (f: any) => Promise<void>;
  guardarCliente: (f: any) => Promise<void>;
  eliminarCliente: (id: number) => Promise<void>;
  guardarMovCaja: (f: any) => Promise<void>;
  eliminarMovCaja: (id: number) => Promise<void>;
  guardarStock: (f: any) => Promise<void>;
  moverStock: (f: any) => Promise<void>;
  guardarConfig: (f: any) => Promise<void>;
};

const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin fuera del provider");
  return c;
};

export function AdminProvider({ token, user, onLogout, children }: { token: string; user: any; onLogout: () => void; children: ReactNode }) {
  const tk = token;
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: string } | null>(null);
  const timer = useRef<any>(null);

  const notify = useCallback((text: string, type = "info") => {
    setNotice({ text, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), type === "error" ? 4200 : 2600);
  }, []);

  const load = useCallback(async () => {
    if (!tk) return;
    setRefreshing(true);
    try {
      const [tu, cl, ab, pl, ins, ca, st, cf, at, cr, ti, db2] = await Promise.all([
        db.get("turnos", "order=fecha.asc,hora.asc", tk),
        db.get("clientes", "order=nombre.asc", tk),
        db.get("abonos", "order=fecha_vencimiento.asc", tk),
        db.get("planes", "order=precio.asc", tk),
        db.get("instructores", "order=nombre.asc", tk),
        db.get("caja", "order=fecha.desc,id.desc", tk),
        db.get("stock", "order=nombre.asc", tk),
        db.get("config", "limit=1", tk),
        db.get("abono_turnos", "order=abono_id.asc", tk),
        db.get("codigos_referido", "order=created_at.desc", tk),
        db.get("turno_items", "order=created_at.asc", tk),
        db.get("dias_bloqueados", "order=fecha.asc", tk),
      ]);
      setData((prev) => ({
        turnos: tu || [], clientes: cl || [], abonos: ab || [], planes: pl || [],
        instructores: ins || [], caja: ca || [], stock: st || [], abono_turnos: at || [],
        codigos_ref: cr || [], turno_items: ti || [], diasBloqueados: db2 || [],
        cfg: cf?.[0] || prev.cfg,
      }));
    } catch (e: any) {
      notify(e?.message || "Error cargando datos", "error");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [tk, notify]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const i = setInterval(() => load(), 20000);
    return () => clearInterval(i);
  }, [load]);

  const logout = useCallback(async () => {
    try { await auth.logout(tk); } catch {}
    localStorage.removeItem("dx_token");
    localStorage.removeItem("dx_user");
    onLogout();
  }, [tk, onLogout]);

  const cById = useCallback((id: number) => data.clientes.find((c: any) => c.id === id), [data.clientes]);
  const pById = useCallback((id: number) => data.planes.find((p: any) => p.id === id), [data.planes]);
  const iById = useCallback((id: number) => data.instructores.find((i: any) => i.id === id), [data.instructores]);
  const precio = useCallback((h: number) => {
    const c: any = data.cfg;
    return h >= c.hora_pico_inicio && h < c.hora_pico_fin ? c.tarifa_pico : c.tarifa_base;
  }, [data.cfg]);

  const hoy = () => TODAY;

  /* ---------- ACCIONES (replican App.js) ---------- */
  const confirmarTurno = async (t: any) => {
    try {
      const saldo = t.precio - (t.sena || 0);
      await db.patch("turnos", t.id, { estado: "confirmado", cobrado: true, saldo: 0 }, tk);
      if (saldo > 0)
        await db.post("caja", { descripcion: `Reserva - ${cById(t.cliente_id)?.nombre || "?"}`, tipo: "ingreso", categoria: t.tipo === "clase" ? "clase" : "reserva", monto: saldo, fecha: t.fecha, turno_id: t.id }, tk);
      await load(); notify("Turno confirmado", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const cancelarTurno = async (t: any) => {
    try {
      await db.patch("turnos", t.id, { estado: "cancelado" }, tk);
      if (t.sena > 0)
        await db.post("caja", { descripcion: `Dev. seña - ${cById(t.cliente_id)?.nombre || "?"}`, tipo: "egreso", categoria: "reserva", monto: t.sena, fecha: hoy(), turno_id: t.id }, tk);
      await load(); notify("Turno cancelado", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const noShow = async (t: any) => {
    try { await db.patch("turnos", t.id, { estado: "no_show" }, tk); await load(); } catch (e: any) { notify(e.message, "error"); }
  };
  const confirmarBulk = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(async (id) => {
        const t = data.turnos.find((x: any) => x.id === id); if (!t) return;
        const saldo = t.precio - (t.sena || 0);
        await db.patch("turnos", id, { estado: "confirmado", cobrado: true, saldo: 0 }, tk);
        if (saldo > 0)
          await db.post("caja", { descripcion: `Reserva - ${cById(t.cliente_id)?.nombre || "?"}`, tipo: "ingreso", categoria: t.tipo === "clase" ? "clase" : "reserva", monto: saldo, fecha: t.fecha, turno_id: t.id }, tk);
      }));
      await load(); notify(`${ids.length} turno(s) confirmado(s)`, "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const cancelarBulk = async (ids: number[]) => {
    try {
      await Promise.all(ids.map(async (id) => {
        const t = data.turnos.find((x: any) => x.id === id); if (!t) return;
        await db.patch("turnos", id, { estado: "cancelado" }, tk);
        if (t.sena > 0)
          await db.post("caja", { descripcion: `Dev. seña - ${cById(t.cliente_id)?.nombre || "?"}`, tipo: "egreso", categoria: "reserva", monto: t.sena, fecha: hoy(), turno_id: t.id }, tk);
      }));
      await load(); notify(`${ids.length} turno(s) cancelado(s)`, "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const crearTurno = async (f: any) => {
    if (!f.cliente_id || !f.fecha || f.hora === undefined) { notify("Faltan datos", "error"); return; }
    if (data.turnos.find((t: any) => t.fecha === f.fecha && t.hora === Number(f.hora) && t.estado !== "cancelado")) { notify("Ese horario ya está ocupado", "error"); return; }
    try {
      const p = f.tipo === "clase" ? Number(f.precio_clase || 0) : precio(Number(f.hora));
      const sena = Number(f.sena || 0);
      const [t] = await db.post("turnos", { fecha: f.fecha, hora: Number(f.hora), tipo: f.tipo || "ocasional", estado: "reservado", cliente_id: Number(f.cliente_id), instructor_id: f.instructor_id ? Number(f.instructor_id) : null, precio: p, sena, saldo: p - sena, notas: f.notas || "" }, tk);
      if (sena > 0) await db.post("caja", { descripcion: `Seña - ${cById(Number(f.cliente_id))?.nombre || "?"}`, tipo: "ingreso", categoria: "reserva", monto: sena, fecha: f.fecha, turno_id: t.id }, tk);
      await load(); notify("Turno creado", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const guardarCliente = async (f: any) => {
    if (!f.nombre?.trim()) { notify("Nombre requerido", "error"); return; }
    try {
      const p = { nombre: f.nombre.trim(), telefono: f.telefono || "", nivel: f.nivel || "intermedio", notas: f.notas || "", saldo_favor: Number(f.saldo_favor || 0) };
      if (f.id) await db.patch("clientes", f.id, p, tk); else await db.post("clientes", p, tk);
      await load(); notify("Cliente guardado", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const eliminarCliente = async (id: number) => {
    try { await db.del("clientes", id, tk); await load(); notify("Cliente eliminado", "ok"); } catch (e: any) { notify(e.message, "error"); }
  };
  const guardarMovCaja = async (f: any) => {
    if (!f.descripcion || !f.monto) { notify("Descripción y monto requeridos", "error"); return; }
    try {
      await db.post("caja", { descripcion: f.descripcion, tipo: f.tipo || "egreso", categoria: f.categoria || "gasto", monto: Number(f.monto), fecha: f.fecha || hoy() }, tk);
      await load(); notify("Movimiento registrado", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const eliminarMovCaja = async (id: number) => {
    try { await db.del("caja", id, tk); await load(); } catch (e: any) { notify(e.message, "error"); }
  };
  const guardarStock = async (f: any) => {
    if (!f.nombre?.trim() || f.cantidad === undefined) { notify("Nombre y cantidad requeridos", "error"); return; }
    try {
      const p = { nombre: f.nombre, categoria: f.categoria || "general", cantidad: Number(f.cantidad), minimo: Number(f.minimo || 0), precio_venta: Number(f.precio_venta || 0), precio_costo: Number(f.precio_costo || 0) };
      if (f.id) await db.patch("stock", f.id, p, tk); else await db.post("stock", p, tk);
      await load(); notify("Producto guardado", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const moverStock = async (f: any) => {
    if (!f.stock_id || !f.cantidad_mov) { notify("Faltan datos", "error"); return; }
    try {
      const item = data.stock.find((s: any) => s.id === Number(f.stock_id)); if (!item) return;
      const delta = f.tipo_mov === "entrada" ? Number(f.cantidad_mov) : -Number(f.cantidad_mov);
      await db.patch("stock", item.id, { cantidad: Math.max(0, item.cantidad + delta) }, tk);
      if (f.tipo_mov === "salida" && item.precio_venta > 0)
        await db.post("caja", { descripcion: `Venta - ${item.nombre} x${f.cantidad_mov}`, tipo: "ingreso", categoria: "stock", monto: item.precio_venta * Number(f.cantidad_mov), fecha: hoy() }, tk);
      if (f.tipo_mov === "entrada" && item.precio_costo > 0)
        await db.post("caja", { descripcion: `Compra - ${item.nombre} x${f.cantidad_mov}`, tipo: "egreso", categoria: "stock", monto: item.precio_costo * Number(f.cantidad_mov), fecha: hoy() }, tk);
      await load(); notify("Movimiento aplicado", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };
  const guardarConfig = async (f: any) => {
    try {
      await db.patch("config", data.cfg.id, {
        nombre_club: f.nombre_club, hora_inicio: Number(f.hora_inicio), hora_fin: Number(f.hora_fin),
        tarifa_base: Number(f.tarifa_base), tarifa_pico: Number(f.tarifa_pico),
        hora_pico_inicio: Number(f.hora_pico_inicio), hora_pico_fin: Number(f.hora_pico_fin),
      }, tk);
      await load(); notify("Configuración guardada", "ok");
    } catch (e: any) { notify(e.message, "error"); }
  };

  const value = useMemo<AdminCtx>(() => ({
    data, loading, refreshing, tk, user, notice, notify, load, logout,
    cById, pById, iById, precio,
    confirmarTurno, cancelarTurno, noShow, confirmarBulk, cancelarBulk, crearTurno,
    guardarCliente, eliminarCliente, guardarMovCaja, eliminarMovCaja, guardarStock, moverStock, guardarConfig,
  }), [data, loading, refreshing, notice]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* helper para portal público (sin token) */
export { db, api, apiHeaders, auth };
