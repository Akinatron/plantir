/**
 * Tests del módulo datePoll.ts
 *
 * Cubre los 10 casos obligatorios del briefing.
 */

import {
  computeDatePollCandidates,
  PollConfig,
  UserAvailability,
  UserId,
  ISODateString,
} from '../datePoll';

const uid = (s: string) => s as UserId;
const day = (s: string) => s as ISODateString;

const baseConfig: PollConfig = {
  allowedRanges: [{ start: day('2026-07-01'), end: day('2026-07-31') }],
  minTripDays: 3,
  maxTripDays: 7,
  maybeWeight: 0.5,
  preferWeight: 1.5,
  canWeight: 1,
  cannotWeight: -2,
  requiredMemberIds: [],
  pendingPolicy: 'include',
};

describe('datePoll.ts', () => {
  it('caso 1: todos pueden en las mismas fechas → score máximo, todos incluidos', () => {
    const members: UserId[] = ['a', 'b', 'c'].map(uid);
    const avs: UserAvailability[] = members.map((m) => ({
      userId: m,
      ranges: [
        {
          start: day('2026-07-01'),
          end: day('2026-07-31'),
          availability: 'available',
        },
      ],
    }));
    const r = computeDatePollCandidates(baseConfig, avs, members);
    expect(r.length).toBeGreaterThan(0);
    // El primer candidato (rank 1) debe tener a todos como available.
    const top = r[0];
    expect(top).toBeDefined();
    expect(top!.availableMembers.length).toBe(3);
    expect(top!.unavailableMembers.length).toBe(0);
    expect(top!.rank).toBe(1);
  });

  it('caso 2: algunos usuarios no pueden → ranking con warning de excluidos', () => {
    const members: UserId[] = ['a', 'b', 'c'].map(uid);
    const avs: UserAvailability[] = [
      {
        userId: uid('a'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
      {
        userId: uid('b'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
      {
        userId: uid('c'),
        // 'c' solo puede la primera quincena.
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-15'), availability: 'available' },
        ],
      },
    ];
    const r = computeDatePollCandidates(baseConfig, avs, members);
    // Buscamos un candidato en la primera quincena → 'c' incluido.
    const primeraQuincena = r.find(
      (c) => c.start === day('2026-07-01') && c.end === day('2026-07-03'),
    );
    expect(primeraQuincena).toBeDefined();
    expect(primeraQuincena!.availableMembers).toContain(uid('c'));
  });

  it('caso 3: required members — si uno falta, fuerte penalización', () => {
    const config: PollConfig = { ...baseConfig, requiredMemberIds: [uid('c')] };
    const members: UserId[] = ['a', 'b', 'c'].map(uid);
    const avs: UserAvailability[] = [
      {
        userId: uid('a'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
      {
        userId: uid('b'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
      {
        // 'c' solo puede la primera quincena.
        userId: uid('c'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-15'), availability: 'available' },
        ],
      },
    ];
    const r = computeDatePollCandidates(config, avs, members);
    // El top-1 no debería estar en la segunda quincena (porque excluiría a 'c').
    const top = r[0];
    expect(top).toBeDefined();
    // El primer candidato debería estar al inicio del mes.
    expect(top!.start).toBe(day('2026-07-01'));
    // El último candidato (peor score) está en la última semana.
    const last = r[r.length - 1];
    expect(last).toBeDefined();
    expect(last!.requiredMembersMissing).toContain(uid('c'));
    expect(last!.score).toBeLessThan(top!.score);
  });

  it('caso 4: respeta minTripDays y maxTripDays', () => {
    const members: UserId[] = ['a'].map(uid);
    const avs: UserAvailability[] = [
      {
        userId: uid('a'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
    ];
    const r = computeDatePollCandidates(baseConfig, avs, members);
    for (const c of r) {
      expect(c.durationDays).toBeGreaterThanOrEqual(baseConfig.minTripDays);
      expect(c.durationDays).toBeLessThanOrEqual(baseConfig.maxTripDays);
    }
  });

  it('caso 5: overlapping ranges — combina correctamente', () => {
    const config: PollConfig = {
      ...baseConfig,
      allowedRanges: [
        { start: day('2026-07-01'), end: day('2026-07-15') },
        { start: day('2026-07-10'), end: day('2026-07-25') },
      ],
    };
    const members: UserId[] = ['a'].map(uid);
    const avs: UserAvailability[] = [
      {
        userId: uid('a'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
    ];
    const r = computeDatePollCandidates(config, avs, members);
    // Debe haber candidatos antes y después del solape.
    expect(r.some((c) => c.start === day('2026-07-01'))).toBe(true);
    expect(r.some((c) => c.start >= day('2026-07-16'))).toBe(true);
  });

  it('caso 6: tie en score → desempate por duración cercana al midpoint', () => {
    // Forzamos empate dando misma disponibilidad y pesos simétricos.
    const config: PollConfig = {
      ...baseConfig,
      minTripDays: 3,
      maxTripDays: 7,
      maybeWeight: 0,
      preferWeight: 1,
      canWeight: 1,
      cannotWeight: 0,
    };
    const members: UserId[] = ['a', 'b'].map(uid);
    const avs: UserAvailability[] = members.map((m) => ({
      userId: m,
      ranges: [
        { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
      ],
    }));
    const r = computeDatePollCandidates(config, avs, members);
    // Todos los candidatos tienen score=2. El desempate pone los de
    // duración más cercana a 5 (midpoint de 3..7) primero.
    expect(r[0]!.durationDays).toBe(5);
  });

  it('caso 7: votos "maybe" ponderados (peso 0.5)', () => {
    const config: PollConfig = { ...baseConfig, maybeWeight: 0.5 };
    const members: UserId[] = ['a', 'b'].map(uid);
    const avs: UserAvailability[] = [
      {
        userId: uid('a'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
      {
        userId: uid('b'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'maybe' },
        ],
      },
    ];
    const r = computeDatePollCandidates(config, avs, members);
    const top = r[0]!;
    expect(top.score).toBeCloseTo(1.5, 5);
  });

  it('caso 8: votos "prefer" ponderados (peso 1.5)', () => {
    const config: PollConfig = { ...baseConfig, preferWeight: 1.5 };
    const members: UserId[] = ['a', 'b'].map(uid);
    const avs: UserAvailability[] = [
      {
        userId: uid('a'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'prefer' },
        ],
      },
      {
        userId: uid('b'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
    ];
    const r = computeDatePollCandidates(config, avs, members);
    const top = r[0]!;
    expect(top.score).toBeCloseTo(2.5, 5);
    expect(top.preferredMembers).toContain(uid('a'));
  });

  it('caso 9: pendingMembers según policy (include / exclude / penalize)', () => {
    const members: UserId[] = ['a', 'b', 'c'].map(uid);
    // Solo 'a' vota.
    const avs: UserAvailability[] = [
      {
        userId: uid('a'),
        ranges: [
          { start: day('2026-07-01'), end: day('2026-07-31'), availability: 'available' },
        ],
      },
    ];
    const incl = computeDatePollCandidates(
      { ...baseConfig, pendingPolicy: 'include' },
      avs,
      members,
    );
    const excl = computeDatePollCandidates(
      { ...baseConfig, pendingPolicy: 'exclude' },
      avs,
      members,
    );
    const penal = computeDatePollCandidates(
      { ...baseConfig, pendingPolicy: 'penalize' },
      avs,
      members,
    );
    expect(incl[0]!.pendingMembers.length).toBe(2);
    expect(excl[0]!.score).toBeLessThan(incl[0]!.score);
    expect(penal[0]!.score).toBeLessThan(incl[0]!.score);
    expect(excl[0]!.score).toBeLessThan(penal[0]!.score);
  });

  it('caso 10: single range con todos "yes" → resultado único', () => {
    const config: PollConfig = {
      ...baseConfig,
      allowedRanges: [{ start: day('2026-08-01'), end: day('2026-08-05') }],
      minTripDays: 5,
      maxTripDays: 5,
    };
    const members: UserId[] = ['a', 'b'].map(uid);
    const avs: UserAvailability[] = members.map((m) => ({
      userId: m,
      ranges: [
        { start: day('2026-08-01'), end: day('2026-08-05'), availability: 'available' },
      ],
    }));
    const r = computeDatePollCandidates(config, avs, members);
    expect(r.length).toBe(1);
    expect(r[0]!.start).toBe(day('2026-08-01'));
    expect(r[0]!.end).toBe(day('2026-08-05'));
    expect(r[0]!.rank).toBe(1);
    expect(r[0]!.rankReason).toContain('#1');
  });
});
