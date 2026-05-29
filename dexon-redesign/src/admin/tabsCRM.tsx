/* ============================================================
   DEXON PADEL — Admin · CRM (Clientes, Abonados, Caja)
   ============================================================ */
import { useMemo, useState } from "react";
import {
  Search, Plus, Phone, MessageCircle, Star, ArrowUpRight, ArrowDownRight,
  TrendingUp, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, NivelBadge, Stat, Spark } from "@/components/shared";
import {
  clientes, abonos, caja, cById, gs, gsK, fmtFecha, DIAS_FULL, TODAY,
} from "@/data";
import { cn } from "@/lib/utils";

/* ---------------- CLIENTES ---------------- */
export function Clientes() {
  const [q, setQ] = useState("");
  const list = useMemo(
    () => clientes.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase()) || c.telefono.includes(q))
      .sort((a, b) => b.visitas - a.visitas),
    [q],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} registrados · {clientes.filter((c) => c.ultimaVisita >= "2026-05-01").length} activos este mes</p>
        </div>
        <Button className="gap-1.5 font-600"><Plus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono…" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="hidden grid-cols-[1fr_120px_90px_120px_80px] gap-3 border-b border-border bg-card px-4 py-2.5 text-[11px] font-700 uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Cliente</span><span>Nivel</span><span className="text-center">Visitas</span><span className="text-right">Saldo</span><span />
        </div>
        {list.map((c, i) => (
          <div key={c.id} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_120px_90px_120px_80px]", i % 2 && "bg-card/40")}>
            <div className="flex items-center gap-3">
              <Avatar name={c.nombre} size={38} />
              <div>
                <div className="font-600">{c.nombre}</div>
                <div className="text-xs text-muted-foreground">{c.telefono}</div>
              </div>
            </div>
            <div className="hidden sm:block"><NivelBadge nivel={c.nivel} /></div>
            <div className="hidden text-center sm:block"><span className="nums font-600">{c.visitas}</span></div>
            <div className="hidden text-right sm:block">
              {c.saldoFavor > 0 ? <span className="nums font-600 text-accent">{gs(c.saldoFavor)}</span> : <span className="text-muted-foreground">—</span>}
            </div>
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MessageCircle className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Phone className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- ABONADOS ---------------- */
export function Abonados() {
  const activos = abonos.filter((a) => a.estado === "activo");
  const ingresoMensual = activos.reduce((s, a) => s + a.precio, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Abonados</h1>
          <p className="text-sm text-muted-foreground">{activos.length} abonos activos · ingreso recurrente {gs(ingresoMensual)}/mes</p>
        </div>
        <Button className="gap-1.5 font-600"><Plus className="h-4 w-4" /> Nuevo abono</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Activos" value={activos.length} accent icon={<Star className="h-4 w-4" />} />
        <Stat label="Ingreso recurrente" value={gsK(ingresoMensual)} hint="/mes" trend={8} />
        <Stat label="Por vencer (7d)" value={abonos.filter((a) => a.estado === "activo" && a.vence <= "2026-06-05").length} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {abonos.map((a) => {
          const c = cById(a.clienteId);
          const venc = a.estado === "vencido";
          return (
            <div key={a.id} className={cn("rounded-lg border bg-card p-4", venc ? "border-destructive/30" : "border-border")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={c?.nombre || "?"} size={40} />
                  <div>
                    <div className="font-600">{c?.nombre}</div>
                    <div className="text-xs text-muted-foreground">{a.plan} · {gs(a.precio)}/mes</div>
                  </div>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-600",
                  a.estado === "activo" ? "border-accent/30 bg-accent/10 text-accent" :
                  venc ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border text-muted-foreground")}>
                  {a.estado === "activo" ? `vence ${fmtFecha(a.vence)}` : a.estado}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.slots.map((s, i) => (
                  <span key={i} className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-500">
                    {DIAS_FULL[(s.dia + 6) % 7].slice(0, 3)} {s.hora}:00
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">Editar horarios</Button>
                {venc ? <Button size="sm" className="flex-1 font-600">Renovar</Button>
                  : <Button variant="ghost" size="sm" className="text-muted-foreground"><MessageCircle className="h-4 w-4" /></Button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- CAJA ---------------- */
const CAT_COLOR: Record<string, string> = {
  reserva: "#E05B28", abono: "#5B8DEF", clase: "#2BA77A", stock: "#E0A93B", gasto: "#C2557A", sueldo: "#7B6BE0",
};
export function Caja() {
  const [filtro, setFiltro] = useState<"todos" | "ingreso" | "egreso">("todos");
  const ingresos = caja.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
  const egresos = caja.filter((m) => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0);
  const balance = ingresos - egresos;
  const hoyIng = caja.filter((m) => m.fecha === TODAY && m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);

  const porCat = useMemo(() => {
    const map: Record<string, number> = {};
    caja.filter((m) => m.tipo === "ingreso").forEach((m) => { map[m.categoria] = (map[m.categoria] || 0) + m.monto; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, []);
  const list = filtro === "todos" ? caja : caja.filter((m) => m.tipo === filtro);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-800">Caja</h1>
          <p className="text-sm text-muted-foreground">Balance del período</p>
        </div>
        <Button className="gap-1.5 font-600"><Plus className="h-4 w-4" /> Movimiento</Button>
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
        {/* breakdown by category */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs font-700 uppercase tracking-wide text-muted-foreground">Ingresos por categoría</div>
          <div className="mt-3 space-y-3">
            {porCat.map(([cat, monto]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{cat}</span>
                  <span className="nums font-600">{gs(monto)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full" style={{ width: `${(monto / ingresos) * 100}%`, background: CAT_COLOR[cat] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* movements */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="text-sm font-700">Movimientos</span>
            <div className="flex rounded-md border border-border p-0.5 text-xs">
              {(["todos", "ingreso", "egreso"] as const).map((f) => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={cn("rounded px-2.5 py-1 font-600 capitalize", filtro === f ? "bg-primary text-white" : "text-muted-foreground")}>{f}</button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border thin-scroll max-h-[320px] overflow-y-auto">
            {list.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="h-7 w-1 rounded-full" style={{ background: CAT_COLOR[m.categoria] }} />
                <div className="flex-1">
                  <div className="text-sm font-500">{m.desc}</div>
                  <div className="text-xs text-muted-foreground capitalize">{fmtFecha(m.fecha)} · {m.categoria}</div>
                </div>
                <span className={cn("nums font-700", m.tipo === "ingreso" ? "text-accent" : "text-destructive")}>
                  {m.tipo === "ingreso" ? "+" : "−"}{gs(m.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
