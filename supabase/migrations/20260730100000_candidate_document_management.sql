-- PROJ-16: Vollständiges Dokumentenmanagement (Versionierung, Ablauf, Archivierung)
--
-- Replaces the single-slot candidates.cv_document_path/cv_uploaded_at model
-- with two related tables that support multiple document types (cv,
-- certificate, work_permit), version history, expiry dates, and manual
-- archiving. candidates.cv_document_path/cv_uploaded_at are deliberately
-- NOT dropped — kept as a safety net / rollback path — but no code writes
-- to them anymore after this migration; a one-time backfill below carries
-- any existing CV forward into the new model so nothing is lost.

create table candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates (id) on delete cascade,
  document_type text not null check (document_type in ('cv', 'certificate', 'work_permit')),
  name text not null,
  is_archived boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false
);

-- Only certificates may repeat per candidate; cv/work_permit are singletons.
create unique index candidate_documents_singleton_type
  on candidate_documents (candidate_id, document_type)
  where document_type in ('cv', 'work_permit');

create trigger set_updated_date before update on candidate_documents
  for each row execute function public.set_updated_date();

create table candidate_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references candidate_documents (id) on delete cascade,
  file_path text not null,
  uploaded_at timestamptz not null default now(),
  expiry_date date,
  is_current boolean not null default true,
  created_by_id uuid references profiles (id),
  created_by text
);

-- At most one current version per document — a second safety net beyond
-- the RPC below, which already unsets the old current version first.
create unique index candidate_document_versions_one_current
  on candidate_document_versions (document_id)
  where is_current;

alter table candidate_documents enable row level security;
alter table candidate_document_versions enable row level security;

create policy "candidate_documents_select" on candidate_documents for select
  using (public.is_internal_role() or candidate_id = public.current_candidate_id());

create policy "candidate_documents_insert" on candidate_documents for insert
  with check (public.is_internal_role() or candidate_id = public.current_candidate_id());

create policy "candidate_documents_update" on candidate_documents for update
  using (public.is_internal_role() or candidate_id = public.current_candidate_id())
  with check (public.is_internal_role() or candidate_id = public.current_candidate_id());

-- Column-level lockdown for candidate self-updates, same pattern as
-- enforce_candidate_self_update_columns on candidates (PROJ-20): a
-- candidate may only change name/is_archived on their own document, not
-- reassign it to another candidate or change its type after creation.
create function public.enforce_candidate_document_self_update_columns() returns trigger
  language plpgsql as $$
begin
  if public.current_role() = 'candidate' then
    if new.id is distinct from old.id
      or new.candidate_id is distinct from old.candidate_id
      or new.document_type is distinct from old.document_type
      or new.created_date is distinct from old.created_date
      or new.created_by_id is distinct from old.created_by_id
      or new.created_by is distinct from old.created_by
      or new.is_sample is distinct from old.is_sample
    then
      raise exception 'Kandidaten dürfen bei ihren Dokumenten nur Name und Archiviert-Status ändern';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_candidate_document_self_update_columns
  before update on candidate_documents
  for each row execute function public.enforce_candidate_document_self_update_columns();

-- Cross-table RLS lookup goes through a SECURITY DEFINER helper, not a raw
-- inline subquery — same lesson as PROJ-20 BUG-1 (infinite recursion when
-- two RLS-protected tables read each other directly).
create function public.candidate_document_belongs_to_caller(p_document_id uuid) returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from candidate_documents cd
    where cd.id = p_document_id and cd.candidate_id = public.current_candidate_id()
  );
$$;

create policy "candidate_document_versions_select" on candidate_document_versions for select
  using (public.is_internal_role() or public.candidate_document_belongs_to_caller(document_id));

create policy "candidate_document_versions_insert" on candidate_document_versions for insert
  with check (public.is_internal_role() or public.candidate_document_belongs_to_caller(document_id));

create policy "candidate_document_versions_update" on candidate_document_versions for update
  using (public.is_internal_role() or public.candidate_document_belongs_to_caller(document_id))
  with check (public.is_internal_role() or public.candidate_document_belongs_to_caller(document_id));

create function public.enforce_candidate_document_version_self_update_columns() returns trigger
  language plpgsql as $$
begin
  if public.current_role() = 'candidate' then
    if new.id is distinct from old.id
      or new.document_id is distinct from old.document_id
      or new.file_path is distinct from old.file_path
      or new.uploaded_at is distinct from old.uploaded_at
      or new.expiry_date is distinct from old.expiry_date
      or new.created_by_id is distinct from old.created_by_id
      or new.created_by is distinct from old.created_by
    then
      raise exception 'Kandidaten dürfen bei Dokument-Versionen nur den Status "aktuell" ändern';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_candidate_document_version_self_update_columns
  before update on candidate_document_versions
  for each row execute function public.enforce_candidate_document_version_self_update_columns();

-- Atomic "find-or-create the document, then add a new current version"
-- operation. Not SECURITY DEFINER — runs under the caller's own
-- privileges, so every statement inside is still subject to the RLS
-- policies and triggers above; this only adds atomicity (same pattern as
-- update_own_candidate_contact from PROJ-20 BUG-9).
create function public.save_candidate_document_version(
  p_candidate_id uuid,
  p_document_type text,
  p_name text,
  p_file_path text,
  p_expiry_date date,
  p_document_id uuid default null
) returns uuid
  language plpgsql as $$
declare
  v_document_id uuid;
begin
  if p_document_id is not null then
    v_document_id := p_document_id;
  elsif p_document_type in ('cv', 'work_permit') then
    select id into v_document_id from candidate_documents
      where candidate_id = p_candidate_id and document_type = p_document_type;

    if v_document_id is null then
      insert into candidate_documents (candidate_id, document_type, name)
        values (p_candidate_id, p_document_type, p_name)
        returning id into v_document_id;
    end if;
  else
    insert into candidate_documents (candidate_id, document_type, name)
      values (p_candidate_id, p_document_type, p_name)
      returning id into v_document_id;
  end if;

  update candidate_document_versions set is_current = false
    where document_id = v_document_id and is_current = true;

  insert into candidate_document_versions (document_id, file_path, expiry_date, is_current)
    values (v_document_id, p_file_path, p_expiry_date, true);

  -- Uploading a fresh version un-archives the document — if it was
  -- previously archived (with or without a replacement), actively adding
  -- a new current version means it's clearly active again.
  update candidate_documents set is_archived = false where id = v_document_id;

  return v_document_id;
end;
$$;

-- One-time backfill: carry any existing single-slot CV forward into the
-- new model so nothing already uploaded is lost from the new UI's
-- perspective. Safe to re-run (guarded by candidate_documents_singleton_type
-- uniqueness — on conflict do nothing skips candidates already backfilled).
insert into candidate_documents (candidate_id, document_type, name, created_date)
  select id, 'cv', 'CV', created_date
  from candidates
  where cv_document_path is not null
  on conflict (candidate_id, document_type) where document_type in ('cv', 'work_permit') do nothing;

insert into candidate_document_versions (document_id, file_path, uploaded_at, is_current)
  select cd.id, c.cv_document_path, coalesce(c.cv_uploaded_at, c.updated_date), true
  from candidates c
  join candidate_documents cd on cd.candidate_id = c.id and cd.document_type = 'cv'
  where c.cv_document_path is not null
  on conflict (document_id) where is_current do nothing;
