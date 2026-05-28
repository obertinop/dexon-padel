-- ============================================================
-- DEXON PADEL — Schema inicial para Cloudflare D1 (SQLite)
-- ============================================================

CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hora_inicio INTEGER DEFAULT 10,
  hora_fin INTEGER DEFAULT 24,
  tarifa_base REAL DEFAULT 80000,
  tarifa_pico REAL DEFAULT 100000,
  hora_pico_inicio INTEGER DEFAULT 19,
  hora_pico_fin INTEGER DEFAULT 22,
  desc_martes_jueves_enabled INTEGER DEFAULT 0,
  desc_martes_jueves_percent REAL DEFAULT 20,
  desc_martes_jueves_dias TEXT DEFAULT '[2,4]',
  referral_discount_percent REAL DEFAULT 10,
  wa_recordatorio_activo INTEGER DEFAULT 0,
  wa_recordatorio_template TEXT,
  wa_bienvenida_activo INTEGER DEFAULT 0,
  wa_bienvenida_texto TEXT,
  wa_admin_tel TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT,
  telefono TEXT,
  email TEXT,
  nivel TEXT DEFAULT 'intermedio',
  notas TEXT,
  referrer_code TEXT UNIQUE,
  saldo_favor REAL DEFAULT 0,
  ultimo_acceso TEXT,
  notif_recordatorio INTEGER DEFAULT 1,
  notif_promo INTEGER DEFAULT 0,
  notif_email_resumen INTEGER DEFAULT 0,
  notif_sms_urgente INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  hora INTEGER NOT NULL,
  tipo TEXT DEFAULT 'ocasional',
  estado TEXT DEFAULT 'pendiente_pago',
  cliente_id INTEGER REFERENCES clientes(id),
  precio REAL DEFAULT 0,
  sena REAL DEFAULT 0,
  saldo REAL DEFAULT 0,
  cobrado INTEGER DEFAULT 0,
  notas TEXT,
  metodo_pago TEXT,
  pagopar_hash TEXT,
  pagopar_pedido_num TEXT,
  pagopar_id_pedido TEXT,
  recordatorio_wa INTEGER DEFAULT 0,
  day_discount_amount REAL DEFAULT 0,
  applied_referral_code TEXT,
  referral_discount_amount REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  descripcion TEXT,
  tipo TEXT,
  categoria TEXT,
  monto REAL DEFAULT 0,
  fecha TEXT,
  turno_id INTEGER REFERENCES turnos(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS abonos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER REFERENCES clientes(id),
  plan_id INTEGER,
  estado TEXT DEFAULT 'activo',
  fecha_inicio TEXT,
  fecha_vencimiento TEXT,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS abono_turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  abono_id INTEGER REFERENCES abonos(id),
  dia INTEGER,
  hora INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT,
  precio REAL DEFAULT 0,
  duracion_dias INTEGER DEFAULT 30,
  turnos_por_semana INTEGER DEFAULT 1,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instructores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  activo INTEGER DEFAULT 1,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  cantidad INTEGER DEFAULT 0,
  precio_costo REAL DEFAULT 0,
  precio_venta REAL DEFAULT 0,
  categoria TEXT,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS espera (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  fecha TEXT,
  hora INTEGER,
  notas TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dias_bloqueados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL UNIQUE,
  motivo TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS codigos_referido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  descuento_pct REAL DEFAULT 10,
  usos_max INTEGER,
  usos_actuales INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  de TEXT NOT NULL,
  nombre TEXT,
  mensaje TEXT,
  tipo TEXT DEFAULT 'text',
  media_id TEXT,
  meta_id TEXT UNIQUE,
  leido INTEGER DEFAULT 0,
  direccion TEXT DEFAULT 'entrante',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cliente_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  token TEXT NOT NULL UNIQUE,
  expira_en TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  last_seen TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono TEXT NOT NULL,
  codigo TEXT NOT NULL,
  expira_en TEXT NOT NULL,
  usado INTEGER DEFAULT 0,
  intentos INTEGER DEFAULT 0,
  ip TEXT,
  creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cliente_favoritos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  dia_semana INTEGER,
  hora TEXT,
  duracion INTEGER DEFAULT 60,
  label TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS turno_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_id INTEGER REFERENCES turnos(id),
  stock_id INTEGER REFERENCES stock(id),
  nombre TEXT,
  cantidad INTEGER DEFAULT 1,
  precio_unitario REAL DEFAULT 0,
  cobrado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Índices
CREATE INDEX IF NOT EXISTS clientes_telefono_idx ON clientes(telefono);
CREATE INDEX IF NOT EXISTS clientes_referrer_code_idx ON clientes(referrer_code);
CREATE INDEX IF NOT EXISTS turnos_fecha_idx ON turnos(fecha);
CREATE INDEX IF NOT EXISTS turnos_cliente_id_idx ON turnos(cliente_id);
CREATE INDEX IF NOT EXISTS turnos_pagopar_hash_idx ON turnos(pagopar_hash);
CREATE INDEX IF NOT EXISTS cliente_sessions_token_idx ON cliente_sessions(token);
CREATE INDEX IF NOT EXISTS otp_codes_telefono_idx ON otp_codes(telefono);

-- Fila inicial de config
INSERT OR IGNORE INTO config (id, hora_inicio, hora_fin, tarifa_base, tarifa_pico, hora_pico_inicio, hora_pico_fin, wa_admin_tel)
VALUES (1, 10, 24, 80000, 100000, 19, 22, NULL);
