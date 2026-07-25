# PROJ-5: Personalanfrage-Workflow (erstellen & prüfen)

## Status: Approved
**Created:** 2026-07-25
**Last Updated:** 2026-07-25 (QA: 1 Low gefunden und behoben — production-ready)

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — `personnel_requests`-Tabelle, RLS
- Requires: PROJ-2 (Rollenbasierte Auth & Portal-Grundgerüst) — Gemeinde- und internes Portal-Grundgerüst
- Requires: PROJ-3 (Gemeindenverwaltung) — Gemeinden müssen existieren, damit ein Ansprechpartner überhaupt verknüpft werden kann

## User Stories
- Als `municipality`-Nutzer möchte ich eine Personalanfrage erstellen (Rolle/Qualifikation, Fähigkeiten, Region, Zeitraum), damit Dafinex mit der Kandidatensuche beginnen kann.
- Als `municipality`-Nutzer möchte ich meine bisherigen Anfragen mit Status sehen, damit ich den Fortschritt nachvollziehen kann.
- Als `dafinex_admin`/`internal_coordinator` möchte ich alle eingehenden Personalanfragen aller Gemeinden sehen, damit ich weiss, was als Nächstes zu bearbeiten ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine Anfrage als „geprüft" markieren, damit für alle sichtbar ist, dass die interne Prüfung abgeschlossen ist und die Kandidatensuche beginnen kann.
- Als `municipality`-Nutzer möchte ich eine noch nicht geprüfte Anfrage bearbeiten oder zurückziehen können, damit ich Fehler korrigieren kann, bevor Dafinex mit der Arbeit beginnt.

## Out of Scope
- Kandidatensuche/Matching zur Anfrage (→ PROJ-6)
- Kandidatenvorschlag zu einer Anfrage (→ PROJ-7)
- Einsatzverwaltung/-erstellung (→ PROJ-9)
- Benachrichtigungen bei Statuswechsel über den aktuellen In-App-Mechanismus hinaus (volles Trigger-System → PROJ-11); hier nur eine einfache In-App-Benachrichtigung an die erstellende Person bei „geprüft"
- Bearbeiten/Zurückziehen einer bereits geprüften Anfrage durch die Gemeinde — nach Prüfung ist die Anfrage für die Gemeinde nur noch lesbar (Änderungen liefen dann über Dafinex direkt)
- Priorisierung/Dringlichkeitsstufen von Anfragen (in PRD nicht gefordert, kann per `/refine` ergänzt werden)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein `municipality`-Nutzer ist eingeloggt, wenn er „Neue Anfrage" öffnet und Pflichtfelder (Titel/Rolle, Zeitraum) ausfüllt und speichert, dann wird die Anfrage mit Status „erstellt" angelegt und der eigenen Gemeinde zugeordnet
- [ ] Angenommen Pflichtfelder sind leer, wenn das Formular abgeschickt wird, dann erscheint eine Validierungsfehlermeldung und nichts wird gespeichert
- [ ] Angenommen ein `municipality`-Nutzer ist eingeloggt, wenn er seine Anfragenliste öffnet, dann sieht er ausschliesslich Anfragen seiner eigenen Gemeinde mit Status-Badge
- [ ] Angenommen eine Anfrage hat Status „erstellt", wenn der `municipality`-Nutzer sie bearbeitet oder zurückzieht, dann werden die Änderungen übernommen bzw. die Anfrage entfernt
- [ ] Angenommen eine Anfrage hat Status „geprüft", wenn der `municipality`-Nutzer versucht sie zu bearbeiten oder zurückzuziehen, dann wird dies verhindert (Button deaktiviert bzw. Server Action lehnt ab) und ein Hinweis erklärt warum
- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` ist eingeloggt, wenn er die Anfragenliste öffnet, dann sieht er alle Anfragen aller Gemeinden mit Gemeindename, Status und Erstellungsdatum
- [ ] Angenommen eine Anfrage hat Status „erstellt", wenn ein `dafinex_admin`/`internal_coordinator` sie als „geprüft" markiert, dann wechselt der Status, ein Aktivitätseintrag wird erstellt und die erstellende Person erhält eine In-App-Benachrichtigung
- [ ] Angenommen eine Anfrage hat bereits Status „geprüft", wenn erneut versucht wird sie zu prüfen, dann bleibt der Zustand unverändert (keine doppelte Benachrichtigung)
- [ ] Angenommen die Anfragenliste ist leer, wenn sie geöffnet wird (Gemeinde- oder interne Sicht), dann wird ein Hinweistext statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein Nutzer mit Rolle `candidate` ist eingeloggt, wenn er versucht, Personalanfrage-Seiten aufzurufen, dann wird er serverseitig auf sein eigenes Portal zurückgeleitet
- [ ] Angenommen ein `municipality`-Nutzer versucht per direktem Server-Action-Aufruf eine Anfrage einer fremden Gemeinde zu bearbeiten, dann wird dies durch RLS und serverseitige Prüfung verhindert

## Edge Cases
- `municipality`-Nutzer, dessen Konto noch nicht mit einer Gemeinde verknüpft ist (sollte laut PROJ-2 nicht vorkommen, da Verknüpfung Voraussetzung für Freischaltung ist) → defensive Prüfung zeigt verständliche Fehlermeldung statt Absturz
- Zeitraum-Ende liegt vor Zeitraum-Beginn → Validierungsfehler
- Zwei interne Nutzer markieren dieselbe Anfrage gleichzeitig als „geprüft" → zweiter Versuch ändert nichts (Status ist bereits „geprüft", keine doppelte Aktivität/Benachrichtigung)
- Sehr lange Fähigkeiten-/Beschreibungstexte → Kurzform in der Tabelle, volle Anzeige in der Detailansicht
- Löschen (Zurückziehen) einer Anfrage, die technisch bereits referenziert wird (sobald PROJ-7 existiert) → durch bestehenden `on delete restrict` auf `candidate_proposals.request_id` verhindert; da Status „geprüft" das Zurückziehen ohnehin blockiert, sollte dieser Fall in der Praxis nicht auftreten, wird aber als Sicherheitsnetz nicht separat behandelt

## Technical Requirements (optional)
- Security: Schreiboperationen serverseitig per Zod validiert, RLS aus PROJ-1 (`personnel_requests_insert` mit `is_active()`-Prüfung etc.) als zweite Verteidigungslinie
- Zugriff: `municipality`-Rolle über `/municipality/*`, interne Rollen über `/internal/*`

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll „Zurückziehen" ein Hard-Delete sein oder ein eigener Status (z.B. „zurückgezogen") für Nachvollziehbarkeit? Aktuell als Hard-Delete umgesetzt (kein eigener Status in `request_status` aus PROJ-1 vorgesehen)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für PROJ-2–PROJ-5) | Wie bei PROJ-2/3/4 vereinbart | 2026-07-25 |
| Nach „geprüft" kann die Gemeinde die Anfrage nicht mehr bearbeiten/zurückziehen | Verhindert, dass Änderungen unbemerkt an Dafinex vorbeigehen, nachdem die interne Bearbeitung/Kandidatensuche begonnen hat | 2026-07-25 |
| Zurückziehen ist ein Hard-Delete (kein „zurückgezogen"-Status) | `request_status` aus PROJ-1 kennt nur `created`/`reviewed`; ein dritter Status wäre eine Schema-Änderung ausserhalb des aktuellen Scopes — als offene Frage vermerkt | 2026-07-25 |
| Einfache In-App-Benachrichtigung bei „geprüft" statt volles Trigger-System | Konsistent mit der in PROJ-2 getroffenen Entscheidung (Notifications-Basis vorhanden, volles System ist PROJ-11) | 2026-07-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Tabelle — `personnel_requests` existiert bereits aus PROJ-1 | Schema (inkl. `status request_status`) deckt bereits alles Nötige ab | 2026-07-25 |
| `municipality_id` beim Erstellen wird serverseitig immer aus dem eigenen Profil des Nutzers gesetzt, nie aus Client-Eingaben übernommen | Konsistent mit der PROJ-1-BUG-2-Lehre: IDs, die Sichtbarkeits-Grenzen definieren, dürfen nie aus Client-Daten stammen | 2026-07-25 |
| „Als geprüft markieren" ist idempotent (kein Fehler/keine doppelte Aktion bei erneutem Aufruf auf einer bereits geprüften Anfrage) | Deckt den Edge Case „zwei interne Nutzer klicken gleichzeitig" ohne zusätzliche Locking-Logik | 2026-07-25 |
| Aktivitätenprotokoll-Eintrag bei Status-Wechsel auf „geprüft" | Erste konkrete Nutzung der `activity_log`-Tabelle aus PROJ-1 (Basis-Protokoll it PROJ-12 wird das später erweitern) | 2026-07-25 |
| Neue RLS-Policies `personnel_requests_update_own_when_created`/`_delete_own_when_created` ergänzt (in `20260725120000_init_schema.sql` und als inkrementeller Patch `20260725140000_municipality_request_policies.sql`) | PROJ-1 hatte UPDATE/DELETE auf `personnel_requests` ausschliesslich internen Rollen erlaubt; ohne diese Ergänzung hätte die Gemeinde ihre eigene Anfrage serverseitig gar nicht bearbeiten/zurückziehen können (RLS hätte es still, ohne Fehlermeldung, blockiert) | 2026-07-25 |
| `createPersonnelRequest` setzt `created_by_id`/`created_by` explizit | Diese Standardfelder haben keinen DB-Default; ohne explizites Setzen wüsste `markRequestReviewed` nicht, wen es bei Status „geprüft" benachrichtigen soll | 2026-07-25 |
| Server Actions prüfen nach jedem Update/Delete explizit die Anzahl betroffener Zeilen (`.select().length`), statt nur auf `error` zu prüfen | Von RLS blockierte Schreibvorgänge liefern keinen Fehler, sondern betreffen still null Zeilen — ein reiner `error`-Check hätte das als Erfolg missgedeutet | 2026-07-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/municipality/requests/                   — Liste eigener Anfragen (Server Component)
  ├── PersonnelRequestFormDialog             "Neue Anfrage" / "Bearbeiten" (nur Status "erstellt")
  └── PersonnelRequestsTable (Gemeinde-Sicht) Titel, Zeitraum, Status-Badge, Bearbeiten/Zurückziehen
/internal/requests/                       — Liste aller Anfragen (Server Component)
  └── PersonnelRequestsTable (interne Sicht) + Gemeinde-Spalte, "Als geprüft markieren"
/internal/requests/[id]/ und /municipality/requests/[id]/ — Detailansicht je Rolle
```
Nav-Ergänzungen: „Anfragen" in `/municipality/layout.tsx` (einziger Punkt neben Dashboard) und in `/internal/layout.tsx` (zwischen Kandidaten und Freischaltungen).

### Data Model
Keine neuen Tabellen. Nutzt `personnel_requests` (Kern), `municipalities` (Anzeige Gemeindename in der internen Liste), `notifications` und `activity_log` (Statuswechsel-Ereignis).

### Tech Decisions (Begründung)
- **`municipality_id` niemals aus Client-Input** — direkte Anwendung der PROJ-1-Lehre auf einen neuen Kontext; verhindert, dass eine Gemeinde eine Anfrage für eine andere Gemeinde erstellen könnte.
- **Idempotentes „geprüft"-Markieren** — einfacher als Optimistic-Locking, ausreichend für den dokumentierten Edge Case.
- **Server Actions statt eigener API-Routen**, gleiches Muster wie PROJ-2/3/4.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten und Zod.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- Neue Migration `supabase/migrations/20260725140000_municipality_request_policies.sql` (+ gleiche Policies bereits in `20260725120000_init_schema.sql` für Neuinstallationen ergänzt): erlaubt der eigenen Gemeinde UPDATE/DELETE auf `personnel_requests`, aber nur solange `status = 'created'` — siehe Technical Decisions
- `/municipality/requests`: Liste eigener Anfragen, „Neue Anfrage"-Dialog, Bearbeiten/Zurückziehen (deaktiviert sobald Status „geprüft")
- `/municipality/requests/[id]`: Detailansicht mit Bearbeiten-Button (deaktiviert bei „geprüft")
- `/internal/requests`: Liste aller Anfragen mit Gemeindename, „Als geprüft markieren"
- `/internal/requests/[id]`: Detailansicht mit derselben Aktion
- Server Actions: `municipality/requests/actions.ts` (`createPersonnelRequest`, `updatePersonnelRequest`, `withdrawPersonnelRequest` — `municipality_id` immer aus dem eigenen Profil, nie aus Client-Input; prüfen nach jedem Schreibvorgang explizit die Anzahl betroffener Zeilen statt nur auf `error`), `internal/requests/actions.ts` (`markRequestReviewed`, idempotent, inkl. `activity_log`-Eintrag und In-App-Benachrichtigung an `created_by_id`)
- Nav-Einträge „Anfragen" in beiden Portalen ergänzt
- Vitest-Tests für beide Action-Dateien (9 neue Tests): Berechtigung, `municipality_id`-Herkunft, Datums-Validierung, Bearbeitungssperre nach „geprüft", RLS-Blockade-Erkennung (0 betroffene Zeilen ≠ Erfolg), Idempotenz von „geprüft"-Markierung
- `npm test` (25/25), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: alle vier neuen geschützten Routen → 307-Redirect ohne Login

**Während der Umsetzung gefundene und behobene Architektur-Lücke (vor Auslieferung korrigiert, kein QA-Fund):**
- Die ursprüngliche PROJ-1-Migration erlaubte UPDATE/DELETE auf `personnel_requests` ausschliesslich internen Rollen. Ohne Korrektur hätten Gemeinde-Server-Actions RLS-seitig **still** null Zeilen verändert (kein Fehler, einfach kein Effekt) — genau der Grund, warum jetzt zusätzlich explizit die Anzahl betroffener Zeilen geprüft wird, statt nur auf `error`.

## QA Test Results

**Tested:** 2026-07-25
**App URL:** http://localhost:3000 (laufender Dev-Server, echtes Supabase-Projekt)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 25/25 grün (9 neue Tests für die Anfrage-Server-Actions)
- `npm run build`: erfolgreich
- E2E (`tests/PROJ-5-personalanfrage-workflow.spec.ts`): 4/4 grün (nicht authentifizierter Zugriff auf beide Listen und beide Detailseiten → Redirect zu `/login`)

### Coverage-Lücke (dokumentiert, kein Bug)
Eingeloggte Flows (Anfrage erstellen/bearbeiten/zurückziehen als Gemeinde, als geprüft markieren als intern) konnten mangels aktivem `municipality`- bzw. `dafinex_admin`-Testkonto nicht per E2E gegen die echte Anwendung getestet werden (gleiche Einschränkung wie PROJ-2/3/4). Abgedeckt durch Vitest (gemockter Supabase-Client) + Code-Review.

### Acceptance Criteria Status
- [x] Serverseitiger Rollen-Guard bestätigt (E2E, alle vier Routen)
- [x] `municipality_id` stammt beim Erstellen nachweislich aus dem eigenen Profil, nicht aus Client-Input (Vitest)
- [x] Enddatum-vor-Startdatum-Validierung bestätigt (Vitest)
- [x] Bearbeitungs-/Zurückzieh-Sperre nach „geprüft" bestätigt (Vitest: Server Action lehnt ab; Code-Review: Buttons zusätzlich clientseitig deaktiviert mit Tooltip-Erklärung — während dieses QA-Durchgangs ergänzt, siehe Bugs)
- [x] RLS-Blockade wird korrekt als Fehler erkannt, nicht als stiller Erfolg (Vitest: 0 betroffene Zeilen → `success: false`)
- [x] Idempotenz von „als geprüft markieren" bestätigt (Vitest: kein doppelter Aktivitäts-/Benachrichtigungs-Eintrag)

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff → Redirect, keine Daten sichtbar
- [x] `municipality_id` kann nicht per direktem API-Aufruf auf eine fremde Gemeinde gesetzt werden — sowohl Server-Action-Logik als auch RLS-`WITH CHECK` auf `personnel_requests_update_own_when_created` geprüft (verhindert das Umgehen der Server Action)
- [x] Neue RLS-Policies (Gemeinde-Update/-Delete) korrekt auf `status = 'created'` beschränkt — geprüfte Anfragen sind für die Gemeinde unveränderlich, auch bei direktem API-Zugriff unter Umgehung der UI
- [x] `markRequestReviewed`/Aktivitätenprotokoll/Benachrichtigung nur für interne Rollen möglich (RLS + Action-Check)
- [ ] BUG-1 (Low): Tabellen-Ansicht der Gemeinde erklärte deaktivierte Buttons nicht (nur die Detailseite tat das) — noch während dieses QA-Durchgangs behoben

### Bugs Found

#### BUG-1: Fehlender Hinweis bei deaktivierten Buttons in der Anfragen-Tabelle — ✅ FIXED (2026-07-25, während QA gefunden und sofort behoben)
- **Severity:** Low
- **Steps to Reproduce:**
  1. Gemeinde-Nutzer öffnet `/municipality/requests`, eine Anfrage hat Status „Geprüft"
  2. „Bearbeiten"/„Zurückziehen"-Buttons sind korrekt deaktiviert
  3. Erwartet laut AC: „...und ein Hinweis erklärt warum"
  4. Tatsächlich (vor Fix): Kein Hinweis in der Tabelle, nur auf der separaten Detailseite
- **Fix:** `title`-Attribut mit Erklärungstext auf beiden deaktivierten Buttons ergänzt (native Tooltip)
- **Priority:** Fixed

### Summary
- **Acceptance Criteria:** Serverseitige/Validierungs-/Sicherheits-Kriterien vollständig bestätigt; reine Klick-UI-Kriterien nur per Code-Review (Coverage-Lücke dokumentiert)
- **Bugs Found:** 1 total (1 Low, vor Abschluss behoben — 0 offen)
- **Security:** Keine Autorisierungslücke gefunden; die in dieser Spec neu eingeführten RLS-Policies wurden gezielt auf Umgehungsversuche geprüft (Client kann `municipality_id`/Status nicht über die Server Action hinaus manipulieren)
- **Production Ready:** **YES** — keine offenen Critical/High/Medium-Bugs
- **Empfehlung:** Sobald Test-Accounts für `municipality` und `dafinex_admin` verfügbar sind, den vollständigen Anfrage-Lebenszyklus (erstellen → bearbeiten → geprüft → gesperrt) einmal end-to-end manuell verifizieren

## Deployment
_To be added by /deploy_
