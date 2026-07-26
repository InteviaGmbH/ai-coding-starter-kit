# PROJ-9: Einsatzverwaltung mit Statusverlauf

## Status: Planned
**Created:** 2026-07-26

## Dependencies
- Requires: PROJ-8 (Gemeinde-Interview & Annahme) — nur Vorschläge mit Status „von Gemeinde angenommen" sind die Grundlage für einen Einsatz

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich aus einem von der Gemeinde angenommenen Vorschlag einen Einsatz anlegen, damit der Übergang vom Vorschlag zum tatsächlichen Einsatz dokumentiert ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich den Status eines Einsatzes Schritt für Schritt vorantreiben (vorgeschlagen → akzeptiert → aktiv → abgeschlossen), damit der aktuelle Stand jederzeit nachvollziehbar ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich alle Einsätze mit Status, Kandidat, Gemeinde und Zeitraum sehen, damit ich den Überblick über laufende Einsätze behalte.
- Als `municipality`-Nutzer möchte ich meine eigenen Einsätze mit aktuellem Status sehen, damit ich weiss, wann ein Einsatz beginnt bzw. läuft.

## Out of Scope
- Automatische Einsatzerstellung, sobald ein Vorschlag „von Gemeinde angenommen" wird — die Erstellung bleibt eine bewusste interne Aktion (siehe Decision Log)
- Kandidaten-seitige Ansicht der eigenen Einsätze (Lese-RLS existiert bereits aus PROJ-1, aber kein Bildschirm in dieser Spec) — konsistent mit dem schrittweisen Ausbau des Kandidatenportals in vorherigen Specs
- Vertragsgenerierung nach Abschluss/Beginn eines Einsatzes (→ PROJ-10)
- Benachrichtigungen über den bestehenden einfachen Mechanismus hinaus (volles Trigger-System → PROJ-11)
- Terminüberschneidungs-/Konfliktprüfung zwischen mehreren Einsätzen desselben Kandidaten — nicht im PRD-Scope für den Piloten
- Zurückspringen oder Überspringen von Status-Stufen — der Verlauf ist streng linear vorwärts

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Vorschlag hat Status „von Gemeinde angenommen" und noch keinen Einsatz, wenn ein interner Nutzer „Einsatz anlegen" klickt und Start-/Enddatum bestätigt (vorausgefüllt aus der zugehörigen Anfrage, editierbar), dann wird ein Einsatz mit Status „vorgeschlagen" angelegt und ein Aktivitätseintrag erstellt
- [ ] Angenommen das Startdatum fehlt oder das Enddatum liegt davor, wenn das Formular abgeschickt wird, dann erscheint eine Validierungsfehlermeldung und nichts wird gespeichert
- [ ] Angenommen ein Vorschlag hat bereits einen Einsatz, dann ist „Einsatz anlegen" für diesen Vorschlag nicht mehr verfügbar (kein Duplikat)
- [ ] Angenommen ein interner Nutzer öffnet die Einsatzliste, dann sieht er alle Einsätze mit Status, Kandidat, Gemeinde und Zeitraum
- [ ] Angenommen ein Einsatz hat einen Status ungleich „abgeschlossen", wenn ein interner Nutzer ihn auf die jeweils nächste Stufe setzt, dann wechselt der Status entsprechend und ein Aktivitätseintrag wird erstellt
- [ ] Angenommen ein interner Nutzer versucht, eine Stufe zu überspringen oder zurückzuspringen, dann wird dies serverseitig verhindert
- [ ] Angenommen ein Einsatz hat Status „abgeschlossen", dann ist keine weitere Statusänderung mehr möglich (Aktion deaktiviert)
- [ ] Angenommen ein `municipality`-Nutzer öffnet sein Portal, dann sieht er ausschliesslich die Einsätze seiner eigenen Gemeinde, rein lesend (keine Statusänderung möglich)
- [ ] Angenommen eine Einsatzliste ist leer, wenn sie geöffnet wird, dann wird ein Hinweistext statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein `municipality`- oder `candidate`-Nutzer versucht per direktem Aufruf, den Status eines Einsatzes zu ändern, dann wird dies durch RLS und serverseitige Prüfung verhindert

## Edge Cases
- Vorschlag wird nach Einsatzerstellung nachträglich extern verändert (sollte praktisch nicht vorkommen, da Vorschlags-Entscheidungen final sind, siehe PROJ-7/8) → nicht weiter geprüft, ausserhalb des Scopes
- Zwei interne Nutzer erstellen gleichzeitig einen Einsatz zum selben Vorschlag → zweiter Versuch scheitert an der Duplikatsprüfung
- Zwei interne Nutzer setzen gleichzeitig denselben Einsatz auf die nächste Stufe → zweiter Versuch scheitert serverseitig (Status hat sich bereits geändert), Hinweis statt stiller Erfolg oder falscher Sprung
- Sehr viele Einsätze → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bei PROJ-4/6/7/8)

## Technical Requirements (optional)
- Security: RLS-Härtung erforderlich — die bestehende `assignments_update`-Policy aus PROJ-1 erlaubt der Gemeinde aktuell uneingeschränkten Schreibzugriff (kein `with check`); wird durch eine rein interne Update-Policy ersetzt (siehe Decision Log)
- Statuswechsel serverseitig per Zod validiert (nur der jeweils nächste Wert in der festen Reihenfolge ist zulässig)
- Zugriff: interne Aktionen über `/internal/*`, Lesezugriff der Gemeinde über `/municipality/*`

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll ein Kandidaten-Bildschirm für die eigenen Einsätze in einem separaten Ausbauschritt ergänzt werden? Aktuell als Out of Scope zurückgestellt (RLS ist bereits vorbereitet)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–8 vereinbart | 2026-07-26 |
| Einsatz-Erstellung ist eine bewusste interne Aktion, kein Auto-Trigger bei „von Gemeinde angenommen" | Hält die Kontrolle beim internen Team (z.B. um Start-/Enddatum final zu prüfen/anzupassen), konsistent mit der MVP-Einfachheit ohne versteckte Automatik | 2026-07-26 |
| Statusverlauf ist streng linear vorwärts (`vorgeschlagen` → `akzeptiert` → `aktiv` → `abgeschlossen`), kein Zurück, kein Überspringen | Einfaches, für den Piloten ausreichendes Modell; deckt sich mit der PRD-Vorgabe „Statusverlauf" wörtlich | 2026-07-26 |
| Nur interne Rollen dürfen den Status ändern; Gemeinde sieht nur lesend zu | Schliesst eine bestehende RLS-Lücke aus PROJ-1 (`assignments_update` liess Gemeinden bisher uneingeschränkt schreiben); Statuspflege ist im PRD als interner Prozess beschrieben | 2026-07-26 |
| Kandidaten-seitige Ansicht der eigenen Einsätze wird in dieser Spec nicht gebaut | Konsistent mit dem schrittweisen Portal-Ausbau in PROJ-2–8; RLS unterstützt es bereits für eine spätere Ergänzung | 2026-07-26 |

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
