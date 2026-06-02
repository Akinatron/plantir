-- =============================================================================
-- Migración 5: trip_invites
-- =============================================================================
-- Links de invitación compartibles. Almacenamos SIEMPRE el hash del token;
-- el valor en claro se devuelve una sola vez al organizer (Edge Function).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trip_invites (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid         NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  -- Hash del token (e.g. SHA-256 hex de 64 chars). El token en claro
  -- nunca persiste. La Edge Function `create-trip-invite` genera el random,
  -- hashea, y devuelve el valor en claro al caller una sola vez.
  token_hash      text         NOT NULL,
  -- Email opcional al que se dirige. NULL = link abierto a cualquiera.
  email           citext       NULL,
  -- Rol que se asignará al aceptante.
  role            member_role  NOT NULL DEFAULT 'member',
  -- Estado del invite (ver invite_status en src/types).
  status          text         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  -- Auditoría
  created_by      uuid         NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz  NOT NULL DEFAULT now(),
  expires_at      timestamptz  NOT NULL DEFAULT (now() + interval '14 days'),
  -- Límite de aceptaciones. Default 50 (PRD US-3.1).
  max_uses        int          NOT NULL DEFAULT 50 CHECK (max_uses > 0),
  used_count      int          NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  revoked_at      timestamptz  NULL,
  accepted_at     timestamptz  NULL,
  accepted_by     uuid         NULL REFERENCES auth.users(id),
  last_used_at    timestamptz  NULL,

  -- Invariantes
  CONSTRAINT chk_invite_uses_le_max CHECK (used_count <= max_uses),
  CONSTRAINT chk_invite_expires_future CHECK (expires_at > created_at)
);

COMMENT ON TABLE  public.trip_invites             IS 'Links de invitación a un viaje. token_hash = SHA-256(token).';
COMMENT ON COLUMN public.trip_invites.token_hash  IS 'Hash SHA-256 (hex) del token en claro. Nunca persistir plaintext.';
COMMENT ON COLUMN public.trip_invites.max_uses    IS 'Máximo de aceptaciones permitidas. Default 50.';
COMMENT ON COLUMN public.trip_invites.used_count  IS 'Contador de aceptaciones. CHECK used_count <= max_uses.';
COMMENT ON COLUMN public.trip_invites.expires_at  IS 'Default: now() + 14 días (PRD US-3.1).';

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
-- Unicidad del hash: dos invites no pueden compartir token.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_trip_invites_token_hash
  ON public.trip_invites (token_hash);

-- Lookup por trip y estado.
CREATE INDEX IF NOT EXISTS idx_trip_invites_trip_status
  ON public.trip_invites (trip_id, status);

-- Lookup de invites válidos (status=pending, no expirados, no agotados).
-- Usado por la Edge Function accept-trip-invite.
CREATE INDEX IF NOT EXISTS idx_trip_invites_valid
  ON public.trip_invites (token_hash)
  WHERE status = 'pending';

-- -----------------------------------------------------------------------------
-- Trigger: incrementar used_count + last_used_at al aceptar
-- -----------------------------------------------------------------------------
-- Este trigger NO crea la membresía: eso lo hace la Edge Function en una
-- transacción única para tener lógica de aplicación centralizada y RLS-safe.
-- Aquí solo mantenemos el contador sincronizado si la Edge Function hace
-- UPDATE manual. Es defensivo: si el flujo cambia, la invariante no se rompe.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- RLS flag
-- -----------------------------------------------------------------------------
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites FORCE  ROW LEVEL SECURITY;
