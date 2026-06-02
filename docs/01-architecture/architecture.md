# Arquitectura móvil — Plantir

> **Stack confirmado** (briefing, no se debate en Fase 1): React Native + Expo + TypeScript strict + Expo Router + React Hook Form + Zod + TanStack Query + Zustand + date-fns. Backend: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). Money siempre en **integer cents**.

Este documento define la **arquitectura objetivo** de la app Plantir: capas, módulos, navegación, gestión de estado, auth, errores, configuración de TypeScript, scripts npm y patrón de servicios. Lo complementario (justificación de cada librería) está en [`tech-decisions.md`](./tech-decisions.md).

---

## 1. Diagrama de capas

La app tiene **5 capas** con dependencias unidireccionales hacia abajo. Una capa nunca importa de una capa superior.

```
+---------------------------------------------------------------+
|  L5  UI  (screens en src/app/**)                              |
|       - file-based routes de Expo Router                     |
|       - solo compone componentes y hooks                     |
|       - sin acceso directo a Supabase                         |
+---------------------------------------------------------------+
                          |  usa
                          v
+---------------------------------------------------------------+
|  L4  Components  (src/components/ + src/features/*/components)|
|       - presentacionales, sin lógica de negocio               |
|       - reciben props tipadas (contratos en src/types)        |
|       - gestionan su propio loading/empty/error visual        |
+---------------------------------------------------------------+
                          |  usa
                          v
+---------------------------------------------------------------+
|  L3  Hooks  (src/features/*/hooks + src/hooks)                |
|       - orquesta TanStack Query (server state)                |
|       - orquesta Zustand (UI state)                           |
|       - expone una API tipada por feature                     |
|       - sin tocar JSX de UI directamente                      |
+---------------------------------------------------------------+
                          |  usa
                          v
+---------------------------------------------------------------+
|  L2  Services  (src/services/* + src/features/*/services)     |
|       - única capa que habla con Supabase / Edge Functions    |
|       - funciones puras, tipadas, sin estado                  |
|       - devuelven tipos del dominio (src/types)               |
|       - nunca lanzan UI, propagan errores tipados             |
+---------------------------------------------------------------+
                          |  usa
                          v
+---------------------------------------------------------------+
|  L1  Supabase client  (src/supabase/)                         |
|       - cliente generado (supabase-js) + tipos generados      |
|       - configurado con SecureStore para tokens               |
|       - helper de realtime (canales tipados)                  |
+---------------------------------------------------------------+

        ----- Capa transversal (no es capa de flujo) -----
        src/lib/algorithms  → funciones PURAS (datePoll, expenses...)
        src/lib/dates       → helpers de fecha (TZ, formato)
        src/lib/validation  → schemas Zod (compartidos con RHF)
        src/types           → contratos TypeScript del dominio
        src/constants       → enums, magic numbers, strings i18n
        src/stores          → Zustand stores globales
```

**Reglas de dependencia**:

- `app/` solo importa de: `components/`, `features/*/components`, `features/*/hooks`, `hooks/`, `stores/`, `lib/`, `types/`, `constants/`.
- `features/*/hooks` importa de: `services/`, `features/*/services`, `stores/`, `lib/`, `types/`.
- `services/` y `features/*/services` importan de: `supabase/`, `lib/`, `types/`.
- `supabase/` no importa de **nada** del proyecto salvo `lib/` y `types/`.
- `lib/` es **puro** (no React, no Supabase, no I/O). 100% testeable sin red.
- `components/` y `features/*/components` no importan de `services/`.

---

## 2. Estructura de carpetas

Estructura **real** que se crea en este entregable (los directorios vacíos se dejan listos para Fase 3). El detalle por feature vive dentro de `src/features/<feature>/`; los servicios **globales** (los que orquestan más de una feature) viven en `src/services/`.

```
Plantir/
├─ app.config.ts                       # Expo config (plugins, scheme, bundle id)
├─ eas.json                            # EAS Build/Submit profiles
├─ metro.config.js                     # Metro + NativeWind (si aplica)
├─ babel.config.js                     # preset expo + reanimated (si aplica)
├─ tailwind.config.js                  # NativeWind preset
├─ global.css                          # directivas @tailwind
├─ tsconfig.json                       # strict + path alias @/*
├─ package.json                        # scripts y deps justificadas
├─ .eslintrc.cjs                       # @plantir/eslint-config
├─ .prettierrc                         # formato
├─ .env.example                        # EXPO_PUBLIC_SUPABASE_URL/ANON_KEY
├─ docs/
│  └─ 01-architecture/
│     ├─ architecture.md               # este archivo
│     └─ tech-decisions.md             # decisiones D/R/A/R/M
└─ src/
   ├─ app/                             # Expo Router file-based routes
   │  ├─ _layout.tsx                   # root layout (providers)
   │  ├─ index.tsx                     # redirect a (auth) o (app)
   │  ├─ (auth)/
   │  │  ├─ _layout.tsx                # stack de auth
   │  │  ├─ welcome.tsx
   │  │  ├─ login.tsx
   │  │  ├─ signup.tsx
   │  │  └─ callback.tsx               # OAuth callback
   │  ├─ (app)/
   │  │  ├─ _layout.tsx                # tabs + auth guard
   │  │  ├─ trips/
   │  │  │  ├─ index.tsx               # trips home
   │  │  │  ├─ new.tsx                 # crear viaje
   │  │  │  └─ [tripId]/
   │  │  │     ├─ _layout.tsx          # trip layout (context)
   │  │  │     ├─ index.tsx            # trip dashboard
   │  │  │     ├─ invite.tsx           # invitar miembros
   │  │  │     ├─ polls/
   │  │  │     │  ├─ dates.tsx         # date poll (setup+vote)
   │  │  │     │  └─ destination.tsx   # destination poll
   │  │  │     └─ expenses/
   │  │  │        ├─ index.tsx         # lista
   │  │  │        ├─ new.tsx           # crear
   │  │  │        ├─ [expenseId].tsx   # detalle
   │  │  │        ├─ balances.tsx      # balances
   │  │  │        └─ settlements.tsx   # settlements
   │  │  ├─ profile.tsx
   │  │  └─ notifications.tsx
   │  └─ +not-found.tsx
   │
   ├─ components/                      # reutilizables globales
   │  ├─ Button/
   │  ├─ Card/
   │  ├─ Avatar/
   │  ├─ AvatarStack/
   │  ├─ TextField/
   │  ├─ Select/
   │  ├─ DatePicker/
   │  ├─ ProgressStepper/              # 9 estados del viaje
   │  ├─ EmptyState/
   │  ├─ ErrorState/
   │  ├─ LoadingState/
   │  ├─ Screen/                       # SafeArea + keyboard
   │  └─ index.ts                      # barrel
   │
   ├─ features/                        # una carpeta por feature
   │  ├─ trips/
   │  │  ├─ components/                # TripCard, TripHeader, MemberList...
   │  │  ├─ hooks/                     # useTrips, useTrip, useTripMutations
   │  │  └─ services/                  # tripsService (si es solo-feature)
   │  ├─ polls/
   │  │  ├─ components/                # AvailabilityHeatmap, ProposalCard...
   │  │  ├─ hooks/                     # useDatePoll, useDestinationPoll
   │  │  └─ services/                  # pollsService
   │  ├─ expenses/
   │  │  ├─ components/                # ExpenseRow, BalanceBar...
   │  │  ├─ hooks/                     # useExpenses, useBalances, useSettlements
   │  │  └─ services/                  # expensesService
   │  ├─ invites/
   │  │  ├─ components/
   │  │  └─ hooks/                     # useInvite
   │  ├─ auth/
   │  │  ├─ components/
   │  │  └─ hooks/                     # useSession, useSignIn...
   │  └─ profile/
   │     ├─ components/
   │     └─ hooks/
   │
   ├─ services/                        # servicios globales / cross-feature
   │  ├─ tripsService.ts               # CRUD de viajes (cross-cutting)
   │  ├─ membersService.ts
   │  ├─ invitesService.ts             # incluye accept por deep link
   │  └─ supabaseFunctions.ts          # wrapper tipado de Edge Functions
   │
   ├─ lib/                             # utilidades PURAS
   │  ├─ algorithms/
   │  │  ├─ datePoll.ts                # calcula "fechas ganadoras"
   │  │  ├─ destinationVoting.ts       # Borda / mayoría / veto
   │  │  ├─ expenses/
   │  │  │  ├─ splitEqual.ts
   │  │  │  ├─ splitByShares.ts
   │  │  │  ├─ splitByPercent.ts
   │  │  │  └─ settle.ts               # algoritmo minimiza transferencias
   │  │  └─ money.ts                   # cents <-> display
   │  ├─ dates/
   │  │  ├─ format.ts
   │  │  ├─ parse.ts
   │  │  └─ timezone.ts                # helpers TZ-safe
   │  ├─ validation/                   # Zod schemas reutilizables
   │  │  ├─ trip.ts
   │  │  ├─ poll.ts
   │  │  └─ expense.ts
   │  ├─ logger.ts                     # logger estructurado (Sentry-aware)
   │  └─ env.ts                        # valida EXPO_PUBLIC_* en arranque
   │
   ├─ stores/                          # Zustand stores globales
   │  ├─ sessionStore.ts               # user, session, hydrated
   │  ├─ uiStore.ts                    # tema, idioma, tipografía escala
   │  └─ tripDraftStore.ts             # borrador de crear viaje
   │
   ├─ types/                           # contratos TypeScript del dominio
   │  └─ index.ts                      # exporta Trip, Expense, etc.
   │
   ├─ constants/
   │  ├─ tripStates.ts                 # enum de 9 estados
   │  ├─ queryKeys.ts                  # keys de TanStack Query centralizadas
   │  └─ routes.ts                     # nombres de rutas (deep link)
   │
   └─ supabase/
      ├─ client.ts                     # createClient + SecureStore
      ├─ types.gen.ts                  # generado por `supabase gen types`
      └─ realtime.ts                   # helper tipado de canales
```

**Por qué `features/*` Y `services/`**: `services/` es la **capa de datos** canónica (fácil de mockear en tests, fácil de razonar sobre contratos). `features/*/services/` existe solo para servicios que **solo se usan dentro de esa feature** y se mueven a `services/` cuando una segunda feature los necesita.

---

## 3. Navegación — Expo Router

### File-based routes

Todo vive en `src/app/`. El root `app/_layout.tsx` monta providers en este orden estricto:

```
<ErrorBoundary>
  <SafeAreaProvider>
    <QueryClientProvider>
      <SupabaseProvider>
        <ThemeProvider>
          <AuthGuard>           ← decide (auth) vs (app)
            <Slot />
          </AuthGuard>
        </ThemeProvider>
      </SupabaseProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
</ErrorBoundary>
```

### Grupos de rutas

- `(auth)` — stack de autenticación. Sin tabs. Acceso libre.
- `(app)` — stack con tabs (Trips, Profile, Notifications). Protegido por `AuthGuard` (redirige a `(auth)` si no hay sesión).
- `trips/[tripId]/_layout.tsx` — layout por viaje, provee `useTrip(tripId)` como context para que las pantallas hijas no dupliquen fetch.

### Deep links (invitaciones)

- **Scheme**: `plantir://`
- **Universal Links (iOS)** y **App Links (Android)**: `https://app.plantir.app/invite/<token>`
- Configurados en `app.config.ts`:
  ```ts
  scheme: ['plantir', 'https'],
  web: { bundler: 'metro' },
  ios: { associatedDomains: ['applinks:app.plantir.app'] },
  android: { intentFilters: [{ action: 'VIEW', data: [{ scheme: 'https', host: 'app.plantir.app' }] }] },
  ```
- Routing de deep link: `app/invite/[token].tsx` valida el token vía `invitesService.acceptInvite`, redirige a `(auth)/login` si no hay sesión (preservando el `?next=/invite/<token>`), y a `(app)/trips/<tripId>` si la hay.
- Constantes de ruta en `src/constants/routes.ts` para evitar strings sueltos.

### Navegación programática

Se usa siempre `useRouter()` y `router.push(Href)` con un helper `routes.invitePath(token)` para que TypeScript verifique la ruta. **Prohibido** `Linking.openURL` para navegación interna.

---

## 4. Estrategia de estado

| Capa | Librería | Qué vive aquí |
|---|---|---|
| **Server state** | TanStack Query v5 | Datos que viven en Supabase: trips, members, polls, expenses, settlements. Caché, revalidación, retries, optimistic updates, realtime. |
| **Local state** | Zustand | Sesión user, tema, idioma, borrador de viaje, filtros UI, "is bottom sheet open". |
| **Form state** | React Hook Form + Zod | Inputs. Sin estado en Zustand para forms. |
| **URL state** | `useLocalSearchParams` (Expo Router) | Filtros persistentes (ej. `?tab=balances`). |
| **Server cache del cliente** | TanStack Query + persistor (MMKV) | Hidratar queries offline-friendly. |

### Reglas

- **Server state SIEMPRE** vía TanStack Query (`useQuery` / `useMutation`). Los hooks `useTrips()`, `useTrip(id)`, etc. **internamente** llaman a `tripsService.getAll()` y exponen `{ data, error, isLoading }`. Las screens **nunca** llaman a un service directamente.
- **Local state** que sobrevive a un unmount → Zustand. Estado de componente efímero → `useState`. Estado de un form → RHF.
- **Mutaciones** usan `useMutation` con `onMutate` para optimistic update cuando aplica (votar, añadir expense), y `onError` que revierte + muestra toast.
- **Realtime**: las queries se sincronizan con Supabase Realtime vía `invalidateQueries` cuando llega un evento (ver §6 Realtime).

Justificación detallada en [`tech-decisions.md`](./tech-decisions.md#1-server-state).

---

## 5. Auth en cliente

### Stack

- `supabase-js` con `@supabase/ssr` deshabilitado (no aplica) y `expo-secure-store` como storage adapter.
- Sesión persistida en `SecureStore` (Keychain en iOS, Keystore en Android).
- **Refresh**: `@supabase/supabase-js` gestiona el refresh automáticamente (el cliente lo hace al detectar `expires_at < now`).
- **PKCE flow** (no implicit). Login/signup con email+password en MVP; OAuth (Google/Apple) en v1.

### Inicialización

`src/supabase/client.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from './types.gen';

const ExpoSecureStoreAdapter = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN: lo gestionamos a mano
    },
  }
);
```

### Sesión en estado

- `src/stores/sessionStore.ts` (Zustand) mantiene `user`, `session`, `isHydrated`.
- Hook `src/features/auth/hooks/useSession.ts` suscribe a `supabase.auth.onAuthStateChange` y actualiza el store.
- `AuthGuard` (en `app/(app)/_layout.tsx`) lee del store; si `!isHydrated` muestra splash, si `!user` redirige a `(auth)`.

### Refresh

- `autoRefreshToken: true` → el cliente refresca antes de cada expiry.
- `onAuthStateChange('TOKEN_REFRESHED')` actualiza el store silenciosamente.
- Si el refresh falla (revocado/expirado) → `signOut()` + redirect a `(auth)/login`.

### Logout

- `supabase.auth.signOut()` limpia SecureStore, store y `queryClient.clear()`.
- `router.replace('/(auth)/login')`.

### Edge cases

- **Cold start sin red**: `getSession()` lee de SecureStore → usuario "logueado offline" hasta que el primer request falle con 401 → refresca.
- **Cambio de contraseña en otro dispositivo**: el `TOKEN_REFRESHED` en este cliente NO ocurre. El siguiente request 401 lo detecta y desloguea.

---

## 6. Realtime

### Regla

Realtime se usa **solo para sincronizar cache** de TanStack Query. La fuente de verdad sigue siendo Postgres + RLS. Un insert/update/delete en el servidor → evento Supabase → `queryClient.invalidateQueries(...)` → refetch.

### Suscripciones por tabla

| Tabla | Suscripción cliente | Filtro RLS | Notas |
|---|---|---|---|
| `trips` | sí | `trip_members.user_id = auth.uid()` | Solo cambios de trips del usuario |
| `trip_members` | sí | idem | Cuando alguien entra/sale del grupo |
| `polls` | sí | idem | Estado del poll |
| `date_availability_votes` | sí | idem | Heatmap se actualiza en vivo |
| `destination_proposals` | sí | idem | Lista de propuestas |
| `destination_votes` | sí | idem | Conteos en vivo |
| `expenses` | sí | idem | Lista de gastos |
| `expense_splits` | sí | idem | Balances en vivo |
| `settlements` | sí | idem | Cierre de cuentas |
| `trip_invites` | no (cliente) | idem | Solo se consume vía deep link o fetch puntual |
| `tasks` (v1) | sí | idem | Habilitado en v1 |

### Implementación

`src/supabase/realtime.ts` expone `subscribeToTrip(tripId, queryClient)` que monta un canal con filtro `trip_id=eq.<id>` para todas las tablas de arriba y mapea evento → `queryKeys` a invalidar. Se monta en `app/(app)/trips/[tripId]/_layout.tsx` y se desmonta al salir.

### Anti-patrones prohibidos

- ❌ Pintar UI directamente desde el evento realtime.
- ❌ Suscribirse a `SELECT *` sin filtro (mataría batería y RLS).
- ❌ Usar realtime como "única fuente" (reconexiones, eventos perdidos).

---

## 7. Manejo de errores

### Capas

1. **Service** → captura `PostgrestError` / `FunctionsFetchError` / `Error` y los **transforma** a un tipo del dominio: `type ServiceError = { kind: 'network' | 'auth' | 'forbidden' | 'not_found' | 'validation' | 'server' | 'unknown'; message: string; cause?: unknown }`. **Nunca** lanza `Error` plano.
2. **Hook (TanStack Query)** → recibe el `ServiceError` y lo expone en `error: ServiceError | null`. Configura `retry: (count, err) => err.kind === 'network' && count < 2`.
3. **Screen** → usa `<ErrorState error={...} onRetry={refetch} />`. **Nunca** muestra `error.message` crudo.
4. **Boundary global** → `ErrorBoundary` en `app/_layout.tsx` captura crashes de React y reporta a Sentry.

### Telemetría mínima

- `src/lib/logger.ts` envuelve `console.*` + Sentry. En dev: `console.debug`. En prod: `Sentry.captureException` + `console.warn` solo si es nuevo.
- Cada `ServiceError` se loguea **con su `kind` y `cause`**, nunca con stack de usuario.
- Eventos de negocio clave (`trip_created`, `poll_closed`, `expense_added`) se trackean con `logger.event(name, props)` para alimentar métricas (North Star: settled payments / MAU).

### Mensajes al usuario

- Catálogo en `src/constants/errorMessages.ts` con mensajes cálidos y tuteo (ej. `forbidden: 'No puedes ver este viaje. Pide al organizador que te invite.'`).
- El mapeo `ServiceError.kind → message` vive en `src/lib/errors/presentError.ts`.

### Retries

- Network: hasta 2 con backoff exponencial (default de TanStack Query).
- 5xx: 1 retry.
- 4xx: 0 retries.
- 401: NO retry. Forzar refresh y, si sigue 401, sign out.

---

## 8. Configuración TypeScript (strict)

`tsconfig.json` (resumen de flags):

```jsonc
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "useUnknownInCatchVariables": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "jsx": "react-native",
    "isolatedModules": true,
    "resolveJsonModule": true,
    "paths": { "@/*": ["./src/*"] },
    "baseUrl": "."
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "dist", "build", ".expo"]
}
```

**Política de `any`**: prohibido. Si necesitas un `any`, lo justificas con `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + comentario + issue. Alternativas: `unknown` + narrowing, genéricos, o tipos generados. Detalle en [`tech-decisions.md`](./tech-decisions.md#10-decisión-sobre-any-y-escape-hatches).

---

## 9. ESLint + Prettier

### ESLint (`.eslintrc.cjs`)

- `@plantir/eslint-config` (preset interno) basado en:
  - `eslint-config-expo` (reglas RN/Expo).
  - `@typescript-eslint/recommended-type-checked`.
  - `eslint-plugin-react-hooks`.
  - `eslint-plugin-import` (orden de imports +禁止 ciclos).
  - `eslint-plugin-unicorn` (calidad extra).
- Reglas activas (no negociables):
  - `@typescript-eslint/no-explicit-any: error`.
  - `@typescript-eslint/consistent-type-imports: error`.
  - `import/no-default-export: warn` (forzar named exports para refactors seguros).
  - `react-hooks/exhaustive-deps: error`.
  - `no-console: warn` (usar `logger`).
  - `unicorn/prefer-const: error`.

### Prettier (`.prettierrc`)

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

Sin conflictos: Prettier gana siempre. ESLint solo reglas que Prettier no cubre.

---

## 10. Scripts npm

`package.json` mínimo:

```jsonc
{
  "scripts": {
    "dev": "expo start --tunnel",
    "dev:ios": "expo start --ios",
    "dev:android": "expo start --android",
    "build:preview": "eas build --profile preview --platform all",
    "build:prod": "eas build --profile production --platform all",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,md}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e:ios": "maestro test .maestro/ios",
    "test:e2e:android": "maestro test .maestro/android",
    "supabase:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/supabase/types.gen.ts",
    "prepare": "husky install"
  }
}
```

`npm run typecheck` y `npm run lint` son **gates de CI** (no negociables).

---

## 11. Patrón de service

Cada `xxxService.ts` es un **módulo plano** con funciones tipadas que devuelven `Promise<{ data: T } | { error: ServiceError }>` (tipo resultado, **no excepciones**). El cliente Supabase es la **única** dependencia externa.

```ts
// src/services/tripsService.ts
import { supabase } from '@/supabase/client';
import type { Trip, TripId, ServiceError } from '@/types';
import { toServiceError } from '@/lib/errors/toServiceError';

export async function getTripById(id: TripId): Promise<
  { data: Trip } | { error: ServiceError }
> {
  const { data, error } = await supabase
    .from('trips').select('*').eq('id', id).single();
  if (error) return { error: toServiceError(error) };
  return { data };
}

export async function listTripsForUser(): Promise<
  { data: Trip[] } | { error: ServiceError }
> { /* ... */ }

export async function createTrip(input: NewTrip): Promise<
  { data: Trip } | { error: ServiceError }
> { /* ... */ }
```

**Reglas**:

- Sin `class`, sin `this`. Funciones puras exportadas.
- Devuelven `ServiceError` (nunca `throw`).
- Tipos de input/output vienen de `src/types`.
- Si la operación toca Edge Functions, va por `supabaseFunctions.ts` (wrapper tipado).
- Si la operación es solo de una feature, vive en `src/features/<feature>/services/`.

---

## 12. Entorno y secrets

- `src/lib/env.ts` valida en arranque que `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` existen y son URLs válidas. Si falla, **crashea en dev** con mensaje claro y bloquea el árbol de providers.
- `expo-secure-store` para tokens; nada de AsyncStorage para credenciales.
- `.env` y `.env.local` en `.gitignore` (ya lo están).

---

## 13. Testing (resumen)

Stack: **Jest + React Native Testing Library** para unit/integration; **Maestro** para E2E. La estrategia detallada la lleva `qa-engineer`; aquí solo se fija:

- Tests de `lib/algorithms/**` son unitarios puros (sin RN). Cobertura objetivo > 90% (es la única fuente de verdad matemática del producto: balances, splits, Borda).
- Tests de `services/**` mockean `supabase` con `jest.mock('@/supabase/client')`.
- Tests de hooks usan `renderHook` + `QueryClientProvider` con `queryClient` fresco.
- Estructura: **colocated** (`Button/Button.test.tsx` al lado de `Button.tsx`). Detalle en [`tech-decisions.md`](./tech-decisions.md#9-estructura-de-tests).

---

## 14. Out of scope de este documento

- Esquema SQL, RLS, triggers → Fase 2 (`supabase-backend`).
- Edge Functions → Fase 2.
- Implementación de UI → Fase 3 (`coder`).
- Diseño visual concreto, microcopy final → Fase 1 (`ux-designer`, ya entregada).
- Estrategia de tests detallada → Fase 2/3 (`qa-engineer`).
