-- PROJ-5: Personalanfrage-Workflow (erstellen & prüfen)
-- The PROJ-1 migration only let internal roles UPDATE/DELETE personnel_requests
-- (for marking a request "reviewed"). PROJ-5 needs the owning municipality to
-- edit or withdraw their own request, but only while it's still unreviewed —
-- add narrowly-scoped policies for that instead of loosening the existing ones.
-- Safe to re-run: DROP ... IF EXISTS before each CREATE POLICY.

drop policy if exists "personnel_requests_update_own_when_created" on personnel_requests;
create policy "personnel_requests_update_own_when_created" on personnel_requests for update
  using (
    public.is_active()
    and public.current_role() = 'municipality'
    and municipality_id = public.current_municipality_id()
    and status = 'created'
  )
  with check (
    municipality_id = public.current_municipality_id()
    and status = 'created'
  );

drop policy if exists "personnel_requests_delete_own_when_created" on personnel_requests;
create policy "personnel_requests_delete_own_when_created" on personnel_requests for delete
  using (
    public.is_active()
    and public.current_role() = 'municipality'
    and municipality_id = public.current_municipality_id()
    and status = 'created'
  );
