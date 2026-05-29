/* ============================================================
   DEXON PADEL — Login admin (Supabase auth password grant)
   ============================================================ */
import { useState } from "react";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared";
// @ts-ignore
import { auth } from "@/lib/api.js";

export default function Login({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const d = await auth.login(email.trim(), pw);
      const token = d.access_token;
      const user = d.user || { email: email.trim() };
      localStorage.setItem("dx_token", token);
      localStorage.setItem("dx_user", JSON.stringify(user));
      onLogin(token, user);
    } catch (e: any) {
      setErr(e?.message || "Credenciales incorrectas");
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="absolute inset-0 grid-lines opacity-30" />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-xl border border-border bg-card p-7 shadow-2xl">
        <Logo h={30} />
        <h1 className="mt-6 font-display text-2xl font-800">Panel administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ingresá con tu cuenta del club.</p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="e">Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@dexon.com.py" className="pl-9" autoFocus />
            </div>
          </div>
          <div>
            <Label htmlFor="p">Contraseña</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="p" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" className="pl-9" />
            </div>
          </div>
          {err && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
          <Button type="submit" disabled={loading} className="w-full gap-2 font-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ingresar <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
      </form>
    </div>
  );
}
