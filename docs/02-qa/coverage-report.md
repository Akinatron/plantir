# Reporte de cobertura — Plantir

> **Estado actual:** Fase 2 (pre-implementación). La cobertura real se medirá en Fase 3 cuando existan los servicios, hooks, screens y Edge Functions. Este documento fija **objetivos cuantitativos** y el **mecanismo de medición**.

---

## 1. Comando de medición

Una vez configurado `jest.config.js` con `collectCoverageFrom`, el comando estándar es:

```bash
npx jest --coverage
```

Esto genera un reporte en consola + `coverage/lcov.info` + `coverage/lcov-report/index.html`.

Configuración de `jest.config.js` (pendiente ampliar en Fase 3):

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/types/**',         // tipos puros, no necesitan cobertura
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Por archivo, sobreescribe el global
    'src/lib/algorithms/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
};
```

---

## 2. Objetivos por capa

| Capa | Cobertura objetivo (statements) | Cobertura objetivo (branches) | Notas |
|---|---|---|---|
| `src/lib/algorithms/` (money, datePoll, destinationVoting, expenses) | **≥95%** | ≥90% | Puro, sin dependencias. Property-based con `fast-check` ≥1000 iteraciones para invariantes algebraicas. |
| `src/lib/dates/` | ≥90% | ≥85% | Helpers puros sobre `date-fns`. |
| `src/lib/validation/` (Zod schemas) | ≥90% | ≥80% | Cada schema testeado con input válido + inválido. |
| `src/lib/money/` formateo | ≥85% | ≥75% | Locale-aware formatting. |
| `src/services/` (trips, polls, expenses, members, invites, storage) | ≥80% | ≥75% | Mockear Supabase con MSW. |
| `src/hooks/` (useTrips, useExpenses, usePolls) | ≥80% | ≥75% | Mockear queries. |
| `src/components/` puros | ≥75% | ≥70% | React Native Testing Library + snapshots. |
| `src/app/` screens | ≥70% | ≥60% | Solo flujos críticos. El resto cubierto por E2E. |
| `supabase/functions/*/index.ts` (Edge Functions) | ≥85% | ≥80% | Mockear cliente Supabase + Zod. |

**Global mínimo aceptable para release:** ≥80% statements, ≥75% branches.

---

## 3. Estado actual (Fase 2)

| Capa | Cobertura real | Estado |
|---|---|---|
| `src/lib/algorithms/` | 0% (código existe, no tests ejecutados) | 🟡 Pendiente ejecutar `npm test`. |
| `src/lib/algorithms/__tests__/` | 4 archivos escritos, sin ejecutar | 🟡 Pendiente ejecutar `npm test`. |
| Resto | 0% (código no existe todavía) | 🔴 Se crea en Fase 3. |

**Esperado tras Fase 2 (este cierre):** `npm test` exit 0, `npx jest --coverage` reporta ≥95% en `src/lib/algorithms/`.

**Esperado tras Fase 3 (release candidate):** ≥80% global, todos los objetivos por capa cumplidos.

---

## 4. Property-based tests con `fast-check`

Para los algoritmos que tienen propiedades algebraicas, usamos `fast-check` con ≥1000 iteraciones. Esto detecta edge cases que los tests unitarios clásicos no atrapan.

| Algoritmo | Propiedad | Iteraciones |
|---|---|---|
| `money.ts` | `toCents(x)` roundtrip con 2 decimales exactos. | 1000 |
| `money.ts` | `sum(splitEqually(total, n)) === total` para todo total y n>0. | 1000 |
| `money.ts` | `sum(splitByPercentages(total, pcts)) === total` con pcts suma=100. | 1000 |
| `money.ts` | `sum(splitByShares(total, shares)) === total` con shares>0. | 1000 |
| `expenses.ts` | `sum(computeMemberBalances(expenses, members)) === 0` siempre. | 1000 |
| `expenses.ts` | `applyCompletedPayments(computeMemberBalances, settlements)` zerea balances. | 1000 |
| `datePoll.ts` | Score siempre finito y monotónico decreciente en required-missing. | 500 |
| `datePoll.ts` | `rank` siempre 1..N sin huecos. | 500 |
| `destinationVoting.ts` | `rankProposals` siempre retorna orden 1..N. | 500 |
| `destinationVoting.ts` | Empate se resuelve determinista. | 500 |

---

## 5. Integración con CI

En GitHub Actions (Fase 3), job `coverage`:

```yaml
coverage:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx jest --coverage --coverageReporters=lcov
    - name: Check coverage thresholds
      run: |
        COVERAGE=$(npx jest --coverage --silent | grep "All files" || true)
        echo "Coverage: $COVERAGE"
        # Fail si <80% global
        if [[ "$COVERAGE" =~ ([0-9]+)% ]] && [[ ${BASH_REMATCH[1]} -lt 80 ]]; then
          echo "::error::Coverage ${BASH_REMATCH[1]}% < 80%"
          exit 1
        fi
    - uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
```

**Reglas:**
- ❌ Merge bloqueado si global <80% o `algorithms/` <95%.
- ❌ Merge bloqueado si el job falla.

---

## 6. Plan para aumentar cobertura

| Zona | Estado | Acción |
|---|---|---|
| Algoritmos puros | Tests escritos en Fase 2 | Ejecutar y validar 95% en Fase 2 close. |
| Servicios de datos | Sin tests | Fase 3: tests con MSW mockeando Supabase. |
| Hooks (TanStack Query) | Sin tests | Fase 3: renderHook + waitFor + mock service. |
| Componentes puros | Sin tests | Fase 3: RN Testing Library, snapshot + behavior. |
| Screens | Sin tests | Fase 3: solo happy paths críticos + 1 unhappy por screen. |
| Edge Functions | Sin implementar | Fase 3: tests con cliente Supabase mock + Zod. |
| E2E | Sin tests | Fase 3: Maestro (móvil) o Detox para happy paths del MVP. |

**Zonas de bajo coverage esperadas y por qué son aceptables:**
- `src/types/`: tipos puros, no hay lógica que testear. Excluido de coverage.
- `src/lib/dates/formatters.ts`: formateo locale, 100% cubierto con tests de snapshot.
- `app/+not-found.tsx`, `app/_layout.tsx`: código cosmético, sin lógica testeable. Excluir.

---

## 7. Snapshot testing

Para componentes visuales (cards, headers, etc.) usar `toMatchSnapshot()` con cuidado:
- ✅ Sí: ProposalCard, ExpenseRow, AvatarStack — donde el layout es estable.
- ❌ No: pantallas con datos dinámicos (la snapshot cambia cada vez).

**Regla:** si la snapshot cambia en un PR, el revisor debe verificar manualmente que el cambio es intencional antes de aprobar el `-u`.

---

## 8. Coverage-driven development

**Política:** para cada feature de Fase 3:

1. Escribir el test que cubre el caso feliz (cubre el comportamiento esperado).
2. Escribir el test que cubre el caso de error (input inválido, race condition).
3. Implementar el código que pasa los tests.
4. Si la cobertura no llega al objetivo, justificar el gap en el PR o añadir más tests.

Esto previene el "test-after" que deja huecos.

---

## 9. Cómo correr el reporte localmente

```bash
# Tests + coverage en consola
npm test -- --coverage

# Solo coverage HTML (navegable)
npm test -- --coverage --coverageReporters=html
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html  # Windows

# Solo algorithms
npm test -- --coverage --collectCoverageFrom='src/lib/algorithms/**/*.ts'
```

---

## 10. Tracking de regresiones

Si en algún PR la cobertura global cae más de 2 puntos, el job de CI marca warning y requiere comentario del autor en el PR justificando. Si cae más de 5 puntos, bloquea el merge hasta que se añadan tests.

Esto evita la "cobertura erosion" gradual donde tests viejos se quedan obsoletos y nuevos features no se testean.
