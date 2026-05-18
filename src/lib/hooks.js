import { useState, useEffect } from "react";

// ── HOOKS ──
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
};

export const useFeriados = () => {
  const [feriados, setFeriados] = useState([]);
  useEffect(() => {
    const yr = new Date().getFullYear();
    Promise.all([
      fetch(`https://date.nager.at/api/v3/PublicHolidays/${yr}/PY`).then(r=>r.json()).catch(()=>[]),
      fetch(`https://date.nager.at/api/v3/PublicHolidays/${yr+1}/PY`).then(r=>r.json()).catch(()=>[]),
    ]).then(([a,b])=>setFeriados([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])])).catch(()=>{});
  },[]);
  const getFeriado = fechaStr => feriados.find(f=>f.date===fechaStr)||null;
  return {feriados, getFeriado};
};
