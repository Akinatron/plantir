-- =============================================================================
-- Migración 8: destination_votes
-- =============================================================================
-- Voto de un miembro sobre una destination_proposal. 1 fila por (poll,
-- proposal, user) -> upsert idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.destination_votes (
  id          uuid                   PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     uuid                   NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  proposal_id uuid                   NOT NULL REFERENCES public.destination_proposals(id) ON DELETE CASCADE,
  user_id     uuid                   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote        destination_vote_type  NOT NULL,
  -- Si la propuesta está withdrawn/rejected, el voto queda inactivo (no cuenta
  -- en el ranking) pero no se borra (preserva histórico).
  is_active   boolean                NOT NULL DEFAULT true,
  created_at  timestamptz            NOT NULL DEFAULT now(),
  updated_at  timestamptz            NOT NULL DEFAULT now(),

  -- Un voto por (poll, proposal, user).
  CONSTRAINT uniq_dest_vote_per_user_proposal UNIQUE (poll_id, proposal_id, user_id)
);

COMMENT ON TABLE  public.destination_votes          IS 'Voto up/down de un miembro sobre un destino. 1 fila por (poll,proposal,user).';
COMMENT ON COLUMN public.destination_votes.vote     IS 'up | down. (Borda rank 1-5 de TS queda fuera del MVP).';
COMMENT ON COLUMN public.destination_votes.is_active IS 'false si la propuesta fue retirada. El voto no cuenta en ranking.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_dest_votes_proposal
  ON public.destination_votes (proposal_id);
CREATE INDEX IF NOT EXISTS idx_dest_votes_poll_user
  ON public.destination_votes (poll_id, user_id);
CREATE INDEX IF NOT EXISTS idx_dest_votes_user
  ON public.destination_votes (user_id);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_dest_votes_updated_at'
      AND tgrelid = 'public.destination_votes'::regclass
  ) THEN
    CREATE TRIGGER set_dest_votes_updated_at
      BEFORE UPDATE ON public.destination_votes
      FOR EACH ROW
      EXECUTE FUNCTION public.tg_set_updated_at();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- RLS flag
-- -----------------------------------------------------------------------------
ALTER TABLE public.destination_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_votes FORCE  ROW LEVEL SECURITY;
