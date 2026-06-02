/**
 * Tests del módulo money.ts
 *
 * Cubre los 8 casos obligatorios del briefing + edge cases (NaN, Infinity,
 * 0, negativos).
 */

import {
  Cents,
  toCents,
  fromCents,
  splitEqually,
  splitByPercentages,
  splitByShares,
  formatCents,
  sumCents,
  negateCents,
} from '../money';

describe('money.ts', () => {
  describe('toCents', () => {
    it('convierte euros a céntimos (1 € = 100 céntimos)', () => {
      expect(toCents(1)).toBe(100);
      expect(toCents(2.5)).toBe(250);
      expect(toCents(0)).toBe(0);
      expect(toCents(0.01)).toBe(1);
    });

    it('lanza RangeError con NaN', () => {
      expect(() => toCents(NaN)).toThrow(RangeError);
    });

    it('lanza RangeError con Infinity y -Infinity', () => {
      expect(() => toCents(Infinity)).toThrow(RangeError);
      expect(() => toCents(-Infinity)).toThrow(RangeError);
    });

    it('acepta números negativos (deudas)', () => {
      expect(toCents(-1.5)).toBe(-150);
    });
  });

  describe('fromCents', () => {
    it('divide entre 100', () => {
      expect(fromCents(100 as Cents)).toBe(1);
      expect(fromCents(12345 as Cents)).toBe(123.45);
      expect(fromCents(0 as Cents)).toBe(0);
    });

    it('roundtrip toCents/fromCents exacto para valores representables', () => {
      for (const v of [0, 0.01, 0.1, 0.2, 1, 1.99, 100, 1234.56, -50.5]) {
        expect(fromCents(toCents(v))).toBe(v);
      }
    });
  });

  describe('splitEqually', () => {
    it('caso AC-6.1.3: 100 céntimos entre 3 → 33/33/34 (remanente por alfabético)', () => {
      const r = splitEqually(100 as Cents, 3, ['a', 'b', 'c']);
      expect(r).toEqual([34, 33, 33]);
      // 34 es para 'a' (primero alfabéticamente).
    });

    it('100 céntimos entre 7 → 14,14,14,14,14,15,15 (suma exacta)', () => {
      const r = splitEqually(100 as Cents, 7, [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
      ]);
      // Implementación: ordena alfabéticamente ('a','b','c','d','e','f','g'),
      // los primeros K=2 (los alfabéticamente primeros) reciben base+1 = 15.
      expect(r).toEqual([15, 15, 14, 14, 14, 14, 14]);
      expect(r.reduce((s, x) => s + x, 0)).toBe(100);
    });

    it('asignación determinista por alfabético, no por orden del array', () => {
      // Mismos ids en distinto orden → mismo resultado final.
      const r1 = splitEqually(100 as Cents, 3, ['c', 'a', 'b']);
      const r2 = splitEqually(100 as Cents, 3, ['a', 'b', 'c']);
      expect(r1).toEqual(r2);
    });

    it('lanza RangeError si n = 0', () => {
      expect(() => splitEqually(100 as Cents, 0)).toThrow(RangeError);
    });

    it('lanza RangeError si n < 0', () => {
      expect(() => splitEqually(100 as Cents, -1)).toThrow(RangeError);
    });

    it('mantiene el invariante sum(parts) === total', () => {
      for (const total of [0, 1, 50, 99, 100, 101, 999, 1000, 12345]) {
        for (const n of [1, 2, 3, 5, 7, 10, 13]) {
          const ids = Array.from({ length: n }, (_, i) => `m${i}`);
          const r = splitEqually(total as Cents, n, ids);
          expect(r.reduce((s, x) => s + x, 0)).toBe(total);
        }
      }
    });
  });

  describe('splitByPercentages', () => {
    it('caso briefing 4: 33.33/33.33/33.34% sobre 100 céntimos → 33/33/34 (con redondeo)', () => {
      const r = splitByPercentages(100 as Cents, [33.33, 33.33, 33.34]);
      // El remanente va al último → 33 + 33 + 34 = 100.
      expect(r[0]).toBe(33);
      expect(r[1]).toBe(33);
      expect(r[2]).toBe(34);
      expect(r.reduce((s, x) => s + x, 0)).toBe(100);
    });

    it('lanza RangeError si la suma != 100', () => {
      expect(() => splitByPercentages(100 as Cents, [50, 50, 1])).toThrow(
        RangeError,
      );
    });

    it('lanza RangeError si algún porcentaje está fuera de [0,100]', () => {
      expect(() => splitByPercentages(100 as Cents, [-1, 101])).toThrow(
        RangeError,
      );
    });

    it('mantiene invariante de suma exacta', () => {
      const r = splitByPercentages(1000 as Cents, [25, 25, 25, 25]);
      expect(r.reduce((s, x) => s + x, 0)).toBe(1000);
    });
  });

  describe('splitByShares', () => {
    it('reparte proporcionalmente', () => {
      // 60% / 40% sobre 100.
      const r = splitByShares(100 as Cents, [3, 2]);
      expect(r[0]).toBe(60);
      expect(r[1]).toBe(40);
    });

    it('remaneinte va al primero', () => {
      const r = splitByShares(101 as Cents, [1, 1]);
      expect(r).toEqual([51, 50]);
    });

    it('lanza RangeError si algún share <= 0', () => {
      expect(() => splitByShares(100 as Cents, [1, 0])).toThrow(RangeError);
      expect(() => splitByShares(100 as Cents, [-1, 1])).toThrow(RangeError);
    });

    it('mantiene invariante de suma exacta', () => {
      for (const total of [1, 7, 100, 101, 999, 1000]) {
        for (const shares of [
          [1, 1],
          [1, 2, 3],
          [3, 3, 3, 1],
        ]) {
          const r = splitByShares(
            total as Cents,
            shares as number[],
          );
          expect(r.reduce((s, x) => s + x, 0)).toBe(total);
        }
      }
    });
  });

  describe('formatCents', () => {
    it('caso briefing 5: 12345 céntimos EUR → "123,45 €" en es-ES', () => {
      const out = formatCents(12345 as Cents, 'EUR');
      // La forma exacta puede variar entre runtimes ("123,45 €" o "123,45 €")
      // pero el número y la moneda deben estar.
      expect(out).toContain('123,45');
      expect(out).toContain('€');
    });

    it('acepta locale custom', () => {
      const out = formatCents(100 as Cents, 'USD', 'en-US');
      expect(out).toContain('1.00');
      expect(out).toContain('$');
    });
  });

  describe('sumCents', () => {
    it('caso briefing 6: suma de balances = 0', () => {
      expect(sumCents([100 as Cents, -50 as Cents, -50 as Cents])).toBe(0);
    });

    it('caso briefing 7: acepta negativos (deudas)', () => {
      expect(
        sumCents([1000 as Cents, -200 as Cents, 300 as Cents, -1100 as Cents]),
      ).toBe(0);
    });

    it('caso briefing 8: overflow lanza RangeError', () => {
      const huge = Number.MAX_SAFE_INTEGER;
      expect(() => sumCents([huge as Cents, 1 as Cents])).toThrow(RangeError);
    });

    it('suma vacía devuelve 0', () => {
      expect(sumCents([])).toBe(0);
    });
  });

  describe('negateCents', () => {
    it('invierte el signo', () => {
      expect(negateCents(100 as Cents)).toBe(-100);
      expect(negateCents(-100 as Cents)).toBe(100);
      // negateCents(0) produce -0 (cero negativo) en IEEE 754; usamos
      // `+0` para evitar la distinción de `Object.is(-0, 0) === false`.
      expect(negateCents(0 as Cents) + 0).toBe(0);
    });
  });

  describe('Cents.zero', () => {
    it('es 0', () => {
      expect(Cents.zero).toBe(0);
    });
  });
});
