# SCRIPTS-SQL.md — Estructura oficial de la base de datos de CRM-123

> **Este documento es la fuente única de verdad de la base de datos.** Ningún otro documento, diseño ni código puede cambiar, renombrar ni agregar tablas, columnas, estatus, políticas, vistas o funciones. Si algo no alcanza, se detiene el trabajo y se pregunta al humano (ver §10).

- **Marca:** CRM-123 · **Base de datos (proyecto Supabase):** `dbcrm123` · **Organización:** `Org CRM 123`
- **Negocio:** pólizas de seguros multiproducto · **País / moneda:** México / MXN · **Zona horaria:** `America/Mexico_City`
- **Verificación realizada:** los scripts 01 a 07 y las pruebas 08a y 08b se ejecutaron en un Postgres local con roles simulados (`anon`, `authenticated`, `service_role`): **21 verificaciones estructurales en 0 violaciones y 98 pruebas de comportamiento en 0 fallos**. En Supabase real se deben volver a ejecutar (§8).

## 1. Para qué sirve y quién la usa

| Quién | Cómo la usa |
|---|---|
| **Claude.ai Chat** (Hito 1, con el conector MCP de Supabase) | Aplica los scripts 01 a 07 en orden y ejecuta las pruebas 08a y 08b. Comprueba llaves, índices, roles, políticas y condiciones de integridad. |
| **Claude Design** | Toma las entidades, campos y catálogos de valores (§4 y §5) como referencia. No inventa campos ni estatus. |
| **Claude Code Web** | Usa esta estructura de forma estricta como almacén de datos. No crea migraciones propias. |

## 2. Reglas de seguridad innegociables (ya aplicadas en los scripts y comprobadas en 08a/08b)

1. **RLS activa en las 17 tablas**, incluidas `settings` y `audit_log`. Sin excepciones.
2. **Ninguna política `DELETE`** y ningún privilegio `DELETE` ni `TRUNCATE` para `anon` o `authenticated`. No hay borrado físico: solo archivado lógico (`archived_at`, `is_active`, estatus `cancelada`/`cancelado`). La interfaz nunca usa la palabra "eliminar".
3. **`activities` y `audit_log` son solo de inserción:** sin políticas `UPDATE`/`DELETE` para nadie, además un trigger bloquea cualquier `UPDATE`, `DELETE` o `TRUNCATE`, y a `service_role` se le revocan esos privilegios.
4. **Toda política `UPDATE` lleva `WITH CHECK`**, no solo `USING`.
5. **Ninguna política con condición `true`**, salvo el `SELECT` de `settings` (que no guarda secretos).
6. **Todas las vistas con `security_invoker = true`.**
7. **Toda función `SECURITY DEFINER` fija `search_path = public`.**
8. **El rol se lee de `profiles`** mediante `is_supervisor()` / `app_role()`, nunca de un JWT ni de datos del cliente.
9. **Privilegios mínimos:** `anon` no tiene acceso a nada. `authenticated` solo `SELECT/INSERT/UPDATE` donde la política lo permite. `run_daily_maintenance()` solo la ejecuta `service_role`.
10. **Sin identificadores personales:** no existen columnas para RFC, CURP, DPI, NIT, DNI ni pasaporte. El teléfono (10 dígitos) identifica al cliente.

## 3. Convenciones

- Nombres de tablas y columnas en inglés `snake_case`; textos de interfaz en español.
- Llaves primarias `uuid` (`gen_random_uuid()`), salvo `settings.key` (texto) y `audit_log.id` (entero autogenerado).
- Fechas de negocio (`due_date`, `start_date`, `end_date`, `event_date`, `paid_at`) son `date`. Marcas de tiempo (`created_at`, `closed_at`, etc.) son `timestamptz`.
- Dinero en `numeric(12,2)` en MXN. Porcentajes en `numeric(5,2)` entre 0 y 100.
- Teléfonos: exactamente **10 dígitos** sin espacios, guiones ni lada (la aplicación los normaliza antes de guardar: quita todo lo que no sea dígito y un prefijo `52` si sobran dígitos).
- Correos siempre en minúsculas.
- Ninguna llave foránea borra en cascada (`on delete restrict` en todas).

## 4. Modelo de datos

### 4.1 Tablas (17)

| Tabla | Para qué sirve | Quién la ve | Quién escribe |
|---|---|---|---|
| `profiles` | Un perfil por usuario: nombre, correo, rol (`vendedor`/`supervisor`), activo, obligar cambio de contraseña. Máx. 10 vendedores y 2 supervisores activos. | Cada quien su fila; supervisor todas | Alta: servidor con llave secreta. Edición: supervisor |
| `products` | Catálogo de productos | Todo usuario activo | Supervisor |
| `insurers` | Catálogo de aseguradoras | Todo usuario activo | Supervisor |
| `agents` | Catálogo de agentes (nombre, teléfono) | Todo usuario activo | Supervisor |
| `clients` | Clientes (teléfono único) con responsable (`owner_id`) | Responsable; supervisor todos | Responsable; supervisor |
| `opportunities` | Embudo de venta | Responsable; supervisor | Responsable; supervisor |
| `policies` | Póliza emitida (nace de una oportunidad Ganada) | Responsable (ejecutivo); supervisor | Responsable; supervisor |
| `policy_commission_terms` | Copia de los porcentajes vigentes al emitir | **Solo supervisor** | Solo el sistema (trigger) |
| `premium_receipts` | Recibos de cobranza de cada póliza | Quien ve la póliza | El sistema los crea; el responsable marca "pagado" |
| `claims` | Siniestros (reclamaciones) de una póliza | Quien ve la póliza | Quien ve la póliza |
| `commission_rates` | Porcentajes por producto (4 por producto) | **Solo supervisor** | Supervisor |
| `commissions` | Comisiones generadas (venta/cobranza × ejecutivo/agente) | Vendedor: solo las suyas como ejecutivo; supervisor todas | El sistema las crea; solo el supervisor las liquida |
| `activities` | Historial de contactos (**solo inserción**) | Quien ve al cliente | Quien ve al cliente (solo alta) |
| `follow_ups` | Seguimientos con fecha | Responsable; supervisor | Responsable; supervisor |
| `goals` | Meta mensual de prima por vendedor | Vendedor su meta; supervisor todas | Supervisor |
| `settings` | Configuración general (sin secretos) | Todo usuario autenticado | Supervisor |
| `audit_log` | Bitácora (**solo inserción**) | **Solo supervisor** | El sistema (triggers, `log_event`, servidor) |

### 4.2 Relaciones principales

```
profiles ──< clients ──< opportunities ──(Ganada)──< policies ──< premium_receipts ──< commissions
   │             │              │                         │  ├──< claims                    ▲
   │             └──< activities └──< follow_ups         │  └── policy_commission_terms    │
   └─ (ejecutivo) = policies.owner_id ─────────────────────┘                  agents ──────┘ (beneficiario agente)
products ──< opportunities / policies / commission_rates       insurers ──< policies
```

- Una oportunidad solo puede tener **una póliza no cancelada**. Si la póliza se cancela, puede emitirse otra sobre la misma oportunidad.
- Al insertar una póliza, el sistema copia `client_id`, `product_id` y `owner_id` desde la oportunidad (la aplicación solo envía `opportunity_id`, aseguradora, agente opcional, número, prima, forma de pago y vigencia).
- El **ejecutivo** de una póliza es el vendedor responsable (`policies.owner_id`). El **agente** es opcional (`policies.agent_id`).

## 5. Catálogos de valores (únicos permitidos)

| Campo | Valores | Etiqueta en la interfaz |
|---|---|---|
| `profiles.role` | `vendedor`, `supervisor` | Vendedor, Supervisor |
| `clients.source` | `referido`, `redes`, `llamada_en_frio`, `otro` | Referido, Redes, Llamada en frío, Otro |
| `opportunities.stage` | `nuevo`, `contactado`, `cotizacion_enviada`, `negociacion`, `ganada`, `perdida` | Nuevo, Contactado, Cotización enviada, Negociación, Ganada, Perdida |
| `policies.payment_frequency` | `anual`, `semestral`, `trimestral`, `mensual` | Anual, Semestral, Trimestral, Mensual |
| `policies.status` | `emitida`, `vigente`, `cancelada`, `vencida` | Emitida, Vigente, Cancelada, Vencida |
| `premium_receipts.status` | `pendiente`, `pagado`, `vencido`, `cancelado` | Pendiente, Pagado, Vencido, Cancelado |
| `claims.status` | `reportado`, `en_tramite`, `pagado`, `rechazado`, `cerrado` | Reportado, En trámite, Pagado, Rechazado, Cerrado |
| `commissions.beneficiary_type` | `ejecutivo`, `agente` | Ejecutivo, Agente |
| `commissions.commission_type` | `venta`, `cobranza` | Venta, Cobranza |
| `commissions.status` | `pendiente`, `liquidada` | Pendiente, Liquidada |
| `activities.type` | `llamada`, `whatsapp`, `correo`, `reunion`, `nota` | Llamada, WhatsApp, Correo, Reunión, Nota |
| `follow_ups.status` | `pendiente`, `hecho`, `cancelado` | Pendiente, Hecho, Cancelado |
| `audit_log.action` | `insert`, `update`, `event` | Alta, Cambio, Evento |

Productos iniciales: **Auto, Accidentes y Salud, Daños, Hogar, Pyme**.

Claves de `settings` (valor en `jsonb`):

| Clave | Valor inicial | Uso |
|---|---|---|
| `morning_summary_enabled` | `false` | Interruptor del envío automático (lo cambia el supervisor en la PWA) |
| `morning_summary_time` | `"07:30"` | Hora local del envío |
| `timezone` | `"America/Mexico_City"` | Zona horaria |
| `receipt_alert_days` | `7` | Días para alertar recibos por vencer |
| `renewal_days` | `60` | Días para alertar renovaciones |
| `summary_weekdays` | `[1,2,3,4,5]` | Lunes a viernes |
| `trigger_cooldown_seconds` | `120` | Espera mínima entre disparos manuales del resumen |

## 6. Reglas automáticas que ya hace la base de datos

| Cuando… | La base de datos… |
|---|---|
| Se inserta una póliza | Verifica que la oportunidad esté **Ganada**; copia cliente, producto y responsable; guarda la copia de los 4 porcentajes del producto (`policy_commission_terms`); **genera el calendario de recibos**: anual 1, semestral 2, trimestral 4, mensual 12. El primero vence en `start_date`; el último absorbe el redondeo para que la suma sea igual a la prima anual. |
| Se marca un recibo como `pagado` | Registra fecha y quien pagó (no se permiten fechas futuras); pasa la póliza de `emitida` a `vigente`; genera comisiones: **venta** (solo en el recibo 1; base = prima anual) y **cobranza** (en cada recibo pagado; base = monto del recibo), para el ejecutivo y para el agente (si hay), solo si el porcentaje es mayor a 0. |
| Se cancela una póliza (motivo obligatorio) | Pasa sus recibos `pendiente`/`vencido` a `cancelado`; conserva los pagados y las comisiones ya generadas. Una póliza cancelada no se reactiva ni cambia sus datos de cancelación. |
| Una persona intenta cambiar el estatus de una póliza | Solo se permite cancelar. `vigente` y `vencida` los pone el sistema. |
| Una persona intenta cambiar prima, vigencia o forma de pago de una póliza | Se rechaza. Para corregir: cancelar y emitir de nuevo. |
| Un recibo ya está pagado o cancelado | No se puede modificar. Las personas solo pueden marcar `pagado`; no cambian monto ni fecha. |
| Una comisión se liquida | Registra fecha y quién; ya no se modifica. Solo cambia el estatus de liquidación. |
| Una oportunidad pasa a Ganada o Perdida | Registra `closed_at`. `perdida` exige motivo. Con póliza no cancelada no se puede reabrir. |
| Se crea un siniestro | Toma el cliente de la póliza; al llegar a `pagado`, `rechazado` o `cerrado` registra `closed_at`. |
| Se cambia el responsable de algo | Solo es posible con `reassign_client()` (supervisor): mueve cliente, oportunidades, seguimientos pendientes y pólizas `emitida`/`vigente`. Las comisiones ya generadas conservan al ejecutivo original. Queda en bitácora. |
| Se da de alta o cambia casi cualquier tabla | Se registra en `audit_log` (qué, quién, antes y después). |
| Se intenta superar 10 vendedores activos o 2 supervisores activos | Se rechaza. Nadie puede desactivarse ni cambiar su propio rol. |
| Se ejecuta `run_daily_maintenance()` (solo servidor) | Pasa a `vencida` las pólizas cuya vigencia terminó y a `vencido` los recibos atrasados. Las vistas ya muestran el estatus efectivo aunque este proceso no haya corrido. |

**Funciones disponibles para la aplicación** (RPC): `mark_password_changed()`, `log_event(evento, detalles)`, `reassign_client(cliente, nuevo_responsable)` (personas autenticadas); `run_daily_maintenance()` (solo `service_role`).

**Vistas** (todas `security_invoker`): `v_policies`, `v_receipts`, `v_follow_ups`, `v_commissions`, `v_seller_ranking`, `v_team_kpis`. Incluyen estatus efectivo (`effective_status`), días para vencer y banderas de atraso; el nombre del cliente puede venir vacío si el cliente fue reasignado a otra persona (la interfaz muestra "Cliente reasignado").

## 7. Orden de ejecución y nombres de migración

| Orden | Script | Nombre de migración sugerido | Contenido |
|---|---|---|---|
| 1 | `01_tables.sql` | `crm123_01_tables` | Tablas, restricciones e índices |
| 2 | `02_functions.sql` | `crm123_02_functions` | Funciones y reglas de negocio |
| 3 | `03_triggers.sql` | `crm123_03_triggers` | Triggers |
| 4 | `04_rls.sql` | `crm123_04_rls` | RLS y políticas |
| 5 | `05_views.sql` | `crm123_05_views` | Vistas |
| 6 | `06_grants.sql` | `crm123_06_grants` | Privilegios mínimos |
| 7 | `07_seed.sql` | `crm123_07_seed` | Productos, porcentajes en 0 y configuración |
| 8 | `08a_tests_estructura.sql` | (no es migración) | Verificación estructural |
| 9 | `08b_tests_comportamiento.sql` | (no es migración) | Pruebas por rol |

Aplicar 01 a 07 con `apply_migration` (uno por script, en este orden) y las pruebas con `execute_sql`. El orden importa: las funciones leen tablas, los triggers usan funciones, las políticas usan funciones y las vistas usan funciones.


## 8. Scripts

### 8.1 `01_tables.sql` — Tablas, restricciones e índices

```sql
-- ============================================================
-- CRM-123 · 01_tables.sql
-- Tablas, restricciones de integridad e índices
-- Base de datos: dbcrm123 · Esquema: public
-- ============================================================

-- 1. profiles: un perfil por usuario de Supabase Auth (fuente única del rol)
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete restrict,
  full_name            text not null check (length(trim(full_name)) > 0),
  email                text not null check (email = lower(email)),
  role                 text not null check (role in ('vendedor', 'supervisor')),
  is_active            boolean not null default true,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (email);
create index profiles_role_active_idx on public.profiles (role) where is_active;

-- 2. products: catálogo de productos (lo edita solo el supervisor)
create table public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_name_key on public.products (lower(name));

-- 3. insurers: catálogo de aseguradoras
create table public.insurers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index insurers_name_key on public.insurers (lower(name));

-- 4. agents: catálogo de agentes (intermediarios que cobran comisión)
create table public.agents (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null check (length(trim(full_name)) > 0),
  phone      text not null check (phone ~ '^[0-9]{10}$'),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index agents_phone_key on public.agents (phone);

-- 5. clients: el teléfono (10 dígitos, México) es el identificador del cliente
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (length(trim(full_name)) > 0),
  phone       text not null check (phone ~ '^[0-9]{10}$'),
  email       text check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  company     text,
  city_state  text,
  source      text check (source is null or source in ('referido', 'redes', 'llamada_en_frio', 'otro')),
  notes       text,
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  archived_at timestamptz,
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index clients_phone_key on public.clients (phone);
create index clients_owner_idx on public.clients (owner_id) where archived_at is null;
create index clients_name_idx on public.clients (lower(full_name));

-- 6. opportunities: embudo de venta
create table public.opportunities (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid not null references public.clients (id) on delete restrict,
  product_id                uuid not null references public.products (id) on delete restrict,
  owner_id                  uuid not null references public.profiles (id) on delete restrict,
  stage                     text not null default 'nuevo'
                            check (stage in ('nuevo', 'contactado', 'cotizacion_enviada', 'negociacion', 'ganada', 'perdida')),
  estimated_annual_premium  numeric(12,2) not null check (estimated_annual_premium >= 0),
  estimated_close_date      date,
  lost_reason               text,
  closed_at                 timestamptz,
  archived_at               timestamptz,
  created_by                uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint opportunities_lost_reason_chk
    check (stage <> 'perdida' or (lost_reason is not null and length(trim(lost_reason)) > 0)),
  constraint opportunities_closed_at_chk
    check ((stage in ('ganada', 'perdida')) = (closed_at is not null))
);
create index opportunities_client_idx on public.opportunities (client_id);
create index opportunities_owner_stage_idx on public.opportunities (owner_id, stage) where archived_at is null;
create index opportunities_product_idx on public.opportunities (product_id);

-- 7. policies: póliza emitida (nace de una oportunidad Ganada)
create table public.policies (
  id                 uuid primary key default gen_random_uuid(),
  opportunity_id     uuid not null references public.opportunities (id) on delete restrict,
  client_id          uuid not null references public.clients (id) on delete restrict,
  product_id         uuid not null references public.products (id) on delete restrict,
  owner_id           uuid not null references public.profiles (id) on delete restrict, -- ejecutivo
  insurer_id         uuid not null references public.insurers (id) on delete restrict,
  agent_id           uuid references public.agents (id) on delete restrict,
  policy_number      text not null check (length(trim(policy_number)) > 0),
  annual_premium     numeric(12,2) not null check (annual_premium > 0),
  payment_frequency  text not null check (payment_frequency in ('anual', 'semestral', 'trimestral', 'mensual')),
  start_date         date not null,
  end_date           date not null,
  status             text not null default 'emitida' check (status in ('emitida', 'vigente', 'cancelada', 'vencida')),
  cancelled_at       timestamptz,
  cancellation_reason text,
  created_by         uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint policies_dates_chk check (end_date > start_date),
  constraint policies_cancel_chk
    check (status <> 'cancelada'
           or (cancelled_at is not null and cancellation_reason is not null and length(trim(cancellation_reason)) > 0))
);
-- Una oportunidad solo tiene una póliza no cancelada; si se cancela puede emitirse de nuevo
create unique index policies_opportunity_active_key on public.policies (opportunity_id) where status <> 'cancelada';
create unique index policies_insurer_number_key on public.policies (insurer_id, lower(policy_number)) where status <> 'cancelada';
create index policies_opportunity_idx on public.policies (opportunity_id);
create index policies_owner_idx on public.policies (owner_id);
create index policies_client_idx on public.policies (client_id);
create index policies_end_date_idx on public.policies (end_date) where status in ('emitida', 'vigente');
create index policies_agent_idx on public.policies (agent_id);
create index policies_product_idx on public.policies (product_id);

-- 8. policy_commission_terms: copia de los porcentajes vigentes al emitir la póliza (solo supervisor la ve)
create table public.policy_commission_terms (
  policy_id      uuid primary key references public.policies (id) on delete restrict,
  sale_agent_pct numeric(5,2) not null default 0 check (sale_agent_pct between 0 and 100),
  sale_exec_pct  numeric(5,2) not null default 0 check (sale_exec_pct between 0 and 100),
  coll_agent_pct numeric(5,2) not null default 0 check (coll_agent_pct between 0 and 100),
  coll_exec_pct  numeric(5,2) not null default 0 check (coll_exec_pct between 0 and 100),
  created_at     timestamptz not null default now()
);

-- 9. premium_receipts: recibos de cobranza (los genera el sistema al emitir la póliza)
create table public.premium_receipts (
  id                 uuid primary key default gen_random_uuid(),
  policy_id          uuid not null references public.policies (id) on delete restrict,
  installment_number integer not null check (installment_number >= 1),
  due_date           date not null,
  amount             numeric(12,2) not null check (amount >= 0),
  status             text not null default 'pendiente' check (status in ('pendiente', 'pagado', 'vencido', 'cancelado')),
  paid_at            date,
  paid_by            uuid references public.profiles (id) on delete restrict,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint premium_receipts_policy_installment_key unique (policy_id, installment_number),
  constraint premium_receipts_paid_chk check ((status = 'pagado') = (paid_at is not null))
);
create index premium_receipts_due_idx on public.premium_receipts (due_date) where status in ('pendiente', 'vencido');

-- 10. claims: siniestros (reclamaciones) ligados a una póliza
create table public.claims (
  id                   uuid primary key default gen_random_uuid(),
  policy_id            uuid not null references public.policies (id) on delete restrict,
  client_id            uuid not null references public.clients (id) on delete restrict,
  event_date           date not null,
  description          text not null check (length(trim(description)) > 0),
  insurer_claim_number text,
  status               text not null default 'reportado'
                       check (status in ('reportado', 'en_tramite', 'pagado', 'rechazado', 'cerrado')),
  closed_at            timestamptz,
  created_by           uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint claims_closed_chk
    check ((status in ('pagado', 'rechazado', 'cerrado')) = (closed_at is not null))
);
create index claims_policy_idx on public.claims (policy_id);
create index claims_client_idx on public.claims (client_id);
create index claims_open_idx on public.claims (status) where status in ('reportado', 'en_tramite');

-- 11. commission_rates: porcentajes de comisión por producto (solo supervisor)
create table public.commission_rates (
  product_id     uuid primary key references public.products (id) on delete restrict,
  sale_agent_pct numeric(5,2) not null default 0 check (sale_agent_pct between 0 and 100),
  sale_exec_pct  numeric(5,2) not null default 0 check (sale_exec_pct between 0 and 100),
  coll_agent_pct numeric(5,2) not null default 0 check (coll_agent_pct between 0 and 100),
  coll_exec_pct  numeric(5,2) not null default 0 check (coll_exec_pct between 0 and 100),
  updated_by     uuid references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 12. commissions: comisiones generadas (venta y cobranza; ejecutivo y agente)
create table public.commissions (
  id               uuid primary key default gen_random_uuid(),
  policy_id        uuid not null references public.policies (id) on delete restrict,
  receipt_id       uuid not null references public.premium_receipts (id) on delete restrict,
  beneficiary_type text not null check (beneficiary_type in ('ejecutivo', 'agente')),
  commission_type  text not null check (commission_type in ('venta', 'cobranza')),
  executive_id     uuid references public.profiles (id) on delete restrict,
  agent_id         uuid references public.agents (id) on delete restrict,
  base_amount      numeric(12,2) not null check (base_amount >= 0),
  rate_pct         numeric(5,2) not null check (rate_pct between 0 and 100),
  amount           numeric(12,2) not null check (amount >= 0),
  status           text not null default 'pendiente' check (status in ('pendiente', 'liquidada')),
  settled_at       timestamptz,
  settled_by       uuid references public.profiles (id) on delete restrict,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint commissions_beneficiary_chk check (
    (beneficiary_type = 'ejecutivo' and executive_id is not null and agent_id is null) or
    (beneficiary_type = 'agente' and agent_id is not null and executive_id is null)),
  constraint commissions_settled_chk check ((status = 'liquidada') = (settled_at is not null)),
  constraint commissions_receipt_unique_key unique (receipt_id, beneficiary_type, commission_type)
);
create index commissions_policy_idx on public.commissions (policy_id);
create index commissions_executive_idx on public.commissions (executive_id, status);
create index commissions_agent_idx on public.commissions (agent_id, status);

-- 13. activities: historial de contactos (SOLO INSERCIÓN)
create table public.activities (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete restrict,
  opportunity_id uuid references public.opportunities (id) on delete restrict,
  policy_id      uuid references public.policies (id) on delete restrict,
  claim_id       uuid references public.claims (id) on delete restrict,
  type           text not null check (type in ('llamada', 'whatsapp', 'correo', 'reunion', 'nota')),
  summary        text not null check (length(trim(summary)) > 0),
  occurred_at    timestamptz not null default now(),
  created_by     uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now()
);
create index activities_client_idx on public.activities (client_id, occurred_at desc);

-- 14. follow_ups: seguimientos con fecha (follow-up)
create table public.follow_ups (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete restrict,
  opportunity_id uuid references public.opportunities (id) on delete restrict,
  owner_id       uuid not null references public.profiles (id) on delete restrict,
  due_date       date not null,
  note           text,
  status         text not null default 'pendiente' check (status in ('pendiente', 'hecho', 'cancelado')),
  completed_at   timestamptz,
  created_by     uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint follow_ups_completed_chk check ((status = 'pendiente') = (completed_at is null))
);
create index follow_ups_owner_due_idx on public.follow_ups (owner_id, due_date) where status = 'pendiente';
create index follow_ups_client_idx on public.follow_ups (client_id);

-- 15. goals: meta mensual de prima por vendedor
create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid not null references public.profiles (id) on delete restrict,
  month          date not null check (month = date_trunc('month', month)::date),
  target_premium numeric(12,2) not null check (target_premium >= 0),
  created_by     uuid references public.profiles (id) on delete restrict,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint goals_seller_month_key unique (seller_id, month)
);

-- 16. settings: configuración general (SIN secretos)
create table public.settings (
  key         text primary key check (length(trim(key)) > 0),
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete restrict,
  updated_at  timestamptz not null default now()
);

-- 17. audit_log: bitácora (SOLO INSERCIÓN)
create table public.audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  text,
  action     text not null check (action in ('insert', 'update', 'event')),
  event      text check (event is null or length(event) <= 80),
  actor_id   uuid,
  old_data   jsonb,
  new_data   jsonb,
  details    jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_event_idx on public.audit_log (event, created_at desc) where event is not null;
```

### 8.2 `02_functions.sql` — Funciones y reglas de negocio

```sql
-- ============================================================
-- CRM-123 · 02_functions.sql
-- Funciones auxiliares, reglas de negocio y funciones de trigger
-- Toda función SECURITY DEFINER fija search_path = public
-- ============================================================

-- ---------- Auxiliares de identidad (el rol SIEMPRE sale de profiles) ----------

create or replace function public.today_mx()
returns date
language sql stable
set search_path = public
as $$ select (now() at time zone 'America/Mexico_City')::date $$;

create or replace function public.app_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.is_active
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active)
$$;

create or replace function public.is_supervisor()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_active and p.role = 'supervisor')
$$;

-- ---------- Triggers genéricos ----------

create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.trg_stamp_updated_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_by := (select auth.uid());
  return new;
end $$;

-- Bloquea UPDATE/DELETE/TRUNCATE en tablas de solo inserción (defensa adicional a RLS y permisos)
create or replace function public.trg_block_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'La tabla % es de solo inserción', tg_table_name using errcode = '42501';
end $$;

-- Bitácora automática de altas y cambios
create or replace function public.trg_audit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if tg_op = 'INSERT' then
    v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(new) ->> 'policy_id', to_jsonb(new) ->> 'product_id');
    insert into public.audit_log (table_name, record_id, action, actor_id, new_data)
    values (tg_table_name, v_id, 'insert', (select auth.uid()), to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
      v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(new) ->> 'policy_id', to_jsonb(new) ->> 'product_id');
      insert into public.audit_log (table_name, record_id, action, actor_id, old_data, new_data)
      values (tg_table_name, v_id, 'update', (select auth.uid()), to_jsonb(old), to_jsonb(new));
    end if;
  end if;
  return null;
end $$;

-- El responsable (owner_id) solo cambia mediante reassign_client()
create or replace function public.trg_guard_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id
     and coalesce(current_setting('app.reassigning', true), 'off') <> 'on' then
    raise exception 'El responsable solo cambia con la función reassign_client' using errcode = '42501';
  end if;
  return new;
end $$;

-- El responsable de una oportunidad o seguimiento debe coincidir con el del cliente
create or replace function public.trg_owner_matches_client()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select c.owner_id into v_owner from public.clients c where c.id = new.client_id;
  if v_owner is null then
    raise exception 'Cliente inexistente';
  end if;
  if new.owner_id <> v_owner then
    raise exception 'El responsable debe coincidir con el responsable del cliente';
  end if;
  return new;
end $$;

-- ---------- profiles ----------

create or replace function public.trg_profiles_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Un usuario no puede desactivarse ni cambiarse el rol a sí mismo (evita quedarse sin supervisor)
  if tg_op = 'UPDATE' and old.id = (select auth.uid())
     and (new.is_active is distinct from old.is_active or new.role is distinct from old.role) then
    raise exception 'No puedes cambiar tu propio rol ni desactivarte';
  end if;

  -- Límites del equipo: 10 vendedores y 2 supervisores activos
  if new.is_active then
    select count(*) into v_count
      from public.profiles p
     where p.role = new.role and p.is_active and p.id <> new.id;
    if new.role = 'vendedor' and v_count >= 10 then
      raise exception 'Límite alcanzado: máximo 10 vendedores activos';
    end if;
    if new.role = 'supervisor' and v_count >= 2 then
      raise exception 'Límite alcanzado: máximo 2 supervisores activos';
    end if;
  end if;
  return new;
end $$;

create or replace function public.mark_password_changed()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles set must_change_password = false where id = (select auth.uid());
end $$;

-- ---------- opportunities ----------

create or replace function public.trg_opportunities_before()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.stage = 'ganada' and new.stage <> 'ganada'
       and exists (select 1 from public.policies p where p.opportunity_id = old.id and p.status <> 'cancelada') then
      raise exception 'Una oportunidad con póliza vigente no puede reabrirse';
    end if;
    if new.stage = old.stage then
      new.closed_at := old.closed_at;
    elsif new.stage in ('ganada', 'perdida') then
      new.closed_at := now();
    else
      new.closed_at := null;
    end if;
  else
    if new.stage in ('ganada', 'perdida') then new.closed_at := now(); else new.closed_at := null; end if;
  end if;
  if new.stage <> 'perdida' then
    new.lost_reason := null;
  end if;
  return new;
end $$;

-- ---------- policies ----------

create or replace function public.trg_policies_before_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  o record;
begin
  select op.client_id, op.product_id, op.owner_id, op.stage
    into o
    from public.opportunities op
   where op.id = new.opportunity_id;
  if not found then
    raise exception 'Oportunidad inexistente';
  end if;
  if o.stage <> 'ganada' then
    raise exception 'La póliza solo puede emitirse sobre una oportunidad Ganada';
  end if;
  new.client_id := o.client_id;
  new.product_id := o.product_id;
  new.owner_id := o.owner_id;
  new.status := 'emitida';
  new.cancelled_at := null;
  new.cancellation_reason := null;
  return new;
end $$;

-- Copia de porcentajes vigentes y calendario de recibos
create or replace function public.trg_policies_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_step integer;
  v_n    integer;
  v_base numeric(12,2);
  i      integer;
begin
  insert into public.policy_commission_terms (policy_id, sale_agent_pct, sale_exec_pct, coll_agent_pct, coll_exec_pct)
  select new.id,
         coalesce(r.sale_agent_pct, 0), coalesce(r.sale_exec_pct, 0),
         coalesce(r.coll_agent_pct, 0), coalesce(r.coll_exec_pct, 0)
    from (select 1) x
    left join public.commission_rates r on r.product_id = new.product_id;

  v_step := case new.payment_frequency
              when 'anual' then 12 when 'semestral' then 6 when 'trimestral' then 3 else 1 end;
  v_n := 12 / v_step;
  v_base := round(new.annual_premium / v_n, 2);

  for i in 1 .. v_n loop
    insert into public.premium_receipts (policy_id, installment_number, due_date, amount)
    values (new.id, i,
            (new.start_date + make_interval(months => (i - 1) * v_step))::date,
            case when i = v_n then new.annual_premium - v_base * (v_n - 1) else v_base end);
  end loop;
  return new;
end $$;

create or replace function public.trg_policies_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.opportunity_id is distinct from old.opportunity_id
     or new.client_id is distinct from old.client_id
     or new.product_id is distinct from old.product_id
     or new.created_by is distinct from old.created_by
     or new.annual_premium is distinct from old.annual_premium
     or new.payment_frequency is distinct from old.payment_frequency
     or new.start_date is distinct from old.start_date
     or new.end_date is distinct from old.end_date then
    raise exception 'Los datos de emisión de la póliza no se modifican; cancela y emite de nuevo';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'cancelada' then
      raise exception 'Una póliza cancelada no puede cambiar de estatus';
    end if;
    -- Una persona solo puede cancelar; los demás cambios los hace el sistema
    if pg_trigger_depth() = 1 and (select auth.uid()) is not null and new.status <> 'cancelada' then
      raise exception 'Solo se permite registrar la cancelación de la póliza';
    end if;
    if new.status = 'cancelada' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
    end if;
  elsif old.status = 'cancelada' then
    -- Cancelada: datos de cancelación congelados
    new.cancelled_at := old.cancelled_at;
    new.cancellation_reason := old.cancellation_reason;
  end if;
  return new;
end $$;

create or replace function public.trg_policies_after_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'cancelada' and old.status <> 'cancelada' then
    update public.premium_receipts
       set status = 'cancelado'
     where policy_id = new.id and status in ('pendiente', 'vencido');
  end if;
  return null;
end $$;

-- ---------- premium_receipts ----------

create or replace function public.trg_receipts_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'pagado' then
    raise exception 'Un recibo pagado no se modifica';
  end if;
  if old.status = 'cancelado' then
    raise exception 'Un recibo cancelado no se modifica';
  end if;

  if pg_trigger_depth() = 1 and (select auth.uid()) is not null then
    if new.status <> 'pagado' then
      raise exception 'Solo se permite marcar el recibo como pagado';
    end if;
    if new.policy_id is distinct from old.policy_id
       or new.installment_number is distinct from old.installment_number
       or new.due_date is distinct from old.due_date
       or new.amount is distinct from old.amount then
      raise exception 'Los datos del recibo no se modifican';
    end if;
  end if;

  if new.status = 'pagado' then
    new.paid_at := coalesce(new.paid_at, public.today_mx());
    if new.paid_at > public.today_mx() then
      raise exception 'La fecha de pago no puede ser futura';
    end if;
    new.paid_by := coalesce((select auth.uid()), new.paid_by);
  end if;
  return new;
end $$;

-- Al pagarse un recibo: póliza vigente + comisiones de venta (1er recibo) y de cobranza
create or replace function public.trg_receipts_after_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_pol  public.policies%rowtype;
  v_t    public.policy_commission_terms%rowtype;
begin
  if new.status = 'pagado' and old.status <> 'pagado' then
    select * into v_pol from public.policies where id = new.policy_id;
    select * into v_t from public.policy_commission_terms where policy_id = new.policy_id;

    if v_pol.status = 'emitida' then
      update public.policies set status = 'vigente' where id = v_pol.id;
    end if;

    -- Comisión de VENTA: una sola vez, al pagarse el primer recibo (base = prima anual)
    if new.installment_number = 1 then
      if v_t.sale_exec_pct > 0 then
        insert into public.commissions (policy_id, receipt_id, beneficiary_type, commission_type, executive_id, base_amount, rate_pct, amount)
        values (v_pol.id, new.id, 'ejecutivo', 'venta', v_pol.owner_id, v_pol.annual_premium, v_t.sale_exec_pct,
                round(v_pol.annual_premium * v_t.sale_exec_pct / 100, 2));
      end if;
      if v_pol.agent_id is not null and v_t.sale_agent_pct > 0 then
        insert into public.commissions (policy_id, receipt_id, beneficiary_type, commission_type, agent_id, base_amount, rate_pct, amount)
        values (v_pol.id, new.id, 'agente', 'venta', v_pol.agent_id, v_pol.annual_premium, v_t.sale_agent_pct,
                round(v_pol.annual_premium * v_t.sale_agent_pct / 100, 2));
      end if;
    end if;

    -- Comisión de COBRANZA: en cada recibo pagado (base = monto del recibo)
    if v_t.coll_exec_pct > 0 then
      insert into public.commissions (policy_id, receipt_id, beneficiary_type, commission_type, executive_id, base_amount, rate_pct, amount)
      values (v_pol.id, new.id, 'ejecutivo', 'cobranza', v_pol.owner_id, new.amount, v_t.coll_exec_pct,
              round(new.amount * v_t.coll_exec_pct / 100, 2));
    end if;
    if v_pol.agent_id is not null and v_t.coll_agent_pct > 0 then
      insert into public.commissions (policy_id, receipt_id, beneficiary_type, commission_type, agent_id, base_amount, rate_pct, amount)
      values (v_pol.id, new.id, 'agente', 'cobranza', v_pol.agent_id, new.amount, v_t.coll_agent_pct,
              round(new.amount * v_t.coll_agent_pct / 100, 2));
    end if;
  end if;
  return null;
end $$;

-- ---------- commissions ----------

create or replace function public.trg_commissions_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'liquidada' then
    raise exception 'Una comisión liquidada no se modifica';
  end if;
  if (to_jsonb(new) - 'status' - 'settled_at' - 'settled_by' - 'updated_at')
     is distinct from (to_jsonb(old) - 'status' - 'settled_at' - 'settled_by' - 'updated_at') then
    raise exception 'Solo puede cambiarse el estatus de liquidación de la comisión';
  end if;
  if new.status = 'liquidada' then
    new.settled_at := now();
    new.settled_by := (select auth.uid());
  else
    new.settled_at := null;
    new.settled_by := null;
  end if;
  return new;
end $$;

-- ---------- claims ----------

create or replace function public.trg_claims_before()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  if tg_op = 'INSERT' then
    select p.client_id into v_client from public.policies p where p.id = new.policy_id;
    if v_client is null then
      raise exception 'Póliza inexistente';
    end if;
    new.client_id := v_client;
    new.closed_at := case when new.status in ('pagado', 'rechazado', 'cerrado') then now() else null end;
  else
    if new.policy_id is distinct from old.policy_id or new.client_id is distinct from old.client_id then
      raise exception 'El siniestro no puede cambiar de póliza';
    end if;
    if new.status in ('pagado', 'rechazado', 'cerrado') then
      new.closed_at := coalesce(old.closed_at, now());
    else
      new.closed_at := null;
    end if;
  end if;
  return new;
end $$;

-- ---------- follow_ups ----------

create or replace function public.trg_follow_ups_before()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.client_id is distinct from old.client_id then
    raise exception 'El seguimiento no puede cambiar de cliente';
  end if;
  if new.status = 'pendiente' then
    new.completed_at := null;
  elsif tg_op = 'INSERT' or old.completed_at is null then
    new.completed_at := now();
  else
    new.completed_at := old.completed_at;
  end if;
  return new;
end $$;

-- ---------- Funciones de aplicación ----------

-- Reasigna un cliente y todo lo que cuelga de él a otro usuario (solo supervisor)
create or replace function public.reassign_client(p_client_id uuid, p_new_owner_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_old uuid;
begin
  if not public.is_supervisor() then
    raise exception 'Solo el supervisor puede reasignar' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_new_owner_id and p.is_active) then
    raise exception 'El usuario destino no existe o está inactivo';
  end if;
  select c.owner_id into v_old from public.clients c where c.id = p_client_id for update;
  if not found then
    raise exception 'Cliente inexistente';
  end if;

  perform set_config('app.reassigning', 'on', true);
  update public.clients set owner_id = p_new_owner_id where id = p_client_id;
  update public.opportunities set owner_id = p_new_owner_id where client_id = p_client_id;
  update public.follow_ups set owner_id = p_new_owner_id where client_id = p_client_id and status = 'pendiente';
  update public.policies set owner_id = p_new_owner_id
   where client_id = p_client_id and status in ('emitida', 'vigente');
  perform set_config('app.reassigning', 'off', true);

  insert into public.audit_log (table_name, record_id, action, event, actor_id, details)
  values ('clients', p_client_id::text, 'event', 'reassign_client', (select auth.uid()),
          jsonb_build_object('from', v_old, 'to', p_new_owner_id));
end $$;

-- Registro de eventos de la aplicación hechos por una persona autenticada
create or replace function public.log_event(p_event text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_event is null or length(trim(p_event)) = 0 or length(p_event) > 80 then
    raise exception 'Nombre de evento inválido';
  end if;
  insert into public.audit_log (table_name, record_id, action, event, actor_id, details)
  values ('app', null, 'event', p_event, (select auth.uid()), coalesce(p_details, '{}'::jsonb));
end $$;

-- Mantenimiento diario: vence pólizas y recibos (solo service_role, desde /api/n8n/*)
create or replace function public.run_daily_maintenance()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_policies integer;
  v_receipts integer;
begin
  update public.policies set status = 'vencida'
   where status in ('emitida', 'vigente') and end_date < public.today_mx();
  get diagnostics v_policies = row_count;

  update public.premium_receipts set status = 'vencido'
   where status = 'pendiente' and due_date < public.today_mx();
  get diagnostics v_receipts = row_count;

  return jsonb_build_object('policies_expired', v_policies, 'receipts_overdue', v_receipts);
end $$;
```

### 8.3 `03_triggers.sql` — Triggers

```sql
-- ============================================================
-- CRM-123 · 03_triggers.sql
-- ============================================================

-- updated_at automático
create trigger trg_profiles_updated_at          before update on public.profiles          for each row execute function public.trg_set_updated_at();
create trigger trg_products_updated_at          before update on public.products          for each row execute function public.trg_set_updated_at();
create trigger trg_insurers_updated_at          before update on public.insurers          for each row execute function public.trg_set_updated_at();
create trigger trg_agents_updated_at            before update on public.agents            for each row execute function public.trg_set_updated_at();
create trigger trg_clients_updated_at           before update on public.clients           for each row execute function public.trg_set_updated_at();
create trigger trg_opportunities_updated_at     before update on public.opportunities     for each row execute function public.trg_set_updated_at();
create trigger trg_policies_updated_at          before update on public.policies          for each row execute function public.trg_set_updated_at();
create trigger trg_premium_receipts_updated_at  before update on public.premium_receipts  for each row execute function public.trg_set_updated_at();
create trigger trg_claims_updated_at            before update on public.claims            for each row execute function public.trg_set_updated_at();
create trigger trg_commission_rates_updated_at  before update on public.commission_rates  for each row execute function public.trg_set_updated_at();
create trigger trg_commissions_updated_at       before update on public.commissions       for each row execute function public.trg_set_updated_at();
create trigger trg_follow_ups_updated_at        before update on public.follow_ups        for each row execute function public.trg_set_updated_at();
create trigger trg_goals_updated_at             before update on public.goals             for each row execute function public.trg_set_updated_at();
create trigger trg_settings_updated_at          before update on public.settings          for each row execute function public.trg_set_updated_at();

-- updated_by automático
create trigger trg_settings_updated_by         before insert or update on public.settings         for each row execute function public.trg_stamp_updated_by();
create trigger trg_commission_rates_updated_by before insert or update on public.commission_rates for each row execute function public.trg_stamp_updated_by();

-- profiles
create trigger trg_profiles_guard before insert or update on public.profiles
  for each row execute function public.trg_profiles_guard();

-- Responsable: solo cambia con reassign_client()
create trigger trg_clients_guard_owner       before update on public.clients       for each row execute function public.trg_guard_owner_change();
create trigger trg_opportunities_guard_owner before update on public.opportunities for each row execute function public.trg_guard_owner_change();
create trigger trg_follow_ups_guard_owner    before update on public.follow_ups    for each row execute function public.trg_guard_owner_change();
create trigger trg_policies_guard_owner      before update on public.policies      for each row execute function public.trg_guard_owner_change();

-- Responsable de oportunidad/seguimiento = responsable del cliente
create trigger trg_opportunities_owner_client before insert or update on public.opportunities
  for each row execute function public.trg_owner_matches_client();
create trigger trg_follow_ups_owner_client before insert or update on public.follow_ups
  for each row execute function public.trg_owner_matches_client();

-- opportunities
create trigger trg_opportunities_before before insert or update on public.opportunities
  for each row execute function public.trg_opportunities_before();

-- policies
create trigger trg_policies_before_insert before insert on public.policies
  for each row execute function public.trg_policies_before_insert();
create trigger trg_policies_after_insert after insert on public.policies
  for each row execute function public.trg_policies_after_insert();
create trigger trg_policies_before_update before update on public.policies
  for each row execute function public.trg_policies_before_update();
create trigger trg_policies_after_update after update on public.policies
  for each row execute function public.trg_policies_after_update();

-- premium_receipts
create trigger trg_receipts_before_update before update on public.premium_receipts
  for each row execute function public.trg_receipts_before_update();
create trigger trg_receipts_after_update after update on public.premium_receipts
  for each row execute function public.trg_receipts_after_update();

-- commissions
create trigger trg_commissions_guard before update on public.commissions
  for each row execute function public.trg_commissions_guard();

-- claims
create trigger trg_claims_before before insert or update on public.claims
  for each row execute function public.trg_claims_before();

-- follow_ups
create trigger trg_follow_ups_before before insert or update on public.follow_ups
  for each row execute function public.trg_follow_ups_before();

-- Tablas de solo inserción: activities y audit_log
create trigger trg_activities_block_mutation before update or delete on public.activities
  for each row execute function public.trg_block_mutation();
create trigger trg_activities_block_truncate before truncate on public.activities
  for each statement execute function public.trg_block_mutation();
create trigger trg_audit_log_block_mutation before update or delete on public.audit_log
  for each row execute function public.trg_block_mutation();
create trigger trg_audit_log_block_truncate before truncate on public.audit_log
  for each statement execute function public.trg_block_mutation();

-- Bitácora automática
create trigger trg_audit_profiles          after insert or update on public.profiles          for each row execute function public.trg_audit();
create trigger trg_audit_products          after insert or update on public.products          for each row execute function public.trg_audit();
create trigger trg_audit_insurers          after insert or update on public.insurers          for each row execute function public.trg_audit();
create trigger trg_audit_agents            after insert or update on public.agents            for each row execute function public.trg_audit();
create trigger trg_audit_clients           after insert or update on public.clients           for each row execute function public.trg_audit();
create trigger trg_audit_opportunities     after insert or update on public.opportunities     for each row execute function public.trg_audit();
create trigger trg_audit_policies          after insert or update on public.policies          for each row execute function public.trg_audit();
create trigger trg_audit_premium_receipts  after insert or update on public.premium_receipts  for each row execute function public.trg_audit();
create trigger trg_audit_claims            after insert or update on public.claims            for each row execute function public.trg_audit();
create trigger trg_audit_commission_rates  after insert or update on public.commission_rates  for each row execute function public.trg_audit();
create trigger trg_audit_commissions       after insert or update on public.commissions       for each row execute function public.trg_audit();
create trigger trg_audit_follow_ups        after insert or update on public.follow_ups        for each row execute function public.trg_audit();
create trigger trg_audit_goals             after insert or update on public.goals             for each row execute function public.trg_audit();
create trigger trg_audit_settings          after insert or update on public.settings          for each row execute function public.trg_audit();
```

### 8.4 `04_rls.sql` — RLS y políticas

```sql
-- ============================================================
-- CRM-123 · 04_rls.sql
-- RLS activa en TODAS las tablas · sin DELETE · UPDATE siempre con WITH CHECK
-- Ninguna política con condición true, salvo SELECT de settings
-- ============================================================

alter table public.profiles                enable row level security;
alter table public.products                enable row level security;
alter table public.insurers                enable row level security;
alter table public.agents                  enable row level security;
alter table public.clients                 enable row level security;
alter table public.opportunities           enable row level security;
alter table public.policies                enable row level security;
alter table public.policy_commission_terms enable row level security;
alter table public.premium_receipts        enable row level security;
alter table public.claims                  enable row level security;
alter table public.commission_rates        enable row level security;
alter table public.commissions             enable row level security;
alter table public.activities              enable row level security;
alter table public.follow_ups              enable row level security;
alter table public.goals                   enable row level security;
alter table public.settings                enable row level security;
alter table public.audit_log               enable row level security;

-- ---------- profiles ----------
-- Alta de usuarios: solo por el servidor con la llave secreta (sin política INSERT para personas)
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_supervisor()));
create policy profiles_update on public.profiles for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

-- ---------- catálogos: products, insurers, agents ----------
create policy products_select on public.products for select to authenticated
  using ((select public.is_active_user()));
create policy products_insert on public.products for insert to authenticated
  with check ((select public.is_supervisor()));
create policy products_update on public.products for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

create policy insurers_select on public.insurers for select to authenticated
  using ((select public.is_active_user()));
create policy insurers_insert on public.insurers for insert to authenticated
  with check ((select public.is_supervisor()));
create policy insurers_update on public.insurers for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

create policy agents_select on public.agents for select to authenticated
  using ((select public.is_active_user()));
create policy agents_insert on public.agents for insert to authenticated
  with check ((select public.is_supervisor()));
create policy agents_update on public.agents for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

-- ---------- clients ----------
create policy clients_select on public.clients for select to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())));
create policy clients_insert on public.clients for insert to authenticated
  with check ((select public.is_active_user())
              and created_by = (select auth.uid())
              and ((select public.is_supervisor()) or owner_id = (select auth.uid())));
create policy clients_update on public.clients for update to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())))
  with check ((select public.is_supervisor())
              or (owner_id = (select auth.uid()) and (select public.is_active_user())));

-- ---------- opportunities ----------
create policy opportunities_select on public.opportunities for select to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())));
create policy opportunities_insert on public.opportunities for insert to authenticated
  with check ((select public.is_active_user())
              and created_by = (select auth.uid())
              and ((select public.is_supervisor()) or owner_id = (select auth.uid()))
              and exists (select 1 from public.clients c where c.id = client_id));
create policy opportunities_update on public.opportunities for update to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())))
  with check ((select public.is_supervisor())
              or (owner_id = (select auth.uid()) and (select public.is_active_user())));

-- ---------- policies ----------
create policy policies_select on public.policies for select to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())));
create policy policies_insert on public.policies for insert to authenticated
  with check ((select public.is_active_user())
              and created_by = (select auth.uid())
              and ((select public.is_supervisor()) or owner_id = (select auth.uid())));
create policy policies_update on public.policies for update to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())))
  with check ((select public.is_supervisor())
              or (owner_id = (select auth.uid()) and (select public.is_active_user())));

-- ---------- policy_commission_terms (solo lectura para el supervisor; la escribe el sistema) ----------
create policy policy_commission_terms_select on public.policy_commission_terms for select to authenticated
  using ((select public.is_supervisor()));

-- ---------- premium_receipts (heredan la visibilidad de su póliza) ----------
create policy premium_receipts_select on public.premium_receipts for select to authenticated
  using (exists (select 1 from public.policies p where p.id = policy_id));
create policy premium_receipts_update on public.premium_receipts for update to authenticated
  using (exists (select 1 from public.policies p where p.id = policy_id))
  with check (exists (select 1 from public.policies p where p.id = policy_id));

-- ---------- claims (heredan la visibilidad de su póliza) ----------
create policy claims_select on public.claims for select to authenticated
  using (exists (select 1 from public.policies p where p.id = policy_id));
create policy claims_insert on public.claims for insert to authenticated
  with check ((select public.is_active_user())
              and created_by = (select auth.uid())
              and exists (select 1 from public.policies p where p.id = policy_id));
create policy claims_update on public.claims for update to authenticated
  using (exists (select 1 from public.policies p where p.id = policy_id))
  with check (exists (select 1 from public.policies p where p.id = policy_id));

-- ---------- commission_rates (solo supervisor) ----------
create policy commission_rates_select on public.commission_rates for select to authenticated
  using ((select public.is_supervisor()));
create policy commission_rates_insert on public.commission_rates for insert to authenticated
  with check ((select public.is_supervisor()));
create policy commission_rates_update on public.commission_rates for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

-- ---------- commissions ----------
-- El vendedor ve solo sus comisiones como ejecutivo; el supervisor ve todas y solo él las liquida
create policy commissions_select on public.commissions for select to authenticated
  using ((select public.is_supervisor())
         or (beneficiary_type = 'ejecutivo'
             and executive_id = (select auth.uid())
             and (select public.is_active_user())));
create policy commissions_update on public.commissions for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

-- ---------- activities (SOLO INSERCIÓN: sin UPDATE ni DELETE para nadie) ----------
create policy activities_select on public.activities for select to authenticated
  using (exists (select 1 from public.clients c where c.id = client_id));
create policy activities_insert on public.activities for insert to authenticated
  with check ((select public.is_active_user())
              and created_by = (select auth.uid())
              and exists (select 1 from public.clients c where c.id = client_id));

-- ---------- follow_ups ----------
create policy follow_ups_select on public.follow_ups for select to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())));
create policy follow_ups_insert on public.follow_ups for insert to authenticated
  with check ((select public.is_active_user())
              and created_by = (select auth.uid())
              and ((select public.is_supervisor()) or owner_id = (select auth.uid()))
              and exists (select 1 from public.clients c where c.id = client_id));
create policy follow_ups_update on public.follow_ups for update to authenticated
  using ((select public.is_supervisor())
         or (owner_id = (select auth.uid()) and (select public.is_active_user())))
  with check ((select public.is_supervisor())
              or (owner_id = (select auth.uid()) and (select public.is_active_user())));

-- ---------- goals ----------
create policy goals_select on public.goals for select to authenticated
  using ((select public.is_supervisor())
         or (seller_id = (select auth.uid()) and (select public.is_active_user())));
create policy goals_insert on public.goals for insert to authenticated
  with check ((select public.is_supervisor()));
create policy goals_update on public.goals for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

-- ---------- settings (única excepción: SELECT abierto a usuarios autenticados; sin secretos) ----------
create policy settings_select on public.settings for select to authenticated
  using (true);
create policy settings_insert on public.settings for insert to authenticated
  with check ((select public.is_supervisor()));
create policy settings_update on public.settings for update to authenticated
  using ((select public.is_supervisor()))
  with check ((select public.is_supervisor()));

-- ---------- audit_log (SOLO INSERCIÓN; lectura solo supervisor; escribe el sistema) ----------
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select public.is_supervisor()));
```

### 8.5 `05_views.sql` — Vistas

```sql
-- ============================================================
-- CRM-123 · 05_views.sql
-- TODAS las vistas con security_invoker = true (respetan RLS de quien consulta)
-- ============================================================

create or replace view public.v_policies with (security_invoker = true) as
select
  p.id,
  p.opportunity_id,
  p.client_id,
  c.full_name   as client_name,
  c.phone       as client_phone,
  p.product_id,
  pr.name       as product_name,
  p.insurer_id,
  i.name        as insurer_name,
  p.agent_id,
  a.full_name   as agent_name,
  p.owner_id,
  o.full_name   as owner_name,
  p.policy_number,
  p.annual_premium,
  p.payment_frequency,
  p.start_date,
  p.end_date,
  p.status,
  case when p.status in ('emitida', 'vigente') and p.end_date < public.today_mx()
       then 'vencida' else p.status end as effective_status,
  (p.end_date - public.today_mx())      as days_to_end,
  p.cancelled_at,
  p.cancellation_reason,
  p.created_at
from public.policies p
left join public.clients c on c.id = p.client_id   -- null si el cliente fue reasignado a otra persona
join public.products pr on pr.id = p.product_id
join public.insurers i  on i.id  = p.insurer_id
left join public.agents   a on a.id = p.agent_id
left join public.profiles o on o.id = p.owner_id;

create or replace view public.v_receipts with (security_invoker = true) as
select
  r.id,
  r.policy_id,
  po.policy_number,
  po.owner_id,
  po.client_id,
  c.full_name  as client_name,
  c.phone      as client_phone,
  r.installment_number,
  r.due_date,
  r.amount,
  r.status,
  case when r.status = 'pendiente' and r.due_date < public.today_mx()
       then 'vencido' else r.status end as effective_status,
  (r.due_date - public.today_mx())     as days_to_due,
  r.paid_at
from public.premium_receipts r
join public.policies po on po.id = r.policy_id
left join public.clients c on c.id = po.client_id;  -- null si el cliente fue reasignado

create or replace view public.v_follow_ups with (security_invoker = true) as
select
  f.id,
  f.client_id,
  c.full_name as client_name,
  c.phone     as client_phone,
  f.opportunity_id,
  f.owner_id,
  f.due_date,
  f.note,
  f.status,
  (f.status = 'pendiente' and f.due_date < public.today_mx()) as is_overdue,
  (f.status = 'pendiente' and f.due_date = public.today_mx()) as is_today,
  f.completed_at,
  f.created_at
from public.follow_ups f
join public.clients c on c.id = f.client_id;

create or replace view public.v_commissions with (security_invoker = true) as
select
  m.id,
  m.policy_id,
  po.policy_number,
  c.full_name as client_name,
  m.receipt_id,
  r.installment_number,
  m.beneficiary_type,
  m.commission_type,
  m.executive_id,
  e.full_name as executive_name,
  m.agent_id,
  a.full_name as agent_name,
  m.base_amount,
  m.rate_pct,
  m.amount,
  m.status,
  m.settled_at,
  m.created_at
from public.commissions m
join public.policies po on po.id = m.policy_id
left join public.clients c on c.id = po.client_id   -- null si el cliente fue reasignado
join public.premium_receipts r on r.id = m.receipt_id
left join public.profiles e on e.id = m.executive_id
left join public.agents   a on a.id = m.agent_id;

-- Ranking por vendedor del mes en curso (hora de Ciudad de México)
create or replace view public.v_seller_ranking with (security_invoker = true) as
with m as (select date_trunc('month', public.today_mx())::date as month_start)
select
  s.id        as seller_id,
  s.full_name as seller_name,
  (select count(*) from public.opportunities o
    where o.owner_id = s.id and o.archived_at is null
      and o.stage in ('nuevo', 'contactado', 'cotizacion_enviada', 'negociacion'))        as open_opportunities,
  (select coalesce(sum(o.estimated_annual_premium), 0) from public.opportunities o
    where o.owner_id = s.id and o.archived_at is null
      and o.stage in ('nuevo', 'contactado', 'cotizacion_enviada', 'negociacion'))        as open_pipeline_premium,
  (select count(*) from public.opportunities o, m
    where o.owner_id = s.id and o.stage = 'ganada'
      and (o.closed_at at time zone 'America/Mexico_City')::date >= m.month_start)        as won_count_month,
  (select count(*) from public.opportunities o, m
    where o.owner_id = s.id and o.stage = 'perdida'
      and (o.closed_at at time zone 'America/Mexico_City')::date >= m.month_start)        as lost_count_month,
  (select coalesce(sum(po.annual_premium), 0) from public.policies po, m
    where po.owner_id = s.id and po.status <> 'cancelada'
      and (po.created_at at time zone 'America/Mexico_City')::date >= m.month_start)      as won_premium_month,
  g.target_premium                                                                         as goal_premium_month,
  (select count(*) from public.premium_receipts r
     join public.policies po on po.id = r.policy_id
    where po.owner_id = s.id and r.status in ('pendiente', 'vencido')
      and r.due_date < public.today_mx())                                                  as overdue_receipts,
  (select count(*) from public.follow_ups f
    where f.owner_id = s.id and f.status = 'pendiente'
      and f.due_date < public.today_mx())                                                  as overdue_follow_ups
from public.profiles s
cross join m
left join public.goals g on g.seller_id = s.id and g.month = m.month_start
where s.role = 'vendedor' and s.is_active;

-- Indicadores del equipo (una fila). Para un vendedor refleja solo lo que puede ver
create or replace view public.v_team_kpis with (security_invoker = true) as
with m as (select date_trunc('month', public.today_mx())::date as month_start),
     cfg as (select coalesce((select (value #>> '{}')::int from public.settings where key = 'renewal_days'), 60) as renewal_days)
select
  (select count(*) from public.opportunities o
    where o.archived_at is null
      and o.stage in ('nuevo', 'contactado', 'cotizacion_enviada', 'negociacion'))        as open_opportunities,
  (select coalesce(sum(o.estimated_annual_premium), 0) from public.opportunities o
    where o.archived_at is null
      and o.stage in ('nuevo', 'contactado', 'cotizacion_enviada', 'negociacion'))        as open_pipeline_premium,
  (select count(*) from public.opportunities o, m
    where o.stage = 'ganada'
      and (o.closed_at at time zone 'America/Mexico_City')::date >= m.month_start)        as won_count_month,
  (select count(*) from public.opportunities o, m
    where o.stage = 'perdida'
      and (o.closed_at at time zone 'America/Mexico_City')::date >= m.month_start)        as lost_count_month,
  (select coalesce(sum(po.annual_premium), 0) from public.policies po, m
    where po.status <> 'cancelada'
      and (po.created_at at time zone 'America/Mexico_City')::date >= m.month_start)      as won_premium_month,
  (select count(*) from public.premium_receipts r
    where r.status in ('pendiente', 'vencido') and r.due_date < public.today_mx())        as overdue_receipts,
  (select count(*) from public.policies po, cfg
    where po.status in ('emitida', 'vigente')
      and po.end_date between public.today_mx() and public.today_mx() + cfg.renewal_days) as upcoming_renewals,
  (select count(*) from public.claims cl
    where cl.status in ('reportado', 'en_tramite'))                                        as open_claims,
  (select count(*) from public.follow_ups f
    where f.status = 'pendiente' and f.due_date < public.today_mx())                       as overdue_follow_ups;
```

### 8.6 `06_grants.sql` — Privilegios mínimos

```sql
-- ============================================================
-- CRM-123 · 06_grants.sql
-- Privilegios mínimos. Nadie (anon, authenticated) recibe DELETE ni TRUNCATE.
-- ============================================================

-- Punto de partida: sin privilegios para anon ni authenticated
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Objetos futuros creados por este rol tampoco heredan privilegios amplios
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Tablas (authenticated; la RLS decide qué filas)
grant select, update                 on public.profiles                to authenticated;
grant select, insert, update         on public.products                to authenticated;
grant select, insert, update         on public.insurers                to authenticated;
grant select, insert, update         on public.agents                  to authenticated;
grant select, insert, update         on public.clients                 to authenticated;
grant select, insert, update         on public.opportunities           to authenticated;
grant select, insert, update         on public.policies                to authenticated;
grant select                         on public.policy_commission_terms to authenticated;
grant select, update                 on public.premium_receipts        to authenticated;
grant select, insert, update         on public.claims                  to authenticated;
grant select, insert, update         on public.commission_rates        to authenticated;
grant select, update                 on public.commissions             to authenticated;
grant select, insert                 on public.activities              to authenticated;
grant select, insert, update         on public.follow_ups              to authenticated;
grant select, insert, update         on public.goals                   to authenticated;
grant select, insert, update         on public.settings                to authenticated;
grant select                         on public.audit_log               to authenticated;

-- Vistas
grant select on public.v_policies, public.v_receipts, public.v_follow_ups,
                public.v_commissions, public.v_seller_ranking, public.v_team_kpis to authenticated;

-- Funciones que usa la aplicación o las políticas
grant execute on function public.today_mx()                         to authenticated, service_role;
grant execute on function public.app_role()                         to authenticated, service_role;
grant execute on function public.is_active_user()                   to authenticated, service_role;
grant execute on function public.is_supervisor()                    to authenticated, service_role;
grant execute on function public.mark_password_changed()            to authenticated;
grant execute on function public.log_event(text, jsonb)             to authenticated;
grant execute on function public.reassign_client(uuid, uuid)        to authenticated;
grant execute on function public.run_daily_maintenance()            to service_role;

-- Tablas de solo inserción: ni siquiera la llave secreta (service_role) puede modificarlas o borrarlas
revoke update, delete, truncate on public.activities from service_role;
revoke update, delete, truncate on public.audit_log  from service_role;
```

### 8.7 `07_seed.sql` — Datos iniciales

```sql
-- ============================================================
-- CRM-123 · 07_seed.sql
-- Datos iniciales (catálogo de productos, porcentajes en 0 y configuración)
-- ============================================================

insert into public.products (name) values
  ('Auto'),
  ('Accidentes y Salud'),
  ('Daños'),
  ('Hogar'),
  ('Pyme');

-- Una fila de porcentajes por producto, en 0; el supervisor los captura desde la aplicación
insert into public.commission_rates (product_id)
select id from public.products;

insert into public.settings (key, value, description) values
  ('morning_summary_enabled',  'false'::jsonb,                 'Envío automático del resumen matutino (lun-vie). Lo activa el supervisor desde la PWA'),
  ('morning_summary_time',     '"07:30"'::jsonb,               'Hora local de envío del resumen matutino'),
  ('timezone',                 '"America/Mexico_City"'::jsonb, 'Zona horaria de operación'),
  ('receipt_alert_days',       '7'::jsonb,                     'Días de anticipación para alertar recibos por vencer'),
  ('renewal_days',             '60'::jsonb,                    'Días de anticipación para alertar renovaciones de pólizas'),
  ('summary_weekdays',         '[1,2,3,4,5]'::jsonb,           'Días de la semana del resumen (1 = lunes)'),
  ('trigger_cooldown_seconds', '120'::jsonb,                   'Espera mínima entre disparos manuales del resumen');

-- ------------------------------------------------------------
-- PRIMER SUPERVISOR (paso manual, ver BUILD_PLAN.md · Hito 1)
-- 1) La persona crea el usuario en Supabase: Authentication > Users > Add user
--    (correo + contraseña temporal, con "Auto Confirm User" activado).
-- 2) Con el UUID que muestra esa pantalla, se ejecuta lo siguiente (NO está en este script):
--
--    insert into public.profiles (id, full_name, email, role, must_change_password)
--    values ('<UUID_DEL_USUARIO_AUTH>', '<Nombre completo>', lower('<correo>'), 'supervisor', true);
-- ------------------------------------------------------------
```

### 8.8 `08a_tests_estructura.sql` — Pruebas de estructura

```sql
-- ============================================================
-- CRM-123 · 08a_tests_estructura.sql
-- Verificación estructural. Cada fila devuelve "violaciones" y TODAS deben ser 0
-- (las filas I-xx son informativas y se comparan con el valor esperado indicado).
-- ============================================================

select * from (

  -- ===== Reglas innegociables (esperado: 0 violaciones) =====
  select 'T01 tablas de public sin RLS activa' as prueba, count(*)::int as violaciones,
         coalesce(string_agg(c.relname, ', '), '') as detalle
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

  union all
  select 'T02 políticas DELETE o ALL', count(*)::int, coalesce(string_agg(tablename || '.' || policyname, ', '), '')
    from pg_policies where schemaname = 'public' and cmd in ('DELETE', 'ALL')

  union all
  select 'T03 UPDATE/DELETE en activities o audit_log (políticas)', count(*)::int,
         coalesce(string_agg(tablename || '.' || policyname, ', '), '')
    from pg_policies
   where schemaname = 'public' and tablename in ('activities', 'audit_log') and cmd in ('UPDATE', 'DELETE', 'ALL')

  union all
  select 'T04 políticas UPDATE sin WITH CHECK', count(*)::int, coalesce(string_agg(tablename || '.' || policyname, ', '), '')
    from pg_policies where schemaname = 'public' and cmd = 'UPDATE' and with_check is null

  union all
  select 'T05 condición true (excepto SELECT de settings)', count(*)::int,
         coalesce(string_agg(tablename || '.' || policyname, ', '), '')
    from pg_policies
   where schemaname = 'public'
     and (qual in ('true', '(true)') or with_check in ('true', '(true)'))
     and not (tablename = 'settings' and cmd = 'SELECT')

  union all
  select 'T06 vistas sin security_invoker = true', count(*)::int, coalesce(string_agg(c.relname, ', '), '')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce(c.reloptions @> array['security_invoker=true'], false)

  union all
  select 'T07 funciones SECURITY DEFINER sin search_path = public', count(*)::int, coalesce(string_agg(p.proname, ', '), '')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not coalesce(p.proconfig @> array['search_path=public'], false)

  union all
  select 'T08 anon/authenticated con DELETE o TRUNCATE', count(*)::int,
         coalesce(string_agg(grantee || ':' || table_name || ':' || privilege_type, ', '), '')
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('DELETE', 'TRUNCATE')

  union all
  select 'T09 anon con algún privilegio sobre tablas/vistas', count(*)::int, coalesce(string_agg(distinct table_name, ', '), '')
    from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'

  union all
  select 'T10 políticas que no son solo para authenticated', count(*)::int, coalesce(string_agg(tablename || '.' || policyname, ', '), '')
    from pg_policies where schemaname = 'public' and roles <> '{authenticated}'

  union all
  select 'T11 service_role puede modificar activities o audit_log', (
           (case when has_table_privilege('service_role', 'public.activities', 'UPDATE') then 1 else 0 end)
         + (case when has_table_privilege('service_role', 'public.activities', 'DELETE') then 1 else 0 end)
         + (case when has_table_privilege('service_role', 'public.audit_log', 'UPDATE') then 1 else 0 end)
         + (case when has_table_privilege('service_role', 'public.audit_log', 'DELETE') then 1 else 0 end))::int, ''

  union all
  select 'T12 authenticated/anon pueden ejecutar run_daily_maintenance', (
           (case when has_function_privilege('authenticated', 'public.run_daily_maintenance()', 'EXECUTE') then 1 else 0 end)
         + (case when has_function_privilege('anon', 'public.run_daily_maintenance()', 'EXECUTE') then 1 else 0 end))::int, ''

  union all
  select 'T13 anon puede ejecutar funciones de public', count(*)::int, coalesce(string_agg(p.proname, ', '), '')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')

  -- ===== Objetos esperados (esperado: 0 faltantes) =====
  union all
  select 'T20 tablas esperadas faltantes (17)', count(*)::int, coalesce(string_agg(t.name, ', '), '')
    from unnest(array['profiles','products','insurers','agents','clients','opportunities','policies',
                      'policy_commission_terms','premium_receipts','claims','commission_rates','commissions',
                      'activities','follow_ups','goals','settings','audit_log']) as t(name)
   where not exists (select 1 from pg_tables x where x.schemaname = 'public' and x.tablename = t.name)

  union all
  select 'T21 vistas esperadas faltantes (6)', count(*)::int, coalesce(string_agg(t.name, ', '), '')
    from unnest(array['v_policies','v_receipts','v_follow_ups','v_commissions','v_seller_ranking','v_team_kpis']) as t(name)
   where not exists (select 1 from pg_views x where x.schemaname = 'public' and x.viewname = t.name)

  union all
  select 'T22 funciones esperadas faltantes (8)', count(*)::int, coalesce(string_agg(t.name, ', '), '')
    from unnest(array['today_mx','app_role','is_active_user','is_supervisor','mark_password_changed',
                      'log_event','reassign_client','run_daily_maintenance']) as t(name)
   where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public' and p.proname = t.name)

  union all
  select 'T23 catálogo de productos distinto al esperado', (
           select count(*)::int from unnest(array['Auto','Accidentes y Salud','Daños','Hogar','Pyme']) as t(name)
            where not exists (select 1 from public.products p where p.name = t.name))
         + (select abs(count(*) - 5)::int from public.products), ''

  union all
  select 'T24 configuración inicial incompleta (7 claves)', count(*)::int, coalesce(string_agg(t.k, ', '), '')
    from unnest(array['morning_summary_enabled','morning_summary_time','timezone','receipt_alert_days',
                      'renewal_days','summary_weekdays','trigger_cooldown_seconds']) as t(k)
   where not exists (select 1 from public.settings s where s.key = t.k)

  union all
  select 'T25 productos sin fila de porcentajes de comisión', count(*)::int, coalesce(string_agg(p.name, ', '), '')
    from public.products p where not exists (select 1 from public.commission_rates r where r.product_id = p.id)

  union all
  select 'T26 tablas sin llave primaria', count(*)::int, coalesce(string_agg(c.relname, ', '), '')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'p')

  union all
  select 'T27 llaves foráneas con borrado en cascada', count(*)::int, coalesce(string_agg(conname, ', '), '')
    from pg_constraint k join pg_namespace n on n.oid = k.connamespace
   where n.nspname = 'public' and k.contype = 'f' and k.confdeltype = 'c'

) t
order by prueba;

-- ===== Inventario (informativo; los valores esperados se indican en SCRIPTS-SQL.md) =====
select 'I01 tablas'                 as inventario, count(*)::int as total from pg_tables where schemaname = 'public'
union all select 'I02 políticas RLS',          count(*)::int from pg_policies where schemaname = 'public'
union all select 'I03 llaves foráneas',        count(*)::int from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public' and k.contype = 'f'
union all select 'I04 restricciones CHECK',    count(*)::int from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public' and k.contype = 'c'
union all select 'I05 restricciones UNIQUE',   count(*)::int from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public' and k.contype = 'u'
union all select 'I06 índices (incluye PK)',   count(*)::int from pg_indexes where schemaname = 'public'
union all select 'I07 triggers de usuario',    count(*)::int from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal
union all select 'I08 vistas',                 count(*)::int from pg_views where schemaname = 'public'
union all select 'I09 funciones de public',    count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
order by inventario;
```

### 8.9 `08b_tests_comportamiento.sql` — Pruebas de comportamiento

```sql
-- ============================================================
-- CRM-123 · 08b_tests_comportamiento.sql
-- Pruebas de comportamiento por rol. Se ejecuta como UNA sola sentencia (bloque DO).
-- Crea usuarios y datos de prueba, simula a cada rol y SIEMPRE termina con una excepción
-- intencional que revierte todo (no deja datos). El mensaje final es el resultado:
--   "RESULTADO: N pruebas, 0 fallidas (rollback intencional)"  -> correcto
--   "RESULTADO: N pruebas, X fallidas: ..."                    -> hay errores; ver detalle
-- Requiere haber ejecutado antes los scripts 01 a 07 (usa el catálogo de productos).
-- ============================================================

do $$
declare
  v_total int := 0;
  v_fail  text := '';
  n       int;
  t       text;
  sup     uuid := gen_random_uuid();
  sup2    uuid := gen_random_uuid();
  v       uuid[] := '{}';
  v1      uuid;
  v2      uuid;
  v_prod  uuid;
  v_ins   uuid;
  v_agent uuid;
  c1 uuid; c2 uuid; o1 uuid; o2 uuid; o3 uuid; pol uuid; pol2 uuid; clm uuid; rc1 uuid; rc2 uuid; rc3 uuid;
  i int;
  d date := public.today_mx();
begin
  -- ---------------------------------------------------------------- Preparación (administrador)
  perform set_config('request.jwt.claims', '', true);
  reset role;

  insert into auth.users (id, email, aud, role) values (sup, 'sup1@test.local', 'authenticated', 'authenticated');
  insert into auth.users (id, email, aud, role) values (sup2, 'sup2@test.local', 'authenticated', 'authenticated');
  insert into public.profiles (id, full_name, email, role) values (sup, 'Supervisor Uno', 'sup1@test.local', 'supervisor');
  insert into public.profiles (id, full_name, email, role) values (sup2, 'Supervisor Dos', 'sup2@test.local', 'supervisor');
  for i in 1 .. 10 loop
    v := v || gen_random_uuid();
    insert into auth.users (id, email, aud, role) values (v[i], 'v' || i || '@test.local', 'authenticated', 'authenticated');
    insert into public.profiles (id, full_name, email, role) values (v[i], 'Vendedor ' || i, 'v' || i || '@test.local', 'vendedor');
  end loop;
  v1 := v[1]; v2 := v[2];

  -- A. Límites del equipo
  v_total := v_total + 1;
  begin
    declare x uuid := gen_random_uuid(); begin
      insert into auth.users (id, email) values (x, 'v11@test.local');
      insert into public.profiles (id, full_name, email, role) values (x, 'Vendedor 11', 'v11@test.local', 'vendedor');
      v_fail := v_fail || E'\n- A1 el vendedor 11 activo debió rechazarse';
    end;
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    declare x uuid := gen_random_uuid(); begin
      insert into auth.users (id, email) values (x, 'sup3@test.local');
      insert into public.profiles (id, full_name, email, role) values (x, 'Supervisor 3', 'sup3@test.local', 'supervisor');
      v_fail := v_fail || E'\n- A2 el supervisor 3 activo debió rechazarse';
    end;
  exception when others then null; end;

  -- ---------------------------------------------------------------- Como supervisor: catálogos y porcentajes
  perform set_config('request.jwt.claims', json_build_object('sub', sup)::text, true);
  set local role authenticated;

  select id into v_prod from public.products where name = 'Auto';
  v_total := v_total + 1; if v_prod is null then v_fail := v_fail || E'\n- B0 no existe el producto Auto (¿se ejecutó 07_seed?)'; end if;

  insert into public.insurers (name) values ('Aseguradora de Prueba') returning id into v_ins;
  insert into public.agents (full_name, phone) values ('Agente de Prueba', '5588880001') returning id into v_agent;

  update public.commission_rates
     set sale_exec_pct = 10, sale_agent_pct = 5, coll_exec_pct = 2, coll_agent_pct = 1
   where product_id = v_prod;
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- B1 el supervisor debe poder fijar porcentajes'; end if;

  -- ---------------------------------------------------------------- Como vendedor 1: límites de lo que NO puede
  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);

  select count(*) into n from public.profiles;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- C1 un vendedor solo debe ver su propio perfil (vio ' || n || ')'; end if;

  update public.profiles set role = 'supervisor' where id = v1;
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- C2 un vendedor no debe poder cambiar su rol'; end if;

  v_total := v_total + 1;
  begin
    insert into public.insurers (name) values ('Intento Vendedor');
    v_fail := v_fail || E'\n- C3 un vendedor no debe crear aseguradoras';
  exception when insufficient_privilege then null; end;

  select count(*) into n from public.commission_rates;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- C4 un vendedor no debe ver porcentajes de comisión'; end if;

  update public.commission_rates set sale_exec_pct = 99 where product_id = v_prod;
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- C5 un vendedor no debe editar porcentajes'; end if;

  select count(*) into n from public.audit_log;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- C6 un vendedor no debe leer la bitácora'; end if;

  v_total := v_total + 1;
  begin
    insert into public.audit_log (table_name, action) values ('x', 'event');
    v_fail := v_fail || E'\n- C7 un vendedor no debe escribir en la bitácora directamente';
  exception when insufficient_privilege then null; end;

  perform public.mark_password_changed();
  select count(*) into n from public.profiles where id = v1 and must_change_password = false;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- C8 mark_password_changed debe actualizar el perfil propio'; end if;

  perform public.log_event('prueba_evento', '{"k":1}'::jsonb);

  v_total := v_total + 1;
  begin
    perform public.reassign_client(gen_random_uuid(), v2);
    v_fail := v_fail || E'\n- C9 un vendedor no debe reasignar clientes';
  exception when insufficient_privilege then null; end;

  v_total := v_total + 1;
  begin
    perform public.run_daily_maintenance();
    v_fail := v_fail || E'\n- C10 un vendedor no debe ejecutar el mantenimiento diario';
  exception when insufficient_privilege then null; end;

  -- ---------------------------------------------------------------- Clientes
  insert into public.clients (full_name, phone, owner_id, source)
  values ('Cliente Uno', '5599990001', v1, 'referido') returning id into c1;
  select count(*) into n from public.clients;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- D1 el vendedor debe ver su cliente'; end if;

  v_total := v_total + 1;
  begin
    insert into public.clients (full_name, phone, owner_id) values ('Mal teléfono', '123', v1);
    v_fail := v_fail || E'\n- D2 el teléfono inválido debió rechazarse';
  exception when check_violation then null; end;

  v_total := v_total + 1;
  begin
    insert into public.clients (full_name, phone, owner_id, created_by) values ('Suplantación', '5599990002', v1, v2);
    v_fail := v_fail || E'\n- D3 created_by distinto al usuario debió rechazarse';
  exception when insufficient_privilege then null; end;

  v_total := v_total + 1;
  begin
    update public.clients set owner_id = v2 where id = c1;
    v_fail := v_fail || E'\n- D4 el vendedor no debe pasar su cliente a otro (WITH CHECK)';
  exception when insufficient_privilege then null; end;

  v_total := v_total + 1;
  begin
    delete from public.clients where id = c1;
    v_fail := v_fail || E'\n- D5 no debe existir DELETE';
  exception when insufficient_privilege then null; end;

  update public.clients set notes = 'nota' where id = c1;
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- D6 el vendedor debe poder editar su cliente'; end if;

  update public.clients set archived_at = now() where id = c1;
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- D7 el vendedor debe poder archivar su cliente'; end if;
  update public.clients set archived_at = null where id = c1;

  -- ---------------------------------------------------------------- Vendedor 2 y aislamiento
  perform set_config('request.jwt.claims', json_build_object('sub', v2)::text, true);

  select count(*) into n from public.clients;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- E1 el vendedor 2 no debe ver clientes del vendedor 1'; end if;

  v_total := v_total + 1;
  begin
    insert into public.clients (full_name, phone, owner_id) values ('Duplicado', '5599990001', v2);
    v_fail := v_fail || E'\n- E2 el teléfono duplicado debió rechazarse';
  exception when unique_violation then null; end;

  v_total := v_total + 1;
  begin
    insert into public.clients (full_name, phone, owner_id) values ('Para otro', '5599990003', v1);
    v_fail := v_fail || E'\n- E3 un vendedor no debe crear clientes a nombre de otro';
  exception when insufficient_privilege then null; end;

  update public.clients set notes = 'hack' where id = c1;
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- E4 el vendedor 2 no debe editar clientes ajenos'; end if;

  -- ---------------------------------------------------------------- Supervisor ve todo y crea cliente del vendedor 2
  perform set_config('request.jwt.claims', json_build_object('sub', sup)::text, true);
  select count(*) into n from public.clients;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- F1 el supervisor debe ver todos los clientes'; end if;

  insert into public.clients (full_name, phone, owner_id) values ('Cliente Dos', '5599990004', v2) returning id into c2;

  v_total := v_total + 1;
  begin
    update public.clients set owner_id = v1 where id = c2;
    v_fail := v_fail || E'\n- F2 el responsable solo debe cambiar con reassign_client';
  exception when insufficient_privilege then null; end;

  -- ---------------------------------------------------------------- Oportunidades y póliza (vendedor 1)
  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);

  insert into public.opportunities (client_id, product_id, owner_id, stage, estimated_annual_premium)
  values (c1, v_prod, v1, 'negociacion', 12000) returning id into o1;

  v_total := v_total + 1;
  begin
    insert into public.opportunities (client_id, product_id, owner_id, estimated_annual_premium) values (c2, v_prod, v1, 5000);
    v_fail := v_fail || E'\n- G1 no debe crearse una oportunidad sobre un cliente ajeno';
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    insert into public.opportunities (client_id, product_id, owner_id, stage, estimated_annual_premium)
    values (c1, v_prod, v1, 'perdida', 100);
    v_fail := v_fail || E'\n- G2 "perdida" sin motivo debió rechazarse';
  exception when check_violation then null; end;

  v_total := v_total + 1;
  begin
    insert into public.policies (opportunity_id, insurer_id, policy_number, annual_premium, payment_frequency, start_date, end_date)
    values (o1, v_ins, 'ANTES-001', 12000, 'mensual', d, d + 365);
    v_fail := v_fail || E'\n- G3 no debe emitirse póliza sobre una oportunidad que no está Ganada';
  exception when others then null; end;

  update public.opportunities set stage = 'ganada' where id = o1;
  select count(*) into n from public.opportunities where id = o1 and stage = 'ganada' and closed_at is not null;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- G4 al ganar debe registrarse closed_at'; end if;

  insert into public.policies (opportunity_id, insurer_id, agent_id, policy_number, annual_premium, payment_frequency, start_date, end_date)
  values (o1, v_ins, v_agent, 'POL-001', 12000, 'mensual', d, d + 365) returning id into pol;

  select count(*) into n from public.premium_receipts where policy_id = pol;
  v_total := v_total + 1; if n <> 12 then v_fail := v_fail || E'\n- H1 una póliza mensual debe generar 12 recibos (generó ' || n || ')'; end if;

  select sum(amount)::int into n from public.premium_receipts where policy_id = pol;
  v_total := v_total + 1; if n <> 12000 then v_fail := v_fail || E'\n- H2 los recibos deben sumar la prima anual (sumaron ' || coalesce(n, -1) || ')'; end if;

  select count(*) into n from public.premium_receipts where policy_id = pol and installment_number = 1 and due_date = d;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- H3 el primer recibo vence en la fecha de inicio'; end if;

  select count(*) into n from public.policy_commission_terms;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- H4 el vendedor no debe ver los porcentajes copiados a la póliza'; end if;

  v_total := v_total + 1;
  begin
    insert into public.policies (opportunity_id, insurer_id, policy_number, annual_premium, payment_frequency, start_date, end_date)
    values (o1, v_ins, 'POL-001-BIS', 12000, 'mensual', d, d + 365);
    v_fail := v_fail || E'\n- H5 no debe haber dos pólizas activas sobre la misma oportunidad';
  exception when unique_violation then null; end;

  v_total := v_total + 1;
  begin
    update public.policies set annual_premium = 99999 where id = pol;
    v_fail := v_fail || E'\n- H6 la prima emitida no debe modificarse';
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    update public.policies set status = 'vigente' where id = pol;
    v_fail := v_fail || E'\n- H7 una persona no debe forzar el estatus (solo cancelar)';
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    update public.opportunities set stage = 'negociacion' where id = o1;
    v_fail := v_fail || E'\n- H8 una oportunidad con póliza vigente no debe reabrirse';
  exception when others then null; end;

  perform set_config('request.jwt.claims', json_build_object('sub', v2)::text, true);
  v_total := v_total + 1;
  begin
    insert into public.policies (opportunity_id, insurer_id, policy_number, annual_premium, payment_frequency, start_date, end_date)
    values (o1, v_ins, 'ROBO-001', 1000, 'anual', d, d + 365);
    v_fail := v_fail || E'\n- H9 otro vendedor no debe emitir pólizas sobre oportunidades ajenas';
  exception when others then null; end;
  select count(*) into n from public.premium_receipts;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- H10 otro vendedor no debe ver recibos ajenos'; end if;

  -- ---------------------------------------------------------------- Cobranza y comisiones
  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);
  select id into rc1 from public.premium_receipts where policy_id = pol and installment_number = 1;
  select id into rc2 from public.premium_receipts where policy_id = pol and installment_number = 2;
  select id into rc3 from public.premium_receipts where policy_id = pol and installment_number = 3;

  update public.premium_receipts set status = 'pagado' where id = rc1;
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- I1 el vendedor debe poder marcar un recibo como pagado'; end if;

  select count(*) into n from public.policies where id = pol and status = 'vigente';
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- I2 al pagar el primer recibo la póliza pasa a vigente'; end if;

  select count(*) into n from public.commissions;
  v_total := v_total + 1; if n <> 2 then v_fail := v_fail || E'\n- I3 el vendedor debe ver solo sus 2 comisiones de ejecutivo (venta y cobranza); vio ' || n; end if;

  select count(*) into n from public.commissions where beneficiary_type = 'agente';
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- I4 el vendedor no debe ver comisiones del agente'; end if;

  select amount::int into n from public.commissions where commission_type = 'venta';
  v_total := v_total + 1; if n <> 1200 then v_fail := v_fail || E'\n- I5 comisión de venta del ejecutivo = 10% de 12,000 = 1,200 (fue ' || coalesce(n, -1) || ')'; end if;

  select amount::int into n from public.commissions where commission_type = 'cobranza';
  v_total := v_total + 1; if n <> 20 then v_fail := v_fail || E'\n- I6 comisión de cobranza del ejecutivo = 2% de 1,000 = 20 (fue ' || coalesce(n, -1) || ')'; end if;

  v_total := v_total + 1;
  begin
    update public.premium_receipts set status = 'pagado' where id = rc1;
    v_fail := v_fail || E'\n- I7 un recibo pagado no debe volver a modificarse';
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    update public.premium_receipts set amount = 1 where id = rc3;
    v_fail := v_fail || E'\n- I8 no debe modificarse el monto de un recibo';
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    update public.premium_receipts set status = 'pendiente' where id = rc3;
    v_fail := v_fail || E'\n- I9 el vendedor solo puede marcar recibos como pagados';
  exception when others then null; end;

  update public.premium_receipts set status = 'pagado' where id = rc2;
  select count(*) into n from public.commissions;
  v_total := v_total + 1; if n <> 3 then v_fail := v_fail || E'\n- I10 el segundo recibo solo agrega cobranza (3 comisiones visibles; vio ' || n || ')'; end if;

  update public.commissions set status = 'liquidada';
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- I11 el vendedor no debe liquidar comisiones'; end if;

  -- Supervisor
  perform set_config('request.jwt.claims', json_build_object('sub', sup)::text, true);
  select count(*) into n from public.commissions;
  v_total := v_total + 1; if n <> 6 then v_fail := v_fail || E'\n- I12 el supervisor debe ver 6 comisiones (4 + 2); vio ' || n; end if;

  select count(*) into n from public.policy_commission_terms where sale_exec_pct = 10;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- I13 el supervisor debe ver la copia de porcentajes'; end if;

  update public.commissions set status = 'liquidada' where commission_type = 'venta' and beneficiary_type = 'ejecutivo';
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- I14 el supervisor debe poder liquidar una comisión'; end if;

  v_total := v_total + 1;
  begin
    update public.commissions set status = 'pendiente' where commission_type = 'venta' and beneficiary_type = 'ejecutivo';
    v_fail := v_fail || E'\n- I15 una comisión liquidada no debe modificarse';
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    update public.commissions set amount = 1 where commission_type = 'cobranza' and beneficiary_type = 'agente';
    v_fail := v_fail || E'\n- I16 no debe modificarse el monto de una comisión';
  exception when others then null; end;

  -- ---------------------------------------------------------------- Siniestros, actividades, seguimientos
  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);

  insert into public.claims (policy_id, event_date, description) values (pol, d - 3, 'Choque menor') returning id into clm;
  select count(*) into n from public.claims where id = clm and client_id = c1;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- J1 el siniestro hereda el cliente de la póliza'; end if;

  update public.claims set status = 'pagado' where id = clm;
  select count(*) into n from public.claims where id = clm and closed_at is not null;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- J2 al cerrarse un siniestro se registra closed_at'; end if;

  insert into public.activities (client_id, type, summary) values (c1, 'llamada', 'Primera llamada');
  select count(*) into n from public.activities;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- K1 el vendedor debe ver sus actividades'; end if;

  v_total := v_total + 1;
  begin
    update public.activities set summary = 'editada';
    v_fail := v_fail || E'\n- K2 activities no admite UPDATE';
  exception when insufficient_privilege then null; end;

  v_total := v_total + 1;
  begin
    delete from public.activities;
    v_fail := v_fail || E'\n- K3 activities no admite DELETE';
  exception when insufficient_privilege then null; end;

  insert into public.follow_ups (client_id, owner_id, due_date, note) values (c1, v1, d - 1, 'Llamar para renovar');
  select count(*) into n from public.v_follow_ups where is_overdue;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- K4 el seguimiento de ayer debe aparecer vencido'; end if;

  update public.follow_ups set status = 'hecho';
  select count(*) into n from public.follow_ups where status = 'hecho' and completed_at is not null;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- K5 completar un seguimiento registra completed_at'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', sup)::text, true);
  v_total := v_total + 1;
  begin
    update public.activities set summary = 'edición del supervisor';
    v_fail := v_fail || E'\n- K6 ni el supervisor debe poder editar activities';
  exception when insufficient_privilege then null; end;

  -- ---------------------------------------------------------------- Cancelación
  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);

  v_total := v_total + 1;
  begin
    update public.policies set status = 'cancelada' where id = pol;
    v_fail := v_fail || E'\n- L1 cancelar sin motivo debió rechazarse';
  exception when check_violation then null; end;

  update public.policies set status = 'cancelada', cancellation_reason = 'Solicitud del cliente' where id = pol;
  select count(*) into n from public.premium_receipts where policy_id = pol and status = 'cancelado';
  v_total := v_total + 1; if n <> 10 then v_fail := v_fail || E'\n- L2 al cancelar, los 10 recibos pendientes pasan a cancelado (pasaron ' || n || ')'; end if;

  select count(*) into n from public.premium_receipts where policy_id = pol and status = 'pagado';
  v_total := v_total + 1; if n <> 2 then v_fail := v_fail || E'\n- L3 los recibos ya pagados se conservan'; end if;

  v_total := v_total + 1;
  begin
    update public.premium_receipts set status = 'pagado' where id = rc3;
    v_fail := v_fail || E'\n- L4 no debe pagarse un recibo de una póliza cancelada';
  exception when others then null; end;

  v_total := v_total + 1;
  begin
    update public.policies set status = 'vigente' where id = pol;
    v_fail := v_fail || E'\n- L5 una póliza cancelada no se reactiva';
  exception when others then null; end;

  -- Re-emisión tras cancelar (permitida)
  insert into public.policies (opportunity_id, insurer_id, policy_number, annual_premium, payment_frequency, start_date, end_date)
  values (o1, v_ins, 'POL-001-R', 12000, 'trimestral', d, d + 365) returning id into pol2;
  select count(*) into n from public.premium_receipts where policy_id = pol2;
  v_total := v_total + 1; if n <> 4 then v_fail := v_fail || E'\n- L6 una póliza trimestral genera 4 recibos (generó ' || n || ')'; end if;

  -- ---------------------------------------------------------------- Reasignación (supervisor)
  perform set_config('request.jwt.claims', json_build_object('sub', sup)::text, true);
  perform public.reassign_client(c1, v2);

  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);
  select count(*) into n from public.clients;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- M1 tras reasignar, el vendedor 1 ya no ve el cliente'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v2)::text, true);
  select count(*) into n from public.clients where id = c1;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- M2 el vendedor 2 ve el cliente reasignado'; end if;
  select count(*) into n from public.opportunities where client_id = c1 and owner_id = v2;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- M3 la oportunidad se reasigna con el cliente'; end if;
  select count(*) into n from public.activities where client_id = c1;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- M4 el historial del cliente lo ve el nuevo responsable'; end if;
  select count(*) into n from public.policies where client_id = c1 and owner_id = v2 and status in ('emitida', 'vigente');
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- M5 la póliza activa se reasigna con el cliente'; end if;

  -- Las comisiones ya generadas conservan al ejecutivo original
  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);
  select count(*) into n from public.commissions;
  v_total := v_total + 1; if n <> 3 then v_fail := v_fail || E'\n- M6 el vendedor 1 conserva sus 3 comisiones ya generadas (vio ' || n || ')'; end if;

  -- ---------------------------------------------------------------- Configuración y bitácora
  select count(*) into n from public.settings;
  v_total := v_total + 1; if n < 7 then v_fail := v_fail || E'\n- N1 todo usuario autenticado lee settings'; end if;

  update public.settings set value = 'true'::jsonb where key = 'morning_summary_enabled';
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 0 then v_fail := v_fail || E'\n- N2 un vendedor no debe editar settings'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', sup)::text, true);
  update public.settings set value = 'true'::jsonb where key = 'morning_summary_enabled';
  get diagnostics n = row_count;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- N3 el supervisor edita settings'; end if;

  select count(*) into n from public.audit_log where table_name = 'settings' and action = 'update';
  v_total := v_total + 1; if n < 1 then v_fail := v_fail || E'\n- N4 el cambio de settings debe quedar en la bitácora'; end if;

  select count(*) into n from public.audit_log where event = 'reassign_client';
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- N5 la reasignación queda en la bitácora'; end if;

  select count(*) into n from public.audit_log where event = 'prueba_evento';
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- N6 log_event registra el evento del usuario'; end if;

  select count(*) into n from public.audit_log where table_name = 'commissions';
  v_total := v_total + 1; if n < 1 then v_fail := v_fail || E'\n- N7 las comisiones quedan en la bitácora'; end if;

  -- ---------------------------------------------------------------- Vistas con security_invoker
  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);
  select count(*) into n from public.v_seller_ranking;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- O1 el ranking para un vendedor solo muestra su propia fila (mostró ' || n || ')'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', sup)::text, true);
  select count(*) into n from public.v_seller_ranking;
  v_total := v_total + 1; if n <> 10 then v_fail := v_fail || E'\n- O2 el ranking para el supervisor muestra los 10 vendedores (mostró ' || n || ')'; end if;

  select count(*) into n from public.v_team_kpis;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- O3 v_team_kpis devuelve una fila'; end if;

  select count(*) into n from public.v_policies;
  v_total := v_total + 1; if n <> 2 then v_fail := v_fail || E'\n- O4 el supervisor ve las 2 pólizas de prueba en v_policies (vio ' || n || ')'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v1)::text, true);
  select count(*) into n from public.v_policies;
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- O5 el vendedor 1 conserva la póliza cancelada en v_policies (vio ' || n || ')'; end if;
  select count(*) into n from public.v_commissions;
  v_total := v_total + 1; if n <> 3 then v_fail := v_fail || E'\n- O6 v_commissions respeta RLS (vio ' || n || ')'; end if;

  -- ---------------------------------------------------------------- Administrador: mantenimiento y tablas de solo inserción
  perform set_config('request.jwt.claims', '', true);
  reset role;

  insert into public.opportunities (client_id, product_id, owner_id, stage, estimated_annual_premium, created_by)
  values (c2, v_prod, v2, 'ganada', 3000, sup) returning id into o2;
  insert into public.policies (opportunity_id, insurer_id, policy_number, annual_premium, payment_frequency, start_date, end_date, created_by)
  values (o2, v_ins, 'POL-VENCIDA', 3000, 'mensual', d - 400, d - 35, sup) returning id into pol2;

  select count(*) into n from public.v_policies where id = pol2 and effective_status = 'vencida' and status = 'emitida';
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- P1 la vista debe mostrar "vencida" antes del mantenimiento'; end if;

  perform public.run_daily_maintenance();
  select count(*) into n from public.policies where id = pol2 and status = 'vencida';
  v_total := v_total + 1; if n <> 1 then v_fail := v_fail || E'\n- P2 el mantenimiento marca la póliza vencida'; end if;
  select count(*) into n from public.premium_receipts where policy_id = pol2 and status = 'vencido';
  v_total := v_total + 1; if n <> 12 then v_fail := v_fail || E'\n- P3 el mantenimiento marca los recibos vencidos (marcó ' || n || ')'; end if;

  v_total := v_total + 1;
  begin
    update public.audit_log set event = 'x';
    v_fail := v_fail || E'\n- Q1 audit_log no admite UPDATE ni siquiera para el administrador';
  exception when insufficient_privilege then null; end;
  v_total := v_total + 1;
  begin
    delete from public.audit_log;
    v_fail := v_fail || E'\n- Q2 audit_log no admite DELETE';
  exception when insufficient_privilege then null; end;
  v_total := v_total + 1;
  begin
    truncate public.audit_log;
    v_fail := v_fail || E'\n- Q3 audit_log no admite TRUNCATE';
  exception when insufficient_privilege then null; end;
  v_total := v_total + 1;
  begin
    update public.activities set summary = 'x';
    v_fail := v_fail || E'\n- Q4 activities no admite UPDATE ni siquiera para el administrador';
  exception when insufficient_privilege then null; end;
  v_total := v_total + 1;
  begin
    delete from public.activities;
    v_fail := v_fail || E'\n- Q5 activities no admite DELETE';
  exception when insufficient_privilege then null; end;

  -- ---------------------------------------------------------------- Resultado (rollback intencional)
  if v_fail = '' then
    t := 'RESULTADO: ' || v_total || ' pruebas, 0 fallidas (rollback intencional)';
  else
    t := 'RESULTADO: ' || v_total || ' pruebas, con fallos:' || v_fail;
  end if;
  raise exception '%', t using errcode = 'P0001';
end
$$;
```


## 9. Resultados esperados de las pruebas

### 9.1 `08a_tests_estructura.sql`
Se ejecutan **dos sentencias**; correrlas por separado.
- **Primera:** devuelve 21 filas (`T01` a `T13`, `T20` a `T27`). La columna `violaciones` debe ser **0 en todas**. Si alguna no es 0, la columna `detalle` nombra el objeto con el problema.
- **Segunda (inventario):** valores de referencia obtenidos en la verificación local. Una diferencia pequeña en funciones (`I09`) puede deberse a extensiones de Supabase; las demás deben coincidir.

| Inventario | Esperado |
|---|---|
| I01 tablas | 17 |
| I02 políticas RLS | 43 |
| I03 llaves foráneas | 39 |
| I04 restricciones CHECK | 53 |
| I05 restricciones UNIQUE | 3 |
| I06 índices (incluye llaves primarias) | 52 |
| I07 triggers de usuario | 51 |
| I08 vistas | 6 |
| I09 funciones de `public` | 25 |

### 9.2 `08b_tests_comportamiento.sql`
Es **una sola sentencia** (bloque `DO`) que crea usuarios y datos de prueba, simula a vendedores y supervisores, y **termina siempre con una excepción intencional que revierte todo** (no deja datos). El resultado correcto es un error cuyo mensaje dice:

`RESULTADO: 98 pruebas, 0 fallidas (rollback intencional)`

Cualquier otro mensaje enumera las pruebas fallidas. Si el bloque falla antes de ese mensaje por una columna obligatoria de `auth.users` (varía entre versiones de Supabase), se ajusta **solo** el `INSERT INTO auth.users` de la preparación; no se toca nada más.

Qué cubre: límites del equipo; aislamiento entre vendedores; bloqueo de `DELETE`; imposibilidad de cambiar `owner_id`; teléfono duplicado; emisión de póliza y calendario de recibos; comisiones de venta y cobranza (montos); visibilidad de comisiones y porcentajes; cancelación; reasignación; `activities` y `audit_log` inmutables incluso para el administrador; vistas con `security_invoker`; mantenimiento diario.

## 10. Pasos manuales que NO puede hacer el conector (los hace el humano en el panel de Supabase)

1. **Authentication → Sign In / Providers → Email:** desactivar el registro público (*Allow new users to sign up* = apagado) y fijar longitud mínima de contraseña en **10**.
2. **Primer supervisor:** en **Authentication → Users → Add user**, crear el usuario con correo y contraseña temporal y *Auto Confirm User* activado. Con el UUID resultante, el chat ejecuta el `INSERT` de `profiles` que aparece al final de `07_seed.sql` (role `supervisor`).
3. **Llaves de API:** Project Settings → API Keys. La llave **publishable** (`sb_publishable_…`) es la pública; la **secret** (`sb_secret_…`) solo va en el servidor (ver BUILD_PLAN.md).

## 11. Control de cambios

- Esta estructura no se modifica durante los Hitos 2, 3 y 4.
- Si Claude Code Web o Claude Design detectan que falta un campo, tabla, estatus o regla: **se detienen, lo reportan al humano y esperan**. Si el humano aprueba el cambio, se actualiza **primero este documento** y se prueba de nuevo en Hito 1; después se actualizan los demás documentos.
- Los tipos de TypeScript de la base de datos se generan **desde la base ya creada** (Hito 1) y se copian al repositorio; no se escriben a mano.
