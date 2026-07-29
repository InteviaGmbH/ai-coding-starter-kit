-- PROJ-20 bug fix, found live: a candidate uploading their own CV via
-- /candidate/profile got 403 "new row violates row-level security
-- policy" from storage.objects, even for a file under the size limit
-- and even though candidate_documents_insert's non-internal branch was
-- specifically written (back in PROJ-1) to allow exactly this.
--
-- The candidate branch of candidate_documents_select/insert was never
-- actually exercised before PROJ-20 — every real upload/download of a
-- candidate-documents object so far has gone through the
-- is_internal_role() branch (internal staff via
-- /internal/candidates/[id]), so this is the first live test of
-- `(storage.foldername(name))[1] = current_candidate_id()::text` for a
-- non-internal caller, and it doesn't reliably match here.
--
-- Fix: replace the array-index comparison with a plain prefix match
-- against `name` (the object path is always `<candidate_id>/<filename>`,
-- as documented in the original comment on this policy) — this is the
-- simpler, unambiguous form and removes any dependency on
-- storage.foldername()'s exact array-slicing behavior for this bucket.
-- Not touched here: the equivalent storage.foldername() usage on the
-- `contracts` bucket — that pattern has its own (different) callers and
-- should be verified separately if the same symptom ever shows up there.

drop policy if exists "candidate_documents_select" on storage.objects;
create policy "candidate_documents_select" on storage.objects for select
  using (
    bucket_id = 'candidate-documents'
    and (
      public.is_internal_role()
      or name like (public.current_candidate_id()::text || '/%')
    )
  );

drop policy if exists "candidate_documents_insert" on storage.objects;
create policy "candidate_documents_insert" on storage.objects for insert
  with check (
    bucket_id = 'candidate-documents'
    and (
      public.is_internal_role()
      or name like (public.current_candidate_id()::text || '/%')
    )
  );
