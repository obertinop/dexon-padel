/* ============================================================
   DEXON PADEL — App rediseñada (routing real + superficies)
   ============================================================ */
import { useEffect, useState } from "react";
import { Home, CalendarDays, User, LayoutDashboard, Layers, X } from "lucide-react";
import { cn } from "@/lib/ui-utils";
import Landing from "@/rd/Landing";
import Portal from "@/rd/Portal";
import Account from "@/rd/Account";
import AdminApp from "@/rd/admin/Shell";

type Route = "landing" | "reservar" | "cuenta" | "admin";

const pathToRoute = (p: string): Route =>
  p.startsWith("/admin") ? "admin"
  : p.startsWith("/reservar") ? "reservar"
  : (p.startsWith("/cuenta") || p.startsWith("/mi-cuenta")) ? "cuenta"
  : "landing";
const routeToPath: Record<Route, string> = { landing: "/", reservar: "/reservar", cuenta: "/cuenta", admin: "/admin" };

const SURFACES: { id: Route; l: string; icon: typeof Home }[] = [
  { id: "landing", l: "Landing", icon: Home },
  { id: "reservar", l: "Reservar", icon: CalendarDays },
  { id: "cuenta", l: "Mi cuenta", icon: User },
  { id: "admin", l: "Admin", icon: LayoutDashboard },
];

export default function App() {
  const [route, setRoute] = useState<Route>(() => pathToRoute(window.location.pathname));
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(pathToRoute(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (v: string) => {
    const r = v as Route;
    window.history.pushState({}, "", routeToPath[r] || "/");
    setRoute(r);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {route === "landing" && <Landing go={go} />}
      {route === "reservar" && <Portal go={go} />}
      {route === "cuenta" && <Account go={go} />}
      {route === "admin" && <AdminApp go={go} />}

      {/* navegador de prototipo (solo para la prueba) */}
      <div className="fixed bottom-4 right-4 z-[60]">
        {navOpen ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="kicker">Vistas (prueba)</span>
              <button onClick={() => setNavOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-1 p-2">
              {SURFACES.map((s) => (
                <button key={s.id} onClick={() => { go(s.id); setNavOpen(false); }}
                  className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-600 transition-colors",
                    route === s.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                  <s.icon className="h-4 w-4" /> {s.l}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button onClick={() => setNavOpen(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2.5 text-sm font-700 shadow-2xl backdrop-blur-xl transition-transform hover:scale-105">
            <Layers className="h-4 w-4 text-primary" /> Vistas
          </button>
        )}
      </div>
    </>
  );
}
