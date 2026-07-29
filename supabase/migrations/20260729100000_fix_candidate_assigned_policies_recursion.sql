-- PROJ-20 bug fix: 20260729090000_candidate_self_service_fields.sql shipped
-- with two RLS policies (personnel_requests_select_candidate_assigned,
-- municipalities_select_candidate_assigned) that used raw inline subqueries
-- against candidate_proposals/personnel_requests directly. Since both
-- tables have RLS enabled, evaluating those subqueries re-triggers RLS on
-- the referenced table — and candidate_proposals_select's third branch
-- itself reads personnel_requests, closing the loop. Postgres surfaced
-- this as error 42P17, "infinite recursion detected in policy for
-- relation candidate_proposals", the first time a candidate loaded a page
-- that queries candidate_proposals (found live via the
-- /candidate/dashboard "Eigene Vorschläge" tile).
--
-- Fix: move the cross-table lookups into SECURITY DEFINER helper
-- functions, exactly like every other cross-table RLS lookup in this
-- schema (current_candidate_id(), current_municipality_id(),
-- is_active_internal_profile(), ...) — a SECURITY DEFINER function owned
-- by a bypassrls role evaluates its internal queries without RLS, so it
-- never re-enters the policies it's being used from.
--
-- Safe to re-run: every CREATE FUNCTION uses CREATE OR REPLACE, every
-- DROP POLICY uses IF EXISTS.

create or replace function public.candidate_own_request_ids() returns setof uuid
  language sql security definer stable set search_path = public as $$
  select cp.request_id from candidate_proposals cp
  where cp.candidate_id = public.current_candidate_id();
$$;

create or replace function public.candidate_own_municipality_ids() returns setof uuid
  language sql security definer stable set search_path = public as $$
  select pr.municipality_id from personnel_requests pr
  join candidate_proposals cp on cp.request_id = pr.id
  where cp.candidate_id = public.current_candidate_id();
$$;

drop policy if exists "personnel_requests_select_candidate_assigned" on personnel_requests;
create policy "personnel_requests_select_candidate_assigned" on personnel_requests for select
  using (
    public.is_active()
    and id in (select public.candidate_own_request_ids())
  );

drop policy if exists "municipalities_select_candidate_assigned" on municipalities;
create policy "municipalities_select_candidate_assigned" on municipalities for select
  using (
    public.is_active()
    and id in (select public.candidate_own_municipality_ids())
  );
