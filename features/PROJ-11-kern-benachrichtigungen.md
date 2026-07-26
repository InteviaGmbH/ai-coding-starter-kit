# PROJ-11: Kern-Benachrichtigungen

## Status: Planned
**Created:** 2026-07-26

## Dependencies
- Requires: PROJ-2 (Auth & Portal-Grundgerüst) — `notifications`-Tabelle, Portal-Shell
- Requires: PROJ-5, PROJ-7, PROJ-8, PROJ-9, PROJ-10 — liefern die Ereignisse, die benachrichtigt werden

## User Stories
- Als Nutzer (egal welche Rolle) möchte ich meine ungelesenen Benachrichtigungen auf einen Blick sehen, damit ich nicht jede Seite manuell nach Neuigkeiten durchsuchen muss.
- Als Nutzer möchte ich eine Benachrichtigung als gelesen markieren können, damit meine Liste übersichtlich bleibt.
- Als `dafinex_admin`/`internal_coordinator` möchte ich benachrichtigt werden, sobald eine Gemeinde eine neue Personalanfrage stellt, damit ich zeitnah reagieren kann.
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, sobald ein Kandidat für meine Anfrage intern freigegeben wurde, damit ich weiss, dass ein Vorschlag auf meine Entscheidung wartet.
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, sobald mein Einsatz aktiv wird, damit ich weiss, dass die Fachkraft nun im Einsatz ist.

## Out of Scope
- E-Mail-/Push-Benachrichtigungen — ausschliesslich In-App (`notifications`-Tabelle), wie bereits in PROJ-2/5/7/8/10 festgelegt
- Erinnerungslogik (z.B. wiederholte Erinnerungen bei fehlender Reaktion) — volle Trigger-/Erinnerungsübersicht ist PROJ-18 (P2)
- Benachrichtigungs-Einstellungen/Präferenzen pro Nutzer (z.B. abschaltbar machen) — nicht im PRD-Scope für den Piloten
- Benachrichtigung bei „abgelehnt" (intern oder durch Gemeinde) — PRD nennt explizit nur „neue Anfrage, Vorschlag, Einsatz aktiv, Vertrag bereit" als Kern-Trigger; Ablehnungen sind bereits über die jeweilige Detailseite sichtbar
- Kandidaten-seitige Trigger — es existieren noch keine Kandidaten-Workflows, die einen der vier PRD-Trigger auslösen (konsistent mit dem schrittweisen Portal-Ausbau); die Benachrichtigungs-UI selbst wird trotzdem auch im Kandidatenportal ergänzt, für künftige Trigger

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Nutzer hat ungelesene Benachrichtigungen, wenn er ein Portal öffnet, dann zeigt ein Glocken-Symbol in der Kopfzeile die Anzahl ungelesener Benachrichtigungen
- [ ] Angenommen ein Nutzer klickt auf das Glocken-Symbol, dann öffnet sich eine Liste der letzten Benachrichtigungen (Nachricht, Datum, gelesen/ungelesen)
- [ ] Angenommen ein Nutzer öffnet eine einzelne Benachrichtigung oder markiert sie explizit, dann wechselt sie zu „gelesen" und die Zähleranzeige aktualisiert sich
- [ ] Angenommen keine Benachrichtigungen vorhanden, wenn die Liste geöffnet wird, dann erscheint ein Hinweistext statt einer leeren Liste
- [ ] Angenommen ein `municipality`-Nutzer erstellt eine neue Personalanfrage, dann erhalten alle aktiven internen Nutzer (`dafinex_admin`/`internal_coordinator`/`super_admin`) je eine Benachrichtigung „Neue Anfrage"
- [ ] Angenommen ein interner Nutzer gibt einen Kandidatenvorschlag frei, dann erhält die erstellende Person der zugehörigen Anfrage eine Benachrichtigung „Neuer Kandidatenvorschlag verfügbar"
- [ ] Angenommen ein interner Nutzer setzt einen Einsatz auf Status „aktiv", dann erhält die erstellende Person der zugehörigen Anfrage eine Benachrichtigung „Einsatz aktiv"
- [ ] Angenommen ein Vertrag wird generiert (PROJ-10), dann bleibt die bestehende „Vertrag bereit"-Benachrichtigung unverändert bestehen
- [ ] Angenommen ein Nutzer versucht per direktem Aufruf, eine Benachrichtigung eines anderen Nutzers als gelesen zu markieren oder eine Benachrichtigung an einen beliebigen Empfänger zu senden, dann wird dies durch RLS und serverseitige Prüfung verhindert

## Edge Cases
- Gemeinde erstellt eine Anfrage, aber es gibt aktuell keine aktiven internen Nutzer (sollte praktisch nicht vorkommen) → Anfrage wird trotzdem erstellt, einfach keine Benachrichtigungen versendet, kein Fehler
- Sehr viele Benachrichtigungen → Liste zeigt die letzten 10, kein Pagination-Mechanismus nötig für den Pilot-Massstab
- Nutzer markiert eine bereits gelesene Benachrichtigung erneut als gelesen → keine Fehlermeldung, bleibt einfach „gelesen" (idempotent)

## Technical Requirements (optional)
- Security: Neue, eng begrenzte RLS-Policy nötig, damit eine Gemeinde beim Erstellen einer Anfrage Benachrichtigungen an mehrere interne Empfänger schreiben kann (aktuell nur `notifications_insert_internal`, das setzt einen internen Akteur voraus) — siehe Decision Log
- Empfänger-Ermittlung für den „neue Anfrage"-Broadcast (welche Profile sind aktiv+intern) erfordert den Admin-Client (`service_role`), da eine Gemeinde per RLS keine fremden `profiles`-Zeilen lesen darf — die eigentliche Benachrichtigungs-`INSERT` läuft weiterhin über den normalen, RLS-geprüften Client
- Bestehendes `notifications_update_own` (PROJ-1) deckt „als gelesen markieren" bereits ab, keine Änderung nötig

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll die Benachrichtigungsliste bei Klick auf eine Benachrichtigung direkt zur betroffenen Anfrage/zum Vorschlag/Einsatz navigieren? Aktuell nur „als gelesen markieren", kein Deep-Link — könnte in `/refine` ergänzt werden

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–10 vereinbart | 2026-07-26 |
| PROJ-11 baut die tatsächliche Benachrichtigungs-UI (Glocke + Liste + „gelesen"-Markierung); bisherige Features (PROJ-2/5/7/8/10) schreiben bereits Zeilen in `notifications`, aber es gab noch keine Oberfläche, sie zu sehen | Diese Lücke wurde beim Vorbereiten dieser Spec festgestellt — ohne UI sind alle bisherigen Benachrichtigungen für Nutzer unsichtbar; das ist der eigentliche Kern dieser Spec, nicht nur zusätzliche Trigger | 2026-07-26 |
| „Neue Anfrage" geht an ALLE aktiven internen Nutzer (Broadcast), nicht an eine bestimmte Person | Zum Zeitpunkt der Anfrage-Erstellung ist noch kein interner Nutzer zugewiesen; im 2-3-köpfigen Pilotteam ist ein Broadcast an alle die einfachste sinnvolle Lösung | 2026-07-26 |
| „Vorschlag"-Trigger feuert bei interner Freigabe (`approved`), nicht bereits bei „vorgeschlagen" | Die Gemeinde sieht laut PROJ-8-RLS ohnehin erst ab „freigegeben"; eine frühere Benachrichtigung wäre für die Gemeinde nutzlos, da sie den Vorschlag noch nicht einsehen könnte | 2026-07-26 |
| „Vertrag bereit" (PROJ-10) wird nicht erneut implementiert, nur die neue UI macht sie erstmals sichtbar | Vermeidet Doppelarbeit; die Trigger-Logik existiert bereits korrekt | 2026-07-26 |

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
