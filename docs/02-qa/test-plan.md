# Plan de pruebas — Plantir

> **Documento:** `docs/02-qa/test-plan.md`
> **Fase:** 2 — Datos, Algoritmos y QA.
> **Audiencia:** `coder` (Fase 3), `qa-engineer` (este track), `verifier`, `mobile-architect`, `supabase-backend`.
> **Stack confirmado:** React Native + Expo + TypeScript strict + Supabase. Testing: Jest + ts-jest + React Native Testing Library + MSW + Maestro. Property-based: `fast-check`.
> **Convenciones:** 🔴 = caso crítico de automatización obligatoria (regresión cara / invariante financiera / riesgo legal). Cobertura en `lib/algorithms/` es la métrica más sensible del producto (balances, splits, settlements).

---

## Índice

1. [Objetivo y principios](#1-objetivo-y-principios)
2. [Pirámide de testing objetivo](#2-pirámide-de-testing-objetivo)
3. [Cobertura obligatoria por épica del MVP](#3-cobertura-obligatoria-por-épica-del-mvp)
4. [Estrategia de tests por capa](#4-estrategia-de-tests-por-capa)
5. [Catálogo de casos críticos 🔴 (automatización obligatoria)](#5-catálogo-de-casos-críticos--automatización-obligatoria)
6. [Plan de ejecución (orden, criterios de done, owners)](#6-plan-de-ejecución-orden-criterios-de-done-owners)
7. [Cobertura objetivo y umbrales de CI](#7-cobertura-objetivo-y-umbrales-de-ci)
8. [Riesgos de cobertura y mitigación](#8-riesgos-de-cobertura-y-mitigación)
9. [Configuración técnica (jest.config.js, scripts)](#9-configuración-técnica-jestconfigjs-scripts)
10. [Out of scope de este plan](#10-out-of-scope-de-este-plan)

---

## 1. Objetivo y principios

### 1.1 Objetivo

Garantizar que:

1. **El dinero se calcula bien** — los algoritmos de splits, balances y settlements son la fuente de verdad matemática del producto. Un bug aquí destruye confianza. Cobertura ≥ 95 % + property-based con 1 000+ iteraciones.
2. **La RLS no tiene huecos** — un usuario no puede leer, escribir ni modificar nada que no le corresponda. Tests adversariales automatizados por tabla.
3. **Las Edge Functions críticas son seguras** — invitaciones, scraping de links, validación de ownership de gastos. 100 % de las funciones MVP cubiertas.
4. **Los flujos críticos del MVP funcionan end-to-end** — al menos 5 escenarios E2E con Maestro pasan en iOS y Android antes de release.
5. **El comportamiento es correcto bajo condiciones adversas** — red lenta, token expirado, dispositivo offline, sesión cerrada a media operación, datos corruptos, race conditions (Realtime vs RLS).

### 1.2 Principios

- **Tests primero cuando aportan** — algoritmos puros y Edge Functions críticas se escriben en TDD estricto. Componentes UI y services: tests después del primer PR funcional.
- **Cobertura no es objetivo, es subproducto** — los tests deben ser leíbles, deterministas y rápidos. Un test que solo sube % sin probar invariantes se rechaza en review.
- **Property-based donde el espacio de entrada es grande** — `expenses.ts`, `money.ts` y `settle.ts` se prueban con `fast-check`. Tests unitarios concretos cubren los casos listados en `docs/02-briefing.md` §"Casos de prueba obligatorios".
- **Mocks herméticos** — `supabase` se mockea con `jest.mock('@/supabase/client')` o con MSW a nivel HTTP; nunca se hacen tests que toquen la red.
- **Sin flaky tests en main** — cualquier test con > 5 % de flakes en CI en 2 semanas consecutivas → bloqueado y refactorizado.
- **Realtime es observable, no testeado en unit** — la latencia y la consistencia de Realtime se cubren con tests de integración y E2E, no con unit tests.

### 1.3 Severidad de hallazgos

| Nivel | Definición | Ejemplo |
|---|---|---|
| **Blocker** | Imposibilita el release (no se puede instalar, no se puede loguear, RLS abierto). | El cliente crashea al abrir la app. |
| **Critical** | Funcionalidad core rota o pérdida de dinero. | El invariante `sum(splits) == amount` falla. |
| **Major** | Funcionalidad importante rota pero hay workaround. | El Realtime no actualiza y hay que pull-to-refresh. |
| **Minor** | Bug cosmético o de UX. | El toast no se cierra solo tras 4 s. |
| **Info** | Mejora o riesgo latente. | Un log filtra el email del usuario. |

> Para seguridad, severidades se mapean a CVSS v3.1 (ver `security-audit.md`).

---

## 2. Pirámide de testing objetivo

```
        /\
       /  \            E2E (Maestro)               5 escenarios clave
      /    \           ──────────────
     /──────\          Integration (RTL + MSW)      20-30 tests de hooks y flows
    /        \         ──────────────
   /──────────\        Component (RNTL)             Cobertura screens ≥ 70 %
  /────────────\       ──────────────
 /──────────────\      Unit (Jest + fast-check)     Cobertura algorithms ≥ 95 %
/________________\                                services/hooks ≥ 80 %
```

| Capa | Herramienta | Velocidad objetivo | Volumen objetivo | Cobertura |
|---|---|---|---|---|
| **Unit** | Jest + ts-jest | < 50 ms / test | 200-400 tests | algorithms ≥ 95 %, money 100 % |
| **Property-based** | fast-check | < 5 s / propiedad | 1 000+ iteraciones / propiedad | splitEqual, settle, formatCents |
| **Component** | React Native Testing Library | < 200 ms / test | 30-50 tests | components ≥ 80 % |
| **Integration (hooks)** | RNTL + renderHook + MSW | < 500 ms / test | 20-30 tests | hooks ≥ 80 % |
| **E2E (Maestro)** | Maestro 1.40+ | < 60 s / escenario | 5 escenarios × 2 OS | happy path 100 % |
| **Manual** | Ejecutable en device físico | — | 14 secciones del checklist | 100 % secciones pre-release |

---

## 3. Cobertura obligatoria por épica del MVP

> **Leyenda columnas Test mínimo:**
> - **U** = Unit (Jest puro, sin RN, sin Supabase mockeado).
> - **C** = Component (RNTL, render aislado).
> - **I** = Integration (hook + MSW, flujo Supabase mockeado).
> - **E** = E2E (Maestro, contra staging).
> - **M** = Manual (checklist humano pre-release).
> - 🔴 = caso crítico, automatización obligatoria en CI.

### 3.1 Épica E1 — Autenticación y cuenta

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Signup email + password | US-1.1 | I + M | 🔴 Email duplicado → 400 sin distinguir si el email existe (no enumeration) | `features/auth/hooks/useSignUp.test.ts` |
| | | | 🔴 Contraseña < 8 chars o sin número → bloquea en cliente (Zod) antes de red | idem |
| | | | 🔴 El endpoint recibe `display_name` sanitizado (trim, ≤ 80) | idem |
| Login | US-1.2 | I + M | 🔴 Credenciales incorrectas → mensaje genérico "Email o contraseña incorrectos" (no distingue email vs password) | `features/auth/hooks/useSignIn.test.ts` |
| | | | 🔴 Sesión persistida en `expo-secure-store` con key `plantir.session` | idem |
| | | | 🔴 Cold start con sesión válida → llega a `TripsHome` en < 1.5 s p95 (E2E + medir) | `.maestro/ios/auth-cold-start.yaml` |
| | | | 🔴 Token expirado → refresh silencioso; si falla, redirect a `/welcome?next=...` | idem |
| Logout | US-1.3 | I | 🔴 Logout elimina sesión de SecureStore y limpia `queryClient` | `useSignOut.test.ts` |
| Edición perfil | US-1.4 | I + M | Cambio de `display_name` se refleja en < 2 s (Realtime) | `useUpdateProfile.test.ts` |
| Avatar URL con fallback | — | C | Si la URL falla, mostrar iniciales sobre color hash de `user_id` | `Avatar.test.tsx` |

### 3.2 Épica E2 — Viajes (crear, ver, editar, cerrar)

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Crear viaje | US-2.1 | I + M | 🔴 El `Trip` se crea con `status = group_created` y el owner se inserta como `TripMember(role = organizer)` atómicamente (RPC o trigger) | `tripsService.createTrip.test.ts` |
| | | | 🔴 Nombre > 80 chars → error inline (Zod) antes de red | idem |
| | | | 🔴 Moneda no en lista ISO-4217 cerrada → bloquea submit | idem |
| Listar mis viajes | US-2.2 | I + E | 🔴 Solo se listan viajes donde el usuario es `TripMember` (test adversarial: usuario A no ve viajes de B) | `useTrips.test.ts` + `.maestro/e2e/trips-list.yaml` |
| | | | Empty state visible si 0 viajes | `TripsHome.test.tsx` |
| Editar viaje | US-2.3 | I | 🔴 Solo `organizer` puede editar; `member` recibe 403 | `tripsService.updateTrip.test.ts` |
| Cerrar viaje | US-2.4 | I + E | 🔴🔴 Backend rechaza cerrar con balances ≠ 0 con 409 `code = non_zero_balances` | `tripsService.closeTrip.test.ts` |
| | | | 🔴 Tras cerrar, el viaje aparece en sección "Archivados" y `status = closed`, `closed_at = now()` | idem |
| State machine E2-E7 | US-8.1 | U | 🔴🔴 Toda transición NO listada en `docs/01-product/prd.md` §"US-8.1" devuelve 409 `code = invalid_state_transition` (tabla completa, 9×9 casos) | `lib/state/transitions.test.ts` |

### 3.3 Épica E3 — Miembros e invitaciones

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Generar link | US-3.1 | I + M | 🔴 El token es random ≥ 128 bits vía `crypto.getRandomValues`; en DB se guarda **hash** del token, no el token plano (ver `security-audit.md` §6) | `invitesService.create.test.ts` |
| | | | 🔴 El token en claro se devuelve al owner **una sola vez** en la respuesta | idem |
| | | | 🔴 `expires_at = now() + 14d`, `max_uses = 50` | idem |
| | | | 🔴 Solo `organizer` puede generar/ver/revocar | idem |
| Aceptar link | US-3.2 | I + E | 🔴🔴 Token hash comparado con `WHERE token_hash = ?` (no comparación en claro) | `invitesService.accept.test.ts` |
| | | | 🔴🔴 Link expirado / revocado / agotado → error con copy claro, sin filtrar cuál condición falló | idem |
| | | | 🔴 Idempotente: aceptar dos veces con el mismo usuario no duplica `TripMember` (constraint `unique(trip_id, user_id)`) | idem |
| | | | 🔴 Deep link `https://app.plantir.app/invite/<token>` abre la app; si no instalada → App/Play Store | `.maestro/e2e/invite-deep-link.yaml` |
| Ver miembros | US-3.3 | I | Lista por `joined_at asc`; owner con badge | `useMembers.test.ts` |
| Salir del viaje | US-3.4 | I | 🔴 Tras `left_at`, el `Expense` pagado por el usuario sigue mostrándose con su nombre histórico; balances no se re-calculan incorrectamente | `membersService.leave.test.ts` |

### 3.4 Épica E4 — Date poll

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Abrir poll | US-4.1 | I | 🔴 Una sola `DatePoll` por `Trip` (constraint `unique(trip_id)`); owner solo puede hacerlo una vez | `pollsService.openDate.test.ts` |
| Owner propone fechas | US-4.2 | I + M | 🔴 Fechas fuera de [hoy, hoy + 18 meses] → 400 (validación backend, no solo UI) | idem |
| | | | 🔴 > 30 opciones → error | idem |
| | | | 0 opciones → botón "Listo" deshabilitado (UX, sin test crítico) | idem |
| Miembros votan | US-4.3 | I + E | 🔴🔴 Upsert en `DateVote`: cambio de voto del mismo usuario sobre la misma opción = mismo row (no duplicado) | `pollsService.voteDate.test.ts` |
| | | | 🔴 Heatmap actualiza en < 2 s vía Realtime (E2E mide) | `.maestro/e2e/poll-realtime.yaml` |
| | | | 🔴 Un miembro que NO es del trip no puede votar (RLS test) | idem |
| Owner elige fecha | US-4.4 | I | 🔴 Tras elegir, `Trip.decided_date`, `Trip.status = date_decided`, `DatePoll.closed_at = now()`; inserciones posteriores en `DateVote` → 410 | `pollsService.closeDate.test.ts` |
| Algoritmo `datePoll` | — | U + P | 🔴🔴 **Los 10 casos del briefing** + propiedad: `sum_yes desc, sum_maybe desc, date asc` | `lib/algorithms/datePoll.test.ts` + `datePoll.property.test.ts` |

### 3.5 Épica E5 — Destination poll

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Pasar a `voting_place` | US-5.1 | I | Botón visible para cualquier miembro si `status = date_decided` | `pollsService.startDestination.test.ts` |
| Proponer destinos | US-5.2 | I + M | 🔴 Límite 5 propuestas por miembro; al crear la 6ª → 400 `code = max_proposals_reached` | `pollsService.proposeDestination.test.ts` |
| | | | 🔴 `url` se valida con regex `^https?://` (Zod + backend) | idem |
| Votar 👍/👎 | US-5.3 | I + E | 🔴 Upsert; ranking `(up - down) desc, created_at asc` | `pollsService.voteDestination.test.ts` |
| Owner elige destino | US-5.4 | I | 🔴 Tras elegir, no se aceptan más propuestas; el destino aparece en `TripDashboard` con título, descripción, URL tappable y autor | `pollsService.chooseDestination.test.ts` |
| Algoritmo `destinationVoting` | — | U + P | 🔴🔴 **Los 7 casos del briefing** + propiedad: orden estable por `created_at` en empates | `lib/algorithms/destinationVoting.test.ts` |

### 3.6 Épica E6 — Gastos

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Añadir gasto (split igual) | US-6.1 | I + E | 🔴🔴🔴 **Invariante crítico**: `sum(ExpenseSplit.share_cents where included = true) == Expense.amount_cents` para CADA expense (test 100 % de los gastos creados en seed) | `expensesService.create.test.ts` + `.maestro/e2e/expense-create.yaml` |
| | | | 🔴🔴 Remanente de 1 céntimo → asignado a los primeros K miembros por orden alfabético de `display_name` | idem |
| | | | 🔴 `amount_cents > 0` (no gastos de 0 €) | idem |
| | | | 🔴 `currency` debe coincidir con `Trip.currency` (validación backend) | idem |
| Excluir miembros | US-6.2 | I + P | 🔴🔴 Recalcular shares localmente; al menos 1 miembro incluido (cliente bloquea) | `lib/algorithms/expenses/splitEqual.property.test.ts` |
| | | | 🔴 Invariante se mantiene tras excluir (property-based) | idem |
| Ver lista gastos | US-6.3 | I + E | Orden `occurred_on desc, created_at desc`; filtros server-side | `useExpenses.test.ts` + `.maestro/e2e/expense-list.yaml` |
| Editar / borrar gasto | US-6.4 | I | 🔴 Solo `created_by` o `organizer` del viaje pueden editar/borrar (RLS test adversarial) | `expensesService.update.test.ts` |
| | | | 🔴 Borrar cascadea `ExpenseSplit` (no huérfanos) | idem |
| Algoritmo `expenses` (split + settle) | — | U + P | 🔴🔴🔴 **Los 12 casos del briefing** + propiedad: `sum(balances) === 0` con 1 000+ iteraciones | `lib/algorithms/expenses.test.ts` + `expenses.property.test.ts` |
| Algoritmo `money` | — | U + P | 🔴🔴 **Los 8 casos del briefing** + propiedad: roundtrip `toCents`/`fromCents` para 10 000 valores random | `lib/algorithms/money.test.ts` + `money.property.test.ts` |

### 3.7 Épica E7 — Balances y settlements

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Ver mi balance | US-7.1 | I + E | 🔴🔴 Balance = `sum(paid_by_me) - sum(my_share)` calculado en cliente; "Estás en paz" si 0 | `useBalance.test.ts` + `.maestro/e2e/balance-view.yaml` |
| Ver todos los balances | US-7.2 | I | 🔴🔴🔴 **Invariante crítico**: `sum(member.net_balance) === 0` siempre; test con 1 000+ combinaciones random de 2-10 miembros × 1-50 gastos | `lib/algorithms/expenses.test.ts` (propiedad) |
| Ver settlements | US-7.3 | I + E | 🔴🔴🔴 Algoritmo greedy min cash flow: ≤ N-1 settlements; optimalidad testada contra brute force para N ≤ 6 | `lib/algorithms/expenses/settle.test.ts` + `settle.property.test.ts` |
| | | | 🔴 Settlement muestra formato `A → B: 23,50 €` (i18n `es-ES`) | `SettlementCard.test.tsx` |
| | | | 🔴 Tap en settlement → bottom sheet con "Copiar como texto" y "Compartir por WhatsApp" (deep link `whatsapp://send?text=...`) | `.maestro/e2e/settlement-share.yaml` |

### 3.8 Épica E8 — Estados del viaje (state machine)

| Feature | US | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|---|
| Transiciones | US-8.1 | U + I | 🔴🔴 Tabla completa 9×9: solo las 8 transiciones explícitas son válidas, las otras 73 → 409 `invalid_state_transition` | `lib/state/transitions.test.ts` |
| | | | 🔴 `ProgressStepper` refleja estado actual; estados pasados con check, futuro atenuado | `ProgressStepper.test.tsx` |

### 3.9 Transversal (RLS, Realtime, Errors, Performance, Accesibilidad)

| Concern | Test mínimo | Casos críticos 🔴 | Archivo test |
|---|---|---|---|
| **RLS por tabla** | I (SQL real contra Supabase local) | 🔴🔴🔴 1 query adversarial por tabla con usuario sin membresía esperando 0 filas; tabla completa en `security-audit.md` §5 | `supabase/rls.adversarial.test.sql` |
| **Realtime** | I + E | Latencia < 2 s en voto / gasto / miembro entrando | `supabase/realtime.test.ts` + `.maestro/e2e/realtime-latency.yaml` |
| **Errores** | U + I | 🔴 Cada `ServiceError.kind` se mapea a mensaje cálido de `constants/errorMessages.ts`; nunca se muestra `cause` al usuario | `lib/errors/presentError.test.ts` |
| **Money format** | U | 🔴 `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` para todos los renders monetarios; cero `€${n}` con `Text` | `lib/algorithms/money.test.ts` (extensión) |
| **Performance** | M (con instrumentación) | TripDashboard p95 < 1.5 s en 4G con 30 miembros × 30 gastos × 50 votos | manual checklist §13 |
| **Accesibilidad** | C + M | Todos los botones con `accessibilityLabel`; contraste AA; touch targets ≥ 44 dp | manual checklist §12 |

---

## 4. Estrategia de tests por capa

### 4.1 Unit tests — `lib/algorithms/*`

**Herramientas:** Jest 29 + ts-jest + fast-check 3.

**Reglas duras:**

- Cero imports de React, RN, Supabase, AsyncStorage, SecureStore, MMKV, `Date.now()` (usar parámetro `now: ISODateString`).
- Cero `any`. Tipos branded (`Cents`, `TripId`, `ISODateString`) obligatorios.
- Determinismo: misma entrada → misma salida. Si necesitas random, lo pasas como semilla (`seed`) y el test es reproducible.
- Helpers de fecha inyectados: `lib/algorithms/datePoll.ts` recibe `now` como argumento o usa `injectNow()`. Tests mockean `now` para casos DST.
- Cada función pura tiene al menos un test por cada rama del `switch`/`if` más profundo (cubrir todas las branches con `coveragePath: true` de Jest).

**Property-based tests obligatorios (fast-check):**

| Función | Propiedad | Iteraciones |
|---|---|---|
| `splitEqual(amount, n)` | `sum(parts) === amount` y cada `part` ∈ `[floor(amount/n), ceil(amount/n)]` | 5 000 |
| `splitByShares(amount, shares)` | `sum(parts) === amount` y `parts` proporcionales a `shares` (±1 céntimo) | 5 000 |
| `splitByPercent(amount, percents)` | `sum(parts) === amount` y `parts` proporcionales a `percents` (±1 céntimo) | 5 000 |
| `computeBalances(expenses, members)` | `sum(net) === 0` y balances acotados | 1 000 |
| `settleGreedy(balances)` | Después de aplicar settlements, todos los `net === 0`; nº settlements ≤ N-1 | 1 000 |
| `toCents` / `fromCents` roundtrip | Para `cents` ∈ [-1 000 000, 1 000 000], `fromCents(toCents(v)) === v` | 10 000 |
| `formatCents` | Output siempre contiene el símbolo de moneda y 2 decimales | 1 000 |

**Listado de tests obligatorios por archivo:**

- `lib/algorithms/money.test.ts` — los 8 casos del briefing §"money.ts".
- `lib/algorithms/datePoll.test.ts` — los 10 casos del briefing §"datePoll.ts".
- `lib/algorithms/destinationVoting.test.ts` — los 7 casos del briefing §"destinationVoting.ts".
- `lib/algorithms/expenses.test.ts` (incluye `splitEqual`, `splitByShares`, `splitByPercent`, `computeBalances`, `settleGreedy`) — los 12 casos del briefing §"expenses.ts".

### 4.2 Component tests — `src/components/**`, `src/features/*/components/**`

**Herramientas:** Jest 29 + `@testing-library/react-native` 12 + `jest-native` para matchers.

**Reglas:**

- Testear el contrato de props del `components.md`, no la implementación interna.
- Cada componente tiene tests para: (a) render con props mínimas; (b) variantes declaradas; (c) estados disabled / loading / error / empty; (d) accesibilidad (`accessibilityLabel`, `accessibilityRole`, `accessibilityState` correctos).
- Componentes con `onPress`: testear que `onPress` se invoca una vez por tap y NO se invoca cuando `disabled`.
- Componentes con `accessibilityLabel` obligatorio (ej. `IconButton`): test de tipo `expect(compile).toHaveError` con `tsd` o `expectType` con `ts-expect-error`.
- Sin snapshot tests salvo para casos muy estables (logos, iconos SVG).

**Ejemplos concretos:**

- `Button.test.tsx`: `label`, `onPress`, `variant=primary|secondary|tertiary|danger|ghost`, `size=sm|md|lg`, `loading`, `disabled`, `accessibilityLabel`, `accessibilityState.busy` cuando loading.
- `Avatar.test.tsx`: iniciales sobre color determinístico cuando `source = null`; tamaño xs/sm/md/lg/xl; `accessibilityLabel` por defecto desde `name`.
- `AvailabilityHeatmap.test.tsx`: render del heatmap, callback `onChangeCell`, `highlightBest`, scroll horizontal, sticky first column, `accessibilityRole="adjustable"` y `accessibilityActions`.
- `ProgressStepper.test.tsx`: estado actual marcado, estados pasados con check, futuro atenuado, modo `compact`.
- `Money.test.tsx`: formato `es-ES` con 2 decimales; `showSign`; lectura con screen reader (texto accesible).

### 4.3 Integration tests — `src/features/*/hooks/**`, `src/hooks/**`

**Herramientas:** Jest 29 + `@testing-library/react-native` 12 + `renderHook` + MSW 2 (Mock Service Worker) para mockear Supabase y Edge Functions a nivel HTTP.

**Reglas:**

- `useQuery` se testea con `QueryClient` fresco por test (`new QueryClient({ defaultOptions: { queries: { retry: false } } })`).
- MSW intercepta `*.supabase.co/rest/v1/*`, `*.supabase.co/functions/v1/*` y `wss://*.supabase.co/realtime/v1/*`.
- Realtime: usar el adapter `mock-realtime` de Supabase o fake WebSocket. El test verifica que al recibir un evento `INSERT/UPDATE/DELETE` en una tabla suscrita, la query se invalida.
- Errores: cada hook se prueba con respuesta 4xx (auth, forbidden, not_found, conflict, validation) y 5xx. Verificar que el `ServiceError.kind` se mapea correctamente.
- Optimistic updates: el hook de voto (date poll, destination poll, expense) verifica que el `onMutate` aplica el cambio local, que el `onError` hace rollback y que el `onSettled` invalida la query.

**Ejemplos concretos:**

- `useTrips.test.ts`:
  - Estado loading.
  - Estado success con lista de N viajes, orden por `decided_date asc nulls last, created_at desc`.
  - Estado error 403 → `ErrorState` con copy de `forbidden`.
  - Estado empty (0 viajes) → `EmptyState`.
- `useDatePoll.test.ts`:
  - Voto `yes`: optimistic update, persistencia, refetch.
  - Voto duplicado (mismo user + misma opción): upsert, no error.
  - 410 (poll cerrado): mostrar `ErrorState` con copy "El poll ya está cerrado".
  - Realtime: evento `INSERT` en `date_availability_votes` invalida query en < 1 s de simulación.
- `useBalance.test.ts`:
  - Balance 0 → "Estás en paz".
  - Balance positivo → "Te deben X €" verde.
  - Balance negativo → "Debes Y €" rojo.
  - Tras añadir expense, refetch muestra nuevo balance.
- `useInvite.test.ts`:
  - Aceptar link válido: crea `TripMember` y navega a dashboard.
  - Aceptar link expirado: 410 + copy "Este enlace ha caducado".
  - Aceptar link ya usado por el mismo user: idempotente (200, no error).

### 4.4 E2E — Maestro

**Herramientas:** Maestro 1.40+. Flujos en `.maestro/ios/*.yaml` y `.maestro/android/*.yaml`. Se corren contra staging (Supabase separado).

**Reglas:**

- Cada escenario declara `appId` explícito (iOS + Android).
- Timeouts generosos (10 s para transiciones) pero asserts estrictos.
- Idempotencia: cada escenario crea datos únicos con timestamp (`nombre-viaje-${Date.now()}`) para poder correr en paralelo.
- Sin asserts de copy exacto salvo donde el contrato lo exige (errores críticos). Preferir asserts por `testID` y `accessibilityLabel`.
- Screenshots en fallos: `maestro test --debug-output` con `recordVideo: true`.

**Los 5 escenarios clave del MVP:**

1. **Happy path completo (1 viaje, 5 miembros, 3 gastos, 1 settlement).**
   - Lucía signup → crea viaje → genera link → Sara acepta link → votan fecha (Sara yes, Marcos no, Lucía maybe) → Lucía cierra y elige fecha → proponen destinos → votan → Lucía elige destino → añaden 3 gastos (1 split igual, 1 con exclusión, 1 mixto) → ven balances → ven settlements.
   - Asserts: trip dashboard final muestra todos los datos correctos; balances cuadran; settlements ≤ 4.

2. **Realtime vote (2 dispositivos en paralelo).**
   - Lucía abre el date poll en iPhone. Marcos abre el mismo viaje en Pixel.
   - Marcos vota `yes` en la fecha 1.
   - Assert: el heatmap de Lucía refleja el cambio de Marcos en < 2 s (sin pull-to-refresh).

3. **Deep link de invitación (cold start sin sesión).**
   - Sara no tiene la app abierta. Lucía le manda link por WhatsApp simulado.
   - Sara toca el link → App Store / Play Store (o Universal Link) → instala → signup → completa join sin tener que tocar el link de nuevo.

4. **Expiración y revocación de link.**
   - Lucía genera link, marca como revocado.
   - Sara intenta usar el link.
   - Assert: pantalla de error con copy claro + CTA "Pedir nuevo link al organizador".

5. **Cerrar viaje con balances a 0 vs ≠ 0.**
   - Caso A: balances a 0 → botón "Cerrar viaje" → confirmación → viaje a "Archivados".
   - Caso B: balances pendientes → botón "Cerrar viaje" → error 409 con copy "Hay balances pendientes. Liquídalos antes de cerrar."

**Escenarios extra (no obligatorios pero recomendados):**

6. **Network intermitente** (Maestro `launchApp` + DevTools `Network conditions: offline`): trip dashboard cachea y muestra skeletons; al volver online, refetch automático.
7. **Token expirado durante un flujo**: invalidar sesión manualmente a mitad de añadir un gasto → el hook reintenta refresh; si falla, persiste el draft del form y redirige a login.
8. **Realtime con race condition**: dos miembros editan el mismo expense casi simultáneamente → la última escritura gana; ambos ven el resultado final consistente.

### 4.5 Manual — `docs/02-qa/manual-checklist.md`

Ver el checklist completo. Cubre 14 secciones con 5-15 ítems verificables por sección, en iOS y Android, con dispositivos mínimos: iPhone SE, Pixel 4a, iPad mini.

---

## 5. Catálogo de casos críticos 🔴 (automatización obligatoria)

> Estos son los tests **mínimos** que deben existir, ejecutarse en CI y pasar en cada PR. Se documentan con nombre del test (no implementación) y referencia al AC del PRD.

### 5.1 Algoritmos puros (unit + property)

```
lib/algorithms/money.test.ts
  🔴 toCentsFromCents_roundtrip_exactForRepresentable
  🔴 splitEqual_100_3_returns_33_33_34
  🔴 splitEqual_100_7_returns_14_14_14_14_14_15_15
  🔴 splitEqual_sumEqualsAmount_forAnyAmountAndN
  🔴 applyPercentage_33_33_33_34_returns_3333_3333_3334
  🔴 formatCents_12345_EUR_returnsEsESFormat
  🔴 sumOfBalances_alwaysZero
  🔴 negativeBalances_allowed
  🔴 overflow_handled_safely

lib/algorithms/datePoll.test.ts
  🔴 allYes_allDatesIncluded_maxScore
  🔴 someUsersNo_warningExcludedReturned
  🔴 requiredMemberMissing_heavyPenalty
  🔴 minAndMaxTripDays_respected
  🔴 overlappingRanges_combinedCorrectly
  🔴 tieInScore_breaksByDurationThenEarliestDate
  🔴 maybeVote_weighted_05
  🔴 preferVote_weighted_15
  🔴 pendingMembers_countedByPolicy
  🔴 singleRange_allYes_singleResult

lib/algorithms/destinationVoting.test.ts
  🔴 pureUpvotes_sortedByCount
  🔴 score1to5_averageAndOrder
  🔴 explicitRanking_preserved
  🔴 tie_breaksByPriceAscThenCapacityDesc
  🔴 anonymousVote_doesNotExposeVoter
  🔴 deletedProposal_notCounted
  🔴 duplicateVote_upserts_noDuplication

lib/algorithms/expenses.test.ts
  🔴 splitEqual_basicCase
  🔴 splitEqual_excludesPeople
  🔴 splitEqual_byExactAmounts
  🔴 splitEqual_byPercentages_handlesRounding
  🔴 splitEqual_byShares
  🔴 splitEqual_multiplePayers
  🔴 splitEqual_incomeRefund_positiveAmount
  🔴 splitEqual_settlementsAlreadyPaid_subtracted
  🔴 splitEqual_optimizedSettlements_minimalTransfers
  🔴 splitEqual_finalSumOfBalances_exactlyZero
  🔴 splitEqual_remainderOf1Cent_deterministicAlphabeticalAssignment
  🔴 splitEqual_multiCurrency_placeholderV2
  🔴 settleGreedy_noMoreThanNMinus1Settlements (property)
  🔴 settleGreedy_finalBalancesAllZero (property)
  🔴 computeBalances_sumOfNetsZero (property, 1000+ iteraciones)
```

### 5.2 RLS adversarial (integration con Supabase local)

> Una query SQL por tabla con un usuario sin membresía esperando 0 filas. Ver `security-audit.md` §5 para el detalle completo.

```
supabase/rls.adversarial.test.sql
  🔴 rls_profiles_select_own_and_tripMembersCoMembers
  🔴 rls_trips_select_onlyOwnedOrMember
  🔴 rls_tripMembers_select_onlyOwnTrips
  🔴 rls_tripInvites_select_onlyCreatorOrScoped
  🔴 rls_tripInvites_update_onlyCreator
  🔴 rls_datePolls_select_onlyTripMembers
  🔴 rls_dateOptions_select_onlyTripMembers
  🔴 rls_dateAvailabilityVotes_selectOnlyInsertOwn
  🔴 rls_destinationProposals_selectInsertOnlyTripMembers
  🔴 rls_destinationVotes_selectOnlyInsertOwn
  🔴 rls_expenses_selectOnlyTripMembers_createByMember
  🔴 rls_expenses_updateDeleteOnlyCreatorOrOrganizer
  🔴 rls_expenseSplits_selectOnlyTripMembers
  🔴 rls_settlements_selectOnlyTripMembers
  🔴 rls_tasks_selectOnlyTripMembers (v1, ya en schema)
  🔴 rls_activityLog_selectOnlyOwn
  🔴 rls_pushTokens_selectInsertUpdateDeleteOnlyOwn
  🔴 rls_storage_avatars_selectOnlyOwnBucket
  🔴 rls_storage_tripCovers_selectOnlyTripMembers
```

### 5.3 Edge Functions críticas (integration)

```
supabase/functions/__tests__/
  🔴 createInvite_returnsTokenOnceHashStored (no log del token en claro)
  🔴 acceptInvite_validatesTokenHash_notPlain
  🔴 acceptInvite_rateLimited (max 5/min por IP)
  🔴 acceptInvite_expired_returns410
  🔴 acceptInvite_revoked_returns410
  🔴 acceptInvite_maxUsesReached_returns410
  🔴 scrapeLink_ssrfProtection (no IPs internas, no localhost, no file://)
  🔴 scrapeLink_maxSize (1 MB)
  🔴 scrapeLink_timeout (5 s)
  🔴 scrapeLink_mimeAllowlist (text/html, image/*)
  🔴 scrapeLink_noScriptExecution
  🔴 closeTrip_validatesZeroBalances
  🔴 closeTrip_writesAuditLog
  🔴 exportUserData_returnsAllMyDataAsJson
  🔴 deleteAccount_anonymizesOrDeletesAllPII
```

### 5.4 E2E (Maestro)

```
.maestro/e2e/happy-path.yaml
.maestro/e2e/realtime-vote.yaml
.maestro/e2e/invite-deep-link.yaml
.maestro/e2e/invite-expired.yaml
.maestro/e2e/close-trip-zero-vs-nonzero.yaml
```

---

## 6. Plan de ejecución (orden, criterios de done, owners)

### 6.1 Orden recomendado de implementación

La regla es **de adentro hacia afuera**: primero los algoritmos puros (sin dependencias), luego los services, luego los hooks, luego los componentes, finalmente E2E. Tests en paralelo o justo antes del código (TDD).

| Fase | Tracks / sub-tareas | Dependencia | Owner | Duración estimada |
|---|---|---|---|---|
| **F2.1** | Setup Jest + ts-jest + fast-check + MSW + RNTL. `jest.config.js` con `collectCoverageFrom`, umbrales, aliases `@/*`. | — | coder + qa | 1-2 días |
| **F2.2** | Tests + implementación de `lib/algorithms/money.ts` (TDD estricto). | F2.1 | track-algorithms | 1 día |
| **F2.3** | Tests + implementación de `lib/algorithms/datePoll.ts`. | F2.1 | track-algorithms | 2 días |
| **F2.4** | Tests + implementación de `lib/algorithms/destinationVoting.ts`. | F2.1 | track-algorithms | 1-2 días |
| **F2.5** | Tests + implementación de `lib/algorithms/expenses.ts` (split + settle) + property tests. | F2.1 | track-algorithms | 3-4 días |
| **F2.6** | Tests de RLS adversariales con Supabase local + script SQL ejecutable. | F2.1 | track-backend | 2-3 días |
| **F2.7** | Tests de services (`tripsService`, `invitesService`, `expensesService`, etc.) con `jest.mock('@/supabase/client')`. | F2.1, F2.6 | track-coder (Fase 3) | 3-4 días |
| **F2.8** | Tests de hooks con MSW + renderHook. | F2.7 | track-coder | 3-4 días |
| **F2.9** | Tests de componentes puros (Button, Avatar, Money, ProgressStepper, etc.). | F2.1 | track-coder | 2-3 días |
| **F2.10** | Tests de Edge Functions críticas con Deno test runner. | F2.6 | track-backend | 2-3 días |
| **F2.11** | E2E con Maestro (5 escenarios). | F2.7, F2.8 | track-coder + qa | 2-3 días |
| **F2.12** | Configuración CI: GitHub Actions con gates de typecheck, lint, test + coverage, E2E (smoke en staging). | F2.5, F2.8 | track-devops | 1-2 días |
| **F2.13** | Manual checklist ejecutado en device físico (iPhone SE + Pixel 4a + iPad mini). | F2.11 | qa | 2 días |

**Total estimado:** 20-25 días laborables (4-5 semanas) con 1 coder + 1 qa + track-backend en paralelo.

### 6.2 Criterios de "done" por fase

**F2.1 done**:
- `npm test` corre, 0 tests, 0 fallos.
- `npm run test:coverage` genera `coverage/lcov.info` y `coverage/index.html`.
- `npm run typecheck` pasa.

**F2.2-F2.5 done** (cada algoritmo):
- Todos los tests del briefing pasan.
- Property tests pasan con las iteraciones declaradas.
- `npm test -- --coverage --collectCoverageFrom='src/lib/algorithms/**/*.ts'` muestra ≥ 95 % en cada archivo.
- `npm run lint` pasa sin warnings.

**F2.6 done**:
- Script `supabase/rls.adversarial.test.sql` ejecutable con `psql` contra `supabase start`.
- Las 19+ queries devuelven el resultado esperado (0 filas para usuarios sin acceso, error 401/403 para mutaciones no permitidas).
- Documentado en `supabase/rls.md` con la tabla de políticas y los tests que las verifican.

**F2.7-F2.10 done** (cada service / hook / edge function):
- Mock o MSW configurado.
- Tests de happy path + 4xx + 5xx + realtime.
- Cobertura ≥ 80 % en services, ≥ 80 % en hooks, 100 % en Edge Functions críticas.

**F2.11 done**:
- 5 escenarios E2E pasan en iOS Simulator (iPhone 15) y Android Emulator (Pixel 7) en CI.
- Tiempo total E2E suite < 5 minutos.

**F2.12 done**:
- PR abierto contra `main` → CI corre: typecheck + lint + unit + integration + coverage (con umbrales) + E2E (smoke).
- Si coverage global < 80 % o algorithms < 95 % → CI falla con mensaje claro.
- Si cualquier E2E falla → CI falla.

**F2.13 done**:
- `manual-checklist.md` ejecutado al 100 % en 3 dispositivos.
- 0 Blockers, 0 Criticals abiertos.
- Majors documentados con plan.

### 6.3 Owners y plazos sugeridos

| Track | Owner | Plazo |
|---|---|---|
| `lib/algorithms/*` (F2.2-F2.5) | track-algorithms | semana 1-2 |
| Setup Jest + MSW + RNTL (F2.1) | coder + qa | semana 1, día 1-2 |
| RLS migrations + adversarial tests (F2.6) | track-backend | semana 1-2 |
| Edge Functions + tests (F2.10) | track-backend | semana 2-3 |
| Services + hooks (F2.7-F2.8) | coder (Fase 3) | semana 3-4 |
| Componentes puros (F2.9) | coder | semana 3-4 |
| E2E Maestro (F2.11) | coder + qa | semana 4-5 |
| CI (F2.12) | track-devops | semana 4-5 |
| Manual checklist en device (F2.13) | qa | semana 5 |

---

## 7. Cobertura objetivo y umbrales de CI

### 7.1 Por capa

| Capa | Objetivo MVP | Objetivo v1 | Crítico |
|---|---|---|---|
| `lib/algorithms/**` | ≥ 95 % | ≥ 98 % | sí (finanzas) |
| `lib/state/**` (transitions) | 100 % (tabla 9×9) | 100 % | sí |
| `services/**` | ≥ 80 % | ≥ 90 % | sí |
| `features/*/hooks/**` | ≥ 80 % | ≥ 85 % | sí |
| `components/**` | ≥ 70 % | ≥ 80 % | no |
| `app/**` (screens) | ≥ 70 % (smoke) | ≥ 75 % | no |
| `supabase/functions/**` críticas | 100 % | 100 % | sí (seguridad) |
| `supabase/functions/**` no-críticas | ≥ 60 % | ≥ 80 % | no |
| **Global** | **≥ 80 %** | **≥ 90 %** | sí |

### 7.2 Métricas por tipo (lines, branches, functions)

| Métrica | algorithms | services | hooks | components | global |
|---|---|---|---|---|---|
| **lines** | ≥ 95 % | ≥ 80 % | ≥ 80 % | ≥ 70 % | ≥ 80 % |
| **branches** | ≥ 90 % | ≥ 75 % | ≥ 75 % | ≥ 65 % | ≥ 75 % |
| **functions** | ≥ 95 % | ≥ 80 % | ≥ 80 % | ≥ 70 % | ≥ 80 % |

### 7.3 Umbrales de CI (gates duros)

```jsonc
// jest.config.js (extracto)
{
  "coverageThreshold": {
    "./src/lib/algorithms/**/*.ts": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    },
    "./src/services/**/*.ts": {
      "branches": 75,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "./src/features/**/hooks/**/*.ts": {
      "branches": 75,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "./src/components/**/*.{ts,tsx}": {
      "branches": 65,
      "functions": 70,
      "lines": 70,
      "statements": 70
    },
    "./src/app/**/*.{ts,tsx}": {
      "branches": 60,
      "functions": 70,
      "lines": 70,
      "statements": 70
    },
    "global": {
      "branches": 75,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

Si cualquier umbral no se cumple → CI falla con mensaje señalando el archivo y la métrica.

### 7.4 Cómo se reporta en CI

- **PR check:** un comentario automático con tabla de coverage delta (líneas añadidas vs líneas cubiertas) y badge de "Coverage: 87 % (+0.3 %)".
- **Main check:** un job "coverage" falla si global < 80 % o algorithms < 95 %.
- **Trend:** `coverage/` se sube como artifact y se trackea en Codecov o similar (post-MVP).

---

## 8. Riesgos de cobertura y mitigación

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| **RC-1** | Los algoritmos puros se rompen en edge cases no contemplados (DST, leap years, sumas grandes). | Media | Critical | Property-based con `fast-check` + 1 000+ iteraciones por propiedad. Tests específicos para DST (cambio de hora en marzo/octubre) y leap year (29 feb). |
| **RC-2** | RLS queda con huecos no detectados por tests adversariales. | Media | Critical (legal) | Auditoría manual pre-release por `qa-engineer` + `supabase-backend` (ver `security-audit.md` §5). Tests adversariales con Supabase local + staging. |
| **RC-3** | Realtime introduce race conditions que solo se ven en condiciones reales. | Alta | Major | Tests E2E con 2 dispositivos en paralelo; monitoreo de Sentry en producción; feature flag para desactivar Realtime y forzar pull-to-refresh si hay regresión. |
| **RC-4** | Los E2E de Maestro son flaky por animaciones o timeouts. | Alta | Major (velocidad) | Reintentos automáticos (max 2); `visible: true` en lugar de `id:` cuando sea posible; `extendedWaitUntil: visible` en lugar de timeouts fijos. Si un test es flaky > 5 % en 2 semanas, se reescribe. |
| **RC-5** | Cobertura de screens (UI) es difícil de mantener alta sin tests frágiles. | Alta | Minor | Smoke tests por screen (render + 1 interacción + 1 assert de copy) en lugar de cobertura exhaustiva. Tests profundos en componentes puros. |
| **RC-6** | `formatCents` con locale de dispositivo distinto a `es-ES` produce resultados inesperados. | Media | Major | Forzar `Intl.NumberFormat('es-ES')` en `lib/algorithms/money.ts` (constante). Test verifica invariante: formato siempre `es-ES` independiente del locale del sistema. |
| **RC-7** | Los property tests encuentran bugs reales que se arreglan sin entender la causa raíz. | Media | Major | Prohibido `expect(true).toBe(true)` para "silenciar" un property que falla. Cada fallo se investiga, se documenta con un issue y se arregla el algoritmo o se ajusta la propiedad. |
| **RC-8** | Tests E2E son lentos y bloquean iteración. | Media | Major | E2E solo corre en PRs contra `main` o bajo label `run-e2e` (manual). PRs a feature branches solo corren unit + integration + coverage. Suite E2E < 5 min. |
| **RC-9** | Mocks de Supabase no reflejan comportamiento real (RLS, triggers, realtime). | Alta | Critical | Usar MSW a nivel HTTP para integración (más fiel). Para RLS y triggers, tests SQL contra `supabase start` (F2.6). Nunca confiar en `jest.mock` para lógica de DB. |
| **RC-10** | `fast-check` genera casos que no se ajustan al dominio (ej. expenses con `amount = 0`). | Media | Major | Usar `fc.integer({ min: 1, max: 1_000_000 })` para amounts; nunca `min: 0`. Filtros `fc.pre(...)` para descartar casos degenerados antes de la assertion. |
| **RC-11** | Tests de accesibilidad no se automatizan y se olvidan. | Alta | Major (inclusión) | Lint con `eslint-plugin-jsx-a11y` activado. Tests E2E verifican `accessibilityLabel` en flows críticos. Manual checklist obligatorio. |
| **RC-12** | Cambios en el PRD no actualizan los tests. | Media | Major | Code review verifica que un cambio en el PRD (nuevo AC) viene con su test. `verifier` audita la cobertura de los ACs antes de release. |

---

## 9. Configuración técnica (jest.config.js, scripts)

### 9.1 `jest.config.js` (esqueleto)

```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/lib/algorithms/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/features/**/hooks/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    'src/app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/index.ts', // barrels
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  // umbrales definidos en §7.3
  // workers paralelos
  maxWorkers: '50%',
};
```

### 9.2 `jest.setup.ts`

```ts
// jest.setup.ts
import '@testing-library/react-native/extend-expect';

// silence noisy logs en tests
jest.spyOn(console, 'warn').mockImplementation(() => {});

// mock para SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// MSW server (integration tests)
import { server } from './src/test/msw/server';
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 9.3 Scripts `package.json`

```jsonc
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:algorithms": "jest src/lib/algorithms",
    "test:algorithms:property": "jest src/lib/algorithms --testNamePattern=Property",
    "test:integration": "jest src/features src/services",
    "test:components": "jest src/components src/app",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:e2e:ios": "maestro test .maestro/ios",
    "test:e2e:android": "maestro test .maestro/android",
    "test:e2e:all": "npm run test:e2e:ios && npm run test:e2e:android",
    "supabase:start": "supabase start",
    "supabase:rls:test": "psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/rls.adversarial.test.sql",
    "supabase:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/supabase/types.gen.ts"
  }
}
```

### 9.4 `__mocks__/fileMock.js`

```js
module.exports = 'test-file-stub';
```

---

## 10. Out of scope de este plan

- **Auditoría de seguridad** — cubierta en `docs/02-qa/security-audit.md`.
- **Manual checklist pre-release** — cubierta en `docs/02-qa/manual-checklist.md`.
- **Reporte de cobertura esperada** — cubierta en `docs/02-qa/coverage-report.md`.
- **Estrategia de tests E2E más allá de Maestro** — Maestro es la decisión MVP. v1 puede evaluar Detox o Appium si se ve fricción.
- **Performance testing automatizado** — en MVP se hace manual con la sección 13 del checklist. v1 puede añadir k6 / Lighthouse CI para load testing del backend.
- **Mutation testing** — v1+, con Stryker.
- **Visual regression** — v1+, con Percy o Chromatic.
- **Contract testing** (Pact) entre cliente y Edge Functions — v1+.
- **Load testing** de Edge Functions — v1+ con k6 o Artillery.

---

**Fin del test-plan v1.0.**
