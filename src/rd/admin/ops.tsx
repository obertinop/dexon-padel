/* ============================================================
   Admin · Operación (Agenda, Hoy, Pendientes) — datos reales
   ============================================================ */
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, X, Clock, Sun, CheckCheck, AlertCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, EstadoBadge, Stat, Empty } from "@/components/shared";
import { gs, DIAS, MESES, TODAY, weekFrom, addDays, fmtFechaLarga } from "@/data";
import { useAdmin } from "@/rd/store";
import { cn } from "@/lib/ui-utils";

/* ---------------- AGENDA ---------------- */
export function Agenda() {
  const A = useAdmin();
  const { turnos, cfg } = A.data as any;
  const [weekOff, setWeekOff] = useState(0);
  const week = useMemo(() => weekFrom(addDays(TODAY, weekOff * 7)), [weekOff]);
  const horas = Array.from({ length: Math.max(1, cfg.hora_fin - cfg.hora_inicio) }, (_, i) => cfg.hora_inicio + i);
  const find = (f: string, h: number) => turnos.find((t: any) => t.fecha === f && t.hora === h && t.estado !== "cancelado");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Agenda</h1>
          <p className="text-sm text-muted-foreground">{MESES[new Date(week[0] + "T00:00:00").getMonth()]} {new Date(week[0] + "T00:00:00").getFullYear()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOff((w) => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOff(0)}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOff((w) => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="overflow-x-auto thin-scroll rounded-lg border border-border">
        <div className="min-w-[720px]">
          <div className="grid border-b border-border bg-card" style={{ gridTemplateColumns: "56px repeat(7,1fr)" }}>
            <div className="border-r border-border" />
            {week.map((d, i) => {
              const dd = new Date(d + "T00:00:00"); const isToday = d === TODAY;
              return (
                <div key={d} className={cn("border-r border-border py-2 text-center last:border-0", isToday && "bg-primary/10")}>
                  <div className="text-[10px] uppercase text-muted-foreground">{DIAS[i]}</div>
                  <div className={cn("nums text-lg font-700", isToday && "text-primary")}>{dd.getDate()}</div>
                </div>
              );
            })}
          </div>
          {horas.map((h) => (
            <div key={h} className="grid border-b border-border last:border-0" style={{ gridTemplateColumns: "56px repeat(7,1fr)" }}>
              <div className="flex items-start justify-end border-r border-border px-2 py-1.5"><span className="nums text-xs text-muted-foreground">{h}:00</span></div>
              {week.map((d) => {
                const t = find(d, h);
                const pico = h >= cfg.hora_pico_inicio && h < cfg.hora_pico_fin;
                return (
                  <div key={d} className={cn("border-r border-border p-1 last:border-0", pico && !t && "bg-primary/[0.03]")}>
                    {t ? (
                      <div className={cn("flex h-full min-h-[34px] items-center gap-1.5 rounded-md px-1.5 py-1 text-xs",
                        t.tipo === "abono" ? "bg-primary/15 text-primary" : t.tipo === "clase" ? "bg-accent/15 text-accent" :
                        t.estado === "pendiente_pago" ? "bg-amber-400/15 text-amber-200" : "bg-secondary text-foreground")}>
                        <Avatar name={A.cById(t.cliente_id)?.nombre || "?"} size={18} />
                        <span className="truncate font-600">{(A.cById(t.cliente_id)?.nombre || "?").split(" ")[0]}</span>
                      </div>
                    ) : (
                      <div className="grid h-full min-h-[34px] w-full place-items-center text-muted-foreground/20"><Plus className="h-3.5 w-3.5" /></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary/40" /> Abono</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-accent/40" /> Clase</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-400/40" /> Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-secondary" /> Ocasional</span>
      </div>
    </div>
  );
}

/* ---------------- HOY ---------------- */
export function Hoy() {
  const A = useAdmin();
  const { turnos, caja } = A.data as any;
  const hoy = turnos.filter((t: any) => t.fecha === TODAY && t.estado !== "cancelado").sort((a: any, b: any) => a.hora - b.hora);
  const ingresosHoy = caja.filter((m: any) => m.fecha === TODAY && m.tipo === "ingreso").reduce((s: number, m: any) => s + m.monto, 0);
  const nowH = new Date().getHours();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Hoy</h1>
          <p className="text-sm capitalize text-muted-foreground">{fmtFechaLarga(TODAY)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Turnos hoy" value={hoy.length} icon={<Clock className="h-4 w-4" />} />
        <Stat label="Confirmados" value={hoy.filter((t: any) => t.estado === "confirmado").length} accent icon={<Check className="h-4 w-4" />} />
        <Stat label="Por cobrar" value={hoy.filter((t: any) => t.estado !== "confirmado").length} icon={<AlertCircle className="h-4 w-4" />} />
        <Stat label="Ingresos hoy" value={gs(ingresosHoy)} />
      </div>
      <div className="space-y-2">
        {hoy.map((t: any) => {
          const c = A.cById(t.cliente_id); const pasado = t.hora < nowH;
          return (
            <div key={t.id} className={cn("flex items-center gap-3 rounded-lg border border-border bg-card p-3", pasado && "opacity-60")}>
              <div className="flex w-14 shrink-0 flex-col items-center">
                <span className="nums text-lg font-800">{t.hora}:00</span>
                <span className="text-[10px] capitalize text-muted-foreground">{t.tipo}</span>
              </div>
              <div className="h-10 w-px bg-border" />
              <Avatar name={c?.nombre || "?"} size={36} />
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-600">{c?.nombre || "—"}</span><EstadoBadge estado={t.estado} /></div>
                <div className="text-xs text-muted-foreground">{gs(t.precio)}{t.sena ? ` · seña ${gs(t.sena)}` : ""}</div>
              </div>
              <div className="flex gap-1.5">
                {c?.telefono && <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => window.open(`https://wa.me/${(c.telefono || "").replace(/\D/g, "")}`, "_blank")}><Phone className="h-4 w-4" /></Button>}
                {t.estado !== "confirmado" && <Button size="sm" className="gap-1 font-600" onClick={() => A.confirmarTurno(t)}><Check className="h-3.5 w-3.5" /> Cobrar</Button>}
                {t.estado !== "cancelado" && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => A.cancelarTurno(t)}><X className="h-4 w-4" /></Button>}
              </div>
            </div>
          );
        })}
        {!hoy.length && <Empty icon={<Sun className="h-8 w-8" />} title="Día libre" sub="No hay turnos cargados para hoy." />}
      </div>
    </div>
  );
}

/* ---------------- PENDIENTES ---------------- */
export function Pendientes() {
  const A = useAdmin();
  const { turnos } = A.data as any;
  const pend = turnos.filter((t: any) => t.estado === "pendiente_pago" || t.estado === "reservado").sort((a: any, b: any) => a.fecha.localeCompare(b.fecha) || a.hora - b.hora);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel = pend.length > 0 && sel.size === pend.length;
  const totalSel = pend.filter((t: any) => sel.has(t.id)).reduce((s: number, t: any) => s + (t.precio - (t.sena || 0)), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-800">Pendientes</h1>
          <p className="text-sm text-muted-foreground">{pend.length} turnos esperando confirmación o cobro</p>
        </div>
        {pend.length > 0 && <Button variant="outline" size="sm" onClick={() => setSel(allSel ? new Set() : new Set(pend.map((t: any) => t.id)))}>{allSel ? "Deseleccionar" : "Seleccionar todo"}</Button>}
      </div>
      <div className="space-y-2">
        {pend.map((t: any) => {
          const c = A.cById(t.cliente_id); const checked = sel.has(t.id);
          return (
            <div key={t.id} onClick={() => toggle(t.id)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors", checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50")}>
              <Checkbox checked={checked} className="pointer-events-none" />
              <Avatar name={c?.nombre || "?"} size={34} />
              <div className="flex-1">
                <div className="font-600">{c?.nombre || "—"}</div>
                <div className="text-xs text-muted-foreground">{DIAS[(new Date(t.fecha + "T00:00:00").getDay() + 6) % 7]} {new Date(t.fecha + "T00:00:00").getDate()} · {t.hora}:00 · {t.metodo_pago || t.tipo}</div>
              </div>
              <EstadoBadge estado={t.estado} />
              <div className="w-24 text-right">
                <div className="nums font-700">{gs(t.precio - (t.sena || 0))}</div>
                {t.sena > 0 && <div className="text-[11px] text-accent">seña {gs(t.sena)} ✓</div>}
              </div>
            </div>
          );
        })}
        {!pend.length && <Empty icon={<CheckCheck className="h-8 w-8" />} title="Todo al día" sub="No hay turnos pendientes." />}
      </div>
      {sel.size > 0 && (
        <div className="sticky bottom-4 z-10 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="pl-2 text-sm"><span className="font-700">{sel.size}</span> sel. · <span className="nums font-700 text-accent">{gs(totalSel)}</span></div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={() => { A.cancelarBulk([...sel]); setSel(new Set()); }}><X className="h-4 w-4" /> Cancelar</Button>
            <Button size="sm" className="gap-1.5 font-700" onClick={() => { A.confirmarBulk([...sel]); setSel(new Set()); }}><CheckCheck className="h-4 w-4" /> Confirmar y cobrar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
