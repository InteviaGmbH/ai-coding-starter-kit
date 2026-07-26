# PROJ-12: Aktivitätenprotokoll (Basis)

## Status: Planned
**Created:** 2026-07-26

## Dependencies
- Requires: PROJ-5, PROJ-7, PROJ-8, PROJ-9, PROJ-10 — schreiben bereits Einträge in `activity_log` (Anfrage geprüft, Vorschlag vorgeschlagen/freigegeben/abgelehnt/von Gemeinde entschieden, Einsatz angelegt/Statuswechsel, Vertrag generiert/unterschrieben)

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine chronologische Übersicht aller wichtigen Ereignisse im System sehen, damit ich nachvollziehen kann, was passiert ist, ohne jede Detailseite einzeln zu prüfen.
- Als `dafinex_admin`/`internal_coordinator` möchte ich erkennen, wer eine Aktion ausgeführt hat, damit Verantwortlichkeiten nachvollziehbar sind.
- Als `dafinex_admin`/`internal_coordinator` möchte ich verständliche, deutsche Beschreibungen der Ereignisse sehen statt roher technischer Feldwerte (`entity_type`/`action`).

## Out of Scope
- Verlinkung der Einträge zu den betroffenen Anfragen/Vorschlägen/Einsätzen/Verträgen (siehe Decision Log) — kann per `/refine` ergänzt werden
- Filter/Suche (z.B. nach Ereignis-Typ, Zeitraum, Akteur) — für die „Basis"-Version bewusst weggelassen, siehe Decision Log
- Vollständige Historie mit Pagination — nur die letzten 50 Einträge, siehe Decision Log
- Nutzung des `details`-JSONB-Felds aus dem PROJ-1-Schema — aktuell befüllt keine der acht bestehenden Schreibstellen dieses Feld, daher kein Anzeige-Bedarf in dieser Spec
- Sichtbarkeit für `municipality`/`candidate` — die bestehende RLS-Policy `activity_log_select_internal` beschränkt das Protokoll bereits auf interne Rollen; diese Spec ändert daran nichts
- Rückwirkendes Ergänzen von Log-Einträgen für Aktionen, die aktuell keinen Eintrag schreiben (z.B. Gemeinden-/Kandidaten-/Kontofreischaltungs-Aktionen aus PROJ-2/3/4/6) — diese Spec macht ausschliesslich die acht bereits bestehenden Schreibstellen sichtbar, ergänzt keine neuen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein interner Nutzer öffnet `/internal/activity`, dann sieht er die letzten 50 Ereignisse, absteigend nach Zeitpunkt sortiert
- [ ] Angenommen ein Ereignis wird angezeigt, dann sind Akteur (Name), eine verständliche deutsche Beschreibung des Ereignisses und der Zeitpunkt sichtbar
- [ ] Angenommen es liegen noch keine Ereignisse vor, wenn die Seite geöffnet wird, dann erscheint ein Hinweistext statt einer leeren Liste
- [ ] Angenommen ein Ereignis hat eine `entity_type`/`action`-Kombination, für die noch keine deutsche Beschreibung hinterlegt ist, dann wird trotzdem ein sinnvoller Fallback-Text angezeigt statt eines Fehlers oder Absturzes
- [ ] Angenommen der Akteur eines Eintrags ist nicht ermittelbar (`actor_id` ist `null` oder das Profil existiert nicht mehr), dann wird ein Platzhaltertext angezeigt statt eines Fehlers
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht, `/internal/activity` aufzurufen, dann wird er serverseitig auf sein eigenes Portal zurückgeleitet

## Edge Cases
- Sehr viele Ereignisse am selben Tag → reine Sortierung nach Zeitstempel, keine Gruppierung nötig für die Basis-Version
- Unbekannte `entity_type`/`action`-Kombination (z.B. durch eine künftige Feature, die noch nicht ins Mapping aufgenommen wurde) → Fallback-Text statt Absturz (siehe AC)
- Sehr lange Zeit ohne jegliche Aktivität → Hinweistext statt leerer Tabelle
- Direkter Aufruf durch `municipality`/`candidate` → serverseitiger Redirect (Standard-Guard-Muster wie in allen anderen internen Routen)

## Technical Requirements (optional)
- Reine Lesefunktion, keine neue Schreiblogik — nutzt ausschliesslich bereits bestehende `activity_log`-Einträge aus PROJ-5/7/8/9/10
- RLS bereits vorhanden (`activity_log_select_internal` aus PROJ-1) — keine neue Migration erwartet
- Zugriff ausschliesslich über `/internal/*`-Portal

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Sollen Filter, Verlinkung zu den betroffenen Entitäten und/oder Pagination in einem späteren Ausbauschritt ergänzt werden, sobald das Protokoll durch mehr Nutzung länger wird? Aktuell bewusst zurückgestellt (siehe Out of Scope)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eigene globale Seite `/internal/activity` statt Einbettung pro Entität | Einfachste Umsetzung für eine „Basis"-Version, liefert sofort einen vollständigen Überblick ohne vier bestehende Detailseiten anzufassen | 2026-07-26 |
| Keine Verlinkung der Einträge zu den betroffenen Entitäten | Manche Entitäten (Vorschläge, Verträge) haben keinen eigenständigen Detail-Screen bzw. keinen direkten Anfrage-Bezug im `activity_log`-Datensatz selbst — einheitliches „nur Anzeige"-Verhalten ist konsistenter als teilweise Links | 2026-07-26 |
| Kein Filter/keine Suche in der Basis-Version | Bei aktuell vier Entitätstypen und Pilot-Datenvolumen reicht eine einfache chronologische Liste; Filter ist eine naheliegende spätere Ergänzung, aber kein MVP-Erfordernis | 2026-07-26 |
| Nur die letzten 50 Einträge, keine Pagination | Reicht für den Pilot-Massstab (wenige Gemeinden/Anfragen); konsistent mit dem Muster anderer Listen im Projekt (z.B. Benachrichtigungen in PROJ-11) | 2026-07-26 |
| `details`-JSONB-Feld wird nicht angezeigt | Keine der acht bestehenden Schreibstellen befüllt es aktuell — Anzeige eines leeren Felds hätte keinen Nutzen | 2026-07-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |

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
