# Briefing compartido — Fase 1: Producto, UX y Arquitectura

> Este documento es la base común para los 3 tracks de la Fase 1 (PRD, UX, Arquitectura). Léelo entero antes de empezar.

## Proyecto
**Plantir** — app móvil (iOS + Android) con React Native + Expo + TypeScript. Backend en Supabase (Postgres + RLS + Edge Functions). Sirve para que un grupo de amigos organice un viaje de principio a fin, sustituyendo el caos de WhatsApp + Excel + Doodle + Airbnb + Tricount.

## Propuesta de valor
> "Crea el grupo, encuentra la mejor fecha, elige el sitio, organiza el viaje y divide los gastos en una sola app."

## Usuarios objetivo (MVP)
- Grupos de amigos de 18-35 años.
- Viajes de fin de semana, casas rurales, escapadas de verano, viajes de universidad.
- Grupos grandes donde coordinar fechas y pagos se complica.
- Secundario: parejas, familias, grupos de trabajo.

## Fases del producto
- **MVP**: Auth, crear viaje, invitar por link, votar fechas, elegir fecha, proponer destinos, votar destinos, elegir destino, gastos básicos (añadir, dividir igual, excluir, balances, settlements), RLS, algoritmos testeados, UI usable.
- **v1** (post-MVP): tareas, recibos, push, income/refunds, splits avanzados, historial de decisiones, export PDF/CSV, comments, confirmación de pagos.
- **v2**: multi-moneda, AI summaries, calendar integration, common pot, pagos reales, mapa, itinerario completo, trip templates, web mode.

## Stack confirmado (no se debate en Fase 1)
- **Mobile:** React Native + Expo + TypeScript strict + Expo Router + React Hook Form + Zod + TanStack Query + Zustand + date-fns.
- **UI lib:** decisión pendiente (NativeWind / Tamagui / Paper) → la toma `mobile-architect` y la justifica.
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions Deno/TS).
- **Money:** integer cents en TODAS las tablas y Edge Functions.
- **Testing:** Jest + React Native Testing Library + tests de Edge Functions críticas. E2E con Maestro o Detox.
- **DevOps:** Supabase CLI, EAS Build/Submit, GitHub Actions (typecheck + lint + test + preview).
- **Observability:** Sentry + logs estructurados en Edge Functions.

## Estados de un viaje (estándar en todo el producto)
1. `group_created` — grupo creado
2. `voting_dates` — votando fechas
3. `date_decided` — fecha decidida
4. `voting_place` — votando sitio
5. `place_decided` — sitio decidido
6. `planning` — planificando
7. `on_trip` — durante el viaje
8. `settling_expenses` — cerrando cuentas
9. `closed` — cerrado

## Tono de marca
- Amigable, moderno, social, divertido pero no infantil.
- Muy claro en torno a decisiones y dinero.
- Reduce fricción y discusiones.

## Convenciones de entregables Fase 1
- Carpeta: `docs/01-product/`, `docs/01-ux/`, `docs/01-architecture/`.
- Idioma: **español**.
- Toda decisión importante en formato **Decisión / Razón / Alternativas / Riesgo / Mitigación**.
- Nada de prosa vaga. Decisiones concretas, números concretos, nombres concretos.

## Lo que NO se hace en Fase 1
- No se escribe SQL (eso es Fase 2).
- No se escriben Edge Functions (eso es Fase 2).
- No se implementa UI (eso es Fase 3).
- No se montan tests (eso es Fase 2/3, con ayuda de `qa-engineer`).

## Salidas esperadas Fase 1
1. `docs/01-product/prd.md` — PRD completo (vison, usuarios, features, MVP/v1/v2, criterios de aceptación, métricas).
2. `docs/01-ux/flows.md` — flujos pantalla por pantalla con estados.
3. `docs/01-ux/components.md` — inventario de componentes reutilizables.
4. `docs/01-ux/design-system.md` — tokens, color, tipografía, spacing, motion.
5. `docs/01-architecture/architecture.md` — diagrama de capas, módulos, navegación, estado, contratos.
6. `docs/01-architecture/tech-decisions.md` — decisiones clave con formato D/R/A/R/M.
