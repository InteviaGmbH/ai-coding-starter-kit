-- PROJ-18: Alle Benachrichtigungstrigger + Erinnerungslogik
--
-- Adds a "was this already reminded about?" flag per reminder type on the
-- four tables the central reminder check (run on /internal/dashboard load)
-- looks at. Each flag starts false and flips to true exactly once, the
-- first time the corresponding reminder is actually sent — preventing the
-- same fact from generating the same reminder on every dashboard load.
--
-- No RLS/policy changes needed: internal roles already have unrestricted
-- UPDATE access on all four tables (candidate_document_versions_update,
-- assignments_update, contracts_update, candidate_proposals_update_internal
-- all already allow is_internal_role() with no column-lockdown trigger
-- that would apply to internal actors), and the reminder check itself only
-- ever runs in an internal-authenticated request.

alter table candidate_document_versions
  add column expiring_soon_notified boolean not null default false,
  add column expired_notified boolean not null default false;

alter table assignments
  add column start_reminder_sent boolean not null default false,
  add column end_reminder_sent boolean not null default false;

alter table contracts
  add column signature_reminder_sent boolean not null default false;

alter table candidate_proposals
  add column decision_reminder_sent boolean not null default false;
