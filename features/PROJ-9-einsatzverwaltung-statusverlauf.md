# PROJ-9: Einsatzverwaltung mit Statusverlauf

## Status: Approved
**Created:** 2026-07-26
**Last Updated:** 2026-07-26 (QA: 1 Low gefunden, theoretische Race Condition ohne Sicherheitsrisiko — production-ready)

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
|----------|-----------|------|
| Keine neue Tabelle — `assignments` existiert bereits aus PROJ-1 mit passendem `assignment_status`-Enum | Schema deckt bereits alles Nötige ab | 2026-07-26 |
| `assignments_update` (PROJ-1, kein `with check`, liess Gemeinden bislang beliebig schreiben) wird durch `assignments_update_internal` ersetzt (nur `is_internal_role()`) | Schliesst die in der Spec dokumentierte RLS-Lücke; Statuspflege ist ausschliesslich intern (siehe Product Decision) | 2026-07-26 |
| „Einsatz anlegen"-Button wird direkt in die bestehende interne Vorschlagsliste (PROJ-7 `ProposalsTable`) integriert, bei Zeilen mit Status „von Gemeinde angenommen" ohne existierenden Einsatz | Vermeidet eine weitere separate „bereit für Einsatz"-Liste; nutzt den bereits vorhandenen Bildschirm, der Kandidat und Anfrage im Kontext zeigt | 2026-07-26 |
| Neue Routen `/internal/assignments` (Liste) und `/internal/assignments/[id]` (Detail mit „Nächster Schritt"-Aktion) statt einer reinen Statusspalte in der Vorschlagsliste | Ein Einsatz lebt über den ursprünglichen Vorschlags-Kontext hinaus (Wochen/Monate Laufzeit) und braucht einen eigenen, dauerhaften Ort für Status-Updates | 2026-07-26 |
| Statuswechsel serverseitig über eine feste Reihenfolge (`['proposed','accepted','active','completed']`) geprüft: nur `aktuellerIndex + 1` ist zulässig | Verhindert Überspringen/Zurückspringen ohne komplexe Statusmaschine; einfache, robuste Prüfung reicht für die vier Werte | 2026-07-26 |
| `/municipality/assignments` als rein lesende Liste (keine Aktionen) | Konsistent mit der Product Decision „Gemeinde sieht nur lesend zu"; nutzt die bereits bestehende `assignments_select`-Policy unverändert | 2026-07-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/internal/requests/[id]/proposals/ (PROJ-7): ProposalsTable ergänzt um
  "Einsatz anlegen"-Button (nur bei Status "von Gemeinde angenommen" und
  ohne bestehenden Einsatz) → AssignmentFormDialog (Start-/Enddatum,
  vorausgefüllt aus der Anfrage) → Server Action → Redirect zu
  /internal/assignments/[id]

/internal/assignments/                — Liste aller Einsätze (Server Component)
  └── AssignmentsTable                   Kandidat, Gemeinde, Zeitraum, Status-Badge
/internal/assignments/[id]/            — Detailseite
  └── AssignmentStatusActions             "Nächster Schritt: <Status>"-Button (deaktiviert bei "abgeschlossen")

/municipality/assignments/             — Liste eigener Einsätze (Server Component, rein lesend)
  └── MunicipalityAssignmentsTable        Kandidat, Zeitraum, Status-Badge
```
Nav-Ergänzungen: „Einsätze" in `/internal/layout.tsx` (nach „Anfragen") und in `/municipality/layout.tsx` (nach „Anfragen").

### Data Model
Keine neue Tabelle. Nutzt `assignments` (Kern), `candidate_proposals`/`candidates`/`personnel_requests`/`municipalities` (Anzeige-Joins), `activity_log` (Statuswechsel-Ereignis).

### Tech Decisions (Begründung)
- **Feste Statusreihenfolge statt generischer Statusmaschine** — vier Werte, ein Weg vorwärts; eine Indexprüfung ist die einfachste korrekte Lösung und leicht nachvollziehbar.
- **Rein interne Update-Policy statt bedingter Gemeinde-Policy** (anders als bei PROJ-8s `candidate_proposals`) — hier gibt es keinen fachlichen Grund, warum die Gemeinde selbst einen Status setzen sollte; „nur lesen" ist die einfachere und sicherere Wahl.
- **Einsatz-Erstellung im Kontext der Vorschlagsliste statt eigener „bereit"-Liste** — hält den Nutzungsfluss zusammenhängend (Vorschlag ansehen → Gemeinde hat angenommen → Einsatz anlegen), ohne eine zusätzliche Seite zu pflegen.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Table, Badge, Dialog, Button, Input) aus PROJ-3/4/5/6/7/8.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- Neue Migration `supabase/migrations/20260726110000_assignments_internal_only_update.sql` (+ gleiche Änderung bereits in `20260725120000_init_schema.sql` für Neuinstallationen): `assignments_update` (bisher ohne `with check`, Gemeinden konnten uneingeschränkt schreiben) ersetzt durch `assignments_update_internal` (nur `is_internal_role()`)
- `src/app/internal/assignments/actions.ts`: `createAssignment` (nur aus Status „von Gemeinde angenommen", Duplikatsprüfung, Zod-Validierung Start/Enddatum, `activity_log`-Eintrag), `advanceAssignmentStatus` (feste Reihenfolge `proposed→accepted→active→completed`, lehnt Aufruf bei bereits „abgeschlossen" ab, `activity_log`-Eintrag); beide prüfen die Anzahl betroffener Zeilen statt nur auf `error`
- `src/components/portal/create-assignment-dialog.tsx`: Dialog mit Start-/Enddatum (vorausgefüllt aus der Anfrage), in `proposals-table.tsx` (PROJ-7) bei Status „von Gemeinde angenommen" ohne bestehenden Einsatz eingebunden; existiert bereits ein Einsatz, zeigt die Zeile stattdessen „Einsatz ansehen"
- `src/app/internal/assignments/page.tsx` + `[id]/page.tsx` + `assignments-table.tsx` + `assignment-status-actions.tsx`: Liste aller Einsätze, Detailseite mit „Nächster Schritt: <Status>"-Button (deaktiviert bei „abgeschlossen")
- `src/app/municipality/assignments/page.tsx` + `municipality-assignments-table.tsx`: rein lesende Liste eigener Einsätze, verlässt sich auf die bestehende `assignments_select`-RLS
- Nav-Ergänzung „Einsätze" in `internal/layout.tsx` und `municipality/layout.tsx`
- 8 neue Vitest-Tests für `internal/assignments/actions.ts` (Berechtigung, falscher Vorschlags-Status, Duplikat, Datumsvalidierung, erfolgreiche Erstellung inkl. Aktivitätseintrag, Statusfortschritt, Ablehnung bei „abgeschlossen")
- `npm test` (48/48), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: alle drei neuen geschützten Routen → 307-Redirect ohne Login

## QA Test Results

**Tested:** 2026-07-26
**App URL:** http://localhost:3000 (laufender Dev-Server, echtes Supabase-Projekt)
**Migrationsstatus:** `20260726110000` erfolgreich gegen das echte Supabase-Projekt ausgeführt (2026-07-26, bestätigt durch Nutzer)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 48/48 grün (8 neue Tests für `internal/assignments/actions.ts`)
- `npm run build`: erfolgreich
- E2E (`tests/PROJ-9-einsatzverwaltung-statusverlauf.spec.ts`): 6/6 grün (Chromium + Mobile Safari, alle drei neuen Routen → Redirect zu `/login`)

### Coverage-Lücke (dokumentiert, kein Bug)
Der eigentliche Erstellungs-/Statusfortschritts-Workflow im Browser konnte mangels aktivem `dafinex_admin`-Testkonto und echter Vorschlagsdaten nicht per E2E gegen die echte Anwendung getestet werden (gleiche Einschränkung wie PROJ-2–8). Nach der bei PROJ-8 gemachten Erfahrung wurde diese QA gezielt mit einer detaillierten RLS-Analyse aller neuen/berührten Schreibpfade durchgeführt (nicht nur Server-Action-Code-Review) — siehe Security Audit.

### Acceptance Criteria Status
- [x] „Einsatz anlegen" nur bei „von Gemeinde angenommen", Start/Enddatum vorausgefüllt aus der Anfrage (Vitest + Code-Review)
- [x] Validierungsfehler bei fehlendem Start-/zu frühem Enddatum (Vitest)
- [x] Kein zweiter „Einsatz anlegen"-Button, sobald ein Einsatz existiert — zeigt stattdessen „Einsatz ansehen" (Code-Review: `proposals-table.tsx`)
- [x] Interne Einsatzliste mit Status/Kandidat/Gemeinde/Zeitraum (Code-Review)
- [x] Statusfortschritt zur jeweils nächsten Stufe inkl. Aktivitätseintrag (Vitest)
- [x] Überspringen/Zurückspringen serverseitig verhindert (Vitest: feste `STATUS_ORDER`-Indexprüfung)
- [x] „Abgeschlossen" ist Endzustand, Aktion deaktiviert (Vitest + Code-Review: Button `disabled` bei `isFinal`)
- [x] Gemeinde sieht nur eigene Einsätze, rein lesend (Code-Review: `assignments_select`-RLS unverändert, keine Aktions-UI in `/municipality/assignments`)
- [x] Leere Liste zeigt Hinweistext (Code-Review, beide Tabellen)
- [x] `municipality`/`candidate` können Status nicht per direktem Aufruf ändern (Vitest: `requireInternalRole()`; RLS: `assignments_update_internal`/`assignments_insert_internal` nur `is_internal_role()`)

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff → Redirect auf allen drei neuen Routen (E2E bestätigt)
- [x] `assignments_update_internal` (neu) hat keine Gemeinde-Ausnahme mehr — im Gegensatz zur alten `assignments_update`-Policy aus PROJ-1, die keinerlei `with check` hatte; verifiziert, dass die neue Policy ausschliesslich `is_internal_role()` prüft
- [x] `activity_log`/`assignments`-Inserts/Updates laufen ausschliesslich über bereits bestehende `_internal`-Policies — anders als bei PROJ-8 gibt es hier keinen neuen municipality-seitigen Schreibpfad, der eine zusätzliche RLS-Lücke hätte öffnen können (gezielt aus der PROJ-8-Erfahrung geprüft)
- [x] Statuswechsel-Server-Action erlaubt ausschliesslich `aktuellerIndex + 1`, kein beliebiger Zielwert (Vitest, kein Enum-Wert wird vom Client übernommen)
- [ ] BUG-1 (Low): `createAssignment` prüft Duplikate über eine vorherige SELECT-Abfrage, nicht über eine DB-Unique-Constraint auf `assignments.proposal_id` — bei zwei nahezu gleichzeitigen Klicks auf „Einsatz anlegen" für denselben Vorschlag könnten theoretisch zwei Einsätze entstehen (analoge, bereits in PROJ-7 akzeptierte Absicherung auf Anwendungsebene statt DB-Ebene)

### Bugs Found

#### BUG-1: Theoretische Race Condition bei gleichzeitiger Einsatzerstellung für denselben Vorschlag
- **Severity:** Low
- **Steps to Reproduce:**
  1. Zwei interne Nutzer öffnen gleichzeitig denselben „von Gemeinde angenommenen" Vorschlag und klicken nahezu zeitgleich auf „Einsatz anlegen"
  2. Beide Anfragen bestehen die Duplikatsprüfung (SELECT vor INSERT), da noch kein Einsatz existiert
  3. Beide Inserts gelingen — zwei Einsätze für denselben Vorschlag
  4. Sehr geringe Eintrittswahrscheinlichkeit bei einem 2-3-köpfigen Pilotteam; kein Sicherheitsrisiko, nur ein Datenintegritäts-Kuriosum
- **Priority:** Nice to have — könnte mit einer `unique`-Constraint auf `assignments.proposal_id` behoben werden, falls es in der Praxis je auftritt

### Summary
- **Acceptance Criteria:** Alle 10 Kriterien bestätigt (Server-Action-Logik vollständig per Vitest abgedeckt, UI-/RLS-Verhalten per gezielter Code-Review)
- **Bugs Found:** 1 total (1 Low, theoretische Race Condition, kein Sicherheitsrisiko)
- **Security:** Keine Autorisierungslücke — im Gegensatz zu PROJ-8 wurde hier kein neuer municipality-seitiger Schreibpfad eingeführt, daher auch kein analoges RLS-Insert-Problem; die alte, ungeschützte `assignments_update`-Policy aus PROJ-1 wurde geschlossen
- **Production Ready:** **YES** — keine offenen Critical/High/Medium-Bugs
- **Empfehlung:** Migration bereits ausgeführt (siehe Migrationsstatus oben). Sobald ein `dafinex_admin`-Testkonto existiert, den vollständigen Einsatz-Lebenszyklus einmal end-to-end manuell verifizieren

## Deployment
_To be added by /deploy_
