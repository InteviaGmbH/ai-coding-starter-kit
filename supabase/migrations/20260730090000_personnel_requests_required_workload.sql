-- PROJ-14: Volle Matching-Score-Formel mit einstellbaren Gewichtungen
-- Additive, optional field so the candidate matching score has a target
-- value to compare a candidate's own max_workload_percent (PROJ-20)
-- against. No existing behavior changes if left unset.

alter table personnel_requests
  add column required_workload_percent integer;

alter table personnel_requests
  add constraint personnel_requests_required_workload_range
    check (required_workload_percent is null or (required_workload_percent between 0 and 100));
