/* ============================================================
   DEXON PADEL — shared building blocks
   ============================================================ */
import { cn } from "@/lib/utils";
import { initials, tint, type EstadoTurno, type Nivel, estadoLabel } from "@/data";
import type { ReactNode } from "react";

/* ---------- Brand logo ---------- */
export function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display font-900 tracking-tight", className)}>
      {mark && (
        <span className="relative grid h-8 w-8 place-items-center bg-primary cut-tr">
          <span className="absolute inset-0 court-net opacity-60" />
          <svg viewBox="0 0 24 24" className="relative h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18M3 12h18" />
          </svg>
        </span>
      )}
      <span className="leading-none">
        DEXON<span className="text-primary">.</span>
      </span>
    </span>
  );
}

/* ---------- Section header (editorial, left-aligned) ---------- */
export function SectionHead({
  kicker, title, sub, align = "left", className,
}: { kicker?: string; title: ReactNode; sub?: string; align?: "left" | "center"; className?: string }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {kicker && <div className="kicker mb-3">{kicker}</div>}
      <h2 className="font-display text-3xl font-800 leading-[1.05] tracking-tight sm:text-4xl md:text-[2.75rem]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ---------- KPI / metric card ---------- */
export function Stat({
  label, value, hint, trend, icon, accent,
}: { label: string; value: ReactNode; hint?: string; trend?: number; icon?: ReactNode; accent?: boolean }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border bg-card p-4",
      accent && "border-primary/40",
    )}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-600 uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="mt-2 nums text-2xl font-700 leading-none">{value}</div>
      {(hint || trend !== undefined) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span className={cn("nums font-600", trend >= 0 ? "text-accent" : "text-destructive")}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const bg = tint(name);
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-display font-700 text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Status badge ---------- */
const ESTADO_STYLE: Record<EstadoTurno, string> = {
  confirmado: "bg-accent/15 text-accent border-accent/30",
  reservado: "bg-primary/15 text-primary border-primary/30",
  pendiente_pago: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  cancelado: "bg-muted text-muted-foreground border-border",
  no_show: "bg-destructive/15 text-destructive border-destructive/30",
  completado: "bg-sky-400/15 text-sky-300 border-sky-400/30",
};
export function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-600", ESTADO_STYLE[estado])}>
      {estado === "confirmado" && <span className="h-1.5 w-1.5 rounded-full bg-current live-dot" />}
      {estadoLabel[estado]}
    </span>
  );
}

const NIVEL_STYLE: Record<Nivel, string> = {
  principiante: "bg-sky-400/15 text-sky-300",
  intermedio: "bg-accent/15 text-accent",
  avanzado: "bg-primary/15 text-primary",
  competitivo: "bg-amber-400/15 text-amber-300",
};
export function NivelBadge({ nivel }: { nivel: Nivel }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-700 uppercase tracking-wide", NIVEL_STYLE[nivel])}>
      {nivel}
    </span>
  );
}

/* ---------- empty state ---------- */
export function Empty({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="grid place-items-center gap-2 rounded-lg border border-dashed py-14 text-center">
      <div className="text-muted-foreground/60">{icon}</div>
      <div className="font-display font-700">{title}</div>
      {sub && <div className="max-w-xs text-sm text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ---------- mini sparkline (no chart lib) ---------- */
export function Spark({ data, className, stroke = "hsl(var(--primary))" }: { data: number[]; className?: string; stroke?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${30 - ((v - min) / range) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-8 w-full", className)}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
