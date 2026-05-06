-- ============================================================
-- DEXON PADEL — Migraciones + RLS
-- Pegá esto en Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. COLUMNAS NUEVAS ──────────────────────────────────────
ALTER TABLE config  ADD COLUMN IF NOT EXISTS desc_martes_jueves_enabled  boolean default false;
ALTER TABLE config  ADD COLUMN IF NOT EXISTS desc_martes_jueves_percent  numeric default 20;
ALTER TABLE config  ADD COLUMN IF NOT EXISTS desc_martes_jueves_dias     text    default '[2,4]';
ALTER TABLE config  ADD COLUMN IF NOT EXISTS referral_discount_percent   numeric default 10;

ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS day_discount_amount         numeric default 0;
ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS applied_referral_code       text;
ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS referral_discount_amount    numeric default 0;
ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS metodo_pago                 text;
ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS pagopar_hash                text;
ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS pagopar_pedido_num          text;
ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS pagopar_id_pedido           text;
ALTER TABLE turnos  ADD COLUMN IF NOT EXISTS recordatorio_wa             boolean default false;

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS referrer_code  text UNIQUE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_favor    numeric default 0;

CREATE INDEX IF NOT EXISTS clientes_referrer_code_idx ON clientes(referrer_code);

-- ── 2. RLS — HABILITAR EN TODAS LAS TABLAS ──────────────────
ALTER TABLE config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja        ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock       ENABLE ROW LEVEL SECURITY;
ALTER TABLE espera      ENABLE ROW LEVEL SECURITY;

-- ── 3. POLÍTICAS — config (solo lectura pública) ─────────────
DROP POLICY IF EXISTS "config_anon_read"    ON config;
DROP POLICY IF EXISTS "config_service_all"  ON config;

CREATE POLICY "config_anon_read" ON config
  FOR SELECT TO anon USING (true);

CREATE POLICY "config_service_all" ON config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 4. POLÍTICAS — turnos ────────────────────────────────────
DROP POLICY IF EXISTS "turnos_anon_read"    ON turnos;
DROP POLICY IF EXISTS "turnos_service_all"  ON turnos;

-- Anon solo ve fecha, hora, estado (para disponibilidad)
CREATE POLICY "turnos_anon_read" ON turnos
  FOR SELECT TO anon
  USING (true);   -- PostgREST filtra columnas por select= en la query

CREATE POLICY "turnos_service_all" ON turnos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 5. POLÍTICAS — clientes (solo service_role) ──────────────
-- El portal ya NO escribe clientes directamente (va por /api/reservar)
DROP POLICY IF EXISTS "clientes_anon_read"   ON clientes;
DROP POLICY IF EXISTS "clientes_service_all" ON clientes;

CREATE POLICY "clientes_service_all" ON clientes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 6. POLÍTICAS — tablas solo admin ────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['caja','abonos','planes','instructores','stock','espera']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_service_all" ON %I', t, t);
    EXECUTE format('CREATE POLICY "%s_service_all" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_auth_all" ON %I', t, t);
    EXECUTE format('CREATE POLICY "%s_auth_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ── 7. FUNCIÓN ATÓMICA — acreditar saldo ────────────────────
-- Evita race conditions al acreditar/debitar saldo_favor
CREATE OR REPLACE FUNCTION update_saldo_favor(p_cliente_id bigint, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  nuevo_saldo numeric;
BEGIN
  UPDATE clientes
    SET saldo_favor = GREATEST(0, COALESCE(saldo_favor, 0) + p_delta)
    WHERE id = p_cliente_id
    RETURNING saldo_favor INTO nuevo_saldo;
  RETURN nuevo_saldo;
END;
$$;

-- Permiso para que service_role la ejecute
GRANT EXECUTE ON FUNCTION update_saldo_favor TO service_role;

-- ============================================================
-- FIN — Verificar con:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
-- ============================================================
