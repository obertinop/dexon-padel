/* ============================================================
   DEXON PADEL — Admin · Inventario & gestión
   (Stock, Stats, WhatsApp, Config)
   ============================================================ */
import { useState } from "react";
import {
  Plus, AlertTriangle, Package, Send, Save,
  TrendingUp, Trophy, Clock, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, Stat, Spark } from "@/components/shared";
import {
  stock, clientes, waMsgs, turnos, caja, gs, gsK, CLUB, cById,
} from "@/data";
import { cn } from "@/lib/utils";

/* ---------------- STOCK ---------------- */
export function Stock() {
  const bajos = stock.filter((s) => s.cantidad <= s.minimo);
  const valor = stock.reduce((s, i) => s + i.cantidad * i.costo, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Stock</h1>
          <p className="text-sm text-muted-foreground">{stock.length} productos · valor inventario {gs(valor)}</p>
        </div>
        <Button className="gap-1.5 font-600"><Plus className="h-4 w-4" /> Producto</Button>
      </div>

      {bajos.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
          <span><span className="font-700 text-amber-200">{bajos.length} productos</span> bajo el mínimo: {bajos.map((b) => b.nombre.split(" ")[0]).join(", ")}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stock.map((s) => {
          const bajo = s.cantidad <= s.minimo;
          const pct = Math.min(100, (s.cantidad / (s.minimo * 2 || 1)) * 100);
          return (
            <div key={s.id} className={cn("rounded-lg border bg-card p-4", bajo ? "border-amber-400/40" : "border-border")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-600">{s.nombre}</div>
                  <div className="text-xs text-muted-foreground">{s.categoria}</div>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-muted-foreground"><Package className="h-4 w-4" /></span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div><span className={cn("nums text-2xl font-800", bajo && "text-amber-300")}>{s.cantidad}</span><span className="ml-1 text-xs text-muted-foreground">u · mín {s.minimo}</span></div>
                <div className="text-right text-xs"><div className="nums font-600">{gs(s.venta)}</div><div className="text-muted-foreground">venta</div></div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full", bajo ? "bg-amber-400" : "bg-accent")} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">Entrada</Button>
                <Button variant="outline" size="sm" className="flex-1">Salida</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- STATS ---------------- */
export function Stats() {
  const ingresoMes = caja.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
  const ocupacion = Array.from({ length: 14 }, (_, i) => {
    const h = 10 + i;
    return { h, n: turnos.filter((t) => t.hora === h && t.estado !== "cancelado").length };
  });
  const maxOcc = Math.max(...ocupacion.map((o) => o.n), 1);
  const top = [...clientes].sort((a, b) => b.visitas - a.visitas).slice(0, 5);
  const maxVis = top[0]?.visitas || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-800">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">Mayo 2026 · resumen del club</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos del mes" value={gsK(ingresoMes)} trend={14} hint="vs abril" accent />
        <Stat label="Ocupación" value="72%" trend={6} hint="promedio" />
        <Stat label="Turnos jugados" value={turnos.filter((t) => t.estado === "completado" || t.estado === "confirmado").length} trend={9} />
        <Stat label="Nuevos clientes" value="14" trend={21} hint="este mes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* occupancy by hour */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-700"><Clock className="h-4 w-4 text-primary" /> Ocupación por hora</div>
          <div className="mt-5 flex items-end gap-1.5" style={{ height: 160 }}>
            {ocupacion.map((o) => {
              const pico = o.h >= CLUB.picoIni && o.h < CLUB.picoFin;
              return (
                <div key={o.h} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div className={cn("w-full rounded-t transition-all", pico ? "bg-primary" : "bg-accent/60")}
                      style={{ height: `${(o.n / maxOcc) * 100}%`, minHeight: o.n ? 6 : 2 }} title={`${o.n} turnos`} />
                  </div>
                  <span className="nums text-[9px] text-muted-foreground">{o.h}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary" /> Horario pico</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-accent/60" /> Estándar</span>
          </div>
        </div>

        {/* revenue trend */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-700"><TrendingUp className="h-4 w-4 text-accent" /> Ingresos · últimos 7 días</div>
          <Spark data={[820, 940, 760, 1180, 1020, 1540, 1320]} stroke="hsl(var(--accent))" className="mt-6 !h-28" />
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
        </div>
      </div>

      {/* top clients */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-700"><Trophy className="h-4 w-4 text-amber-300" /> Clientes más activos</div>
        <div className="mt-4 space-y-3">
          {top.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="nums w-5 text-center text-sm font-700 text-muted-foreground">{i + 1}</span>
              <Avatar name={c.nombre} size={30} />
              <span className="w-32 truncate text-sm font-500">{c.nombre}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(c.visitas / maxVis) * 100}%` }} />
              </div>
              <span className="nums w-10 text-right text-sm font-600">{c.visitas}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- WHATSAPP ---------------- */
export function WhatsApp() {
  const conversaciones = [...new Set(waMsgs.map((m) => m.clienteId))];
  const [activa, setActiva] = useState(conversaciones[0]);
  const [draft, setDraft] = useState("");
  const hilo = waMsgs.filter((m) => m.clienteId === activa);
  const noLeidos = (cid: number) => waMsgs.filter((m) => m.clienteId === cid && m.entrante && !m.leido).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-800 flex items-center gap-2">WhatsApp
          <span className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-xs font-600 text-[#25D366]">{waMsgs.filter((m) => m.entrante && !m.leido).length} sin leer</span>
        </h1>
        <p className="text-sm text-muted-foreground">Conversaciones con clientes · mensajería integrada</p>
      </div>

      <div className="grid gap-4 overflow-hidden rounded-lg border border-border md:grid-cols-[280px_1fr]" style={{ minHeight: 460 }}>
        {/* list */}
        <div className="border-b border-border md:border-b-0 md:border-r">
          {conversaciones.map((cid) => {
            const c = cById(cid);
            const last = waMsgs.filter((m) => m.clienteId === cid).at(-1);
            const n = noLeidos(cid);
            return (
              <button key={cid} onClick={() => setActiva(cid)}
                className={cn("flex w-full items-center gap-3 border-b border-border/60 p-3 text-left transition-colors", activa === cid ? "bg-secondary" : "hover:bg-secondary/50")}>
                <Avatar name={c?.nombre || "?"} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-600">{c?.nombre}</span>
                    <span className="text-[10px] text-muted-foreground">{last?.hora}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{last?.texto}</span>
                    {n > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#25D366] px-1 text-[10px] font-700 text-white">{n}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* thread */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border p-3">
            <Avatar name={cById(activa)?.nombre || "?"} size={36} />
            <div>
              <div className="text-sm font-600">{cById(activa)?.nombre}</div>
              <div className="text-xs text-muted-foreground">{cById(activa)?.telefono}</div>
            </div>
          </div>
          <div className="court-net flex-1 space-y-2 overflow-y-auto p-4 thin-scroll">
            {hilo.map((m) => (
              <div key={m.id} className={cn("flex", m.entrante ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[78%] rounded-lg px-3 py-2 text-sm", m.entrante ? "bg-card" : "bg-[#25D366]/20")}>
                  <p>{m.texto}</p>
                  <div className="mt-0.5 text-right text-[10px] text-muted-foreground">{m.hora}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribí un mensaje…" className="flex-1" />
            <Button size="icon" className="shrink-0 bg-[#25D366] hover:bg-[#1eb858]" onClick={() => setDraft("")}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- CONFIG ---------------- */
export function Config() {
  const [descMJ, setDescMJ] = useState(true);
  const Field = ({ label, defaultValue, suffix }: { label: string; defaultValue: string | number; suffix?: string }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative mt-1">
        <Input defaultValue={defaultValue} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Configuración</h1>
          <p className="text-sm text-muted-foreground">Ajustes del club, tarifas y promociones</p>
        </div>
        <Button className="gap-1.5 font-700"><Save className="h-4 w-4" /> Guardar cambios</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display font-700">Datos del club</h2>
          <div className="mt-4 space-y-3">
            <Field label="Nombre del club" defaultValue={CLUB.nombre} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apertura" defaultValue={CLUB.apertura} suffix="hs" />
              <Field label="Cierre" defaultValue={CLUB.cierre} suffix="hs" />
            </div>
            <Field label="Teléfono" defaultValue={CLUB.tel} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display font-700">Tarifas</h2>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarifa base" defaultValue={CLUB.tarifaBase} suffix="₲" />
              <Field label="Tarifa pico" defaultValue={CLUB.tarifaPico} suffix="₲" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pico desde" defaultValue={CLUB.picoIni} suffix="hs" />
              <Field label="Pico hasta" defaultValue={CLUB.picoFin} suffix="hs" />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 md:col-span-2">
          <h2 className="flex items-center gap-2 font-display font-700"><Percent className="h-4 w-4 text-primary" /> Promociones</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-600">Descuento martes y jueves</div>
                <div className="text-xs text-muted-foreground">20% off en días de baja demanda</div>
              </div>
              <Switch checked={descMJ} onCheckedChange={setDescMJ} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-600">Programa de referidos</div>
                <div className="text-xs text-muted-foreground">10% off para nuevos por código de referido</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
