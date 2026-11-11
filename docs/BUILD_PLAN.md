# BUILD_PLAN.md — Plan de construcción de CRM-123 (4 hitos)

> **Quién ejecuta cada hito**
> - **Hito 1 — Base de datos:** **Claude.ai Chat** con el conector MCP de Supabase (se conecta cuando el humano ejecuta este hito, en **otra conversación**). Toma en cuenta toda la documentación: `CLAUDE.md`, `TECHNICAL_SPEC.md` y, especialmente, `SCRIPTS-SQL.md`, que contiene la estructura oficial de la base de datos y las pruebas para confirmar que quedó bien creada.
> - **Hitos 2, 3 y 4 — Aplicaciones:** **Claude Code Web**, tomando en cuenta `CLAUDE.md` y `TECHNICAL_SPEC.md` en cada hito.
>
> **Regla de oro:** ningún hito avanza al siguiente sin la **confirmación escrita del humano**. En los Hitos 2 a 4 Claude Code Web **NO puede avanzar** al siguiente hasta recibirla.

## 0. Reglas comunes a todos los hitos

1. **Al inicio de cada hito**, quien lo ejecuta: (a) **informa las variables de entorno** que las aplicaciones necesitan para **toda** su funcionalidad (no solo las del hito), indicando desde qué hito se usa cada una; (b) **explica el procedimiento para obtener sus valores**; y (c) **verifica que estén configuradas** en los aplicativos, con una tabla `variable → configurada / falta`.
2. **Al final de cada hito y antes de las pruebas de funcionalidad**, si el humano tiene que **crear o actualizar variables** (en Vercel o en n8n), se le avisa con los pasos exactos y se espera su confirmación de que ya lo hizo.
3. **Cierre de hito:** resumen de lo construido en una frase, resultado de las verificaciones, lista de comprobaciones manuales para el humano y la pregunta explícita "¿Confirmas el Hito N para avanzar al Hito N+1?". Después, **se detiene**.
4. La estructura de la base de datos **no se cambia** durante los Hitos 2 a 4. Si falta algo, se detiene el trabajo y se pregunta (ver `CLAUDE.md` §6).
5. Los secretos (llaves, contraseñas, URLs de webhook) **nunca** se escriben en GitHub, en documentos ni en capturas. Se copian directamente a Vercel, n8n o al gestor de contraseñas del humano.

### Mapa maestro de variables de entorno

| Variable | Dónde se configura | Se usa desde | Cómo se obtiene el valor |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (web y PWA) y `.env.local` | Hito 2 | Hito 1 la entrega (conector: URL del proyecto `dbcrm123`). También en Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel (web y PWA) y `.env.local` | Hito 2 | Llave **publishable** (`sb_publishable_…`). El conector la entrega en Hito 1; también en Supabase → Project Settings → **API Keys** |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (web y PWA) y `.env.local` | Hito 3 (web) y Hito 4 (PWA) | Llave **secret** (`sb_secret_…`): Supabase → Project Settings → **API Keys** → sección *Secret keys* → copiar la llamada `default`. **Solo la copia el humano**; el conector no la entrega. **Nunca** se pega en un chat ni en GitHub |
| `NEXT_PUBLIC_APP_NAME` | Vercel (web y PWA) | Hito 2 | Escribir `CRM-123` |
| `N8N_WEBHOOK_SECRET` | Vercel (PWA) | Hito 4 | Claude Code Web genera un valor aleatorio de 64 caracteres hexadecimales y se lo muestra una sola vez al humano |
| `N8N_API_SECRET` | Vercel (PWA) | Hito 4 | Igual: otro valor aleatorio distinto del anterior |
| `N8N_WEBHOOK_URL` | Vercel (PWA) | Hito 4 | n8n Cloud: abrir el flujo `WF-CRM123` → nodo **Webhook "Disparo manual"** → pestaña **Production URL** → copiar |
| `MODO_PRUEBA` | Vercel (PWA) | Hito 4 | Escribir `true` (cambiar a `false` solo cuando exista un dominio propio verificado en Resend) |
| `TEST_RECIPIENT_EMAIL` | Vercel (PWA) | Hito 4 | Escribir `ayaddis@gmail.com` (debe ser el correo con el que se registra la cuenta de Resend) |
| `RESEND_FROM_EMAIL` | Vercel (PWA) | Hito 4 | Escribir `onboarding@resend.dev` |
| Credenciales de n8n: `CRM123 Webhook`, `CRM123 API`, `Resend` | n8n Cloud → Credentials | Hito 4 | Los mismos valores `N8N_WEBHOOK_SECRET` y `N8N_API_SECRET`; la API key de Resend se crea en resend.com → API Keys |

---

## Preparación previa (una sola vez, la hace el humano)

1. **Supabase:** tener una cuenta y la organización **`Org CRM 123`** creada (supabase.com → *New organization*).
2. **GitHub:** crear un repositorio privado (por ejemplo `crm-123`) y crear en él la rama **`gh-crm-123`**; en *Settings → Branches*, ponerla como rama por defecto.
3. **Vercel:** tener una cuenta conectada a GitHub.
4. **n8n Cloud** y **Resend** (cuenta registrada con **ayaddis@gmail.com**): se usan hasta el Hito 4.
5. **Documentos:** `CLAUDE.md` en la **raíz** del repositorio, y `DESIGN_BRIEF.md`, `TECHNICAL_SPEC.md`, `BUILD_PLAN.md` y `SCRIPTS-SQL.md` en la carpeta **`docs/`**.

---

# HITO 1 — Base de datos

**Ejecuta:** Claude.ai Chat con el conector MCP de Supabase, en una conversación nueva.
**Qué construye:** el script de la base de datos, **entregado y verificado**. Nada de interfaz.
**Base de conocimiento obligatoria:** `CLAUDE.md`, `TECHNICAL_SPEC.md` y `SCRIPTS-SQL.md`.

### Mensaje de arranque (el humano lo pega en la conversación nueva, junto con los tres archivos)

```
Vas a ejecutar el HITO 1 de BUILD_PLAN.md (Base de datos de CRM-123).
Documentación: CLAUDE.md, TECHNICAL_SPEC.md y SCRIPTS-SQL.md (adjuntos).
Usa el conector de Supabase. Aplica EXACTAMENTE los scripts de SCRIPTS-SQL.md, en orden,
sin modificar la estructura. Ejecuta todas las pruebas y reporta resultados.
Sigue el procedimiento del Hito 1 paso a paso y no avances de paso sin decirme el resultado.
No pidas ni muestres la llave secret de Supabase.
```

### 1.0 Inicio de hito: variables de entorno
1. Presenta la tabla del **Mapa maestro de variables** (arriba).
2. Explica que en este hito **todavía no existen las aplicaciones**, por lo que no hay variables que verificar en ellas; lo que se hace es **obtener y dejar listos los valores de Supabase** (URL y llave publishable por el conector; llave secret por el humano en el panel).
3. Verificación: tabla `variable → estado`, con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como "se obtienen en el paso 1.7" y `SUPABASE_SERVICE_ROLE_KEY` como "la copia el humano en el paso 1.7".

### 1.1 Revisar el entorno
- `list_organizations`: confirmar que existe **`Org CRM 123`**. Si no aparece, **detenerse** y pedir al humano que la cree o reconecte el conector.
- `list_projects`: buscar un proyecto llamado **`dbcrm123`** en esa organización.
  - Si **ya existe**, preguntar al humano si debe usarse. Si el proyecto ya contiene tablas en `public`, **detenerse** y preguntar (no se sobrescribe nada).
  - Si **no existe**, continuar con 1.2.

### 1.2 Crear el proyecto `dbcrm123` (si no existe)
1. `get_cost` para la organización y **mostrar al humano el costo** (puede ser 0 en el plan gratuito). **Esperar su aprobación explícita.**
2. `confirm_cost` con la aprobación, y luego `create_project` con: nombre **`dbcrm123`**, organización **`Org CRM 123`**, región recomendada **`us-east-1`** (cercana a las funciones de Vercel en Washington D. C.; confirmar con el humano).
3. Si la herramienta requiere contraseña de base de datos, **generar una de 24 caracteres o más**, mostrarla **una sola vez** al humano para que la guarde en su gestor de contraseñas, y **no escribirla en ningún documento ni repetirla**.
4. Esperar a que `get_project` indique que el proyecto está activo y saludable.

### 1.3 Aplicar la estructura (migraciones)
Con `apply_migration`, **una por script y en este orden**, copiando el SQL **sin cambios** desde `SCRIPTS-SQL.md`:

| Orden | Nombre de migración | Script |
|---|---|---|
| 1 | `crm123_01_tables` | `01_tables.sql` |
| 2 | `crm123_02_functions` | `02_functions.sql` |
| 3 | `crm123_03_triggers` | `03_triggers.sql` |
| 4 | `crm123_04_rls` | `04_rls.sql` |
| 5 | `crm123_05_views` | `05_views.sql` |
| 6 | `crm123_06_grants` | `06_grants.sql` |
| 7 | `crm123_07_seed` | `07_seed.sql` |

Tras la migración 1 verificar con `list_tables` que existen las **17 tablas**. Si una migración falla: **detenerse**, mostrar el error textual, y **no improvisar correcciones**; solo se corrige un error evidente de ejecución (por ejemplo un permiso del entorno) y se informa al humano de qué se cambió. Cualquier cambio de **estructura** requiere actualizar antes `SCRIPTS-SQL.md` con la aprobación del humano.

### 1.4 Verificar toda la estructura (con `execute_sql`)
1. **`08a_tests_estructura.sql`** — ejecutar sus **dos sentencias por separado**.
   - Primera: **21 filas con `violaciones = 0`**. Cualquier valor distinto de 0 es un fallo que se reporta con su `detalle`.
   - Segunda (inventario): comparar con la tabla de `SCRIPTS-SQL.md` §9.1 (17 tablas, 43 políticas, 39 llaves foráneas, 53 CHECK, 3 UNIQUE, 52 índices, 51 triggers, 6 vistas, 25 funciones). Reportar cualquier diferencia.
2. **`08b_tests_comportamiento.sql`** — ejecutar completo, como **una sola sentencia**. El resultado correcto es un **error intencional** cuyo mensaje es `RESULTADO: 98 pruebas, 0 fallidas (rollback intencional)`. Si el mensaje enumera fallos, reportarlos todos sin corregirlos por cuenta propia.
3. Comprobaciones adicionales que debe reportar en tabla, con consultas de solo lectura:
   - **Llaves:** cada tabla tiene llave primaria; las llaves foráneas son las del inventario y ninguna usa borrado en cascada.
   - **Índices:** listar los índices por tabla.
   - **Roles y privilegios:** `anon` sin privilegios; `authenticated` sin `DELETE` ni `TRUNCATE`; `service_role` sin `UPDATE`/`DELETE` sobre `activities` y `audit_log`.
   - **Políticas:** listar por tabla (43 en total) y confirmar: ninguna `DELETE`, todas las `UPDATE` con `WITH CHECK`, ninguna `true` salvo `settings` (lectura).
   - **Integridad:** confirmar que el catálogo de productos son exactamente **Auto, Accidentes y Salud, Daños, Hogar, Pyme**, que existen las **7 claves de `settings`** y que no queda ningún dato de prueba (conteos en cero en clientes, oportunidades, pólizas, recibos, comisiones, actividades, y `profiles` solo con lo creado en 1.6).

### 1.5 Asesores de Supabase
Ejecutar `get_advisors` para **seguridad** y para **rendimiento**. Reportar los resultados en tabla. **Esperado:** sin avisos de seguridad de nivel alto; los avisos informativos de rendimiento (por ejemplo llaves foráneas de auditoría sin índice) se explican en una línea y se aceptan. Un aviso de seguridad **nunca** se resuelve relajando una regla de `CLAUDE.md` §3.

### 1.6 Pasos manuales del humano (el chat le da los pasos y espera su respuesta)
1. En el panel de Supabase → **Authentication → Sign In / Providers → Email**: **apagar** el registro público (*Allow new users to sign up*) y fijar **longitud mínima de contraseña = 10**.
2. **Primer supervisor:** Authentication → Users → **Add user** → correo y contraseña temporal, con *Auto Confirm User*. Copiar el **UUID** que aparece y pasárselo al chat junto con el **nombre completo**. El chat ejecuta el `INSERT` del perfil con rol `supervisor` (plantilla al final de `07_seed.sql`) y verifica con un `SELECT`.
3. **Usuario vendedor de prueba** (recomendado, para las pruebas de los Hitos 2 y 3): repetir lo anterior con rol `vendedor`. Se desactivará desde la aplicación cuando ya no se necesite (nunca se borra).
4. Confirmar que **Authentication → Users** muestra los usuarios creados y que cada uno tiene su perfil.

### 1.7 Valores de variables y tipos
- `get_project_url` y `get_publishable_keys`: mostrar **URL** y llave **publishable** del proyecto. (Son públicas; pueden copiarse al gestor de contraseñas.)
- Pedir al humano que copie **él mismo** la llave **secret** desde Supabase → Project Settings → **API Keys** → *Secret keys* y la guarde en su gestor de contraseñas. **Nunca** debe pegarla en el chat.
- `generate_typescript_types` y **entregar el archivo `database.ts` completo** al humano, que lo guardará para adjuntarlo al iniciar el Hito 2 (irá en `web/src/types/database.ts` y `pwa/src/types/database.ts`).

### 1.8 Aviso de variables (antes de dar por cerrado el hito)
Decir al humano exactamente qué debe tener guardado para el Hito 2: URL del proyecto, llave publishable, llave secret, el archivo `database.ts`, y el correo y contraseña temporal del supervisor (y del vendedor de prueba).

### 1.9 Cierre del Hito 1
Entregar un **informe** con: (1) tabla de las 21 verificaciones, (2) resultado de las 98 pruebas, (3) inventario contra lo esperado, (4) resultado de los asesores, (5) lista de usuarios creados (correo y rol, sin contraseñas), (6) valores de URL y llave publishable, (7) archivo `database.ts`. Terminar con la pregunta: **"¿Confirmas el Hito 1 para avanzar al Hito 2?"** y **no hacer nada más** hasta recibir la confirmación.

---

# HITO 2 — Entrar y desplegar

**Ejecuta:** Claude Code Web (tomando en cuenta `CLAUDE.md` y `TECHNICAL_SPEC.md`).
**Qué construye:** del proyecto, **solo el ingreso, el armazón de navegación y el tablero del día vacío**, en las dos aplicaciones, y su despliegue manual.
**NO puede avanzar al Hito 3 hasta recibir la confirmación del humano.**

### Mensaje de arranque (Claude Code Web, con el repositorio conectado y `database.ts` adjunto)

```
Lee CLAUDE.md (raíz) y docs/TECHNICAL_SPEC.md, docs/DESIGN_BRIEF.md, docs/SCRIPTS-SQL.md.
Ejecuta SOLO el HITO 2 de docs/BUILD_PLAN.md. No avances al Hito 3 hasta que yo escriba
"confirmo Hito 2". No modifiques la estructura de la base de datos. Empieza por el inicio de hito
(variables de entorno) y avísame si me toca hacer algo.
```

### 2.0 Inicio de hito: variables de entorno
Informar la tabla del **Mapa maestro** completa (web y PWA), marcando cuáles se usan desde este hito (las cuatro de Supabase/nombre de la app) y cuáles después (llave secret desde el Hito 3 y variables de n8n/Resend desde el Hito 4). Explicar cómo obtener cada valor y **verificar**: archivos `.env.local` de desarrollo (no se versionan) con la tabla `variable → configurada / falta` y la comprobación de que el módulo `src/lib/env.ts` de cada app arranca sin errores.

### 2.1 Qué se construye

**Repositorio y base de ambas aplicaciones**
- Estructura de `TECHNICAL_SPEC.md` §3 (`web/`, `pwa/`, `docs/`, `n8n/` vacío), `.gitignore` (según `CLAUDE.md` §7), `.env.example` (solo nombres) y `vercel.json` con `{ "git": { "deploymentEnabled": false } }` en cada carpeta.
- Next.js + TypeScript + Tailwind + shadcn/ui, Zod, Vitest. `src/lib/env.ts`, clientes de Supabase (servidor y navegador), `getCurrentProfile()`, `src/types/database.ts` (el adjunto), script `check:security`.
- Diseño base según `DESIGN_BRIEF.md` §2 (colores, tipografía Inter, componentes base y etiquetas de estatus).

**Aplicación web (escritorio)**
- **D1** Inicio de sesión, **D2** Cambio de contraseña obligatorio, cierre de sesión.
- Middleware: sesión, perfil inactivo, cambio de contraseña obligatorio.
- **Armazón de navegación:** barra lateral y barra superior completas (Tablero, Clientes, Oportunidades, Pólizas, Cobranza, Siniestros, Comisiones; Administración visible solo al Supervisor). Todas las opciones **menos Tablero** abren una pantalla marcada "Disponible en un hito posterior".
- **D3 Tablero del día vacío:** saludo, fecha, contadores en cero y las cuatro listas con su estado vacío (según `DESIGN_BRIEF.md` §5); sin datos reales.
- Página "Sin permiso" y página 404.

**PWA**
- **P1** Inicio de sesión, **P2** Cambio de contraseña, **P8** "Solo para supervisores", **P9** Sin conexión, **P7** Cuenta.
- Barra inferior (Panel, Buscar, Resumen, Cuenta); Panel vacío (estado vacío de **P3**); Buscar y Resumen con "Disponible en un hito posterior".
- `manifest.webmanifest`, íconos, `public/sw.js` mínimo según `TECHNICAL_SPEC.md` §8.2.

### 2.2 Verificaciones de Claude Code Web (antes de entregar)
`npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test` y `npm run check:security` en `web/` y `pwa/`, todos en verde. Tabla de las 15 reglas de `CLAUDE.md` §3 con ✔ (las que aún no aplican se marcan "no aplica todavía" con razón).

### 2.3 Procedimiento de despliegue manual (lo hace el humano)
1. **Crear los dos proyectos en Vercel** (*Add New → Project → Import* el repositorio de GitHub):
   - Proyecto **`crm-123-web`**: *Root Directory* `web`, *Framework Preset* Next.js.
   - Proyecto **`crm-123-pwa`**: *Root Directory* `pwa`, *Framework Preset* Next.js.
   - En cada uno: *Settings → Git → Production Branch* = **`gh-crm-123`**.
2. **Capturar las variables en Vercel** (ver 2.4) **antes** del primer despliegue.
3. **Crear el *Deploy Hook*** de cada proyecto: *Settings → Git → Deploy Hooks → Create Hook* con nombre `manual` y rama **`gh-crm-123`**. Copiar la URL (es secreta; no se comparte ni se sube a GitHub).
4. **Desplegar** (método de preferencia, A): guardar en la computadora, **fuera del repositorio**, un archivo `desplegar-crm123.html` con este contenido, cambiando las dos direcciones por las URL de los *hooks*, y abrirlo en el navegador para usar los botones:
   ```html
   <h2>CRM-123 · Despliegue manual</h2>
   <form method="post" action="PEGA_AQUI_LA_URL_DEL_HOOK_WEB"><button>Desplegar WEB</button></form>
   <form method="post" action="PEGA_AQUI_LA_URL_DEL_HOOK_PWA"><button>Desplegar PWA</button></form>
   ```
   Alternativas si el método A no dispara el despliegue: **B)** en Terminal/PowerShell `curl -X POST "URL_DEL_HOOK"`; **C)** instalar la CLI de Vercel y ejecutar `vercel --prod` dentro de `web` o `pwa`.
5. **Verificar en Vercel → Deployments** que el despliegue terminó en *Ready*. Si falla por una variable ausente, el registro del despliegue nombra cuál (sin mostrar valores).
6. **Dejar anotado** en este mismo archivo (Claude Code Web lo actualiza con lo que el humano informe) **qué método de despliegue funcionó**.

### 2.4 Variables que deben existir en Vercel en este hito
Capturarlas en *Settings → Environment Variables* (entorno **Production**) de **cada** proyecto:

| Variable | `crm-123-web` | `crm-123-pwa` | Cómo obtener el valor |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✔ | ✔ | Informe del Hito 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✔ | ✔ | Llave **publishable** del informe del Hito 1 |
| `NEXT_PUBLIC_APP_NAME` | ✔ | ✔ | `CRM-123` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✔ (puede capturarse ya; se usa desde Hito 3) | ✔ (se usa desde Hito 4) | Llave **secret** copiada por el humano en Supabase → API Keys. Marcarla como *Sensitive* en Vercel |

### 2.5 Aviso de variables al final del hito (antes de las pruebas de funcionalidad)
Claude Code Web le dice al humano: "Antes de probar, confirma que capturaste en Vercel las variables de la tabla 2.4 en **los dos proyectos** y que ejecutaste el despliegue manual de **ambos**." Espera su "listo".

### 2.6 Pruebas de funcionalidad (las hace el humano; Claude Code Web las explica una por una)
| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Abrir la URL de la web, entrar con el **supervisor** y su contraseña temporal | Obliga a crear contraseña nueva (mínimo 10 caracteres) |
| 2 | Crear la contraseña y continuar | Llega al **Tablero** vacío con saludo y fecha |
| 3 | Recorrer el menú | Tablero funciona; las demás opciones dicen "Disponible en un hito posterior"; aparece **Administración** |
| 4 | Entrar con el **vendedor de prueba** | Mismo cambio de contraseña; **no** aparece Administración |
| 5 | Escribir una contraseña incorrecta | "Correo o contraseña incorrectos" (sin pistas) |
| 6 | Cerrar sesión y volver a entrar | Funciona |
| 7 | En la PWA entrar como supervisor | Llega al Panel vacío con barra inferior |
| 8 | En la PWA entrar con el vendedor | Pantalla "Solo para supervisores" con botón **Salir** |
| 9 | En el teléfono, usar "Agregar a pantalla de inicio" | Se instala como "CRM-123" |
| 10 | Con el teléfono en modo avión, abrir la PWA | Pantalla "Sin conexión" |

### 2.7 Cierre del Hito 2
Entregar el informe (verificaciones, tabla de 15 reglas, resultados de las 10 pruebas que informe el humano, método de despliegue que funcionó) y preguntar: **"¿Confirmas el Hito 2 para avanzar al Hito 3?"**. **No avanzar** sin su "confirmo Hito 2".

---

# HITO 3 — Núcleo comercial

**Ejecuta:** Claude Code Web.
**Qué construye:** agrega a la funcionalidad existente **lo que un vendedor usa todos los días** (y la administración mínima que lo hace posible).
**NO puede avanzar al Hito 4 hasta recibir la confirmación del humano.**

### 3.0 Inicio de hito: variables de entorno
Repetir la tabla del **Mapa maestro** con su estado actual (verificación `variable → configurada / falta` en `.env.local` y confirmación del humano sobre Vercel). Novedad de este hito: **`SUPABASE_SERVICE_ROLE_KEY` empieza a usarse en la web** (alta y administración de usuarios). Si el humano no la capturó en Hito 2, avisar y esperar.

### 3.1 Qué se construye (según `DESIGN_BRIEF.md` y `TECHNICAL_SPEC.md` §7)
- **Tablero del día real (D3):** seguimientos de hoy y vencidos, cobranza, renovaciones y "Mi mes" (con meta si existe). Supervisor con selector de equipo/vendedor.
- **Clientes (D4–D6):** lista, ficha con pestañas, alta/edición/archivado, teléfono normalizado y bloqueo de duplicados con el mensaje acordado; **Actividad** (solo alta) y **Seguimientos** (crear, marcar hecho, cancelar).
- **Oportunidades (D7–D8):** tablero por etapas y tabla, detalle, cambio de etapa, **Perdida** con motivo, **Ganada** abre la emisión.
- **Pólizas (D9–D11):** emisión con vista previa de recibos, lista, detalle, **cancelación** con motivo.
- **Cobranza (D12):** vencidos, por vencer, todos; **Marcar pagado**.
- **Siniestros (D13):** alta y cambio de estatus.
- **Comisiones (D14):** vendedor (solo las suyas, lectura) y supervisor (todas, filtros, **Liquidar** y **Liquidar seleccionadas**).
- **Administración mínima (solo Supervisor):** **Usuarios (D15)** con alta, restablecer contraseña y desactivar/reactivar (contraseña temporal mostrada una sola vez); **Catálogos (D16)**: productos, aseguradoras y agentes; **Porcentajes de comisión (D17)**.
- Pruebas unitarias (Vitest) de `normalizePhone`, formato MXN, mapa de errores de la base de datos y comparación segura de secretos.
- La palabra "eliminar" no aparece en ninguna pantalla (lo verifica `check:security`).

### 3.2 Verificaciones de Claude Code Web
`lint`, `tsc`, `build`, `test` y `check:security` en verde en las dos apps; tabla de las 15 reglas de `CLAUDE.md` §3 con ✔; confirmación de que **no se tocó** la estructura de la base de datos.

### 3.3 Procedimiento de despliegue
El de **2.3** (usar el método que funcionó en Hito 2), solo para **`crm-123-web`**. La PWA no cambia en este hito.

### 3.4 Variables que deben existir en Vercel en este hito
| Variable | `crm-123-web` | Estado |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_NAME` | ✔ | Ya capturadas en Hito 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✔ | **Obligatoria desde este hito** (llave *secret* de Supabase → API Keys; marcar *Sensitive*) |

### 3.5 Aviso de variables al final del hito (antes de las pruebas)
"Antes de probar, confirma que `SUPABASE_SERVICE_ROLE_KEY` está capturada en `crm-123-web` (marcada *Sensitive*) y que desplegaste la web." Esperar el "listo".

### 3.6 Pruebas de funcionalidad (las hace el humano con un supervisor y un vendedor)
| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Supervisor: **Administración → Catálogos**: crear 1 aseguradora y 1 agente | Aparecen en las listas; se pueden Desactivar y Reactivar |
| 2 | Supervisor: **Porcentajes de comisión**: Auto → Venta·Agente 5, Venta·Ejecutivo 10, Cobranza·Agente 1, Cobranza·Ejecutivo 2 | Se guardan; aviso de que aplican a pólizas nuevas |
| 3 | Supervisor: **Usuarios → Nuevo usuario** (vendedor) | Muestra contraseña temporal **una sola vez**; el cupo sube; al entrar ese usuario le exige cambiarla |
| 4 | Vendedor: crear cliente con teléfono `55 1234 5678` | Se guarda como `5512345678` |
| 5 | Mismo vendedor: crear otro cliente con ese teléfono | "Ya existe un cliente con ese teléfono. Consulta con tu supervisor." |
| 6 | Otro vendedor: intentar crear un cliente con ese teléfono | El mismo mensaje, sin revelar de quién es; no ve al cliente en su lista |
| 7 | Vendedor: crear oportunidad (Auto, $12,000), moverla a **Perdida** | Exige motivo; sale de las abiertas |
| 8 | Crear otra oportunidad (Auto, $12,000) y marcarla **Ganada** | Abre *Emitir póliza* |
| 9 | Emitir póliza: forma de pago **Mensual**, vigencia de 12 meses | La vista previa y la póliza muestran **12 recibos** que suman $12,000.00; el primero vence en la fecha de inicio |
| 10 | Intentar volver a la oportunidad ganada a "Negociación" | Se rechaza con un mensaje claro |
| 11 | Marcar el **recibo 1 como pagado** | Recibo Pagado; la póliza pasa a **Vigente**; el vendedor ve en **Comisiones** 2 filas: Venta $1,200.00 y Cobranza $20.00 |
| 12 | Supervisor: en **Comisiones** ver todas | Ve además las del agente: Venta $600.00 y Cobranza $10.00 (4 en total) |
| 13 | Supervisor: **Liquidar** la comisión de venta del ejecutivo | Pasa a Liquidada; ya no se puede modificar |
| 14 | Registrar actividad (llamada) en un cliente y crear un seguimiento para ayer | La actividad no tiene botón de editar; el seguimiento aparece como **vencido** en el Tablero; **Marcar hecho** lo quita |
| 15 | Registrar un siniestro en la póliza y pasarlo a **Pagado** | Se guarda con fecha de cierre |
| 16 | **Cancelar póliza** con motivo | Los recibos pendientes quedan **Cancelados**; los pagados y las comisiones se conservan; no se puede reactivar |
| 17 | Vendedor: revisar menús y buscar la palabra "eliminar" | No existe; no aparece **Administración** |
| 18 | Vendedor: escribir en la barra del navegador la dirección de una pantalla de Administración | Error 404 |

### 3.7 Cierre del Hito 3
Informe con verificaciones, tabla de 15 reglas, resultado de las 18 pruebas (las informa el humano) y pregunta: **"¿Confirmas el Hito 3 para avanzar al Hito 4?"**. **No avanzar** sin "confirmo Hito 3".

---

# HITO 4 — Supervisión y una automatización

**Ejecuta:** Claude Code Web.
**Qué construye:** agrega a la funcionalidad existente **el panel del equipo** y el **flujo JSON de n8n del spec (resumen matutino)** para **importarlo manualmente en n8n Cloud**.
**Al terminar, el proyecto queda completo.** Antes de cerrarlo se necesita la confirmación del humano.

### 4.0 Inicio de hito: variables de entorno
Tabla del **Mapa maestro** con estado actual. Novedad: **se usan por primera vez** `N8N_WEBHOOK_SECRET`, `N8N_API_SECRET`, `N8N_WEBHOOK_URL`, `MODO_PRUEBA`, `TEST_RECIPIENT_EMAIL`, `RESEND_FROM_EMAIL` y `SUPABASE_SERVICE_ROLE_KEY` en la **PWA**. Claude Code Web **genera los dos secretos aleatorios** y se los muestra **una sola vez** al humano; explica cómo conseguir cada valor; verifica la tabla `variable → configurada / falta`.

### 4.1 Qué se construye
**Panel del equipo (PWA)**
- **P3 Panel:** indicadores del equipo y ranking de vendedores.
- **P4 Detalle de vendedor**, **P5 Buscar y reasignar**, **P6 Resumen matutino** (interruptor, "Enviar ahora", estado de la última ejecución, aviso de modo de pruebas).

**Supervisión en escritorio**
- Diálogo **Reasignar cliente** en la ficha de cliente.
- **Metas (D18)** y **Historial (D19)**.
- El Tablero del supervisor con las vistas del equipo.

**Automatización**
- Endpoints y protecciones de `TECHNICAL_SPEC.md` §8.3 y §10: `/api/summary/trigger`, `/api/summary/toggle`, `/api/summary/status`, `/api/n8n/config`, `/api/n8n/summary-data`, `/api/n8n/run-report`; comparaciones con `crypto.timingSafeEqual`; sin que n8n toque Postgres.
- **`n8n/WF-CRM123.json`:** flujo importable con los 11 nodos de `TECHNICAL_SPEC.md` §10.4, **sin secretos** dentro del archivo.
- Instrucciones de importación y activación (abajo).

### 4.2 Verificaciones de Claude Code Web
`lint`, `tsc`, `build`, `test` y `check:security` en verde en las dos apps; tabla de las 15 reglas con ✔; confirmación de que el JSON de n8n **no contiene** llaves ni URLs reales; confirmación de que no se tocó la base de datos. Pruebas unitarias nuevas: comparación segura de secretos y compuertas del `run_id` (único uso y vigencia).

### 4.3 Procedimiento de despliegue y de n8n (lo hace el humano, **en este orden**)
1. **Vercel — PWA, parte 1:** capturar en `crm-123-pwa` las variables de **4.4** que **no dependen de n8n** (`SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_SECRET`, `N8N_API_SECRET`, `MODO_PRUEBA`, `TEST_RECIPIENT_EMAIL`, `RESEND_FROM_EMAIL`). Desplegar **web y PWA** con el método de Hito 2.
2. **Resend:** entrar a resend.com con **ayaddis@gmail.com** (el correo con el que se registró la cuenta) → *API Keys* → crear una llave de envío → copiarla (se usará en n8n; no se pega en ningún otro lugar).
3. **n8n Cloud — credenciales** (*Credentials → Add credential*):
   - **Header Auth** `CRM123 Webhook`: *Name* `x-crm-webhook-secret`, *Value* = `N8N_WEBHOOK_SECRET`.
   - **Header Auth** `CRM123 API`: *Name* `x-n8n-secret`, *Value* = `N8N_API_SECRET`.
   - **Bearer Auth** `Resend`: *Token* = la API key de Resend.
4. **n8n Cloud — importar el flujo:** *Workflows → Import from file* → `n8n/WF-CRM123.json` (el nombre del flujo debe quedar **`WF-CRM123`**). Revisar que **Workflow Settings → Timezone** sea `America/Mexico_City`. En los dos nodos **Set** ("Contexto programado" y "Contexto manual") escribir en `pwa_base_url` la **URL de producción de la PWA** (sin barra final). Asignar a cada nodo la credencial correspondiente (si n8n lo pide).
5. **Copiar la URL del webhook:** nodo **Webhook "Disparo manual"** → pestaña **Production URL** → copiar.
6. **Vercel — PWA, parte 2:** capturar `N8N_WEBHOOK_URL` con esa URL. **Volver a desplegar la PWA.**
7. **No activar el flujo todavía.** Se activa después de las pruebas 1 a 9. (Para probar, n8n permite ejecutar manualmente con *Execute workflow*; el disparador del webhook de producción requiere el flujo activo, por lo que para la prueba 4 se activa y se vuelve a pausar si algo falla.)

### 4.4 Variables que deben existir en Vercel en este hito

| Variable | `crm-123-web` | `crm-123-pwa` | Cómo obtener el valor |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_NAME` | ✔ | ✔ | Ya capturadas |
| `SUPABASE_SERVICE_ROLE_KEY` | ✔ | ✔ **(nueva en PWA)** | Llave *secret* de Supabase (*Sensitive*) |
| `N8N_WEBHOOK_SECRET` | — | ✔ | Valor aleatorio que entrega Claude Code Web (guárdalo también para la credencial de n8n) |
| `N8N_API_SECRET` | — | ✔ | Otro valor aleatorio que entrega Claude Code Web (también para n8n) |
| `N8N_WEBHOOK_URL` | — | ✔ | Production URL del nodo Webhook (paso 5) |
| `MODO_PRUEBA` | — | ✔ | `true` |
| `TEST_RECIPIENT_EMAIL` | — | ✔ | `ayaddis@gmail.com` |
| `RESEND_FROM_EMAIL` | — | ✔ | `onboarding@resend.dev` |

### 4.5 Aviso de variables al final del hito (antes de las pruebas)
"Antes de probar, confirma que (1) capturaste en `crm-123-pwa` **todas** las variables de 4.4 —incluida `N8N_WEBHOOK_URL`—, (2) desplegaste la PWA **después** de capturar `N8N_WEBHOOK_URL`, (3) creaste las tres credenciales en n8n, (4) importaste `WF-CRM123` y pusiste `pwa_base_url`, y (5) la cuenta de Resend está registrada con ayaddis@gmail.com." Esperar el "listo".

### 4.6 Pruebas de funcionalidad (las hace el humano)
| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | PWA como supervisor: abrir **Panel** | Indicadores y ranking con los datos de Hito 3 |
| 2 | Tocar un vendedor | Ver sus seguimientos vencidos, recibos vencidos y *pipeline*; botón **Llamar** |
| 3 | **Buscar** un cliente por teléfono y **Reasignarlo** a otro vendedor | Aviso de lo que se mueve; el cliente aparece al nuevo vendedor y desaparece del anterior; las comisiones ya generadas siguen del vendedor original |
| 4 | **Resumen → Enviar ahora** (con el flujo activo) | Estado "Enviando resumen…" y, en menos de 2 minutos, resultado con enviados; llegan correos a **ayaddis@gmail.com** con asunto `[Para: Nombre del vendedor]` (uno por cada vendedor activo y supervisor) |
| 5 | Pulsar **Enviar ahora** dos veces seguidas | El segundo intento dice "Espera unos segundos…" (enfriamiento de 120 s); no se envían correos duplicados |
| 6 | Abrir los correos | Muestran seguimientos, recibos y renovaciones del vendedor (o "Sin pendientes hoy"); al supervisor, el resumen del equipo |
| 7 | Activar el **interruptor** de envío automático; en n8n ejecutar el flujo desde el disparador programado (*Execute workflow*) | Con interruptor apagado el flujo termina sin enviar; con interruptor encendido envía |
| 8 | Entrar como **vendedor** a la PWA | Pantalla "Solo para supervisores". (El rechazo con 403 del envío para un vendedor lo comprueba Claude Code Web con una prueba automática) |
| 9 | Pruebas de seguridad del endpoint (las ejecuta Claude Code Web con pruebas automáticas o el humano con instrucciones): llamar `/api/n8n/summary-data` **sin** cabecera de secreto, con secreto **incorrecto**, y con un `run_id` ya usado | Respuesta 401 en los dos primeros; `invalid_run` en el tercero |
| 10 | Desktop: **Administración → Metas** (fijar una meta del mes) y **Historial** | La meta aparece en "Mi mes" del vendedor; el Historial muestra las altas, el cambio de metas, la reasignación y los envíos del resumen; no hay opciones para editar o quitar registros |
| 11 | Después de las pruebas: **activar** el flujo `WF-CRM123` y verificar a la mañana siguiente (lun-vie, 7:30) | Llega el resumen automático solo si el interruptor está activado |

### 4.7 Cierre del Hito 4 y del proyecto
Informe final con verificaciones, tabla de 15 reglas, resultados de las 11 pruebas, y una lista de **pendientes conocidos**: pasar a un dominio propio en Resend y cambiar `MODO_PRUEBA` a `false` (el MVP envía solo a `ayaddis@gmail.com` mientras tanto), y desactivar el vendedor de prueba. Preguntar: **"¿Confirmas el Hito 4 y el cierre del proyecto?"**.
