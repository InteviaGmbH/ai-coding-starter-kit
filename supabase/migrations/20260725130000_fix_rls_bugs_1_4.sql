-- PROJ-1: QA Fix-Runde 1 — BUG-1, BUG-2, BUG-3, BUG-4
-- Incremental patch for a database that already ran 20260725120000_init_schema.sql.
-- Safe to re-run: every DROP uses IF EXISTS and every function uses CREATE OR REPLACE.

-- ============================================================================
-- BUG-1: reject self-registration with any role other than municipality/candidate
-- ============================================================================
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  requested_role user_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'candidate');
begin
  if requested_role not in ('municipality', 'candidate') then
    raise exception 'Self-registration only supports the municipality or candidate role';
  end if;

  insert into public.profiles (id, email, full_name, role, account_status)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', requested_role, 'pending');

  return new;
end;
$$;
-- Trigger on_auth_user_created already points at this function — no change needed there.

-- ============================================================================
-- BUG-2: municipality_id/candidate_id can no longer be self-assigned
-- ============================================================================
drop policy if exists "profiles_select_own_or_internal" on profiles;
create policy "profiles_select_own_or_internal" on profiles for select
  using (id = auth.uid() or (public.is_internal_role() and public.is_active()));

drop policy if exists "profiles_update_own_limited" on profiles;
create policy "profiles_update_own_limited" on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_role()
    and account_status = public.current_account_status()
    and municipality_id is not distinct from public.current_municipality_id()
    and candidate_id is not distinct from public.current_candidate_id()
  );

-- ============================================================================
-- BUG-3: is_active() gate on SELECT/UPDATE policies that expose other parties' data
-- ============================================================================
drop policy if exists "municipalities_select" on municipalities;
create policy "municipalities_select" on municipalities for select
  using (public.is_active() and (public.is_internal_role() or id = public.current_municipality_id()));

drop policy if exists "personnel_requests_select" on personnel_requests;
create policy "personnel_requests_select" on personnel_requests for select
  using (public.is_active() and (public.is_internal_role() or municipality_id = public.current_municipality_id()));

drop policy if exists "candidate_proposals_select" on candidate_proposals;
create policy "candidate_proposals_select" on candidate_proposals for select
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or candidate_id = public.current_candidate_id()
      or request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id())
    )
  );

drop policy if exists "assignments_select" on assignments;
create policy "assignments_select" on assignments for select
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or proposal_id in (select id from candidate_proposals where candidate_id = public.current_candidate_id())
      or proposal_id in (
        select cp.id from candidate_proposals cp
        join personnel_requests pr on pr.id = cp.request_id
        where pr.municipality_id = public.current_municipality_id()
      )
    )
  );

drop policy if exists "assignments_update" on assignments;
create policy "assignments_update" on assignments for update
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or proposal_id in (
        select cp.id from candidate_proposals cp
        join personnel_requests pr on pr.id = cp.request_id
        where pr.municipality_id = public.current_municipality_id()
      )
    )
  );

drop policy if exists "contracts_select" on contracts;
create policy "contracts_select" on contracts for select
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or assignment_id in (
        select a.id from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        where cp.candidate_id = public.current_candidate_id()
      )
      or assignment_id in (
        select a.id from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        join personnel_requests pr on pr.id = cp.request_id
        where pr.municipality_id = public.current_municipality_id()
      )
    )
  );

drop policy if exists "contracts_update" on contracts;
create policy "contracts_update" on contracts for update
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or assignment_id in (
        select a.id from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        where cp.candidate_id = public.current_candidate_id()
      )
      or assignment_id in (
        select a.id from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        join personnel_requests pr on pr.id = cp.request_id
        where pr.municipality_id = public.current_municipality_id()
      )
    )
  );

drop policy if exists "contracts_documents_select" on storage.objects;
create policy "contracts_documents_select" on storage.objects for select
  using (
    bucket_id = 'contracts'
    and public.is_active()
    and (
      public.is_internal_role()
      or (storage.foldername(name))[1] in (
        select a.id::text from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        where cp.candidate_id = public.current_candidate_id()
      )
      or (storage.foldername(name))[1] in (
        select a.id::text from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        join personnel_requests pr on pr.id = cp.request_id
        where pr.municipality_id = public.current_municipality_id()
      )
    )
  );

drop policy if exists "contracts_documents_insert" on storage.objects;
create policy "contracts_documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'contracts'
    and public.is_active()
    and (
      public.is_internal_role()
      or (storage.foldername(name))[1] in (
        select a.id::text from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        where cp.candidate_id = public.current_candidate_id()
      )
      or (storage.foldername(name))[1] in (
        select a.id::text from assignments a
        join candidate_proposals cp on cp.id = a.proposal_id
        join personnel_requests pr on pr.id = cp.request_id
        where pr.municipality_id = public.current_municipality_id()
      )
    )
  );

-- ============================================================================
-- BUG-4: candidates can create exactly one candidates row for themselves
-- ============================================================================
alter table candidates add constraint candidates_profile_id_key unique (profile_id);

create or replace function public.link_candidate_profile() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is not null then
    update profiles set candidate_id = new.id where id = new.profile_id and candidate_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_candidate_created on candidates;
create trigger on_candidate_created
  after insert on candidates
  for each row execute function public.link_candidate_profile();

drop policy if exists "candidates_insert_internal" on candidates;
drop policy if exists "candidates_insert_self_or_internal" on candidates;
create policy "candidates_insert_self_or_internal" on candidates for insert
  with check (public.is_internal_role() or profile_id = auth.uid());
