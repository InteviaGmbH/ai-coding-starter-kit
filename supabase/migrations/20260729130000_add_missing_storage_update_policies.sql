-- PROJ-20 bug fix, found live: replacing an existing document via
-- `.upload(path, file, { upsert: true })` still got 403 "new row
-- violates row-level security policy" even after
-- 20260729120000_fix_candidate_documents_own_folder_check.sql fixed the
-- SELECT/INSERT policies. Root cause: Supabase Storage's upsert path
-- performs an UPDATE (not an INSERT) on storage.objects when an object
-- already exists at that path — and requires the `update` RLS
-- permission for it (this is documented Supabase behavior). Neither
-- candidate-documents nor contracts ever had a `for update` policy on
-- storage.objects at all, for ANY role — with RLS enabled and zero
-- matching policies, every upsert-driven replace is denied outright.
--
-- This is a pre-existing PROJ-1 gap, not introduced by PROJ-20 — it
-- just never surfaced before because no prior real usage replaced an
-- already-uploaded file at the same path (CandidateDocumentCard and
-- ContractCard both use upsert:true, but this is the first live test of
-- an actual replace). ContractCard has the identical upsert call, so
-- it's fixed here too even though it wasn't the reported symptom.
--
-- Safe to re-run: DROP ... IF EXISTS before each CREATE POLICY.

drop policy if exists "candidate_documents_update" on storage.objects;
create policy "candidate_documents_update" on storage.objects for update
  using (
    bucket_id = 'candidate-documents'
    and (
      public.is_internal_role()
      or name like (public.current_candidate_id()::text || '/%')
    )
  )
  with check (
    bucket_id = 'candidate-documents'
    and (
      public.is_internal_role()
      or name like (public.current_candidate_id()::text || '/%')
    )
  );

drop policy if exists "contracts_documents_update" on storage.objects;
create policy "contracts_documents_update" on storage.objects for update
  using (bucket_id = 'contracts' and public.is_internal_role())
  with check (bucket_id = 'contracts' and public.is_internal_role());
