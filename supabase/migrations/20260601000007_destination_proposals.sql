-- =============================================================================
-- Migración 7: destination_proposals + destination_proposal_images +
--               destination_proposal_tags
-- =============================================================================
-- Propuestas de destino (kind='destination' poll).
-- 1 propuesta -> N imágenes -> N tags.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla principal: destination_proposals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.destination_proposals (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id                    uuid        NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  -- denormalizado desde polls para RLS más simple (no requiere join).
  trip_id                    uuid        NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title                      text        NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  description                text        NULL CHECK (description IS NULL OR length(description) <= 500),
  -- URL externa (Airbnb, Booking, Maps...). Validada en Zod con regex ^https?://.
  external_url               text        NULL,
  -- URL imagen principal (subida a storage en v1).
  image_url                  text        NULL,
  -- Path dentro del bucket 'proposal-images'. Preferido sobre image_url.
  image_storage_path         text        NULL,
  -- Coordenadas para mapa (v2).
  lat                        numeric(9,6) NULL CHECK (lat IS NULL OR lat BETWEEN -90  AND 90),
  lng                        numeric(9,6) NULL CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  -- Estimaciones de precio (en cents, bigint por seguridad multi-moneda).
  total_price_cents          bigint      NULL CHECK (total_price_cents          IS NULL OR total_price_cents          >= 0),
  price_per_person_cents     bigint      NULL CHECK (price_per_person_cents     IS NULL OR price_per_person_cents     >= 0),
  currency                   char(3)     NULL,
  -- Estado de la propuesta.
  status                     proposal_status NOT NULL DEFAULT 'active',
  created_by                 uuid        NOT NULL REFERENCES auth.users(id),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.destination_proposals              IS 'Destino propuesto por un miembro. Pertenece a un destination-poll.';
COMMENT ON COLUMN public.destination_proposals.poll_id      IS 'FK al poll (kind=destination).';
COMMENT ON COLUMN public.destination_proposals.trip_id      IS 'Denormalizado para RLS sin join.';
COMMENT ON COLUMN public.destination_proposals.image_url    IS 'URL externa (deprecada en favor de image_storage_path).';
COMMENT ON COLUMN public.destination_proposals.image_storage_path IS 'Path en bucket proposal-images/{poll_id}/...';

-- Índices
CREATE INDEX IF NOT EXISTS idx_destination_proposals_trip   ON public.destination_proposals (trip_id);
CREATE INDEX IF NOT EXISTS idx_destination_proposals_poll   ON public.destination_proposals (poll_id);
CREATE INDEX IF NOT EXISTS idx_destination_proposals_status ON public.destination_proposals (status);
CREATE INDEX IF NOT EXISTS idx_destination_proposals_creator ON public.destination_proposals (created_by);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_dest_proposals_updated_at'
      AND tgrelid = 'public.destination_proposals'::regclass
  ) THEN
    CREATE TRIGGER set_dest_proposals_updated_at
      BEFORE UPDATE ON public.destination_proposals
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tabla: destination_proposal_images
-- -----------------------------------------------------------------------------
-- 1 propuesta -> N imágenes. Orden por position ASC.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.destination_proposal_images (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id   uuid        NOT NULL REFERENCES public.destination_proposals(id) ON DELETE CASCADE,
  -- Path en bucket 'proposal-images' (RLS en storage_policies.sql).
  storage_path  text        NOT NULL,
  alt_text      text        NULL CHECK (alt_text IS NULL OR length(alt_text) <= 200),
  position      int         NOT NULL DEFAULT 0,
  width         int         NULL CHECK (width  IS NULL OR width  > 0),
  height        int         NULL CHECK (height IS NULL OR height > 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.destination_proposal_images
  IS 'Imágenes (1..N) de una destination_proposal. Path en bucket proposal-images.';

CREATE INDEX IF NOT EXISTS idx_dpi_proposal
  ON public.destination_proposal_images (proposal_id, position);

-- -----------------------------------------------------------------------------
-- Tabla: destination_proposal_tags
-- -----------------------------------------------------------------------------
-- Tags abiertos (string). Útil para filtrar en v1.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.destination_proposal_tags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid        NOT NULL REFERENCES public.destination_proposals(id) ON DELETE CASCADE,
  tag         text        NOT NULL CHECK (length(tag) BETWEEN 1 AND 40),
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_proposal_tag UNIQUE (proposal_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_dpt_proposal
  ON public.destination_proposal_tags (proposal_id);
-- Búsqueda de propuestas por tag:
CREATE INDEX IF NOT EXISTS idx_dpt_tag
  ON public.destination_proposal_tags (lower(tag));

-- -----------------------------------------------------------------------------
-- Deferred FK: trips.destination_proposal_id -> destination_proposals.id
-- -----------------------------------------------------------------------------
-- La columna ya existe en `trips` (migración 4). Aquí añadimos el FK con
-- INITIALLY DEFERRED para que un INSERT del proposal + UPDATE del trip
-- pueda ir en la misma transacción sin orden estricto.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_trips_destination_proposal'
      AND conrelid = 'public.trips'::regclass
  ) THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT fk_trips_destination_proposal
      FOREIGN KEY (destination_proposal_id)
      REFERENCES public.destination_proposals(id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS flags
-- -----------------------------------------------------------------------------
ALTER TABLE public.destination_proposals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_proposals         FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.destination_proposal_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_proposal_images    FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.destination_proposal_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_proposal_tags      FORCE  ROW LEVEL SECURITY;
