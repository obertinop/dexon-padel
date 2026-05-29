/* ============================================================
   DEXON PADEL — Admin shell (nav + topbar + ⌘K palette)
   ============================================================ */
import { useEffect, useState, type ComponentType } from "react";
import {
  CalendarDays, Sun, Hourglass, Users, Star, Wallet, Package, BarChart3,
  Settings, PanelLeftClose, PanelLeft, Search, RefreshCw, Bell, Home,
  MessageCircle, Command as CmdIcon,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Logo, Avatar } from "@/components/shared";
import { turnos, waMsgs } from "@/data";
import { cn } from "@/lib/utils";
import { Agenda, Hoy, Pendientes } from "./tabsOps";
import { Clientes, Abonados, Caja } from "./tabsCRM";
import { Stock, Stats, WhatsApp, Config } from "./tabsInv";

const NAV = [
  { id: "agenda", l: "Agenda", icon: CalendarDays, group: "Operación" },
  { id: "hoy", l: "Hoy", icon: Sun, group: "Operación" },
  { id: "pendientes", l: "Pendientes", icon: Hourglass, group: "Operación" },
  { id: "clientes", l: "Clientes", icon: Users, group: "Clientes" },
  { id: "abonados", l: "Abonados", icon: Star, group: "Clientes" },
  { id: "caja", l: "Caja", icon: Wallet, group: "Gestión" },
  { id: "stock", l: "Stock", icon: Package, group: "Gestión" },
  { id: "stats", l: "Estadísticas", icon: BarChart3, group: "Gestión" },
  { id: "whatsapp", l: "WhatsApp", icon: MessageCircle, group: "Gestión" },
  { id: "config", l: "Configuración", icon: Settings, group: "Gestión" },
] as const;

const VIEWS: Record<string, ComponentType> = {
  agenda: Agenda, hoy: Hoy, pendientes: Pendientes, clientes: Clientes,
  abonados: Abonados, caja: Caja, stock: Stock, stats: Stats, whatsapp: WhatsApp, config: Config,
};

export default function AdminShell({ go }: { go: (v: string) => void }) {
  const [tab, setTab] = useState("agenda");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [cmd, setCmd] = useState(false);

  const pendN = turnos.filter((t) => t.estado === "pendiente_pago").length;
  const waN = waMsgs.filter((m) => m.entrante && !m.leido).length;
  const badge = (id: string) => (id === "pendientes" ? pendN : id === "whatsapp" ? waN : 0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const Active = VIEWS[tab];
  const current = NAV.find((n) => n.id === tab)!;
  const groups = [...new Set(NAV.map((n) => n.group))];

  const NavList = ({ onPick }: { onPick?: () => void }) => (
    <nav className="flex-1 space-y-4 overflow-y-auto py-4 thin-scroll">
      {groups.map((g) => (
        <div key={g}>
          {!collapsed && <div className="px-3 pb-1.5 text-[10px] font-700 uppercase tracking-wider text-muted-foreground/60">{g}</div>}
          {NAV.filter((n) => n.group === g).map((n) => {
            const active = tab === n.id;
            const b = badge(n.id);
            return (
              <button key={n.id} title={collapsed ? n.l : undefined}
                onClick={() => { setTab(n.id); onPick?.(); }}
                className={cn(
                  "group relative flex w-full items-center gap-3 px-3 py-2 text-sm font-500 transition-colors",
                  collapsed && "justify-center",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                {active && <span className="absolute left-0 h-6 w-[3px] rounded-r bg-primary" />}
                <span className={cn("relative grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
                  active ? "bg-primary/15 text-primary" : "group-hover:bg-secondary")}>
                  <n.icon className="h-[18px] w-[18px]" />
                  {collapsed && b > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-700 text-white">{b}</span>}
                </span>
                {!collapsed && <span className="flex-1 text-left">{n.l}</span>}
                {!collapsed && b > 0 && (
                  <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-700 text-white", n.id === "whatsapp" ? "bg-[#25D366]" : "bg-primary")}>{b}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* ---------- sidebar (desktop) ---------- */}
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/40 transition-all md:flex", collapsed ? "w-[68px]" : "w-60")}>
        <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-0")}>
          {collapsed ? <Logo mark className="!gap-0 [&>span:last-child]:hidden" /> : <Logo />}
        </div>
        <NavList />
        <div className="border-t border-border p-3">
          <button onClick={() => setCollapsed((c) => !c)}
            className={cn("flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground", collapsed && "justify-center")}>
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Colapsar</>}
          </button>
        </div>
      </aside>

      {/* ---------- mobile drawer ---------- */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileNav(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-16 items-center border-b border-border px-4"><Logo /></div>
            <NavList onPick={() => setMobileNav(false)} />
          </aside>
        </div>
      )}

      {/* ---------- main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
          <button className="md:hidden" onClick={() => setMobileNav(true)}><PanelLeft className="h-5 w-5" /></button>
          <h2 className="font-display text-lg font-700">{current.l}</h2>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setCmd(true)}
              className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:flex">
              <Search className="h-4 w-4" /> Buscar
              <kbd className="ml-2 flex items-center gap-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]"><CmdIcon className="h-2.5 w-2.5" />K</kbd>
            </button>
            <button onClick={() => go("landing")} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" title="Ir al sitio"><Home className="h-4 w-4" /></button>
            <button className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
            <button className="relative grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Bell className="h-4 w-4" />
              {(pendN + waN) > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
            </button>
            <Avatar name="Admin Dexon" size={34} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Active key={tab} />
          </div>
        </main>
      </div>

      {/* ---------- command palette ---------- */}
      <CommandDialog open={cmd} onOpenChange={setCmd}>
        <CommandInput placeholder="Ir a una sección, buscar cliente…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Secciones">
            {NAV.map((n) => (
              <CommandItem key={n.id} value={n.l} onSelect={() => { setTab(n.id); setCmd(false); }}>
                <n.icon className="mr-2 h-4 w-4" /> {n.l}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Ir a">
            <CommandItem value="sitio landing" onSelect={() => go("landing")}><Home className="mr-2 h-4 w-4" /> Ver el sitio público</CommandItem>
            <CommandItem value="reservar portal" onSelect={() => go("reservar")}><CalendarDays className="mr-2 h-4 w-4" /> Portal de reserva</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
