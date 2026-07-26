-- PROJ-10: Einfache Vertragsgenerierung
-- The PROJ-1 contracts_update policy let the tied municipality/candidate
-- write to contracts with no `with check` at all (any column, any value) —
-- the same gap class fixed for candidate_proposals (PROJ-8) and assignments
-- (PROJ-9). PROJ-10 decides both the generated and signed document are
-- uploaded internally only, so both write paths become internal-only.
-- Safe to re-run: DROP ... IF EXISTS before each CREATE POLICY.

drop policy if exists "contracts_update" on contracts;
drop policy if exists "contracts_update_internal" on contracts;
create policy "contracts_update_internal" on contracts for update
  using (public.is_internal_role());

drop policy if exists "contracts_documents_insert" on storage.objects;
create policy "contracts_documents_insert" on storage.objects for insert
  with check (bucket_id = 'contracts' and public.is_internal_role());
