# Decisiones técnicas — Plantir (móvil)

> Formato: **D**ecisión / **R**azón / **A**lternativas / **R**iesgo / **M**itigación.
> Coherencia con: `docs/00-briefing.md` (stack confirmado), `docs/01-ux/design-system.md` (UI lib y tokens).

---

## 1. Server state

**Decisión**: **TanStack Query v5** para todo el server state (queries, mutaciones, caché, revalidación, retries, optimistic updates, persistencia).

**Razón**:
- Es el estándar de facto en RN/Expo en 2026, con ecosistema enorme.
- Encaja nativamente con Supabase: `useQuery` envuelve `tripsService.getAll()` con caché, revalidación al refocus y deduplicación gratis.
- Soporte oficial de **persistor** (con `react-native-mmkv`) → UX offline sin reinventar la rueda.
- API explícita para **optimistic updates** (`onMutate` + rollback) → crítico para votar y añadir gastos.
- Integración limpia con realtime: `queryClient.invalidateQueries` desde un evento Supabase.
- Devtools potentes (Redux Devtools-style) sin acoplar a Redux.

**Alternativas**:
- **SWR**: más simple, pero menos potente (mutaciones, optimistic, devtools). Quedaría corto en MVP.
- **RTK Query**: implica usar Redux Toolkit. Encaja con Zustand como capa única de cliente (lo desaconseja el briefing al confirmar Zustand). Boilerplate mayor. Su mayor ventaja (normalización) no aporta tanto cuando cada recurso ya tiene su query.

**Riesgo**: Devtools añade peso en dev (mitigado por tree-shaking). Curva de aprendizaje del `queryKey` pattern (mitigado por `src/constants/queryKeys.ts` centralizado).

**Mitigación**: Wrapper `useXxx()` por feature que aísla TanStack Query del resto del código. Si mañana migramos a Apollo o a RTK Query, solo cambian los hooks.

---

## 2. Local state

**Decisión**: **Zustand** para local state global + cross-component. `useState` para estado efímero de componente. RHF para forms.

**Razón**:
- API mínima (`create((set) => ...)`), sin providers, sin boilerplate.
- Funciona fuera de React (podemos usarlo en services o utils) → útil para `sessionStore` que se hidrata desde Supabase.
- Persistencia built-in con middleware (`zustand/middleware` + MMKV) → borrador de viaje, tema, idioma.
- No tiene el "render hell" de Context (que rerenderiza todo el árbol).
- Encaja con el stack confirmado en el briefing.

**Alternativas**:
- **Context API**: gratis, pero rerender incontrolable, sin devtools, sin persistencia. Solo para props drilling trivial.
- **Jotai**: atómico y elegante, pero overkill para el estado que necesitamos (sesión, tema, borrador). Más curva mental para "atoms vs derived".

**Riesgo**: Stores globales pueden convertirse en "bolsa de todo" (anti-patrón). Mitigación: stores pequeños y enfocados (`sessionStore`, `uiStore`, `tripDraftStore`).

**Mitigación**: Convención: store nuevo → issue con justificación + D/R/A/R/M.

---

## 3. UI lib

**Decisión**: **NativeWind v4** (Tailwind CSS para React Native).

**Razón**:
- El UX Designer eligió tokens de design system (color, spacing, radius, shadow, tipografía) que se expresan de forma natural como utility classes.
- El developer experience de Tailwind (clases, `className`, variantes) acelera pantallas nuevas sin escribir StyleSheet.
- Tema y dark mode son **first-class** (`dark:` variants + CSS variables).
- Acceso directo a tokens del design system vía `tailwind.config.js` (mismas fuentes que `docs/01-ux/design-system.md`).
- Compatible con Expo SDK 51+ y Hermes.
- Bundle size controlado (purge de clases no usadas en build).

**Alternativas**:
- **Tamagui**: muy potente, theming robusto, optimizador excelente. Pero: curva de aprendizaje alta, comunidad más pequeña, decisiones de arquitectura (variants, tokens) que no necesitamos en MVP. Mejor para proyectos grandes con theming muy dinámico.
- **React Native Paper**: ideal para apps "MD3" / "admin-like". Menos control sobre tokens propios y peor coherencia con nuestro design system custom (que es cálido/social, no MD3). Theming por defecto no encaja con el tono de marca.
- **StyleSheet nativo**: cero deps, pero no escala a 35+ componentes con variantes; perdemos la coherencia con los tokens UX.

**Riesgo**: Migrar de NativeWind a otra cosa requiere reescribir `className` (no es free). Mitigación: el 90% de la lógica de estilo está en `tailwind.config.js` + tokens, que se preservan.

**Mitigación**: 
- Capa fina de componentes propios (`<Button variant="primary" />`) en `src/components/` que encapsula las clases → si migramos, cambiamos dentro del componente.
- Documentar el set de utility classes permitidas en `docs/01-ux/design-system.md` (consenso con UX).

---

## 4. Forms

**Decisión**: **React Hook Form (RHF)** con `@hookform/resolvers/zod`.

**Razón**:
- Performance: uncontrolled inputs, re-renders mínimos.
- Integración nativa con Zod (mismo schema, mismo tipo inferido en `onSubmit`).
- API explícita para arrays dinámicos (añadir miembros a un viaje, propuestas de destino).
- Errores por campo + form-level errors + async validators (ej. username único) sin hacks.
- Stack confirmado en el briefing.

**Alternativas**:
- **Formik**: API más amigable al principio, pero más rerenders y peor performance con forms grandes. Comunidad en declive.
- **Construir sobre `useState`**: no escala, repite lógica de touched/dirty/errors.

**Riesgo**: Listas dinámicas grandes (ej. 30 propuestas) pueden ser lentas con `useFieldArray`. Mitigación: `Controller` solo donde hace falta, y memoización local.

**Mitigación**: Schema Zod único por feature en `src/lib/validation/<feature>.ts` → mismo schema para RHF (cliente) y para validación de Edge Functions (servidor) en Fase 2.

---

## 5. Validation

**Decisión**: **Zod** para todos los schemas (cliente + servidor).

**Razón**:
- TypeScript-first: `z.infer<typeof schema>` da el tipo exacto.
- Compartible: el mismo schema se usa en RHF (`zodResolver`), en el service (validar input antes de ir a Supabase) y en Edge Functions (Fase 2).
- Mejor composición (`z.object`, `z.union`, `z.discriminatedUnion`) que Yup.
- Errores estructurados (`issue.path`, `issue.message`) → perfectos para `<ErrorState>` por campo.
- Stack confirmado en el briefing.

**Alternativas**:
- **Yup**: veteranía, pero tipos inferidos menos potentes y API más verbosa.
- **Valibot**: más liviano, pero ecosistema (RHF, integraciones) mucho menor.
- **Joi**: del lado servidor es excelente, pero no TS-first.

**Riesgo**: Errores de Zod pueden "leakearse" al UI como `[object Object]`. Mitigación: helper `presentZodError(error)` que produce mensaje legible.

**Mitigación**: `src/lib/validation/` por feature, exporta `{ schema, type Input, type Output }`. Componentes consumen `type Input` o `type Output` explícitamente.

---

## 6. Fechas

**Decisión**: **date-fns** + **date-fns-tz** (timezone).

**Razón**:
- Stack confirmado en el briefing.
- Tree-shakeable: solo importas lo que usas (`format`, `parseISO`, `addDays`).
- API funcional pura, sin mutaciones → encaja con `lib/algorithms` y tests deterministas.
- `date-fns-tz` añade `toZonedTime` / `fromZonedTime` para evitar el bug clásico "el vuelo sale a las 8:00 pero el dispositivo dice 9:00".
- Locale ES built-in (`es`).

**Alternativas**:
- **Luxon**: API OOP más potente para timezones (clase `DateTime`), pero más pesado y menos tree-shakeable. Vale la pena para apps con calendarios complejos; aquí no.
- **Day.js**: tiny (2KB) y chainable, pero la API es "imitación" de Moment, menos idiomática, plugins oficiales pocos.
- **Intl nativo** (sin librería): suficiente para formatear, pero aritmética y timezone requieren polyfills.

**Riesgo**: Date math + DST + timezones sigue siendo difícil. Mitigación: **regla dura**: en DB siempre UTC (`timestamptz`). En cliente, mostrar en TZ del dispositivo, pero las APIs de `lib/algorithms` operan sobre UTC. Un test de DST obligatorio para cada algoritmo de fechas.

**Mitigación**: `src/lib/dates/timezone.ts` concentra los helpers (`toUTC`, `fromZonedTime`, `formatInUserTZ`). Los algoritmos (`datePoll.ts`) **solo reciben y devuelven UTC ISO strings**.

---

## 7. Realtime

**Decisión**: Supabase Realtime **solo para sincronizar cache** (invalidación de TanStack Query). Suscripciones solo en cliente logueado, filtradas por `trip_id` y protegidas por RLS.

**Razón**:
- Realtime como "pintar directo" es frágil (reconexiones, eventos perdidos, batería).
- Realtime como "trigger de refetch" es robusto: el servidor sigue siendo la fuente de verdad, el cliente reacciona.
- Mapeo 1-1 con nuestras queries → no hay duplicación de estado.

**Tablas suscritas en cliente** (todas filtradas por RLS y por `trip_id`):

- `trips` — cambios de nombre, fechas, estado del viaje.
- `trip_members` — entradas/salidas del grupo.
- `polls` — apertura/cierre.
- `date_availability_votes` — heatmap en vivo.
- `destination_proposals` — nuevas propuestas.
- `destination_votes` — conteos en vivo.
- `expenses` — lista de gastos.
- `expense_splits` — recalcula balances.
- `settlements` — cierre de cuentas.
- `tasks` — habilitado en v1, no MVP.

**No se suscribe**: `trip_invites` (solo deep link o fetch puntual), tablas internas/Edge Functions.

**Riesgo**: Demasiados canales abiertos = batería. Mitigación: 1 canal por `tripId` activo, montado en `_layout.tsx` del trip y desmontado al salir (`flatList` de canales).

**Mitigación**: Helper `subscribeToTrip(tripId, queryClient)` en `src/supabase/realtime.ts` que centraliza el mapeo evento → `invalidateQueries(queryKeys.xxx)`.

---

## 8. Path aliases

**Decisión**: alias único `@/*` → `./src/*`.

**Razón**:
- Un solo alias, simple, compatible con Metro, TS, ESLint y Jest.
- Evita el clásico "relative hell" (`../../../../services/tripsService`).
- TypeScript: `"paths": { "@/*": ["./src/*"] }` + `"baseUrl": "."`.
- ESLint: `eslint-import-resolver-typescript` con la misma config.
- Jest: `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`.
- Metro: lo pilla automático por `tsconfig.json` con `expo-router`.

**Alternativas**:
- Aliases por capa (`@components/*`, `@features/*`, `@services/*`): más explícitos, pero rompen refactors (mover un archivo obliga a cambiar imports).
- **Sin aliases**: viable en un proyecto pequeño, pero con 35+ componentes y 6 features se vuelve ilegible.

**Riesgo**: Si alguien usa `~/*` (otro alias común en Expo) por inercia, se rompe. Mitigación: regla ESLint `import/no-unresolved` con el resolver bien configurado, y `import/no-relative-packages` para cazar paths incorrectos.

**Mitigación**: Documentar `@/*` en `architecture.md` y en onboarding.

---

## 9. Estructura de tests

**Decisión**: **Colocated tests** (`Component.test.tsx` al lado de `Component.tsx`). Una excepción: tests E2E de Maestro en `.maestro/`.

**Razón**:
- Visibilidad: al editar un componente ves su test al lado.
- Refactors seguros: mover un archivo mueve su test automáticamente.
- Encaja con la convención de Expo/React Native.
- Cobertura por archivo, no por carpeta.

**Alternativas**:
- **`__tests__/`**: tradicional en proyectos JS, pero perdemos la proximidad visual.
- **`tests/` separado**: aún más lejos, sentido solo para proyectos muy grandes.

**Estructura final**:

```
src/
  components/Button/
    Button.tsx
    Button.test.tsx
    index.ts
  features/trips/hooks/useTrips.ts
  features/trips/hooks/useTrips.test.ts
  lib/algorithms/expenses/settle.ts
  lib/algorithms/expenses/settle.test.ts

.maestro/
  trips/
    create-trip.yaml
  polls/
    date-poll.yaml
```

**Riesgo**: Archivos de test "ruidosos" mezclan con código. Mitigación: configuración de Vitest/Jest para excluir `*.test.ts` del build de producción, y `tsconfig` los incluye solo en `include` general.

**Mitigación**: `jest.config.js` con `testMatch: ['**/*.test.ts', '**/*.test.tsx']` + `transformIgnorePatterns` correcto para RN.

---

## 10. Decisión sobre `any` y escape hatches

**Decisión**: **`any` prohibido**. `unknown` + narrowing siempre que sea posible. Excepciones documentadas vía comentario + issue + (opcional) `// eslint-disable-next-line` con razón.

**Razón**:
- TypeScript strict existe para pillar bugs en compile-time. `any` los reintroduce.
- En un dominio con dinero (cents) y balances, un `any` puede causar bugs financieros silenciosos.
- Si necesitas un "tipo que no conoces", `unknown` te obliga a hacer narrowing antes de usar.

**Escape hatches permitidos** (en orden de preferencia):

1. **`unknown` + type guard**: el caso por defecto.
2. **Genéricos**: si la función es reusable sobre varios tipos.
3. **Tipos generados** (`src/supabase/types.gen.ts`): para datos de DB.
4. **Tipos importados de librerías externas** (cuando no los exportan): `import type { Something } from 'lib';` con `// @ts-expect-error: <razón>` si hace falta.
5. **`as const`**: para literales narrowing.
6. **`any` con justificación**: solo para:
   - Wrapper de una librería de terceros no tipada (debe ir aislado en `src/lib/<wrapper>/`).
   - JSON.parse de input no validado → primero `JSON.parse` a `unknown`, luego `Zod` schema.
   - Nunca en lógica de negocio, nunca en `services/`, nunca en `lib/algorithms/`.

**Reglas ESLint**:
- `@typescript-eslint/no-explicit-any: error` (no `warn`).
- `@typescript-eslint/no-unsafe-assignment: error`.
- `@typescript-eslint/no-unsafe-member-access: error`.
- `@typescript-eslint/no-unsafe-call: error`.

**Riesgo**: A veces un `any` ahorra 30 minutos. La tentación es real. Mitigación: code review en PR (regla: "si pones `any`, explica por qué `unknown` no vale").

**Mitigación**: Linter en CI (`npm run lint --max-warnings 0`) + typecheck obligatorio (`npm run typecheck`). Cualquier `any` rompe el build.

---

## 11. Stack resumido y definitivo

| Capa | Librería | Versión objetivo |
|---|---|---|
| Runtime | React Native + Expo | SDK 52+ |
| Lenguaje | TypeScript strict | 5.6+ |
| Router | Expo Router | 4.x |
| UI | NativeWind | 4.x |
| Server state | TanStack Query | 5.x |
| Local state | Zustand | 5.x |
| Forms | React Hook Form + Zod resolver | 7.x + 3.x |
| Validation | Zod | 3.x |
| Fechas | date-fns + date-fns-tz | 4.x + 3.x |
| Backend client | @supabase/supabase-js | 2.x |
| Storage seguro | expo-secure-store | 14.x |
| Persistencia local | react-native-mmkv | 13.x |
| Logger / telemetría | Sentry (sentry-expo) | 7.x |
| Tests unit/integration | Jest + RNTL | 29.x + 12.x |
| Tests E2E | Maestro | 1.40+ |
| Lint | ESLint + @typescript-eslint | 9.x + 8.x |
| Format | Prettier | 3.x |
| Build | EAS Build | latest |
| CI | GitHub Actions | — |

Toda esta lista está alineada con `docs/00-briefing.md` (sección "Stack confirmado"). No se debate en Fase 1.
