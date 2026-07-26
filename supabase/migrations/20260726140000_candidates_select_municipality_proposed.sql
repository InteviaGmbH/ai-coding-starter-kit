-- PROJ-8 regression fix, found via a full E2E dry run (PROJ-1-12): the
-- municipality-facing proposals page (/municipality/requests/[id]/proposals)
-- joins candidate_proposals -> candidates to show name/skills/region/
-- availability, but candidates_select (PROJ-1) never granted municipalities
-- any read access at all — only internal roles and the candidate themself.
-- Postgres/PostgREST silently returns null for the joined row instead of an
-- error, so the page rendered "Unbekannt"/"—" for every field, masking the
-- gap through code-review-only QA (no live municipality account existed at
-- the time). Same visibility rule as candidate_proposals_select's
-- municipality branch: only once a proposal is approved or later.
-- Safe to re-run: DROP ... IF EXISTS before CREATE POLICY.

drop policy if exists "candidates_select_municipality_proposed" on candidates;
create policy "candidates_select_municipality_proposed" on candidates for select
  using (
    public.is_active()
    and public.current_role() = 'municipality'
    and id in (
      select cp.candidate_id from candidate_proposals cp
      join personnel_requests pr on pr.id = cp.request_id
      where pr.municipality_id = public.current_municipality_id()
      and cp.status not in ('proposed', 'rejected')
    )
  );
