/* ============================================================
   DEXON PADEL — Admin (login gate + shell + nav + ⌘K)
   ============================================================ */
import { useEffect, useState, type ComponentType } from "react";
import {
  CalendarDays, Sun, Hourglass, Users, Star, Wallet, Package, BarChart3,
  Settings, PanelLeftClose, PanelLeft, Search, RefreshCw, Home, MessageCircle,
  Command as CmdIcon, CheckCircle2, AlertCircle, Info, LogOut,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Logo, Avatar } from "@/components/shared";
import { cn } from "@/lib/ui-utils";
import Login from "@/rd/Login";
import { AdminProvider, useAdmin } from "@/rd/store";
import { Agenda, Hoy, Pendientes } from "@/rd/admin/ops";
import { Clientes, Abonados, Caja } from "@/rd/admin/crm";
import { Stock, Stats, WhatsApp, Config } from "@/rd/admin/inv";

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

/* ---------- toast ---------- */
function Notice() {
  const { notice } = useAdmin();
  if (!notice) return null;
  const Icon = notice.type === "error" ? AlertCircle : notice.type === "ok" ? CheckCircle2 : Info;
  return (
    <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rise sm:bottom-6">
      <div className={cn("flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-600 shadow-2xl backdrop-blur-xl",
        notice.type === "error" ? "border-destructive/40 bg-destructive/15 text-destructive" :
        notice.type === "ok" ? "border-accent/40 bg-accent/15 text-accent" : "border-border bg-card text-foreground")}>
        <Icon className="h-4 w-4" /> {notice.text}
      </div>
    </div>
  );
}

/* ---------- shell (dentro del provider) ---------- */
function Shell({ go }: { go: (v: string) => void }) {
  const A = useAdmin();
  const [tab, setTab] = useState("agenda");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [cmd, setCmd] = useState(false);

  const pendN = A.data.turnos.filter((t: any) => t.estado === "pendiente_pago").length;
  const badge = (id: string) => (id === "pendientes" ? pendN : 0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((o) => !o); } };
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
            const active = tab === n.id; const b = badge(n.id);
            return (
              <button key={n.id} title={collapsed ? n.l : undefined} onClick={() => { setTab(n.id); onPick?.(); }}
                className={cn("group relative flex w-full items-center gap-3 px-3 py-2 text-sm font-500 transition-colors", collapsed && "justify-center", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {active && <span className="absolute left-0 h-6 w-[3px] rounded-r bg-primary" />}
                <span className={cn("relative grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors", active ? "bg-primary/15 text-primary" : "group-hover:bg-secondary")}>
                  <n.icon className="h-[18px] w-[18px]" />
                  {collapsed && b > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-700 text-white">{b}</span>}
                </span>
                {!collapsed && <span className="flex-1 text-left">{n.l}</span>}
                {!collapsed && b > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-700 text-white">{b}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/40 transition-all md:flex", collapsed ? "w-[68px]" : "w-60")}>
        <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-0")}>
          <Logo h={collapsed ? 22 : 26} />
        </div>
        <NavList />
        <div className="space-y-1 border-t border-border p-3">
          <button onClick={() => A.logout()} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground", collapsed && "justify-center")}>
            <LogOut className="h-4 w-4" /> {!collapsed && "Salir"}
          </button>
          <button onClick={() => setCollapsed((c) => !c)} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground", collapsed && "justify-center")}>
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Colapsar</>}
          </button>
        </div>
      </aside>

      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileNav(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-16 items-center border-b border-border px-4"><Logo h={26} /></div>
            <NavList onPick={() => setMobileNav(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
          <button className="md:hidden" onClick={() => setMobileNav(true)}><PanelLeft className="h-5 w-5" /></button>
          <h2 className="font-display text-lg font-700">{current.l}</h2>
          {A.refreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setCmd(true)} className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:flex">
              <Search className="h-4 w-4" /> Buscar <kbd className="ml-2 flex items-center gap-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px]"><CmdIcon className="h-2.5 w-2.5" />K</kbd>
            </button>
            <button onClick={() => go("landing")} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground" title="Ir al sitio"><Home className="h-4 w-4" /></button>
            <button onClick={() => A.load()} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
            <Avatar name={A.user?.email || "Admin Dexon"} size={34} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {A.loading ? <div className="grid place-items-center py-32 text-muted-foreground"><RefreshCw className="h-6 w-6 animate-spin" /></div> : <Active key={tab} />}
          </div>
        </main>
      </div>

      <Notice />

      <CommandDialog open={cmd} onOpenChange={setCmd}>
        <CommandInput placeholder="Ir a una sección…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Secciones">
            {NAV.map((n) => <CommandItem key={n.id} value={n.l} onSelect={() => { setTab(n.id); setCmd(false); }}><n.icon className="mr-2 h-4 w-4" /> {n.l}</CommandItem>)}
          </CommandGroup>
          <CommandGroup heading="Ir a">
            <CommandItem value="sitio" onSelect={() => go("landing")}><Home className="mr-2 h-4 w-4" /> Ver el sitio</CommandItem>
            <CommandItem value="reservar" onSelect={() => go("reservar")}><CalendarDays className="mr-2 h-4 w-4" /> Portal de reserva</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

/* ---------- entry: maneja sesión ---------- */
export default function AdminApp({ go }: { go: (v: string) => void }) {
  const [session, setSession] = useState<{ token: string; user: any } | null>(() => {
    const tk = localStorage.getItem("dx_token");
    const u = localStorage.getItem("dx_user");
    return tk ? { token: tk, user: u ? JSON.parse(u) : null } : null;
  });

  if (!session) return <Login onLogin={(token, user) => setSession({ token, user })} />;
  return (
    <AdminProvider token={session.token} user={session.user} onLogout={() => setSession(null)}>
      <Shell go={go} />
    </AdminProvider>
  );
}
