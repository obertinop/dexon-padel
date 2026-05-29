/* ============================================================
   DEXON PADEL — Rediseño · shell + navegador de prototipo
   ============================================================ */
import { useState } from "react";
import { Home, CalendarDays, User, LayoutDashboard, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Landing from "@/views/Landing";
import Portal from "@/views/Portal";
import Account from "@/views/Account";
import AdminShell from "@/admin/AdminShell";

type View = "landing" | "reservar" | "cuenta" | "admin";

const SURFACES: { id: View; l: string; icon: typeof Home }[] = [
  { id: "landing", l: "Landing", icon: Home },
  { id: "reservar", l: "Reservar", icon: CalendarDays },
  { id: "cuenta", l: "Mi cuenta", icon: User },
  { id: "admin", l: "Admin", icon: LayoutDashboard },
];

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [navOpen, setNavOpen] = useState(false);
  const go = (v: string) => { setView(v as View); window.scrollTo(0, 0); };

  return (
    <>
      {view === "landing" && <Landing go={go} />}
      {view === "reservar" && <Portal go={go} />}
      {view === "cuenta" && <Account go={go} />}
      {view === "admin" && <AdminShell go={go} />}

      {/* ---------- prototype navigator ---------- */}
      <div className="fixed bottom-4 right-4 z-[60] print:hidden">
        {navOpen ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="kicker">Vistas del prototipo</span>
              <button onClick={() => setNavOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-1 p-2">
              {SURFACES.map((s) => (
                <button key={s.id} onClick={() => { go(s.id); setNavOpen(false); }}
                  className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-600 transition-colors",
                    view === s.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
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
