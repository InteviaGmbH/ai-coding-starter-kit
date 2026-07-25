# PROJ-6: Kandidatensuche mit Matching-Filter

## Status: Planned
**Created:** 2026-07-25
**Last Updated:** 2026-07-25

## Dependencies
- Requires: PROJ-4 (Kandidatenverwaltung) — Kandidaten-Datenmodell, Stammdaten
- Requires: PROJ-5 (Personalanfrage-Workflow) — Personalanfragen liefern die Such-Kriterien (Fähigkeiten, Region) und sind der Startpunkt der Suche

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich von einer Personalanfrage aus direkt nach passenden Kandidaten suchen können, damit ich nicht manuell die komplette Kandidatenliste durchsuchen muss.
- Als `dafinex_admin`/`internal_coordinator` möchte ich die aus der Anfrage übernommenen Filter (Fähigkeiten, Region) anpassen oder entfernen können, damit ich die Suche bei Bedarf erweitern kann (z.B. wenn die Region zu eng gefasst war).
- Als `dafinex_admin`/`internal_coordinator` möchte ich die Verfügbarkeit der gefundenen Kandidaten sehen, damit ich selbst beurteilen kann, ob sie zum Zeitraum der Anfrage passen — auch wenn das System das nicht automatisch abgleicht.
- Als `dafinex_admin`/`internal_coordinator` möchte ich erkennen, dass „Kandidat vorschlagen" als nächster Schritt vorgesehen, aber noch nicht verfügbar ist, damit klar ist, was als Nächstes kommt.

## Out of Scope
- Der eigentliche Kandidatenvorschlag (Anlegen eines Eintrags in `candidate_proposals`, interne Freigabe) — das ist PROJ-7; diese Spec liefert dafür nur einen sichtbaren, deaktivierten Platzhalter-Button
- Automatischer Abgleich der Verfügbarkeit (Freitext) gegen den Zeitraum der Anfrage — Verfügbarkeit wird nur informativ angezeigt, nicht gefiltert (siehe Decision Log)
- Volle Matching-Score-Formel mit Gewichtungen (→ PROJ-14, Phase 2) — hier nur einfache Ausschluss-Filter, kein Scoring/Ranking
- Eigenständige, von einer Anfrage unabhängige Kandidatensuche — die allgemeine Kandidatenliste mit einfachem Text-Filter existiert bereits in PROJ-4 und wird hier nicht dupliziert
- Anzeige ausstehender (nicht freigeschalteter) Selbstregistrierungen — diese werden ausgeblendet (siehe Decision Log)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` öffnet die Detailseite einer Personalanfrage, wenn er auf „Kandidaten suchen" klickt, dann öffnet sich die Kandidatensuche mit den Fähigkeiten und der Region der Anfrage als vorausgefüllte, aktive Filter
- [ ] Angenommen die Filter sind aktiv, wenn die Trefferliste angezeigt wird, dann werden ausschliesslich Kandidaten angezeigt, die ALLE aktiven Filterkriterien erfüllen
- [ ] Angenommen ein Nutzer entfernt oder ändert einen vorausgefüllten Filter, wenn die Liste neu geladen wird, dann berücksichtigt das Ergebnis nur noch die verbleibenden aktiven Filter
- [ ] Angenommen kein Filter ist aktiv (alle entfernt), wenn die Liste angezeigt wird, dann werden alle infrage kommenden Kandidaten angezeigt (siehe Sichtbarkeitsregeln)
- [ ] Angenommen ein Kandidat hat ein verknüpftes Login-Konto mit Status „ausstehend", wenn die Suche ausgeführt wird, dann erscheint dieser Kandidat nicht in der Trefferliste
- [ ] Angenommen ein Kandidat wurde intern erfasst (kein Login-Konto) oder hat ein aktives Konto, wenn er die aktiven Filter erfüllt, dann erscheint er in der Trefferliste
- [ ] Angenommen die Trefferliste wird angezeigt, dann ist die Verfügbarkeit jedes Kandidaten sichtbar, ohne dass danach gefiltert werden kann
- [ ] Angenommen kein Kandidat erfüllt die aktiven Filter, wenn die Liste angezeigt wird, dann erscheint ein Hinweistext statt einer leeren Tabelle
- [ ] Angenommen die Trefferliste wird angezeigt, dann ist pro Kandidat ein deaktivierter „Kandidat vorschlagen"-Button mit Hinweis sichtbar, dass diese Funktion mit PROJ-7 folgt
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht, die Kandidatensuche direkt aufzurufen, dann wird er serverseitig auf sein eigenes Portal zurückgeleitet

## Edge Cases
- Personalanfrage ohne hinterlegte Fähigkeiten oder Region → Suche startet ohne diese Filter vorausgefüllt (kein Fehler, einfach kein Startwert)
- Kandidat mit leerer Fähigkeiten-Liste → erfüllt einen aktiven Fähigkeiten-Filter nie, erscheint entsprechend nicht in gefilterten Ergebnissen (erwartetes Verhalten, kein Bug)
- Anfrage-ID in der URL existiert nicht (z.B. gelöscht/zurückgezogen) → verständliche Fehlermeldung statt Absturz
- Gemeinde-Region-Schreibweise weicht von Kandidaten-Region-Schreibweise ab (z.B. „Zürich" vs. „Kanton Zürich") → Freitext-Vergleich ist nicht garantiert exakt; als bekannte Einschränkung dokumentiert (siehe Open Questions), kein Bug
- Sehr grosse Kandidatenliste → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bereits in PROJ-4 entschieden)

## Technical Requirements (optional)
- Security: Zugriff ausschliesslich über `/internal/*`-Portal, serverseitige Rollen-/Status-Prüfung
- Wiederverwendung der in PROJ-4 etablierten Kandidaten-Datenstruktur, keine neuen Tabellen

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll der Region-Abgleich exakte Übereinstimmung oder ein "enthält"-Vergleich sein, angesichts uneinheitlicher Schreibweisen (z.B. „Zürich" vs. „Kanton Zürich")? Vorläufige Annahme für die Architektur: Teilstring-Vergleich, case-insensitive.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PROJ-6 ist eine Kontextsuche ausgehend von einer Personalanfrage, keine eigenständige allgemeine Suche | Vermeidet Duplikation zur bereits in PROJ-4 bestehenden Kandidatenliste mit Text-Filter; PRD-Vorgabe "Filter: Fähigkeiten/Region/Verfügbarkeit" wird konkret auf den Anfrage-Kontext bezogen | 2026-07-25 |
| Filter sind vorausgefüllt aus der Anfrage, aber änderbar; sie blenden nicht-passende Kandidaten aus (kein Scoring/Ranking) | Einfache, vorhersehbare Logik für den Pilot; echtes Scoring ist bewusst Phase 2 (PROJ-14) | 2026-07-25 |
| Verfügbarkeit wird nur angezeigt, nicht gefiltert | Verfügbarkeit ist Freitext (kein strukturiertes Datum) und lässt sich nicht zuverlässig automatisch mit dem Anfrage-Zeitraum abgleichen | 2026-07-25 |
| „Kandidat vorschlagen"-Button ist bereits sichtbar, aber deaktiviert mit Hinweis auf PROJ-7 | Bereitet die UI optisch auf den nächsten Ausbauschritt vor, ohne die noch nicht existierende Vorschlags-Logik vorwegzunehmen | 2026-07-25 |
| Kandidaten mit ausstehendem (nicht freigeschaltetem) Login-Konto werden aus der Trefferliste ausgeblendet | Diese Kandidaten wurden von Dafinex noch nicht geprüft und sollten keiner Gemeinde vorgeschlagen werden können; intern erfasste Kandidaten ohne Konto sind davon nicht betroffen | 2026-07-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## Implementation Notes (Frontend/Backend)
_To be added by /frontend and /backend_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
