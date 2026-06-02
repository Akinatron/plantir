# Briefing compartido — Fase 3: Scaffold Expo + Servicios + Edge Functions

> Base común para los tracks de la Fase 3. Léelo entero antes de empezar.

## Lo que ya está hecho

- **Fase 1:** PRD (1.049 líneas), UX flows, design system, componentes, arquitectura móvil, contratos TS en `src/types/index.ts`.
- **Fase 2:** 17 migraciones SQL, 4 módulos de algoritmos puros con 61 tests pasando, typeScript strict, QA docs (test-plan, manual-checklist, security-audit, coverage-report).

## Objetivo de Fase 3

Construir el esqueleto completo de la app Expo + TypeScript + Expo Router con las pantallas y servicios principales, y las Edge Functions de Supabase. Al terminar esta fase, la app debe ser capaz de correr en un simulador, autenticarse, crear un viaje, votar fechas, proponer destinos, registrar gastos y mostrar balances.

## Stack confirmado (no se debate)

- **Mobile:** Expo SDK 51+ con TypeScript strict, Expo Router (file-based routing), TanStack Query, Zustand, React Hook Form + Zod, date-fns, NativeWind v4 (decisión de Fase 1).
- **Backend en cliente:** `@supabase/supabase-js` con el cliente generado.
- **Edge Functions:** Deno/TypeScript, Zod para validación, deploy vía Supabase CLI.
- **Money:** SIEMPRE `Cents` (integer), nunca float.
- **Fechas:** SIEMPRE `ISODateString` (UTC ISO-8601 string), nunca `Date` mutable.

## Convenciones duras

- Idioma: español en docs y comentarios. Identificadores, paths y código en inglés.
- TypeScript strict, cero `any` salvo justificación documentada con `// eslint-disable-next-line @typescript-eslint/no-explicit-any`.
- ESLint + Prettier configurados. Cero warnings en CI.
- Componentes UI: SOLO desde el inventario de `docs/01-ux/components.md`. Si necesitas uno nuevo, lo creas siguiendo el mismo contrato.
- Tokens: SOLO desde `tailwind.config.js` con los valores del design system. Cero valores hardcoded en componentes.
- Servicios: cada `xxxService.ts` expone funciones tipadas con `ServiceResult<T>` (no `throw`, devuelve `{ data, error }`).
- Edge Functions: cada una con Zod schema de input/output, manejo de errores tipado, logging estructurado.
- Tests: unit con Jest + RTL, integration con MSW mockeando Supabase. E2E con Maestro para happy paths del MVP.

## Estructura de carpetas esperada

```
plantir/
├── app/                            # Expo Router
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── trips.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── invite/[token].tsx
│   └── trips/
│       ├── create.tsx
│       ├── [tripId]/
│       │   ├── index.tsx
│       │   ├── members.tsx
│       │   ├── invite.tsx
│       │   ├── settings.tsx
│       │   ├── date-poll/
│       │   │   ├── setup.tsx
│       │   │   ├── vote.tsx
│       │   │   └── results.tsx
│       │   ├── destination/
│       │   │   ├── setup.tsx
│       │   │   ├── proposals.tsx
│       │   │   ├── create.tsx
│       │   │   ├── [proposalId].tsx
│       │   │   └── results.tsx
│       │   ├── plan.tsx
│       │   ├── tasks.tsx
│       │   └── expenses/
│       │       ├── index.tsx
│       │       ├── create.tsx
│       │       ├── [expenseId].tsx
│       │       ├── balances.tsx
│       │       └── settlements.tsx
│   └── +not-found.tsx
├── src/
│   ├── components/                 # UI primitives (Button, Card, etc.)
│   ├── features/                   # feature-specific composition
│   │   ├── auth/
│   │   ├── trips/
│   │   ├── polls/
│   │   ├── expenses/
│   │   └── members/
│   ├── hooks/                      # cross-cutting hooks
│   ├── lib/                        # utilities
│   │   ├── algorithms/             # already done in Phase 2
│   │   ├── supabase/               # client + types
│   │   ├── validation/             # Zod schemas
│   │   └── format/                 # date / money / text formatters
│   ├── services/                   # data layer (talks to Supabase)
│   │   ├── auth.service.ts
│   │   ├── trips.service.ts
│   │   ├── members.service.ts
│   │   ├── invites.service.ts
│   │   ├── polls.service.ts
│   │   ├── proposals.service.ts
│   │   ├── expenses.service.ts
│   │   └── storage.service.ts
│   ├── stores/                     # Zustand stores
│   │   ├── session.store.ts
│   │   └── ui.store.ts
│   ├── theme/                      # tokens
│   ├── types/                      # already done
│   └── constants/
├── supabase/
│   ├── functions/                  # Edge Functions (Deno/TS)
│   │   ├── _shared/                # shared utilities (cors, supabase client, errors)
│   │   │   ├── cors.ts
│   │   │   ├── supabase-admin.ts
│   │   │   ├── zod-error.ts
│   │   │   └── logger.ts
│   │   ├── create-trip-invite/
│   │   ├── accept-trip-invite/
│   │   ├── fetch-link-metadata/
│   │   ├── compute-date-poll-results/
│   │   ├── close-date-poll/
│   │   ├── compute-destination-results/
│   │   ├── close-destination-poll/
│   │   ├── compute-trip-balances/
│   │   ├── mark-settlement-paid/
│   │   ├── send-trip-notification/
│   │   ├── export-my-data/
│   │   └── delete-account/
│   ├── migrations/                 # already done in Phase 2
│   ├── rls.md
│   ├── README.md
│   └── tests/
├── assets/                         # fonts, icons, splash
├── app.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── README.md
└── CHANGELOG.md
```

## Las 10 Edge Functions obligatorias (PRD §7)

1. `create-trip-invite` — input: `{ tripId, expiresAt?, maxUses? }`, output: `{ inviteUrl, token, expiresAt }`. Crea token seguro (32 bytes), guarda hash, devuelve solo una vez.
2. `accept-trip-invite` — input: `{ token }`, output: `{ tripId, memberId }` o error de validación.
3. `fetch-link-metadata` — input: `{ url }`, output: `{ title, description, image, domain, favicon? }`. SSRF protection obligatoria.
4. `compute-date-poll-results` — input: `{ pollId }`, output: array de candidatos rankeados. Ejecuta el algoritmo de Fase 2.
5. `close-date-poll` — input: `{ pollId, selectedResultId }`, output: `{ trip: Trip, poll: Poll }`. Cierra poll, fija trip.startDate/endDate.
6. `compute-destination-results` — input: `{ pollId }`, output: array de propuestas rankeadas. Ejecuta el algoritmo de Fase 2.
7. `close-destination-poll` — input: `{ pollId, selectedProposalId }`, output: `{ trip: Trip, poll: Poll, proposal: DestinationProposal }`. Cierra poll, fija trip.destinationProposalId.
8. `compute-trip-balances` — input: `{ tripId }`, output: `{ balances: MemberBalance[], settlements: Settlement[] }`. Llama a los algoritmos de Fase 2 server-side.
9. `mark-settlement-paid` — input: `{ settlementId, fromMemberId, toMemberId, amountCents, currency }`, output: `{ payment: SettlementPayment }`. Crea payment, actualiza balances.
10. `send-trip-notification` — internal, input: `{ userId, tripId?, type, title, body, metadata? }`, output: `{ notificationId }`. Trigger-based o cron.

## Patrones clave

### ServiceResult

```typescript
export type ServiceResult<T> = { data: T; error: null } | { data: null; error: ServiceError };

export interface ServiceError {
  code: 'unauthorized' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'network' | 'unknown';
  message: string;
  details?: unknown;
}
```

### Hook de query tipado

```typescript
export function useTrip(tripId: TripId) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsService.getById(tripId),
    enabled: !!tripId,
  });
}
```

### Edge Function boilerplate

```typescript
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const Input = z.object({ ... });
const Output = z.object({ ... });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = Input.parse(await req.json());
    // ... business logic
    return new Response(JSON.stringify(Output.parse(result)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return errorResponse(err);
  }
});
```

## Lo que NO se hace en Fase 3

- No se montan los Edge Functions en Supabase Cloud (eso es CI/CD de Fase 4).
- No se hace EAS Build (eso es Fase 4 con EAS).
- No se publica en App Store / Play Store.
- No se añade CI/CD completo en GitHub Actions (eso es Fase 4).
- No se añaden features nuevas más allá del MVP (lo que está en el PRD como "out of MVP" se queda out).

## Salidas esperadas Fase 3

1. `npx expo start` arranca la app en modo dev. Login → home → trip dashboard → polls → expenses funciona end-to-end con Supabase local.
2. Las 10 Edge Functions deployables vía `supabase functions deploy <nombre>`.
3. `npm test` exit 0 con cobertura ≥80% global y ≥95% en algoritmos.
4. `npx tsc --noEmit` exit 0.
5. `npx expo-doctor` sin errores críticos.
6. Smoke test RLS ejecutable y pasando.

## Stop conditions (entregable listo)

- La app arranca sin errores en el simulador.
- Auth flow funciona (signup con magic link, login, logout).
- Crear viaje, invitar, unirse, votar fechas, votar sitio, añadir gasto, ver balances, ver settlements — todo navegable y con datos reales de Supabase local.
- Cada Edge Function tiene su test de integración.
- README actualizado con instrucciones para correr todo local.
