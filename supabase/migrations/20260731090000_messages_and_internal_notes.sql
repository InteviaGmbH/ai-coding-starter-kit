-- PROJ-17: Vollständiges Nachrichtensystem
--
-- Two new tables:
-- 1. messages: real communication between Gemeinde/Kandidat and Dafinex.
--    One thread per Anfrage (Gemeinde<->intern), per Einsatz
--    (Kandidat<->intern), or a general thread without any Anfrage-/
--    Einsatz-Bezug (one per Kandidat, one per Gemeinde) for contact before
--    the first request/assignment exists. Gemeinde and Kandidat never talk
--    directly to each other — Dafinex is always the intermediary, exactly
--    as in the existing B2B-Vermittlung model.
-- 2. internal_notes: freetext notes attached to a Kandidat/Anfrage/Einsatz,
--    visible only to internal roles, never to Gemeinde/Kandidat.

create table messages (
  id uuid primary key default gen_random_uuid(),
  message_type text not null check (message_type in ('request', 'assignment', 'general_candidate', 'general_municipality')),
  request_id uuid references personnel_requests (id) on delete cascade,
  assignment_id uuid references assignments (id) on delete cascade,
  candidate_id uuid references candidates (id) on delete cascade,
  municipality_id uuid references municipalities (id) on delete cascade,
  subject text,
  content text not null,
  -- Set once at insert (immutable afterwards, enforced by the trigger
  -- below) — who sent this particular message. Needed to tell messages
  -- apart even after both read flags below eventually become true.
  sent_by_internal boolean not null default false,
  -- Two independent "seen" flags rather than one, because the internal
  -- side is a small team sharing one thread, not a single individual:
  -- "read_by_internal" flips true once ANY internal user opens the
  -- thread; "read_by_counterpart" flips true once the Gemeinde/Kandidat
  -- opens it. Whichever side sent the message already implicitly "read"
  -- it (set by the trigger below), the other flag starts false until the
  -- other side opens the thread (PROJ-17: automatic on open, no click).
  read_by_internal boolean not null default false,
  read_by_counterpart boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false,
  constraint messages_reference_matches_type check (
    (message_type = 'request' and request_id is not null and assignment_id is null and candidate_id is null and municipality_id is null)
    or (message_type = 'assignment' and assignment_id is not null and request_id is null and candidate_id is null and municipality_id is null)
    or (message_type = 'general_candidate' and candidate_id is not null and request_id is null and assignment_id is null and municipality_id is null)
    or (message_type = 'general_municipality' and municipality_id is not null and request_id is null and assignment_id is null and candidate_id is null)
  )
);

create index messages_thread_idx on messages (message_type, request_id, assignment_id, candidate_id, municipality_id);

create trigger set_updated_date before update on messages
  for each row execute function public.set_updated_date();

-- Forces the sender-derived columns from the DB's own view of the caller's
-- role, ignoring whatever the client sent for them — a malicious Gemeinde/
-- Kandidat client can't mark its own outgoing message as already
-- "read_by_internal" to suppress the internal team's unread indicator.
create function public.set_message_sender_flags_on_insert() returns trigger
  language plpgsql as $$
begin
  new.sent_by_internal := public.is_internal_role();
  if new.sent_by_internal then
    new.read_by_internal := true;
    new.read_by_counterpart := false;
  else
    new.read_by_internal := false;
    new.read_by_counterpart := true;
  end if;
  return new;
end;
$$;

create trigger set_message_sender_flags_on_insert
  before insert on messages
  for each row execute function public.set_message_sender_flags_on_insert();

-- Messages are immutable once sent (like email) — only the two read flags
-- may ever change, and each side may only flip its OWN read flag: internal
-- marks read_by_internal, the Gemeinde/Kandidat marks read_by_counterpart.
create function public.enforce_message_read_only_updates() returns trigger
  language plpgsql as $$
begin
  if new.id is distinct from old.id
    or new.message_type is distinct from old.message_type
    or new.request_id is distinct from old.request_id
    or new.assignment_id is distinct from old.assignment_id
    or new.candidate_id is distinct from old.candidate_id
    or new.municipality_id is distinct from old.municipality_id
    or new.subject is distinct from old.subject
    or new.content is distinct from old.content
    or new.sent_by_internal is distinct from old.sent_by_internal
    or new.created_by_id is distinct from old.created_by_id
    or new.created_by is distinct from old.created_by
    or new.created_date is distinct from old.created_date
  then
    raise exception 'Nachrichten können nach dem Senden nicht mehr verändert werden, nur der Gelesen-Status';
  end if;

  if public.is_internal_role() then
    if new.read_by_counterpart is distinct from old.read_by_counterpart then
      raise exception 'Interne Nutzer dürfen nur den internen Gelesen-Status ändern';
    end if;
  else
    if new.read_by_internal is distinct from old.read_by_internal then
      raise exception 'Nur internes Personal darf den internen Gelesen-Status ändern';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_message_read_only_updates
  before update on messages
  for each row execute function public.enforce_message_read_only_updates();

alter table messages enable row level security;

-- Raw subqueries against personnel_requests/assignments/candidate_proposals
-- are safe here (no SECURITY DEFINER helper needed): none of those tables'
-- own RLS policies read from `messages`, so there is no mutual-recursion
-- risk (the 42P17 bug fixed in 20260729100000 was specifically a two-table
-- cycle between personnel_requests and candidate_proposals — messages is a
-- pure leaf reader here, same shape as candidate_proposals_select's own
-- direct personnel_requests subquery).
create policy "messages_select" on messages for select
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or (message_type = 'request' and request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id()))
      or (message_type = 'general_municipality' and municipality_id = public.current_municipality_id())
      or (message_type = 'assignment' and assignment_id in (
            select a.id from assignments a
            join candidate_proposals cp on cp.id = a.proposal_id
            where cp.candidate_id = public.current_candidate_id()
          ))
      or (message_type = 'general_candidate' and candidate_id = public.current_candidate_id())
    )
  );

create policy "messages_insert" on messages for insert
  with check (
    public.is_active()
    and created_by_id = auth.uid()
    and (
      public.is_internal_role()
      or (message_type = 'request' and request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id()))
      or (message_type = 'general_municipality' and municipality_id = public.current_municipality_id())
      or (message_type = 'assignment' and assignment_id in (
            select a.id from assignments a
            join candidate_proposals cp on cp.id = a.proposal_id
            where cp.candidate_id = public.current_candidate_id()
          ))
      or (message_type = 'general_candidate' and candidate_id = public.current_candidate_id())
    )
  );

-- Same visibility condition as select — you can only mark as read a
-- message you're allowed to see in the first place. The trigger above is
-- what actually restricts which column may change.
create policy "messages_update_read_status" on messages for update
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or (message_type = 'request' and request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id()))
      or (message_type = 'general_municipality' and municipality_id = public.current_municipality_id())
      or (message_type = 'assignment' and assignment_id in (
            select a.id from assignments a
            join candidate_proposals cp on cp.id = a.proposal_id
            where cp.candidate_id = public.current_candidate_id()
          ))
      or (message_type = 'general_candidate' and candidate_id = public.current_candidate_id())
    )
  )
  with check (true);

-- --- internal_notes ---------------------------------------------------------------
create table internal_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('candidate', 'request', 'assignment')),
  candidate_id uuid references candidates (id) on delete cascade,
  request_id uuid references personnel_requests (id) on delete cascade,
  assignment_id uuid references assignments (id) on delete cascade,
  content text not null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false,
  constraint internal_notes_reference_matches_type check (
    (entity_type = 'candidate' and candidate_id is not null and request_id is null and assignment_id is null)
    or (entity_type = 'request' and request_id is not null and candidate_id is null and assignment_id is null)
    or (entity_type = 'assignment' and assignment_id is not null and candidate_id is null and request_id is null)
  )
);

create index internal_notes_thread_idx on internal_notes (entity_type, candidate_id, request_id, assignment_id);

create trigger set_updated_date before update on internal_notes
  for each row execute function public.set_updated_date();

alter table internal_notes enable row level security;

-- Internal notes are never visible to Gemeinde/Kandidat, under any
-- circumstance — no counterpart branch at all, unlike messages.
create policy "internal_notes_select" on internal_notes for select
  using (public.is_active() and public.is_internal_role());

create policy "internal_notes_insert" on internal_notes for insert
  with check (public.is_active() and public.is_internal_role() and created_by_id = auth.uid());

-- No update policy: notes are add-or-delete only, never edited (PROJ-17 spec).
create policy "internal_notes_delete" on internal_notes for delete
  using (public.is_active() and public.is_internal_role());

-- --- notifications: new "new_message" broadcast from Gemeinde/Kandidat ---------------------------------------------------------------
-- Mirrors notifications_insert_municipality_new_request (PROJ-11): lets a
-- Gemeinde or Kandidat broadcast a "new message" notification to every
-- currently-active internal user when they send a message. Internal
-- replies to a single Gemeinde/Kandidat recipient already go through the
-- existing, unrestricted notifications_insert_internal policy.
create policy "notifications_insert_counterpart_new_message" on notifications for insert
  with check (
    public.is_active()
    and public.current_role() in ('municipality', 'candidate')
    and type = 'new_message'
    and public.is_active_internal_profile(recipient_id)
  );
