/**
 * Plantir — contratos TypeScript del dominio
 *
 * Archivo: src/types/index.ts
 * Fase 1: solo tipos, cero lógica, cero imports runtime.
 *
 * Reglas:
 *  - Tipos puros, sin dependencias de React, Supabase, RHF o NativeWind.
 *  - Importables desde `app/`, `services/`, `features/`, `lib/` y tests.
 *  - Enums como union types de literales (no `enum` de TS) para tree-shaking.
 *  - IDs como branded types para evitar mezclas accidentales.
 *  - Money SIEMPRE en integer cents (nunca `number` con decimales).
 *  - Fechas SIEMPRE en UTC ISO-8601 string (nunca `Date` ni timestamps sueltos).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Branded types — para que TypeScript distinga IDs y montos en compile time
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type TripId = Brand<string, 'TripId'>;
export type TripMemberId = Brand<string, 'TripMemberId'>;
export type TripInviteId = Brand<string, 'TripInviteId'>;
export type PollId = Brand<string, 'PollId'>;
export type DateAvailabilityVoteId = Brand<string, 'DateAvailabilityVoteId'>;
export type DestinationProposalId = Brand<string, 'DestinationProposalId'>;
export type DestinationVoteId = Brand<string, 'DestinationVoteId'>;
export type ExpenseId = Brand<string, 'ExpenseId'>;
export type ExpenseSplitId = Brand<string, 'ExpenseSplitId'>;
export type SettlementId = Brand<string, 'SettlementId'>;
export type TaskId = Brand<string, 'TaskId'>;

/** ISO-8601 UTC, ej. `"2026-06-15T08:00:00.000Z"`. */
export type ISODateString = Brand<string, 'ISODateString'>;

/** Integer cents. Para EUR: 1 € = 100. Sin decimales. */
export type Cents = Brand<number, 'Cents'>;

/** ISO-4217, ej. `"EUR"`, `"USD"`. Default MVP: `"EUR"`. */
export type CurrencyCode = Brand<string, 'CurrencyCode'>;

/** UUID v4 string. */
export type UUID = Brand<string, 'UUID'>;

// ─────────────────────────────────────────────────────────────────────────────
// Estados del viaje — canónico, sincronizado con docs/00-briefing.md §"Estados"
// ─────────────────────────────────────────────────────────────────────────────

export type TripState =
  | 'group_created'
  | 'voting_dates'
  | 'date_decided'
  | 'voting_place'
  | 'place_decided'
  | 'planning'
  | 'on_trip'
  | 'settling_expenses'
  | 'closed';

// ─────────────────────────────────────────────────────────────────────────────
// Roles y permisos
// ─────────────────────────────────────────────────────────────────────────────

export type TripRole = 'organizer' | 'member';

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

// ─────────────────────────────────────────────────────────────────────────────
// Trip
// ─────────────────────────────────────────────────────────────────────────────

export interface Trip {
  id: TripId;
  name: string;
  description: string | null;
  state: TripState;

  /** Fechas decididas. `null` hasta `date_decided`. */
  startDate: ISODateString | null;
  endDate: ISODateString | null;

  /** Destino decidido. `null` hasta `place_decided`. */
  destinationProposalId: DestinationProposalId | null;

  currency: CurrencyCode;
  createdBy: UserId;
  createdAt: ISODateString;
  updatedAt: ISODateString;

  /** Soft delete. `null` si activo. */
  archivedAt: ISODateString | null;
}

export interface NewTripInput {
  name: string;
  description?: string | null;
  currency: CurrencyCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// TripMember
// ─────────────────────────────────────────────────────────────────────────────

export interface TripMember {
  id: TripMemberId;
  tripId: TripId;
  userId: UserId;
  role: TripRole;
  /** Display name cacheado del usuario en el momento del join. */
  displayName: string;
  avatarUrl: string | null;
  joinedAt: ISODateString;
  /** `true` si abandonó el viaje. No se borra para preservar histórico de balances. */
  leftAt: ISODateString | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TripInvite
// ─────────────────────────────────────────────────────────────────────────────

export interface TripInvite {
  id: TripInviteId;
  tripId: TripId;
  /** Token opaco que va en el deep link. Único, no adivinable. */
  token: string;
  /** Email destino opcional. `null` = link abierto a cualquiera que lo tenga. */
  email: string | null;
  role: TripRole;
  status: InviteStatus;
  createdBy: UserId;
  createdAt: ISODateString;
  expiresAt: ISODateString;
  acceptedAt: ISODateString | null;
  acceptedBy: UserId | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Poll — contenedor genérico para date poll y destination poll
// ─────────────────────────────────────────────────────────────────────────────

export type PollKind = 'date' | 'destination';
export type PollStatus = 'open' | 'closed';

export interface Poll {
  id: PollId;
  tripId: TripId;
  kind: PollKind;
  status: PollStatus;
  title: string;
  /** Cierra automáticamente. `null` = abierto hasta acción manual. */
  closesAt: ISODateString | null;
  createdBy: UserId;
  createdAt: ISODateString;
  closedAt: ISODateString | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DateAvailabilityVote
// ─────────────────────────────────────────────────────────────────────────────

/** Disponibilidad del usuario para una fecha concreta del poll. */
export type AvailabilityLevel = 'yes' | 'maybe' | 'no';

export interface DateAvailabilityVote {
  id: DateAvailabilityVoteId;
  pollId: PollId;
  userId: UserId;
  /** Día (sin hora) en UTC. ej. `"2026-06-15"`. */
  day: string;
  level: AvailabilityLevel;
  note: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// DestinationProposal
// ─────────────────────────────────────────────────────────────────────────────

export interface DestinationProposal {
  id: DestinationProposalId;
  pollId: PollId;
  title: string;
  description: string | null;
  /** URL externa (Airbnb, Booking, Google Maps, etc.). */
  externalUrl: string | null;
  /** Imagen principal del destino. */
  imageUrl: string | null;
  /** Coordenadas opcionales para el mapa (v2). */
  lat: number | null;
  lng: number | null;
  /** Estimación de coste total en cents, por persona. */
  estimatedCostPerPersonCents: Cents | null;
  currency: CurrencyCode;
  createdBy: UserId;
  createdAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// DestinationVote
// ─────────────────────────────────────────────────────────────────────────────

/** Puntuación ordinal usada por el algoritmo Borda. */
export type BordaRank = 1 | 2 | 3 | 4 | 5;

export interface DestinationVote {
  id: DestinationVoteId;
  pollId: PollId;
  proposalId: DestinationProposalId;
  userId: UserId;
  /** Ranking del usuario para esta propuesta (1 = favorito). */
  rank: BordaRank;
  createdAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Expense
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'accommodation'
  | 'transport'
  | 'food'
  | 'activity'
  | 'shopping'
  | 'other';

export type ExpenseSplitStrategy = 'equal' | 'shares' | 'percent' | 'manual';

export interface Expense {
  id: ExpenseId;
  tripId: TripId;
  paidBy: UserId;
  title: string;
  description: string | null;
  category: ExpenseCategory;
  amountCents: Cents;
  currency: CurrencyCode;
  /** Fecha en que se pagó (no cuándo se creó el registro). */
  occurredAt: ISODateString;
  strategy: ExpenseSplitStrategy;
  /** Si `true`, solo cuentan los miembros con `included=true` en los splits. */
  excludesNonParticipants: boolean;
  createdBy: UserId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseSplit
// ─────────────────────────────────────────────────────────────────────────────

export interface ExpenseSplit {
  id: ExpenseSplitId;
  expenseId: ExpenseId;
  userId: UserId;
  /** Lo que este usuario debe de este expense. SIEMPRE en cents. */
  amountCents: Cents;
  /** Para `strategy=shares`: peso que aporta este usuario. */
  shares: number | null;
  /** Para `strategy=percent`: 0..100. Validado en Zod. */
  percent: number | null;
  /** Si `false`, el miembro está excluido de este split. */
  included: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settlement
// ─────────────────────────────────────────────────────────────────────────────

export type SettlementStatus = 'proposed' | 'confirmed' | 'cancelled';

export interface Settlement {
  id: SettlementId;
  tripId: TripId;
  fromUser: UserId;
  toUser: UserId;
  amountCents: Cents;
  currency: CurrencyCode;
  status: SettlementStatus;
  note: string | null;
  proposedAt: ISODateString;
  proposedBy: UserId;
  confirmedAt: ISODateString | null;
  cancelledAt: ISODateString | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task (habilitado en v1, declarado en MVP para no romper tipos en migración)
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'doing' | 'done' | 'cancelled';

export interface Task {
  id: TaskId;
  tripId: TripId;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: UserId | null;
  dueAt: ISODateString | null;
  createdBy: UserId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errores de la capa de servicios (forma del resultado, no excepción)
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceErrorKind =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export interface ServiceError {
  kind: ServiceErrorKind;
  message: string;
  /** Código HTTP si viene del backend (`PostgrestError` lo trae). */
  status: number | null;
  /** Error original, para logging. Nunca se muestra al usuario. */
  cause: unknown;
  /** Issues de validación estructurados (Zod). */
  issues: ReadonlyArray<{ path: string; message: string }> | null;
}

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceError };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de marca (runtime no-op, solo satisface al compilador)
// ─────────────────────────────────────────────────────────────────────────────

/** Cast seguro a `UserId` (solo donde el origen ya está validado). */
export const asUserId = (v: string): UserId => v as UserId;
export const asTripId = (v: string): TripId => v as TripId;
export const asISODate = (v: string): ISODateString => v as ISODateString;
export const asCents = (n: number): Cents => {
  if (!Number.isInteger(n)) {
    throw new Error(`Cents debe ser integer, recibido: ${n}`);
  }
  return n as Cents;
};
export const asCurrency = (s: string): CurrencyCode => s as CurrencyCode;
