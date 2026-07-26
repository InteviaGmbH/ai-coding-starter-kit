-- PROJ-8 QA fixes (BUG-1, BUG-2), found before this feature's migration was
-- ever applied to a live project — folds into the same rollout.
-- Safe to re-run: DROP ... IF EXISTS before each CREATE POLICY/TRIGGER,
-- CREATE OR REPLACE for the function.

-- BUG-2 (Critical): candidate_proposals_update_municipality_decision's
-- `with check` only constrained status/request_id, leaving candidate_id (and
-- every other column) free to be rewritten by a direct API call — a
-- municipality could swap in an unvetted candidate while "accepting" a
-- proposal. RLS's `with check` has no way to compare against the OLD row, so
-- this needs a trigger: any non-internal actor may only ever change `status`
-- on an existing candidate_proposals row.
create function public.enforce_candidate_proposal_column_lock() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not public.is_internal_role() then
    if new.candidate_id is distinct from old.candidate_id
      or new.request_id is distinct from old.request_id
      or new.proposed_by_id is distinct from old.proposed_by_id
      or new.created_by_id is distinct from old.created_by_id
      or new.created_by is distinct from old.created_by
      or new.created_date is distinct from old.created_date
      or new.is_sample is distinct from old.is_sample
    then
      raise exception 'Only an internal role may change fields other than status on a candidate proposal';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_candidate_proposal_column_lock on candidate_proposals;
create trigger enforce_candidate_proposal_column_lock
  before update on candidate_proposals
  for each row execute function public.enforce_candidate_proposal_column_lock();

-- BUG-1 (High): activity_log_insert_internal / notifications_insert_internal
-- only ever allowed is_internal_role(), so acceptProposal/declineProposal's
-- inserts were silently blocked by RLS for a municipality actor — the action
-- still reported success, but neither the activity entry nor the
-- notification to the proposing internal user was ever created. Add
-- narrowly-scoped policies limited to exactly this one action.
drop policy if exists "activity_log_insert_municipality_proposal_decision" on activity_log;
create policy "activity_log_insert_municipality_proposal_decision" on activity_log for insert
  with check (
    public.is_active()
    and public.current_role() = 'municipality'
    and entity_type = 'candidate_proposal'
    and entity_id in (
      select cp.id from candidate_proposals cp
      join personnel_requests pr on pr.id = cp.request_id
      where pr.municipality_id = public.current_municipality_id()
    )
  );

drop policy if exists "notifications_insert_municipality_proposal_decision" on notifications;
create policy "notifications_insert_municipality_proposal_decision" on notifications for insert
  with check (
    public.is_active()
    and public.current_role() = 'municipality'
    and recipient_id in (
      select cp.proposed_by_id from candidate_proposals cp
      join personnel_requests pr on pr.id = cp.request_id
      where pr.municipality_id = public.current_municipality_id()
      and cp.proposed_by_id is not null
    )
  );
