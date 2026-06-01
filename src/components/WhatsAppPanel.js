import React, { useState, useEffect, useCallback, useRef } from "react";
import { C, WA_QUICK_REPLIES, WA_REACTIONS } from "../lib/constants.js";
import { gs, fmtFechaLegible } from "../lib/utils.js";
import { Avatar, WhatsAppIcon, Dialog } from "./UI.js";
import { apiHeaders } from "../lib/api.js";
import { getSupabase } from "../lib/supabase.js";

const WA_GREEN = "#25D366";
const WA_BLUE = "#53BDEB";
const WA_BG = "#0A1628";
const WA_BUBBLE_OUT = "#0D3320";
const WA_BORDER = "rgba(255,255,255,0.06)";
const DAY = 86400000;

const WhatsAppPanel = ({ convAbierta, setConvAbierta, setWaNoLeidos, notify, isMobile, token, clientes = [], turnos = [] }) => {
  const WA_BUBBLE_IN = C.bgElev;

  const [msgs, setMsgs] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [replyTo, setReplyTo] = useState(null);          // mensaje citado
  const [msgMenu, setMsgMenu] = useState(null);          // meta_id con menú abierto
  const [cannedOpen, setCannedOpen] = useState(false);   // respuestas rápidas
  const [convSearch, setConvSearch] = useState("");      // buscar dentro de la conversación
  const [showConvSearch, setShowConvSearch] = useState(false);
  const [tpl, setTpl] = useState({ open: false, loading: false, configured: true, list: [], sel: null, params: [], sending: false });
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const seenIds = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Carga inicial (REST) ──
  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch("/api/whatsapp/mensajes?limit=500", { headers: apiHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const fresh = await r.json();
      setMsgs(prev => {
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

  // Merge de una fila que llega por Realtime (INSERT/UPDATE).
  const mergeRow = useCallback(row => {
    setMsgs(prev => {
      const byId = prev.findIndex(m => m.id === row.id);
      if (byId >= 0) { const n = [...prev]; n[byId] = { ...n[byId], ...row }; return n; }
      const byMeta = row.meta_id ? prev.findIndex(m => m.meta_id === row.meta_id) : -1;
      if (byMeta >= 0) { const n = [...prev]; n[byMeta] = { ...n[byMeta], ...row }; return n; }
      return [...prev, row];
    });
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Realtime (con poll lento de respaldo) ──
  useEffect(() => {
    let channel = null;
    if (token) {
      const sb = getSupabase();
      sb.realtime.setAuth(token);
      channel = sb.channel("wa-inbox")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_mensajes" }, p => mergeRow(p.new))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_mensajes" }, p => mergeRow(p.new))
        .subscribe();
    }
    const id = setInterval(cargar, token ? 25000 : 10000); // respaldo
    return () => { clearInterval(id); if (channel) getSupabase().removeChannel(channel); };
  }, [cargar, mergeRow, token]);

  // Mantener el badge global sincronizado.
  const noLeidosTotal = msgs.filter(m => !m.leido && m.direccion !== "saliente").length;
  useEffect(() => { setWaNoLeidos(noLeidosTotal); }, [noLeidosTotal, setWaNoLeidos]);

  useEffect(() => {
    if (convAbierta && chatRef.current) {
      const el = chatRef.current;
      const t = setTimeout(() => { el.scrollTop = el.scrollHeight; }, 80);
      return () => clearTimeout(t);
    }
  }, [convAbierta, msgs.length]);

  useEffect(() => { if (convAbierta && inputRef.current && !isMobile) inputRef.current.focus(); }, [convAbierta, isMobile]);
  useEffect(() => { setReplyTo(null); setMsgMenu(null); setCannedOpen(false); setConvSearch(""); setShowConvSearch(false); }, [convAbierta]);

  const marcarLeido = async (ids) => {
    if (!ids.length) return;
    try {
      await fetch("/api/whatsapp/mensajes", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ ids }) });
    } catch { return; }
    setMsgs(p => p.map(m => ids.includes(m.id) ? { ...m, leido: true } : m));
  };

  // ── Envío de texto ──
  const enviarRespuesta = async () => {
    if (!respuesta.trim() || !convAbierta) return;
    const texto = respuesta.trim();
    const ctx = replyTo?.meta_id || null;
    setRespuesta(""); setReplyTo(null);
    if (inputRef.current) inputRef.current.style.height = "auto";
    setEnviando(true);
    try {
      const r = await fetch("/api/whatsapp/responder", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ telefono: convAbierta, mensaje: texto, context_message_id: ctx }) });
      const data = await r.json();
      if (!r.ok) {
        if (data.code === "window_closed") { setRespuesta(texto); abrirTemplates(); notify("Ventana de 24h cerrada — enviá una plantilla", "error"); return; }
        throw new Error(data.error || "Error enviando");
      }
      pushOptimista({ mensaje: texto, tipo: "text", meta_id: data.message_id, replied_to: ctx });
      flashEnviado();
    } catch (e) {
      setRespuesta(texto);
      notify("Error al enviar: " + e.message, "error");
    } finally {
      setEnviando(false);
      if (inputRef.current && !isMobile) inputRef.current.focus();
    }
  };

  // ── Envío de adjunto ──
  const enviarMedia = async (file) => {
    if (!file || !convAbierta) return;
    if (file.size > 5 * 1024 * 1024) { notify("El archivo supera los 5MB", "error"); return; }
    const esImg = file.type.startsWith("image/");
    setEnviando(true);
    try {
      const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
      const up = await fetch("/api/whatsapp/upload", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ data: dataUrl, mime: file.type, filename: file.name }) });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Error subiendo");
      const caption = respuesta.trim() || null;
      const r = await fetch("/api/whatsapp/responder", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ telefono: convAbierta, tipo: esImg ? "imagen" : "documento", media_id: upData.media_id, caption }) });
      const data = await r.json();
      if (!r.ok) {
        if (data.code === "window_closed") { abrirTemplates(); notify("Ventana de 24h cerrada — enviá una plantilla", "error"); return; }
        throw new Error(data.error || "Error enviando");
      }
      setRespuesta("");
      pushOptimista({ mensaje: caption || (esImg ? "[Imagen]" : file.name), tipo: esImg ? "image" : "document", media_id: upData.media_id, meta_id: data.message_id });
      flashEnviado();
    } catch (e) {
      notify("Error: " + e.message, "error");
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Reacción ──
  const enviarReaccion = async (m, emoji) => {
    setMsgMenu(null);
    const nuevo = m.reaccion === emoji ? "" : emoji;
    setMsgs(p => p.map(x => x.id === m.id ? { ...x, reaccion: nuevo || null } : x));
    try {
      await fetch("/api/whatsapp/responder", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ telefono: convAbierta, tipo: "reaccion", context_message_id: m.meta_id, emoji: nuevo }) });
    } catch (e) { notify("No se pudo reaccionar", "error"); }
  };

  // ── Plantillas (ventana cerrada) ──
  const abrirTemplates = async () => {
    setTpl(t => ({ ...t, open: true, loading: true }));
    try {
      const r = await fetch("/api/whatsapp/templates", { headers: apiHeaders() });
      const d = await r.json();
      setTpl(t => ({ ...t, loading: false, configured: d.configured !== false, list: d.templates || [] }));
    } catch {
      setTpl(t => ({ ...t, loading: false, configured: false, list: [] }));
    }
  };
  const enviarTemplate = async () => {
    if (!tpl.sel) return;
    setTpl(t => ({ ...t, sending: true }));
    try {
      const r = await fetch("/api/whatsapp/templates", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ telefono: convAbierta, name: tpl.sel.name, language: tpl.sel.language, params: tpl.params }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      pushOptimista({ mensaje: `📋 Plantilla: ${tpl.sel.name}`, tipo: "text", meta_id: d.message_id });
      setTpl({ open: false, loading: false, configured: true, list: [], sel: null, params: [], sending: false });
      notify("Plantilla enviada", "ok");
    } catch (e) {
      notify("Error: " + e.message, "error");
      setTpl(t => ({ ...t, sending: false }));
    }
  };

  const pushOptimista = ({ mensaje, tipo, meta_id, media_id, replied_to }) => {
    setMsgs(prev => [...prev, { id: `opt-${Date.now()}`, de: convAbierta, nombre: "DEXON", mensaje, tipo, media_id: media_id || null, meta_id: meta_id || null, replied_to: replied_to || null, leido: true, direccion: "saliente", estado: "enviado", created_at: new Date().toISOString() }]);
  };
  const flashEnviado = () => { setEnviado(true); setTimeout(() => setEnviado(false), 1500); };

  const eliminarConversacion = async () => {
    if (!confirmDelete) return;
    try {
      await fetch("/api/whatsapp/mensajes", { method: "DELETE", headers: apiHeaders(), body: JSON.stringify({ de: confirmDelete.tel }) });
      setConvAbierta(null); setConfirmDelete(null); await cargar();
      notify("Conversación eliminada", "ok");
    } catch (e) {
      notify("Error al eliminar: " + e.message, "error"); setConfirmDelete(null);
    }
  };

  const conversaciones = React.useMemo(() => {
    const mapa = {};
    msgs.forEach(m => {
      const tel = m.de;
      if (!mapa[tel]) mapa[tel] = { tel, nombre: m.nombre || tel, mensajes: [], noLeidos: 0, ultimo: null, lastInbound: null };
      mapa[tel].mensajes.push(m);
      if (!m.leido && m.direccion !== "saliente") mapa[tel].noLeidos++;
      if (m.direccion !== "saliente" && (!mapa[tel].lastInbound || new Date(m.created_at) > new Date(mapa[tel].lastInbound))) mapa[tel].lastInbound = m.created_at;
      if (!mapa[tel].ultimo || new Date(m.created_at) > new Date(mapa[tel].ultimo.created_at)) mapa[tel].ultimo = m;
    });
    return Object.values(mapa).sort((a, b) => new Date(b.ultimo.created_at) - new Date(a.ultimo.created_at));
  }, [msgs]);

  const convActual = conversaciones.find(c => c.tel === convAbierta);
  const windowOpen = convActual?.lastInbound ? (Date.now() - new Date(convActual.lastInbound).getTime() < DAY) : false;
  const horasRestantes = convActual?.lastInbound ? Math.max(0, Math.ceil((DAY - (Date.now() - new Date(convActual.lastInbound).getTime())) / 3600000)) : 0;

  // ── Ficha del cliente (match por teléfono, tolera código de país) ──
  const clienteActual = React.useMemo(() => {
    if (!convAbierta) return null;
    const tel = convAbierta.replace(/\D/g, "");
    return clientes.find(c => {
      const ct = (c.telefono || "").replace(/\D/g, "");
      return ct && (ct === tel || (ct.length >= 8 && tel.length >= 8 && ct.slice(-8) === tel.slice(-8)));
    }) || null;
  }, [convAbierta, clientes]);

  const turnoCliente = React.useMemo(() => {
    if (!clienteActual) return null;
    const hoyStr = new Date().toISOString().slice(0, 10);
    return turnos
      .filter(t => t.cliente_id === clienteActual.id && t.fecha >= hoyStr && t.estado !== "cancelado")
      .sort((a, b) => (a.fecha + String(a.hora).padStart(2, "0")).localeCompare(b.fecha + String(b.hora).padStart(2, "0")))[0] || null;
  }, [clienteActual, turnos]);

  // ── Avisos del navegador + sonido al llegar un mensaje nuevo ──
  useEffect(() => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {}); }, []);

  const beep = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.start(); o.stop(ctx.currentTime + 0.26);
    } catch {}
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    if (seenIds.current === null) { seenIds.current = new Set(msgs.map(m => m.id)); return; }
    const nuevos = msgs.filter(m => !seenIds.current.has(m.id) && m.direccion !== "saliente");
    msgs.forEach(m => seenIds.current.add(m.id));
    if (!nuevos.length) return;
    const ult = nuevos[nuevos.length - 1];
    beep();
    if ("Notification" in window && Notification.permission === "granted" && (document.hidden || convAbierta !== ult.de)) {
      try {
        const n = new Notification(`💬 ${ult.nombre || ult.de}`, { body: (ult.mensaje || "Nuevo mensaje").slice(0, 80), tag: "wa-" + ult.de });
        n.onclick = () => { window.focus(); setConvAbierta(ult.de); n.close(); };
      } catch {}
    }
  }, [msgs, hasLoaded, beep, convAbierta, setConvAbierta]);

  // Reintentar un mensaje saliente fallido.
  const reintentar = async (m) => {
    if (m.tipo !== "text" || !m.mensaje) { notify("Solo se puede reintentar texto", "info"); return; }
    setEnviando(true);
    try {
      const r = await fetch("/api/whatsapp/responder", { method: "POST", headers: apiHeaders(), body: JSON.stringify({ telefono: convAbierta, mensaje: m.mensaje, context_message_id: m.replied_to || null }) });
      const data = await r.json();
      if (!r.ok) { if (data.code === "window_closed") abrirTemplates(); throw new Error(data.error || "Error"); }
      pushOptimista({ mensaje: m.mensaje, tipo: "text", meta_id: data.message_id });
      flashEnviado();
    } catch (e) { notify("No se pudo reenviar: " + e.message, "error"); }
    finally { setEnviando(false); }
  };

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
    const ayer = new Date(Date.now() - DAY).toISOString().slice(0, 10);
    const ds = new Date(d).toISOString().slice(0, 10);
    if (ds === hoy) return fmtHora(d);
    if (ds === ayer) return "Ayer";
    return new Date(d).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit" });
  };
  const fmtSep = d => {
    const hoy = new Date().toISOString().slice(0, 10);
    const ayer = new Date(Date.now() - DAY).toISOString().slice(0, 10);
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

  // Tilde de estado (sólo salientes).
  const tick = (m) => {
    if (m.direccion !== "saliente") return null;
    if (typeof m.id === "string" && m.id.startsWith("opt-")) return <span style={{ fontSize: 10, color: C.t3 }}>🕓</span>;
    if (m.estado === "fallido") return <span title={m.error_msg || "No entregado"} style={{ fontSize: 11, color: C.red, cursor: "help" }}>⚠</span>;
    if (m.estado === "leido") return <span style={{ fontSize: 11, color: WA_BLUE, lineHeight: 1 }}>✓✓</span>;
    if (m.estado === "entregado") return <span style={{ fontSize: 11, color: C.t3, lineHeight: 1 }}>✓✓</span>;
    return <span style={{ fontSize: 11, color: C.t3, lineHeight: 1 }}>✓</span>;
  };

  const msgsOrdenados = convActual ? convActual.mensajes.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : [];
  const msgByMeta = React.useMemo(() => { const m = {}; msgsOrdenados.forEach(x => { if (x.meta_id) m[x.meta_id] = x; }); return m; }, [msgsOrdenados]);
  const msgsVisibles = convSearch.trim() ? msgsOrdenados.filter(m => (m.mensaje || "").toLowerCase().includes(convSearch.trim().toLowerCase())) : msgsOrdenados;

  const renderMediaContent = (m, out) => {
    if ((m.tipo === "audio" || m.tipo === "voice") && m.media_id)
      return <audio controls src={`/api/whatsapp/media?id=${m.media_id}`} style={{ width: "100%", maxWidth: 220, height: 36, accentColor: WA_GREEN, display: "block" }} />;
    if (m.tipo === "image" && m.media_id)
      return <img src={`/api/whatsapp/media?id=${m.media_id}`} alt="" loading="lazy" onLoad={onImgLoad} style={{ width: "100%", maxWidth: 240, maxHeight: 240, height: "auto", borderRadius: 12, display: "block", cursor: "pointer", objectFit: "cover" }} onClick={() => window.open(`/api/whatsapp/media?id=${m.media_id}`, "_blank")} />;
    if (m.tipo === "sticker" && m.media_id)
      return <img src={`/api/whatsapp/media?id=${m.media_id}`} alt="sticker" loading="lazy" onLoad={onImgLoad} style={{ width: 130, height: 130, objectFit: "contain", display: "block" }} />;
    if (m.tipo === "document")
      return <a href={m.media_id ? `/api/whatsapp/media?id=${m.media_id}` : "#"} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px", color: out ? "#c8f0d8" : C.t1, textDecoration: "none" }}>
        <span style={{ fontSize: 22, width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📄</span>
        <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.mensaje || "Documento"}</span>
      </a>;
    if (m.tipo === "video" && m.media_id)
      return <video controls src={`/api/whatsapp/media?id=${m.media_id}`} style={{ width: "100%", maxWidth: 260, borderRadius: 10, display: "block" }} />;
    return <p style={{ margin: 0, fontSize: 14, color: out ? "#c8f0d8" : C.t1, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.mensaje}</p>;
  };

  const renderBurbuja = (m, showSep) => {
    const out = m.direccion === "saliente";
    const esMedia = m.tipo === "image" || m.tipo === "sticker";
    const quoted = m.replied_to ? msgByMeta[m.replied_to] : null;
    const menuOpen = msgMenu === m.meta_id && !!m.meta_id;
    return <React.Fragment key={m.id}>
      {showSep && <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 20px 10px" }}>
        <div style={{ flex: 1, height: "1px", background: WA_BORDER }} />
        <span style={{ fontSize: 11, color: C.t3, background: "rgba(255,255,255,0.04)", border: `1px solid ${WA_BORDER}`, padding: "3px 12px", borderRadius: 20, letterSpacing: 0.3 }}>{fmtSep(m.created_at)}</span>
        <div style={{ flex: 1, height: "1px", background: WA_BORDER }} />
      </div>}
      <div style={{ display: "flex", flexDirection: "column", alignItems: out ? "flex-end" : "flex-start", marginBottom: m.reaccion ? 12 : 2, padding: "0 12px" }}>
        <div style={{ maxWidth: "min(78%, 380px)", minWidth: 80, position: "relative" }}>
          <div style={{ background: out ? WA_BUBBLE_OUT : WA_BUBBLE_IN, borderRadius: out ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: esMedia ? "4px" : "10px 14px", border: `1px solid ${out ? "rgba(37,211,102,0.15)" : WA_BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.25)", position: "relative", overflow: "hidden" }}>
            {quoted && <div style={{ borderLeft: `3px solid ${WA_GREEN}`, background: "rgba(0,0,0,0.18)", borderRadius: 6, padding: "5px 8px", marginBottom: 6, fontSize: 12 }}>
              <div style={{ color: WA_GREEN, fontWeight: 600, fontSize: 11, marginBottom: 1 }}>{quoted.direccion === "saliente" ? "Vos" : quoted.nombre}</div>
              <div style={{ color: C.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{previewTexto(quoted)}</div>
            </div>}
            {renderMediaContent(m, out)}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: esMedia ? 2 : 5, padding: esMedia ? "0 6px 2px" : 0 }}>
              <span style={{ fontSize: 10, color: out ? "rgba(200,240,216,0.5)" : C.t3 }}>{fmtHora(m.created_at)}</span>
              {tick(m)}
            </div>
            {out && m.estado === "fallido" && <button onClick={() => reintentar(m)} style={{ marginTop: 5, background: "rgba(240,96,96,0.12)", border: `1px solid ${C.redBd}`, color: C.red, borderRadius: 8, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" }}>↻ Reintentar</button>}
          </div>
          {/* Reacción sobre la burbuja */}
          {m.reaccion && <span style={{ position: "absolute", bottom: -10, [out ? "right" : "left"]: 8, background: C.bgCard, border: `1px solid ${WA_BORDER}`, borderRadius: 12, padding: "1px 5px", fontSize: 12, boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>{m.reaccion}</span>}
          {/* Botón de acciones */}
          {m.meta_id && <button onClick={() => setMsgMenu(menuOpen ? null : m.meta_id)} aria-label="Acciones"
            style={{ position: "absolute", top: 2, [out ? "left" : "right"]: -26, width: 22, height: 22, borderRadius: "50%", background: C.bgCard, border: `1px solid ${WA_BORDER}`, color: C.t3, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.7, fontFamily: "var(--font-sans)" }}>⋯</button>}
          {/* Menú: responder + reaccionar (reaccionás a los mensajes del cliente) */}
          {menuOpen && <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, justifyContent: out ? "flex-end" : "flex-start", flexWrap: "wrap" }}>
            <button onClick={() => { setReplyTo(m); setMsgMenu(null); inputRef.current?.focus(); }} style={chipBtn}>↩ Responder</button>
            {!out && WA_REACTIONS.map(e => <button key={e} onClick={() => enviarReaccion(m, e)} style={{ ...chipBtn, padding: "3px 7px", fontSize: 15 }}>{e}</button>)}
          </div>}
        </div>
      </div>
    </React.Fragment>;
  };

  const chipBtn = { background: C.bgElev, border: `1px solid ${WA_BORDER}`, borderRadius: 14, padding: "4px 10px", fontSize: 12, color: C.t2, cursor: "pointer", fontFamily: "var(--font-sans)" };

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
                    {saliente && <span style={{ color: WA_GREEN, fontSize: 11 }}>✓</span>}
                    <span>{preview || "—"}</span>
                  </div>
                </div>
              </div>;
            })
      }
    </div>
  </div>;

  const composerJSX = <div style={{ padding: "10px 12px calc(10px + env(safe-area-inset-bottom))", background: C.bgCard, borderTop: `1px solid ${WA_BORDER}`, flexShrink: 0 }}>
    {/* Cita activa */}
    {replyTo && <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bgElev, borderLeft: `3px solid ${WA_GREEN}`, borderRadius: 6, padding: "6px 10px", marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: WA_GREEN, fontWeight: 600 }}>Respondiendo a {replyTo.direccion === "saliente" ? "vos" : convActual.nombre}</div>
        <div style={{ fontSize: 12, color: C.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewTexto(replyTo)}</div>
      </div>
      <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16, fontFamily: "var(--font-sans)" }}>×</button>
    </div>}

    {/* Respuestas rápidas */}
    {cannedOpen && <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, maxHeight: 180, overflowY: "auto" }}>
      {WA_QUICK_REPLIES.map((q, i) => <button key={i} onClick={() => { setRespuesta(r => r ? r + " " + q : q); setCannedOpen(false); inputRef.current?.focus(); }}
        style={{ textAlign: "left", background: C.bgElev, border: `1px solid ${WA_BORDER}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, color: C.t2, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{q}</button>)}
    </div>}

    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: C.bgElev, borderRadius: 26, padding: "6px 6px 6px 10px", border: `1px solid ${WA_BORDER}` }}>
      <button onClick={() => setCannedOpen(o => !o)} title="Respuestas rápidas" style={iconBtn}>⚡</button>
      <button onClick={() => fileRef.current?.click()} title="Adjuntar" disabled={enviando} style={iconBtn}>📎</button>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => enviarMedia(e.target.files?.[0])} />
      <textarea ref={inputRef} value={respuesta}
        onChange={e => { setRespuesta(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviarRespuesta(); } }}
        placeholder="Escribí un mensaje…" rows={1} disabled={enviando}
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 16, color: C.t1, fontFamily: "var(--font-sans)", lineHeight: 1.5, padding: "6px 0", maxHeight: 120, overflowY: "auto" }} />
      <button onClick={enviarRespuesta} disabled={enviando || !respuesta.trim()} aria-label="Enviar"
        style={{ width: 40, height: 40, borderRadius: "50%", background: respuesta.trim() ? WA_GREEN : "transparent", color: respuesta.trim() ? "#fff" : C.t3, border: respuesta.trim() ? "none" : `1px solid ${WA_BORDER}`, cursor: respuesta.trim() ? "pointer" : "default", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s", fontFamily: "var(--font-sans)" }}>
        {enviando ? "…" : enviado ? "✓" : "➤"}
      </button>
    </div>
    {!isMobile && <div style={{ fontSize: 10, color: C.t3, textAlign: "center", marginTop: 5 }}>Ctrl + Enter para enviar</div>}
  </div>;

  const ventanaCerradaJSX = <div style={{ padding: "12px 14px calc(12px + env(safe-area-inset-bottom))", background: C.bgCard, borderTop: `1px solid ${WA_BORDER}`, flexShrink: 0 }}>
    <div style={{ background: "rgba(245,192,96,0.08)", border: `1px solid ${C.yellowBd}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 22 }}>⏰</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.yellow }}>Ventana de 24h cerrada</div>
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2, lineHeight: 1.4 }}>El cliente no escribe hace +24h. Solo podés enviar una plantilla aprobada para reabrir la conversación.</div>
      </div>
      <button onClick={abrirTemplates} style={{ background: WA_GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", flexShrink: 0 }}>Enviar plantilla</button>
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
    : <div style={{ display: "flex", flexDirection: "column", height: "100%", background: WA_BG, minHeight: 0, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bgCard, borderBottom: `1px solid ${WA_BORDER}`, flexShrink: 0, boxShadow: "0 1px 8px rgba(0,0,0,0.2)" }}>
        {isMobile && <button onClick={() => setConvAbierta(null)} aria-label="Volver" style={{ background: "none", border: "none", color: C.t2, fontSize: 24, cursor: "pointer", padding: "0 4px", fontFamily: "var(--font-sans)", lineHeight: 1 }}>‹</button>}
        <Avatar nombre={convActual.nombre} size={isMobile ? 36 : 40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{convActual.nombre}</div>
          <div style={{ fontSize: 11, color: windowOpen ? WA_GREEN : C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {convActual.tel} · {windowOpen ? `ventana abierta (${horasRestantes}h)` : "ventana cerrada"}
          </div>
        </div>
        <button onClick={() => { setShowConvSearch(s => !s); setConvSearch(""); }} aria-label="Buscar en la conversación"
          style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: `1px solid ${WA_BORDER}`, color: showConvSearch ? WA_GREEN : C.t3, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-sans)" }}>🔍</button>
        <button onClick={() => window.open(`https://wa.me/${convActual.tel.replace(/\D/g, "")}`, "_blank")} aria-label="Abrir en WhatsApp"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "8px 10px" : "7px 14px", borderRadius: 20, fontSize: 12.5, cursor: "pointer", background: WA_GREEN, color: "#fff", border: "none", fontFamily: "var(--font-sans)", fontWeight: 600, flexShrink: 0 }}>
          <WhatsAppIcon size={13} color="#fff" />
          {!isMobile && <span>WhatsApp</span>}
        </button>
        <button onClick={() => setConfirmDelete({ tel: convActual.tel, nombre: convActual.nombre })} aria-label="Eliminar conversación"
          style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: `1px solid ${WA_BORDER}`, color: C.t3, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-sans)" }}>🗑</button>
      </div>

      {/* Ficha del cliente vinculado */}
      {clienteActual && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "rgba(37,211,102,0.05)", borderBottom: `1px solid ${WA_BORDER}`, flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.t2 }}>👤 <strong style={{ color: C.t1 }}>{clienteActual.nombre}</strong></span>
        {clienteActual.saldo_favor > 0 && <span style={{ fontSize: 11, color: C.green }}>Saldo {gs(clienteActual.saldo_favor)}</span>}
        {turnoCliente
          ? <span style={{ fontSize: 11, color: C.t2 }}>📅 {fmtFechaLegible(turnoCliente.fecha)} · {turnoCliente.hora}:00 · {turnoCliente.estado}</span>
          : <span style={{ fontSize: 11, color: C.t3 }}>Sin turnos próximos</span>}
        {turnoCliente && <div style={{ marginLeft: "auto", minWidth: 200 }}><ReenviarConfirmacionBtn turno={turnoCliente} cliente={clienteActual} notify={notify} /></div>}
      </div>}

      {/* Buscar dentro de la conversación */}
      {showConvSearch && <div style={{ padding: "8px 12px", background: C.bgCard, borderBottom: `1px solid ${WA_BORDER}`, flexShrink: 0 }}>
        <input autoFocus value={convSearch} onChange={e => setConvSearch(e.target.value)} placeholder="Buscar en esta conversación…"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", background: C.bgElev, border: `1px solid ${WA_BORDER}`, borderRadius: 18, fontSize: 15, color: C.t1, fontFamily: "var(--font-sans)", outline: "none" }} />
      </div>}

      <div ref={chatRef} onClick={() => msgMenu && setMsgMenu(null)} style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "8px 0 12px", display: "flex", flexDirection: "column" }}>
        {msgsVisibles.length === 0
          ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.t3, fontSize: 13 }}>{convSearch.trim() ? "Sin coincidencias" : "Sin mensajes"}</div>
          : msgsVisibles.map((m, i) => {
            const prev = msgsVisibles[i - 1];
            const showSep = !prev || new Date(m.created_at).toISOString().slice(0, 10) !== new Date(prev.created_at).toISOString().slice(0, 10);
            return renderBurbuja(m, showSep);
          })
        }
      </div>

      {windowOpen ? composerJSX : ventanaCerradaJSX}

      {/* Overlay de plantillas */}
      {tpl.open && <div style={{ position: "absolute", inset: 0, background: "rgba(6,13,26,0.92)", backdropFilter: "blur(3px)", zIndex: 20, display: "flex", flexDirection: "column", padding: 16, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>Enviar plantilla</span>
          <button onClick={() => setTpl(t => ({ ...t, open: false, sel: null, params: [] }))} style={{ background: C.bgElev, border: `1px solid ${WA_BORDER}`, color: C.t2, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>×</button>
        </div>
        {tpl.loading ? <div style={{ color: C.t3, fontSize: 13, textAlign: "center", padding: 30 }}>Cargando plantillas…</div>
          : !tpl.configured ? <div style={{ color: C.t3, fontSize: 13, lineHeight: 1.6, background: C.bgCard, border: `1px solid ${WA_BORDER}`, borderRadius: 12, padding: 16 }}>
            Para listar tus plantillas configurá <code style={{ color: C.yellow }}>WHATSAPP_WABA_ID</code> en las variables de entorno. Mientras tanto, podés abrir el chat directo en WhatsApp con el botón verde de arriba.
          </div>
            : tpl.list.length === 0 ? <div style={{ color: C.t3, fontSize: 13, textAlign: "center", padding: 30 }}>No hay plantillas aprobadas.</div>
              : !tpl.sel ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tpl.list.map(t => <button key={t.name} onClick={() => setTpl(s => ({ ...s, sel: t, params: Array(t.vars).fill("") }))}
                  style={{ textAlign: "left", background: C.bgCard, border: `1px solid ${WA_BORDER}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, marginBottom: 3 }}>{t.name} <span style={{ fontSize: 10, color: C.t3, fontWeight: 400 }}>· {t.category} · {t.language}</span></div>
                  <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.4 }}>{t.body}</div>
                </button>)}
              </div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: C.bgCard, border: `1px solid ${WA_BORDER}`, borderRadius: 12, padding: 14, fontSize: 13, color: C.t2, lineHeight: 1.5 }}>{tpl.sel.body}</div>
                  {tpl.params.map((p, i) => <input key={i} value={p} onChange={e => setTpl(s => { const np = [...s.params]; np[i] = e.target.value; return { ...s, params: np }; })} placeholder={`Variable {{${i + 1}}}`}
                    style={{ background: C.bgElev, border: `1px solid ${WA_BORDER}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: C.t1, fontFamily: "var(--font-sans)", outline: "none" }} />)}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button onClick={() => setTpl(s => ({ ...s, sel: null, params: [] }))} style={{ ...chipBtn, padding: "10px 16px" }}>‹ Volver</button>
                    <button onClick={enviarTemplate} disabled={tpl.sending || tpl.params.some(p => !p.trim())} style={{ flex: 1, background: WA_GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 700, cursor: tpl.sending ? "wait" : "pointer", fontFamily: "var(--font-sans)", opacity: tpl.params.some(p => !p.trim()) ? 0.5 : 1 }}>{tpl.sending ? "Enviando…" : "Enviar plantilla"}</button>
                  </div>
                </div>}
      </div>}
    </div>;

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

const iconBtn = { width: 34, height: 34, borderRadius: "50%", background: "transparent", border: "none", color: C.t3, cursor: "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "var(--font-sans)" };

// ── REENVIAR CONFIRMACIÓN ──
const ReenviarConfirmacionBtn = ({ turno, cliente, notify }) => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const enviar = async () => {
    setLoading(true);
    try {
      await fetch("/api/whatsapp/enviar", { method: "POST", headers: apiHeaders(),
        body: JSON.stringify({ tipo: "confirmacion_manual", nombre: cliente.nombre, telefono: cliente.telefono,
          fecha: fmtFechaLegible(turno.fecha), horarios: `${turno.hora}:00hs`,
          monto: gs(turno.precio), forma_pago: turno.metodo_pago === "transferencia" ? "Transferencia bancaria" : "Efectivo" }) });
      setSent(true);
      if (notify) notify("Confirmación enviada por WhatsApp", "ok");
      setTimeout(() => setSent(false), 4000);
    } catch (e) {
      if (notify) notify("No se pudo enviar", "error");
    }
    setLoading(false);
  };
  return (
    <button onClick={enviar} disabled={loading || sent}
      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${sent ? "rgba(52,212,144,0.4)" : C.greenBd}`,
        background: sent ? "rgba(52,212,144,0.08)" : "transparent",
        color: sent ? C.green : C.t2, fontSize: 13, fontWeight: 600, cursor: loading || sent ? "default" : "pointer",
        fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
      {loading ? "Enviando..."
        : sent ? <>✓ Confirmación enviada</>
          : <><WhatsAppIcon size={14} color={C.t2} />Reenviar confirmación</>}
    </button>
  );
};

export { WhatsAppPanel, ReenviarConfirmacionBtn };
export default WhatsAppPanel;
