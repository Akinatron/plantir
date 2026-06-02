-- =============================================================================
-- Migración 2: Definición de todos los ENUMs del dominio
-- =============================================================================
-- Convenciones:
--   * Nombres en snake_case.
--   * Valores en minúsculas, sin prefijos.
--   * Idempotente: cada CREATE usa IF NOT EXISTS (PG 9.6+ no lo soporta para
--     TYPE; por eso se valida con un DO block).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Estados del viaje (9 estados según PRD §3.2)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
    CREATE TYPE trip_status AS ENUM (
      'group_created',   -- recién creado, aún sin poll abierto
      'voting_dates',    -- date poll abierto
      'date_decided',    -- fecha decidida, esperando pasar a voting_place
      'voting_place',    -- destination poll abierto
      'place_decided',   -- destino decidido
      'planning',        -- fase de planificación (tareas, reservas, etc.)
      'on_trip',         -- viaje en curso
      'settling_expenses',-- balances pendientes de liquidar
      'closed'           -- viaje cerrado y archivado
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Roles de un miembro dentro de un viaje
-- -----------------------------------------------------------------------------
-- Decisión: usamos 'organizer' | 'member' (alineado con src/types/index.ts
-- TripRole). PRD §3.2 decía 'owner' | 'member' — divergencia documentada en
-- supabase/rls.md y deliverable.md.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
    CREATE TYPE member_role AS ENUM (
      'organizer',  -- equivalente a "owner" del PRD: gestiona el viaje
      'member'      -- participante normal con derecho a voto
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Estado de la membresía
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE member_status AS ENUM (
      'active',     -- actualmente en el viaje
      'left',       -- salió voluntariamente (preserva histórico)
      'removed'     -- expulsado por el organizer (preserva histórico)
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tipos y estados de polls
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poll_type') THEN
    CREATE TYPE poll_type AS ENUM (
      'date',         -- poll de fechas
      'destination'   -- poll de destinos
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poll_status') THEN
    CREATE TYPE poll_status AS ENUM (
      'open',     -- aceptando votos / propuestas
      'closed'    -- cerrado: no acepta más entradas
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Nivel de disponibilidad para date_availability_votes
-- -----------------------------------------------------------------------------
-- Decisión: el task brief especifica 4 niveles ponderados
-- ('available', 'prefer', 'maybe', 'unavailable'). Pesos sugeridos:
--   available   -> 1.0
--   prefer      -> 1.5  (PRD §3.2 y briefing §caso 8)
--   maybe       -> 0.5  (briefing §caso 7)
--   unavailable -> 0.0
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_type') THEN
    CREATE TYPE availability_type AS ENUM (
      'available',
      'prefer',
      'maybe',
      'unavailable'
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tipo de voto sobre un destino
-- -----------------------------------------------------------------------------
-- Decisión: usamos 'up' | 'down' (PRD §3.1) por simplicidad y por encajar
-- con el ranking (up - down) mencionado en el PRD. El sistema Borda
-- (rank 1-5 de src/types/index.ts) queda fuera del MVP.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'destination_vote_type') THEN
    CREATE TYPE destination_vote_type AS ENUM (
      'up',
      'down'
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Estado de una DestinationProposal
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
    CREATE TYPE proposal_status AS ENUM (
      'active',       -- propuesta normal
      'withdrawn',    -- el autor la retiró
      'rejected'      -- descartada por el grupo / organizer
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Estado de una Task
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM (
      'todo',
      'doing',
      'done',
      'cancelled'
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Categoría de un Expense
-- -----------------------------------------------------------------------------
-- Lista cerrada del MVP (PRD §3.2). 6 categorías cubren el 95% de gastos.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
    CREATE TYPE expense_category AS ENUM (
      'accommodation',  -- alojamiento
      'transport',      -- transporte
      'food',           -- comida
      'activity',       -- actividades / entradas
      'shopping',       -- compras
      'other'           -- otros
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tipo de Expense: gasto normal vs ingreso/refund
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_type') THEN
    CREATE TYPE expense_type AS ENUM (
      'expense',  -- gasto normal (positivo, suma al balance)
      'income'    -- ingreso / refund (signo invertido, resta al balance)
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Estado de un Expense
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status') THEN
    CREATE TYPE expense_status AS ENUM (
      'draft',       -- borrador, sólo visible para el creator
      'confirmed',   -- confirmado, computa en balances
      'cancelled'    -- anulado, no computa
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Estrategia de reparto de un Expense
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'split_type') THEN
    CREATE TYPE split_type AS ENUM (
      'equal',    -- partes iguales (PRD §3.1, AC-6.1.3)
      'shares',   -- por "shares" (peso)
      'percent',  -- por porcentaje (suma = 100)
      'manual'    -- importes exactos por miembro
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Estado de un Settlement (sugerencia computada)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_status') THEN
    CREATE TYPE settlement_status AS ENUM (
      'proposed',   -- calculado por el algoritmo, aún no confirmado
      'confirmed',  -- ambas partes confirman el pago
      'cancelled'   -- cancelado
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Estado de un Payment (pago real confirmado)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'pending',     -- iniciado pero no confirmado
      'confirmed',   -- confirmado por el cobrador
      'cancelled'    -- cancelado
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tipos de actividad registrados en activity_log
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE activity_type AS ENUM (
      'trip_created',
      'trip_updated',
      'trip_closed',
      'member_joined',
      'member_left',
      'member_removed',
      'invite_created',
      'invite_revoked',
      'invite_accepted',
      'poll_opened',
      'poll_closed',
      'date_vote_cast',
      'destination_proposed',
      'destination_vote_cast',
      'destination_chosen',
      'date_chosen',
      'task_created',
      'task_completed',
      'expense_created',
      'expense_updated',
      'expense_deleted',
      'settlement_suggested',
      'settlement_paid'
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tipos de notificación
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'invite_received',
      'member_joined',
      'date_poll_opened',
      'date_poll_closed',
      'destination_poll_opened',
      'destination_chosen',
      'expense_added',
      'settlement_proposed',
      'settlement_confirmed',
      'trip_closed',
      'generic'
    );
  END IF;
END
$$;
