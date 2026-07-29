-- PROJ-20: Kandidatenportal – Selbstverwaltung für Kandidaten
--
-- 1. Additive new candidates columns for phone + self-service availability/
--    qualification fields. region/availability/skills are untouched
--    (skills becomes additionally candidate-editable, region/availability
--    stay internal-only per the PROJ-20 spec's Product Decisions).
-- 2. Closes a latent RLS gap from PROJ-1: candidates_update already let a
--    candidate row-level update their own row with no column restriction
--    (no WITH CHECK was ever added, so USING doubled as the check, which
--    only re-validates `id`). This was never exploitable through the UI
--    (no form ever exposed it), but PROJ-20 is the first feature to
--    actually issue candidate-authenticated updates against this table,
--    so this is the right time to add a real column-level guard — same
--    pattern as the existing profiles.municipality_id/candidate_id lockdown.
-- 3. New read policies so a candidate can see the municipality name and
--    request title behind their own assignments (mirrors the existing
--    PROJ-8 candidates_select_municipality_proposed pattern, just in the
--    other direction).

alter table candidates
  add column phone text,
  add column availability_start date,
  add column availability_end date,
  add column max_workload_percent integer,
  add column preferred_regions text[] not null default '{}',
  add column certifications text[] not null default '{}',
  add column languages text[] not null default '{}',
  add column experience_years integer;

alter table candidates
  add constraint candidates_max_workload_percent_range
    check (max_workload_percent is null or (max_workload_percent between 0 and 100)),
  add constraint candidates_availability_range
    check (availability_end is null or availability_start is null or availability_end >= availability_start),
  add constraint candidates_experience_years_non_negative
    check (experience_years is null or experience_years >= 0);

-- --- column-level lockdown for candidate self-updates -----------------------

create function public.enforce_candidate_self_update_columns() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() = 'candidate' then
    if new.id is distinct from old.id
      or new.profile_id is distinct from old.profile_id
      or new.source_type is distinct from old.source_type
      or new.region is distinct from old.region
      or new.availability is distinct from old.availability
      or new.created_date is distinct from old.created_date
      or new.created_by_id is distinct from old.created_by_id
      or new.created_by is distinct from old.created_by
      or new.is_sample is distinct from old.is_sample
    then
      raise exception 'Kandidaten dürfen nur ihre eigenen Kontakt-, Verfügbarkeits- und Qualifikationsfelder ändern';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_candidate_self_update_columns
  before update on candidates
  for each row execute function public.enforce_candidate_self_update_columns();

-- --- candidate read access to their own assignment's request/municipality --
--
-- These lookups must go through SECURITY DEFINER helper functions, not raw
-- inline subqueries, exactly like every other cross-table RLS lookup in
-- this schema (current_candidate_id(), is_active_internal_profile(), ...).
-- candidate_proposals_select's third branch already reads
-- personnel_requests; an inline subquery here reading candidate_proposals
-- from within a personnel_requests policy creates a policy-evaluation
-- cycle between the two tables (Postgres error 42P17, "infinite
-- recursion detected in policy"). A SECURITY DEFINER function owned by a
-- bypassrls role evaluates its internal queries without RLS, so it can
-- read across both tables without re-entering their policies.

create function public.candidate_own_request_ids() returns setof uuid
  language sql security definer stable set search_path = public as $$
  select cp.request_id from candidate_proposals cp
  where cp.candidate_id = public.current_candidate_id();
$$;

create function public.candidate_own_municipality_ids() returns setof uuid
  language sql security definer stable set search_path = public as $$
  select pr.municipality_id from personnel_requests pr
  join candidate_proposals cp on cp.request_id = pr.id
  where cp.candidate_id = public.current_candidate_id();
$$;

create policy "personnel_requests_select_candidate_assigned" on personnel_requests for select
  using (
    public.is_active()
    and id in (select public.candidate_own_request_ids())
  );

create policy "municipalities_select_candidate_assigned" on municipalities for select
  using (
    public.is_active()
    and id in (select public.candidate_own_municipality_ids())
  );
