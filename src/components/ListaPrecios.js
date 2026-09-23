import React, { useEffect, useState } from "react";
import { C, LOGO, LOGO_STYLE_DARK } from "../lib/constants.js";
import { useIsMobile } from "../lib/hooks.js";
import { db } from "../lib/api.js";
import { gs } from "../lib/utils.js";

const CAT_LABEL = { bebidas: "Bebidas", pelotas: "Pelotas", paletas: "Paletas", accesorios: "Accesorios", general: "Otros" };
const CAT_ORDEN = ["bebidas", "pelotas", "paletas", "accesorios", "general"];

export default function ListaPrecios() {
  const isMobile = useIsMobile();
  const [productos, setProductos] = useState(null);
  const [nombreClub, setNombreClub] = useState("DEXON PADEL");

  useEffect(() => {
    Promise.all([
      db.get("stock_publico", "order=nombre.asc"),
      db.get("config", "limit=1&select=nombre_club"),
    ]).then(([p, cfg]) => {
      setProductos(p || []);
      if (cfg?.[0]?.nombre_club) setNombreClub(cfg[0].nombre_club);
    }).catch(() => setProductos([]));
  }, []);

  if (productos === null) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.t2, fontFamily: "var(--font-sans)" }}>Cargando...</div>;

  const categorias = CAT_ORDEN.filter(c => productos.some(p => p.categoria === c));

  return <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "var(--font-sans)", padding: isMobile ? "28px 16px 40px" : "48px 24px 60px" }}>
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <img src={LOGO} alt={nombreClub} style={{ height: 44, ...LOGO_STYLE_DARK, margin: "0 auto 12px" }} />
        <div style={{ fontSize: 13, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Lista de precios</div>
      </div>

      {productos.length === 0 && <div style={{ textAlign: "center", color: C.t3, fontSize: 14, padding: "40px 0" }}>Todavía no hay productos cargados.</div>}

      {categorias.map(cat => {
        const items = productos.filter(p => p.categoria === cat);
        const tipos = [...new Set(items.map(p => p.tipo).filter(Boolean))].sort();
        const sinTipo = items.filter(p => !p.tipo);
        return <div key={cat} style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.coralL, marginBottom: 14, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>{CAT_LABEL[cat] || cat}</div>

          {tipos.map(tipo => <div key={tipo} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{tipo}</div>
            {items.filter(p => p.tipo === tipo).map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 14, color: C.t1 }}>{p.nombre}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.t1, whiteSpace: "nowrap", flexShrink: 0 }}>{gs(p.precio_venta)}</span>
            </div>)}
          </div>)}

          {sinTipo.length > 0 && sinTipo.map(p => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14, color: C.t1 }}>{p.nombre}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.t1, whiteSpace: "nowrap", flexShrink: 0 }}>{gs(p.precio_venta)}</span>
          </div>)}
        </div>;
      })}

      <div style={{ textAlign: "center", fontSize: 11, color: C.t3, marginTop: 24 }}>Precios sujetos a cambio sin previo aviso.</div>
    </div>
  </div>;
}
