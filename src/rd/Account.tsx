/* ============================================================
   DEXON PADEL — Mi Cuenta (cliente real vía /api/cliente/*)
   ============================================================ */
import { useEffect, useState } from "react";
import {
  CalendarDays, MapPin, Star, Wallet, Gift, Copy, Check, Plus, Share2,
  History, LogOut, Loader2, ArrowRight, Phone, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo, Avatar, EstadoBadge, Stat, Empty } from "@/components/shared";
import { gs, fmtFecha, DIAS, CLUB } from "@/data";
// @ts-ignore
import { clienteAuth, clienteData, clienteSession } from "@/lib/cliente-api.js";
import { cn } from "@/lib/ui-utils";

export default function Account({ go }: { go: (v: string) => void }) {
  const [session, setSession] = useState<any>(() => clienteSession.get());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () => { setLoading(true); clienteData.me().then(setData).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { if (session) refresh(); }, [session]);

  if (!session) return <AuthFlow go={go} onAuth={() => setSession(clienteSession.get())} />;

  const cli = data?.cliente;
  const proximas: any[] = data?.proximas || [];
  const pasadas: any[] = data?.pasadas || [];
  const abono = data?.abono;
  const refCode = cli?.referrer_code || "—";
  const logout = () => { clienteAuth.logout(); setSession(null); setData(null); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <button onClick={() => go("landing")}><Logo /></button>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 font-600" onClick={() => go("reservar")}><Plus className="h-4 w-4" /> Reservar</Button>
            <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {loading && !data ? (
          <div className="grid place-items-center py-32 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] p-6 md:p-8">
              <div className="absolute inset-0 court-net opacity-20" />
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar name={cli?.nombre || "?"} size={64} />
                  <div>
                    <h1 className="font-display text-2xl font-800">{cli?.nombre} {cli?.apellido}</h1>
                    <p className="text-sm text-muted-foreground">{cli?.telefono}</p>
                  </div>
                </div>
                {abono && <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-center"><div className="kicker !text-primary">Abonado</div><div className="font-display text-sm font-800">Activo</div></div>}
              </div>
              <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Saldo a favor" value={gs(cli?.saldo_favor || 0)} icon={<Wallet className="h-4 w-4" />} />
                <Stat label="Próximos" value={proximas.length} icon={<CalendarDays className="h-4 w-4" />} />
                <Stat label="Jugados" value={pasadas.length} icon={<History className="h-4 w-4" />} />
                <Stat label="Referidos" value={data?.referidos?.total || 0} icon={<Gift className="h-4 w-4" />} />
              </div>
            </div>

            <Tabs defaultValue="reservas" className="mt-6">
              <TabsList>
                <TabsTrigger value="reservas">Mis reservas</TabsTrigger>
                <TabsTrigger value="abono">Mi abono</TabsTrigger>
                <TabsTrigger value="referidos">Referidos</TabsTrigger>
                <TabsTrigger value="perfil">Perfil</TabsTrigger>
              </TabsList>

              <TabsContent value="reservas" className="mt-5 space-y-6">
                <div>
                  <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-700"><CalendarDays className="h-4 w-4 text-primary" /> Próximos turnos</h2>
                  {proximas.length ? (
                    <div className="space-y-2">
                      {proximas.map((t) => (
                        <div key={t.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                            <span className="text-[10px] uppercase text-primary">{DIAS[(new Date(t.fecha + "T00:00:00").getDay() + 6) % 7]}</span>
                            <span className="nums text-xl font-800 leading-none">{new Date(t.fecha + "T00:00:00").getDate()}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2"><span className="font-display font-700">{t.hora}:00</span><EstadoBadge estado={t.estado} /></div>
                            <div className="mt-0.5 flex items-center gap-1 text-xs capitalize text-muted-foreground"><MapPin className="h-3 w-3" /> {t.tipo}</div>
                          </div>
                          <div className="text-right">
                            <div className="nums font-700">{t.precio ? gs(t.precio) : "—"}</div>
                            {t.tipo !== "abono" && <button onClick={async () => { try { await clienteData.cancelarTurno(t.id); refresh(); } catch (e: any) { alert(e.message); } }} className="mt-1 text-xs text-destructive hover:underline">Cancelar</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <Empty icon={<CalendarDays className="h-8 w-8" />} title="Sin turnos próximos" sub="Reservá tu próxima cancha en segundos." />}
                </div>
                {pasadas.length > 0 && (
                  <div>
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-700"><History className="h-4 w-4 text-muted-foreground" /> Historial</h2>
                    <div className="overflow-hidden rounded-lg border border-border">
                      {pasadas.slice(0, 12).map((t, i) => (
                        <div key={t.id} className={cn("flex items-center justify-between px-4 py-3", i % 2 && "bg-card/50")}>
                          <div className="flex items-center gap-3"><span className="nums text-sm text-muted-foreground">{fmtFecha(t.fecha)}</span><span className="text-sm font-500">{t.hora}:00</span></div>
                          <EstadoBadge estado={t.estado} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="abono" className="mt-5">
                {abono ? (
                  <div className="rounded-xl border border-primary/30 bg-card p-6">
                    <div className="flex items-center justify-between">
                      <div><div className="kicker">Plan activo</div><h2 className="font-display text-2xl font-800">Abono</h2></div>
                      <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary"><Star className="h-6 w-6" /></span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Stat label="Precio" value={gs(abono.precio_acordado || 0)} accent />
                      <Stat label="Inicio" value={fmtFecha(abono.fecha_inicio)} />
                      <Stat label="Vence" value={fmtFecha(abono.fecha_vencimiento)} />
                    </div>
                  </div>
                ) : <Empty icon={<Star className="h-8 w-8" />} title="No tenés abono activo" sub="Conseguí tu horario fijo y ahorrá hasta 30%." />}
              </TabsContent>

              <TabsContent value="referidos" className="mt-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <RefCard refCode={refCode} pct={data?.ref_pct || 10} />
                  <div className="space-y-3">
                    <Stat label="Amigos invitados" value={data?.referidos?.total || 0} icon={<Share2 className="h-4 w-4" />} />
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Últimos referidos</div>
                      <div className="mt-3 space-y-2.5">
                        {(data?.referidos?.lista || []).slice(0, 5).map((r: any, i: number) => (
                          <div key={i} className="flex items-center gap-2.5"><Avatar name={r.nombre || "?"} size={28} /><span className="flex-1 text-sm">{r.nombre || r.telefono}</span></div>
                        ))}
                        {!(data?.referidos?.lista || []).length && <div className="text-sm text-muted-foreground">Todavía no invitaste a nadie.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="perfil" className="mt-5">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h2 className="font-display text-lg font-700">Datos personales</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {[["Nombre", `${cli?.nombre || ""} ${cli?.apellido || ""}`], ["WhatsApp", cli?.telefono], ["Email", cli?.email || "—"], ["Código", cli?.referrer_code]].map(([l, v]) => (
                      <div key={l} className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0"><span className="text-muted-foreground">{l}</span><span className="font-600">{v}</span></div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-5 w-full gap-2" onClick={logout}><LogOut className="h-4 w-4" /> Cerrar sesión</Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}

function RefCard({ refCode, pct }: { refCode: string; pct: number }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(refCode); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] p-6">
      <div className="absolute inset-0 court-net opacity-20" />
      <div className="relative">
        <Gift className="h-7 w-7 text-primary" />
        <h2 className="mt-3 font-display text-xl font-800">Invitá y ganá</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tus amigos usan tu código y se llevan <span className="font-600 text-foreground">{pct}% off</span>. Vos sumás saldo a favor.</p>
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-background/40 p-3">
          <span className="nums flex-1 text-center text-xl font-800 tracking-widest text-primary">{refCode}</span>
          <Button size="sm" variant={copied ? "outline" : "default"} className="gap-1.5" onClick={copy}>{copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}</Button>
        </div>
        <Button variant="outline" className="mt-3 w-full gap-2" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Jugá en ${CLUB.nombre} con mi código ${refCode} y llevate ${pct}% off 🎾`)}`, "_blank")}><Share2 className="h-4 w-4" /> Compartir</Button>
      </div>
    </div>
  );
}

/* ---------- login por código de WhatsApp ---------- */
function AuthFlow({ go, onAuth }: { go: (v: string) => void; onAuth: () => void }) {
  const [stepCode, setStepCode] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [tel, setTel] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setErr(""); setBusy(true);
    try { const d = await clienteAuth.sendCode(tel.trim()); setIsNew(!!d?.isNewClient); setStepCode(true); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const verify = async () => {
    setErr(""); setBusy(true);
    try { await clienteAuth.verifyCode({ telefono: tel.trim(), codigo: codigo.trim(), nombre: nombre.trim(), apellido: apellido.trim() }); onAuth(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="absolute inset-0 grid-lines opacity-30" />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-2xl">
        <div className="flex items-center justify-between"><Logo h={28} /><button onClick={() => go("landing")} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button></div>
        <h1 className="mt-6 font-display text-2xl font-800">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">{stepCode ? "Ingresá el código que te enviamos por WhatsApp." : "Te enviamos un código por WhatsApp para entrar."}</p>

        <div className="mt-6 space-y-4">
          {!stepCode ? (
            <div>
              <Label htmlFor="t">WhatsApp</Label>
              <div className="relative mt-1.5"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="t" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="09xx xxx xxx" className="pl-9" autoFocus /></div>
            </div>
          ) : (
            <>
              <div><Label htmlFor="c">Código de 6 dígitos</Label><Input id="c" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" className="mt-1.5 text-center nums tracking-[0.4em]" inputMode="numeric" autoFocus /></div>
              {isNew && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Nombre</Label><Input className="mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
                  <div><Label>Apellido</Label><Input className="mt-1.5" value={apellido} onChange={(e) => setApellido(e.target.value)} /></div>
                </div>
              )}
            </>
          )}
          {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
          <Button className="w-full gap-2 font-700" disabled={busy || (!stepCode ? tel.trim().length < 6 : codigo.length !== 6)} onClick={stepCode ? verify : send}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{stepCode ? "Entrar" : "Enviar código"} <ArrowRight className="h-4 w-4" /></>}
          </Button>
          {stepCode && <button onClick={() => { setStepCode(false); setCodigo(""); }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">← Cambiar número</button>}
        </div>
      </div>
    </div>
  );
}
