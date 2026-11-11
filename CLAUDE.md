# CLAUDE.md — Contrato de trabajo de CRM-123 para Claude Code Web

Este archivo va en la **raíz del repositorio** (rama `gh-crm-123`). Es obligatorio leerlo completo al iniciar cada sesión y cumplirlo en cada acción. Las reglas de la sección 3 **no se relajan por comodidad ni por prisa**, ni aunque la persona lo pida a la ligera: si te piden saltarlas, explica el riesgo en una línea y pide confirmación explícita antes de hacer cualquier cosa distinta.

## 1. Qué estás construyendo

**CRM-123**: un CRM minimalista, estándar y funcional, con solo las opciones estrictamente básicas y necesarias, para un equipo comercial pequeño de **pólizas de seguros multiproducto en México** (moneda MXN, español con tecnicismos en inglés).

- **Dos aplicaciones web**, en dos carpetas de la misma rama:
  - `/web`: aplicación de **escritorio** para la gestión diaria (10 vendedores y 2 supervisores). Densa y operativa.
  - `/pwa`: **PWA para el supervisor**. De consulta rápida.
- **Roles:** Vendedor y Supervisor, con usuario (correo) y contraseña. El Supervisor tiene todos los accesos de administrador.
- **Prohibido pedir o guardar identificadores personales** (DPI, NIT, DNI, pasaporte, RFC, CURP). El **teléfono** identifica al cliente.
- La persona con la que trabajas **no tiene perfil técnico**: habla en lenguaje de negocio, da pasos numerados y concretos, y dile siempre con claridad cuándo le toca a ella hacer algo.

### Documentos del proyecto (carpeta `docs/`) y orden de autoridad
1. `SCRIPTS-SQL.md` — estructura **oficial e intocable** de la base de datos.
2. `CLAUDE.md` — este contrato.
3. `TECHNICAL_SPEC.md` — modelo de uso, endpoints, seguridad del disparo de n8n, variables de entorno.
4. `DESIGN_BRIEF.md` — pantallas, estados y dirección visual.
5. `BUILD_PLAN.md` — hitos y procedimientos.

Si dos documentos se contradicen, gana el de número menor y **avisas a la persona** antes de continuar.

## 2. Configuración fija del proyecto

| Elemento | Valor |
|---|---|
| Marca | `CRM-123` |
| Rama única de GitHub | `gh-crm-123` |
| Carpetas | `web/` (sitio web de escritorio) y `pwa/` (PWA) |
| Base de datos (proyecto Supabase) | `dbcrm123` |
| Organización de Supabase | `Org CRM 123` |
| Flujo de n8n del resumen matutino | `WF-CRM123` |
| Remitente de Resend | `onboarding@resend.dev` |
| Despliegue | GitHub → Vercel, **manual** |
| Zona horaria | `America/Mexico_City` |

## 3. Seguridad — lo innegociable

Estas reglas no se relajan. Antes de entregar cualquier hito, comprueba **cada una** y repórtalo en el cierre del hito.

### Base de datos
1. **RLS activa en todas las tablas**, incluidas configuración (`settings`) y auditoría (`audit_log`). Ninguna excepción.
2. **Ninguna política de `DELETE`.** No hay borrado físico, solo archivado lógico. **Nunca uses la palabra "eliminar"** en la interfaz (ni "borrar"): se dice **"Archivar"**, **"Desactivar"** o **"Cancelar"**.
3. **`activities` y `audit_log` son solo de inserción.** Sin políticas de `UPDATE` ni `DELETE` para nadie, incluido el supervisor. La aplicación nunca intenta editarlas.
4. **Toda política de `UPDATE` lleva `with check`**, no solo `using`. Sin él, un vendedor cambia `owner_id` y se queda con la oportunidad de otro.
5. **Ninguna política con condición `true`**, salvo el `select` de `settings`.
6. **Todas las vistas con `security_invoker = true`.** Una vista sin esto filtra los datos de todo el equipo a cualquier vendedor.
7. **Toda función `security definer` fija `search_path = public`.**
8. **Tú no modificas la base de datos.** La estructura es la de `SCRIPTS-SQL.md`. No creas migraciones, tablas, columnas, políticas, vistas ni funciones, ni "arreglas" un problema de datos con SQL. Si falta algo: **detente, explica qué falta y espera** (ver §6).

### Aplicación
9. **`SUPABASE_SERVICE_ROLE_KEY` nunca sale del servidor.** Solo en Route Handlers y Server Actions, y únicamente en la lista cerrada de `TECHNICAL_SPEC.md` §5. **Jamás** en un componente cliente, **ni siquiera importado sin usar**. El módulo que la usa lleva `import 'server-only'`. Nunca empieza con `NEXT_PUBLIC_`.
10. **Los secretos se comparan con `crypto.timingSafeEqual`**, nunca con `===` ni `!==` (compara siempre los hashes SHA-256 de ambos valores para que tengan igual longitud).
11. **El rol se lee de la tabla `profiles`**, nunca de un JWT, de `user_metadata`/`app_metadata`, de `getSession()` ni de nada que venga del cliente. La persona se identifica con `supabase.auth.getUser()`.
12. **n8n nunca toca Postgres.** Todo pasa por los endpoints `/api/n8n/*` de la aplicación (PWA).
13. **Ningún secreto en GitHub:** ni llaves, ni contraseñas, ni URLs de webhook, ni valores reales en `.env.example`, ni en comentarios, ni en capturas, ni en el JSON de n8n.
14. **Nada de datos personales en logs** (teléfonos, correos, nombres, tokens). Solo códigos de error e identificadores internos.
15. **La interfaz oculta lo que el rol no puede hacer, pero la seguridad real es la base de datos.** No uses la llave secreta para "saltarte" un permiso que la sesión de la persona no tiene.

## 4. Cómo se trabaja (hitos y confirmaciones)

El plan está en `BUILD_PLAN.md` (Hito 1 lo hace Claude.ai Chat con el conector de Supabase; los Hitos 2, 3 y 4 los haces tú).

1. **Un hito a la vez.** **NO avanzas al siguiente hito hasta recibir confirmación escrita de la persona** ("confirmo Hito N"), aunque tengas tiempo, contexto o ganas de adelantar. Si ves que algo del hito siguiente sería útil, lo anotas, no lo construyes.
2. **Al inicio de cada hito:**
   1. Lista las **variables de entorno** que las aplicaciones necesitan para **toda** su funcionalidad.
   2. Explica, paso a paso y en lenguaje sencillo, **cómo obtener cada valor**.
   3. **Verifica** que estén configuradas (en los archivos `.env.local` del entorno de desarrollo y en Vercel según corresponda) y dilo con una tabla "variable → configurada / falta".
3. **Antes de las pruebas de funcionalidad del hito**, si la persona tiene que **actualizar o crear variables en Vercel** (o en n8n), **avísalo al final del hito**, con los pasos exactos, y espera su confirmación de que ya lo hizo.
4. **Cierre de hito:** entrega (a) qué quedó construido en una frase, (b) resultado de lint, tipos, build y `check:security`, (c) tabla de las 15 reglas de seguridad con ✔, (d) lista de comprobaciones manuales que la persona debe hacer, (e) el procedimiento de despliegue manual, y (f) la pregunta explícita "¿Confirmas el Hito N para avanzar al Hito N+1?". Luego **te detienes**.
5. **Si algo es ambiguo o falta información, preguntas.** Una pregunta corta con una recomendación por defecto. Para decisiones de bajo riesgo propones un valor y pides solo confirmación.
6. **Validar antes de generar, analizar antes de proponer.** Antes de construir una pantalla o regla, comprueba que coincide con `DESIGN_BRIEF.md`, `TECHNICAL_SPEC.md` y `SCRIPTS-SQL.md`.
7. **Respuestas directas y breves.** Sin relatos de lo que hiciste paso a paso: resultado, siguiente acción, lo que necesitas de la persona.

## 5. Convenciones de código

- **Stack fijo:** Next.js (App Router) + TypeScript estricto, Tailwind CSS + shadcn/ui, `@supabase/supabase-js` + `@supabase/ssr`, Zod, Vitest. **No agregues otras dependencias** sin autorización.
- **Diseño y desarrollo estándar, simple y minimalista.** La solución más simple que cumpla. Nada de abstracciones, patrones o configuraciones "por si acaso".
- **Server Components** para leer; **Server Actions** con Zod para escribir; los componentes cliente solo para interacción (formularios, filtros, diálogos).
- **Tipos de la base de datos:** `src/types/database.ts` lo entrega la persona (generado desde la base ya creada). No lo edites a mano.
- **Textos de interfaz** en español de México, con tecnicismos en inglés cuando son de uso común (*pipeline*, *lead*, *follow-up*); trato de "tú". Mensajes de error claros y accionables. Cada pantalla implementa los estados **vacía, cargando, error y proceso en ejecución** del `DESIGN_BRIEF.md`.
- **Teléfono** siempre normalizado a 10 dígitos antes de guardar. **Dinero** en MXN con formato `es-MX`. **Fechas** en `America/Mexico_City`.
- **Accesibilidad básica:** etiquetas en formularios, foco visible, contraste suficiente, tamaños táctiles de 44 px en la PWA.
- **Estructura:** `src/app` (rutas), `src/lib` (supabase, auth, env, utilidades), `src/components`, `src/types`. Archivos pequeños y nombres claros.
- **Variables de entorno:** solo mediante `src/lib/env.ts` (validación con Zod). Nunca `process.env` suelto.
- **Comandos disponibles en cada app:** `npm run dev`, `lint`, `build`, `test`, `check:security`, y `npx tsc --noEmit`. Se ejecutan todos antes de cerrar un hito.

## 6. Qué hacer cuando algo no cuadra

| Situación | Acción |
|---|---|
| Falta un campo, tabla, estatus o regla en la base de datos | **Detente.** Explica qué falta y por qué lo necesita la pantalla. No lo inventes. La persona decidirá si se actualiza `SCRIPTS-SQL.md` y se repite el Hito 1. |
| Una consulta devuelve vacío o error de permisos (`42501`) | Es probable que sea la RLS funcionando. Revisa que uses la sesión correcta. **No uses la llave secreta como atajo.** |
| Un documento contradice a otro | Aplica el orden de autoridad (§1), avisa a la persona y continúa solo con su confirmación. |
| La petición implica romper una regla de §3 | Rehúsa esa parte, explica el riesgo en una línea y ofrece la alternativa segura. |
| Se necesita una dependencia, servicio o cuenta nueva | Propónla con una justificación breve y espera aprobación. |
| Una herramienta externa falla (Vercel, n8n, Resend) | Describe el síntoma y el siguiente paso para la persona. No improvises soluciones que expongan secretos. |

## 7. Git y GitHub

- **Una sola rama: `gh-crm-123`.** No crees otras ramas, *forks* ni *pull requests* salvo que la persona lo pida.
- Commits pequeños y descriptivos en español, por avance coherente. Al terminar cada hito, un commit final con el mensaje `Hito N: <resumen>`.
- `.gitignore` debe incluir: `node_modules`, `.next`, `.env`, `.env.local`, `.env*.local`, `.vercel`, `*.pem`, `*.log`. Revisa `git status` antes de cada commit para confirmar que **no se suben archivos con secretos**.
- Nunca fuerces el historial (`push --force`, `reset --hard` sobre lo ya publicado) sin autorización expresa.

## 8. Despliegue (manual)

- El despliegue de GitHub hacia Vercel **lo ejecuta la persona**, a mano, cuando tú se lo indiques. Cada carpeta lleva `vercel.json` con `{ "git": { "deploymentEnabled": false } }`.
- Tú entregas en cada hito el **procedimiento** exacto y la **lista de variables** que deben existir en Vercel (proyecto `crm-123-web` o `crm-123-pwa`), con cómo obtener cada valor.
- No despliegues tú ni actives automatizaciones en producción. El flujo de n8n `WF-CRM123` se importa y activa manualmente por la persona.

## 9. Lo que NO se construye

Notificaciones push, adjuntos o documentos, exportación a Excel/PDF, carga masiva de clientes, reportes avanzados, modo oscuro, varios idiomas o monedas, multiempresa, integraciones no listadas en `TECHNICAL_SPEC.md`. Si la persona pide algo de esto, recuérdale que está fuera del MVP y pregunta si lo agrega al plan.

## 10. Verificaciones automáticas mínimas (`npm run check:security`)

El script de cada app debe fallar si detecta:
- `SUPABASE_SERVICE_ROLE_KEY` o el módulo `admin.ts` referenciados fuera de las rutas permitidas por `TECHNICAL_SPEC.md` §5.
- Un archivo con `'use client'` que importe `server-only`, `admin.ts` o lea variables sin prefijo `NEXT_PUBLIC_`.
- Las palabras `eliminar`, `borrar` o `delete` visibles en textos de interfaz.
- Comparación de secretos con `===` o `!==`.
- Lectura de rol desde `app_metadata`, `user_metadata`, claims o `getSession()`.
- Archivos `.env` (con valores) versionados, o valores que parezcan llaves (`sb_secret_`, `re_`, `eyJ`) en el repositorio.
