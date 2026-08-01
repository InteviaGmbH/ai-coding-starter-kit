-- PROJ-19: Vollständige Dashboards für alle Rollen
--
-- Lets each user hide individual dashboard widgets (stats/activity/chart/
-- quick actions) — a plain array of widget keys they've chosen to hide.
-- No RLS/policy change needed: profiles_update_own_limited already lets a
-- user update their own row, and this column isn't part of that policy's
-- WITH CHECK restrictions (role/account_status/municipality_id/
-- candidate_id), so it's freely self-updatable like any other own-profile
-- field.

alter table profiles
  add column hidden_dashboard_widgets text[] not null default '{}';
