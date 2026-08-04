-- PROJ-13: Partnerportal + Partnerfirmen-Kandidatenvorschläge
--
-- New entity `partner_companies`, mirroring `municipalities` exactly, plus
-- `commission_rate` (internal-only, see below). Extends `profiles`,
-- `candidates`, and `personnel_requests` with the links needed to scope a
-- partner firm to its own data, and reuses the existing
-- candidate_proposals/PROJ-7/8 approval workflow unchanged — a
-- partner-sourced proposal is indistinguishable in status logic from an
-- internal one, only `proposed_by_id` points at a different role.

create table partner_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  -- Internal-only, see the RLS section below for why this can't just be a
  -- role check inside a normal SELECT policy on this table.
  commission_rate numeric(5, 2),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

create trigger set_updated_date before update on partner_companies
  for each row execute function public.set_updated_date();

alter table profiles add column partner_company_id uuid references partner_companies (id) on delete set null;
alter table candidates add column partner_company_id uuid references partner_companies (id) on delete restrict;
alter table personnel_requests add column visible_to_partners boolean not null default false;

create function public.current_partner_company_id() returns uuid
  language sql security definer stable set search_path = public as $$
  select partner_company_id from profiles where id = auth.uid();
$$;

-- --- partner_companies RLS ---------------------------------------------------------------
--
-- Deliberately NO select branch for the `partner_company` role at all —
-- Postgres RLS only gates whole rows, never individual columns within a
-- row a role is otherwise allowed to see. Granting partner_company any
-- direct SELECT on this table would make `commission_rate` reachable via
-- a plain `?select=commission_rate` API call regardless of what the
-- application's own UI queries for. get_own_partner_company() below is
-- the only read path for a partner's own company data, and its return
-- type simply doesn't include commission_rate.
create policy "partner_companies_select" on partner_companies for select
  using (public.is_active() and public.is_internal_role());

create policy "partner_companies_insert_internal" on partner_companies for insert
  with check (public.is_internal_role());

create policy "partner_companies_update_internal" on partner_companies for update
  using (public.is_internal_role());

create policy "partner_companies_delete_internal" on partner_companies for delete
  using (public.is_internal_role());

-- SECURITY DEFINER so it can read partner_companies on the caller's behalf
-- despite the caller having no direct SELECT grant on that table at all —
-- the explicit column list is the actual security boundary here, not the
-- function's elevated privilege (which only lets it run the query, not
-- decide what to return).
create function public.get_own_partner_company()
  returns table (id uuid, name text, address text, contact_name text, contact_email text, contact_phone text)
  language sql security definer stable set search_path = public as $$
  select pc.id, pc.name, pc.address, pc.contact_name, pc.contact_email, pc.contact_phone
  from partner_companies pc
  where pc.id = public.current_partner_company_id();
$$;

-- --- profiles: keep partner_company_id out of self-service updates ---------------------------------------------------------------
-- Same self-update guard as municipality_id/candidate_id — a user must
-- never be able to grant themselves a different partner company via their
-- own profile update.
drop policy if exists "profiles_update_own_limited" on profiles;
create policy "profiles_update_own_limited" on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_role()
    and account_status = public.current_account_status()
    and municipality_id is not distinct from public.current_municipality_id()
    and candidate_id is not distinct from public.current_candidate_id()
    and partner_company_id is not distinct from public.current_partner_company_id()
  );

-- --- candidates: close a pre-existing self-service gap this migration would otherwise reopen ---------------------------------------------------------------
-- enforce_candidate_self_update_columns (PROJ-20) locks down which columns
-- a self-service candidate (role = 'candidate') may touch on their own
-- row — it predates partner_company_id, so without this update a
-- self-service candidate could set their own partner_company_id via a
-- crafted update (candidates_update has no WITH CHECK of its own, only a
-- USING clause). CREATE OR REPLACE, safe to re-run.
create or replace function public.enforce_candidate_self_update_columns() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() = 'candidate' then
    if new.id is distinct from old.id
      or new.profile_id is distinct from old.profile_id
      or new.source_type is distinct from old.source_type
      or new.region is distinct from old.region
      or new.availability is distinct from old.availability
      or new.partner_company_id is distinct from old.partner_company_id
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

-- --- candidates: partner firm manages its own candidate pool ---------------------------------------------------------------
create policy "candidates_select_own_partner" on candidates for select
  using (public.is_active() and partner_company_id = public.current_partner_company_id());

create policy "candidates_insert_partner" on candidates for insert
  with check (
    public.is_active()
    and public.current_role() = 'partner_company'
    and partner_company_id = public.current_partner_company_id()
    and source_type = 'partner'
  );

-- WITH CHECK pins partner_company_id/source_type to the caller's own firm
-- on every update, not just at insert — closes off both "reassign my
-- candidate to another firm" and "relabel as a Dafinex-owned candidate"
-- via a crafted update, without needing a full column-lockdown trigger
-- (the other, non-sensitive fields — name/skills/region/availability —
-- are exactly what a partner firm is supposed to edit).
create policy "candidates_update_own_partner" on candidates for update
  using (public.is_active() and partner_company_id = public.current_partner_company_id())
  with check (
    partner_company_id = public.current_partner_company_id()
    and source_type = 'partner'
  );

-- --- personnel_requests: only requests internal explicitly opened up ---------------------------------------------------------------
create policy "personnel_requests_select_partner" on personnel_requests for select
  using (
    public.is_active()
    and public.current_role() = 'partner_company'
    and visible_to_partners = true
  );

-- --- candidate_proposals: a partner firm's own proposals only ---------------------------------------------------------------
-- Raw subquery against `candidates` is safe here (no recursion risk): the
-- new candidates_select_own_partner policy above doesn't read from
-- candidate_proposals or personnel_requests at all, so there's no cycle
-- (same reasoning already documented for the PROJ-15 contract_signatures
-- policies).
create policy "candidate_proposals_select_partner" on candidate_proposals for select
  using (
    public.is_active()
    and candidate_id in (select id from candidates where partner_company_id = public.current_partner_company_id())
  );

create policy "candidate_proposals_insert_partner" on candidate_proposals for insert
  with check (
    public.is_active()
    and public.current_role() = 'partner_company'
    and candidate_id in (select id from candidates where partner_company_id = public.current_partner_company_id())
    and request_id in (select id from personnel_requests where visible_to_partners = true)
  );

-- --- activity_log: partner firm logs its own proposal creation ---------------------------------------------------------------
-- Mirrors activity_log_insert_municipality_proposal_decision (PROJ-1) exactly,
-- one level down: scoped to candidate_proposals for the caller's own
-- candidates only, via the candidate_proposals_select_partner/
-- candidates_select_own_partner policies added above (no recursion — neither
-- candidate_proposals' nor candidates' own policies read activity_log).
create policy "activity_log_insert_partner_proposal" on activity_log for insert
  with check (
    public.is_active()
    and public.current_role() = 'partner_company'
    and entity_type = 'candidate_proposal'
    and entity_id in (
      select cp.id from candidate_proposals cp
      join candidates c on c.id = cp.candidate_id
      where c.partner_company_id = public.current_partner_company_id()
    )
  );
