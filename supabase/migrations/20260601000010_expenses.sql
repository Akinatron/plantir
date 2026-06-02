-- =============================================================================
-- Migración 10: expenses + expense_payers + expense_splits
-- =============================================================================
-- expenses           -> cabecera del gasto
-- expense_payers     -> pagadores múltiples (v1, pero definido en MVP)
-- expense_splits     -> reparto entre miembros (equal / shares / percent / manual)
--
-- Decisiones clave:
--   * amount_cents es BIGINT (no int): PRD §3.4 explicita la decisión por
--     seguridad futura multi-moneda. El task brief sugería int; divergencia
--     documentada en deliverable.md.
--   * paid_by / created_by usan trip_member_id (no user_id) para multi-tenancy
--     seguro: si un user sale del trip, sus gastos históricos se preservan
--     sin perder FK.
--   * expense_type = 'income' permite refunds (v1, definido en MVP).
--   * Suma de splits percentage = 100% se valida con trigger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: expenses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id                          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                     uuid           NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title                       text           NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  description                 text           NULL,
  -- BIGINT por seguridad multi-moneda (PRD §3.4). > 0 por invariante.
  amount_cents                bigint         NOT NULL CHECK (amount_cents > 0),
  -- ISO-4217 3 letras. En MVP debe coincidir con trips.currency (validado
  -- por trigger).
  currency                    char(3)        NOT NULL,
  -- Fecha en que se pagó (no cuándo se creó el registro). date sin hora.
  paid_at                     date           NOT NULL,
  -- FK a trip_members (no a auth.users) para multi-tenancy seguro.
  paid_by_trip_member_id      uuid           NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  category                    expense_category NOT NULL,
  -- expense | income (income = refund).
  type                        expense_type   NOT NULL DEFAULT 'expense',
  -- draft | confirmed | cancelled. Solo confirmed cuenta en balances.
  status                      expense_status NOT NULL DEFAULT 'confirmed',
  -- Estrategia de reparto.
  strategy                    split_type     NOT NULL DEFAULT 'equal',
  note                        text           NULL,
  -- Path en bucket 'receipts' (v1). null en MVP.
  receipt_storage_path        text           NULL,
  -- Auditoría
  created_by_trip_member_id   uuid           NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  created_at                  timestamptz    NOT NULL DEFAULT now(),
  updated_at                  timestamptz    NOT NULL DEFAULT now(),
  -- Soft delete (PRD §5.2: borrado con borrado de splits, pero
  -- soft-delete se prefiere para auditoría; cascade va por deleted_at).
  deleted_at                  timestamptz    NULL
);

COMMENT ON TABLE  public.expenses              IS 'Gasto del viaje. amount_cents BIGINT, currency char(3).';
COMMENT ON COLUMN public.expenses.paid_by_trip_member_id
  IS 'FK a trip_members (no a users) para preservar histórico si el user sale.';
COMMENT ON COLUMN public.expenses.deleted_at  IS 'Soft delete. Cuando != null, la fila se ignora en balances.';
COMMENT ON COLUMN public.expenses.strategy    IS 'equal | shares | percent | manual.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_expenses_trip        ON public.expenses (trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_at     ON public.expenses (paid_at);
CREATE INDEX IF NOT EXISTS idx_expenses_category    ON public.expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_status      ON public.expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_payer       ON public.expenses (paid_by_trip_member_id);
-- Gastos activos (no soft-deleted) por trip:
CREATE INDEX IF NOT EXISTS idx_expenses_trip_active
  ON public.expenses (trip_id)
  WHERE deleted_at IS NULL;

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_expenses_updated_at'
      AND tgrelid = 'public.expenses'::regclass
  ) THEN
    CREATE TRIGGER set_expenses_updated_at
      BEFORE UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- Trigger: validar que currency del expense coincide con trips.currency
CREATE OR REPLACE FUNCTION public.tg_check_expense_currency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip_currency char(3);
BEGIN
  SELECT currency INTO v_trip_currency
    FROM public.trips
   WHERE id = NEW.trip_id;

  IF v_trip_currency IS NULL THEN
    RAISE EXCEPTION 'expense_invariant: trip % not found', NEW.trip_id;
  END IF;

  IF NEW.currency <> v_trip_currency THEN
    RAISE EXCEPTION
      'expense_invariant: expense currency % differs from trip currency %',
      NEW.currency, v_trip_currency;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_check_expense_currency()
  IS 'Garantiza que expense.currency == trip.currency (regla dura MVP).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_expense_currency_check'
      AND tgrelid = 'public.expenses'::regclass
  ) THEN
    CREATE TRIGGER trg_expense_currency_check
      BEFORE INSERT OR UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_check_expense_currency();
  END IF;
END
$$;

-- Trigger: validar que paid_by_trip_member y created_by_trip_member
-- pertenecen al mismo trip.
CREATE OR REPLACE FUNCTION public.tg_check_expense_member_belongs_trip()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_paid_trip     uuid;
  v_creator_trip  uuid;
BEGIN
  SELECT trip_id INTO v_paid_trip
    FROM public.trip_members
   WHERE id = NEW.paid_by_trip_member_id;

  IF v_paid_trip IS NULL OR v_paid_trip <> NEW.trip_id THEN
    RAISE EXCEPTION
      'expense_invariant: paid_by_trip_member_id % does not belong to trip %',
      NEW.paid_by_trip_member_id, NEW.trip_id;
  END IF;

  SELECT trip_id INTO v_creator_trip
    FROM public.trip_members
   WHERE id = NEW.created_by_trip_member_id;

  IF v_creator_trip IS NULL OR v_creator_trip <> NEW.trip_id THEN
    RAISE EXCEPTION
      'expense_invariant: created_by_trip_member_id % does not belong to trip %',
      NEW.created_by_trip_member_id, NEW.trip_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_check_expense_member_belongs_trip()
  IS 'Garantiza que paid_by / created_by pertenecen al trip del expense.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_expense_member_belongs_trip'
      AND tgrelid = 'public.expenses'::regclass
  ) THEN
    CREATE TRIGGER trg_expense_member_belongs_trip
      BEFORE INSERT OR UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_check_expense_member_belongs_trip();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Tabla: expense_payers
-- -----------------------------------------------------------------------------
-- Múltiples pagadores por expense. En MVP, lo habitual es 1 pagador; la
-- tabla existe desde MVP para que añadir un 2º pagador en v1 no requiera
-- migración de esquema.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_payers (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id           uuid        NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  trip_member_id       uuid        NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  amount_cents         bigint      NOT NULL CHECK (amount_cents > 0),
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uniq_expense_payer UNIQUE (expense_id, trip_member_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_payers_expense ON public.expense_payers (expense_id);

-- -----------------------------------------------------------------------------
-- Tabla: expense_splits
-- -----------------------------------------------------------------------------
-- Reparto de un expense entre trip_members. Cada fila es 1 miembro.
-- - 'equal' / 'manual'  -> amount_cents
-- - 'percent'           -> percentage (0..100). La suma por expense debe ser 100.
-- - 'shares'            -> shares (> 0). El algoritmo calcula amount = total * share / sum(shares).
-- included=false excluye al miembro del reparto (no genera balance).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id          uuid           NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  trip_member_id      uuid           NOT NULL REFERENCES public.trip_members(id) ON DELETE RESTRICT,
  -- amount_cents: presente en 'equal' y 'manual'. En 'percent' y 'shares' se
  -- calcula en cliente al insertar y se persiste por histórico.
  amount_cents        bigint         NULL CHECK (amount_cents IS NULL OR amount_cents >= 0),
  -- percentage: presente solo si strategy='percent'. 0..100.
  percentage         numeric(5,2)   NULL CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  -- shares: presente solo si strategy='shares'. > 0.
  shares             numeric(10,2)  NULL CHECK (shares IS NULL OR shares > 0),
  -- included=false excluye al miembro del split. Por defecto true.
  included            boolean        NOT NULL DEFAULT true,
  created_at          timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT uniq_expense_split UNIQUE (expense_id, trip_member_id)
);

COMMENT ON TABLE  public.expense_splits            IS 'Reparto de un expense. amount_cents para equal/manual, percentage para percent, shares para shares.';
COMMENT ON COLUMN public.expense_splits.included   IS 'false excluye al miembro del reparto (no genera balance).';

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits (expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_member  ON public.expense_splits (trip_member_id);

-- -----------------------------------------------------------------------------
-- Trigger: validar suma de percentages = 100 en splits de tipo 'percent'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_check_split_percentages_sum()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_strategy split_type;
  v_sum      numeric(10,2);
BEGIN
  -- Solo nos importa la operación que afecta al expense.
  -- Para INSERT/UPDATE, miramos el strategy del expense.
  IF TG_OP = 'DELETE' THEN
    SELECT strategy INTO v_strategy FROM public.expenses WHERE id = OLD.expense_id;
  ELSE
    SELECT strategy INTO v_strategy FROM public.expenses WHERE id = NEW.expense_id;
  END IF;

  -- Solo aplicamos la invariante para strategy='percent' (con redondeo ±0.01).
  IF v_strategy = 'percent' THEN
    SELECT COALESCE(SUM(percentage), 0) INTO v_sum
      FROM public.expense_splits
     WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id)
       AND included = true;

    IF ABS(v_sum - 100) > 0.01 THEN
      RAISE EXCEPTION
        'expense_invariant: sum of percentages for expense % is % (must be 100)',
        COALESCE(NEW.expense_id, OLD.expense_id), v_sum;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.tg_check_split_percentages_sum()
  IS 'Invariante: para expenses con strategy=percent, la suma de percentages (included=true) debe ser 100.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_split_percentages'
      AND tgrelid = 'public.expense_splits'::regclass
  ) THEN
    CREATE TRIGGER trg_check_split_percentages
      AFTER INSERT OR UPDATE OR DELETE ON public.expense_splits
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_check_split_percentages_sum();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Trigger: validar que amount_cents se rellena para strategy equal/manual,
-- y percentage/shares para percent/shares.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_check_split_fields_match_strategy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_strategy split_type;
BEGIN
  SELECT strategy INTO v_strategy FROM public.expenses WHERE id = NEW.expense_id;

  IF v_strategy IN ('equal', 'manual') AND NEW.amount_cents IS NULL THEN
    RAISE EXCEPTION
      'expense_invariant: amount_cents is required for strategy=%', v_strategy;
  END IF;

  IF v_strategy = 'percent' AND NEW.percentage IS NULL THEN
    RAISE EXCEPTION
      'expense_invariant: percentage is required for strategy=percent';
  END IF;

  IF v_strategy = 'shares' AND NEW.shares IS NULL THEN
    RAISE EXCEPTION
      'expense_invariant: shares is required for strategy=shares';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_check_split_fields_match_strategy()
  IS 'Garantiza que cada split tiene el campo correcto según la strategy del expense.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_check_split_strategy_fields'
      AND tgrelid = 'public.expense_splits'::regclass
  ) THEN
    CREATE TRIGGER trg_check_split_strategy_fields
      BEFORE INSERT OR UPDATE ON public.expense_splits
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_check_split_fields_match_strategy();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS flags
-- -----------------------------------------------------------------------------
ALTER TABLE public.expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses        FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers  FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits  FORCE  ROW LEVEL SECURITY;
