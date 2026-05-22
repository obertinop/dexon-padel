# CHANGELOG — DEXON PADEL

Registro de toda la lógica implementada en el proyecto. Cada entrada describe **qué hace**, **por qué existe** y **dónde vive** en el código.

---

## Formato de entradas futuras

```
### [YYYY-MM-DD] Título del cambio
**Archivo(s):** `ruta/al/archivo.js`
**Qué:** descripción de qué se hizo
**Por qué:** razón de negocio o técnica
**Notas:** advertencias, dependencias, deuda técnica si aplica
```

---

## Baseline — 2026-05-22

Documentación del estado completo del sistema al momento de crear este archivo.

---

### Stack y arquitectura

- **Frontend:** React 19 + Vite 5, CSS-in-JS con estilos inline, sin librería de componentes externa
- **Backend:** Vercel Serverless Functions (`/api/*`)
- **Base de datos:** Supabase (PostgreSQL con RLS)
- **Autenticación:** Supabase Auth (solo para admin, JWT guardado en localStorage)
- **Pagos online:** Pagopar (pasarela paraguaya)
- **Mensajería:** WhatsApp Business API
- **Clima:** Open-Meteo API (gratuita, sin key)
- **Deploy:** Vercel (build de React + funciones serverless)
- **PWA:** Service Worker + manifest, instalable en iOS/Android

---

### Enrutamiento (sin React Router)

**Archivo:** `src/App.js:33-40`

El enrutamiento se hace con `window.location.pathname` sin librería. Cada ruta devuelve un componente diferente:

| Ruta | Componente |
|------|-----------|
| `/reservar` | `PortalCliente` |
| `/reserva-resultado` | `ResultadoPago` |
| `/cuenta` o `/mi-cuenta` | `MiCuenta` |
| `/admin` | Dashboard admin (requiere login) |
| cualquier otra | `LandingPage` |

---

### Autenticación admin

**Archivo:** `src/components/Login.js`, `src/App.js:48-51, 133-140`

- Login con email/password via Supabase Auth (`/auth/v1/token`)
- Token JWT guardado en `localStorage` (`dx_token`, `dx_user`)
- Auto-logout por inactividad a los **15 minutos** (reset en mousedown, keydown, touchstart, scroll)
- Al cargar la app, lee el token del localStorage para restaurar la sesión

---

### Panel Admin — estructura general

**Archivo:** `src/App.js`, `src/context/AdminContext.js`

- Sidebar colapsable (estado en localStorage: `dx_sidebarCol`)
- En mobile: sidebar como drawer lateral con overlay
- Barra superior fija en mobile con botón hamburguesa y búsqueda
- **Auto-refresh:** polling cada 10 segundos (datos + contador de WhatsApp no leídos)
- **Clima:** fetch a Open-Meteo al cargar, pronóstico 5 días para Tavapy (-25.65, -54.77)
- **Command palette:** `Ctrl+K` / `Cmd+K` abre búsqueda rápida global
- **FABs mobile:** botón "+" contextual según la tab activa (reservar, agregar cliente, etc.)
- **Skeleton loading:** animación shimmer mientras cargan los datos iniciales
- **Banner iOS:** detecta iPhone no standalone y sugiere instalar como PWA (descartable, persiste en localStorage)

Todas las acciones (guardar, confirmar, cancelar) y datos viven en `App.js` y se pasan a las tabs via `AdminContext`.

---

### Carga de datos admin

**Archivo:** `src/App.js:98-121`

Al autenticarse, se cargan en paralelo con `Promise.all` todas las tablas:
`turnos`, `clientes`, `abonos`, `planes`, `instructores`, `caja`, `stock`, `espera`, `config`, `abono_turnos`, `codigos_referido`, `turno_items`, `dias_bloqueados`

Sin filtro de fecha en turnos — se trae el historial completo.

---

### Tab: Agenda

**Archivo:** `src/tabs/Agenda.js`

- Vista semanal (lunes a domingo)
- Navegación por semanas (`semOff` ± 1)
- Muestra turnos reales + turnos virtuales de abonos (`turnosAbonados()`)
- Drag & drop para reprogramar turnos entre slots
- Click en slot abre modal de turno
- Indicador de clima por día
- Click en fecha del encabezado abre `DiaConfigModal`

---

### Tab: Hoy

**Archivo:** `src/tabs/Hoy.js`

- Filtra turnos del día actual
- Muestra métricas: ingresos del día, turnos confirmados, pendientes
- Lista de turnos ordenada por hora

---

### Tab: Pendientes

**Archivo:** `src/tabs/Pendientes.js`

- Filtra turnos con `estado === "pendiente_pago"` (reservas por transferencia aún no confirmadas)
- Selección múltiple para confirmar/cancelar en bulk (`confirmarBulk`, `cancelarBulk`)
- Filtro por método de pago
- Al confirmar: registra en caja + envía WhatsApp de confirmación

---

### Tab: Clientes

**Archivo:** `src/tabs/Clientes.js`

- Lista todos los clientes con búsqueda client-side por **nombre** y **teléfono**
- Highlight del término buscado en los resultados
- Muestra si el cliente tiene abono activo, saldo a favor, deuda
- Click en cliente abre modal de edición
- Botones rápidos: "Reservar" y "Abonar" por cliente

---

### Tab: Abonados

**Archivo:** `src/tabs/Abonados.js`

- Lista abonos activos y vencidos
- Crear abono: elige cliente + plan + turnos fijos por día/hora
- Al crear abono: materializa turnos reales para las próximas 5 semanas (`materilarizarTurnosAbono`)
- Cancelar abono: cancela también todos los turnos futuros del abono

---

### Tab: Caja

**Archivo:** `src/tabs/Caja.js`

- Lista movimientos con filtro por fecha (inicio/fin) y tipo (ingreso/egreso)
- Totales del período filtrado
- Agregar movimiento manual (ingreso o egreso)
- Eliminar movimiento

---

### Tab: Stock

**Archivo:** `src/tabs/Stock.js`

- Inventario de productos con categorías
- Alerta visual cuando un producto está bajo el mínimo configurado
- Movimientos: entrada (compra) o salida (venta)
- Venta genera ingreso en caja automáticamente
- Compra genera egreso en caja automáticamente

---

### Tab: Stats

**Archivo:** `src/tabs/Stats.js`

- Métricas del club: ingresos totales, ocupación, clientes nuevos, etc.
- Gráficos y tendencias

---

### Tab: Config

**Archivo:** `src/tabs/Config.js`

Parámetros editables del club:
- Nombre del club
- Horario de apertura/cierre
- Tarifa base y tarifa pico
- Rango horario pico
- Descuento por día (Martes/Jueves configurable por día de semana)
- Porcentaje de descuento por referido

---

### Tab: WhatsApp

**Archivo:** `src/components/WhatsAppPanel.js`

- Lista de conversaciones activas con clientes
- Panel de mensajes por conversación
- Envío manual de mensajes
- Badge de no leídos en el menú lateral
- Actualización automática cada 10 segundos

---

### Gestión de días bloqueados / horario especial

**Archivo:** `src/App.js:428-496` (`DiaConfigModal`), `api/cliente/[path].js`

Tipos de configuración por día:
- `normal`: horario habitual
- `horario`: apertura/cierre diferente al default para ese día
- `bloqueado`: cancha cerrada, se muestra motivo en el portal

En la agenda, click en la fecha del encabezado abre el modal de configuración. Los días bloqueados se reflejan en el portal del cliente (no muestra slots ni permite reservar).

---

### Reprogramación de turnos

**Archivo:** `src/App.js:669-694`

Desde el modal "verTurno" el admin puede:
- Cambiar fecha y hora del turno
- Seleccionar motivo (cliente lo solicitó, conflicto cancha, mantenimiento, clima, etc.)
- Al guardar: envía WhatsApp automático al cliente con la nueva fecha/hora y el motivo

---

### Items vendidos en turno

**Archivo:** `src/App.js:348-389`

Permite agregar productos del stock a un turno (ej: pelotas vendidas en la cancha):
- Descuenta el stock inmediatamente
- No registra en caja hasta que se cobra manualmente (`cobrarItemsTurno`)
- Se pueden eliminar antes de cobrar (devuelve el stock)

---

### Lógica de precios

**Archivo:** `src/App.js:189`, `src/components/PortalCliente.js:86-98`, `api/reservar.js:44-53`

```
precio base → si hora en rango pico → tarifa_pico, sino → tarifa_base
si día tiene descuento habilitado → precio * (1 - descPct/100)
si código referido válido → subtotal * (1 - refDescPct/100)
si usa saldo → min(saldo_disponible, subtotal_con_ref)
total = max(0, subtotal - descRef - descSaldo)
```

El cálculo se replica tanto en el frontend (para mostrar precios) como en el backend (`api/reservar.js`) para evitar manipulación client-side.

---

### Sistema de referidos

**Archivo:** `api/reservar.js:95-107`, `src/components/PortalCliente.js:99-105`

- Cada cliente tiene un `referrer_code` único generado al registrarse (formato `ABC-1234`)
- Algoritmo de generación: mezcla letras del nombre + dígitos del teléfono, verifica unicidad en DB (`genCode` / `genRefCode`)
- También existen códigos institucionales en la tabla `codigos_referido` (para socios, promo, etc.) con máximo de usos configurable
- Al usar un código: el que reserva obtiene descuento (`refDescPct%`), el dueño del código gana el mismo monto como **saldo a favor**
- Validación: no se puede usar el propio código (se compara teléfono normalizado)
- El cálculo y la actualización de saldos se hace **server-side** en `/api/reservar.js`

---

### Portal del cliente — flujo de reserva

**Archivo:** `src/components/PortalCliente.js`

Flujo en 3 pasos:

**Paso 1 — Lista de horarios:**
- Carga config, todos los turnos, todos los clientes, códigos referidos, abono_turnos, días bloqueados
- Selector de fecha: calendario mini (mobile) o pills de 14 días (desktop)
- Muestra banners de: día bloqueado, feriado nacional, día con descuento, alerta de pocos lugares
- Barra de ocupación visual por hora
- Slots seleccionables (solo consecutivos o de a uno)
- Precios mostrados con y sin descuento del día
- FAB flotante en mobile cuando el botón "Reservar" sale de pantalla

**Paso 2 — Datos del cliente:**
- Nombre + teléfono
- Auto-reconocimiento: si el teléfono ingresado coincide con un cliente existente, muestra tarjeta de bienvenida
- Opción de usar saldo a favor (si el cliente tiene)
- Campo de código referido con validación en tiempo real

**Paso 3 — Pago:**
- Opciones: Transferencia bancaria (UENO, alias 80168039-5), Pago online (Pagopar), Efectivo (solo para clientes con 2+ reservas confirmadas)
- Desglose de descuentos
- Para Pagopar: requiere CI del cliente
- Para transferencia: instrucciones detalladas + envío de WhatsApp automático al confirmar

**Confirmación:**
- Ticket visual con detalles del turno
- Botón compartir (Web Share API o WhatsApp fallback)
- Muestra el código de referido del cliente para que comparta

---

### API: Reserva por transferencia

**Archivo:** `api/reservar.js`

Endpoint `POST /api/reservar`:
1. Valida payload (nombre, teléfono, fecha, slots)
2. Lee config de DB para calcular precios server-side
3. Valida código de referido (busca en `clientes` por `referrer_code`, verifica que no sea propio)
4. Busca cliente por teléfono en múltiples formatos (con/sin 595, con/sin 0 inicial)
5. Si no existe: crea cliente con `referrer_code` único generado
6. Calcula descuento de saldo
7. Inserta turnos con `estado: "pendiente_pago"`, guarda los montos de descuento por slot
8. Actualiza saldo del referente (+descRef) y del cliente que usa saldo (-descSaldo)
9. Protegido con header `x-api-secret`

---

### API: Pago online (Pagopar)

**Archivo:** `api/pagopar/crear-pago.js`, `api/pagopar/webhook.js`, `api/pagopar/consultar.js`

- `crear-pago.js`: arma el payload de Pagopar (items, comprador, totales), hace la llamada a la API, devuelve `checkout_url` para redirigir al cliente
- `webhook.js`: recibe confirmación de Pagopar, valida firma HMAC, actualiza turno a `confirmado`, registra en caja, envía WhatsApp de confirmación
- `consultar.js`: consulta el estado de un pago por `id_pedido`

---

### API: WhatsApp

**Archivo:** `api/whatsapp/`

- `webhook.js`: recibe mensajes entrantes de la Business API, los guarda en DB
- `enviar.js`: envía mensajes a clientes. Tipos de mensaje soportados: `confirmacion_manual`, `confirmacion_presencial`, `transferencia_pendiente`, `reprogramacion`, recordatorios
- `responder.js`: respuestas automáticas a mensajes entrantes
- `mensajes.js`: lista mensajes con filtro de no leídos
- `media.js`: proxy para servir archivos multimedia recibidos

---

### API: Cron recordatorios

**Archivo:** `api/cron/recordatorios.js`

- Ejecutado por Vercel Cron (configurado en `vercel.json`)
- Busca turnos del día siguiente y envía WhatsApp de recordatorio a cada cliente
- Evita duplicados verificando si ya se envió

---

### API: Cliente dinámica

**Archivo:** `api/cliente/[path].js`

Router dinámico para el portal del cliente. Expone datos públicos (sin autenticación admin):
- Disponibilidad de horarios
- Configuración del club (tarifas, descuentos)
- Historial de reservas de un cliente por teléfono

---

### Portal Mi Cuenta

**Archivo:** `src/components/MiCuenta.js`

Accesible en `/mi-cuenta?telefono=XXXX`:
- Historial de reservas del cliente
- Ver código de referido propio
- Compartir código por WhatsApp
- Ver saldo a favor

---

### Landing Page

**Archivo:** `src/components/LandingPage.js`

- Página pública con tarifas, horarios, CTA para reservar
- Enlace directo al WhatsApp del admin
- SEO/OpenGraph configurado en `public/index.html`

---

### Feriados nacionales

**Archivo:** `src/lib/hooks.js` (`useFeriados`)

- Carga feriados nacionales de Paraguay desde una API pública
- Devuelve `getFeriado(fecha)` para verificar si una fecha es feriado
- El portal muestra un banner especial en días feriados

---

### Paleta de colores y estilos

**Archivo:** `src/lib/constants.js`

- `C`: objeto con todos los colores del tema oscuro (bg, coral, green, yellow, red, purple, etc.)
- `inp`, `card`, `metric`, `lbl`: estilos base reutilizados en todo el admin
- `DIAS`, `DIAS_FULL`, `MESES`: arrays de nombres en español
- `LOGO`, `LOGO_STYLE_DARK`: path del logo y filtro CSS para invertirlo sobre fondo oscuro

---

### Generación de códigos de referido

**Archivo:** `src/lib/utils.js:23-32`, `api/reservar.js:6-22`

Algoritmo: toma letras del nombre + dígitos del teléfono, las mezcla evitando secuencias del original, formato `ABC-1234`. Implementado en dos lugares:
- Frontend (`genRefCode`) para el admin al crear clientes manualmente
- Backend (`genCode` en `api/reservar.js`) al crear clientes desde el portal (usa `crypto.randomInt` más seguro)

---

### PWA

**Archivo:** `public/manifest.json`, `public/service-worker.js`

- Instalable en iOS (via "Agregar a inicio") y Android
- Service Worker para soporte offline básico
- El admin detecta si está en iOS y no instalado, y muestra un banner de instalación

---

### Variables de entorno

**Archivo:** `.env.example`

| Variable | Uso |
|----------|-----|
| `VITE_SUPA_URL` | URL del proyecto Supabase (frontend) |
| `VITE_SUPA_KEY` | Anon key de Supabase (frontend) |
| `VITE_ADMIN_TEL` | Teléfono del admin para WhatsApp |
| `VITE_API_SECRET` | Secret para autenticar llamadas al backend |
| `SUPABASE_URL` | URL Supabase (backend/serverless) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend, acceso total) |
| `API_SECRET` | Secret validado en los endpoints del backend |

---

## Pendiente / Deuda técnica conocida

- `PortalCliente.js`: carga **todos** los turnos sin filtro de fecha (crece con el tiempo)
- `PortalCliente.js`: carga **todos** los clientes para búsqueda local por teléfono
- `Clientes.js`: búsqueda solo por nombre y teléfono (sin código referido ni documento)
- `PortalCliente.js`: bloque de resumen de reserva duplicado entre paso "datos" y paso "pago"
- `PortalCliente.js`: tres handlers de submit casi idénticos (transferencia, efectivo, pagopar)
- Tests: solo existe un test boilerplate (`src/App.test.js`)
- Sin paginación en la tab Clientes
