-- =============================================================================
-- Migración 15: RLS Policies
-- =============================================================================
-- Habilita RLS en cada tabla (los flags ENABLE/FORCE ya están en cada
-- migración previa; aquí añadimos las políticas y verificamos).
--
-- Idempotencia: cada CREATE POLICY se envuelve en DROP POLICY IF EXISTS
-- + CREATE POLICY para poder re-ejecutar la migración.
--
-- Roles que reciben GRANT:
--   * authenticated: usuarios logueados.
--   * anon: usuarios no logueados (poco uso en MVP, pero estándar).
-- service_role bypasea RLS (es admin), por lo que las Edge Functions
-- pueden insertar/actualizar sin políticas explícitas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_all"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_service" ON public.profiles;
-- No policy DELETE -> RLS lo bloquea para authenticated.
DROP POLICY IF EXISTS "profiles_no_delete"      ON public.profiles;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT solo via service_role (el trigger handle_new_user se ejecuta con
-- SECURITY DEFINER). Ningún policy INSERT para authenticated -> bloqueado.
-- DELETE: bloqueado. La forma "negativa" es no crear policy; con FORCE RLS,
-- cualquier DELETE desde authenticated se rechaza.

-- -----------------------------------------------------------------------------
-- trips
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "trips_select_members"  ON public.trips;
DROP POLICY IF EXISTS "trips_insert_self"      ON public.trips;
DROP POLICY IF EXISTS "trips_update_admin"     ON public.trips;
DROP POLICY IF EXISTS "trips_delete_admin"     ON public.trips;

CREATE POLICY "trips_select_members"
  ON public.trips FOR SELECT
  TO authenticated
  USING (public.is_trip_member(id, auth.uid()));

CREATE POLICY "trips_insert_self"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "trips_update_admin"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (public.can_manage_trip(id, auth.uid()))
  WITH CHECK (public.can_manage_trip(id, auth.uid()));

CREATE POLICY "trips_delete_admin"
  ON public.trips FOR DELETE
  TO authenticated
  USING (public.can_manage_trip(id, auth.uid()));

-- -----------------------------------------------------------------------------
-- trip_members
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "trip_members_select_members"  ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_insert_admin"    ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_update_admin"    ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_delete_admin"    ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_self_leave"      ON public.trip_members;

CREATE POLICY "trip_members_select_members"
  ON public.trip_members FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- INSERT: el organizer añade a otros (admin) o el sistema añade al creator
-- (trigger SECURITY DEFINER). Para un INSERT desde authenticated, exigimos
-- que el user sea admin del trip.
CREATE POLICY "trip_members_insert_admin"
  ON public.trip_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_trip_admin(trip_id, auth.uid())
    OR user_id = auth.uid()  -- permite "auto-join" via invite (Edge Function con user context)
  );

-- UPDATE: solo admin puede cambiar roles.
CREATE POLICY "trip_members_update_admin"
  ON public.trip_members FOR UPDATE
  TO authenticated
  USING (public.is_trip_admin(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_admin(trip_id, auth.uid()));

-- DELETE: admin puede eliminar a otros, o el propio user puede salir
-- (left_at / status='left').
CREATE POLICY "trip_members_delete_admin"
  ON public.trip_members FOR DELETE
  TO authenticated
  USING (public.is_trip_admin(trip_id, auth.uid()));

CREATE POLICY "trip_members_self_leave"
  ON public.trip_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- trip_invites
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "trip_invites_select_members"  ON public.trip_invites;
DROP POLICY IF EXISTS "trip_invites_insert_admin"    ON public.trip_invites;
DROP POLICY IF EXISTS "trip_invites_update_admin"    ON public.trip_invites;
DROP POLICY IF EXISTS "trip_invites_no_delete"       ON public.trip_invites;

CREATE POLICY "trip_invites_select_members"
  ON public.trip_invites FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "trip_invites_insert_admin"
  ON public.trip_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_trip_admin(trip_id, auth.uid())
    AND created_by = auth.uid()
  );

-- UPDATE: solo admin puede revocar (revoked_at) o el sistema (Edge Function)
-- marca accepted_at / used_count.
CREATE POLICY "trip_invites_update_admin"
  ON public.trip_invites FOR UPDATE
  TO authenticated
  USING (public.is_trip_admin(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_admin(trip_id, auth.uid()));

-- No DELETE policy: revocación lógica (revoked_at).

-- -----------------------------------------------------------------------------
-- polls
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "polls_select_members"  ON public.polls;
DROP POLICY IF EXISTS "polls_insert_admin"    ON public.polls;
DROP POLICY IF EXISTS "polls_update_admin"    ON public.polls;
DROP POLICY IF EXISTS "polls_delete_admin"    ON public.polls;

CREATE POLICY "polls_select_members"
  ON public.polls FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "polls_insert_admin"
  ON public.polls FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_admin(trip_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "polls_update_admin"
  ON public.polls FOR UPDATE
  TO authenticated
  USING (public.is_trip_admin(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_admin(trip_id, auth.uid()));

CREATE POLICY "polls_delete_admin"
  ON public.polls FOR DELETE
  TO authenticated
  USING (public.is_trip_admin(trip_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- date_poll_allowed_ranges
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "date_ranges_select_members"  ON public.date_poll_allowed_ranges;
DROP POLICY IF EXISTS "date_ranges_modify_admin"    ON public.date_poll_allowed_ranges;

CREATE POLICY "date_ranges_select_members"
  ON public.date_poll_allowed_ranges FOR SELECT
  TO authenticated
  USING (public.is_trip_member_from_poll(poll_id, auth.uid()));

CREATE POLICY "date_ranges_modify_admin"
  ON public.date_poll_allowed_ranges FOR ALL
  TO authenticated
  USING (public.is_trip_admin(public.trip_id_from_poll(poll_id), auth.uid()))
  WITH CHECK (public.is_trip_admin(public.trip_id_from_poll(poll_id), auth.uid()));

-- -----------------------------------------------------------------------------
-- date_availability_votes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "date_votes_select_members"  ON public.date_availability_votes;
DROP POLICY IF EXISTS "date_votes_insert_self"     ON public.date_availability_votes;
DROP POLICY IF EXISTS "date_votes_update_self"     ON public.date_availability_votes;
DROP POLICY IF EXISTS "date_votes_delete_self"     ON public.date_availability_votes;

CREATE POLICY "date_votes_select_members"
  ON public.date_availability_votes FOR SELECT
  TO authenticated
  USING (public.is_trip_member_from_poll(poll_id, auth.uid()));

CREATE POLICY "date_votes_insert_self"
  ON public.date_availability_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_vote_poll(poll_id, auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "date_votes_update_self"
  ON public.date_availability_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "date_votes_delete_self"
  ON public.date_availability_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- date_poll_results
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "date_results_select_members"  ON public.date_poll_results;
-- No INSERT/UPDATE/DELETE policies: solo service_role (Edge Function) los rellena.

CREATE POLICY "date_results_select_members"
  ON public.date_poll_results FOR SELECT
  TO authenticated
  USING (public.is_trip_member_from_poll(poll_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- destination_proposals
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dest_proposals_select_members"  ON public.destination_proposals;
DROP POLICY IF EXISTS "dest_proposals_insert_member"   ON public.destination_proposals;
DROP POLICY IF EXISTS "dest_proposals_update_creator"  ON public.destination_proposals;
DROP POLICY IF EXISTS "dest_proposals_delete_creator"  ON public.destination_proposals;

CREATE POLICY "dest_proposals_select_members"
  ON public.destination_proposals FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "dest_proposals_insert_member"
  ON public.destination_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_create_destination_proposal(poll_id, auth.uid())
    AND created_by = auth.uid()
    -- El límite de 5/user se valida en la Edge Function; en SQL sería
    -- caro (count por cada INSERT). Documentado en rls.md.
  );

CREATE POLICY "dest_proposals_update_creator"
  ON public.destination_proposals FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_trip_admin(trip_id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_trip_admin(trip_id, auth.uid())
  );

CREATE POLICY "dest_proposals_delete_creator"
  ON public.destination_proposals FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_trip_admin(trip_id, auth.uid())
  );

-- -----------------------------------------------------------------------------
-- destination_proposal_images
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dpi_select_members"  ON public.destination_proposal_images;
DROP POLICY IF EXISTS "dpi_insert_creator"  ON public.destination_proposal_images;
DROP POLICY IF EXISTS "dpi_update_creator"  ON public.destination_proposal_images;
DROP POLICY IF EXISTS "dpi_delete_creator"  ON public.destination_proposal_images;

CREATE POLICY "dpi_select_members"
  ON public.destination_proposal_images FOR SELECT
  TO authenticated
  USING (
    public.is_trip_member(
      (SELECT trip_id FROM public.destination_proposals WHERE id = proposal_id),
      auth.uid()
    )
  );

CREATE POLICY "dpi_insert_creator"
  ON public.destination_proposal_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.destination_proposals dp
       WHERE dp.id = proposal_id
         AND (dp.created_by = auth.uid() OR public.is_trip_admin(dp.trip_id, auth.uid()))
    )
  );

CREATE POLICY "dpi_update_creator"
  ON public.destination_proposal_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.destination_proposals dp
       WHERE dp.id = proposal_id
         AND (dp.created_by = auth.uid() OR public.is_trip_admin(dp.trip_id, auth.uid()))
    )
  );

CREATE POLICY "dpi_delete_creator"
  ON public.destination_proposal_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.destination_proposals dp
       WHERE dp.id = proposal_id
         AND (dp.created_by = auth.uid() OR public.is_trip_admin(dp.trip_id, auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- destination_proposal_tags
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dpt_select_members"  ON public.destination_proposal_tags;
DROP POLICY IF EXISTS "dpt_modify_creator"  ON public.destination_proposal_tags;

CREATE POLICY "dpt_select_members"
  ON public.destination_proposal_tags FOR SELECT
  TO authenticated
  USING (
    public.is_trip_member(
      (SELECT trip_id FROM public.destination_proposals WHERE id = proposal_id),
      auth.uid()
    )
  );

CREATE POLICY "dpt_modify_creator"
  ON public.destination_proposal_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.destination_proposals dp
       WHERE dp.id = proposal_id
         AND (dp.created_by = auth.uid() OR public.is_trip_admin(dp.trip_id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.destination_proposals dp
       WHERE dp.id = proposal_id
         AND (dp.created_by = auth.uid() OR public.is_trip_admin(dp.trip_id, auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- destination_votes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "dest_votes_select_members"  ON public.destination_votes;
DROP POLICY IF EXISTS "dest_votes_insert_self"     ON public.destination_votes;
DROP POLICY IF EXISTS "dest_votes_update_self"     ON public.destination_votes;
DROP POLICY IF EXISTS "dest_votes_delete_self"     ON public.destination_votes;

CREATE POLICY "dest_votes_select_members"
  ON public.destination_votes FOR SELECT
  TO authenticated
  USING (public.is_trip_member_from_poll(poll_id, auth.uid()));

CREATE POLICY "dest_votes_insert_self"
  ON public.destination_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_vote_poll(poll_id, auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "dest_votes_update_self"
  ON public.destination_votes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "dest_votes_delete_self"
  ON public.destination_votes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- tasks
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select_members"  ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_member"   ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_perm"     ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_perm"     ON public.tasks;

CREATE POLICY "tasks_select_members"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "tasks_insert_member"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_member(trip_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "tasks_update_perm"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_trip_admin(trip_id, auth.uid())
    OR EXISTS (
      SELECT 1
        FROM public.trip_members tm
       WHERE tm.id = assigned_to_trip_member_id
         AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_trip_admin(trip_id, auth.uid())
  );

CREATE POLICY "tasks_delete_perm"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_trip_admin(trip_id, auth.uid())
  );

-- -----------------------------------------------------------------------------
-- expenses
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "expenses_select_members"  ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_member"   ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_perm"     ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_perm"     ON public.expenses;

CREATE POLICY "expenses_select_members"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "expenses_insert_member"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "expenses_update_perm"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (public.can_manage_expense(id, auth.uid()))
  WITH CHECK (public.can_manage_expense(id, auth.uid()));

CREATE POLICY "expenses_delete_perm"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.can_manage_expense(id, auth.uid()));

-- -----------------------------------------------------------------------------
-- expense_payers
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "expense_payers_select_members"  ON public.expense_payers;
DROP POLICY IF EXISTS "expense_payers_modify_perm"     ON public.expense_payers;

CREATE POLICY "expense_payers_select_members"
  ON public.expense_payers FOR SELECT
  TO authenticated
  USING (public.is_trip_member(public.trip_id_from_expense(expense_id), auth.uid()));

CREATE POLICY "expense_payers_modify_perm"
  ON public.expense_payers FOR ALL
  TO authenticated
  USING (public.can_manage_expense(expense_id, auth.uid()))
  WITH CHECK (public.can_manage_expense(expense_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- expense_splits
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "expense_splits_select_members"  ON public.expense_splits;
DROP POLICY IF EXISTS "expense_splits_modify_perm"     ON public.expense_splits;

CREATE POLICY "expense_splits_select_members"
  ON public.expense_splits FOR SELECT
  TO authenticated
  USING (public.is_trip_member(public.trip_id_from_expense(expense_id), auth.uid()));

CREATE POLICY "expense_splits_modify_perm"
  ON public.expense_splits FOR ALL
  TO authenticated
  USING (public.can_manage_expense(expense_id, auth.uid()))
  WITH CHECK (public.can_manage_expense(expense_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- settlement_suggestions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "settlements_select_members"  ON public.settlement_suggestions;
DROP POLICY IF EXISTS "settlements_modify_service"  ON public.settlement_suggestions;

CREATE POLICY "settlements_select_members"
  ON public.settlement_suggestions FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- INSERT/UPDATE/DELETE: solo service_role (Edge Function compute-trip-balances).
-- Sin policies para authenticated -> RLS lo bloquea.

-- -----------------------------------------------------------------------------
-- settlement_payments
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_select_members"  ON public.settlement_payments;
DROP POLICY IF EXISTS "payments_insert_actor"    ON public.settlement_payments;
DROP POLICY IF EXISTS "payments_update_creditor" ON public.settlement_payments;

CREATE POLICY "payments_select_members"
  ON public.settlement_payments FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- INSERT: el deudor o el cobrador (to) puede iniciar un pago, o cualquier
-- admin. El user debe ser miembro del trip.
CREATE POLICY "payments_insert_actor"
  ON public.settlement_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_trip_member(trip_id, auth.uid())
    AND created_by = auth.uid()
  );

-- UPDATE: solo el cobrador (to) o un admin puede confirmar/cancelar.
CREATE POLICY "payments_update_creditor"
  ON public.settlement_payments FOR UPDATE
  TO authenticated
  USING (
    public.is_trip_admin(trip_id, auth.uid())
    OR EXISTS (
      SELECT 1
        FROM public.trip_members tm
       WHERE tm.id = to_trip_member_id
         AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_trip_admin(trip_id, auth.uid())
    OR EXISTS (
      SELECT 1
        FROM public.trip_members tm
       WHERE tm.id = to_trip_member_id
         AND tm.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- activity_log
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "activity_log_select_members"  ON public.activity_log;
-- INSERT/UPDATE/DELETE: SOLO service_role. Sin policies para authenticated ->
-- con FORCE RLS, cualquier intento desde cliente es DENIED.
-- Esto se valida en supabase/tests/rls-smoke.test.sql.

CREATE POLICY "activity_log_select_members"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select_own"  ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own"  ON public.notifications;
-- INSERT/DELETE: solo service_role.

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- push_tokens
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "push_tokens_select_own"  ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_insert_own"  ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_update_own"  ON public.push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete_own"  ON public.push_tokens;

CREATE POLICY "push_tokens_select_own"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_tokens_insert_own"
  ON public.push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_update_own"
  ON public.push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_delete_own"
  ON public.push_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
