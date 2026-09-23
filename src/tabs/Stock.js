import React, { useState } from "react";
import { C } from "../lib/constants.js";
import { gs } from "../lib/utils.js";
import { Badge, Btn } from "../components/UI.js";
import { useAdmin } from "../context/AdminContext.js";

const CAT_LABEL = { pelotas:"Pelotas", paletas:"Paletas", bebidas:"Bebidas", accesorios:"Accesorios", general:"General" };

const Chip = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    border: `1px solid ${active ? C.coral : C.border}`,
    background: active ? C.coralAlpha : C.bgElev,
    color: active ? C.coralL : C.t2,
  }}>{children}</button>
);

export default function Stock() {
  const { stock, isMobile, openM } = useAdmin();
  const [q, setQ] = useState("");
  const [filtroCat, setFiltroCat] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [soloSinClasificar, setSoloSinClasificar] = useState(false);
  const [soloBajo, setSoloBajo] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);

  const activos = stock.filter(s => s.activo !== false);
  const cats = [...new Set(activos.map(s => s.categoria))];
  const bajo = activos.filter(s => s.minimo > 0 && s.cantidad <= s.minimo);
  const sinClasificar = activos.filter(s => !s.marca && !s.tipo);
  const inactivos = stock.filter(s => s.activo === false);

  const elegirCat = c => { setFiltroCat(filtroCat === c ? "" : c); setFiltroTipo(""); };

  const tipos = [...new Set(activos.filter(s => !filtroCat || s.categoria === filtroCat).map(s => s.tipo).filter(Boolean))].sort();

  const qNorm = q.trim().toLowerCase();
  const visibles = (verInactivos ? inactivos : activos)
    .filter(s => !filtroCat || s.categoria === filtroCat)
    .filter(s => !filtroTipo || s.tipo === filtroTipo)
    .filter(s => !soloSinClasificar || (!s.marca && !s.tipo))
    .filter(s => !soloBajo || (s.minimo > 0 && s.cantidad <= s.minimo))
    .filter(s => !qNorm || `${s.nombre} ${s.marca || ""}`.toLowerCase().includes(qNorm));

  const catsVisibles = [...new Set(visibles.map(s => s.categoria))];

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 12 : 16, gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: C.t1 }}>Stock</span>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn v="ghost" sm={isMobile} onClick={() => openM("verQR", { path: "/precios", tituloQR: "Lista de precios pública", descripcionQR: "Apunta a la lista de precios pública, conectada con el stock activo. Imprimí este QR para las mesas o la recepción.", filenameQR: "lista-precios-qr.png" })}>QR / Lista pública</Btn>
        <Btn v="ghost" sm={isMobile} onClick={() => openM("moverStock", { tipo_mov: "entrada" })}>{isMobile ? "Reponer" : "Reponer / ajustar stock"}</Btn>
        {!isMobile && <Btn v="primary" onClick={() => openM("stockItem", { categoria: "pelotas", cantidad: "0", minimo: "0" })}>+ Producto</Btn>}
      </div>
    </div>

    {bajo.length > 0 && !soloBajo && <div style={{ background: C.redBg, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.red, border: `1px solid ${C.redBd}`, marginBottom: 14, cursor: "pointer" }} onClick={() => setSoloBajo(true)}>Stock bajo: {bajo.map(s => s.nombre).join(", ")}</div>}

    <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o marca..." style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, background: C.blue, color: C.t1, fontFamily: "var(--font-sans)", outline: "none", marginBottom: 10 }} />

    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: tipos.length > 0 ? 8 : 16 }}>
      <Chip active={!filtroCat} onClick={() => elegirCat("")}>Todas</Chip>
      {cats.map(c => <Chip key={c} active={filtroCat === c} onClick={() => elegirCat(c)}>{CAT_LABEL[c] || c}</Chip>)}
      <div style={{ width: 1, background: C.border, margin: "2px 2px" }} />
      {sinClasificar.length > 0 && <Chip active={soloSinClasificar} onClick={() => setSoloSinClasificar(v => !v)}>Sin clasificar ({sinClasificar.length})</Chip>}
      {bajo.length > 0 && <Chip active={soloBajo} onClick={() => setSoloBajo(v => !v)}>Stock bajo ({bajo.length})</Chip>}
      {inactivos.length > 0 && <Chip active={verInactivos} onClick={() => setVerInactivos(v => !v)}>Inactivos ({inactivos.length})</Chip>}
    </div>

    {tipos.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
      <Chip active={!filtroTipo} onClick={() => setFiltroTipo("")}>Todos los tipos</Chip>
      {tipos.map(t => <Chip key={t} active={filtroTipo === t} onClick={() => setFiltroTipo(filtroTipo === t ? "" : t)}>{t}</Chip>)}
    </div>}

    {visibles.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: C.t3, fontSize: 13 }}>Ningún producto coincide con el filtro.</div>}

    {catsVisibles.map(cat => <div key={cat} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{CAT_LABEL[cat] || cat}</div>
      <div style={{ display: "grid", gap: 8 }}>{visibles.filter(s => s.categoria === cat).map(s => {
        const b = s.minimo > 0 && s.cantidad <= s.minimo;
        const sinClasif = !s.marca && !s.tipo;
        const subtitulo = [s.marca, s.tipo, s.presentacion].filter(Boolean).join(" · ");
        return <div key={s.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", opacity: s.activo === false ? 0.6 : 1 }} onClick={() => openM("stockItem", { ...s })}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.t1 }}>{s.nombre}</div>
              {sinClasif && <Badge type="warn">Sin clasificar</Badge>}
              {s.activo === false && <Badge type="gray">Inactivo</Badge>}
            </div>
            {subtitulo && <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{subtitulo}</div>}
            {(s.precio_venta > 0 || s.precio_costo > 0) && <div style={{ fontSize: 12, color: C.t2, marginTop: 2 }}>Venta: {gs(s.precio_venta)} · Costo: {gs(s.precio_costo)}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: b ? C.red : C.t1 }}>{s.cantidad}</div><div style={{ fontSize: 10, color: C.t3 }}>unidades</div></div>{b && <Badge type="danger">Bajo</Badge>}</div>
        </div>; })}
      </div>
    </div>)}
  </div>;
}
