-- Bereinigung aller E2E-Testdaten aus dem echten Supabase-Projekt (siehe
-- docs/e2e-dry-run-2026-07-26.md). Als EINE Ausführung im SQL Editor laufen
-- lassen (temporäre Tabellen leben nur innerhalb derselben Session/Skript-
-- Ausführung). Läuft in einer Transaktion — bei einem Fehler wird alles
-- zurückgerollt, nichts wird teilweise gelöscht.
--
-- Reihenfolge ist zwingend wegen FK-Constraints (on delete restrict):
-- contracts -> assignments -> candidate_proposals -> personnel_requests ->
-- candidates -> profiles/auth.users -> municipalities. notifications und
-- activity_log referenzieren nur profiles (teils on delete cascade) und
-- können früh gelöscht werden. storage.objects hat keine FK-Beziehung und
-- wird am Ende separat bereinigt.

begin;

create temporary table tmp_test_profiles as
  select id from profiles where email like 'e2e-%@dafinex-test.ch';

create temporary table tmp_test_municipalities as
  select id from municipalities where name like 'E2E Test Gemeinde%';

create temporary table tmp_test_candidates as
  select id from candidates where profile_id in (select id from tmp_test_profiles);

create temporary table tmp_test_requests as
  select id from personnel_requests where municipality_id in (select id from tmp_test_municipalities);

create temporary table tmp_test_proposals as
  select id from candidate_proposals
  where request_id in (select id from tmp_test_requests)
     or candidate_id in (select id from tmp_test_candidates);

create temporary table tmp_test_assignments as
  select id from assignments where proposal_id in (select id from tmp_test_proposals);

create temporary table tmp_test_contracts as
  select id from contracts where assignment_id in (select id from tmp_test_assignments);

-- 1. Verträge (referenzieren Einsätze)
delete from contracts where id in (select id from tmp_test_contracts);

-- 2. Einsätze (referenzieren Vorschläge)
delete from assignments where id in (select id from tmp_test_assignments);

-- 3. Benachrichtigungen und Aktivitätenprotokoll (referenzieren nur Profile
--    bzw. lose per entity_id ohne echten FK)
delete from notifications where recipient_id in (select id from tmp_test_profiles);

delete from activity_log
where actor_id in (select id from tmp_test_profiles)
   or entity_id in (select id from tmp_test_requests)
   or entity_id in (select id from tmp_test_proposals)
   or entity_id in (select id from tmp_test_assignments)
   or entity_id in (select id from tmp_test_contracts);

-- 4. Vorschläge (referenzieren Anfragen + Kandidaten)
delete from candidate_proposals where id in (select id from tmp_test_proposals);

-- 5. Personalanfragen (referenzieren Gemeinden)
delete from personnel_requests where id in (select id from tmp_test_requests);

-- 6. Kandidaten (referenzieren Profile über profile_id)
delete from candidates where id in (select id from tmp_test_candidates);

-- 7. Auth-Accounts — löscht via "on delete cascade" automatisch die
--    zugehörigen profiles-Zeilen mit
delete from auth.users where email like 'e2e-%@dafinex-test.ch';

-- 8. Gemeinden (erst jetzt, da personnel_requests/profiles bereits weg sind)
delete from municipalities where id in (select id from tmp_test_municipalities);

-- 9. Hochgeladene Test-Dokumente aus den Storage-Buckets
delete from storage.objects
where bucket_id = 'candidate-documents'
  and (storage.foldername(name))[1] in (select id::text from tmp_test_candidates);

delete from storage.objects
where bucket_id = 'contracts'
  and (storage.foldername(name))[1] in (select id::text from tmp_test_assignments);

commit;
