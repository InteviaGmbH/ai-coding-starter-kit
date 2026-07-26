-- PROJ-11: Kern-Benachrichtigungen
-- Lets a municipality broadcast a "new request" notification to active
-- internal staff when it creates a personnel_request. Narrowly scoped —
-- only this one notification type, only to currently-active internal
-- recipients — same pattern as PROJ-8's
-- notifications_insert_municipality_proposal_decision.
--
-- A raw subquery against `profiles` here would be evaluated under the
-- calling (municipality) actor's own RLS permissions on `profiles`
-- (profiles_select_own_or_internal only lets them see their own row), so it
-- would always return zero rows and silently reject every insert. Needs a
-- SECURITY DEFINER helper, same reason all the other current_*/is_* helpers
-- in this schema are security definer.
-- Safe to re-run: DROP ... IF EXISTS before CREATE POLICY, CREATE OR REPLACE for the function.

create function public.is_active_internal_profile(profile_id uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = profile_id
    and role in ('super_admin', 'dafinex_admin', 'internal_coordinator')
    and account_status = 'active'
  );
$$;

drop policy if exists "notifications_insert_municipality_new_request" on notifications;
create policy "notifications_insert_municipality_new_request" on notifications for insert
  with check (
    public.is_active()
    and public.current_role() = 'municipality'
    and type = 'new_request'
    and public.is_active_internal_profile(recipient_id)
  );
