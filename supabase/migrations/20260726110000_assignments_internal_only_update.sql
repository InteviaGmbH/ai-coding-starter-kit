-- PROJ-9: Einsatzverwaltung mit Statusverlauf
-- The PROJ-1 assignments_update policy let the owning municipality write to
-- assignments with no `with check` at all (any column, any value). Status
-- progression is an internal-only process for this feature — replace it with
-- a purely internal policy; the municipality keeps its existing read-only
-- access via assignments_select.
-- Safe to re-run: DROP ... IF EXISTS before each CREATE POLICY.

drop policy if exists "assignments_update" on assignments;
drop policy if exists "assignments_update_internal" on assignments;
create policy "assignments_update_internal" on assignments for update
  using (public.is_internal_role());
