/* ============================================================
   Admin · Stock, Stats, WhatsApp, Config — datos reales
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Plus, AlertTriangle, Package, Send, Save, TrendingUp, Trophy, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, Stat, Spark } from "@/components/shared";
import { gs, gsK, TODAY, addDays } from "@/data";
import { useAdmin } from "@/rd/store";
// @ts-ignore
import { apiHeaders } from "@/lib/api.js";
import { cn } from "@/lib/ui-utils";

/* ---------------- STOCK ---------------- */
export function Stock() {
  const A = useAdmin();
  const { stock } = A.data as any;
  const [open, setOpen] = useState(false);
  const [mov, setMov] = useState<any>(null);
  const [f, setF] = useState<any>({});
  const bajos = stock.filter((s: any) => s.cantidad <= s.minimo);
  const valor = stock.reduce((s: number, i: any) => s + i.cantidad * i.precio_costo, 0);

  const guardar = async () => { await A.guardarStock(f); setOpen(false); setF({}); };
  const aplicar = async () => { await A.moverStock({ stock_id: mov.id, tipo_mov: mov.tipo, cantidad_mov: mov.cant }); setMov(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-800">Stock</h1><p className="text-sm text-muted-foreground">{stock.length} productos · inventario {gs(valor)}</p></div>
        <Button className="gap-1.5 font-600" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Producto</Button>
      </div>
      {bajos.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
          <span><span className="font-700 text-amber-200">{bajos.length}</span> bajo el mínimo: {bajos.map((b: any) => b.nombre.split(" ")[0]).join(", ")}</span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stock.map((s: any) => {
          const bajo = s.cantidad <= s.minimo; const pct = Math.min(100, (s.cantidad / (s.minimo * 2 || 1)) * 100);
          return (
            <div key={s.id} className={cn("rounded-lg border bg-card p-4", bajo ? "border-amber-400/40" : "border-border")}>
              <div className="flex items-start justify-between">
                <div><div className="font-600">{s.nombre}</div><div className="text-xs text-muted-foreground">{s.categoria}</div></div>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-muted-foreground"><Package className="h-4 w-4" /></span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div><span className={cn("nums text-2xl font-800", bajo && "text-amber-300")}>{s.cantidad}</span><span className="ml-1 text-xs text-muted-foreground">u · mín {s.minimo}</span></div>
                <div className="text-right text-xs"><div className="nums font-600">{gs(s.precio_venta)}</div><div className="text-muted-foreground">venta</div></div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className={cn("h-full rounded-full", bajo ? "bg-amber-400" : "bg-accent")} style={{ width: `${pct}%` }} /></div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setMov({ id: s.id, nombre: s.nombre, tipo: "entrada", cant: 1 })}>Entrada</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setMov({ id: s.id, nombre: s.nombre, tipo: "salida", cant: 1 })}>Salida</Button>
              </div>
            </div>
          );
        })}
        {!stock.length && <div className="col-span-3 p-8 text-center text-sm text-muted-foreground">Sin productos</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input className="mt-1.5" value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoría</Label><Input className="mt-1.5" value={f.categoria || ""} onChange={(e) => setF({ ...f, categoria: e.target.value })} /></div>
              <div><Label>Cantidad</Label><Input className="mt-1.5" type="number" value={f.cantidad ?? ""} onChange={(e) => setF({ ...f, cantidad: e.target.value })} /></div>
              <div><Label>Mínimo</Label><Input className="mt-1.5" type="number" value={f.minimo ?? ""} onChange={(e) => setF({ ...f, minimo: e.target.value })} /></div>
              <div><Label>Precio venta</Label><Input className="mt-1.5" type="number" value={f.precio_venta ?? ""} onChange={(e) => setF({ ...f, precio_venta: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={guardar} className="font-600">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mov} onOpenChange={(o) => !o && setMov(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{mov?.tipo === "entrada" ? "Entrada" : "Salida"} · {mov?.nombre}</DialogTitle></DialogHeader>
          <div><Label>Cantidad</Label><Input className="mt-1.5" type="number" value={mov?.cant ?? 1} onChange={(e) => setMov({ ...mov, cant: e.target.value })} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setMov(null)}>Cancelar</Button><Button onClick={aplicar} className="font-600">Aplicar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- STATS ---------------- */
export function Stats() {
  const A = useAdmin();
  const { turnos, caja, abonos, clientes, cfg } = A.data as any;
  const ingresoMes = caja.filter((m: any) => m.tipo === "ingreso").reduce((s: number, m: any) => s + m.monto, 0);
  const horas = Array.from({ length: Math.max(1, cfg.hora_fin - cfg.hora_inicio) }, (_, i) => cfg.hora_inicio + i);
  const ocupacion = horas.map((h) => ({ h, n: turnos.filter((t: any) => t.hora === h && t.estado !== "cancelado").length }));
  const maxOcc = Math.max(...ocupacion.map((o) => o.n), 1);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(TODAY, -6 + i);
    return caja.filter((m: any) => m.fecha === d && m.tipo === "ingreso").reduce((s: number, m: any) => s + m.monto, 0);
  });
  const countByClient = useMemo(() => {
    const m: Record<number, number> = {};
    turnos.filter((t: any) => t.estado === "confirmado" || t.estado === "completado").forEach((t: any) => { m[t.cliente_id] = (m[t.cliente_id] || 0) + 1; });
    return m;
  }, [turnos]);
  const top = [...clientes].map((c: any) => ({ ...c, n: countByClient[c.id] || 0 })).sort((a, b) => b.n - a.n).slice(0, 5);
  const maxVis = top[0]?.n || 1;

  return (
    <div className="space-y-5">
      <div><h1 className="font-display text-2xl font-800">Estadísticas</h1><p className="text-sm text-muted-foreground">Resumen del club</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos (período)" value={gsK(ingresoMes)} accent />
        <Stat label="Turnos activos" value={turnos.filter((t: any) => t.estado !== "cancelado").length} />
        <Stat label="Confirmados" value={turnos.filter((t: any) => t.estado === "confirmado" || t.estado === "completado").length} />
        <Stat label="Abonados activos" value={abonos.filter((a: any) => a.estado === "activo").length} icon={<Trophy className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-700"><Clock className="h-4 w-4 text-primary" /> Ocupación por hora</div>
          <div className="mt-5 flex items-end gap-1.5" style={{ height: 160 }}>
            {ocupacion.map((o) => {
              const pico = o.h >= cfg.hora_pico_inicio && o.h < cfg.hora_pico_fin;
              return (
                <div key={o.h} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end"><div className={cn("w-full rounded-t", pico ? "bg-primary" : "bg-accent/60")} style={{ height: `${(o.n / maxOcc) * 100}%`, minHeight: o.n ? 6 : 2 }} title={`${o.n}`} /></div>
                  <span className="nums text-[9px] text-muted-foreground">{o.h}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-700"><TrendingUp className="h-4 w-4 text-accent" /> Ingresos · 7 días</div>
          <Spark data={last7.some((x) => x) ? last7 : [1, 1, 1, 1, 1, 1, 1]} stroke="hsl(var(--accent))" className="mt-6 !h-28" />
          <div className="mt-2 nums text-sm font-700">{gs(last7.reduce((a, b) => a + b, 0))} <span className="font-sans text-xs text-muted-foreground">total semana</span></div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-700"><Trophy className="h-4 w-4 text-amber-300" /> Clientes más activos</div>
        <div className="mt-4 space-y-3">
          {top.map((c: any, i: number) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="nums w-5 text-center text-sm font-700 text-muted-foreground">{i + 1}</span>
              <Avatar name={c.nombre} size={30} />
              <span className="w-32 truncate text-sm font-500">{c.nombre}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.n / maxVis) * 100}%` }} /></div>
              <span className="nums w-10 text-right text-sm font-600">{c.n}</span>
            </div>
          ))}
          {!top.length && <div className="text-sm text-muted-foreground">Sin datos</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- WHATSAPP ---------------- */
export function WhatsApp() {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [activa, setActiva] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    setLoading(true);
    fetch("/api/whatsapp/mensajes?limit=500").then((r) => r.json())
      .then((d) => { const arr = Array.isArray(d) ? d : []; setMsgs(arr); if (!activa && arr[0]) setActiva(arr[0].de); })
      .catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(cargar, []);

  const convs = useMemo(() => {
    const map: Record<string, any> = {};
    msgs.forEach((m) => { const k = m.de; if (!map[k] || (m.created_at > map[k].created_at)) map[k] = m; });
    return Object.values(map).sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [msgs]);
  const hilo = msgs.filter((m) => m.de === activa).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  const noLeidos = (de: string) => msgs.filter((m) => m.de === de && m.direccion === "entrante" && !m.leido).length;
  const totalNoLeidos = msgs.filter((m) => m.direccion === "entrante" && !m.leido).length;
  const nombreDe = (de: string) => msgs.find((m) => m.de === de)?.nombre || de;
  const hh = (iso: string) => iso ? new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" }) : "";

  const enviar = async () => {
    if (!draft.trim() || !activa) return;
    const txt = draft.trim(); setDraft("");
    try {
      await fetch("/api/whatsapp/responder", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ telefono: activa, mensaje: txt }) });
      setMsgs((m) => [...m, { id: Date.now(), de: activa, mensaje: txt, direccion: "saliente", created_at: new Date().toISOString(), leido: true }]);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-800">WhatsApp
            {totalNoLeidos > 0 && <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-xs font-600 text-[#25D366]">{totalNoLeidos} sin leer</span>}
          </h1>
          <p className="text-sm text-muted-foreground">Conversaciones con clientes</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={cargar}><RefreshCw className="h-4 w-4" /> Actualizar</Button>
      </div>
      <div className="grid gap-0 overflow-hidden rounded-lg border border-border md:grid-cols-[280px_1fr]" style={{ minHeight: 460 }}>
        <div className="border-b border-border md:border-b-0 md:border-r">
          {loading && <div className="p-4 text-sm text-muted-foreground">Cargando…</div>}
          {!loading && !convs.length && <div className="p-4 text-sm text-muted-foreground">Sin conversaciones</div>}
          {convs.map((last: any) => {
            const n = noLeidos(last.de);
            return (
              <button key={last.de} onClick={() => setActiva(last.de)} className={cn("flex w-full items-center gap-3 border-b border-border/60 p-3 text-left transition-colors", activa === last.de ? "bg-secondary" : "hover:bg-secondary/50")}>
                <Avatar name={nombreDe(last.de)} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between"><span className="truncate text-sm font-600">{nombreDe(last.de)}</span><span className="text-[10px] text-muted-foreground">{hh(last.created_at)}</span></div>
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-muted-foreground">{last.mensaje}</span>{n > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#25D366] px-1 text-[10px] font-700 text-white">{n}</span>}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col">
          {activa ? (
            <>
              <div className="flex items-center gap-3 border-b border-border p-3"><Avatar name={nombreDe(activa)} size={36} /><div><div className="text-sm font-600">{nombreDe(activa)}</div><div className="text-xs text-muted-foreground">{activa}</div></div></div>
              <div className="court-net flex-1 space-y-2 overflow-y-auto p-4 thin-scroll" style={{ maxHeight: 360 }}>
                {hilo.map((m) => (
                  <div key={m.id} className={cn("flex", m.direccion === "entrante" ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[78%] rounded-lg px-3 py-2 text-sm", m.direccion === "entrante" ? "bg-card" : "bg-[#25D366]/20")}>
                      <p className="whitespace-pre-wrap">{m.mensaje}</p>
                      <div className="mt-0.5 text-right text-[10px] text-muted-foreground">{hh(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()} placeholder="Escribí un mensaje…" className="flex-1" />
                <Button size="icon" className="shrink-0 bg-[#25D366] hover:bg-[#1eb858]" onClick={enviar}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Elegí una conversación</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- CONFIG ---------------- */
export function Config() {
  const A = useAdmin();
  const { cfg, instructores, planes } = A.data as any;
  const [f, setF] = useState<any>(cfg);
  useEffect(() => { setF(cfg); }, [cfg]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-800">Configuración</h1><p className="text-sm text-muted-foreground">Ajustes del club y tarifas</p></div>
        <Button className="gap-1.5 font-700" onClick={() => A.guardarConfig(f)}><Save className="h-4 w-4" /> Guardar</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display font-700">Datos del club</h2>
          <div className="mt-4 space-y-3">
            <div><Label className="text-xs">Nombre</Label><Input className="mt-1" value={f.nombre_club || ""} onChange={set("nombre_club")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Apertura</Label><Input className="mt-1" type="number" value={f.hora_inicio ?? ""} onChange={set("hora_inicio")} /></div>
              <div><Label className="text-xs">Cierre</Label><Input className="mt-1" type="number" value={f.hora_fin ?? ""} onChange={set("hora_fin")} /></div>
            </div>
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display font-700">Tarifas</h2>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Base</Label><Input className="mt-1" type="number" value={f.tarifa_base ?? ""} onChange={set("tarifa_base")} /></div>
              <div><Label className="text-xs">Pico</Label><Input className="mt-1" type="number" value={f.tarifa_pico ?? ""} onChange={set("tarifa_pico")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Pico desde</Label><Input className="mt-1" type="number" value={f.hora_pico_inicio ?? ""} onChange={set("hora_pico_inicio")} /></div>
              <div><Label className="text-xs">Pico hasta</Label><Input className="mt-1" type="number" value={f.hora_pico_fin ?? ""} onChange={set("hora_pico_fin")} /></div>
            </div>
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display font-700">Instructores</h2>
          <div className="mt-3 space-y-2">
            {instructores.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span className="font-500">{i.nombre}</span><span className="nums text-muted-foreground">{gs(i.tarifa_clase)}/clase</span></div>
            ))}
            {!instructores.length && <div className="text-sm text-muted-foreground">Sin instructores</div>}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display font-700">Planes de abono</h2>
          <div className="mt-3 space-y-2">
            {planes.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span className="font-500">{p.nombre} · {p.horas_semana}x</span><span className="nums text-muted-foreground">{gs(p.precio)}/mes</span></div>
            ))}
            {!planes.length && <div className="text-sm text-muted-foreground">Sin planes</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
