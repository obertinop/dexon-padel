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


-- ============================================================
-- WHATSAPP INBOX — Mejoras (2026-06-01)
-- (Ya aplicado en prod vía migraciones whatsapp_inbox_upgrade + whatsapp_fix_public_policy)
-- ============================================================

-- 1. Columnas nuevas: estado de entrega, error, cita y reacción
ALTER TABLE whatsapp_mensajes ADD COLUMN IF NOT EXISTS estado     text DEFAULT 'enviado';
ALTER TABLE whatsapp_mensajes ADD COLUMN IF NOT EXISTS error_msg  text;
ALTER TABLE whatsapp_mensajes ADD COLUMN IF NOT EXISTS replied_to text;
ALTER TABLE whatsapp_mensajes ADD COLUMN IF NOT EXISTS reaccion   text;

CREATE INDEX IF NOT EXISTS whatsapp_mensajes_de_created_idx ON whatsapp_mensajes (de, created_at DESC);

-- 2. RLS — SEGURIDAD: quitar acceso público (anon) y dejar solo admin + service_role
ALTER TABLE whatsapp_mensajes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role full access" ON whatsapp_mensajes;  -- ⚠ era public USING(true)
DROP POLICY IF EXISTS whatsapp_service_all ON whatsapp_mensajes;
CREATE POLICY whatsapp_service_all ON whatsapp_mensajes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS whatsapp_auth_all ON whatsapp_mensajes;
CREATE POLICY whatsapp_auth_all ON whatsapp_mensajes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Realtime: identidad completa + agregar a la publicación
ALTER TABLE whatsapp_mensajes REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='whatsapp_mensajes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_mensajes';
  END IF;
END $$;
-- ============================================================


-- ============================================================
-- ENDURECIMIENTO RLS GLOBAL (2026-06-01)
-- (Ya aplicado en prod vía migración rls_hardening_lockdown)
-- anon pierde TODA escritura; solo lee las tablas del portal público.
-- authenticated (admin) y service_role mantienen acceso total.
-- ============================================================
DO $$
DECLARE t text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clientes','caja','config','turnos','abonos','planes','instructores','stock','espera',
    'abono_turnos','perfiles','flow_logs','referrals','codigos_referido','turno_items',
    'dias_bloqueados','codigos_verificacion','otp_codes','cliente_sessions','cliente_favoritos',
    'mensualidades','reservas','stock_movimientos','configuracion'
  ]
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t||'_service_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t||'_auth_all', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['config','turnos','clientes','codigos_referido','abono_turnos','abonos','dias_bloqueados','planes']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)', t||'_anon_read', t);
  END LOOP;
END $$;
-- ============================================================


-- ============================================================
-- SERVICIO DE VENTAS (POS) — (2026-09-22)
-- Venta de productos de stock en mostrador, sin turno asociado.
-- Tabla admin-only: mismo patrón de RLS que caja/stock (sin acceso anon).
-- ============================================================
CREATE TABLE IF NOT EXISTS ventas (
  id                bigint generated always as identity primary key,
  fecha             date not null default current_date,
  created_at        timestamptz not null default now(),
  cliente_id        bigint references clientes(id) on delete set null,
  subtotal          numeric not null default 0,
  descuento_pct     numeric not null default 0,
  descuento_monto   numeric not null default 0,
  total             numeric not null default 0,
  metodo_pago       text not null default 'efectivo', -- efectivo | transferencia | tarjeta | saldo_favor
  notas             text,
  anulada           boolean not null default false,
  caja_mov_id       bigint references caja(id) on delete set null
);

CREATE TABLE IF NOT EXISTS venta_items (
  id                bigint generated always as identity primary key,
  venta_id          bigint not null references ventas(id) on delete cascade,
  stock_id          bigint references stock(id) on delete set null,
  nombre            text not null,
  cantidad          numeric not null,
  precio_unitario   numeric not null,
  subtotal          numeric not null
);

CREATE INDEX IF NOT EXISTS ventas_fecha_idx      ON ventas(fecha desc);
CREATE INDEX IF NOT EXISTS venta_items_venta_idx ON venta_items(venta_id);

ALTER TABLE ventas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_service_all ON ventas;
CREATE POLICY ventas_service_all ON ventas FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ventas_auth_all ON ventas;
CREATE POLICY ventas_auth_all ON ventas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS venta_items_service_all ON venta_items;
CREATE POLICY venta_items_service_all ON venta_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS venta_items_auth_all ON venta_items;
CREATE POLICY venta_items_auth_all ON venta_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permite que el admin (rol authenticated, vía PostgREST) también use la función
-- atómica de saldo a favor al pagar una venta con saldo del cliente.
GRANT EXECUTE ON FUNCTION update_saldo_favor TO authenticated;
-- ============================================================


-- ============================================================
-- FIX DE SEGURIDAD — cierra acceso anon a update_saldo_favor (2026-09-22)
-- (Ya aplicado en prod al conectar el servicio de Ventas)
-- Postgres otorga EXECUTE a PUBLIC por defecto al crear una función; la
-- migración original de update_saldo_favor solo agregó el GRANT a
-- service_role pero nunca revocó el de PUBLIC. En la práctica, el rol
-- anon (clave pública del bundle del portal) podía llamar
-- /rest/v1/rpc/update_saldo_favor y sumarle saldo a favor ilimitado a
-- cualquier cliente sin autenticarse.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.update_saldo_favor(bigint, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_saldo_favor(bigint, numeric) FROM anon;
GRANT  EXECUTE ON FUNCTION public.update_saldo_favor(bigint, numeric) TO service_role, authenticated;


-- ============================================================
-- CLASIFICACIÓN DE STOCK — marca / tipo / presentación (2026-09-23)
-- (Ya aplicado en prod vía migraciones stock_clasificacion y
-- stock_clasificacion_datos_existentes)
-- Agrega los campos necesarios para discriminar el stock real
-- (marca, tipo de bebida, presentación, si contiene alcohol) y poder
-- desactivar productos sin borrar su historial de ventas/movimientos.
-- Paso previo a la futura lista de precios pública (QR).
-- ============================================================
ALTER TABLE stock ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS presentacion text;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS con_alcohol boolean NOT NULL DEFAULT false;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
-- ============================================================

-- search_path fijo en funciones SECURITY DEFINER (evita hijacking vía search_path mutable)
ALTER FUNCTION public.update_saldo_favor(bigint, numeric) SET search_path = public;


-- ============================================================
-- LISTA DE PRECIOS PÚBLICA (QR) — vista stock_publico (2026-09-23)
-- (Ya aplicado en prod vía migraciones stock_publico_view y
-- stock_publico_view_fix_grants)
-- Vista de solo lectura para la página pública /precios: expone
-- únicamente nombre/categoría/marca/tipo/presentación/precio_venta de
-- productos activos con precio cargado — nunca precio_costo ni
-- cantidad en stock.
--
-- OJO: al crear una vista nueva, Postgres/Supabase le otorga a `anon`
-- y `authenticated` los privilegios por defecto del schema (que en
-- este proyecto incluyen INSERT/UPDATE/DELETE, no solo SELECT). Como
-- la vista es "auto-updatable" (viene de una sola tabla sin joins ni
-- agregaciones), esos privilegios de escritura se propagan a la
-- tabla stock real si no se revocan explícitamente. Por eso el
-- REVOKE ALL + GRANT SELECT de abajo es obligatorio, no opcional.
-- ============================================================
CREATE OR REPLACE VIEW stock_publico AS
SELECT id, nombre, categoria, marca, tipo, presentacion, precio_venta
FROM stock
WHERE activo = true AND precio_venta > 0;

REVOKE ALL ON stock_publico FROM PUBLIC, anon, authenticated;
GRANT SELECT ON stock_publico TO anon, authenticated;
-- ============================================================
ALTER FUNCTION public.limpiar_otps_vencidos() SET search_path = public;
-- ============================================================


-- ============================================================
-- TOGGLE: WhatsApp automático en acciones del admin (2026-09-22)
-- Apaga el auto-envío al reservar/confirmar/reprogramar desde el panel
-- (el envío manual vía "Reenviar confirmación" y las notificaciones al
-- cliente que reserva solo desde el portal no se ven afectadas).
-- ============================================================
ALTER TABLE config ADD COLUMN IF NOT EXISTS wa_auto_admin_activo boolean default true;
-- ============================================================


-- ============================================================
-- AGRUPA TURNOS DE UNA MISMA RESERVA (2026-09-22)
-- Cuando alguien reserva varias horas seguidas, cada hora sigue siendo
-- una fila en turnos (necesario para disponibilidad/precio por hora),
-- pero ahora todas comparten un grupo_reserva_id para poder verlas,
-- confirmarlas, cancelarlas y cobrar sus productos como una sola unidad
-- desde el admin, en vez de una por una.
-- ============================================================
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS grupo_reserva_id text;
CREATE INDEX IF NOT EXISTS turnos_grupo_reserva_idx ON turnos(grupo_reserva_id) WHERE grupo_reserva_id IS NOT NULL;


-- ============================================================
-- CLIENTE OCASIONAL: dedupe por nombre + pago parcial + notas por
-- persona del grupo (2026-09-24)
-- ============================================================
-- Pago parcial (cancha): no requiere columna nueva. `sena` pasa a
-- representar el total pagado hasta el momento sobre ese turno (seña
-- inicial + pagos parciales posteriores que se le vayan sumando desde
-- el admin) y `saldo` sigue siendo `precio - sena`. Cuando el saldo
-- llega a 0 el turno se marca confirmado, igual que al cobrar todo junto.

-- Pago parcial (productos): turno_items no tenía forma de registrar un
-- cobro a medias — cobrado era todo o nada. `pagado` guarda cuánto se
-- lleva pagado de ese ítem (mismo rol que `sena` en turnos); se marca
-- `cobrado = true` recién cuando pagado alcanza precio_unitario*cantidad.
ALTER TABLE turno_items ADD COLUMN IF NOT EXISTS pagado numeric NOT NULL DEFAULT 0;

-- Notas por persona dentro de una reserva compartida: cuando varias
-- personas juegan en el mismo horario (ej. un grupo de amigos), permite
-- anotar qué pidió cada una para saber a quién cobrarle/entregarle qué.
-- Se cuelga del primer turno del grupo (mismo criterio que la seña).
CREATE TABLE IF NOT EXISTS turno_participantes (
  id          bigint generated always as identity primary key,
  turno_id    bigint not null references turnos(id) on delete cascade,
  nombre      text not null,
  nota        text,
  created_at  timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS turno_participantes_turno_idx ON turno_participantes(turno_id);

ALTER TABLE turno_participantes ENABLE ROW LEVEL SECURITY;

-- Admin-only, mismo patrón que turno_items/ventas: sin acceso anon.
DROP POLICY IF EXISTS turno_participantes_service_all ON turno_participantes;
CREATE POLICY turno_participantes_service_all ON turno_participantes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS turno_participantes_auth_all ON turno_participantes;
CREATE POLICY turno_participantes_auth_all ON turno_participantes FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- ============================================================
-- ============================================================
