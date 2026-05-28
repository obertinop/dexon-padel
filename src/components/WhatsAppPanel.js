import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../lib/constants.js";
import { gs, fmtFechaLegible } from "../lib/utils.js";
import { Avatar, WhatsAppIcon, Dialog } from "./UI.js";
import { apiHeaders, WORKER_URL } from "../lib/api.js";

const WhatsAppPanel = ({convAbierta, setConvAbierta, setWaNoLeidos, notify, isMobile}) => {
  const WA_GREEN = "#25D366";
  const WA_BG = "#0A1628";
  const WA_BUBBLE_OUT = "#0D3320";
  const WA_BUBBLE_IN = C.bgElev;
  const WA_BORDER = "rgba(255,255,255,0.06)";

  const [msgs, setMsgs] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(WORKER_URL+"/api/whatsapp/mensajes?limit=500");
      if (!r.ok) throw new Error(await r.text());
      const fresh = await r.json();
      setMsgs(prev => {
        // Preserve optimistic messages whose meta_id is not yet present in fresh
        const optimistic = prev.filter(m => typeof m.id === "string" && m.id.startsWith("opt-"));
        const realMetaIds = new Set((fresh || []).map(m => m.meta_id).filter(Boolean));
        const stillOptimistic = optimistic.filter(o => !o.meta_id || !realMetaIds.has(o.meta_id));
        return [...(fresh || []), ...stillOptimistic];
      });
      setHasLoaded(true);
    } catch (e) {
      setError(e.message);
      setHasLoaded(true);
    }
  }, []);

  // Initial load + poll every 10s while panel is mounted
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 10000);
    return () => clearInterval(id);
  }, [cargar]);

  // Scroll to bottom when conversation changes or new messages arrive
  useEffect(() => {
    if (convAbierta && chatRef.current) {
      const el = chatRef.current;
      const t = setTimeout(() => { el.scrollTop = el.scrollHeight; }, 80);
      return () => clearTimeout(t);
    }
  }, [convAbierta, msgs.length]);

  // Autofocus only on desktop (avoid forced keyboard popup on mobile)
  useEffect(() => {
    if (convAbierta && inputRef.current && !isMobile) inputRef.current.focus();
  }, [convAbierta, isMobile]);

  const marcarLeido = async (ids) => {
    if (!ids.length) return;
    try {
      await fetch(WORKER_URL+"/api/whatsapp/mensajes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    } catch { return; }
    setMsgs(p => p.map(m => ids.includes(m.id) ? { ...m, leido: true } : m));
    setWaNoLeidos(n => Math.max(0, n - ids.length));
  };

  const enviarRespuesta = async () => {
    if (!respuesta.trim() || !convAbierta) return;
    const texto = respuesta.trim();
    setRespuesta("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setEnviando(true);
    try {
      const r = await fetch(WORKER_URL+"/api/whatsapp/responder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telefono: convAbierta, mensaje: texto }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error enviando");
      const optimista = { id: `opt-${Date.now()}`, de: convAbierta, nombre: "DEXON", mensaje: texto, tipo: "text", meta_id: data.message_id || null, leido: true, direccion: "saliente", created_at: new Date().toISOString() };
      setMsgs(prev => [...prev, optimista]);
      setEnviado(true);
      setTimeout(() => setEnviado(false), 2000);
    } catch (e) {
      setRespuesta(texto);
      notify("Error al enviar: " + e.message, "error");
    } finally {
      setEnviando(false);
      if (inputRef.current && !isMobile) inputRef.current.focus();
    }
  };

  const eliminarConversacion = async () => {
    if (!confirmDelete) return;
    try {
      await fetch(WORKER_URL+"/api/whatsapp/mensajes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ de: confirmDelete.tel }) });
      setConvAbierta(null);
      setConfirmDelete(null);
      await cargar();
      notify("Conversación eliminada", "ok");
    } catch (e) {
      notify("Error al eliminar: " + e.message, "error");
      setConfirmDelete(null);
    }
  };

  const conversaciones = React.useMemo(() => {
    const mapa = {};
    msgs.forEach(m => {
      const tel = m.de;
      if (!mapa[tel]) mapa[tel] = { tel, nombre: m.nombre || tel, mensajes: [], noLeidos: 0, ultimo: null };
      mapa[tel].mensajes.push(m);
      if (!m.leido && m.direccion !== "saliente") mapa[tel].noLeidos++;
      if (!mapa[tel].ultimo || new Date(m.created_at) > new Date(mapa[tel].ultimo.created_at)) mapa[tel].ultimo = m;
    });
    return Object.values(mapa).sort((a, b) => new Date(b.ultimo.created_at) - new Date(a.ultimo.created_at));
  }, [msgs]);

  const noLeidosTotal = msgs.filter(m => !m.leido && m.direccion !== "saliente").length;
  const convActual = conversaciones.find(c => c.tel === convAbierta);
  const busNorm = busqueda.replace(/\D/g, "");
  const convsFiltradas = conversaciones.filter(c => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    if (c.nombre.toLowerCase().includes(q)) return true;
    if (busNorm.length >= 2 && c.tel.replace(/\D/g, "").includes(busNorm)) return true;
    return false;
  });

  const fmtHora = d => new Date(d).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  const fmtTs = d => {
    const hoy = new Date().toISOString().slice(0, 10);
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const ds = new Date(d).toISOString().slice(0, 10);
    if (ds === hoy) return fmtHora(d);
    if (ds === ayer) return "Ayer";
    return new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit" });
  };
  const fmtSep = d => {
    const hoy = new Date().toISOString().slice(0, 10);
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const ds = new Date(d).toISOString().slice(0, 10);
    if (ds === hoy) return "Hoy";
    if (ds === ayer) return "Ayer";
    return new Date(d).toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" });
  };
  const previewTexto = (m) => {
    if (!m) return "";
    if (m.tipo === "image") return "📷 Imagen";
    if (m.tipo === "sticker") return "🎟 Sticker";
    if (m.tipo === "audio" || m.tipo === "voice") return "🎤 Audio";
    if (m.tipo === "document") return "📄 Documento";
    if (m.tipo === "video") return "🎬 Video";
    const txt = m.mensaje || "";
    return txt.length > 45 ? txt.slice(0, 45) + "…" : txt;
  };

  const onImgLoad = () => {
    if (!chatRef.current) return;
    const el = chatRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 250;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  };

  const renderBurbuja = (m, showSep) => {
    const out = m.direccion === "saliente";
    return <React.Fragment key={m.id}>
      {showSep && <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 20px 10px" }}>
        <div style={{ flex: 1, height: "1px", background: WA_BORDER }} />
        <span style={{ fontSize: 11, color: C.t3, background: "rgba(255,255,255,0.04)", border: `1px solid ${WA_BORDER}`, padding: "3px 12px", borderRadius: 20, letterSpacing: 0.3 }}>{fmtSep(m.created_at)}</span>
        <div style={{ flex: 1, height: "1px", background: WA_BORDER }} />
      </div>}
      <div style={{ display: "flex", flexDirection: "column", alignItems: out ? "flex-end" : "flex-start", marginBottom: 2, padding: "0 12px" }}>
        <div style={{ maxWidth: "min(78%, 380px)", minWidth: 80 }}>
          <div style={{ background: out ? WA_BUBBLE_OUT : WA_BUBBLE_IN, borderRadius: out ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: m.tipo === "image" || m.tipo === "sticker" ? "4px" : "10px 14px", border: `1px solid ${out ? "rgba(37,211,102,0.15)" : WA_BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.25)", position: "relative", overflow: "hidden" }}>
            {(m.tipo === "audio" || m.tipo === "voice") && m.media_id
              ? <audio controls src={`/api/whatsapp/media?id=${m.media_id}`} style={{ width: "100%", maxWidth: 220, height: 36, accentColor: WA_GREEN, display: "block" }} />
              : m.tipo === "image" && m.media_id
                ? <img src={`/api/whatsapp/media?id=${m.media_id}`} alt="" loading="lazy" onLoad={onImgLoad}
                  style={{ width: "100%", maxWidth: 240, maxHeight: 240, height: "auto", borderRadius: 12, display: "block", cursor: "pointer", objectFit: "cover" }}
                  onClick={() => window.open(`/api/whatsapp/media?id=${m.media_id}`, "_blank")} />
                : m.tipo === "sticker" && m.media_id
                  ? <img src={`/api/whatsapp/media?id=${m.media_id}`} alt="sticker" loading="lazy" onLoad={onImgLoad}
                    style={{ width: 130, height: 130, objectFit: "contain", display: "block" }} />
                  : m.tipo === "document"
                    ? <a href={m.media_id ? `/api/whatsapp/media?id=${m.media_id}` : "#"} target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px", color: out ? "#c8f0d8" : C.t1, textDecoration: "none" }}>
                      <span style={{ fontSize: 22, width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📄</span>
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.mensaje || "Documento"}</span>
                    </a>
                    : m.tipo === "video" && m.media_id
                      ? <video controls src={`/api/whatsapp/media?id=${m.media_id}`} style={{ width: "100%", maxWidth: 260, borderRadius: 10, display: "block" }} />
                      : <p style={{ margin: 0, fontSize: 14, color: out ? "#c8f0d8" : C.t1, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.mensaje}</p>
            }
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: (m.tipo === "image" || m.tipo === "sticker") ? 2 : 5, padding: (m.tipo === "image" || m.tipo === "sticker") ? "0 6px 2px" : 0 }}>
              <span style={{ fontSize: 10, color: out ? "rgba(200,240,216,0.5)" : C.t3 }}>{fmtHora(m.created_at)}</span>
              {out && <span style={{ fontSize: 11, color: WA_GREEN, lineHeight: 1 }}>✓✓</span>}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>;
  };

  const msgsOrdenados = convActual ? convActual.mensajes.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : [];

  const sidebarJSX = <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bgCard, borderRight: `1px solid ${WA_BORDER}`, minHeight: 0 }}>
    <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${WA_BORDER}`, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <WhatsAppIcon size={18} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.t1, letterSpacing: -0.3 }}>WhatsApp</span>
          {noLeidosTotal > 0 && <span style={{ background: WA_GREEN, color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 700, lineHeight: "18px" }}>{noLeidosTotal}</span>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {noLeidosTotal > 0 && <button onClick={() => marcarLeido(msgs.filter(m => !m.leido && m.direccion !== "saliente").map(m => m.id))} title="Marcar todo leído" style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 13, padding: "4px 6px", borderRadius: 6, fontFamily: "var(--font-sans)" }}>✓✓</button>}
          <button onClick={cargar} title="Actualizar" style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 15, padding: "4px 6px", borderRadius: 6, fontFamily: "var(--font-sans)" }}>↻</button>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.t3, pointerEvents: "none" }}>🔍</span>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar nombre o teléfono…"
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 10px 10px 32px", background: C.bgElev, border: `1px solid ${WA_BORDER}`, borderRadius: 20, fontSize: 16, color: C.t1, fontFamily: "var(--font-sans)", outline: "none" }} />
        {busqueda && <button onClick={() => setBusqueda("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16, fontFamily: "var(--font-sans)" }}>×</button>}
      </div>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {!hasLoaded
        ? [...Array(4)].map((_, i) => <div key={i} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${WA_BORDER}`, opacity: 1 - i * 0.2 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.bgElev, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
            <div style={{ height: 12, borderRadius: 6, background: C.bgElev, width: "60%" }} />
            <div style={{ height: 10, borderRadius: 6, background: C.bgElev, width: "80%" }} />
          </div>
        </div>)
        : error
          ? <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>
            <button onClick={cargar} style={{ background: C.bgElev, color: C.t1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-sans)" }}>Reintentar</button>
          </div>
          : convsFiltradas.length === 0
            ? <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ marginBottom: 10, opacity: 0.3, display: "flex", justifyContent: "center" }}><WhatsAppIcon size={36} /></div>
              <div style={{ color: C.t3, fontSize: 13 }}>{busqueda ? "Sin resultados para \"" + busqueda + "\"" : "Aún no hay mensajes"}</div>
            </div>
            : convsFiltradas.map(conv => {
              const activa = conv.tel === convAbierta;
              const preview = previewTexto(conv.ultimo);
              const saliente = conv.ultimo?.direccion === "saliente";
              return <div key={conv.tel}
                onClick={() => { setConvAbierta(conv.tel); if (conv.noLeidos) marcarLeido(conv.mensajes.filter(m => !m.leido && m.direccion !== "saliente").map(m => m.id)); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: activa ? `rgba(37,211,102,0.07)` : C.bgCard, borderBottom: `1px solid ${WA_BORDER}`, borderLeft: `3px solid ${activa ? WA_GREEN : conv.noLeidos > 0 ? C.coral : "transparent"}`, transition: "background 0.12s" }}
                onMouseEnter={e => { if (!activa) e.currentTarget.style.background = C.bgElev; }}
                onMouseLeave={e => { if (!activa) e.currentTarget.style.background = C.bgCard; }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar nombre={conv.nombre} size={44} />
                  {conv.noLeidos > 0 && <div style={{ position: "absolute", top: -2, right: -2, background: WA_GREEN, color: "#fff", borderRadius: "50%", minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, padding: "0 3px", border: `2px solid ${C.bgCard}` }}>{conv.noLeidos}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontWeight: conv.noLeidos > 0 ? 700 : 500, fontSize: 14, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{conv.nombre}</span>
                    <span style={{ fontSize: 10.5, color: conv.noLeidos > 0 ? WA_GREEN : C.t3, flexShrink: 0 }}>{fmtTs(conv.ultimo.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: conv.noLeidos > 0 ? C.t2 : C.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 3 }}>
                    {saliente && <span style={{ color: WA_GREEN, fontSize: 11 }}>✓✓</span>}
                    <span>{preview || "—"}</span>
                  </div>
                </div>
              </div>;
            })
      }
    </div>
  </div>;

  const chatJSX = !convActual
    ? <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: `linear-gradient(135deg, ${WA_BG} 0%, #0d1b2e 100%)`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 20% 30%, rgba(37,211,102,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(37,211,102,0.05) 0%, transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(37,211,102,0.1)", border: `1px solid rgba(37,211,102,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}><WhatsAppIcon size={44} /></div>
      <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.t1, marginBottom: 6 }}>Centro de mensajes</div>
        <div style={{ fontSize: 13, color: C.t3, maxWidth: 280, lineHeight: 1.5 }}>Seleccioná una conversación de la izquierda para ver los mensajes.</div>
      </div>
    </div>
    : <div style={{ display: "flex", flexDirection: "column", height: "100%", background: WA_BG, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bgCard, borderBottom: `1px solid ${WA_BORDER}`, flexShrink: 0, boxShadow: "0 1px 8px rgba(0,0,0,0.2)" }}>
        {isMobile && <button onClick={() => setConvAbierta(null)} aria-label="Volver" style={{ background: "none", border: "none", color: C.t2, fontSize: 24, cursor: "pointer", padding: "0 4px", fontFamily: "var(--font-sans)", lineHeight: 1 }}>‹</button>}
        <Avatar nombre={convActual.nombre} size={isMobile ? 36 : 40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{convActual.nombre}</div>
          <div style={{ fontSize: 11, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{convActual.tel} · {convActual.mensajes.length} msj</div>
        </div>
        <button onClick={() => window.open(`https://wa.me/${convActual.tel.replace(/\D/g, "")}`, "_blank")} aria-label="Abrir en WhatsApp"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "8px 10px" : "7px 14px", borderRadius: 20, fontSize: 12.5, cursor: "pointer", background: WA_GREEN, color: "#fff", border: "none", fontFamily: "var(--font-sans)", fontWeight: 600, flexShrink: 0 }}>
          <WhatsAppIcon size={13} color="#fff" />
          {!isMobile && <span>WhatsApp</span>}
        </button>
        <button onClick={() => setConfirmDelete({ tel: convActual.tel, nombre: convActual.nombre })} aria-label="Eliminar conversación"
          style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: `1px solid ${WA_BORDER}`, color: C.t3, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-sans)" }}>
          🗑
        </button>
      </div>

      <div ref={chatRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "8px 0 12px", display: "flex", flexDirection: "column" }}>
        {msgsOrdenados.length === 0
          ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.t3, fontSize: 13 }}>Sin mensajes</div>
          : msgsOrdenados.map((m, i) => {
            const prev = msgsOrdenados[i - 1];
            const showSep = !prev || new Date(m.created_at).toISOString().slice(0, 10) !== new Date(prev.created_at).toISOString().slice(0, 10);
            return renderBurbuja(m, showSep);
          })
        }
      </div>

      <div style={{ padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", background: C.bgCard, borderTop: `1px solid ${WA_BORDER}`, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: C.bgElev, borderRadius: 26, padding: "6px 6px 6px 16px", border: `1px solid ${WA_BORDER}`, transition: "border-color 0.15s" }}>
          <textarea ref={inputRef} value={respuesta}
            onChange={e => { setRespuesta(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviarRespuesta(); } }}
            placeholder="Escribí un mensaje…"
            rows={1} disabled={enviando}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 16, color: C.t1, fontFamily: "var(--font-sans)", lineHeight: 1.5, padding: "6px 0", maxHeight: 120, overflowY: "auto" }} />
          <button onClick={enviarRespuesta} disabled={enviando || !respuesta.trim()} aria-label="Enviar"
            style={{ width: 40, height: 40, borderRadius: "50%", background: respuesta.trim() ? WA_GREEN : "transparent", color: respuesta.trim() ? "#fff" : C.t3, border: respuesta.trim() ? "none" : `1px solid ${WA_BORDER}`, cursor: respuesta.trim() ? "pointer" : "default", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s", fontFamily: "var(--font-sans)" }}>
            {enviando ? "…" : enviado ? "✓" : "➤"}
          </button>
        </div>
        {!isMobile && <div style={{ fontSize: 10, color: C.t3, textAlign: "center", marginTop: 5 }}>Ctrl + Enter para enviar</div>}
      </div>
    </div>;

  // Layout — mobile: full-bleed dvh; desktop: rounded card
  const mobileH = "calc(100dvh - 56px - env(safe-area-inset-top))";
  const desktopH = "calc(100vh - 48px)";

  return <>
    {isMobile
      ? (convAbierta && convActual
        ? <div style={{ height: mobileH, display: "flex", flexDirection: "column" }}>{chatJSX}</div>
        : <div style={{ height: mobileH, display: "flex", flexDirection: "column" }}>{sidebarJSX}</div>)
      : <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: desktopH, borderRadius: 16, overflow: "hidden", border: `1px solid ${WA_BORDER}`, boxShadow: "0 4px 40px rgba(0,0,0,0.4)" }}>
        {sidebarJSX}
        {chatJSX}
      </div>}
    <Dialog show={!!confirmDelete}
      title="Eliminar conversación"
      msg={`¿Eliminar la conversación con ${confirmDelete?.nombre}? Se perderá el historial local.`}
      onOk={eliminarConversacion}
      onCancel={() => setConfirmDelete(null)}
      okLabel="Eliminar" okV="danger" />
  </>;
};

// ── REENVIAR CONFIRMACIÓN ──
const ReenviarConfirmacionBtn = ({turno, cliente, notify}) => {
  const [sent,setSent] = useState(false);
  const [loading,setLoading] = useState(false);
  const enviar = async () => {
    setLoading(true);
    try {
      await fetch(WORKER_URL+"/api/whatsapp/enviar",{method:"POST",headers:apiHeaders(),
        body:JSON.stringify({tipo:"confirmacion_manual",nombre:cliente.nombre,telefono:cliente.telefono,
          fecha:fmtFechaLegible(turno.fecha),horarios:`${turno.hora}:00hs`,
          monto:gs(turno.precio),forma_pago:turno.metodo_pago==="transferencia"?"Transferencia bancaria":"Efectivo"})});
      setSent(true);
      if(notify) notify("Confirmación enviada por WhatsApp","ok");
      setTimeout(()=>setSent(false),4000);
    } catch(e) {
      if(notify) notify("No se pudo enviar","error");
    }
    setLoading(false);
  };
  return (
    <button onClick={enviar} disabled={loading||sent}
      style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${sent?"rgba(52,212,144,0.4)":C.greenBd}`,
        background:sent?"rgba(52,212,144,0.08)":"transparent",
        color:sent?C.green:C.t2,fontSize:13,fontWeight:600,cursor:loading||sent?"default":"pointer",
        fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        transition:"all 0.2s"}}>
      {loading?"Enviando..."
        :sent?<>✓ Confirmación enviada</>
        :<><WhatsAppIcon size={14} color={C.t2}/>Reenviar confirmación</>}
    </button>
  );
};

export { WhatsAppPanel, ReenviarConfirmacionBtn };
export default WhatsAppPanel;
