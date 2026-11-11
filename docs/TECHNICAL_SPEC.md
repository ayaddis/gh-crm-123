# TECHNICAL_SPEC.md — CRM-123 (especificación técnica para Claude Code Web)

> **Orden de autoridad:** `SCRIPTS-SQL.md` (estructura de base de datos, intocable) → `CLAUDE.md` (reglas de seguridad y de trabajo) → este documento. Si algo de este documento contradice a los dos anteriores, ganan los anteriores y se avisa al humano.
> **Estructura de la base de datos:** se respeta exactamente la de `SCRIPTS-SQL.md`. Este documento no define tablas ni columnas nuevas; las nombra solo para explicar cómo se usan.

## 1. Alcance

CRM minimalista para un equipo comercial pequeño de **pólizas de seguros multiproducto** en **México** (moneda **MXN**, zona horaria `America/Mexico_City`, interfaz en español con tecnicismos en inglés como *pipeline*, *lead* o *follow-up*).

| Aplicación | Para quién | Carpeta | Proyecto en Vercel |
|---|---|---|---|
| **Web de escritorio** | 10 vendedores y 2 supervisores (gestión diaria; administración solo supervisor) | `/web` | `crm-123-web` |
| **PWA** | Supervisores (consulta rápida, reasignar, disparo del resumen matutino) | `/pwa` | `crm-123-pwa` |

Roles (solo dos): **Vendedor** y **Supervisor**. El Supervisor tiene todos los accesos de administrador. Sin RFC, CURP, DPI, NIT, DNI ni pasaporte: el teléfono (10 dígitos) identifica al cliente.

## 2. Stack

| Pieza | Elección | Justificación breve |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Estándar con Vercel; Server Components y Server Actions mantienen las llaves en el servidor |
| Estilos y componentes | **Tailwind CSS + shadcn/ui** | Interfaz limpia y consistente sin diseño a medida |
| Datos y autenticación | **Supabase** (Postgres + Auth), proyecto `dbcrm123`, organización `Org CRM 123` | Definido por el humano |
| Cliente de Supabase | `@supabase/supabase-js` + `@supabase/ssr` | Sesión en cookies, RLS con la sesión de la persona |
| Validación | **Zod** | Valida entradas antes de tocar la base de datos |
| Código fuente | **GitHub**, una sola rama: `gh-crm-123` | Definido por el humano |
| Despliegue | **Vercel**, manual desde GitHub (ver §14) | Definido por el humano |
| Automatización | **n8n Cloud**, flujo **`WF-CRM123`** | Definido por el humano |
| Correo | **Resend**, remitente `onboarding@resend.dev` | Definido por el humano (ver §9: limitación de pruebas) |
| Pruebas automáticas | **Vitest** solo para funciones puras + `tsc --noEmit` + `lint` + `build` | Mínimo suficiente |

Sin librerías de estado global, sin ORM (se usa el cliente de Supabase con los tipos generados), sin librerías de gráficas (indicadores con tarjetas y barras HTML/CSS), sin monorepo con herramientas especiales: cada app es independiente y las pocas utilidades comunes (teléfono, formato MXN, mapa de errores) se copian a ambas carpetas.

## 3. Estructura del repositorio (rama `gh-crm-123`)

```
/
├─ CLAUDE.md                 # contrato de trabajo (raíz del repo)
├─ docs/                     # los 5 documentos del proyecto (referencia, solo lectura)
│   ├─ DESIGN_BRIEF.md  TECHNICAL_SPEC.md  BUILD_PLAN.md  SCRIPTS-SQL.md
├─ web/                      # app de escritorio (Next.js)
│   ├─ src/app/ …  src/lib/ …  src/types/database.ts   # tipos generados (Hito 1)
│   ├─ .env.example  vercel.json
├─ pwa/                      # PWA del supervisor (Next.js)
│   ├─ src/app/ …  src/lib/ …  src/types/database.ts
│   ├─ public/manifest.webmanifest  public/sw.js  public/icons/…
│   ├─ .env.example  vercel.json
└─ n8n/
    └─ WF-CRM123.json        # flujo para importar manualmente en n8n Cloud (Hito 4)
```

`src/types/database.ts` lo entrega el humano generado desde la base ya creada (Hito 1). Claude Code Web **no lo escribe a mano ni lo modifica**.

## 4. Autenticación y sesión

- **Usuario = correo.** Supabase Auth con correo y contraseña. **Sin registro público**: solo el supervisor crea usuarios (§7.1).
- Contraseña temporal al crear o restablecer: el perfil queda con `must_change_password = true` y la aplicación obliga a cambiarla antes de entrar a cualquier otra pantalla. Mínimo 10 caracteres (también se valida en la aplicación).
- **Cambio de contraseña:** `supabase.auth.updateUser({ password })` desde una acción de servidor con la sesión de la persona y, enseguida, `rpc('mark_password_changed')`. No se usa la llave secreta.
- **Quién es la persona:** en el servidor siempre `supabase.auth.getUser()` (valida el token con Supabase), **nunca** `getSession()` ni claims del JWT.
- **Rol:** se lee de la tabla `profiles` (`select role, is_active, must_change_password, full_name where id = auth.uid()`), **nunca** del JWT ni de algo que venga del cliente. Helper único `getCurrentProfile()` por app (`src/lib/auth.ts`), con `import 'server-only'`.
- **Middleware** (`src/middleware.ts`) en ambas apps: refresca la sesión de `@supabase/ssr`; sin sesión → `/login`; sesión con perfil inactivo o inexistente → cierra sesión y `/login?motivo=inactivo`; `must_change_password` → `/cambiar-contrasena`. En la PWA, además, un Vendedor que entra recibe una pantalla "Esta aplicación es solo para supervisores" con botón de salir (los datos igual están protegidos por RLS).
- **Desactivar usuario:** el supervisor pone `is_active = false` (con su sesión; RLS lo permite) y además la acción de servidor bloquea al usuario en Auth con la llave secreta (`ban_duration` largo) para cortar sesiones existentes. Reactivar = `is_active = true` + quitar el bloqueo.
- Mensajes de error de inicio de sesión genéricos ("Correo o contraseña incorrectos"); sin revelar si el correo existe.

## 5. Seguridad por fila (RLS) — resumen operativo

Las políticas reales están en `SCRIPTS-SQL.md` (`04_rls.sql`). La aplicación **no las replica ni las sustituye**; las usa. Resumen de lo que ve y puede hacer cada rol con **su propia sesión** (llave publishable + cookies):

| Tabla / vista | Vendedor | Supervisor |
|---|---|---|
| `profiles` | ver solo su fila | ver todos; editar (activar/desactivar, nombre, rol de otros) |
| `products`, `insurers`, `agents` | ver; no escribir | ver, crear, editar |
| `clients`, `opportunities`, `follow_ups` | ver, crear y editar solo lo propio (`owner_id` = yo) | todo; reasignar con `reassign_client` |
| `policies`, `premium_receipts`, `claims` | solo lo de sus pólizas; puede emitir, cancelar, marcar recibo pagado, registrar siniestros | todo |
| `activities` | ver y agregar sobre sus clientes; **nunca** editar | ver y agregar; **nunca** editar |
| `commissions` | solo las suyas como ejecutivo (lectura) | todas; liquidar |
| `commission_rates`, `policy_commission_terms` | sin acceso | ver; `commission_rates` también editar |
| `goals` | ver su meta | ver y editar todas |
| `settings` | leer | leer y editar |
| `audit_log` | sin acceso | solo lectura |
| Vistas `v_*` | ven solo lo que su RLS permite | ven todo |

**La interfaz oculta lo que el rol no puede hacer, pero la seguridad real es la RLS.** Si una consulta devuelve cero filas o un error `42501`, la pantalla muestra "No tienes permiso para esta acción" o el estado vacío; jamás se intenta "arreglar" con la llave secreta.

### Dónde SÍ se permite la llave secreta (lista cerrada)

| App | Archivo / función | Para qué |
|---|---|---|
| `web` | Server Actions de administración de usuarios (`createUser`, `resetUserPassword`, `setUserAccess`) | Crear usuario en Auth, restablecer contraseña, bloquear/desbloquear |
| `pwa` | Route Handlers `/api/n8n/*` y `/api/summary/trigger` | Leer datos del resumen, `run_daily_maintenance()`, escribir eventos en `audit_log` |

Todo lo demás usa la sesión de la persona. El cliente con llave secreta vive en `src/lib/supabase/admin.ts` con `import 'server-only'`, se crea **dentro** de la función que lo necesita y nunca se importa desde componentes cliente (ni siquiera "sin usar").

## 6. Acceso a datos

- **Lecturas:** Server Components con el cliente de servidor de `@supabase/ssr` (sesión de la persona). Para tablero, listas y paneles se usan las vistas `v_policies`, `v_receipts`, `v_follow_ups`, `v_commissions`, `v_seller_ranking`, `v_team_kpis`, que ya traen estatus efectivo, días para vencer y banderas de atraso.
- **Escrituras:** Server Actions con Zod → `supabase.from(...).insert/update(...)` con la sesión. Después de escribir, `revalidatePath`.
- **Cliente nunca escribe directo:** los componentes cliente solo llaman Server Actions; no importan el cliente de Supabase con permisos de escritura.
- **Paginación:** listas de 25 filas, orden y filtros en servidor, búsqueda por nombre o teléfono (`ilike`) con mínimo 3 caracteres.
- **Teléfono:** `normalizePhone(input)` quita todo lo que no sea dígito y, si quedan más de 10 dígitos y empieza con `52`, quita ese prefijo. Debe quedar de 10 dígitos o se rechaza. Se guarda solo normalizado.
- **Dinero:** formato `es-MX` en MXN (`Intl.NumberFormat('es-MX', {style:'currency', currency:'MXN'})`). Se envían números con 2 decimales, nunca texto.
- **Fechas:** se muestran en `America/Mexico_City`. Las fechas de negocio (`date`) se tratan como texto `YYYY-MM-DD` sin convertir zona horaria.
- **Archivar, no borrar:** botón "Archivar" (clientes y oportunidades → `archived_at`; usuarios → `is_active`; catálogos → `is_active`). La palabra "eliminar" no aparece en la interfaz, ni en botones, ni en mensajes, ni en textos de ayuda.

### Mapa de errores de la base de datos a mensajes en español

| Situación | Código | Mensaje |
|---|---|---|
| Teléfono de cliente repetido | `23505` en `clients_phone_key` | "Ya existe un cliente con ese teléfono. Consulta con tu supervisor." (sin revelar de quién es) |
| Permiso o RLS | `42501` | "No tienes permiso para esta acción." |
| Dato fuera de regla (CHECK) | `23514` | Mensaje por campo (p. ej. "El teléfono debe tener 10 dígitos") |
| Reglas de negocio de triggers | `P0001` | Se muestra el mensaje de la base de datos (ya está en español) |
| Cualquier otro | — | "Ocurrió un error. Intenta de nuevo." y se registra en el log del servidor sin datos personales |

## 7. Aplicación web de escritorio (`/web`)

### 7.1 Server Actions (todas validan con Zod y con `getCurrentProfile()`)

**Sesión:** `signIn`, `signOut`, `changePassword`.

**Administración (solo Supervisor; usan llave secreta solo donde se indica):**
- `createUser(email, fullName, role)` 🔑: verifica rol Supervisor; comprueba cupos (10 vendedores y 2 supervisores activos); genera contraseña temporal aleatoria (16+ caracteres); `auth.admin.createUser({ email, password, email_confirm: true })`; inserta en `profiles` con `must_change_password = true`. Si el perfil falla tras crear el usuario de Auth, reintenta una vez y, si persiste, registra el evento y avisa; el reintento reutiliza el usuario de Auth huérfano (búsqueda por correo). La contraseña temporal se muestra **una sola vez** en pantalla al supervisor.
- `resetUserPassword(userId)` 🔑: nueva contraseña temporal + `must_change_password = true`.
- `setUserAccess(userId, active)` 🔑: `is_active` + bloqueo/desbloqueo en Auth.
- `updateUserProfile(userId, fullName, role)`: con sesión (RLS).
- `saveProduct`, `saveInsurer`, `saveAgent`: alta y edición (incluye activar/desactivar).
- `saveCommissionRates(productId, ventaAgente, ventaEjecutivo, cobranzaAgente, cobranzaEjecutivo)`: cuatro porcentajes 0–100 con 2 decimales.
- `saveGoal(sellerId, month, targetPremium)`: `month` siempre el día 1.
- `settleCommission(commissionId)`: pasa a `liquidada`.
- `reassignClient(clientId, newOwnerId)`: `rpc('reassign_client')`.

**Operación comercial (Vendedor y Supervisor):**
- Clientes: `createClient`, `updateClient`, `archiveClient`.
- Oportunidades: `createOpportunity`, `updateOpportunity`, `changeStage(oppId, stage, lostReason?)`, `archiveOpportunity`. Al pasar a **Ganada** la interfaz abre de inmediato el formulario de emisión de póliza.
- Pólizas: `issuePolicy(opportunityId, insurerId, agentId?, policyNumber, annualPremium, paymentFrequency, startDate, endDate)`. Solo se envían esos campos; el resto lo copia la base de datos. `cancelPolicy(policyId, reason)`.
- Cobranza: `markReceiptPaid(receiptId, paidAt?)` (fecha de pago ≤ hoy).
- Siniestros: `createClaim`, `updateClaimStatus`.
- Actividades: `addActivity(clientId, type, summary, links?)` (solo alta).
- Seguimientos: `createFollowUp`, `completeFollowUp`, `cancelFollowUp`.

### 7.2 Pantallas y datos que consumen

| Ruta | Datos |
|---|---|
| `/login`, `/cambiar-contrasena` | Auth |
| `/` Tablero del día | `v_follow_ups` (hoy y vencidos), `v_receipts` (vencidos y por vencer ≤ `receipt_alert_days`), `v_policies` (renovaciones ≤ `renewal_days`), `v_team_kpis` (solo de lo que ve la persona) |
| `/clientes`, `/clientes/[id]` | `clients`, `opportunities`, `v_policies`, `activities`, `v_follow_ups` |
| `/oportunidades`, `/oportunidades/[id]` | `opportunities` + `products` |
| `/polizas`, `/polizas/[id]` | `v_policies`, `v_receipts`, `claims` |
| `/cobranza` | `v_receipts` |
| `/siniestros` | `claims` + `policies` |
| `/comisiones` | `v_commissions` (vendedor: las suyas; supervisor: todas, con filtro por beneficiario) |
| `/admin/usuarios`, `/admin/catalogos`, `/admin/comisiones`, `/admin/metas` | `profiles`, catálogos, `commission_rates`, `goals` (solo Supervisor) |
| `/admin/historial` | `audit_log` (solo lectura, solo Supervisor) |

Todas las rutas `/admin/*` verifican rol Supervisor en el servidor y devuelven 404 a un Vendedor.

## 8. PWA del supervisor (`/pwa`)

### 8.1 Pantallas
`/login`, `/cambiar-contrasena`, `/` Panel (indicadores de `v_team_kpis` y ranking de `v_seller_ranking`), `/vendedor/[id]` (seguimientos vencidos, recibos vencidos y pipeline de ese vendedor), `/buscar` (buscar cliente por nombre o teléfono y reasignarlo con `reassign_client`), `/resumen` (interruptor, "Enviar ahora", estado de la última ejecución), `/cuenta`.

### 8.2 Aspectos de PWA
- `manifest.webmanifest`: nombre y nombre corto `CRM-123`, `display: standalone`, `start_url: /`, `lang: es-MX`, colores de tema según `DESIGN_BRIEF.md`, íconos 192 y 512 (más versión *maskable*) generados con la marca "CRM-123".
- `public/sw.js` escrito a mano y mínimo: guarda en caché solo recursos estáticos (`/_next/static/*`, íconos, fuentes) con *stale-while-revalidate*; para navegaciones usa **red primero** y, si no hay red, muestra `/offline` (pantalla estática "Sin conexión"). **Nunca** se guardan en caché `/api/*`, ni respuestas de páginas autenticadas ni datos de personas.
- Registro del *service worker* solo en producción. Mensaje de "Instalar aplicación" con el evento `beforeinstallprompt` cuando exista.

### 8.3 Route Handlers de la PWA

Todos con `export const runtime = 'nodejs'`, `export const dynamic = 'force-dynamic'` y respuesta con `Cache-Control: no-store`.

| Método y ruta | Autenticación | Función |
|---|---|---|
| `POST /api/summary/trigger` | Sesión de Supervisor | Dispara manualmente el resumen (§10.2) |
| `POST /api/summary/toggle` | Sesión de Supervisor | Cuerpo `{ "enabled": boolean }`; actualiza `settings.morning_summary_enabled` **con la sesión** (RLS) y registra `rpc('log_event','summary_toggle', …)` |
| `GET /api/summary/status` | Sesión de Supervisor | Devuelve `{ enabled, last_run }` leyendo `settings` y `audit_log` con la sesión (el supervisor puede leerlos) |
| `GET /api/n8n/config` | Secreto de n8n | Configuración para n8n |
| `GET /api/n8n/summary-data` | Secreto de n8n | Datos del resumen (con compuertas, §10.3) |
| `POST /api/n8n/run-report` | Secreto de n8n | n8n informa resultado de envíos |

## 9. Correo con Resend y modo de pruebas

- Remitente: `onboarding@resend.dev`. Se envía desde n8n con **HTTP Request** a `https://api.resend.com/emails` (credencial *Bearer*).
- **Limitación importante (documentación de Resend):** con el dominio de pruebas `resend.dev`, solo se puede enviar al correo con el que se registró la cuenta de Resend; cualquier otro destinatario devuelve error 403. Por eso:
  - La cuenta de Resend **debe registrarse con `ayaddis@gmail.com`**.
  - **`MODO_PRUEBA=true`** (valor inicial): la PWA, al preparar el resumen, pone como destinatario de **todos** los correos a `TEST_RECIPIENT_EMAIL` (`ayaddis@gmail.com`) y antepone al asunto `[Para: Nombre del vendedor]`.
  - **Cuando exista un dominio propio verificado en Resend:** se verifica el dominio, se cambia `RESEND_FROM_EMAIL` al nuevo remitente y `MODO_PRUEBA=false`. No cambia código ni el flujo.
- El destinatario real y el efectivo (`deliver_to`) los decide **siempre la aplicación**, nunca n8n ni el navegador.
- **Ritmo de envío:** el nodo de envío de n8n usa lotes de 1 elemento con intervalo de 700 ms para respetar el límite de solicitudes por segundo de Resend, y cabecera `Idempotency-Key` = `{run_id}-{seller_id}` para que un reintento no duplique correos.

## 10. Resumen matutino con n8n (`WF-CRM123`)

### 10.1 Principios
1. **n8n nunca toca Postgres.** Todo lo que lee o escribe pasa por `/api/n8n/*` de la PWA.
2. El flujo tiene **dos disparadores**: automático (lunes a viernes 7:30, hora de Ciudad de México) y manual (webhook, desde el botón de la PWA).
3. El **interruptor** `morning_summary_enabled` solo gobierna el envío **automático**; el envío manual "Enviar ahora" funciona aunque esté apagado.
4. Contenido del correo al **vendedor**: seguimientos de hoy y vencidos, recibos vencidos y por vencer (≤ `receipt_alert_days`), renovaciones (≤ `renewal_days`). Si no tiene nada: "Sin pendientes hoy". Contenido al **supervisor**: resumen del equipo (indicadores de `v_team_kpis`) y ranking de `v_seller_ranking`.

### 10.2 Cómo se protege paso a paso el disparo manual (`POST /api/summary/trigger`)

1. **Solo Supervisor con sesión válida.** `getUser()` valida la sesión; el rol se lee de `profiles` (activo, rol `supervisor`). Cualquier otro caso → 403 sin detalles.
2. **Solo desde la propia PWA.** Se exige método `POST`, `Content-Type: application/json` y que la cabecera `Origin` (o `Sec-Fetch-Site: same-origin`) coincida con el dominio de la PWA. Las cookies de sesión van con `SameSite=Lax`, `Secure`, `HttpOnly`.
3. **Enfriamiento:** se consulta el último evento `summary_trigger_requested` en `audit_log`; si ocurrió hace menos de `trigger_cooldown_seconds` (120 s) → 429 con `retry_after_s`. Evita dobles clics y abuso.
4. **Sin ejecución simultánea:** si existe un `summary_run_started` sin su `summary_run_finished` con menos de 10 minutos → 409 "Ya hay un envío en proceso".
5. **Se registra la solicitud antes de llamar a n8n:** evento `summary_trigger_requested` en `audit_log` con `{ run_id (uuid nuevo), mode: 'manual', actor_id }` (escrito por servidor con llave secreta). Ese `run_id` es de **un solo uso** y vence a los 10 minutos.
6. **Llamada al webhook de n8n desde el servidor** (la URL y el secreto nunca llegan al navegador): `POST N8N_WEBHOOK_URL` con la cabecera `x-crm-webhook-secret: N8N_WEBHOOK_SECRET` y cuerpo **solo** `{ "run_id": "…" }`. Tiempo máximo 10 s, sin seguir redirecciones. El cliente **no** puede enviar destinatarios, asunto ni contenido.
7. **El webhook de n8n** se configura con *Header Auth* (la misma cabecera y secreto). Sin el secreto n8n responde 401/403 y no ejecuta nada.
8. **n8n no confía en el cuerpo:** con el `run_id` llama a `GET /api/n8n/summary-data?mode=manual&run_id=…` con su propio secreto `x-n8n-secret`. La PWA solo entrega datos si el `run_id` existe, fue solicitado hace menos de 10 minutos y no se ha usado (compuerta §10.3). Aunque se filtrara el secreto del webhook, sin un `run_id` válido (que solo puede crear un Supervisor autenticado) no se obtiene ningún dato.
9. **Los destinatarios los fija la aplicación** (vendedores y supervisores activos de `profiles`), y en modo de pruebas todos se desvían a `TEST_RECIPIENT_EMAIL`.
10. **Cierre y trazabilidad:** n8n reporta a `POST /api/n8n/run-report`; la PWA registra `summary_run_finished` con enviados y fallidos. La pantalla `/resumen` muestra el resultado; si pasan 10 minutos sin reporte, muestra "Sin confirmación".
11. **Respuesta al navegador:** `202 { run_id }` y el cliente consulta `/api/summary/status` cada 3 s hasta 2 minutos (estado "proceso en ejecución").

### 10.3 Protección de `/api/n8n/*`

- Cabecera obligatoria `x-n8n-secret`. Comparación **siempre con `crypto.timingSafeEqual`** sobre el hash SHA-256 de ambos valores (así tienen igual longitud). Nunca con `===`.
- Si falta o no coincide: `401 {"error":"unauthorized"}` genérico, sin pistas, y se registra solo el hecho (sin el valor recibido).
- Solo los métodos documentados (otros → 405). Tamaño máximo de cuerpo 64 KB. Sin CORS (no se llaman desde navegadores).
- **`GET /api/n8n/config`** → `{ enabled, timezone, send_time, from_email, test_mode, test_recipient }` (`test_recipient` solo si `test_mode`).
- **`GET /api/n8n/summary-data?mode=scheduled|manual[&run_id=…]`**:
  - `scheduled`: omite con `{ skipped: true, reason }` si `enabled = false` (`disabled`), si hoy no es día de `summary_weekdays` (`not_a_business_day`) o si ya existe `summary_run_started` programado de hoy (`already_ran`).
  - `manual`: exige `run_id` válido, vigente y no usado (`invalid_run` en caso contrario).
  - Si pasa: registra `summary_run_started` `{run_id|null, mode, date_mx}`, ejecuta `run_daily_maintenance()` y arma la respuesta consultando las vistas con llave secreta, filtrando por `owner_id` de cada vendedor.
  - Respuesta: `{ skipped:false, run_id, mode, date_mx, test_mode, from_email, recipients:[{ kind:'vendedor'|'supervisor', user_id, name, email, deliver_to, subject, data:{…} }] }`. Un `run_id` nulo en modo programado se reemplaza por uno generado en el servidor.
  - `data` del vendedor: `follow_ups_today[]`, `follow_ups_overdue[]`, `receipts[]` (póliza, cliente, número de recibo, vencimiento, monto, `days_to_due`), `renewals[]` (póliza, cliente, producto, `end_date`, `days_to_end`). `data` del supervisor: indicadores de `v_team_kpis` y filas de `v_seller_ranking`.
- **`POST /api/n8n/run-report`** → cuerpo `{ run_id, mode, sent:[{user_id, resend_id}], failed:[{user_id, error}] }` (Zod; `error` se recorta a 200 caracteres); registra `summary_run_finished`.

Eventos de `audit_log` usados por el resumen (campo `event`; `table_name = 'app'`): `summary_trigger_requested`, `summary_run_started`, `summary_run_finished`, `summary_toggle`.

### 10.4 Flujo `WF-CRM123` (archivo `n8n/WF-CRM123.json`, Hito 4)

| # | Nodo | Configuración |
|---|---|---|
| 1 | **Schedule Trigger** | Cron `30 7 * * 1-5`, zona `America/Mexico_City` (también en *Workflow Settings → Timezone*) |
| 2 | **Webhook** "Disparo manual" | `POST`, ruta `crm123-resumen`, autenticación *Header Auth* (credencial "CRM123 Webhook": cabecera `x-crm-webhook-secret`), responder de inmediato |
| 3 | **Set** "Contexto programado" | `mode = scheduled`, `run_id = ""`, `pwa_base_url = <URL de la PWA>` |
| 4 | **Set** "Contexto manual" | `mode = manual`, `run_id = {{$json.body.run_id}}`, `pwa_base_url = <URL de la PWA>` |
| 5 | **HTTP Request** "Obtener datos" | `GET {{pwa_base_url}}/api/n8n/summary-data` con parámetros `mode` y `run_id`; credencial *Header Auth* "CRM123 API" (`x-n8n-secret`); tiempo máximo 60 s; 2 reintentos |
| 6 | **IF** "¿Omitido?" | `{{$json.skipped}}` es verdadero → fin (nodo *No Operation*) |
| 7 | **Split Out** | Campo `recipients` |
| 8 | **Code** "Armar correo" | Genera `subject` y `html` en español con estilos en línea (escapar todo el texto dinámico); distingue `kind` vendedor y supervisor; montos en MXN y fechas `dd/mm/aaaa` |
| 9 | **HTTP Request** "Enviar con Resend" | `POST https://api.resend.com/emails`; credencial *Bearer* "Resend"; cuerpo `{ from: "CRM-123 <{{from_email}}>", to: ["{{deliver_to}}"], subject, html }`; cabecera `Idempotency-Key: {{run_id}}-{{user_id}}`; **Batching** 1 por lote cada 700 ms; *Continue On Fail* activado; 1 reintento |
| 10 | **Code** "Consolidar resultado" | Arma `sent[]` y `failed[]` a partir de las respuestas |
| 11 | **HTTP Request** "Reportar a CRM" | `POST {{pwa_base_url}}/api/n8n/run-report` con `run_id`, `mode`, `sent`, `failed`; credencial "CRM123 API" |

El flujo se importa **manualmente** en n8n Cloud, se crean las tres credenciales indicadas, se edita `pwa_base_url` y se activa. **No se activa** hasta terminar las pruebas de Hito 4. No contiene secretos dentro del JSON.

## 11. Variables de entorno

Nombre exacto, ubicación y nivel de exposición. Los archivos `.env.example` (solo nombres, sin valores) se versionan; `.env.local` y `.env*.local` **nunca** se suben a GitHub.

### 11.1 Web (`crm-123-web`)

| Variable | Valor / de dónde sale | Exposición |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto `dbcrm123` | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave **publishable** (`sb_publishable_…`) del proyecto | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave **secret** (`sb_secret_…`) del proyecto | **Solo servidor** (Server Actions de administración de usuarios) |
| `NEXT_PUBLIC_APP_NAME` | `CRM-123` | Pública |

### 11.2 PWA (`crm-123-pwa`)

| Variable | Valor / de dónde sale | Exposición |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Igual que web | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Igual que web | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Igual que web | **Solo servidor** |
| `NEXT_PUBLIC_APP_NAME` | `CRM-123` | Pública |
| `N8N_WEBHOOK_URL` | URL de producción del nodo Webhook de `WF-CRM123` | Solo servidor |
| `N8N_WEBHOOK_SECRET` | Texto aleatorio de 64 caracteres hexadecimales que se crea una vez | Solo servidor |
| `N8N_API_SECRET` | Otro texto aleatorio de 64 caracteres hexadecimales, distinto del anterior | Solo servidor |
| `MODO_PRUEBA` | `true` hasta tener dominio propio verificado en Resend; luego `false` | Solo servidor |
| `TEST_RECIPIENT_EMAIL` | `ayaddis@gmail.com` | Solo servidor |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | Solo servidor |

Notas:
- Las llaves de Supabase nuevas (`sb_publishable_…` / `sb_secret_…`) sustituyen a las antiguas `anon` / `service_role`, que Supabase tiene programado retirar. Se conservan los **nombres** de variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` por claridad del proyecto, pero su **valor** es el de las llaves nuevas.
- Los secretos aleatorios se generan con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Claude Code Web los genera y se los muestra al humano una sola vez para copiarlos a Vercel y a n8n; no se guardan en el repositorio.
- Toda variable se lee a través de un módulo `src/lib/env.ts` que valida con Zod al arrancar y falla con un mensaje claro si falta alguna. Las variables de servidor solo se leen en ese módulo bajo `import 'server-only'`.

### 11.3 n8n Cloud (credenciales, no variables)

| Credencial | Tipo | Contenido |
|---|---|---|
| `CRM123 Webhook` | Header Auth | Nombre `x-crm-webhook-secret`; valor = `N8N_WEBHOOK_SECRET` |
| `CRM123 API` | Header Auth | Nombre `x-n8n-secret`; valor = `N8N_API_SECRET` |
| `Resend` | Bearer Auth | API key de Resend (cuenta registrada con `ayaddis@gmail.com`) |

## 12. Cabeceras y endurecimiento

- Cabeceras en `next.config`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` restrictiva y una `Content-Security-Policy` básica compatible con Next.js (`default-src 'self'`, conexión permitida a la URL de Supabase; si el framework exige excepciones para sus propios scripts, se documentan en lugar de desactivar la política).
- Cookies de sesión `HttpOnly`, `Secure`, `SameSite=Lax` (por defecto de `@supabase/ssr`).
- Sin `console.log` de datos personales, correos, teléfonos, tokens ni secretos. Los logs de servidor llevan códigos de error y identificadores internos, no contenido.
- Entradas siempre validadas con Zod (longitudes máximas: nombres 120, notas 2000, descripción de siniestro 2000, resumen de actividad 1000).
- Dependencias: solo las del stack indicado; `npm audit` sin vulnerabilidades altas o críticas antes de cada entrega.

## 13. Pruebas y verificaciones

Por cada hito Claude Code Web ejecuta y reporta:
1. `npm run lint`, `npx tsc --noEmit` y `npm run build` en `/web` y `/pwa` sin errores.
2. `npm run test` (Vitest) para funciones puras: `normalizePhone`, formato MXN, mapa de errores, comparación segura de secretos.
3. **Verificación automática de seguridad** (`npm run check:security`, script propio en cada app) que falla si encuentra: `SUPABASE_SERVICE_ROLE_KEY` o `admin.ts` referenciados fuera de las rutas permitidas de §5; cualquier archivo con `'use client'` que importe `server-only` o el cliente administrador; el texto `eliminar` o `delete` visible en la interfaz; comparación de secretos con `===` o `!==`; lectura de rol desde `user.app_metadata`, `user.user_metadata`, claims o `getSession()`.
4. Prueba manual guiada por la lista de comprobaciones del hito en `BUILD_PLAN.md`, con dos usuarios de prueba (un vendedor y un supervisor) para confirmar aislamiento de datos.

## 14. Despliegue manual en Vercel

- Dos proyectos de Vercel conectados al mismo repositorio de GitHub, rama de producción `gh-crm-123`: `crm-123-web` con *Root Directory* `web` y `crm-123-pwa` con *Root Directory* `pwa`.
- Para que **no** se despliegue solo al hacer *push*, cada carpeta lleva `vercel.json` con `{ "git": { "deploymentEnabled": false } }`.
- **Despliegue manual** (lo ejecuta el humano cuando Claude Code Web lo indique): en cada proyecto, *Settings → Git → Deploy Hooks*, crear un *hook* para la rama `gh-crm-123` y abrir su URL (o usar *Deploy* desde la rama). Alternativa si el *hook* no dispara con la configuración anterior: instalar la CLI de Vercel en la computadora del humano y ejecutar `vercel --prod` dentro de la carpeta (`web` o `pwa`) tras `vercel link`. En Hito 2 se verifica cuál método funciona y se deja documentado en `BUILD_PLAN.md`.
- Las variables de entorno se capturan en *Settings → Environment Variables* (entorno *Production*) **antes** del primer despliegue de cada hito que las necesite.
- Región de las funciones: `iad1` (Washington D. C.), cercana a la región recomendada de Supabase (`us-east-1`).

## 15. Fuera del alcance (no construir)

Comisiones con cálculos distintos a los definidos, notificaciones *push*, adjuntos o documentos, exportación a Excel o PDF, carga masiva de clientes, reportes avanzados, integración con WhatsApp, firma electrónica, pasarelas de pago, modo oscuro, varios idiomas, varias monedas, multiempresa.
