/**
 * Configuración de Jest para los algoritmos puros de Plantir.
 *
 * - `ts-jest` transpila los .ts en memoria (sin emitir dist/).
 * - `testEnvironment: 'node'` porque no usamos DOM ni APIs nativas de RN/Expo.
 * - `roots` solo apunta a `src/` para que el test runner no escanee
 *   `node_modules`, `dist/` ni `docs/`.
 * - `testMatch` limita a los `*.test.ts` dentro de `__tests__/`.
 * - `moduleNameMapper` resuelve el alias `@/*` (mismo que `tsconfig.json`).
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/lib/algorithms/**/*.ts',
    '!src/lib/algorithms/index.ts',
    '!src/lib/algorithms/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
  },
  coverageReporters: ['text', 'text-summary', 'json', 'lcov'],
  clearMocks: true,
  restoreMocks: true,
  verbose: false,
};
