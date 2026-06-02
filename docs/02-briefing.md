# Briefing compartido — Fase 2: Datos, Algoritmos y QA

> Base común para los tracks de la Fase 2. Léelo entero antes de empezar.

## Lo que ya está hecho (Fase 1)
- PRD completo en `docs/01-product/prd.md` (1.049 líneas).
- UX flows, design system y componentes en `docs/01-ux/`.
- Arquitectura móvil y decisiones técnicas en `docs/01-architecture/`.
- Contratos TypeScript en `src/types/index.ts` (branded types: `Cents`, `TripId`, `ISODateString`, etc.).
- Briefing original en `docs/00-briefing.md`.

## Objetivo de Fase 2
Producir los **componentes críticos del backend y del dominio puro** que sostienen la app:

1. **Datos**: esquema SQL completo, migraciones, políticas RLS, funciones SQL helper, índices, enums. Listo para ejecutar contra un Supabase local con `supabase start`.
2. **Algoritmos**: 4 funciones puras en TypeScript con tests exhaustivos, cero dependencias de React/Supabase. Cobertura 100% de los casos listados.
3. **QA audit**: plan de pruebas, checklist manual, auditoría de seguridad (OWASP Mobile + huecos de RLS), informe de cobertura esperada.

## Stack
- **SQL**: PostgreSQL 15 (target Supabase). Migraciones versionadas, incrementales, reversibles.
- **TypeScript strict**, `tsconfig` ya especificado en arquitectura. Cero `any` salvo justificación.
- **Tests**: Jest con `ts-jest`. Property-based tests con `fast-check` donde aporten valor (settlements).
- **Sin UI, sin Edge Functions en esta fase**. Las Edge Functions van en Fase 3 con ayuda de `supabase-backend`.

## Convenciones duras
- **Idioma**: español en docs y comentarios. Identificadores, paths, SQL, TypeScript y comandos en su forma nativa.
- **Decisiones en formato Decisión/Razón/Alternativas/Riesgo/Mitigación** cuando aplique.
- **Tests primero** en algoritmos. Tests = contrato, implementación = cumplimiento.
- **Money siempre en `Cents`** (entero), nunca float. Multiplicación por 100 al serializar, división al deserializar con reparto determinista del remanente.
- **Fechas**: `timestamptz` para instantes, `date` para días del viaje, `text` ISO 4217 para moneda.
- **RLS en TODAS las tablas**. Helper functions en `is_trip_member()`, `is_trip_admin()`, `can_manage_trip()`, `can_vote_poll()`, `can_create_destination_proposal()`, `can_manage_expense()`.
- **Service role key solo en Edge Functions** (Fase 3). Cero secretos en cliente.

## Casos de prueba obligatorios (algoritmos)
**`datePoll.ts`**:
1. Todos pueden en las mismas fechas → score máximo, todos incluidos.
2. Algunos usuarios no pueden → ranking con warning de excluidos.
3. Required members: si uno falta, fuerte penalización.
4. `min_trip_days` y `max_trip_days` respetados.
5. Overlapping ranges: combinar correctamente.
6. Tie en score → desempate por duración, luego fecha más temprana.
7. Votos "maybe" ponderados (peso 0.5).
8. Votos "prefer" ponderados (peso 1.5).
9. Usuarios pendientes (pending_members) cuentan o no según política.
10. Single range con todos "yes" → resultado único.

**`destinationVoting.ts`**:
1. Upvotes puros.
2. Score 1-5 con promedio y orden.
3. Ranking con orden explícito.
4. Empate → desempate por precio ascendente, capacidad descendente.
5. Voto anónimo no expone votante.
6. Propuesta borrada no cuenta.
7. Voto duplicado: upsert, no duplica.

**`expenses.ts`** (incluye split + settlement):
1. Gasto igual entre N.
2. Gasto con exclusión explícita de personas.
3. Split por amounts exactos.
4. Split por porcentajes (incluye redondeo de 1 céntimo).
5. Split por shares.
6. Múltiples payers.
7. Income/refund (entra dinero al grupo).
8. Settlements ya pagados se descuentan del balance.
9. Optimización de settlements: resultado con mínimo de pagos.
10. Balance final suma exactamente 0.
11. Remanente de 1 céntimo: asignación determinista (alfabético).
12. Multi-currency: balance en moneda del viaje (placeholder v2).

**`money.ts`**:
1. `toCents(euros)` y `fromCents(cents)` roundtrip exacto para valores representables.
2. `splitEqually(100, 3)` → 33/33/34 (con remainder determinista).
3. `splitEqually(100, 7)` → 14,14,14,14,14,15,15 (suma exacta).
4. `applyPercentage([33.33, 33.33, 33.34], 100)` → 3333/3333/3334.
5. `formatCents(12345, 'EUR')` → "123,45 €" (es-ES).
6. Suma de balances = 0.
7. Negativos permitidos (deudas).
8. Overflow en sumas acotado.

## Estructura de salida

```
supabase/
  migrations/
    20260601000001_extensions.sql
    20260601000002_enums.sql
    20260601000003_profiles.sql
    20260601000004_trips_and_members.sql
    20260601000005_invites.sql
    20260601000006_polls_and_date_votes.sql
    20260601000007_destination_proposals.sql
    20260601000008_destination_votes.sql
    20260601000009_tasks.sql
    20260601000010_expenses.sql
    20260601000011_settlements.sql
    20260601000012_activity_log.sql
    20260601000013_notifications_and_push_tokens.sql
    20260601000014_rls_helpers.sql
    20260601000015_rls_policies.sql
    20260601000016_storage_policies.sql
    20260601000017_seed_dev_data.sql      # opcional, solo dev
  rls.md                                  # documentación de políticas
  README.md                              # cómo levantar el stack local

src/
  lib/
    algorithms/
      money.ts
      datePoll.ts
      destinationVoting.ts
      expenses.ts
      index.ts        # barrel
    algorithms/__tests__/
      money.test.ts
      datePoll.test.ts
      destinationVoting.test.ts
      expenses.test.ts

docs/02-qa/
  test-plan.md
  manual-checklist.md
  security-audit.md
  coverage-report.md
```

## Lo que NO se hace en Fase 2
- No se monta Expo ni se escriben screens.
- No se crean Edge Functions.
- No se configura CI/CD ni EAS.
- No se hace push a GitHub de nada todavía (lo haré yo como owner al cerrar la fase).
- No se crean datos seed de producción.

## Salidas esperadas Fase 2
1. `supabase/migrations/*.sql` con las 17 migraciones numeradas y la documentación `supabase/rls.md`.
2. `src/lib/algorithms/*.ts` + tests pasando (`npm test` exit 0).
3. `docs/02-qa/test-plan.md`, `manual-checklist.md`, `security-audit.md`, `coverage-report.md`.

## Stop conditions (entregable listo)
- Backend: las 17 migraciones existen, son reversibles (cada DROP tiene su `IF EXISTS` o inverse), todas las tablas tienen RLS, todos los helper functions existen y están testeados con un script SQL ejecutable.
- Algoritmos: `npm test` exit 0, cobertura ≥95% en `src/lib/algorithms/`, todos los casos de la lista cubiertos, propiedad-based test en `expenses.ts` con 1000+ iteraciones.
- QA: 3 docs escritos con casos verificables, huecos de RLS documentados con severidad.

## Reporte al final
Cada track reporta: rutas absolutas de los archivos + resumen ejecutivo de 5-10 líneas + comandos para verificar (ej. `npm test`, `psql -f ...`, etc.).
