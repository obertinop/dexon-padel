/* ============================================================
   Admin · CRM (Clientes, Abonados, Caja) — datos reales
   ============================================================ */
import { useMemo, useState } from "react";
import { Search, Plus, Phone, MessageCircle, Star, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, NivelBadge, Stat, Spark } from "@/components/shared";
import { gs, gsK, fmtFecha, DIAS_FULL, TODAY, NIVELES } from "@/data";
import { useAdmin } from "@/rd/store";
import { cn } from "@/lib/ui-utils";

const wa = (tel: string) => window.open(`https://wa.me/${(tel || "").replace(/\D/g, "")}`, "_blank");

/* ---------------- CLIENTES ---------------- */
export function Clientes() {
  const A = useAdmin();
  const { clientes, turnos, abonos } = A.data as any;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ nivel: "intermedio" });

  const count = useMemo(() => {
    const m: Record<number, number> = {};
    turnos.forEach((t: any) => { m[t.cliente_id] = (m[t.cliente_id] || 0) + 1; });
    return m;
  }, [turnos]);
  const list = useMemo(() =>
    clientes.filter((c: any) => c.nombre?.toLowerCase().includes(q.toLowerCase()) || (c.telefono || "").includes(q))
      .sort((a: any, b: any) => (count[b.id] || 0) - (count[a.id] || 0)),
  [clientes, q, count]);
  const tieneAbono = (id: number) => abonos.some((a: any) => a.cliente_id === id && a.estado === "activo");

  const guardar = async () => { await A.guardarCliente(f); setOpen(false); setF({ nivel: "intermedio" }); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} registrados</p>
        </div>
        <Button className="gap-1.5 font-600" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono…" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="hidden grid-cols-[1fr_120px_90px_120px_80px] gap-3 border-b border-border bg-card px-4 py-2.5 text-[11px] font-700 uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Cliente</span><span>Nivel</span><span className="text-center">Turnos</span><span className="text-right">Saldo</span><span />
        </div>
        {list.map((c: any, i: number) => (
          <div key={c.id} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_120px_90px_120px_80px]", i % 2 && "bg-card/40")}>
            <div className="flex items-center gap-3">
              <Avatar name={c.nombre} size={38} />
              <div>
                <div className="flex items-center gap-2 font-600">{c.nombre} {tieneAbono(c.id) && <Star className="h-3.5 w-3.5 text-primary" />}</div>
                <div className="text-xs text-muted-foreground">{c.telefono || "sin teléfono"}</div>
              </div>
            </div>
            <div className="hidden sm:block">{c.nivel && <NivelBadge nivel={c.nivel} />}</div>
            <div className="hidden text-center sm:block"><span className="nums font-600">{count[c.id] || 0}</span></div>
            <div className="hidden text-right sm:block">{c.saldo_favor > 0 ? <span className="nums font-600 text-accent">{gs(c.saldo_favor)}</span> : <span className="text-muted-foreground">—</span>}</div>
            <div className="flex justify-end gap-1">
              {c.telefono && <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => wa(c.telefono)}><MessageCircle className="h-4 w-4" /></Button>}
            </div>
          </div>
        ))}
        {!list.length && <div className="p-8 text-center text-sm text-muted-foreground">Sin resultados</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input className="mt-1.5" value={f.nombre || ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre y apellido" /></div>
            <div><Label>Teléfono</Label><Input className="mt-1.5" value={f.telefono || ""} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="09xx xxx xxx" /></div>
            <div><Label>Nivel</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {NIVELES.map((n) => (
                  <button key={n} onClick={() => setF({ ...f, nivel: n })} className={cn("rounded-md border px-2.5 py-1 text-xs font-600 capitalize", f.nivel === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{n}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={guardar} className="font-600">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- ABONADOS ---------------- */
export function Abonados() {
  const A = useAdmin();
  const { abonos, abono_turnos } = A.data as any;
  const activos = abonos.filter((a: any) => a.estado === "activo");
  const ingresoMensual = activos.reduce((s: number, a: any) => s + (a.precio_acordado || 0), 0);
  const slotsDe = (id: number) => abono_turnos.filter((s: any) => s.abono_id === id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Abonados</h1>
          <p className="text-sm text-muted-foreground">{activos.length} activos · {gs(ingresoMensual)}/mes recurrente</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Activos" value={activos.length} accent icon={<Star className="h-4 w-4" />} />
        <Stat label="Recurrente" value={gsK(ingresoMensual)} hint="/mes" />
        <Stat label="Por vencer" value={abonos.filter((a: any) => a.estado === "activo" && a.fecha_vencimiento <= addDays7()).length} icon={<TrendingUp className="h-4 w-4" />} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {abonos.map((a: any) => {
          const c = A.cById(a.cliente_id); const plan = A.pById(a.plan_id); const venc = a.estado === "vencido";
          return (
            <div key={a.id} className={cn("rounded-lg border bg-card p-4", venc ? "border-destructive/30" : "border-border")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={c?.nombre || "?"} size={40} />
                  <div>
                    <div className="font-600">{c?.nombre || "—"}</div>
                    <div className="text-xs text-muted-foreground">{plan?.nombre || "Plan"} · {gs(a.precio_acordado)}/mes</div>
                  </div>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-600",
                  a.estado === "activo" ? "border-accent/30 bg-accent/10 text-accent" : venc ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border text-muted-foreground")}>
                  {a.estado === "activo" ? `vence ${fmtFecha(a.fecha_vencimiento)}` : a.estado}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {slotsDe(a.id).map((s: any, i: number) => (
                  <span key={i} className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-500">{DIAS_FULL[(s.dia + 6) % 7].slice(0, 3)} {s.hora}:00</span>
                ))}
                {!slotsDe(a.id).length && <span className="text-[11px] text-muted-foreground">Sin horarios fijos</span>}
              </div>
            </div>
          );
        })}
        {!abonos.length && <div className="col-span-2 p-8 text-center text-sm text-muted-foreground">Sin abonos cargados</div>}
      </div>
    </div>
  );
}
function addDays7() { const d = new Date(TODAY + "T00:00:00"); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }

/* ---------------- CAJA ---------------- */
const CAT_COLOR: Record<string, string> = { reserva: "#E05B28", abono: "#5B8DEF", clase: "#2BA77A", stock: "#E0A93B", gasto: "#C2557A", sueldo: "#7B6BE0" };
export function Caja() {
  const A = useAdmin();
  const { caja } = A.data as any;
  const [filtro, setFiltro] = useState<"todos" | "ingreso" | "egreso">("todos");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ tipo: "egreso", categoria: "gasto" });

  const ingresos = caja.filter((m: any) => m.tipo === "ingreso").reduce((s: number, m: any) => s + m.monto, 0);
  const egresos = caja.filter((m: any) => m.tipo === "egreso").reduce((s: number, m: any) => s + m.monto, 0);
  const balance = ingresos - egresos;
  const hoyIng = caja.filter((m: any) => m.fecha === TODAY && m.tipo === "ingreso").reduce((s: number, m: any) => s + m.monto, 0);
  const porCat = useMemo(() => {
    const map: Record<string, number> = {};
    caja.filter((m: any) => m.tipo === "ingreso").forEach((m: any) => { map[m.categoria] = (map[m.categoria] || 0) + m.monto; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [caja]);
  const list = filtro === "todos" ? caja : caja.filter((m: any) => m.tipo === filtro);
  const guardar = async () => { await A.guardarMovCaja(f); setOpen(false); setF({ tipo: "egreso", categoria: "gasto" }); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-800">Caja</h1><p className="text-sm text-muted-foreground">Balance del período</p></div>
        <Button className="gap-1.5 font-600" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Movimiento</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-accent/30 bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-muted-foreground"><ArrowUpRight className="h-3.5 w-3.5 text-accent" /> Ingresos</div>
          <div className="mt-1 nums text-2xl font-800 text-accent">{gs(ingresos)}</div>
          <Spark data={[3, 5, 4, 7, 6, 9, 8]} stroke="hsl(var(--accent))" className="mt-2" />
        </div>
        <div className="rounded-lg border border-destructive/30 bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-muted-foreground"><ArrowDownRight className="h-3.5 w-3.5 text-destructive" /> Egresos</div>
          <div className="mt-1 nums text-2xl font-800 text-destructive">{gs(egresos)}</div>
          <Spark data={[2, 3, 2, 4, 3, 2, 5]} stroke="hsl(var(--destructive))" className="mt-2" />
        </div>
        <div className="rounded-lg border border-primary/40 bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-muted-foreground"><Wallet className="h-3.5 w-3.5 text-primary" /> Balance</div>
          <div className={cn("mt-1 nums text-2xl font-800", balance >= 0 ? "text-foreground" : "text-destructive")}>{gs(balance)}</div>
          <div className="mt-2 text-xs text-muted-foreground">Hoy: <span className="nums font-600 text-accent">+{gs(hoyIng)}</span></div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-700 uppercase tracking-wide text-muted-foreground">Ingresos por categoría</div>
          <div className="mt-3 space-y-3">
            {porCat.map(([cat, monto]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm"><span className="capitalize">{cat}</span><span className="nums font-600">{gs(monto)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full" style={{ width: `${(monto / (ingresos || 1)) * 100}%`, background: CAT_COLOR[cat] || "#888" }} /></div>
              </div>
            ))}
            {!porCat.length && <div className="text-sm text-muted-foreground">Sin ingresos</div>}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="text-sm font-700">Movimientos</span>
            <div className="flex rounded-md border border-border p-0.5 text-xs">
              {(["todos", "ingreso", "egreso"] as const).map((ff) => (
                <button key={ff} onClick={() => setFiltro(ff)} className={cn("rounded px-2.5 py-1 font-600 capitalize", filtro === ff ? "bg-primary text-white" : "text-muted-foreground")}>{ff}</button>
              ))}
            </div>
          </div>
          <div className="thin-scroll max-h-[340px] divide-y divide-border overflow-y-auto">
            {list.map((m: any) => (
              <div key={m.id} className="group flex items-center gap-3 px-3 py-2.5">
                <span className="h-7 w-1 rounded-full" style={{ background: CAT_COLOR[m.categoria] || "#888" }} />
                <div className="flex-1"><div className="text-sm font-500">{m.descripcion}</div><div className="text-xs capitalize text-muted-foreground">{fmtFecha(m.fecha)} · {m.categoria}</div></div>
                <span className={cn("nums font-700", m.tipo === "ingreso" ? "text-accent" : "text-destructive")}>{m.tipo === "ingreso" ? "+" : "−"}{gs(m.monto)}</span>
                <button onClick={() => A.eliminarMovCaja(m.id)} className="text-muted-foreground/0 transition-colors group-hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {!list.length && <div className="p-6 text-center text-sm text-muted-foreground">Sin movimientos</div>}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["ingreso", "egreso"] as const).map((tp) => (
                <button key={tp} onClick={() => setF({ ...f, tipo: tp })} className={cn("flex-1 rounded-md border py-2 text-sm font-600 capitalize", f.tipo === tp ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{tp}</button>
              ))}
            </div>
            <div><Label>Descripción</Label><Input className="mt-1.5" value={f.descripcion || ""} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monto</Label><Input className="mt-1.5" type="number" value={f.monto || ""} onChange={(e) => setF({ ...f, monto: e.target.value })} /></div>
              <div><Label>Categoría</Label><Input className="mt-1.5" value={f.categoria || ""} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="gasto / sueldo…" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={guardar} className="font-600">Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
