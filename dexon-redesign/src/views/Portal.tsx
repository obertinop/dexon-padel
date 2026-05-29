/* ============================================================
   DEXON PADEL — Portal de reserva (cliente)
   ============================================================ */
import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Clock, CreditCard, Banknote, Building2,
  Tag, MapPin, MessageCircle, Sun, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/shared";
import {
  CLUB, DIAS, MESES, gs, weekFrom, TODAY, addDays, fmtFechaLarga, precioTurno, turnos,
} from "@/data";
import { cn } from "@/lib/utils";

const STEPS = ["Horario", "Tus datos", "Pago", "Listo"];
const PAGOS = [
  { id: "online", icon: CreditCard, t: "Tarjeta online", d: "Visa, Master, débito — vía Pagopar" },
  { id: "transfer", icon: Building2, t: "Transferencia", d: "Te pasamos los datos bancarios" },
  { id: "club", icon: Banknote, t: "Efectivo en el club", d: "Pagás al llegar (reserva sin seña)" },
];

export default function Portal({ go }: { go: (v: string) => void }) {
  const [step, setStep] = useState(0);
  const [weekOff, setWeekOff] = useState(0);
  const [fecha, setFecha] = useState(TODAY);
  const [cancha, setCancha] = useState<1 | 2>(1);
  const [hora, setHora] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [tel, setTel] = useState("");
  const [ref, setRef] = useState("");
  const [refOk, setRefOk] = useState(false);
  const [pago, setPago] = useState("online");

  const week = useMemo(() => weekFrom(addDays(TODAY, weekOff * 7)), [weekOff]);
  const horas = Array.from({ length: CLUB.cierre - CLUB.apertura }, (_, i) => CLUB.apertura + i);
  const ocupados = useMemo(
    () => new Set(turnos.filter((t) => t.fecha === fecha && t.cancha === cancha && t.estado !== "cancelado").map((t) => t.hora)),
    [fecha, cancha],
  );

  const precio = hora != null ? precioTurno(hora) : 0;
  const descuento = refOk ? Math.round(precio * 0.1) : 0;
  const total = precio - descuento;
  const sena = pago === "club" ? 0 : Math.round(total * 0.5);

  const aplicarRef = () => setRefOk(ref.trim().length >= 4);
  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => (step === 0 ? go("landing") : setStep((s) => s - 1));
  const canNext = step === 0 ? hora != null : step === 1 ? nombre.trim() && tel.trim().length >= 6 : true;

  return (
    <div className="min-h-screen bg-background">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <button onClick={() => go("landing")}><Logo /></button>
          <button onClick={() => go("cuenta")} className="text-sm font-500 text-muted-foreground hover:text-foreground">Mi cuenta</button>
        </div>
      </header>

      {/* stepper */}
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border text-sm font-700 transition-colors",
                  i < step ? "border-accent bg-accent text-white" :
                  i === step ? "border-primary bg-primary text-white" :
                  "border-border text-muted-foreground",
                )}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("hidden text-sm font-600 sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("mx-3 h-px flex-1 transition-colors", i < step ? "bg-accent" : "bg-border")} />}
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {/* ---------- STEP 1: horario ---------- */}
        {step === 0 && (
          <div className="rise space-y-6">
            <div>
              <h1 className="font-display text-2xl font-800">Elegí tu horario</h1>
              <p className="text-sm text-muted-foreground">Disponibilidad en tiempo real. Tocá un horario libre.</p>
            </div>

            {/* week nav */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={weekOff === 0} onClick={() => setWeekOff((w) => w - 1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-display text-sm font-700">
                {MESES[new Date(week[0] + "T00:00:00").getMonth()]} {new Date(week[0] + "T00:00:00").getFullYear()}
              </span>
              <Button variant="outline" size="sm" disabled={weekOff >= 4} onClick={() => setWeekOff((w) => w + 1)}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map((d, i) => {
                const dd = new Date(d + "T00:00:00");
                const sel = d === fecha;
                const past = d < TODAY;
                return (
                  <button key={d} disabled={past} onClick={() => { setFecha(d); setHora(null); }}
                    className={cn(
                      "flex flex-col items-center rounded-lg border py-2 transition-colors",
                      sel ? "border-primary bg-primary/10 text-foreground" : "border-border hover:bg-secondary",
                      past && "opacity-30",
                    )}>
                    <span className="text-[10px] uppercase text-muted-foreground">{DIAS[i]}</span>
                    <span className={cn("nums text-lg font-700", sel && "text-primary")}>{dd.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* cancha toggle */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
              {([1, 2] as const).map((c) => (
                <button key={c} onClick={() => { setCancha(c); setHora(null); }}
                  className={cn("flex-1 rounded-md py-2 text-sm font-600 transition-colors",
                    cancha === c ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}>
                  Cancha {c}
                </button>
              ))}
            </div>

            {/* weather hint */}
            <div className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-sm">
              <Sun className="h-4 w-4 text-amber-300" />
              <span className="text-muted-foreground">Pronóstico para {DIAS[(new Date(fecha + "T00:00:00").getDay() + 6) % 7]}: <span className="font-600 text-foreground">28°</span> · 10% lluvia</span>
            </div>

            {/* slots */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {horas.map((h) => {
                const taken = ocupados.has(h);
                const pico = h >= CLUB.picoIni && h < CLUB.picoFin;
                const sel = hora === h;
                return (
                  <button key={h} disabled={taken} onClick={() => setHora(h)}
                    className={cn(
                      "relative flex flex-col items-center rounded-lg border py-3 transition-all",
                      taken ? "cursor-not-allowed border-border bg-secondary/40 opacity-40" :
                      sel ? "border-primary bg-primary text-white shadow-lg shadow-primary/20" :
                      "border-border hover:border-primary/50 hover:bg-secondary",
                    )}>
                    <span className="nums text-base font-700">{h}:00</span>
                    <span className={cn("text-[10px]", sel ? "text-white/80" : "text-muted-foreground")}>
                      {taken ? "ocupado" : pico ? "pico" : "libre"}
                    </span>
                    {pico && !taken && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Pico {gs(CLUB.tarifaPico)}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-border" /> Estándar {gs(CLUB.tarifaBase)}</span>
            </div>
          </div>
        )}

        {/* ---------- STEP 2: datos ---------- */}
        {step === 1 && (
          <div className="rise space-y-6">
            <div>
              <h1 className="font-display text-2xl font-800">Tus datos</h1>
              <p className="text-sm text-muted-foreground">Para confirmarte la reserva por WhatsApp.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="n">Nombre y apellido</Label>
                <Input id="n" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="t">WhatsApp</Label>
                <Input id="t" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="09xx xxx xxx" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="r" className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Código de referido <span className="text-muted-foreground">(opcional)</span></Label>
                <div className="mt-1.5 flex gap-2">
                  <Input id="r" value={ref} onChange={(e) => { setRef(e.target.value.toUpperCase()); setRefOk(false); }} placeholder="Ej: MATEO" disabled={refOk} />
                  <Button variant="outline" onClick={aplicarRef} disabled={refOk || ref.trim().length < 4}>
                    {refOk ? <Check className="h-4 w-4 text-accent" /> : "Aplicar"}
                  </Button>
                </div>
                {refOk && <p className="mt-1.5 text-xs text-accent">✓ Código válido — 10% de descuento aplicado</p>}
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 3: pago ---------- */}
        {step === 2 && (
          <div className="rise space-y-6">
            <div>
              <h1 className="font-display text-2xl font-800">Forma de pago</h1>
              <p className="text-sm text-muted-foreground">Reservás con el 50% de seña. El resto, al llegar.</p>
            </div>
            <RadioGroup value={pago} onValueChange={setPago} className="space-y-2">
              {PAGOS.map((p) => (
                <Label key={p.id} htmlFor={p.id}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                    pago === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                  <RadioGroupItem value={p.id} id={p.id} />
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary"><p.icon className="h-5 w-5" /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-700">{p.t}</span>
                    <span className="block text-xs text-muted-foreground">{p.d}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* ---------- STEP 4: confirmación ---------- */}
        {step === 3 && (
          <div className="rise py-6 text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/15 text-accent">
              <Check className="h-10 w-10" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-900">¡Reserva confirmada!</h1>
            <p className="mt-2 text-muted-foreground">Te enviamos los detalles por WhatsApp a <span className="font-600 text-foreground">{tel}</span></p>
            <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-xl border border-border bg-card text-left">
              <div className="court-net bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] px-5 py-4">
                <div className="kicker !text-primary">Tu turno</div>
                <div className="mt-1 font-display text-xl font-800 capitalize">{fmtFechaLarga(fecha)}</div>
              </div>
              <div className="space-y-3 p-5 text-sm">
                {[
                  { icon: Clock, l: "Horario", v: `${hora}:00 — ${(hora ?? 0) + 1}:00` },
                  { icon: MapPin, l: "Cancha", v: `Cancha ${cancha} · ${CLUB.nombre}` },
                  { icon: Sparkles, l: "A nombre de", v: nombre || "—" },
                  { icon: CreditCard, l: "Seña pagada", v: sena ? gs(sena) : "Pagás en el club" },
                ].map((r) => (
                  <div key={r.l} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground"><r.icon className="h-4 w-4" /> {r.l}</span>
                    <span className="nums font-600">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
              <Button className="gap-2 font-600" onClick={() => go("cuenta")}>Ver en mi cuenta <ArrowRight className="h-4 w-4" /></Button>
              <Button variant="outline" className="gap-2" onClick={() => window.open(`https://wa.me/${CLUB.wa}`, "_blank")}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ---------- sticky footer (resumen + acciones) ---------- */}
      {step < 3 && (
        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
            <div>
              {hora != null ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    {DIAS[(new Date(fecha + "T00:00:00").getDay() + 6) % 7]} {new Date(fecha + "T00:00:00").getDate()} · {hora}:00 · Cancha {cancha}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="nums text-xl font-800">{gs(step === 2 ? sena || total : total)}</span>
                    {descuento > 0 && <span className="text-xs text-accent">−10%</span>}
                    {step === 2 && sena > 0 && <span className="text-xs text-muted-foreground">seña · total {gs(total)}</span>}
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Elegí un horario para continuar</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /></Button>
              <Button className="gap-2 font-700" disabled={!canNext} onClick={next}>
                {step === 2 ? "Confirmar reserva" : "Continuar"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
