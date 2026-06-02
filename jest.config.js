/**
 * Configuración de Jest para Plantir.
 *
 * - `ts-jest` para tests puros de TS (algoritmos, hooks, services).
 *   Más rápido, sin transformaciones de RN.
 * - `jest-expo` para tests que importan React Native (componentes, screens).
 *   Se activa automáticamente cuando un test importa de `react-native`,
 *   `@react-navigation/*` o `expo`.
 *
 * Configuración de coverage excluida de:
 *  - `src/types/**` (tipos puros)
 *  - `app/+not-found.tsx` (cosmético)
 *  - `*.d.ts` (declaraciones)
 *  - `__tests__/**` (los propios tests)
 */

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'pure-ts',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/lib/algorithms/__tests__/**/*.test.ts',
        '<rootDir>/src/lib/**/*.test.ts',
        '<rootDir>/src/services/**/*.test.ts',
        '<rootDir>/src/hooks/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      collectCoverageFrom: [
        'src/lib/algorithms/**/*.ts',
        'src/services/**/*.ts',
        'src/hooks/**/*.ts',
        '!src/**/__tests__/**',
        '!src/types/**',
      ],
    },
    {
      displayName: 'expo-rn',
      preset: 'jest-expo',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/app/**/*.test.tsx',
        '<rootDir>/src/components/__tests__/**/*.test.tsx',
        '<rootDir>/src/features/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@react-native-async-storage/.*))',
      ],
    },
  ],
  coverageReporters: ['text', 'text-summary', 'json', 'lcov'],
  clearMocks: true,
  restoreMocks: true,
  verbose: false,
};
