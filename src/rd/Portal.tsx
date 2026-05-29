/* ============================================================
   DEXON PADEL — Portal de reserva (público, Supabase real)
   Lee config/turnos (anon) y crea la reserva vía /api/reservar.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, Clock, CreditCard, Building2, Banknote,
  Tag, MapPin, MessageCircle, Loader2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared";
import { CLUB, DIAS, MESES, gs, weekFrom, TODAY, addDays, fmtFechaLarga, precioTurno } from "@/data";
import { db, apiHeaders } from "@/rd/store";
import { cn } from "@/lib/ui-utils";

const STEPS = ["Horario", "Tus datos", "Pago", "Listo"];
const PAGOS = [
  { id: "transfer", icon: Building2, t: "Transferencia", d: "Te pasamos los datos y confirmás por WhatsApp" },
  { id: "club", icon: Banknote, t: "Efectivo en el club", d: "Reservás y pagás al llegar" },
];

export default function Portal({ go }: { go: (v: string) => void }) {
  const [cfg, setCfg] = useState<any>(null);
  const [turnos, setTurnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [weekOff, setWeekOff] = useState(0);
  const [fecha, setFecha] = useState(TODAY);
  const [sel, setSel] = useState<number[]>([]);
  const [nombre, setNombre] = useState("");
  const [tel, setTel] = useState("");
  const [ref, setRef] = useState("");
  const [pago, setPago] = useState("transfer");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([db.get("config", "limit=1"), db.get("turnos", "order=fecha.asc,hora.asc")])
      .then(([cf, tu]: any) => { setCfg(cf?.[0] || {}); setTurnos(tu || []); })
      .catch(() => setCfg({}))
      .finally(() => setLoading(false));
  }, []);

  const c = cfg || {};
  const apertura = c.hora_inicio ?? CLUB.apertura;
  const cierre = c.hora_fin ?? CLUB.cierre;
  const week = useMemo(() => weekFrom(addDays(TODAY, weekOff * 7)), [weekOff]);
  const horas = Array.from({ length: Math.max(1, cierre - apertura) }, (_, i) => apertura + i);
  const ocupados = useMemo(
    () => new Set(turnos.filter((t) => t.fecha === fecha && t.estado !== "cancelado").map((t) => t.hora)),
    [turnos, fecha],
  );

  const total = sel.reduce((s, h) => s + precioTurno(h, c), 0);
  const toggleSlot = (h: number) => setSel((s) => (s.includes(h) ? s.filter((x) => x !== h) : [...s, h].sort((a, b) => a - b)));
  const canNext = step === 0 ? sel.length > 0 : step === 1 ? nombre.trim() && tel.trim().length >= 6 : true;

  const confirmar = async () => {
    setSending(true); setError("");
    try {
      const r = await fetch("/api/reservar", {
        method: "POST", headers: apiHeaders(),
        body: JSON.stringify({
          nombre: nombre.trim(), telefono: tel.trim(), fecha, slots: sel,
          referrerCode: ref.trim() ? ref.trim().toUpperCase() : null,
          usarSaldo: false, ...(pago === "club" ? { metodoPago: "efectivo" } : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "No se pudo crear la reserva");
      // notificación WhatsApp (best-effort)
      fetch("/api/whatsapp/enviar", { method: "POST", headers: apiHeaders(), body: JSON.stringify({
        tipo: pago === "club" ? "confirmacion_presencial" : "transferencia_pendiente",
        nombre: nombre.trim(), telefono: tel.trim(), fecha: fmtFechaLarga(fecha),
        horarios: sel.map((h) => `${h}:00`).join(", ") + "hs", monto: gs(d.total ?? total),
      }) }).catch(() => {});
      setResult({ ...d, total: d.total ?? total });
      setStep(3);
    } catch (e: any) { setError(e.message); }
    finally { setSending(false); }
  };
  const next = () => (step === 2 ? confirmar() : setStep((s) => Math.min(s + 1, 3)));
  const back = () => (step === 0 ? go("landing") : setStep((s) => s - 1));

  if (loading) return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <button onClick={() => go("landing")}><Logo /></button>
          <button onClick={() => go("cuenta")} className="text-sm font-500 text-muted-foreground hover:text-foreground">Mi cuenta</button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-8">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-2">
                <span className={cn("grid h-8 w-8 place-items-center rounded-full border text-sm font-700",
                  i < step ? "border-accent bg-accent text-white" : i === step ? "border-primary bg-primary text-white" : "border-border text-muted-foreground")}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("hidden text-sm font-600 sm:inline", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("mx-3 h-px flex-1", i < step ? "bg-accent" : "bg-border")} />}
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {step === 0 && (
          <div className="rise space-y-6">
            <div><h1 className="font-display text-2xl font-800">Elegí tu horario</h1><p className="text-sm text-muted-foreground">Disponibilidad real. Podés elegir uno o varios.</p></div>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={weekOff === 0} onClick={() => setWeekOff((w) => w - 1)}><ArrowLeft className="h-4 w-4" /></Button>
              <span className="font-display text-sm font-700">{MESES[new Date(week[0] + "T00:00:00").getMonth()]} {new Date(week[0] + "T00:00:00").getFullYear()}</span>
              <Button variant="outline" size="sm" disabled={weekOff >= 4} onClick={() => setWeekOff((w) => w + 1)}><ArrowRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map((d, i) => {
                const dd = new Date(d + "T00:00:00"); const seld = d === fecha; const past = d < TODAY;
                return (
                  <button key={d} disabled={past} onClick={() => { setFecha(d); setSel([]); }}
                    className={cn("flex flex-col items-center rounded-lg border py-2", seld ? "border-primary bg-primary/10" : "border-border hover:bg-secondary", past && "opacity-30")}>
                    <span className="text-[10px] uppercase text-muted-foreground">{DIAS[i]}</span>
                    <span className={cn("nums text-lg font-700", seld && "text-primary")}>{dd.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {horas.map((h) => {
                const taken = ocupados.has(h); const selh = sel.includes(h);
                const pico = h >= (c.hora_pico_inicio ?? CLUB.picoIni) && h < (c.hora_pico_fin ?? CLUB.picoFin);
                return (
                  <button key={h} disabled={taken} onClick={() => toggleSlot(h)}
                    className={cn("relative flex flex-col items-center rounded-lg border py-3",
                      taken ? "cursor-not-allowed border-border bg-secondary/40 opacity-40" :
                      selh ? "border-primary bg-primary text-white shadow-lg shadow-primary/20" : "border-border hover:border-primary/50 hover:bg-secondary")}>
                    <span className="nums text-base font-700">{h}:00</span>
                    <span className={cn("text-[10px]", selh ? "text-white/80" : "text-muted-foreground")}>{taken ? "ocupado" : pico ? "pico" : "libre"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="rise space-y-6">
            <div><h1 className="font-display text-2xl font-800">Tus datos</h1><p className="text-sm text-muted-foreground">Para confirmarte por WhatsApp.</p></div>
            <div className="space-y-4">
              <div><Label htmlFor="n">Nombre y apellido</Label><Input id="n" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" className="mt-1.5" /></div>
              <div><Label htmlFor="t">WhatsApp</Label><Input id="t" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="09xx xxx xxx" className="mt-1.5" /></div>
              <div><Label htmlFor="r" className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Código de referido <span className="text-muted-foreground">(opcional)</span></Label>
                <Input id="r" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="Ej: MAT-1234" className="mt-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">Si es válido, se aplica el descuento automáticamente.</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rise space-y-6">
            <div><h1 className="font-display text-2xl font-800">Forma de pago</h1><p className="text-sm text-muted-foreground">Coordinás el pago por WhatsApp.</p></div>
            <div className="space-y-2">
              {PAGOS.map((p) => (
                <button key={p.id} onClick={() => setPago(p.id)}
                  className={cn("flex w-full items-center gap-3 rounded-lg border p-4 text-left", pago === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary"><p.icon className="h-5 w-5" /></span>
                  <span className="flex-1"><span className="block text-sm font-700">{p.t}</span><span className="block text-xs text-muted-foreground">{p.d}</span></span>
                  <span className={cn("grid h-5 w-5 place-items-center rounded-full border", pago === p.id ? "border-primary bg-primary text-white" : "border-border")}>{pago === p.id && <Check className="h-3 w-3" />}</span>
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground capitalize">{fmtFechaLarga(fecha)}</span><span className="nums">{sel.map((h) => `${h}:00`).join(", ")}</span></div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2"><span className="font-600">Total estimado</span><span className="nums text-lg font-800">{gs(total)}</span></div>
              <p className="mt-1 text-xs text-muted-foreground">El total final lo calcula el sistema con descuentos/referidos.</p>
            </div>
            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          </div>
        )}

        {step === 3 && result && (
          <div className="rise py-6 text-center">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/15 text-accent"><Check className="h-10 w-10" /></span>
            <h1 className="mt-5 font-display text-3xl font-900">¡Reserva creada!</h1>
            <p className="mt-2 text-muted-foreground">Te escribimos por WhatsApp a <span className="font-600 text-foreground">{tel}</span> para confirmar.</p>
            <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-xl border border-border bg-card text-left">
              <div className="court-net bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] px-5 py-4"><div className="kicker !text-primary">Tu turno</div><div className="mt-1 font-display text-xl font-800 capitalize">{fmtFechaLarga(fecha)}</div></div>
              <div className="space-y-3 p-5 text-sm">
                {[
                  { icon: Clock, l: "Horarios", v: sel.map((h) => `${h}:00`).join(", ") },
                  { icon: MapPin, l: "Lugar", v: CLUB.nombre },
                  { icon: Sparkles, l: "A nombre de", v: nombre },
                  { icon: CreditCard, l: "Total", v: gs(result.total) },
                ].map((rw) => (
                  <div key={rw.l} className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><rw.icon className="h-4 w-4" /> {rw.l}</span><span className="nums font-600">{rw.v}</span></div>
                ))}
                {result.referrer_code && <div className="flex items-center justify-between border-t border-border pt-3"><span className="text-muted-foreground">Tu código</span><span className="nums font-700 text-primary">{result.referrer_code}</span></div>}
              </div>
            </div>
            <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
              <Button className="gap-2 font-600" onClick={() => go("cuenta")}>Ir a mi cuenta <ArrowRight className="h-4 w-4" /></Button>
              <Button variant="outline" className="gap-2" onClick={() => window.open(`https://wa.me/${CLUB.wa}`, "_blank")}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
            </div>
          </div>
        )}
      </main>

      {step < 3 && (
        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
            <div>
              {sel.length ? (
                <>
                  <div className="text-xs text-muted-foreground">{DIAS[(new Date(fecha + "T00:00:00").getDay() + 6) % 7]} {new Date(fecha + "T00:00:00").getDate()} · {sel.length} turno{sel.length > 1 ? "s" : ""}</div>
                  <div className="nums text-xl font-800">{gs(total)}</div>
                </>
              ) : <span className="text-sm text-muted-foreground">Elegí al menos un horario</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /></Button>
              <Button className="gap-2 font-700" disabled={!canNext || sending} onClick={next}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{step === 2 ? "Confirmar reserva" : "Continuar"} <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
