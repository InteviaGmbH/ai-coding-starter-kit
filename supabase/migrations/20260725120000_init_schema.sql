-- PROJ-1: Supabase Infrastructure Setup
-- Dafinex core schema: enums, tables, standard fields, RLS, storage.
-- Run this once in the Supabase SQL Editor (or via `supabase db push` once the CLI is linked).

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- Enums
-- ============================================================================
create type user_role as enum (
  'super_admin',
  'dafinex_admin',
  'internal_coordinator',
  'municipality',
  'candidate',
  'partner_company' -- reserved for Phase 2, not assignable to real accounts yet
);

create type account_status as enum ('pending', 'active', 'rejected');

create type candidate_source_type as enum ('dafinex', 'partner');

create type request_status as enum ('created', 'reviewed');

-- 'proposed'/'approved'/'rejected' cover the internal Dafinex review.
-- 'municipality_accepted'/'municipality_declined' cover the municipality's decision
-- after the (informal, for the P1 pilot) interview. An assignment is only ever
-- created once a proposal reaches 'municipality_accepted'.
create type proposal_status as enum (
  'proposed',
  'approved',
  'rejected',
  'municipality_accepted',
  'municipality_declined'
);

create type assignment_status as enum ('proposed', 'accepted', 'active', 'completed');

create type contract_status as enum ('generated', 'signed');

-- ============================================================================
-- Tables
-- Every table carries the standard fields: id, created_date, updated_date,
-- created_by_id, created_by, is_sample.
-- Tables come before helper functions/policies below: `language sql` functions
-- are validated against the catalog at CREATE FUNCTION time, so anything
-- referencing e.g. `profiles` must be created after that table exists.
-- ============================================================================

create table municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid,
  created_by text,
  is_sample boolean not null default false
);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique, -- set once the candidate's own account is linked (FK added after profiles exists); unique so a candidate can never self-create more than one row
  first_name text not null,
  last_name text not null,
  skills text[] not null default '{}',
  region text,
  availability text,
  source_type candidate_source_type not null default 'dafinex',
  cv_document_path text, -- path within the candidate-documents storage bucket
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid,
  created_by text,
  is_sample boolean not null default false
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null,
  account_status account_status not null default 'pending',
  municipality_id uuid references municipalities (id) on delete set null,
  candidate_id uuid references candidates (id) on delete set null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

alter table candidates
  add constraint candidates_profile_id_fkey
  foreign key (profile_id) references profiles (id) on delete set null;

alter table municipalities
  add constraint municipalities_created_by_id_fkey
  foreign key (created_by_id) references profiles (id);

alter table candidates
  add constraint candidates_created_by_id_fkey
  foreign key (created_by_id) references profiles (id);

create table personnel_requests (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references municipalities (id) on delete restrict,
  title text not null,
  required_skills text[] not null default '{}',
  region text,
  start_date date,
  end_date date,
  status request_status not null default 'created',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

create table candidate_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references personnel_requests (id) on delete restrict,
  candidate_id uuid not null references candidates (id) on delete restrict,
  proposed_by_id uuid references profiles (id),
  status proposal_status not null default 'proposed',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references candidate_proposals (id) on delete restrict,
  status assignment_status not null default 'proposed',
  start_date date,
  end_date date,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete restrict,
  generated_document_path text,
  signed_document_path text, -- path within the contracts storage bucket
  status contract_status not null default 'generated',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

-- ============================================================================
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- Must come after the tables above — `language sql` function bodies are
-- validated against the catalog at CREATE FUNCTION time.
-- ============================================================================
create function public.current_role() returns user_role
  language sql security definer stable set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create function public.current_account_status() returns account_status
  language sql security definer stable set search_path = public as $$
  select account_status from profiles where id = auth.uid();
$$;

create function public.current_municipality_id() returns uuid
  language sql security definer stable set search_path = public as $$
  select municipality_id from profiles where id = auth.uid();
$$;

create function public.current_candidate_id() returns uuid
  language sql security definer stable set search_path = public as $$
  select candidate_id from profiles where id = auth.uid();
$$;

create function public.is_internal_role() returns boolean
  language sql security definer stable set search_path = public as $$
  select public.current_role() in ('super_admin', 'dafinex_admin', 'internal_coordinator');
$$;

create function public.is_active() returns boolean
  language sql security definer stable set search_path = public as $$
  select public.current_account_status() = 'active';
$$;

-- Keeps updated_date current on every row change.
create function public.set_updated_date() returns trigger
  language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

-- ============================================================================
-- updated_date triggers
-- ============================================================================
create trigger set_updated_date before update on profiles for each row execute function public.set_updated_date();
create trigger set_updated_date before update on municipalities for each row execute function public.set_updated_date();
create trigger set_updated_date before update on candidates for each row execute function public.set_updated_date();
create trigger set_updated_date before update on personnel_requests for each row execute function public.set_updated_date();
create trigger set_updated_date before update on candidate_proposals for each row execute function public.set_updated_date();
create trigger set_updated_date before update on assignments for each row execute function public.set_updated_date();
create trigger set_updated_date before update on contracts for each row execute function public.set_updated_date();
create trigger set_updated_date before update on notifications for each row execute function public.set_updated_date();
create trigger set_updated_date before update on activity_log for each row execute function public.set_updated_date();

-- ============================================================================
-- Auto-create a pending profile whenever someone signs up via Supabase Auth.
-- Expects role to be passed as auth metadata: supabase.auth.signUp({ options: { data: { role: 'municipality' | 'candidate' } } })
-- ============================================================================
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  requested_role user_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'candidate');
begin
  -- Self-registration (public signUp) may only ever create municipality or
  -- candidate accounts. Internal roles (dafinex_admin, internal_coordinator,
  -- super_admin) must be granted afterwards by an existing dafinex_admin via
  -- a normal profiles UPDATE (profiles_update_by_dafinex_admin policy) — never
  -- accepted directly from client-supplied signup metadata.
  if requested_role not in ('municipality', 'candidate') then
    raise exception 'Self-registration only supports the municipality or candidate role';
  end if;

  insert into public.profiles (id, email, full_name, role, account_status)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', requested_role, 'pending');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-links a self-registered candidate's profile to the candidates row they
-- just created for themselves (see candidates_insert_self_or_internal policy).
-- SECURITY DEFINER so it can update profiles despite profiles having no
-- self-service UPDATE path for candidate_id (see profiles_update_own_limited).
create function public.link_candidate_profile() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is not null then
    update profiles set candidate_id = new.id where id = new.profile_id and candidate_id is null;
  end if;
  return new;
end;
$$;

create trigger on_candidate_created
  after insert on candidates
  for each row execute function public.link_candidate_profile();

-- ============================================================================
-- Indexes
-- ============================================================================
create index idx_profiles_role on profiles (role);
create index idx_profiles_account_status on profiles (account_status);
create index idx_profiles_municipality_id on profiles (municipality_id);
create index idx_profiles_candidate_id on profiles (candidate_id);

create index idx_candidates_region on candidates (region);
create index idx_candidates_source_type on candidates (source_type);

create index idx_personnel_requests_municipality_id on personnel_requests (municipality_id);
create index idx_personnel_requests_status on personnel_requests (status);

create index idx_candidate_proposals_request_id on candidate_proposals (request_id);
create index idx_candidate_proposals_candidate_id on candidate_proposals (candidate_id);
create index idx_candidate_proposals_status on candidate_proposals (status);

create index idx_assignments_proposal_id on assignments (proposal_id);
create index idx_assignments_status on assignments (status);

create index idx_contracts_assignment_id on contracts (assignment_id);

create index idx_notifications_recipient_id on notifications (recipient_id);
create index idx_notifications_is_read on notifications (is_read);

create index idx_activity_log_entity on activity_log (entity_type, entity_id);
create index idx_activity_log_actor_id on activity_log (actor_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table municipalities enable row level security;
alter table candidates enable row level security;
alter table personnel_requests enable row level security;
alter table candidate_proposals enable row level security;
alter table assignments enable row level security;
alter table contracts enable row level security;
alter table notifications enable row level security;
alter table activity_log enable row level security;

-- --- profiles ---------------------------------------------------------------
create policy "profiles_select_own_or_internal" on profiles for select
  using (id = auth.uid() or (public.is_internal_role() and public.is_active()));

create policy "profiles_insert_via_trigger_only" on profiles for insert
  with check (false); -- rows are only ever created by handle_new_user() (security definer)

-- Self-service updates may never change role, account_status, municipality_id
-- or candidate_id — those are set either by handle_new_user()/link_candidate_profile()
-- (security definer, bypasses RLS) or by a dafinex_admin via the policy below.
create policy "profiles_update_own_limited" on profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_role()
    and account_status = public.current_account_status()
    and municipality_id is not distinct from public.current_municipality_id()
    and candidate_id is not distinct from public.current_candidate_id()
  );

create policy "profiles_update_by_dafinex_admin" on profiles for update
  using (public.current_role() in ('super_admin', 'dafinex_admin'));

create policy "profiles_delete_super_admin_only" on profiles for delete
  using (public.current_role() = 'super_admin');

-- --- municipalities ----------------------------------------------------------
create policy "municipalities_select" on municipalities for select
  using (public.is_active() and (public.is_internal_role() or id = public.current_municipality_id()));

create policy "municipalities_insert_internal" on municipalities for insert
  with check (public.is_internal_role());

create policy "municipalities_update_internal" on municipalities for update
  using (public.is_internal_role());

create policy "municipalities_delete_internal" on municipalities for delete
  using (public.is_internal_role());

-- --- candidates ---------------------------------------------------------------
create policy "candidates_select" on candidates for select
  using (public.is_internal_role() or id = public.current_candidate_id());

-- A candidate may create exactly one candidates row for themselves during
-- self-registration (profile_id = their own auth id; the unique constraint on
-- candidates.profile_id blocks a second attempt). Internal roles can create
-- candidate records on behalf of anyone (source_type = 'dafinex', no self-link).
create policy "candidates_insert_self_or_internal" on candidates for insert
  with check (public.is_internal_role() or profile_id = auth.uid());

create policy "candidates_update" on candidates for update
  using (public.is_internal_role() or id = public.current_candidate_id());

create policy "candidates_delete_internal" on candidates for delete
  using (public.is_internal_role());

-- --- personnel_requests ---------------------------------------------------------------
create policy "personnel_requests_select" on personnel_requests for select
  using (public.is_active() and (public.is_internal_role() or municipality_id = public.current_municipality_id()));

create policy "personnel_requests_insert" on personnel_requests for insert
  with check (
    public.is_internal_role()
    or (public.current_role() = 'municipality' and public.is_active() and municipality_id = public.current_municipality_id())
  );

create policy "personnel_requests_update_internal" on personnel_requests for update
  using (public.is_internal_role());

create policy "personnel_requests_delete_internal" on personnel_requests for delete
  using (public.is_internal_role());

-- --- candidate_proposals ---------------------------------------------------------------
create policy "candidate_proposals_select" on candidate_proposals for select
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or candidate_id = public.current_candidate_id()
      or request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id())
    )
  );

create policy "candidate_proposals_insert_internal" on candidate_proposals for insert
  with check (public.is_internal_role());

create policy "candidate_proposals_update_internal" on candidate_proposals for update
  using (public.is_internal_role());

create policy "candidate_proposals_delete_internal" on candidate_proposals for delete
  using (public.is_internal_role());

-- --- assignments ---------------------------------------------------------------
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

create policy "assignments_insert_internal" on assignments for insert
  with check (public.is_internal_role());

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

create policy "assignments_delete_internal" on assignments for delete
  using (public.is_internal_role());

-- --- contracts ---------------------------------------------------------------
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

create policy "contracts_insert_internal" on contracts for insert
  with check (public.is_internal_role());

-- Signed document upload: internal roles, or the municipality/candidate tied to the assignment.
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

create policy "contracts_delete_internal" on contracts for delete
  using (public.is_internal_role());

-- --- notifications ---------------------------------------------------------------
create policy "notifications_select_own" on notifications for select
  using (recipient_id = auth.uid());

create policy "notifications_insert_internal" on notifications for insert
  with check (public.is_internal_role());

create policy "notifications_update_own" on notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- --- activity_log ---------------------------------------------------------------
create policy "activity_log_select_internal" on activity_log for select
  using (public.is_internal_role());

create policy "activity_log_insert_internal" on activity_log for insert
  with check (public.is_internal_role());

-- ============================================================================
-- Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('candidate-documents', 'candidate-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

-- candidate-documents: files stored under `<candidate_id>/...`
create policy "candidate_documents_select" on storage.objects for select
  using (
    bucket_id = 'candidate-documents'
    and (public.is_internal_role() or (storage.foldername(name))[1] = public.current_candidate_id()::text)
  );

create policy "candidate_documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'candidate-documents'
    and (public.is_internal_role() or (storage.foldername(name))[1] = public.current_candidate_id()::text)
  );

-- contracts: files stored under `<assignment_id>/...`
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
