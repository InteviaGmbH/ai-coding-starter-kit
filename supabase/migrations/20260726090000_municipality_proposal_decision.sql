-- PROJ-8: Gemeinde-Interview & Annahme
-- Two RLS changes on the existing candidate_proposals table:
-- 1. Tighten municipality SELECT visibility: proposals still under internal
--    review ('proposed') or internally rejected ('rejected') must never be
--    visible to the owning municipality — only once internally 'approved'
--    (or later). The candidate branch is intentionally left untouched
--    (out of scope for this feature).
-- 2. Allow the owning municipality to move an 'approved' proposal to
--    'municipality_accepted'/'municipality_declined' — no other transition
--    or municipality is permitted.
-- Safe to re-run: DROP ... IF EXISTS before each CREATE POLICY.

drop policy if exists "candidate_proposals_select" on candidate_proposals;
create policy "candidate_proposals_select" on candidate_proposals for select
  using (
    public.is_active()
    and (
      public.is_internal_role()
      or candidate_id = public.current_candidate_id()
      or (
        request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id())
        and status not in ('proposed', 'rejected')
      )
    )
  );

drop policy if exists "candidate_proposals_update_municipality_decision" on candidate_proposals;
create policy "candidate_proposals_update_municipality_decision" on candidate_proposals for update
  using (
    public.is_active()
    and public.current_role() = 'municipality'
    and status = 'approved'
    and request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id())
  )
  with check (
    status in ('municipality_accepted', 'municipality_declined')
    and request_id in (select id from personnel_requests where municipality_id = public.current_municipality_id())
  );
