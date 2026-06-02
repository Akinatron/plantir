/**
 * Plantir — Algoritmos puros: barrel
 *
 * Archivo: src/lib/algorithms/index.ts
 *
 * Re-exporta la API pública de los 4 módulos de algoritmos de dominio.
 * El barrel está pensado para que la UI importe todo desde un solo
 * punto: `import { ... } from '@/lib/algorithms'`.
 */

export * from './money';
export * from './datePoll';
export * from './destinationVoting';
export * from './expenses';
