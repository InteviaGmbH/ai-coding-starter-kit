-- Listet alle Storage-Ordner (Bucket + Ordnername), die zu den E2E-Testdaten
-- gehören. NUR LESEND (kein DELETE) — als Vorbereitung für die manuelle
-- Bereinigung in docs/e2e-test-data-storage-cleanup.md.
--
-- WICHTIG: Vor `docs/e2e-test-data-cleanup.sql` ausführen und das Ergebnis
-- notieren/exportieren! Danach sind die Kandidaten-/Einsatz-IDs aus der
-- Datenbank gelöscht und lassen sich nicht mehr auf diesem Weg ermitteln —
-- die Dateien in Storage blieben dann als verwaiste, nicht mehr zuordenbare
-- Ordner zurück.
--
-- Ordner-Layout laut Schema (siehe supabase/README.md):
-- - candidate-documents: <candidate_id>/<dateiname>
-- - contracts:            <assignment_id>/<dateiname>

select 'candidate-documents' as bucket, id::text as folder
from candidates
where profile_id in (
  select id from profiles where email like 'e2e-%@dafinex-test.ch'
)

union all

select 'contracts' as bucket, a.id::text as folder
from assignments a
join candidate_proposals cp on cp.id = a.proposal_id
join personnel_requests pr on pr.id = cp.request_id
join municipalities m on m.id = pr.municipality_id
where m.name like 'E2E Test Gemeinde%'

order by bucket, folder;
