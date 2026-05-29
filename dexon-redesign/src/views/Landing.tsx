/* ============================================================
   DEXON PADEL — Landing pública (todas las secciones)
   ============================================================ */
import { useEffect, useState } from "react";
import {
  MapPin, Phone, Mail, Clock, Star, Check, ChevronRight, Menu, X,
  CalendarCheck, CreditCard, MessageCircle, AtSign, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Logo, SectionHead, Avatar } from "@/components/shared";
import {
  CLUB, gs, servicios, planes, testimonios, faqs, stats, instructores,
} from "@/data";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "nosotros", l: "Nosotros" },
  { id: "cancha", l: "La cancha" },
  { id: "precios", l: "Precios" },
  { id: "clases", l: "Clases" },
  { id: "reservar-info", l: "Cómo reservar" },
  { id: "ubicacion", l: "Ubicación" },
];

export default function Landing({ go }: { go: (v: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  const jump = (id: string) => {
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ---------- NAV ---------- */}
      <header className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border/70 bg-background/85 backdrop-blur-xl" : "bg-transparent",
      )}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Logo /></button>
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => jump(n.id)}
                className="text-sm font-500 text-muted-foreground transition-colors hover:text-foreground">
                {n.l}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => go("cuenta")}>
              Mi cuenta
            </Button>
            <Button size="sm" className="font-600" onClick={() => go("reservar")}>
              Reservar turno
            </Button>
            <button className="lg:hidden" onClick={() => setMenu((m) => !m)}>
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menu && (
          <div className="border-t border-border bg-background/95 px-5 py-3 lg:hidden">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => jump(n.id)}
                className="block w-full py-2.5 text-left text-sm font-500 text-muted-foreground">
                {n.l}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="absolute -right-40 top-10 h-[480px] w-[480px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -left-32 bottom-0 h-[360px] w-[360px] rounded-full bg-accent/10 blur-[110px]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="rise">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary live-dot" />
              <span className="kicker !text-primary">{CLUB.ciudad} · {CLUB.region}</span>
            </div>
            <h1 className="font-display text-[2.7rem] font-900 leading-[0.95] tracking-[-0.03em] sm:text-6xl md:text-[4.5rem]">
              El pádel
              <br />
              <span className="text-primary">como debe ser.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Primera cancha profesional de Tavapy. Césped premium, iluminación LED y
              reserva online en segundos. Vení a jugar.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="h-12 gap-2 px-6 text-base font-700" onClick={() => go("reservar")}>
                Reservar mi turno <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" onClick={() => jump("precios")}>
                Ver precios
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["Mateo", "Sofía", "Lucas", "Cami"].map((n) => <Avatar key={n} name={n} size={30} />)}
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-amber-300">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <span className="text-xs">+850 jugadores activos</span>
              </div>
            </div>
          </div>

          {/* hero court card */}
          <div className="rise relative" style={{ animationDelay: "0.1s" }}>
            <div className="relative aspect-[4/5] overflow-hidden border border-border bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] cut-tr shadow-2xl">
              <div className="absolute inset-0 court-net opacity-30" />
              {/* stylised court */}
              <svg viewBox="0 0 200 250" className="absolute inset-0 h-full w-full p-8 text-accent/50" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="20" y="15" width="160" height="220" rx="2" className="stroke-white/30" />
                <line x1="20" y1="125" x2="180" y2="125" className="stroke-primary" strokeWidth="2.5" />
                <line x1="100" y1="15" x2="100" y2="235" strokeDasharray="4 5" />
                <rect x="20" y="60" width="160" height="65" className="stroke-white/15" />
                <rect x="20" y="125" width="160" height="65" className="stroke-white/15" />
              </svg>
              <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/10 bg-background/70 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="kicker !text-accent">Disponible ahora</div>
                    <div className="mt-1 font-display text-lg font-800">Cancha 1 · 21:00</div>
                  </div>
                  <Button size="sm" className="font-600" onClick={() => go("reservar")}>Reservar</Button>
                </div>
              </div>
            </div>
            <div className="absolute -left-4 -top-4 hidden rounded-lg border border-border bg-card p-3 shadow-xl sm:block">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/15 text-accent"><Check className="h-4 w-4" /></span>
                <div>
                  <div className="nums text-sm font-700 leading-none">Confirmado</div>
                  <div className="text-[11px] text-muted-foreground">vía WhatsApp</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative border-y border-border bg-card/50">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="px-5 py-6 text-center">
                <div className="nums text-3xl font-800 text-primary md:text-4xl">{s.n}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- SERVICIOS ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <SectionHead kicker="Todo en un lugar" title={<>Mucho más que<br />una cancha</>}
          sub="Pensamos cada detalle para que tu única preocupación sea disfrutar el partido." />
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {servicios.map((s) => (
            <div key={s.titulo} className="group bg-card p-6 transition-colors hover:bg-secondary">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-2xl transition-transform group-hover:scale-110">
                {s.icon}
              </div>
              <h3 className="mt-4 font-display text-lg font-700">{s.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- NOSOTROS ---------- */}
      <section id="nosotros" className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <SectionHead kicker="Quiénes somos" title={<>Nacimos para<br />hacer crecer el pádel<br />en Alto Paraná</>} />
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              DEXON PADEL es la primera cancha profesional de Tavapy. Construimos un espacio
              de nivel internacional para que jugadores de toda la región tengan dónde entrenar,
              competir y pasarla bien.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Desde el principiante que recién arranca hasta el competitivo que busca su mejor
              versión: acá hay lugar para todos.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {["Césped WPT premium", "Cristal panorámico", "Comunidad +850"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-500">
                  <Check className="h-3.5 w-3.5 text-accent" /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { n: "2024", l: "Año de apertura", c: "bg-primary/10 text-primary" },
              { n: "+850", l: "Jugadores", c: "bg-accent/10 text-accent" },
              { n: "120+", l: "Partidos / semana", c: "bg-sky-400/10 text-sky-300" },
              { n: "4.9★", l: "En Google", c: "bg-amber-400/10 text-amber-300" },
            ].map((b, i) => (
              <div key={b.l} className={cn("rounded-lg border border-border bg-card p-6", i % 2 && "translate-y-6")}>
                <div className={cn("nums text-3xl font-800", b.c.split(" ")[1])}>{b.n}</div>
                <div className="mt-1 text-sm text-muted-foreground">{b.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- LA CANCHA ---------- */}
      <section id="cancha" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <SectionHead kicker="La cancha" title="Diseñada para jugar en serio"
          sub="Materiales de primera, mantenimiento obsesivo y los detalles que hacen la diferencia." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] p-8 md:row-span-2 md:flex md:flex-col md:justify-end">
            <div className="absolute inset-0 court-net opacity-30" />
            <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative">
              <Star className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-display text-2xl font-800">Panorámica de cristal</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                12 mm templado, visión 360°. Cada rebote es real, cada punto se juega como en torneo.
              </p>
            </div>
          </div>
          {[
            { icon: "💡", t: "Iluminación LED 1500 lux", d: "Uniforme, sin sombras. Jugá igual de bien a las 10am o a las 11pm." },
            { icon: "🌿", t: "Césped sintético premium", d: "Pelo de 12mm con relleno de arena de sílice. Botín perfecto." },
            { icon: "🎧", t: "Sonido + climatización", d: "Música, ventilación y un buffet a metros para el después." },
            { icon: "📹", t: "Grabá tus partidos", d: "Cámara fija para revisar jugadas y mejorar tu técnica." },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border border-border bg-card p-6">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-display text-lg font-700">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PRECIOS / ABONOS ---------- */}
      <section id="precios" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <SectionHead align="center" kicker="Precios transparentes" title="Elegí cómo querés jugar"
            sub="Sin letra chica. Tarifa por hora o abono mensual con horario fijo y precio preferencial." className="mb-12" />

          {/* tarifa por hora */}
          <div className="mx-auto mb-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="kicker">Tarifa estándar</div>
              <div className="mt-2 nums text-4xl font-800">{gs(CLUB.tarifaBase)}</div>
              <div className="text-sm text-muted-foreground">por hora · {CLUB.apertura}:00 a {CLUB.picoIni}:00</div>
            </div>
            <div className="rounded-lg border border-primary/40 bg-card p-6">
              <div className="kicker">Horario pico</div>
              <div className="mt-2 nums text-4xl font-800 text-primary">{gs(CLUB.tarifaPico)}</div>
              <div className="text-sm text-muted-foreground">por hora · {CLUB.picoIni}:00 a {CLUB.picoFin}:00</div>
            </div>
          </div>

          {/* abonos */}
          <div className="mb-6 text-center text-sm font-600 uppercase tracking-wide text-muted-foreground">Abonos mensuales</div>
          <div className="grid gap-5 md:grid-cols-3">
            {planes.map((p) => (
              <div key={p.id} className={cn(
                "relative flex flex-col rounded-lg border bg-card p-7",
                p.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border",
              )}>
                {p.popular && (
                  <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-[11px] font-700 uppercase tracking-wide text-white">
                    Más elegido
                  </span>
                )}
                <h3 className="font-display text-xl font-800">{p.nombre}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.horasSemana}x por semana · horario fijo</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="nums text-4xl font-800">{gs(p.precio)}</span>
                  <span className="mb-1 text-sm text-muted-foreground">/mes</span>
                </div>
                <div className="mt-2 text-xs text-accent">
                  ≈ {gs(Math.round(p.precio / (p.horasSemana * 4)))} por hora · ahorrás hasta 30%
                </div>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {["Tu horario fijo reservado", "Reprogramación flexible", "Prioridad en torneos", p.horasSemana >= 2 ? "1 clase mensual de regalo" : "Descuento en pro shop"].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-7 w-full font-600" variant={p.popular ? "default" : "outline"} onClick={() => go("reservar")}>
                  Quiero este plan
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CLASES / INSTRUCTORES ---------- */}
      <section id="clases" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <SectionHead kicker="Clases" title={<>Mejorá con<br />los mejores</>}
              sub="Profesores certificados, grupos por nivel y planes de entrenamiento personalizados. Desde cero hasta competitivo." />
            <div className="mt-7 space-y-3">
              {["Clases individuales y grupales", "Evaluación de nivel gratuita", "Clínicas y entrenamientos intensivos"].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-accent/15 text-accent"><Check className="h-4 w-4" /></span>
                  <span className="text-sm font-500">{t}</span>
                </div>
              ))}
            </div>
            <Button className="mt-7 gap-2 font-600" onClick={() => go("reservar")}>
              Reservar una clase <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {instructores.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-6">
                <Avatar name={p.nombre} size={56} />
                <h3 className="mt-4 font-display text-lg font-700">{p.nombre}</h3>
                <p className="text-sm text-primary">{p.nivel}</p>
                <p className="mt-3 nums text-sm text-muted-foreground">{gs(p.tarifa)} <span className="font-sans">/ clase</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CÓMO RESERVAR ---------- */}
      <section id="reservar-info" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <SectionHead align="center" kicker="Súper simple" title="Reservá en 3 pasos" className="mb-14" />
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: CalendarCheck, t: "Elegí día y hora", d: "Mirá la disponibilidad en tiempo real y tocá el horario que quieras." },
              { icon: CreditCard, t: "Pagá la seña", d: "Online con tarjeta o transferencia. También podés pagar en el club." },
              { icon: MessageCircle, t: "Recibí tu confirmación", d: "Te llega al instante por WhatsApp con todos los datos. Listo." },
            ].map((s, i) => (
              <div key={s.t} className="relative text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                  <s.icon className="h-7 w-7" />
                </div>
                <div className="mx-auto mt-4 nums text-xs font-700 text-primary">PASO {i + 1}</div>
                <h3 className="mt-1 font-display text-lg font-700">{s.t}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button size="lg" className="h-12 gap-2 px-7 text-base font-700" onClick={() => go("reservar")}>
              Empezar ahora <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIOS ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <SectionHead kicker="Comunidad" title="Lo que dicen los que juegan acá" className="mb-12" />
        <div className="grid gap-5 md:grid-cols-3">
          {testimonios.map((t) => (
            <figure key={t.nombre} className="flex flex-col rounded-lg border border-border bg-card p-6">
              <div className="mb-3 flex gap-0.5 text-amber-300">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground/90">"{t.texto}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Avatar name={t.nombre} size={40} />
                <div>
                  <div className="text-sm font-700">{t.nombre}</div>
                  <div className="text-xs text-muted-foreground">{t.nivel}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[0.7fr_1.3fr] md:py-28">
          <SectionHead kicker="Preguntas frecuentes" title={<>¿Dudas?<br />Te las<br />respondemos</>}
            sub="Y si te queda algo, escribinos por WhatsApp y te contestamos al toque." />
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`}>
                <AccordionTrigger className="text-left font-display font-700 hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ---------- UBICACIÓN ---------- */}
      <section id="ubicacion" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <SectionHead kicker="Dónde estamos" title="Te esperamos en Tavapy"
              sub="Fácil acceso desde Ciudad del Este y alrededores. Estacionamiento amplio y seguro." />
            <div className="mt-7 space-y-4">
              {[
                { icon: MapPin, t: "Dirección", d: `${CLUB.ciudad}, ${CLUB.region}` },
                { icon: Clock, t: "Horario", d: `Todos los días · ${CLUB.apertura}:00 a ${CLUB.cierre - 24 === 0 ? "24" : CLUB.cierre}:00` },
                { icon: Phone, t: "Teléfono", d: CLUB.tel },
                { icon: Mail, t: "Email", d: CLUB.email },
              ].map((r) => (
                <div key={r.t} className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-primary"><r.icon className="h-4 w-4" /></span>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{r.t}</div>
                    <div className="font-500">{r.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-7 gap-2 font-600"
              onClick={() => window.open(`https://wa.me/${CLUB.wa}`, "_blank")}>
              <MessageCircle className="h-4 w-4" /> Escribinos por WhatsApp
            </Button>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card md:aspect-auto md:h-[420px]">
            <div className="absolute inset-0 grid-lines opacity-50" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
                  <MapPin className="h-6 w-6" />
                </span>
                <div className="mt-3 font-display text-lg font-700">{CLUB.nombre}</div>
                <div className="text-sm text-muted-foreground">{CLUB.ciudad}, {CLUB.region}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-[#0e2c4a] to-[#0a1730] px-6 py-14 text-center md:px-16 md:py-20">
          <div className="absolute inset-0 court-net opacity-30" />
          <div className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-display text-3xl font-900 leading-tight tracking-tight md:text-5xl">
              Tu próxima cancha te está esperando
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Reservá en menos de un minuto. Sin llamadas, sin esperas.
            </p>
            <Button size="lg" className="mt-8 h-12 gap-2 px-8 text-base font-700" onClick={() => go("reservar")}>
              Reservar turno ahora <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              La primera cancha de pádel profesional de Tavapy, Alto Paraná.
            </p>
            <div className="mt-4 flex gap-2">
              <a href={`https://wa.me/${CLUB.wa}`} target="_blank" className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground">
                <MessageCircle className="h-4 w-4" />
              </a>
              <a href="#" className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground">
                <AtSign className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <div className="kicker mb-3">Navegación</div>
            {NAV.slice(0, 4).map((n) => (
              <button key={n.id} onClick={() => jump(n.id)} className="block py-1 text-sm text-muted-foreground hover:text-foreground">{n.l}</button>
            ))}
          </div>
          <div>
            <div className="kicker mb-3">Tu cuenta</div>
            <button onClick={() => go("reservar")} className="block py-1 text-sm text-muted-foreground hover:text-foreground">Reservar turno</button>
            <button onClick={() => go("cuenta")} className="block py-1 text-sm text-muted-foreground hover:text-foreground">Mi cuenta</button>
            <button onClick={() => go("admin")} className="block py-1 text-sm text-muted-foreground hover:text-foreground">Panel admin</button>
          </div>
          <div>
            <div className="kicker mb-3">Contacto</div>
            <div className="py-1 text-sm text-muted-foreground">{CLUB.tel}</div>
            <div className="py-1 text-sm text-muted-foreground">{CLUB.email}</div>
            <div className="py-1 text-sm text-muted-foreground">{CLUB.ciudad}, {CLUB.region}</div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row">
            <span>© 2026 {CLUB.nombre}. Todos los derechos reservados.</span>
            <span>Hecho con 🎾 en Paraguay</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
