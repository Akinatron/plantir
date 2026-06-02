-- =============================================================================
-- Migración 11: settlements (settlement_suggestions + settlement_payments)
-- =============================================================================
-- settlement_suggestions -> resultado del algoritmo greedy min cash flow.
--                           Se regenera en cada cierre / recálculo.
-- settlement_payments    -> pagos reales confirmados (v1; definido en MVP).
--
-- Reglas:
--   * amount_cents > 0 (BIGINT).
--   * from_member_id <> to_member_id (constraint de no auto-pago).
--   * currency = trip.currency (validado por trigger).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: settlement_suggestions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlement_suggestions (
  id                     uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                uuid              NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  from_trip_member_id    uuid              NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  to_trip_member_id      uuid              NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  amount_cents           bigint            NOT NULL CHECK (amount_cents > 0),
  currency               char(3)           NOT NULL,
  status                 settlement_status NOT NULL DEFAULT 'proposed',
  note                   text              NULL,
  generated_at           timestamptz       NOT NULL DEFAULT now(),

  -- No auto-pago:
  CONSTRAINT chk_settlement_distinct_members
    CHECK (from_trip_member_id <> to_trip_member_id)
);

COMMENT ON TABLE  public.settlement_suggestions IS 'Sugerencia computada por el algoritmo greedy min cash flow. Recalculable.';
COMMENT ON COLUMN public.settlement_suggestions.status IS 'proposed -> confirmed (manual) -> cancelled.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_settlements_trip
  ON public.settlement_suggestions (trip_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip_status
  ON public.settlement_suggestions (trip_id, status);

-- Trigger: validar que ambos miembros pertenecen al trip y currency coincide.
CREATE OR REPLACE FUNCTION public.tg_check_settlement_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_trip   uuid;
  v_to_trip     uuid;
  v_currency    char(3);
BEGIN
  SELECT trip_id INTO v_from_trip
    FROM public.trip_members
   WHERE id = NEW.from_trip_member_id;
  IF v_from_trip IS NULL OR v_from_trip <> NEW.trip_id THEN
    RAISE EXCEPTION
      'settlement_invariant: from_trip_member_id % does not belong to trip %',
      NEW.from_trip_member_id, NEW.trip_id;
  END IF;

  SELECT trip_id INTO v_to_trip
    FROM public.trip_members
   WHERE id = NEW.to_trip_member_id;
  IF v_to_trip IS NULL OR v_to_trip <> NEW.trip_id THEN
    RAISE EXCEPTION
      'settlement_invariant: to_trip_member_id % does not belong to trip %',
      NEW.to_trip_member_id, NEW.trip_id;
  END IF;

  SELECT currency INTO v_currency
    FROM public.trips
   WHERE id = NEW.trip_id;
  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'settlement_invariant: trip % not found', NEW.trip_id;
  END IF;
  IF NEW.currency <> v_currency THEN
    RAISE EXCEPTION
      'settlement_invariant: settlement currency % differs from trip currency %',
      NEW.currency, v_currency;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_check_settlement_integrity()
  IS 'Garantiza que from/to members pertenecen al trip y currency coincide.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_settlement_integrity'
      AND tgrelid = 'public.settlement_suggestions'::regclass
  ) THEN
    CREATE TRIGGER trg_settlement_integrity
      BEFORE INSERT OR UPDATE ON public.settlement_suggestions
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_check_settlement_integrity();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tabla: settlement_payments
-- -----------------------------------------------------------------------------
-- Pago real confirmado. Puede (o no) estar vinculado a una suggestion.
-- Una vez confirmado, descuenta del balance (algoritmo de settlements lo
-- tiene en cuenta).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlement_payments (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                     uuid           NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  -- Vinculado opcionalmente a una suggestion (si el pago la satisface).
  settlement_suggestion_id    uuid           NULL REFERENCES public.settlement_suggestions(id) ON DELETE SET NULL,
  from_trip_member_id         uuid           NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  to_trip_member_id           uuid           NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  amount_cents                bigint         NOT NULL CHECK (amount_cents > 0),
  currency                    char(3)        NOT NULL,
  status                      payment_status NOT NULL DEFAULT 'pending',
  -- Quién confirmó (normalmente el cobrador).
  confirmed_by                uuid           NULL REFERENCES auth.users(id),
  confirmed_at                timestamptz    NULL,
  note                        text           NULL,
  -- Auditoría
  created_by                  uuid           NOT NULL REFERENCES auth.users(id),
  created_at                  timestamptz    NOT NULL DEFAULT now(),
  updated_at                  timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT chk_payment_distinct_members
    CHECK (from_trip_member_id <> to_trip_member_id),
  -- Si status=confirmed, debe haber confirmed_at y confirmed_by.
  CONSTRAINT chk_payment_confirmed_consistent
    CHECK (
      (status = 'confirmed' AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)
      OR
      (status <> 'confirmed')
    )
);

COMMENT ON TABLE  public.settlement_payments IS 'Pago real confirmado entre dos miembros (v1, definido en MVP).';

-- Índices
CREATE INDEX IF NOT EXISTS idx_settlement_payments_trip
  ON public.settlement_payments (trip_id);
CREATE INDEX IF NOT EXISTS idx_settlement_payments_trip_status
  ON public.settlement_payments (trip_id, status);
CREATE INDEX IF NOT EXISTS idx_settlement_payments_suggestion
  ON public.settlement_payments (settlement_suggestion_id);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_settlement_payments_updated_at'
      AND tgrelid = 'public.settlement_payments'::regclass
  ) THEN
    CREATE TRIGGER set_settlement_payments_updated_at
      BEFORE UPDATE ON public.settlement_payments
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS flags
-- -----------------------------------------------------------------------------
ALTER TABLE public.settlement_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_suggestions FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payments    FORCE  ROW LEVEL SECURITY;
