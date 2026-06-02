# RLS — Matriz de permisos por tabla

> Documento vivo. Cada vez que cambie una policy en `20260601000015_rls_policies.sql`,
> reflejar aquí el cambio.
> Idioma: español. Tabla markdown con 5 columnas: **Operación** (SELECT/INSERT/UPDATE/DELETE) /
> **Rol** (quién ejecuta) / **Política** (nombre en SQL) / **Regla** (qué permite o deniega).

## Leyenda

- **organizer**: `trip_members.role = 'organizer' AND status = 'active'`. Equivalente al "owner" del PRD §3.2.
- **member activo**: `trip_members.status = 'active'` (cualquier rol).
- **creator**: el `auth.uid()` que aparece en `created_by` o `created_by_trip_member_id.user_id`.
- **service_role**: rol admin que bypasea RLS. Solo lo usan Edge Functions. Cliente nunca lo usa.
- **"Cualquiera"**: cualquier usuario autenticado.

> **Convención**: el cliente NUNCA usa `service_role`. Solo las Edge Functions. Las inserciones
> en `activity_log`, `notifications`, `settlement_suggestions`, y la mayoría de mutaciones
> sobre `trip_invites.used_count` las hace `service_role`. Esto se valida en `rls-smoke.test.sql`.

---

## 1. Matriz global

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| **profiles** | Cualquiera | service_role (trigger) | `auth.uid() = id` (self) | Nadie (sin policy) |
| **trips** | Miembro activo del trip | `created_by = auth.uid()` | Organizer del trip | Organizer del trip |
| **trip_members** | Miembro activo del trip | Organizer (o self en join) | Organizer (rol) o self (left) | Organizer del trip |
| **trip_invites** | Miembro activo del trip | Organizer del trip | Organizer del trip (revoke) | Nadie (revocación lógica) |
| **polls** | Miembro activo del trip | Organizer del trip | Organizer del trip | Organizer del trip |
| **date_poll_allowed_ranges** | Miembro activo del trip del poll | Organizer del trip del poll | Organizer del trip del poll | Organizer del trip del poll |
| **date_availability_votes** | Miembro activo del trip del poll | self + `can_vote_poll()` | self | self |
| **date_poll_results** | Miembro activo del trip del poll | service_role (Edge Function) | service_role | service_role |
| **destination_proposals** | Miembro activo del trip | `can_create_destination_proposal()` + self | creator o organizer | creator o organizer |
| **destination_proposal_images** | Miembro activo del trip del proposal | creator o organizer | creator o organizer | creator o organizer |
| **destination_proposal_tags** | Miembro activo del trip del proposal | creator o organizer | creator o organizer | creator o organizer |
| **destination_votes** | Miembro activo del trip del poll | self + `can_vote_poll()` | self | self |
| **tasks** | Miembro activo del trip | Miembro activo (con `created_by=self`) | creator, organizer, o assignee | creator u organizer |
| **expenses** | Miembro activo del trip | Miembro activo del trip | `can_manage_expense()` | `can_manage_expense()` (soft: `deleted_at`) |
| **expense_payers** | Miembro activo del trip del expense | `can_manage_expense()` | `can_manage_expense()` | `can_manage_expense()` |
| **expense_splits** | Miembro activo del trip del expense | `can_manage_expense()` | `can_manage_expense()` | `can_manage_expense()` |
| **settlement_suggestions** | Miembro activo del trip | service_role (Edge Function) | service_role | service_role |
| **settlement_payments** | Miembro activo del trip | Miembro activo (con `created_by=self`) | organizer o cobrador (`to_user_id`) | Nadie (lifecycle) |
| **activity_log** | Miembro activo del trip | **service_role ONLY** | Nadie | Nadie |
| **notifications** | `user_id = auth.uid()` (own) | service_role | `user_id = auth.uid()` (own, marcar leída) | Nadie |
| **push_tokens** | `user_id = auth.uid()` (own) | `user_id = auth.uid()` (own) | `user_id = auth.uid()` (own) | `user_id = auth.uid()` (own) |

---

## 2. Detalle por tabla

### 2.1 `profiles`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `profiles_select_all` | `true` (todos los autenticados ven todos) | — |
| INSERT | (sin policy) | — | — → bloqueado para `authenticated`; solo `service_role` + trigger |
| UPDATE | `profiles_update_self` | `auth.uid() = id` | `auth.uid() = id` |
| DELETE | (sin policy) | — | — → bloqueado para `authenticated` |

**Nota**: la columna `id` referencia `auth.users.id`. El trigger `handle_new_user`
crea la fila automáticamente al registrarse. Si el trigger se borra, falla la creación
de usuarios en cascada.

### 2.2 `trips`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `trips_select_members` | `is_trip_member(id, auth.uid())` | — |
| INSERT | `trips_insert_self` | — | `created_by = auth.uid()` |
| UPDATE | `trips_update_admin` | `can_manage_trip(id, auth.uid())` | `can_manage_trip(id, auth.uid())` |
| DELETE | `trips_delete_admin` | `can_manage_trip(id, auth.uid())` | — |

**Decisión**: insertar es libre (cualquier user crea su propio trip). El trigger
`trg_trip_add_creator` añade al creator como `organizer` automáticamente.

### 2.3 `trip_members`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `trip_members_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT | `trip_members_insert_admin` | — | `is_trip_admin(trip_id, auth.uid()) OR user_id = auth.uid()` |
| UPDATE | `trip_members_update_admin` | `is_trip_admin(trip_id, auth.uid())` | `is_trip_admin(trip_id, auth.uid())` |
| UPDATE | `trip_members_self_leave` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| DELETE | `trip_members_delete_admin` | `is_trip_admin(trip_id, auth.uid())` | — |

**Invariante protegida por trigger**: cada trip tiene exactamente 1 organizer activo
(`tg_check_single_organizer`). Impedir borrar / cambiar rol del último organizer
devuelve `trip_invariant` con `RAISE EXCEPTION`.

**Decisión**: `user_id = auth.uid()` en INSERT permite el flujo "auto-join" cuando
una Edge Function valida un invite y crea la membresía con el user context. Sin
esa cláusula, un usuario no podría auto-añadirse nunca vía RLS.

### 2.4 `trip_invites`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `trip_invites_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT | `trip_invites_insert_admin` | — | `is_trip_admin(trip_id, auth.uid()) AND created_by = auth.uid()` |
| UPDATE | `trip_invites_update_admin` | `is_trip_admin(trip_id, auth.uid())` | `is_trip_admin(trip_id, auth.uid())` |
| DELETE | (sin policy) | — | — → revocación lógica vía `revoked_at` |

**Decisión**: solo se almacena `token_hash`. El token en claro se devuelve 1 sola vez
al organizer en la Edge Function `create-trip-invite`. El flujo de aceptación
realiza la validación del token + bump de `used_count` dentro de la Edge Function
(que usa `service_role`).

### 2.5 `polls` y relacionados

#### `polls`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `polls_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT | `polls_insert_admin` | — | `is_trip_admin(trip_id, auth.uid()) AND created_by = auth.uid()` |
| UPDATE | `polls_update_admin` | `is_trip_admin(trip_id, auth.uid())` | `is_trip_admin(trip_id, auth.uid())` |
| DELETE | `polls_delete_admin` | `is_trip_admin(trip_id, auth.uid())` | — |

**Invariante**: solo 1 poll de cada `kind` por trip (`UNIQUE (trip_id, kind)`).

#### `date_poll_allowed_ranges`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `date_ranges_select_members` | `is_trip_member_from_poll(poll_id, auth.uid())` | — |
| ALL | `date_ranges_modify_admin` | `is_trip_admin(trip_id_from_poll(poll_id), auth.uid())` | idem |

#### `date_availability_votes`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `date_votes_select_members` | `is_trip_member_from_poll(poll_id, auth.uid())` | — |
| INSERT | `date_votes_insert_self` | — | `can_vote_poll(poll_id, auth.uid()) AND user_id = auth.uid()` |
| UPDATE | `date_votes_update_self` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| DELETE | `date_votes_delete_self` | `user_id = auth.uid()` | — |

**Decisión**: cuando el poll se cierra (`status='closed'`), `can_vote_poll()` devuelve
`false`, así que la policy bloquea nuevos INSERT/UPDATE. El test smoke verifica
que un `member` no puede votar en un poll cerrado.

#### `date_poll_results`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `date_results_select_members` | `is_trip_member_from_poll(poll_id, auth.uid())` | — |
| INSERT | (sin policy) | — | — → service_role only |
| UPDATE | (sin policy) | — | — |
| DELETE | (sin policy) | — | — |

**Decisión**: snapshot inmutable. Lo rellena `compute-date-poll-results` (Edge Function).
`FORCE ROW LEVEL SECURITY` activa el deny-by-default para `authenticated`.

### 2.6 `destination_proposals` y relacionados

#### `destination_proposals`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `dest_proposals_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT | `dest_proposals_insert_member` | — | `can_create_destination_proposal(poll_id, auth.uid()) AND created_by = auth.uid()` |
| UPDATE | `dest_proposals_update_creator` | `created_by = auth.uid() OR is_trip_admin(trip_id, auth.uid())` | idem |
| DELETE | `dest_proposals_delete_creator` | `created_by = auth.uid() OR is_trip_admin(trip_id, auth.uid())` | — |

**Límite de 5 propuestas por user**: NO se valida en SQL (costoso: COUNT por cada
INSERT). La Edge Function `create-destination-proposal` chequea el límite y devuelve
`400 max_proposals_reached` (PRD AC-5.2.2). Está en la zona gris: lo correcto es
validar en cliente Y en backend. Si se necesita SQL-strict, añadir un trigger
BEFORE INSERT que ejecute `COUNT()` y `RAISE EXCEPTION` — pero el coste es N
inserciones O(N²) en el peor caso.

#### `destination_proposal_images` y `destination_proposal_tags`

Ambas policies verifican que el `proposal_id` pertenece a un proposal accesible
por el user (creator o organizer para escritura; miembro del trip para lectura).
La sub-SELECT en `USING` añade latencia; es aceptable porque el número de
imágenes es bajo y los índices cubren el join.

### 2.7 `destination_votes`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `dest_votes_select_members` | `is_trip_member_from_poll(poll_id, auth.uid())` | — |
| INSERT | `dest_votes_insert_self` | — | `can_vote_poll(poll_id, auth.uid()) AND user_id = auth.uid()` |
| UPDATE | `dest_votes_update_self` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| DELETE | `dest_votes_delete_self` | `user_id = auth.uid()` | — |

### 2.8 `tasks`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `tasks_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT | `tasks_insert_member` | — | `is_trip_member(trip_id, auth.uid()) AND created_by = auth.uid()` |
| UPDATE | `tasks_update_perm` | `created_by = auth.uid() OR is_trip_admin(trip_id, auth.uid()) OR EXISTS(SELECT 1 FROM trip_members WHERE id = assigned_to_trip_member_id AND user_id = auth.uid())` | `created_by = auth.uid() OR is_trip_admin(trip_id, auth.uid())` |
| DELETE | `tasks_delete_perm` | `created_by = auth.uid() OR is_trip_admin(trip_id, auth.uid())` | — |

**Decisión**: el assignee puede editar su propia task (cambiar `status` a `done`,
por ejemplo). El `WITH CHECK` es más restrictivo: solo creator u organizer
pueden reasignar o cambiar el título. Es un trade-off conservador: si quieres
que el assignee reasigne también, mueve la cláusula a `WITH CHECK` también.

### 2.9 `expenses` y relacionados

#### `expenses`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `expenses_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT | `expenses_insert_member` | — | `is_trip_member(trip_id, auth.uid())` |
| UPDATE | `expenses_update_perm` | `can_manage_expense(id, auth.uid())` | idem |
| DELETE | `expenses_delete_perm` | `can_manage_expense(id, auth.uid())` | — |

**`can_manage_expense`**: organizer del trip, o el creator de la expense
(`created_by_trip_member_id.user_id = auth.uid()`).

**Soft delete**: el UPDATE permite cambiar `deleted_at`. Borrado "duro" desde
cliente está deshabilitado (DELETE policy existe pero RLS lo deja pasar solo
a quien gestiona). En la práctica, los clientes hacen `UPDATE expenses SET deleted_at = now()`.

#### `expense_payers` y `expense_splits`

Ambas policies cuelgan del `expense_id`: SELECT requiere ser miembro del trip del
expense; escritura requiere `can_manage_expense(expense_id, auth.uid())`. Esto
significa que un miembro normal puede ver los splits, pero no modificarlos.

**Invariante de splits**: el trigger `tg_check_split_percentages_sum` valida que
para `strategy = 'percent'`, `SUM(percentage) = 100` (con tolerancia 0.01). El
test smoke verifica que insertar un split con suma ≠ 100 falla con
`expense_invariant`.

### 2.10 `settlements`

#### `settlement_suggestions`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `settlements_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT/UPDATE/DELETE | (sin policies) | — | — → service_role only |

**Decisión**: lo regenera `compute-trip-balances` (Edge Function) en cada
recompute. El cliente solo lee.

#### `settlement_payments`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `payments_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT | `payments_insert_actor` | — | `is_trip_member(trip_id, auth.uid()) AND created_by = auth.uid()` |
| UPDATE | `payments_update_creditor` | `is_trip_admin(trip_id, auth.uid()) OR EXISTS(SELECT 1 FROM trip_members WHERE id = to_trip_member_id AND user_id = auth.uid())` | idem |
| DELETE | (sin policy) | — | — → lifecycle via status |

**Decisión**: el deudor (`from`) inicia el pago, el cobrador (`to`) o un
organizer lo confirma. Esto refleja el PRD US-7.3 (futuro v1).

### 2.11 `activity_log`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `activity_log_select_members` | `is_trip_member(trip_id, auth.uid())` | — |
| INSERT/UPDATE/DELETE | (sin policies) | — | — → **service_role ONLY** |

**Decisión de seguridad**: con `FORCE ROW LEVEL SECURITY` activo y sin policy
INSERT, cualquier `INSERT INTO activity_log` desde `authenticated` se rechaza
con error de permisos. Solo `service_role` puede escribir. El test smoke
verifica explícitamente este deny.

### 2.12 `notifications`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| SELECT | `notifications_select_own` | `user_id = auth.uid()` | — |
| UPDATE | `notifications_update_own` | `user_id = auth.uid()` | `user_id = auth.uid()` (para marcar `read_at`) |
| INSERT/DELETE | (sin policies) | — | — → service_role only |

### 2.13 `push_tokens`

| Operación | Política | USING | WITH CHECK |
|---|---|---|---|
| ALL | `push_tokens_*_own` | `user_id = auth.uid()` | `user_id = auth.uid()` |

**Decisión**: el user puede auto-gestionar sus tokens. El cliente los inserta
al primer login y los borra al logout.

---

## 3. Storage (buckets)

| Bucket | Path convention | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|---|
| `avatars` | `avatars/{user_id}/<filename>` | `user_id` == primer segmento | `user_id` == primer segmento |
| `trip-covers` | `trip-covers/{trip_id}/...` | miembro del trip | organizer del trip |
| `proposal-images` | `proposal-images/{poll_id}/...` | miembro del trip del poll | miembro del trip del poll |
| `receipts` | `receipts/{trip_id}/{expense_id}/...` | miembro del trip | miembro del trip |

**Límite duro**: 5 MB / archivo. Mimes: `image/jpeg, image/png, image/webp, image/gif`
(plus `application/pdf` para `receipts`).

**Privacidad**: todos los buckets son `public=false`. El acceso se hace por
**URL firmada** emitida por Edge Function. Nunca pública.

---

## 4. Decisiones de seguridad transversales

### 4.1 FORCE ROW LEVEL SECURITY

Todas las tablas con datos de usuario tienen `FORCE ROW LEVEL SECURITY`. Esto
asegura que incluso el `postgres` rol (owner de las tablas) se ve afectado por
las policies al consultar como usuario. **Excepción**: el rol `service_role`
bypasea RLS por convención de Supabase.

### 4.2 SECURITY DEFINER en helpers

Todas las funciones helper (`is_trip_member`, `is_trip_admin`, etc.) están
marcadas `SECURITY DEFINER` y `STABLE`. Esto evita la recursión RLS cuando
una policy en `trip_members` necesita leer `trip_members` (vía helper).

### 4.3 `auth.uid()` en policies

Las policies usan `auth.uid()` (no `current_setting('request.jwt.claims', true)::json->>'sub'`)
por rendimiento. `auth.uid()` es un wrapper optimizado provisto por Supabase.

### 4.4 Grants a `anon` y `authenticated`

Por defecto, todas las tablas en `public` están `GRANT`ed a `anon` y
`authenticated`. Las policies RLS se encargan de filtrar. No hace falta `REVOKE`.

### 4.5 Triggers vs RLS

Las invariantes de modelo (e.g. `expense.currency == trip.currency`) se
implementan con triggers BEFORE INSERT/UPDATE. RLS no es el lugar correcto
para invariantes: RLS decide quién ve/escribe, no qué valores son válidos.

---

## 5. Huecos conocidos (a cerrar en próximas iteraciones)

| # | Severidad | Hueco | Mitigación actual |
|---|---|---|---|
| H1 | Media | El límite de 5 propuestas por user se valida solo en Edge Function, no en SQL. Un cliente con service_role podría bypasear. | Edge Function `create-destination-proposal` hace COUNT + rechaza con 400. Documentar en `qa-engineer` para auditar. |
| H2 | Baja | `trip_invites.token_hash` no tiene rate limit de lookup. Un attacker con el hash podría intentar aceptar muchas veces. | El CHECK `used_count <= max_uses` y `revoked_at` se aplican en UPDATE; tras agotar, se rechaza. |
| H3 | Baja | `destination_proposal_images.storage_path` no se valida en INSERT contra el path real subido. | La Edge Function que genera la signed URL valida que el path empiece por `proposal-images/{poll_id}/`. |
| H4 | Media | `notifications.data` (jsonb) puede contener PII si las Edge Functions no sanitizan. | Documentar en `docs/01-architecture/edge-functions.md` (Fase 3). |

---

## 6. Cómo auditar cambios

1. **Cambiar una policy**: editar `20260601000015_rls_policies.sql` (idempotente:
   `DROP POLICY IF EXISTS` + `CREATE POLICY`). Actualizar este `rls.md`.
2. **Añadir tabla nueva**: incluir `ENABLE ROW LEVEL SECURITY; FORCE ROW LEVEL SECURITY;`
   en su migración + crear las policies en `15_rls_policies.sql`. Añadir fila a
   la matriz global.
3. **Cambiar un helper**: editar `20260601000014_rls_helpers.sql`. Las policies
   que lo usan no necesitan cambio.
4. **Smoke test**: tras cualquier cambio, correr
   `psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/rls-smoke.test.sql`
   (ver `README.md`).
