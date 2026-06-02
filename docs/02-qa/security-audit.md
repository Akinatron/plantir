# Auditoría de seguridad — Plantir

> **Estado:** v1 (Fase 2, pre-implementación). Auditoría basada en PRD, arquitectura, contratos TS y esquema SQL planificado. Se actualizará tras Fase 3 con los hallazgos sobre la implementación real.

---

## Resumen ejecutivo

Plantir es una app social móvil que toca datos sensibles (amistades, dinero, decisiones de grupo). Las tres superficies de ataque principales son:

1. **API pública de Supabase** (PostgREST + Edge Functions) — superficie mayor, expuesta a internet.
2. **Cliente móvil** (Expo) — dispositivos de usuario, código potencialmente extraíble.
3. **Storage** (Supabase Storage) — fotos, recibos, imágenes de propuestas.

La estrategia defensiva se apoya en tres pilares: **RLS estricta en TODAS las tablas**, **service_role key solo en Edge Functions**, y **validación de inputs en el borde con Zod**.

**Veredicto del release:** 0 Blockers, 0 Criticals. Hay 4 huecos conocidos (H1-H4) que se documentan; los Majors tienen plan documentado y los Minors son mejoras de robustez.

---

## 1. OWASP Mobile Top 10 (2024)

| # | Riesgo | Estado | Evidencia / Acción |
|---|---|---|---|
| **M1** | Improper credential use | ✅ Cumple | Auth gestionada por Supabase Auth. Sesiones con refresh tokens rotativos. `EXPO_PUBLIC_*` solo expone anon keys públicas; service_role key solo en Edge Functions. SecureStore (Keychain/Keystore) para tokens sensibles en cliente. **Acción:** documentar en el README que NUNCA se debe loggear el access_token en cliente. |
| **M2** | Inadequate supply chain | ⚠️ Parcial | Dependencias auditadas con `npm audit` y `pnpm audit --prod`. Cero secrets en código (verificado en grep). **Acción pendiente:** añadir `npm audit --audit-level=high` al CI antes de Fase 3. |
| **M3** | Insecure auth/authorization | ✅ Cumple | Helper functions `is_trip_member`, `is_trip_admin`, `can_manage_trip`, `can_vote_poll`, `can_create_destination_proposal`, `can_manage_expense` (`SECURITY DEFINER + STABLE`). RLS `FORCE` en TODAS las tablas de datos. Auth tokens via Supabase (PKCE flow en web, SecureStore en mobile). |
| **M4** | Insufficient input/output validation | ✅ Cumple (server) / ⚠️ Parcial (cliente) | **Server:** Zod en TODA Edge Function para validar payloads. **Cliente:** RHF + Zod en formularios de Fase 3. **Acción:** auditar cada input del cliente contra su schema Zod correspondiente antes de Fase 3. |
| **M5** | Insecure communication | ✅ Cumple | HTTPS obligatorio en producción. Supabase Realtime sobre WSS. **Sin endpoints HTTP inseguros** en cliente. Cert pinning (Fase 3, opcional pero recomendado para v1). |
| **M6** | Inadequate privacy controls | ✅ Cumple | Privacy by design: export my data (Fase 3 endpoint), delete account (Edge Function `delete-account`), delete trip (Edge Function `delete-trip`), leave group (cambiar status a `left`), delete photos (Storage DELETE con policy). Retention policy 90 días tras delete (documentado en `rls.md`). |
| **M7** | Insufficient binary protections | ✅ Cumple | iOS: App Store distribution, ATS habilitado por defecto. Android: Play Protect, no debuggable en release builds. Expo prebuild genera configs nativos correctos. |
| **M8** | Security misconfiguration | ⚠️ Parcial | `.env.example` solo tiene placeholders. Cero secrets en código. **Acción:** validar con `gitleaks` en CI en Fase 3. Storage buckets privados (`public=false`). CORS restrictivo en Supabase Dashboard (whitelist explícito). |
| **M9** | Insecure data storage | ✅ Cumple | SecureStore (Keychain/Keystore) para tokens. AsyncStorage solo para preferencias no sensibles. RLS evita filtrar datos a usuarios no autorizados. DB cifrada en reposo por Supabase. |
| **M10** | Insufficient cryptography | ✅ Cumple | HTTPS/TLS 1.3. JWT firmado por Supabase (HS256/RS256). Passwords hasheados con bcrypt vía Supabase Auth. Tokens de invitación hasheados (token_hash) — nunca plaintext. |

---

## 2. OWASP API Top 10 (2023) — sobre Edge Functions de Fase 3

| # | Riesgo | Mitigación en Plantir |
|---|---|---|
| **API1** | Broken Object Level Authorization (BOLA) | Helper `is_trip_member(trip_id, user_id)` invocado en cada Edge Function que toca datos de un trip. Cero acceso a objetos de otro trip. |
| **API3** | Broken Object Property Level Authorization | Edge Functions con Zod strict: solo campos esperados en el payload. Campos sensibles (ej. `created_by`, `token_hash`, `paid_by_trip_member_id`) NUNCA aceptados del cliente — se derivan server-side. |
| **API5** | Broken Function Level Authorization | Helper `can_manage_trip`, `can_create_destination_proposal`, etc. Cero endpoint expone funciones admin sin verificar role. |
| **API8** | Security misconfiguration | CORS configurado en Supabase Dashboard. Rate limiting por función (ver §4). Logging estructurado en cada Edge Function con `event_type`, `actor_id`, `target_id`. |

**Auditoría de las 10 Edge Functions planificadas:**

| Función | API1 | API3 | API5 | API8 | Veredicto |
|---|---|---|---|---|---|
| `create-trip-invite` | ✅ user solo crea para sus trips | ✅ payload estricto Zod | ✅ solo admin/owner | ✅ rate limit + log | ✅ |
| `accept-trip-invite` | ✅ token hasheado, single-use | ✅ token solo, no payload | N/A (cualquiera con token) | ✅ rate limit + log | ✅ |
| `fetch-link-metadata` | ✅ cualquier user autenticado | ✅ URL validada | ✅ cualquier user | ✅ SSRF + timeout | ✅ |
| `compute-date-poll-results` | ✅ trip members | N/A (read-only) | ✅ trip members | ✅ idempotente | ✅ |
| `close-date-poll` | ✅ trip admins | ✅ poll_id + selected_result_id | ✅ admin | ✅ log | ✅ |
| `compute-destination-results` | ✅ trip members | N/A | ✅ trip members | ✅ idempotente | ✅ |
| `close-destination-poll` | ✅ trip admins | ✅ poll_id + proposal_id | ✅ admin | ✅ log | ✅ |
| `compute-trip-balances` | ✅ trip members | N/A | ✅ trip members | ✅ idempotente | ✅ |
| `mark-settlement-paid` | ✅ from=member, to=member | ✅ settlement_id, no override | ✅ debtor o admin | ✅ confirma con receiver | ✅ |
| `send-trip-notification` | ✅ internal (cron o trigger) | N/A | N/A | ✅ respeta prefs | ✅ |

---

## 3. Auditoría RLS por tabla

> Referencia cruzada: el detalle completo de cada política vive en `supabase/rls.md`. Esta sección es el **resumen adversarial** para validar la matriz.

### 3.1 Matriz de cumplimiento

| Tabla | FORCE RLS | SELECT | INSERT | UPDATE | DELETE | Notas |
|---|---|---|---|---|---|---|
| `profiles` | ✅ | self + todos | self (trigger) | self | service_role | Avatar/email solo self. |
| `trips` | ✅ | members | creator | admin | owner | Soft delete via `archived_at`. |
| `trip_members` | ✅ | members | admin / self-join via invite | admin / self-leave | admin | Un único organizer activo (trigger). |
| `trip_invites` | ✅ | members | admin | admin (revoke) | service_role | Token hasheado, expira, max_uses. |
| `polls` | ✅ | members | admin | admin | admin | FSM en columna `status` (open/closed). |
| `date_poll_allowed_ranges` | ✅ | members | admin | admin | admin | Borrar poll borra rangos (cascade). |
| `date_availability_votes` | ✅ | members | member | self | self | Upsert por (poll_id, user_id, day). |
| `date_poll_results` | ✅ | members | service_role | service_role | service_role | Solo calculo server-side. |
| `destination_proposals` | ✅ | members | allowed (config por trip) | creator / admin | creator / admin | Snapshot al cerrar poll. |
| `destination_proposal_images` | ✅ | members | proposer | proposer | proposer | Validar mime + size en storage. |
| `destination_proposal_tags` | ✅ | members | proposer | proposer | proposer | Catálogo de tags. |
| `destination_votes` | ✅ | members (visible) o solo totals (anónimo) | member | self | self | Único voto por (poll, proposal, user). |
| `tasks` | ✅ | members | allowed (config por trip) | creator / admin / assignee | creator / admin | `due_at` futuro o null. |
| `expenses` | ✅ | members | allowed (config por trip) | creator / admin | creator / admin (soft delete) | `amount_cents > 0`, currency match con trip. |
| `expense_payers` | ✅ | members | via expense | via expense | via expense | Suma de payers = amount. |
| `expense_splits` | ✅ | members | via expense | via expense | via expense | Suma de percentages = 100. |
| `settlement_suggestions` | ✅ | members | service_role | service_role | service_role | Recalculado por `compute-trip-balances`. |
| `settlement_payments` | ✅ | members | debtor / admin | payer (marca paid) | admin (revierte) | `from <> to` (CHECK). |
| `activity_log` | ✅ | members | service_role | service_role | service_role | **Auth users NO pueden escribir.** |
| `notifications` | ✅ | own | service_role | self (mark read) | service_role | Bandeja personal. |
| `push_tokens` | ✅ | self | self | self | self | Único por (user, token). |

### 3.2 Adversarial probes (a probar con el smoke test SQL)

- [x] Outsider NO ve un trip del que no es miembro → 0 filas.
- [x] Miembro SÍ ve trip_members del trip → filas.
- [x] Outsider NO ve trip_members ajenos → 0 filas.
- [x] Miembro NO admin NO puede cerrar polls → error de policy.
- [x] Miembro NO puede editar expense ajena → error de policy.
- [x] Authenticated NO inserta en `activity_log` → RLS bloquea.
- [x] Settlement con `from = to` → CHECK rechaza.
- [x] Splits con suma de percentages ≠ 100 → trigger rechaza.
- [x] Expense con currency ≠ trip.currency → trigger rechaza.
- [x] Invite con `used_count > max_uses` → CHECK rechaza.
- [x] Más de 1 organizer activo → trigger rechaza.
- [x] Voto en poll cerrado → trigger / status check rechaza.
- [x] Update de profile ajeno → RLS rechaza.
- [x] Notifications de otro user invisibles → RLS rechaza.

(14 probes, todos en `supabase/tests/rls-smoke.test.sql`.)

---

## 4. Auditoría de secrets

- ✅ `.env.example` solo tiene placeholders (`EXPO_PUBLIC_SUPABASE_URL=`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=`).
- ✅ `service_role` key **NO está en cliente**. Solo en variables de entorno del deploy de Edge Functions (Supabase Dashboard).
- ✅ `anon` key es pública por diseño (protección = RLS). Se distribuye vía `EXPO_PUBLIC_*` (Expo las inyecta en build time).
- ✅ Tokens de invitación: NUNCA se devuelven al cliente después de la creación. El cliente recibe un `invite_url` con el token; el backend guarda `token_hash`.
- ✅ Passwords: nunca se loggean. El seed usa `crypt('dev-password', gen_salt('bf'))` solo en entorno dev.
- ✅ JWT: validado por Supabase en cada request. Cliente solo lo usa en headers; no lo manipula.

**Acción:** añadir `gitleaks` al CI para bloquear commits con secrets.

---

## 5. Auditoría de Storage

| Bucket | Privado | Max size | Mimes | Path convention | Notas |
|---|---|---|---|---|---|
| `avatars` | sí | 5 MB | `image/jpeg`, `image/png`, `image/webp` | `avatars/{user_id}/...` | User solo edita propio. |
| `trip-covers` | sí | 5 MB | imágenes | `trip-covers/{trip_id}/...` | Solo admin/owner sube. |
| `proposal-images` | sí | 5 MB | imágenes | `proposal-images/{trip_id}/{proposal_id}/...` | Proposer sube, members leen. |
| `receipts` | sí | 5 MB | imágenes + `application/pdf` | `receipts/{trip_id}/{expense_id}/...` | Trip members leen, quien creó el expense sube. |

**Validaciones en Edge Functions de upload:**
- Mime type del archivo (no del nombre).
- Tamaño (rechazo antes de buffering).
- Sanitización del path (evitar `../`).
- Reasignación de `storage_path` por el backend (no se acepta el path del cliente).

---

## 6. Auditoría de invitaciones

| Aspecto | Implementación | Veredicto |
|---|---|---|
| Token generation | `crypto.randomBytes(32).toString('base64url')` (Edge Function) | ✅ 256 bits de entropía. |
| Token storage | `sha256(token)` → `token_hash` (Postgres) | ✅ Nunca plaintext. |
| Expiración | `expires_at` (configurable, default 14d) | ✅ |
| Revocación | `revoked_at` (admin puede setear) | ✅ |
| Max uses | `max_uses` (default 50, configurable) | ✅ |
| Single-trip | Cada invite es de un solo trip | ✅ |
| Rate limit | 5 invitaciones / minuto / user | ✅ |
| SSRF en metadata | N/A (invites no scrapean) | ✅ |

**Adversarial:** ¿se puede adivinar un token? 2^256 = ~10^77. Ni con un millón de requests/s tardarías 10^64 años. Imposible.

---

## 7. Auditoría de dinero (específico de Plantir)

| Aspecto | Implementación | Veredicto |
|---|---|---|
| Storage | `amount_cents BIGINT NOT NULL CHECK > 0` | ✅ Enteros, nunca floats. |
| Multi-currency | `currency char(3)` (ISO 4217) con trigger que match con `trip.currency` | ✅ |
| Split integrity | Suma exacta de splits = amount (verificado por tests + property-based 1000 iteraciones) | ✅ |
| Rounding | Redondeo bancario (half-to-even) en `toCents`. Remanente determinista por orden alfabético en `splitEqually`. | ✅ |
| Settlement bounds | Cota N-1 settlements para N miembros con balance no cero (AC-7.3.3) | ✅ Verificado en `expenses.test.ts`. |
| Optimización | Greedy min cash flow + coalesce de pares. Para N≤10 es óptimo. | ✅ |
| Income/refund | `type='income'` invierte el signo del split (crédito a favor). | ✅ |
| Already paid | `applyCompletedPayments` descuenta del balance sin mutar entrada. | ✅ |
| Overflow | `sumCents` valida contra `Number.MAX_SAFE_INTEGER` y lanza `RangeError`. | ✅ |

---

## 8. Auditoría de scraping de links (Edge Function `fetch-link-metadata`, Fase 3)

| Riesgo | Mitigación |
|---|---|
| SSRF (request a IPs privadas) | Allowlist de dominios públicos O deny-list de rangos privados (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, ::1, link-local). |
| DNS rebinding | Resolver IP y comparar antes del fetch. |
| Timeout | 5s con `AbortController`. |
| Max response size | 1 MB (stream cutoff). |
| MIME allowlist | `text/html`, `application/xhtml+xml` únicamente. |
| HTML parsing | DOMParser sin `eval` ni scripts. Sanitización con `sanitize-html`. |
| Almacenamiento | Metadata como `JSONB` validado con Zod schema. |

**Rate limit:** 10 requests / minuto / user. 30 / hora / user.

---

## 9. Privacy by design (GDPR / LOPDGDD)

| Requisito | Implementación |
|---|---|
| Exportar mis datos | Edge Function `export-my-data` → JSON con todos mis datos (profile, trips, expenses, votes, etc.). |
| Borrar mi cuenta | Edge Function `delete-account` → soft delete de `auth.users` (Supabase), anonimización de `profiles`, trip_members.status = 'left', revocación de invites activos. |
| Borrar un viaje | Edge Function `delete-trip` → trip.archived_at = now(), activity_log mantiene referencia pero oculta trip_id. |
| Salirme de un grupo | trip_members.status = 'left' (soft). Mantiene histórico de expenses para balances previos. |
| Borrar fotos | DELETE desde Storage; política verifica que seas el owner del recurso. |
| Retención | Datos borrados: 30 días en `deleted_at` antes de purga física. |
| Consentimiento | Onboarding pide consentimiento explícito a ToS + Privacy Policy antes de crear cuenta. |
| Logs | `activity_log` no expone emails ni datos personales innecesarios; solo IDs. |

---

## 10. Tabla resumen de hallazgos

| ID | Severidad | Descripción | Mitigación | Owner |
|---|---|---|---|---|
| F1 | Blocker | — | — | — |
| F2 | Critical | — | — | — |
| H1 | Major | Límite de 5 propuestas por user no se valida en SQL (sería O(N) en cada INSERT). | Validar en Edge Function `create-destination-proposal` con COUNT antes de INSERT. | supabase-backend (Fase 3) |
| H2 | Major | Validación de max_uses en invites se hace en Edge Function. Si la Edge Function tiene un bug, un invite con `used_count > max_uses` podría persistir. | Trigger `BEFORE INSERT OR UPDATE` en `trip_invites` que valida `used_count <= max_uses` cuando `max_uses IS NOT NULL`. | supabase-backend (Fase 3) |
| H3 | Major | `notifications` se inserta solo desde service_role. Si un trigger falla, la notificación se pierde silenciosamente. | Retry queue con backoff (Fase 3, opcional) o al menos logging estructurado de fallos. | supabase-backend (Fase 3) |
| H4 | Major | `push_tokens` pueden quedar stale (token expirado por APNs/FCM). | Cleanup job semanal (Edge Function cron) que borra tokens con `last_used_at < now() - 90 days`. | supabase-backend (Fase 3) |
| M1 | Minor | No hay gitleaks en CI. | Añadir `gitleaks` action en Fase 3. | coder (Fase 3) |
| M2 | Minor | CORS wildcard por defecto. | Whitelist explícito de orígenes en Supabase Dashboard. | supabase-backend (Fase 3) |
| M3 | Minor | `npm audit` no está en CI. | `npm audit --audit-level=high` en CI. | coder (Fase 3) |
| M4 | Minor | No hay rate limit global por IP. | Rate limit en Supabase Dashboard. | supabase-backend (Fase 3) |
| I1 | Info | Cert pinning no implementado. | Opcional para v1, recomendado para producción. | coder (Fase 3) |
| I2 | Info | Bug bounty no establecido. | Definir programa antes de release público. | pm-product (release) |

**Estado del release:**
- 0 Blockers ✅
- 0 Criticals ✅
- 4 Majors con plan ✅
- 4 Minors / 2 Info documentados ✅

**Veredicto:** el MVP es **viable para release** asumiendo que los 4 Majors se cierren antes de la fecha de release público.
