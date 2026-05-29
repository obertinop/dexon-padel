/* ============================================================
   DEXON PADEL — Mi Cuenta (cliente)
   ============================================================ */
import { useState } from "react";
import {
  CalendarDays, Clock, MapPin, Star, Wallet, Gift, Copy, Check, Plus,
  TrendingUp, Share2, ChevronRight, History, Settings, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Logo, Avatar, EstadoBadge, NivelBadge, Stat, Empty } from "@/components/shared";
import {
  clientes, turnos, abonos, planes, gs, fmtFecha, DIAS, DIAS_FULL, TODAY, CLUB,
} from "@/data";
import { cn } from "@/lib/utils";

const ME = 3; // demo: Mateo Rolón

export default function Account({ go }: { go: (v: string) => void }) {
  const me = clientes.find((c) => c.id === ME)!;
  const abono = abonos.find((a) => a.clienteId === ME && a.estado === "activo");
  const plan = planes.find((p) => p.nombre === abono?.plan);
  const mis = turnos.filter((t) => t.clienteId === ME);
  const proximos = mis.filter((t) => t.fecha >= TODAY && t.estado !== "cancelado" && t.estado !== "completado").sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora - b.hora);
  const historial = mis.filter((t) => t.fecha < TODAY || t.estado === "completado" || t.estado === "no_show").sort((a, b) => b.fecha.localeCompare(a.fecha));
  const [copied, setCopied] = useState(false);
  const refCode = me.ref || "DEXON" + me.id;
  const copy = () => { navigator.clipboard?.writeText(refCode); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <button onClick={() => go("landing")}><Logo /></button>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 font-600" onClick={() => go("reservar")}><Plus className="h-4 w-4" /> Reservar</Button>
            <button onClick={() => go("landing")} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {/* hero card */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] p-6 md:p-8">
          <div className="absolute inset-0 court-net opacity-20" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={me.nombre} size={64} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-800">{me.nombre}</h1>
                  <NivelBadge nivel={me.nivel} />
                </div>
                <p className="text-sm text-muted-foreground">{me.telefono} · {me.visitas} partidos jugados</p>
              </div>
            </div>
            {abono && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-center">
                <div className="kicker !text-primary">Abonado</div>
                <div className="font-display text-sm font-800">{abono.plan}</div>
              </div>
            )}
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Saldo a favor" value={gs(me.saldoFavor)} icon={<Wallet className="h-4 w-4" />} />
            <Stat label="Próximos" value={proximos.length} icon={<CalendarDays className="h-4 w-4" />} />
            <Stat label="Este mes" value={mis.filter((t) => t.fecha.startsWith("2026-05")).length} hint="partidos" icon={<TrendingUp className="h-4 w-4" />} />
            <Stat label="Nivel" value={<span className="capitalize text-lg">{me.nivel}</span>} icon={<Star className="h-4 w-4" />} />
          </div>
        </div>

        <Tabs defaultValue="reservas" className="mt-6">
          <TabsList>
            <TabsTrigger value="reservas">Mis reservas</TabsTrigger>
            <TabsTrigger value="abono">Mi abono</TabsTrigger>
            <TabsTrigger value="referidos">Referidos</TabsTrigger>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
          </TabsList>

          {/* ---- reservas ---- */}
          <TabsContent value="reservas" className="mt-5 space-y-6">
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-700"><CalendarDays className="h-4 w-4 text-primary" /> Próximos turnos</h2>
              {proximos.length ? (
                <div className="space-y-2">
                  {proximos.map((t) => (
                    <div key={t.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                        <span className="text-[10px] uppercase text-primary">{DIAS[(new Date(t.fecha + "T00:00:00").getDay() + 6) % 7]}</span>
                        <span className="nums text-xl font-800 leading-none">{new Date(t.fecha + "T00:00:00").getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-700">{t.hora}:00 — {t.hora + 1}:00</span>
                          <EstadoBadge estado={t.estado} />
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Cancha {t.cancha} · {t.tipo}</div>
                      </div>
                      <div className="text-right">
                        <div className="nums font-700">{t.precio ? gs(t.precio) : "Abono"}</div>
                        {t.sena > 0 && <div className="text-xs text-muted-foreground">seña {gs(t.sena)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={<CalendarDays className="h-8 w-8" />} title="Sin turnos próximos" sub="Reservá tu próxima cancha en segundos." />
              )}
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-700"><History className="h-4 w-4 text-muted-foreground" /> Historial</h2>
              <div className="overflow-hidden rounded-lg border border-border">
                {historial.map((t, i) => (
                  <div key={t.id} className={cn("flex items-center justify-between px-4 py-3", i % 2 && "bg-card/50")}>
                    <div className="flex items-center gap-3">
                      <span className="nums text-sm text-muted-foreground">{fmtFecha(t.fecha)}</span>
                      <span className="text-sm font-500">{t.hora}:00 · Cancha {t.cancha}</span>
                    </div>
                    <EstadoBadge estado={t.estado} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ---- abono ---- */}
          <TabsContent value="abono" className="mt-5">
            {abono ? (
              <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
                <div className="rounded-xl border border-primary/30 bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="kicker">Plan activo</div>
                      <h2 className="font-display text-2xl font-800">{abono.plan}</h2>
                    </div>
                    <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary"><Star className="h-6 w-6" /></span>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Vence el {fmtFecha(abono.vence)}</span>
                      <span className="nums font-600">12 días</span>
                    </div>
                    <Progress value={60} className="mt-2 h-2" />
                  </div>
                  <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Tus horarios fijos</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {abono.slots.map((s, i) => (
                        <span key={i} className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-sm font-600">
                          {DIAS_FULL[(s.dia + 6) % 7]} {s.hora}:00
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="mt-5 w-full gap-2"><Settings className="h-4 w-4" /> Solicitar cambio de horario</Button>
                </div>
                <div className="space-y-3">
                  <Stat label="Precio mensual" value={gs(abono.precio)} accent />
                  <Stat label="Por hora" value={gs(Math.round(abono.precio / ((plan?.horasSemana ?? 1) * 4)))} hint="vs estándar" trend={-30} />
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <Gift className="h-5 w-5 text-accent" />
                    <p className="mt-2 text-sm text-muted-foreground">Como abonado tenés <span className="font-600 text-foreground">prioridad en torneos</span> y 1 clase mensual de regalo.</p>
                  </div>
                </div>
              </div>
            ) : (
              <Empty icon={<Star className="h-8 w-8" />} title="No tenés abono activo" sub="Conseguí tu horario fijo y ahorrá hasta 30%." />
            )}
          </TabsContent>

          {/* ---- referidos ---- */}
          <TabsContent value="referidos" className="mt-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] p-6">
                <div className="absolute inset-0 court-net opacity-20" />
                <div className="relative">
                  <Gift className="h-7 w-7 text-primary" />
                  <h2 className="mt-3 font-display text-xl font-800">Invitá y ganá</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Tus amigos usan tu código y se llevan <span className="font-600 text-foreground">10% off</span> en su primera reserva. Vos sumás saldo a favor.</p>
                  <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-background/40 p-3">
                    <span className="nums flex-1 text-center text-2xl font-800 tracking-widest text-primary">{refCode}</span>
                    <Button size="sm" variant={copied ? "outline" : "default"} className="gap-1.5" onClick={copy}>
                      {copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
                    </Button>
                  </div>
                  <Button variant="outline" className="mt-3 w-full gap-2"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Jugá en ${CLUB.nombre} con mi código ${refCode} y llevate 10% off 🎾`)}`, "_blank")}>
                    <Share2 className="h-4 w-4" /> Compartir por WhatsApp
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <Stat label="Amigos invitados" value="4" hint="2 este mes" icon={<Share2 className="h-4 w-4" />} />
                <Stat label="Saldo ganado" value={gs(80000)} accent icon={<Wallet className="h-4 w-4" />} />
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Últimos referidos</div>
                  <div className="mt-3 space-y-2.5">
                    {["Sofía Martínez", "Diego Fernández", "Camila Benítez"].map((n) => (
                      <div key={n} className="flex items-center gap-2.5">
                        <Avatar name={n} size={28} />
                        <span className="flex-1 text-sm">{n}</span>
                        <span className="text-xs text-accent">+{gs(20000)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ---- perfil ---- */}
          <TabsContent value="perfil" className="mt-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-lg font-700">Datos personales</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {[["Nombre", me.nombre], ["WhatsApp", me.telefono], ["Nivel", me.nivel], ["Miembro desde", "Marzo 2024"]].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-600 capitalize">{v}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="mt-5 w-full">Editar datos</Button>
              </div>
              <div className="space-y-3">
                <button onClick={() => go("reservar")} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><Plus className="h-5 w-5" /></span>
                  <span className="flex-1"><span className="block font-600">Nueva reserva</span><span className="block text-xs text-muted-foreground">Reservá tu próximo turno</span></span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <button onClick={() => window.open(`https://wa.me/${CLUB.wa}`, "_blank")} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-accent/10 text-accent"><Clock className="h-5 w-5" /></span>
                  <span className="flex-1"><span className="block font-600">Soporte</span><span className="block text-xs text-muted-foreground">Escribinos por WhatsApp</span></span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
