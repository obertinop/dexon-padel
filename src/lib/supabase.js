// src/lib/supabase.js
// Cliente Supabase para suscripciones en tiempo real (WhatsApp inbox).
// Sólo se usa para Realtime; el resto de la app sigue usando lib/api.js (REST).
import { createClient } from "@supabase/supabase-js";
import { SUPA_URL, SUPA_KEY } from "./constants.js";

let _client = null;

export const getSupabase = () => {
  if (!_client) {
    _client = createClient(SUPA_URL, SUPA_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return _client;
};
