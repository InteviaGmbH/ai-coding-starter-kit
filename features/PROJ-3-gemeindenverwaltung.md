# PROJ-3: Gemeindenverwaltung

## Status: Approved
**Created:** 2026-07-25
**Last Updated:** 2026-07-25 (QA: 1 Medium gefunden und vor Auslieferung behoben — production-ready)

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — `municipalities`-Tabelle, RLS
- Requires: PROJ-2 (Rollenbasierte Auth & Portal-Grundgerüst) — internes Portal-Grundgerüst, Nav

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine Liste aller Gemeinden sehen, damit ich einen Überblick über die Kunden der Plattform habe.
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine neue Gemeinde anlegen können, damit ich sie bereits vor der ersten Registrierung eines Ansprechpartners im System erfassen kann.
- Als `dafinex_admin`/`internal_coordinator` möchte ich die Stammdaten einer Gemeinde bearbeiten können, damit Änderungen (z.B. neuer Ansprechpartner, neue Telefonnummer) nachgeführt werden können.
- Als `dafinex_admin`/`internal_coordinator` möchte ich Detailinformationen zu einer Gemeinde einsehen können (inkl. verknüpfter Ansprechpartner-Konten), damit ich den Kontext für Anfragen/Einsätze dieser Gemeinde habe.
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine Gemeinde nicht versehentlich löschen können, wenn sie noch aktive Anfragen/Einsätze hat, damit keine Daten inkonsistent werden.

## Out of Scope
- Selbstverwaltung der eigenen Stammdaten durch die Gemeinde selbst (Rolle `municipality`) — in Phase 1 nur lesend über das eigene Profil, keine eigene Bearbeitung der Gemeinde-Stammdaten (kann bei Bedarf per `/refine` ergänzt werden)
- Verknüpfung mit Personalanfragen/Einsätzen (Anzeige in der Detailansicht) — die zugrunde liegenden Features (PROJ-5, PROJ-9) existieren noch nicht; Detailansicht zeigt vorerst nur Stammdaten + verknüpfte Nutzerkonten
- Mehrere Ansprechpartner-Konten pro Gemeinde verwalten/einladen (dafür existiert bereits die Selbstregistrierung + Freischaltung aus PROJ-2; ein Einladungs-Flow durch `dafinex_admin` ist nicht Teil dieser Spec)
- Löschen einer Gemeinde mit Historie (Soft-Delete/Archivierung) — für den Pilot reicht Hard-Delete mit Schutz durch DB-Constraint

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` ist eingeloggt, wenn er die Gemeindenliste öffnet, dann sieht er alle Gemeinden mit Name, Ort/Adresse und Anzahl verknüpfter aktiver Ansprechpartner-Konten
- [ ] Angenommen die Gemeindenliste ist leer, wenn sie geöffnet wird, dann wird ein Hinweistext statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` öffnet das Formular „Neue Gemeinde", wenn er Name (Pflichtfeld) und optionale Kontaktdaten ausfüllt und speichert, dann wird die Gemeinde angelegt und erscheint in der Liste
- [ ] Angenommen das Namensfeld ist leer, wenn das Formular abgeschickt wird, dann erscheint eine Validierungsfehlermeldung und nichts wird gespeichert
- [ ] Angenommen eine Gemeinde existiert, wenn ein `dafinex_admin`/`internal_coordinator` sie bearbeitet und speichert, dann werden die Änderungen übernommen und in der Liste/Detailansicht sichtbar
- [ ] Angenommen eine Gemeinde existiert, wenn ein `dafinex_admin`/`internal_coordinator` die Detailansicht öffnet, dann sieht er Stammdaten sowie alle verknüpften Ansprechpartner-Konten (Name, E-Mail, Status)
- [ ] Angenommen eine Gemeinde hat keine verknüpften Datensätze, wenn ein `dafinex_admin`/`internal_coordinator` sie löscht, dann wird sie entfernt und verschwindet aus der Liste (nach Bestätigungsdialog)
- [ ] Angenommen eine Gemeinde hat noch verknüpfte Ansprechpartner-Konten, wenn ein Löschversuch unternommen wird, dann wird eine verständliche Fehlermeldung angezeigt statt eines technischen Datenbankfehlers
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht die Gemeindenverwaltungs-Seiten direkt aufzurufen, dann wird er serverseitig auf sein eigenes Portal zurückgeleitet
- [ ] Angenommen die API/Server Actions werden direkt (ohne UI) mit ungültigen Daten aufgerufen, dann validiert Zod serverseitig und lehnt die Anfrage mit einer klaren Fehlermeldung ab

## Edge Cases
- Zwei `dafinex_admin`-Nutzer bearbeiten gleichzeitig dieselbe Gemeinde → letzter Schreibvorgang gewinnt (kein Konflikt-Handling in Phase 1, dokumentiert als bewusste Vereinfachung)
- Löschversuch einer Gemeinde mit aktiven Personalanfragen/Kandidatenvorschlägen/Einsätzen (sobald PROJ-5/7/9 existieren) → durch bestehenden `on delete restrict`-Constraint aus PROJ-1 verhindert, UI zeigt verständliche Meldung statt Rohfehler
- Sehr lange Namen/Adressen → Formular und Tabelle brechen nicht um, Text wird abgeschnitten mit Tooltip
- Gleichzeitiges Anlegen zweier Gemeinden mit identischem Namen → erlaubt (kein Unique-Constraint auf Name, da z.B. gleichnamige Ortsteile denkbar sind), keine Fehlermeldung nötig
- Netzwerkfehler beim Speichern → Formular bleibt mit eingegebenen Werten erhalten, Fehlermeldung wird angezeigt

## Technical Requirements (optional)
- Security: Alle Schreiboperationen serverseitig per Zod validiert, RLS aus PROJ-1 (`municipalities_insert_internal` etc.) als zweite Verteidigungslinie
- Zugriff ausschliesslich über `/internal/*`-Portal (bestehender Rollen-Guard aus PROJ-2)

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll die Rolle `municipality` künftig ihre eigenen Gemeinde-Stammdaten selbst bearbeiten dürfen (aktuell: nein, siehe Out of Scope)?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für PROJ-2–PROJ-5) | Wie bei PROJ-2 vereinbart | 2026-07-25 |
| Gemeinde-Stammdaten werden in Phase 1 ausschliesslich von internen Rollen verwaltet, nicht von der Gemeinde selbst | Reduziert Scope; Gemeinde-Nutzer haben ohnehin keinen expliziten Bedarf dafür laut PRD-Kernprozess | 2026-07-25 |
| Hard-Delete statt Soft-Delete/Archivierung | Für den Pilot mit einer Gemeinde ausreichend; volles Dokumentenmanagement/Archivierung ist ohnehin Phase 2 (PROJ-16) | 2026-07-25 |
| Kein Unique-Constraint auf Gemeindename | Namensgleichheit ist grundsätzlich möglich (z.B. gleichlautende Ortschaften in unterschiedlichen Kantonen), keine Business-Regel dagegen bekannt | 2026-07-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Tabelle — `municipalities` existiert bereits aus PROJ-1 | Schema deckt alle benötigten Felder bereits ab | 2026-07-25 |
| Create/Update/Delete als Next.js Server Actions mit Zod-Validierung, Lesezugriffe als Server Component direkt via Supabase | Konsistent mit dem in PROJ-2 etablierten Muster (`internal/approvals/actions.ts`) | 2026-07-25 |
| Löschen fängt den `on delete restrict`-Fehler (Postgres-Code `23503`) gezielt ab und zeigt eine feste, verständliche Meldung statt der Rohfehlermeldung | Nutzerfreundlichkeit, deckt AC „verständliche Fehlermeldung statt technischem DB-Fehler" | 2026-07-25 |
| Anzahl verknüpfter Ansprechpartner wird pro Gemeinde per separater Zählabfrage (`count`) auf `profiles` ermittelt, nicht per PostgREST-Embed | Vermeidet die in PROJ-1 bereits bekannte FK-Mehrdeutigkeits-Problematik bei verschachtelten Selects zwischen verwandten Tabellen | 2026-07-25 |
| Löschen prüft explizit per Zählabfrage auf verknüpfte `profiles`, bevor gelöscht wird — nicht nur per abgefangenem DB-Fehler | `profiles.municipality_id` ist in PROJ-1 als `on delete set null` definiert (nicht `restrict`); ein reiner DB-Fehler-Fang hätte verknüpfte Ansprechpartner-Konten beim Löschen der Gemeinde stillschweigend verwaist (municipality_id → NULL) statt den Löschvorgang zu verhindern | 2026-07-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/internal/municipalities/                — Liste (Server Component)
  ├── MunicipalitiesTable                 (Name, Ort, Anzahl aktiver Kontakte, Aktionen)
  └── MunicipalityFormDialog              (wiederverwendet für "Neu" und "Bearbeiten")
/internal/municipalities/[id]/            — Detailansicht (Server Component)
  ├── Stammdaten-Card (mit "Bearbeiten"-Button → MunicipalityFormDialog)
  ├── Liste verknüpfter Ansprechpartner-Konten (Name, E-Mail, Status-Badge)
  └── "Löschen"-Button (AlertDialog-Bestätigung)
```
Nav-Ergänzung in `/internal/layout.tsx`: neuer Punkt „Gemeinden" zwischen Dashboard und Freischaltungen.

### Data Model
Keine neuen Tabellen. Nutzt ausschliesslich `municipalities` (Stammdaten) und `profiles` (verknüpfte Ansprechpartner, gezählt/gelistet über `municipality_id`).

### Tech Decisions (Begründung)
- **Server Actions statt eigener API-Routen** — gleiches, bereits etabliertes Muster wie in PROJ-2, kein zusätzlicher Boilerplate.
- **Gezieltes Abfangen des FK-Restrict-Fehlers** — Postgres/Supabase liefert bei `on delete restrict`-Verletzung den Code `23503`; wird geprüft und in eine feste deutsche Fehlermeldung übersetzt.
- **Separate Zählabfrage statt PostgREST-Embed** für die Kontakt-Anzahl — robuster, keine Mehrdeutigkeit bei der FK-Auflösung.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Table, Dialog, AlertDialog, Form, Badge) und Zod.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- `/internal/municipalities`: Liste (Server Component) mit Name, Adresse, Anzahl aktiver Ansprechpartner (separate Zählabfrage pro Gemeinde), „Neue Gemeinde"-Button
- `/internal/municipalities/[id]`: Detailansicht mit Stammdaten-Card, Liste aller verknüpften Ansprechpartner-Konten (alle Status, nicht nur aktiv) mit Status-Badge, Bearbeiten/Löschen
- `MunicipalityFormDialog` (Client, wiederverwendet für Neu/Bearbeiten), `MunicipalitiesTable` inkl. Lösch-Bestätigung (`AlertDialog`), `MunicipalityDetailActions` für die Detailseite
- Server Actions in `actions.ts`: `createMunicipality`, `updateMunicipality`, `deleteMunicipality` — Zod-Validierung, Rollen-/Status-Check, `deleteMunicipality` prüft verknüpfte `profiles` explizit per Zählabfrage vor dem eigentlichen Löschen (siehe Technical Decision oben)
- Nav-Eintrag „Gemeinden" im internen Portal ergänzt
- Vitest-Tests für die Server Actions (`actions.test.ts`): Berechtigung, Validierung, Happy Path Create, Delete-Schutz bei verknüpften Kontakten, Delete Happy Path
- `npm test` (11/11), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: geschützte Routen ohne Login → 307-Redirect

**Während der Implementierung gefundener und behobener Design-Fehler (vor Auslieferung korrigiert, kein QA-Fund):**
- Ursprünglich für Lösch-Bestätigungen `AlertDialogAction` verwendet — Radix schliesst diesen Button-Typ immer sofort beim Klick, unabhängig vom Ergebnis der async-Aktion. Das hätte eine Fehlermeldung (z.B. „Gemeinde kann nicht gelöscht werden") nie sichtbar gemacht, da der Dialog schon geschlossen wäre. Durch einen normalen `Button` mit manueller State-Kontrolle ersetzt (gleiches Muster wie `ApproveRejectDialog` aus PROJ-2).

## QA Test Results

**Tested:** 2026-07-25
**App URL:** http://localhost:3000 (laufender Dev-Server, echtes Supabase-Projekt)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 11/11 grün (inkl. 5 neuer Tests für die Gemeinden-Server-Actions)
- `npm run build`: erfolgreich
- E2E (`tests/PROJ-3-gemeindenverwaltung.spec.ts`): 2/2 grün (nicht authentifizierter Zugriff auf Liste/Detailseite → Redirect zu `/login`)

### Coverage-Lücke (dokumentiert, kein Bug)
Eingeloggte CRUD-Flows (Anlegen/Bearbeiten/Löschen einer Gemeinde, Lösch-Schutz bei verknüpften Kontakten) konnten mangels eines aktiven `dafinex_admin`-Testkontos nicht per E2E gegen die echte Anwendung durchgetestet werden (gleiche Einschränkung wie bei PROJ-2). Stattdessen abgedeckt durch: Vitest-Tests der Server Actions (gemockter Supabase-Client) + manuelle Code-Review.

### Acceptance Criteria Status
- [x] Serverseitiger Rollen-Guard bestätigt (E2E: unauthentifizierter Zugriff → Redirect)
- [x] Zod-Validierung serverseitig bestätigt (Vitest: leerer Name wird abgelehnt)
- [x] Lösch-Schutz bei verknüpften Ansprechpartner-Konten bestätigt (Vitest, Code-Review der `ON DELETE SET NULL`-Falle)
- [ ] Restliche UI-Kriterien (Tabelle, leerer Zustand, Bearbeiten-Dialog, Detailansicht) nur per Code-Review geprüft, nicht per Klick-Test — siehe Coverage-Lücke

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff → Redirect, keine Daten sichtbar
- [x] Server Actions prüfen Rolle+Status serverseitig (nicht nur RLS als einzige Verteidigungslinie)
- [x] UUID-Validierung auf allen IDs vor DB-Zugriff
- [x] Lösch-Logik gegen die tatsächliche FK-Konfiguration aus PROJ-1 geprüft (nicht nur angenommen) — `profiles.municipality_id` ist `ON DELETE SET NULL`, nicht `RESTRICT`; explizite Zählabfrage ergänzt, bevor der ursprüngliche Spec-Entwurf das als reinen DB-Fehler-Fang behandelt hätte

### Bugs Found

#### BUG-1: „Neue Gemeinde"-Dialog zeigt nach der ersten Anlage vorausgefüllte alte Daten — ✅ FIXED (2026-07-25, vor Auslieferung per Code-Review gefunden)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Gemeinde A anlegen (Dialog schliesst, `form.reset(values)` setzt das Formular auf die gerade abgeschickten Werte statt auf leer)
  2. „Neue Gemeinde" erneut öffnen (derselbe Dialog, nur eine Instanz pro Seite, nicht pro Zeile)
  3. Erwartet: Leeres Formular
  4. Tatsächlich (vor Fix): Formular zeigt Name/Adresse/etc. von Gemeinde A vorausgefüllt an
- **Fix:** Im Erfolgsfall wird im „create"-Modus explizit auf leere Werte zurückgesetzt statt auf die übermittelten Werte; „edit"-Modus (eine Dialog-Instanz pro Zeile) bleibt unverändert, da dort keine Verwechslungsgefahr besteht.
- **Priority:** Fixed

### Summary
- **Acceptance Criteria:** Serverseitige/Validierungs-Kriterien bestätigt; reine Klick-UI-Kriterien nur per Code-Review (Coverage-Lücke dokumentiert)
- **Bugs Found:** 1 total (1 Medium, noch vor Auslieferung behoben — 0 offen)
- **Security:** Keine Autorisierungslücke gefunden; ein potenzieller Datenverlust-Fall (stille Verwaisung von Kontakten beim Löschen) wurde bereits während der Implementierung erkannt und durch eine explizite Prüfung verhindert
- **Production Ready:** **YES** — keine offenen Critical/High-Bugs
- **Empfehlung:** Sobald ein `dafinex_admin`-Testkonto verfügbar ist (z.B. nach dem PROJ-1-Bootstrap-Schritt), die UI-Flows einmal manuell/per E2E nachträglich verifizieren

## Deployment
_To be added by /deploy_
