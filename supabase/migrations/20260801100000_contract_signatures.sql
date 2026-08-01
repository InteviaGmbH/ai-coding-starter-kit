-- PROJ-15: Digitale Multi-Party-Signaturen mit Protokollierung
--
-- Adds contract_signatures: up to three independent, immutable signature
-- rows per contract (dafinex / municipality / candidate), each either a
-- simple electronic signature captured in-app (typed name + timestamp +
-- IP + user agent, all set server-side, never trusted from the client) or
-- — for a candidate without a portal account — an uploaded file, entered
-- on their behalf by internal staff. contracts.status flips to 'signed'
-- automatically once all three exist. The original generated_document_path
-- PDF is never modified; contracts.signed_document_path is left as-is
-- (unused going forward) since it assumed a single document for the whole
-- contract, which is no longer accurate with three independent parties.

create table contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  party_type text not null check (party_type in ('dafinex', 'municipality', 'candidate')),
  method text not null check (method in ('digital', 'upload')),
  signer_name text,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  file_path text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  created_by_id uuid references profiles (id),
  created_by text,
  is_sample boolean not null default false,
  constraint contract_signatures_method_fields check (
    (method = 'digital' and signer_name is not null and file_path is null)
    or (method = 'upload' and file_path is not null)
  )
);

-- One signature per party per contract — enforces immutability: a second
-- attempt for the same party always fails, regardless of how the request
-- is made, not just at the UI layer.
create unique index contract_signatures_one_per_party
  on contract_signatures (contract_id, party_type);

create index contract_signatures_contract_idx on contract_signatures (contract_id);

create trigger set_updated_date before update on contract_signatures
  for each row execute function public.set_updated_date();

-- Flips the contract to 'signed' once all three parties have a row. Needs
-- SECURITY DEFINER: a municipality/candidate inserting their own signature
-- has no UPDATE right on `contracts` at all (contracts_update stays
-- internal-only, unchanged from PROJ-9/10) — same established pattern as
-- link_candidate_profile for "trigger needs to touch a table the caller
-- itself can't write to".
create function public.check_contract_fully_signed() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_party_count int;
begin
  select count(distinct party_type) into v_party_count
    from contract_signatures
    where contract_id = new.contract_id;

  if v_party_count = 3 then
    update contracts set status = 'signed' where id = new.contract_id and status != 'signed';
  end if;

  return new;
end;
$$;

create trigger check_contract_fully_signed
  after insert on contract_signatures
  for each row execute function public.check_contract_fully_signed();

alter table contract_signatures enable row level security;

-- Same visibility chain as contracts_select (PROJ-1 QA fix round):
-- internal sees everything, municipality/candidate see only their own
-- assignment's contract.
create policy "contract_signatures_select" on contract_signatures for select
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or contract_id in (
        select c.id from contracts c
        join assignments a on a.id = c.assignment_id
        join candidate_proposals cp on cp.id = a.proposal_id
        where cp.candidate_id = public.current_candidate_id()
      )
      or contract_id in (
        select c.id from contracts c
        join assignments a on a.id = c.assignment_id
        join candidate_proposals cp on cp.id = a.proposal_id
        join personnel_requests pr on pr.id = cp.request_id
        where pr.municipality_id = public.current_municipality_id()
      )
    )
  );

-- Insert: each role may only ever insert its own party_type row.
-- Internal may insert both 'dafinex' (its own digital signature) and
-- 'candidate' (the file-upload fallback, entered on the candidate's
-- behalf) — never 'municipality', which stays exclusively self-service.
create policy "contract_signatures_insert" on contract_signatures for insert
  with check (
    public.is_active()
    and created_by_id = auth.uid()
    and (
      (public.is_internal_role() and party_type in ('dafinex', 'candidate'))
      or (
        party_type = 'municipality'
        and public.current_role() = 'municipality'
        and contract_id in (
          select c.id from contracts c
          join assignments a on a.id = c.assignment_id
          join candidate_proposals cp on cp.id = a.proposal_id
          join personnel_requests pr on pr.id = cp.request_id
          where pr.municipality_id = public.current_municipality_id()
        )
      )
      or (
        party_type = 'candidate'
        and public.current_role() = 'candidate'
        and method = 'digital'
        and contract_id in (
          select c.id from contracts c
          join assignments a on a.id = c.assignment_id
          join candidate_proposals cp on cp.id = a.proposal_id
          where cp.candidate_id = public.current_candidate_id()
        )
      )
    )
  );

-- No update/delete policy at all — immutable by omission, on top of the
-- unique index above.
