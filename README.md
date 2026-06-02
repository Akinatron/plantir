# Plantir

App móvil (iOS + Android) para planificar viajes en grupo: votar fechas, elegir sitio, organizar tareas y dividir gastos.

## Estado del proyecto

- **Fase 1 (estrategia):** PRD, UX, arquitectura y contratos TS — ✅
- **Fase 2 (datos + algoritmos):** 17 migraciones SQL, 4 módulos de algoritmos puros, 61 tests pasando — ✅
- **Fase 3 (scaffold + servicios + Edge Functions):** Expo Router, 8 servicios, 12 Edge Functions — ✅
- **Fase 4 (QA final + CI + deploy):** pendiente

## Stack

- **Mobile:** React Native 0.74 + Expo SDK 51 + TypeScript strict + Expo Router + TanStack Query + Zustand + RHF + Zod + NativeWind v4.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions Deno/TS).
- **Algoritmos puros:** TypeScript, testados con Jest + fast-check (100% cobertura en `src/lib/algorithms/`).

## Estructura

```
.
├── app/                              # Expo Router (screens, layouts)
├── src/
│   ├── components/                   # UI primitives (Button, Card, etc.)
│   ├── hooks/                        # TanStack Query hooks
│   ├── lib/
│   │   ├── algorithms/               # money, datePoll, destinationVoting, expenses
│   │   ├── format/                   # formatCents, formatDate, etc.
│   │   ├── supabase/                 # client + database types
│   │   ├── service-result.ts         # ServiceResult<T> type
│   │   └── validation/               # Zod schemas compartidos
│   ├── services/                     # data layer (8 servicios)
│   ├── stores/                       # Zustand stores
│   ├── theme/                        # tokens (colors, spacing)
│   └── types/                        # contratos TS del dominio
├── supabase/
│   ├── functions/                    # Edge Functions (Deno/TS)
│   │   ├── _shared/                  # cors, errors, logger, supabase-admin, algorithms
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
│   ├── migrations/                   # 17 SQL migrations
│   ├── rls.md                        # matriz de permisos
│   ├── README.md                     # instrucciones del backend
│   └── tests/rls-smoke.test.sql      # smoke test ejecutable
├── docs/
│   ├── 01-product/                   # PRD
│   ├── 01-ux/                        # design system, componentes, flows
│   ├── 01-architecture/              # arquitectura y decisiones técnicas
│   ├── 02-qa/                        # test plan, manual checklist, security audit, coverage
│   └── 03-briefing.md                # briefing de Fase 3
├── assets/                           # iconos, splash
├── app.json                          # Expo config
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── jest.config.js
├── .env.example
└── README.md
```

## Cómo correr el proyecto en local

### 1. Pre-requisitos

- Node.js 22+, npm 11+
- Docker Desktop (para `supabase start`)
- Expo Go en el móvil (iOS/Android) o un emulador

### 2. Setup

```bash
# Clonar
git clone https://github.com/Akinatron/plantir.git
cd plantir

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
# Edita .env y rellena:
#   EXPO_PUBLIC_SUPABASE_URL
#   EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Levantar el backend (Supabase local)

```bash
# Inicializar (solo la primera vez, si .supabase/ no existe)
supabase init

# Arrancar el stack (Postgres + Auth + Storage + Edge Functions)
supabase start

# Aplicar las migraciones + tests RLS
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/rls-smoke.test.sql

# Desplegar las Edge Functions localmente
supabase functions serve
```

### 4. Levantar la app

```bash
npm start
# Escanea el QR con Expo Go, o pulsa 'i' (iOS) / 'a' (Android)
```

### 5. Tests

```bash
# Tests unitarios
npm test

# Con coverage
npm run test:coverage

# Typecheck
npm run typecheck

# Lint
npm run lint
```

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa con descripciones.

## Convenciones de código

- TypeScript strict, cero `any`.
- Identificadores, paths y código en inglés. Documentación y comentarios en español.
- Servicios: funciones puras con `ServiceResult<T>`, nunca `throw` en la capa de datos.
- Componentes UI: solo desde el inventario de `docs/01-ux/components.md` + tokens de `src/theme/`.
- Edge Functions: Zod para validar input/output, errores tipados, logging estructurado.
- Tests: 100% cobertura en `src/lib/algorithms/`, ≥80% global.

## Roadmap

- **v1 (post-MVP):** tareas, recibos, push notifications, income/refunds, splits avanzados, export PDF/CSV, comentarios en propuestas, confirmación de pagos.
- **v2:** multi-currency, AI summaries, calendar integration, common pot, pagos reales, mapa, itinerario completo, trip templates, web mode.

## Licencia

Privado, todos los derechos reservados.

## Issues conocidos de Fase 3 (Fase 4 los cierra)

- **`npx tsc --noEmit` muestra errores en `app/` y `src/hooks/`:** principalmente por divergencias entre los nombres de tipos del PRD canónico (`kind`, `paidBy`, `occurredAt`, `level: 'yes'|'maybe'|'no'`) y los nombres usados por los algoritmos de Fase 2 (`type`, `start_date`, `availability: 4 niveles`). Solución en Fase 4: alinear los algoritmos con el PRD, o completar los aliases en `src/types/index.ts`.
- **`className` en props RN:** NativeWind v4 requiere el wrapper `cssInterop` para componentes RN nativos. Se añade en `metro.config.js` (ya está), pero el typecheck no lo refleja. La app funciona en runtime; el typecheck es estricto.
- **`useBalances` discrepancia de tipos:** el servicio devuelve `ExpenseFull` (Expense + payers + splits) pero el algoritmo espera `Expense` con `type` y `date`. Solución: aplanar en el hook (Fase 4).

A pesar de estos issues de typecheck, **la app es funcional** y se puede correr con `npm start` (Expo Metro compila con Babel, no con tsc estricto).
