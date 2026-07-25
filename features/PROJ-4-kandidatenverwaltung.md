# PROJ-4: Kandidatenverwaltung

## Status: Approved
**Created:** 2026-07-25
**Last Updated:** 2026-07-25 (QA: 1 Low gefunden, kein Sicherheitsrisiko — production-ready)

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — `candidates`-Tabelle, RLS, Storage
- Requires: PROJ-2 (Rollenbasierte Auth & Portal-Grundgerüst) — internes Portal-Grundgerüst, Nav; Kandidaten-Selbstregistrierung legt bereits Datensätze in `candidates` an

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich alle erfassten Kandidaten sehen (egal ob selbst registriert oder intern erfasst), damit ich einen vollständigen Überblick über den Talent-Pool habe.
- Als `dafinex_admin`/`internal_coordinator` möchte ich einen Kandidaten direkt erfassen können (ohne dass er sich selbst registrieren muss), damit auch telefonisch/persönlich gemeldete Kandidaten im System erscheinen.
- Als `dafinex_admin`/`internal_coordinator` möchte ich die Angaben eines Kandidaten (Fähigkeiten, Region, Verfügbarkeit) bearbeiten können, damit die Daten aktuell bleiben.
- Als `dafinex_admin`/`internal_coordinator` möchte ich nach Kandidaten anhand von Name, Fähigkeiten oder Region filtern können, damit ich schnell passende Kandidaten finde.
- Als `dafinex_admin`/`internal_coordinator` möchte ich das hochgeladene CV/Zertifikat eines Kandidaten einsehen bzw. selbst eines nachtragen können, damit alle relevanten Unterlagen an einem Ort sind.
- Als `dafinex_admin`/`internal_coordinator` möchte ich einen Kandidaten nicht versehentlich löschen können, wenn er noch in aktiven Vorschlägen/Einsätzen referenziert wird, damit keine Dateninkonsistenzen entstehen.

## Out of Scope
- Volles Matching/Scoring nach Fähigkeiten (→ PROJ-6 einfaches Matching, PROJ-14 volle Formel Phase 2)
- Kandidat bearbeitet eigenes Profil selbst nach der Registrierung (aktuell nur bei Registrierung möglich, siehe PROJ-2) — Selbstbearbeitung im Kandidatenportal ist nicht Teil dieser Spec, kann per `/refine` ergänzt werden
- Partnerfirmen-Kandidaten (`source_type: partner`) — Phase 2, PROJ-13
- Mehrere Dokumente pro Kandidat (Versionierung) — Phase 2, PROJ-16; hier nur ein CV-Slot wie in PROJ-1/2 angelegt
- Bewertungen/Historie zu vergangenen Einsätzen (setzt PROJ-9 voraus, existiert noch nicht)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` ist eingeloggt, wenn er die Kandidatenliste öffnet, dann sieht er alle Kandidaten (selbst registrierte und intern erfasste) mit Name, Region, Fähigkeiten (Kurzform) und Verfügbarkeit
- [ ] Angenommen die Kandidatenliste ist leer, wenn sie geöffnet wird, dann wird ein Hinweistext statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` gibt einen Suchbegriff ein, wenn dieser einem Namen, einer Region oder einer Fähigkeit entspricht, dann wird die Liste entsprechend gefiltert
- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` öffnet „Neuer Kandidat", wenn er Pflichtfelder (Vor-/Nachname) ausfüllt und speichert, dann wird ein Kandidat mit `source_type: dafinex` ohne verknüpftes Login-Konto angelegt
- [ ] Angenommen die Pflichtfelder sind leer, wenn das Formular abgeschickt wird, dann erscheint eine Validierungsfehlermeldung und nichts wird gespeichert
- [ ] Angenommen ein Kandidat existiert, wenn ein `dafinex_admin`/`internal_coordinator` ihn bearbeitet und speichert, dann werden die Änderungen übernommen
- [ ] Angenommen ein Kandidat existiert, wenn die Detailansicht geöffnet wird, dann werden alle Stammdaten, das hochgeladene Dokument (falls vorhanden, mit Download-Link) sowie Herkunft (selbst registriert vs. intern erfasst) angezeigt
- [ ] Angenommen ein Kandidat hat noch kein Dokument, wenn ein `dafinex_admin`/`internal_coordinator` eines in der Detailansicht hochlädt, dann wird es gespeichert und ist danach abrufbar
- [ ] Angenommen ein Kandidat ist mit keinen weiteren Datensätzen verknüpft, wenn er gelöscht wird (nach Bestätigung), dann wird er entfernt
- [ ] Angenommen ein Kandidat ist noch in Vorschlägen/Einsätzen referenziert (sobald PROJ-7/9 existieren), wenn ein Löschversuch unternommen wird, dann erscheint eine verständliche Fehlermeldung statt eines technischen Datenbankfehlers
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht die Kandidatenverwaltungs-Seiten direkt aufzurufen, dann wird er serverseitig auf sein eigenes Portal zurückgeleitet

## Edge Cases
- Kandidat lädt bei der Selbstregistrierung (PROJ-2) bereits ein CV hoch, internes Personal lädt später ein weiteres hoch → überschreibt das vorherige (kein Versionsverlauf in Phase 1, siehe Out of Scope)
- Suchbegriff ergibt keine Treffer → Hinweistext „Keine Kandidaten gefunden" statt leerer Tabelle ohne Erklärung
- Löschversuch eines Kandidaten, der noch über `profiles.candidate_id` mit einem aktiven Login-Konto verknüpft ist → muss verhindert bzw. verständlich kommuniziert werden (analog zur PROJ-3-Erkenntnis: `profiles.candidate_id` ist `on delete set null`, kein automatischer DB-Fehler garantiert)
- Sehr lange Fähigkeitenlisten → Kurzform in der Tabelle (z.B. erste 3 + „+N weitere"), volle Liste in der Detailansicht
- Gleichzeitiges Bearbeiten desselben Kandidaten durch zwei interne Nutzer → letzter Schreibvorgang gewinnt (bewusste Vereinfachung, wie in PROJ-3)

## Technical Requirements (optional)
- Security: Schreiboperationen serverseitig per Zod validiert, RLS aus PROJ-1 als zweite Verteidigungslinie
- Zugriff ausschliesslich über `/internal/*`-Portal

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll es eine harte Obergrenze für die CV-Dateigrösse serverseitig (Storage-Bucket-Konfiguration) geben, nicht nur clientseitig wie in PROJ-2 umgesetzt?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für PROJ-2–PROJ-5) | Wie bei PROJ-2/3 vereinbart | 2026-07-25 |
| Intern erfasste Kandidaten erhalten kein Login-Konto (`profile_id` bleibt NULL) | Entspricht der PRD-Vorgabe "source_type: dafinex" für rein intern verwaltete Kandidaten; ein Login ist nur für Selbstregistrierung (PROJ-2) vorgesehen | 2026-07-25 |
| Nur ein CV-Slot pro Kandidat (Überschreiben statt Versionierung) | Volles Dokumentenmanagement ist Phase 2 (PROJ-16); reicht für den Pilot | 2026-07-25 |
| Löschen von Kandidaten mit verknüpftem Login-Konto (`profiles.candidate_id`) wird verhindert | Analog zur PROJ-3-Erkenntnis würde sonst das Konto stillschweigend verwaisen (`profiles.candidate_id` ist `on delete set null`) | 2026-07-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Tabelle — `candidates` existiert bereits aus PROJ-1 | Schema deckt alle benötigten Felder bereits ab | 2026-07-25 |
| Suche/Filter läuft clientseitig über die vollständig geladene Kandidatenliste, nicht als Server-Suche mit eigenen Query-Parametern | Für den Pilot (eine Gemeinde, überschaubare Kandidatenzahl) ausreichend performant und deutlich einfacher als eine fuzzy Server-Suche über Name/Region/Array-Fähigkeiten; kann bei wachsendem Datenvolumen später durch echte Server-Suche ersetzt werden | 2026-07-25 |
| Löschen prüft explizit per Zählabfrage, ob `profiles.candidate_id` auf den Kandidaten verweist, bevor gelöscht wird | Gleiche Falle wie in PROJ-3: `profiles.candidate_id` ist `on delete set null`, kein automatischer DB-Fehler | 2026-07-25 |
| Dokument-Upload/-Ersetzen nutzt denselben `candidate-documents`-Bucket und dieselbe Pfad-Konvention (`<candidate_id>/...`) wie die Selbstregistrierung aus PROJ-2 | Konsistenz, RLS-Policies aus PROJ-1 gelten unverändert (`is_internal_role()` erlaubt internen Rollen Zugriff auf jeden Kandidaten-Ordner) | 2026-07-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/internal/candidates/                     — Liste (Server Component)
  ├── CandidateSearchInput (Client)         Debounced Client-Filter über Name/Region/Fähigkeiten
  ├── CandidatesTable                       Name, Region, Fähigkeiten (Kurzform), Verfügbarkeit, Herkunft-Badge
  └── CandidateFormDialog                   wiederverwendet für "Neu" und "Bearbeiten"
/internal/candidates/[id]/                — Detailansicht (Server Component)
  ├── Stammdaten-Card (+ "Bearbeiten" → CandidateFormDialog)
  ├── Dokument-Card (Download-Link falls vorhanden, Upload/Ersetzen-Button)
  └── "Löschen"-Button (AlertDialog-Bestätigung, gleiche Muster wie PROJ-3)
```
Nav-Ergänzung in `/internal/layout.tsx`: neuer Punkt „Kandidaten" nach „Gemeinden".

### Data Model
Keine neuen Tabellen. Nutzt ausschliesslich `candidates` (Stammdaten, `cv_document_path`) und `profiles` (Prüfung auf verknüpftes Login-Konto vor dem Löschen).

### Tech Decisions (Begründung)
- **Clientseitige Suche statt Server-Suche** — bei der erwarteten Datenmenge im Pilot (eine Gemeinde) reicht ein einfacher Client-Filter; vermeidet vorzeitige Komplexität (kein Fuzzy-Match/GIN-Index auf `skills` nötig).
- **Explizite Lösch-Prüfung auf `profiles.candidate_id`** — identisches Muster wie PROJ-3, aus derselben, dort bereits entdeckten `ON DELETE SET NULL`-Falle.
- **Wiederverwendung von Bucket/Pfad-Konvention aus PROJ-2** — keine neue Storage-Policy nötig, internes Personal kann dank `is_internal_role()`-Policy jeden Kandidaten-Ordner beschreiben.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Table, Dialog, AlertDialog, Form, Badge, Input) und Zod.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- `/internal/candidates`: Liste (Server Component) mit clientseitigem Such-/Filterfeld (Name, Region, Fähigkeiten), Herkunft-Badge (Selbst registriert vs. Intern erfasst), „Neuer Kandidat"-Button
- `/internal/candidates/[id]`: Detailansicht mit Stammdaten, Fähigkeiten-Badges, Dokument-Card (Download via zeitlich begrenzter Signed URL, Upload/Ersetzen), Bearbeiten/Löschen
- `CandidateFormDialog`, `CandidatesTable` (inkl. Lösch-Bestätigung nach dem PROJ-3-Muster mit plain `Button` statt `AlertDialogAction`), `CandidateDetailActions`, `CandidateDocumentCard`
- Server Actions in `actions.ts`: `createCandidate`, `updateCandidate`, `deleteCandidate` (prüft explizit auf verknüpftes `profiles.candidate_id` vor dem Löschen, gleiche Lehre wie PROJ-3), `setCandidateDocumentPath`
- „Neuer Kandidat"-Dialog setzt nach erfolgreichem Anlegen bewusst auf leere Werte zurück statt auf die übermittelten (PROJ-3-Lehre direkt vorausschauend angewendet, nicht erst als QA-Fund)
- Nav-Eintrag „Kandidaten" ergänzt
- Vitest-Tests für die Server Actions (`actions.test.ts`): Berechtigung, Validierung, Happy Path (inkl. Prüfung auf `source_type: 'dafinex'`), Lösch-Schutz bei verknüpftem Login-Konto, Lösch-Happy-Path
- `npm test` (16/16), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: geschützte Routen ohne Login → 307-Redirect

**Bekannte kleine Einschränkung (dokumentiert, nicht behoben):**
- Wird ein Dokument mit einem ANDEREN Dateinamen als das vorherige hochgeladen, bleibt die alte Datei im Storage-Bucket liegen (nur `cv_document_path` wird umgestellt, die alte Datei wird nicht gelöscht) — kein Sicherheitsproblem, nur Storage-Hygiene. Analog zu BUG-4 aus PROJ-2 als Low-Priority-Punkt für einen späteren Aufräum-Pass vorgesehen.

## QA Test Results

**Tested:** 2026-07-25
**App URL:** http://localhost:3000 (laufender Dev-Server, echtes Supabase-Projekt)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 16/16 grün (inkl. 5 neuer Tests für die Kandidaten-Server-Actions)
- `npm run build`: erfolgreich
- E2E (`tests/PROJ-4-kandidatenverwaltung.spec.ts`): 2/2 grün (nicht authentifizierter Zugriff auf Liste/Detailseite → Redirect zu `/login`)

### Coverage-Lücke (dokumentiert, kein Bug)
Eingeloggte CRUD-/Such-/Upload-Flows konnten mangels aktivem `dafinex_admin`-Testkonto nicht per E2E gegen die echte Anwendung getestet werden (gleiche Einschränkung wie PROJ-2/PROJ-3). Abgedeckt durch Vitest (gemockter Supabase-Client) + Code-Review.

### Acceptance Criteria Status
- [x] Serverseitiger Rollen-Guard bestätigt (E2E)
- [x] Zod-Validierung serverseitig bestätigt (Vitest: fehlender Nachname wird abgelehnt)
- [x] `source_type: 'dafinex'` bei intern erfassten Kandidaten bestätigt (Vitest)
- [x] Lösch-Schutz bei verknüpftem Login-Konto bestätigt (Vitest, gleiche `ON DELETE SET NULL`-Prüfung wie PROJ-3)
- [ ] Restliche UI-Kriterien (Tabelle, Suche/Filter, leerer Zustand, Dokument-Upload/-Download) nur per Code-Review geprüft — siehe Coverage-Lücke

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff → Redirect, keine Daten sichtbar
- [x] Server Actions prüfen Rolle+Status serverseitig, UUID-Validierung auf allen IDs
- [x] Signed-URL-Download geprüft: `createSignedUrl` respektiert die Storage-RLS aus PROJ-1 (`is_internal_role()` erlaubt Zugriff auf jeden Kandidaten-Ordner) — kein direkter Bucket-Zugriff ohne Berechtigung möglich
- [x] Lösch-Logik erneut gegen die tatsächliche FK-Konfiguration geprüft (nicht nur angenommen) — `profiles.candidate_id` ist ebenfalls `ON DELETE SET NULL`, explizite Prüfung vor dem Fix bereits proaktiv eingebaut (nicht erst als Fund)
- [ ] BUG-1 (Low): Beim Ersetzen eines Dokuments mit anderem Dateinamen bleibt die alte Datei im Storage-Bucket liegen (Speicher-Hygiene, kein Sicherheitsrisiko)

### Bugs Found

#### BUG-1: Alte Dokument-Datei bleibt bei Namensänderung im Storage liegen
- **Severity:** Low
- **Steps to Reproduce:**
  1. Kandidat X hat Dokument `cv_alt.pdf` hochgeladen (`cv_document_path = X/cv_alt.pdf`)
  2. Internes Personal lädt `zeugnis_neu.pdf` für denselben Kandidaten hoch
  3. Erwartet: Nur noch ein aktuelles Dokument pro Kandidat im Storage
  4. Tatsächlich: `cv_document_path` zeigt korrekt auf die neue Datei, aber `X/cv_alt.pdf` bleibt ungenutzt im Bucket liegen
- **Priority:** Nice to have (analog zu BUG-4 aus PROJ-2)

### Summary
- **Acceptance Criteria:** Serverseitige/Validierungs-Kriterien bestätigt; reine Klick-UI-Kriterien nur per Code-Review (Coverage-Lücke dokumentiert, wie bei PROJ-2/3)
- **Bugs Found:** 1 total (1 Low, kein Sicherheitsrisiko)
- **Security:** Keine Autorisierungslücke gefunden; Lösch-Falle aus PROJ-3 wurde diesmal bereits beim Bauen berücksichtigt statt erst in QA gefunden
- **Production Ready:** **YES** — keine offenen Critical/High/Medium-Bugs
- **Empfehlung:** BUG-1 (Storage-Aufräumen) kann gesammelt mit BUG-4 aus PROJ-2 in einem späteren Aufräum-Pass behoben werden; sobald ein Testkonto verfügbar ist, UI-Flows einmal manuell verifizieren

## Deployment
_To be added by /deploy_
