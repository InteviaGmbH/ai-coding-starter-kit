-- PROJ-15 QA fixes (BUG-15-1, BUG-15-3)

-- ============================================================================
-- BUG-15-1: contracts already fully signed under the old single-upload
-- model (status='signed', from before contract_signatures existed) have
-- zero contract_signatures rows — the new panel showed them as "Offen"
-- for all three parties, directly contradicting the existing
-- "Unterschrieben" badge on the same page. PROJ-10 is already Deployed,
-- so real signed contracts may already exist in production.
--
-- The old model never tracked per-party signer/timestamp/IP, only a
-- single uploaded file — so genuine per-party details can't be
-- reconstructed. This backfills one synthetic 'upload' row per party for
-- every already-signed contract, pointing at the same legacy
-- signed_document_path file and using the contract's updated_date as the
-- best available approximation of when it became signed. created_by
-- clearly marks these as migrated, distinguishing them from a real
-- internal fallback upload.
--
-- Safe to re-run: ON CONFLICT on the (contract_id, party_type) unique
-- index skips contracts already backfilled (or already signed for real
-- through the new flow).
-- ============================================================================

insert into contract_signatures (contract_id, party_type, method, file_path, signed_at, created_by)
select c.id, party.party_type, 'upload', c.signed_document_path, c.updated_date, 'Migriert (Altsystem vor PROJ-15)'
from contracts c
cross join (values ('dafinex'), ('municipality'), ('candidate')) as party(party_type)
where c.status = 'signed'
  and c.signed_document_path is not null
on conflict (contract_id, party_type) do nothing;

-- ============================================================================
-- BUG-15-3: two parties completing the contract in close succession could
-- each independently observe "all three parties have now signed" (each
-- reads the count in its own follow-up query, after both inserts already
-- committed) and both send the "vollständig unterschrieben" notification.
-- The contract's status itself was never at risk (the existing trigger's
-- own `where status != 'signed'` guard already made that half idempotent)
-- — only the completion *notification* could double-fire.
--
-- Fix: a dedicated claim flag + SECURITY DEFINER RPC that atomically
-- flips it from false to true — Postgres row-level locking guarantees
-- only one of two concurrent callers ever sees `true` back, so only one
-- of them sends the notification. SECURITY DEFINER is required for the
-- same reason as check_contract_fully_signed: a municipality/candidate
-- caller has no UPDATE right on `contracts` at all.
-- ============================================================================

alter table contracts add column completion_notified boolean not null default false;

create function public.claim_contract_completion_notification(p_contract_id uuid) returns boolean
  language plpgsql security definer set search_path = public as $$
declare
  v_row_count int;
begin
  update contracts set completion_notified = true
    where id = p_contract_id and status = 'signed' and completion_notified = false;
  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;
