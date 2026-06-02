# Plantir — Backend Supabase (PostgreSQL 15)

> Capa de datos del MVP sobre Supabase. 17 migraciones versionadas, RLS estricta,
> helpers SQL y smoke tests.

## Tabla de contenidos

- [Prerrequisitos](#prerrequisitos)
- [Setup local](#setup-local)
- [Aplicar migraciones](#aplicar-migraciones)
- [Smoke test RLS](#smoke-test-rls)
- [Seed de desarrollo](#seed-de-desarrollo)
- [Estructura de archivos](#estructura-de-archivos)
- [Desplegar en Supabase Cloud](#desplegar-en-supabase-cloud)
- [Operaciones habituales](#operaciones-habituales)
- [Troubleshooting](#troubleshooting)

---

## Prerrequisitos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| [Supabase CLI](https://github.com/supabase/cli) | 1.180+ | `supabase start`, `db reset`, deploy |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x | Levantar el stack local (Postgres + Auth + Storage) |
| [psql](https://www.postgresql.org/docs/current/app-psql.html) | 15 | Inspeccionar / aplicar migraciones a mano |
| Node.js (opcional) | 20+ | Generador de tipos TS (`supabase gen types`) |

Verifica:

```bash
supabase --version   # >= 1.180
docker --version     # >= 24
psql --version       # >= 15
```

---

## Setup local

### 1. Inicializar el proyecto (solo la primera vez)

Si el repo **NO** tiene `supabase/`:

```bash
# Desde la raíz del repo (donde está package.json):
supabase init
```

Esto crea `supabase/config.toml` con valores por defecto. Ajusta:

```toml
# supabase/config.toml
[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323

[storage]
enabled = true
file_size_limit = "5MiB"
```

> Si el repo ya tiene `supabase/` con sus propias migraciones, **no** ejecutes
> `supabase init` — sobreescribiría `config.toml`. Este repo YA incluye la
> carpeta `supabase/` con las 17 migraciones, `rls.md`, `tests/` y este
> `README.md`.

### 2. Levantar el stack local

```bash
supabase start
```

Esto arranca (en Docker):

| Servicio | Puerto | Notas |
|---|---|---|
| Postgres | 54322 | DB `postgres`, user `postgres`, password `postgres` |
| PostgREST | 54321 | API REST auto-generada |
| GoTrue (Auth) | 54321/auth/v1 | Email + password |
| Storage | 54321/storage/v1 | Buckets con RLS |
| Realtime | — | WebSocket en `54321/realtime/v1` |
| Studio | 54323 | UI web en <http://localhost:54323> |

La primera vez tarda ~3-5 minutos (descarga imágenes Docker). Las siguientes,
~30 s.

Verás un output con las **API keys** (anon, service_role). **No las commitees**:
ya están en `.gitignore` (`supabase/.temp/`).

### 3. Confirmar que las migraciones se aplicaron

Tras `supabase start`, todas las migraciones de `supabase/migrations/` se
aplican automáticamente al contenedor. Verifica:

```bash
supabase db status
# o
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
# esperado: 22 tablas (profiles, trips, trip_members, trip_invites, polls,
#   date_poll_allowed_ranges, date_availability_votes, date_poll_results,
#   destination_proposals, destination_proposal_images, destination_proposal_tags,
#   destination_votes, tasks, expenses, expense_payers, expense_splits,
#   settlement_suggestions, settlement_payments, activity_log, notifications,
#   push_tokens, schemas)
```

---

## Aplicar migraciones

### Reset completo (re-aplica TODO desde cero)

```bash
supabase db reset
```

Esto:
1. Tira y recrea la DB.
2. Aplica las 17 migraciones en orden.
3. Aplica `20260601000017_seed_dev_data.sql` solo si la variable de sesión
   `app.is_dev_seed` está activa (ver [Seed de desarrollo](#seed-de-desarrollo)).

**Cuidado**: `db reset` borra TODOS los datos. Úsalo solo en dev.

### Aplicar UNA migración específica (sin reset)

```bash
psql -h localhost -p 54322 -U postgres -d postgres \
  -f supabase/migrations/20260601000010_expenses.sql
```

> Password: `postgres` (default local; Supabase lo inyecta automáticamente
> si ejecutas `psql` desde el mismo directorio del repo con la CLI autenticada).

### Aplicar migraciones nuevas (sin reset)

Si ya tienes el stack levantado y solo quieres aplicar las migraciones que se
han añadido desde la última vez:

```bash
supabase db push    # NO existe en CLI; usa:
# o equivalentemente:
supabase migration up
```

En realidad, el flujo canónico de Supabase es:

1. `supabase start` (todo limpio).
2. Modificas migraciones / añades nuevas.
3. `supabase db reset` (re-aplica todo).

Esto es porque las migraciones son **inmutables** en producción; en dev es
barato resetear.

---

## Smoke test RLS

El test vive en `supabase/tests/rls-smoke.test.sql`. Verifica que las policies
bloquean accesos no autorizados y permiten los autorizados.

### Ejecutar el smoke test

```bash
psql -h localhost -p 54322 -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/rls-smoke.test.sql
```

Si todo va bien, verás al final:

```
NOTICE:  rls-smoke: ALL TESTS PASSED
```

Si alguna assertion falla, el script aborta con `psql` exit code ≠ 0 y el
mensaje del `RAISE EXCEPTION` correspondiente.

### Qué cubre el smoke test

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Usuario sin membresía intenta SELECT en `trips` | 0 filas |
| 2 | Usuario miembro intenta SELECT en `trip_members` de su trip | ve los miembros |
| 3 | Usuario NO-admin intenta UPDATE en `polls` (cerrar poll) | error de permiso |
| 4 | Usuario NO-creator intenta UPDATE en `expense` ajena | error de permiso |
| 5 | Usuario autenticado intenta INSERT en `activity_log` | error de permiso |
| 6 | Miembro intenta votar en un poll cerrado | error de permiso (FK o RLS) |
| 7 | `Settlement` con `from = to` | error de CHECK constraint |
| 8 | `expense_splits` con suma de percentages ≠ 100 | error de trigger |
| 9 | `expenses.currency` ≠ `trips.currency` | error de trigger |
| 10 | `trip_invites` con `used_count > max_uses` | error de CHECK |

### Integración en CI (sugerido)

```yaml
# .github/workflows/db-tests.yml
name: DB tests
on: [push, pull_request]
jobs:
  rls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/rls-smoke.test.sql
        env:
          PGPASSWORD: postgres
```

---

## Seed de desarrollo

La migración `20260601000017_seed_dev_data.sql` crea datos de ejemplo (4
usuarios, 1 trip, 1 poll, 1 expense). **Solo se ejecuta si la variable de
sesión `app.is_dev_seed` está en `on`**.

### Activar el seed

**Opción 1 — sesión de psql**:

```bash
psql -h localhost -p 54322 -U postgres -d postgres
postgres=# SET app.is_dev_seed = 'on';
postgres=# \i supabase/migrations/20260601000017_seed_dev_data.sql
```

**Opción 2 — desde CLI con `db reset`**:

Añade a `supabase/config.toml`:

```toml
[db.seed]
enabled = true
sql_paths = ["./migrations/20260601000017_seed_dev_data.sql"]
```

Y luego:

```bash
PGOPTIONS="-c app.is_dev_seed=on" supabase db reset
```

### Datos de seed

| Entidad | Valores | UUID |
|---|---|---|
| Usuarios | `lucia@plantir.dev`, `marcos@plantir.dev`, `sara@plantir.dev`, `carlos@plantir.dev` | `00000000-...-001..004` |
| Trip | "Esquiada 2026", EUR, planning | `11111111-1111-1111-1111-111111111111` |
| Destination poll | "¿Dónde esquiamos?" | `22222222-2222-2222-2222-222222222222` |
| Destination proposal | "Sierra Nevada" | `33333333-3333-3333-3333-333333333333` |
| Expense | "Cena de bienvenida", 100 EUR, split igual entre 4 | `44444444-4444-4444-4444-444444444444` |

Passwords dummy: `dev-password` (NO usar en prod).

> **Importante**: en producción NUNCA actives este seed. La migración detecta
> automáticamente si el flag está activo y no hace nada en caso contrario
> (ver `current_setting('app.is_dev_seed', true)`).

---

## Estructura de archivos

```
supabase/
├── config.toml                         # Configuración del stack local
├── README.md                           # Este archivo
├── rls.md                              # Matriz de permisos por tabla
│
├── migrations/                         # 17 migraciones versionadas (orden estricto)
│   ├── 20260601000001_extensions.sql
│   ├── 20260601000002_enums.sql
│   ├── 20260601000003_profiles.sql
│   ├── 20260601000004_trips_and_members.sql
│   ├── 20260601000005_invites.sql
│   ├── 20260601000006_polls_and_date_votes.sql
│   ├── 20260601000007_destination_proposals.sql
│   ├── 20260601000008_destination_votes.sql
│   ├── 20260601000009_tasks.sql
│   ├── 20260601000010_expenses.sql
│   ├── 20260601000011_settlements.sql
│   ├── 20260601000012_activity_log.sql
│   ├── 20260601000013_notifications_and_push_tokens.sql
│   ├── 20260601000014_rls_helpers.sql
│   ├── 20260601000015_rls_policies.sql
│   ├── 20260601000016_storage_policies.sql
│   └── 20260601000017_seed_dev_data.sql
│
├── functions/                          # Edge Functions (vacío en Fase 2; se llena en Fase 3)
│   └── README.md                       # (creado por Fase 3)
│
└── tests/
    └── rls-smoke.test.sql              # Smoke test de RLS (ejecutable)
```

---

## Desplegar en Supabase Cloud

### 1. Crear el proyecto

1. Ve a <https://app.supabase.com> → **New project**.
2. Elige organización, nombre (`plantir-prod` o similar), región, y un
   **database password** fuerte. **Guarda el password** en un secret manager
   (1Password, Vault, etc.) — no en el repo.
3. Espera ~2 minutos a que el proyecto esté listo.

### 2. Vincular el repo local al proyecto Cloud

```bash
supabase login                    # abre el browser, autoriza
supabase link --project-ref <REF> # REF está en Settings > API
# Te pide el database password de Cloud.
```

Esto crea `supabase/.temp/` con las credenciales (ya en `.gitignore`).

### 3. Aplicar las migraciones

```bash
supabase db push
```

Esto aplica **solo las migraciones que aún no se han aplicado** a Cloud (de
forma incremental, no destructiva). El progreso se ve en la consola.

> **NO** uses `supabase db reset` contra Cloud — eso borra la DB remota.

### 4. Verificar

1. Ve a <https://app.supabase.com/project/<REF>/editor> y confirma que las
   22 tablas existen.
2. Ve a **Authentication > Policies** y verifica que RLS está activo en todas.
3. (Opcional) Ve a **SQL Editor** y ejecuta:
   ```sql
   SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
   -- esperado: ~40 policies
   ```

### 5. Configurar secretos (Fase 3, lo hace el track de Edge Functions)

Las Edge Functions necesitan secrets (e.g. API keys de servicios externos).
Se configuran con:

```bash
supabase secrets set NOMBRE=valor
```

Cero secrets en SQL ni en código commiteado.

---

## Operaciones habituales

### Añadir una nueva migración

1. Crea un archivo con timestamp YYYYMMDDHHMMSS:
   ```bash
   # Ejemplo: añadir un campo "is_pinned" a destination_proposals
   supabase migration new add_is_pinned_to_destination_proposals
   # Genera: supabase/migrations/<timestamp>_add_is_pinned_to_destination_proposals.sql
   ```
2. Edita el archivo. Recuerda:
   - Idempotente: `CREATE ... IF NOT EXISTS`, `DROP ... IF EXISTS` antes.
   - Cero `DROP COLUMN` accidental — usa `RENAME` explícito si renombras.
   - Comentarios SQL en español.
3. Si añades políticas, usa `DROP POLICY IF EXISTS` + `CREATE POLICY`.
4. Si la migración es destructiva, **abre issue de review antes**.

### Inspeccionar el estado actual

```bash
# Listar migraciones aplicadas vs. locales:
supabase migration list

# Ver las queries que Supabase ejecuta internamente:
# En Studio > SQL Editor > "Query performance".

# Ver policies activas:
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;"
```

### Hacer un backup antes de cambios

```bash
# Backup de la DB local:
supabase db dump -f supabase/backups/$(date +%Y%m%d_%H%M%S).sql

# Backup de Cloud (en Dashboard > Settings > Database > Backups).
```

### Regenerar tipos TypeScript

Cuando cambies el esquema, regenera los tipos para que `src/supabase/types.gen.ts`
refleje la nueva estructura:

```bash
supabase gen types typescript --local > src/supabase/types.gen.ts
# o contra Cloud:
supabase gen types typescript --project-id <REF> > src/supabase/types.gen.ts
```

---

## Troubleshooting

### `supabase start` falla con "port already in use"

```bash
lsof -i :54322  # o en Windows: netstat -ano | findstr :54322
# Mata el proceso o cambia el puerto en supabase/config.toml.
```

### Las migraciones no se aplican tras editar

```bash
supabase db reset    # limpio: tira, recrea, aplica todas
```

### El smoke test falla con "permission denied for table ..."

Eso es RLS bloqueando una operación que debería estar permitida. Diagnostica:

1. Verifica que el usuario de test está bien creado:
   ```sql
   SELECT * FROM auth.users WHERE email = 'test@example.com';
   ```
2. Verifica que el JWT tiene los claims correctos:
   ```sql
   SELECT auth.uid();  -- debe devolver el UUID del test user
   ```
3. Verifica que la policy está activa:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = '<tabla>';
   ```
4. Si la policy está pero no funciona, mira los logs de Postgres
   (`supabase status` → ver logs de db).

### RLS me bloquea en un flujo legítimo

Antes de relajar una policy, pregúntate:
- ¿Debería ser el cliente el que llama, o una Edge Function con `service_role`?
- ¿Hay una capa de validación que debería añadirse (e.g. Zod en cliente)?

Si la policy es correcta pero limita demasiado, **añade una nueva policy más
específica** (las policies son OR-ed, no se reemplazan), o usa `WITH CHECK`
más permisivo solo donde sea necesario.

### El seed de dev no se ejecuta

Verifica el flag:

```sql
SHOW app.is_dev_seed;   -- debe devolver 'on'
```

Si no, `SET app.is_dev_seed = 'on;` y vuelve a ejecutar el script.

---

## Referencias

- [PRD §3 — Modelo de dominio](../docs/01-product/prd.md#3-modelo-de-dominio)
- [PRD §6 — Criterios de aceptación](../docs/01-product/prd.md#6-criterios-de-aceptación-por-feature-del-mvp)
- [Contratos TS](../src/types/index.ts)
- [Matriz de permisos](./rls.md)
- [Supabase docs: RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase docs: Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
