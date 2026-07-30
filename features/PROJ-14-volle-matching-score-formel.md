# PROJ-14: Volle Matching-Score-Formel mit einstellbaren Gewichtungen

## Status: Approved
**Created:** 2026-07-30
**Last Updated:** 2026-07-30 (QA bestanden, 2 Low-Bugs notiert, keine Critical/High — siehe "QA Test Results")

## Dependencies
- Requires: PROJ-6 (Kandidatensuche mit Matching-Filter) — diese Spec entwickelt die bestehende Seite `/internal/requests/[id]/candidates` weiter, statt einen neuen Screen zu bauen
- Requires: PROJ-4 (Kandidatenverwaltung) — Kandidaten-Datenmodell
- Requires: PROJ-5 (Personalanfrage-Workflow) — Anfrage liefert die Soll-Kriterien
- Requires: PROJ-20 (Kandidatenportal-Selbstverwaltung) — strukturierte Felder `availability_start`/`availability_end`/`max_workload_percent`, von Kandidaten selbst gepflegt

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich alle grundsätzlich infrage kommenden Kandidaten für eine Anfrage sehen, sortiert nach Passgenauigkeit, damit ich auch "fast passende" Kandidaten nicht übersehe, die bei einem harten Filter komplett unsichtbar wären.
- Als `dafinex_admin`/`internal_coordinator` möchte ich nachvollziehen können, warum ein Kandidat einen bestimmten Score hat, damit ich der Bewertung vertrauen und sie gegenüber der Gemeinde begründen kann.
- Als `dafinex_admin`/`internal_coordinator` möchte ich die Gewichtung der einzelnen Kriterien für die aktuelle Suche anpassen können, damit ich z.B. bei einer besonders zeitkritischen Anfrage die Verfügbarkeit stärker gewichten kann als sonst.
- Als `dafinex_admin`/`internal_coordinator` möchte ich weiterhin die Skills/Region einer Anfrage anpassen können (wie in PROJ-6), damit ich die Suche bei Bedarf erweitern oder eingrenzen kann — jetzt wirkt sich das auf den Score statt auf einen harten Ausschluss aus.

## Out of Scope
- **Zertifikate, Sprachen, Berufserfahrung, bevorzugte Regionen in der Score-Formel** — es gibt aktuell keinen vergleichbaren Soll-Wert auf der Personalanfrage; würde PROJ-5 um entsprechende Felder erweitern müssen (grösserer Scope, bewusst zurückgestellt)
- **Globale/persistierte Gewichtungs-Einstellungen** — Gewichte werden pro Suche angepasst (UI-State), nicht in der Datenbank gespeichert oder global von einem Admin vorkonfiguriert
- **Automatische Kandidatenvorschläge basierend auf Score** (z.B. "Top 3 automatisch vorschlagen") — der Score ist eine Sortier-/Entscheidungshilfe, der Vorschlag selbst bleibt eine manuelle Aktion (PROJ-7, unverändert)
- **Machine-Learning-basiertes Scoring / Lernen aus vergangenen erfolgreichen Vermittlungen** — reine, transparente, nachvollziehbare Formel, kein Black-Box-Modell
- **Partnerfirmen-Kandidaten** (`source_type: partner`) — Phase 2, PROJ-13, wie bereits in PROJ-6 festgelegt
- **Anzeige ausstehender (nicht freigeschalteter) Konten** — bleiben ausgeblendet, wie in PROJ-6 etabliert

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Score-Berechnung & Sortierung
- [ ] Angenommen ein `dafinex_admin`/`internal_coordinator` öffnet die Kandidatensuche zu einer Anfrage, wenn die Trefferliste lädt, dann werden alle Kandidaten mit aktivem oder keinem Login-Konto angezeigt (kein harter Ausschluss mehr), sortiert absteigend nach Score
- [ ] Angenommen ein Kandidat erfüllt keines der vier Kriterien, dann erscheint er trotzdem in der Liste, mit einem Score nahe 0%, nicht ausgeblendet
- [ ] Angenommen ein Kandidat hat keinen gesetzten Verfügbarkeitszeitraum oder kein Pensum hinterlegt, dann erhält er für den jeweils fehlenden Faktor die volle Punktzahl (neutral gewertet, nicht bestraft)
- [ ] Angenommen zwei Kandidaten haben denselben Score, dann ist die Sekundärsortierung nach Name (alphabetisch) stabil und nachvollziehbar

### Gewichtung anpassen
- [ ] Angenommen die Trefferliste ist sichtbar, wenn der Nutzer die Gewichtungs-Regler für Skills/Region/Verfügbarkeit/Pensum verändert, dann wird die Trefferliste ohne Seitenneuladen neu sortiert
- [ ] Angenommen die Gewichte werden verändert, dann summieren sie sich weiterhin auf 100% (z.B. automatische Normalisierung oder Validierung)
- [ ] Angenommen der Nutzer verlässt die Seite und kommt zurück, dann sind die Gewichte wieder auf dem Standardwert (keine Persistierung, siehe Out of Scope)

### Faktor-Aufschlüsselung
- [ ] Angenommen die Trefferliste wird angezeigt, dann ist pro Kandidat ein Gesamt-Score als Prozent-Badge sichtbar
- [ ] Angenommen der Nutzer klickt/hovert auf den Score-Badge, dann sieht er die Aufschlüsselung nach den vier Faktoren mit jeweiligem Teilscore

### Skills/Region weiterhin anpassbar
- [ ] Angenommen der Nutzer ändert die vorausgefüllten Skills oder die Region (wie in PROJ-6), dann fliessen die geänderten Werte in die Score-Berechnung ein, statt Kandidaten auszuschliessen

### Zugriffsschutz
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht, die Kandidatensuche direkt aufzurufen, dann wird er serverseitig auf sein eigenes Portal zurückgeleitet (unverändert aus PROJ-6)

## Edge Cases
- Anfrage ohne `required_skills`/`region`/`start_date`/`end_date`/`required_workload_percent` → die jeweils betroffenen Faktoren werden neutral (volle Punktzahl für alle Kandidaten) gewertet, kein Fehler
- Kandidat mit leerer Skills-Liste → 0% im Skills-Faktor, nicht 0% Gesamt-Score (die anderen drei Faktoren zählen weiterhin)
- Alle Gewichte auf 0 gesetzt → Score ist für alle Kandidaten 0%, Liste bleibt nutzbar (keine Division durch 0), Sekundärsortierung nach Name greift
- Anfrage-ID in der URL existiert nicht → verständliche Fehlermeldung statt Absturz (wie in PROJ-6)
- Sehr grosse Kandidatenliste → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bereits in PROJ-6/PROJ-4 entschieden)

## Technical Requirements (optional)
- Security: Zugriff ausschliesslich über `/internal/*`-Portal, serverseitige Rollen-/Status-Prüfung (unverändert aus PROJ-6)
- Wiederverwendung der bestehenden Kandidaten-/Anfrage-Datenstruktur; ein neues optionales Feld auf `personnel_requests` (siehe Decision Log)

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Score ersetzt den harten Ausschluss-Filter aus PROJ-6 vollständig | Verhindert, dass "fast passende" Kandidaten komplett unsichtbar bleiben; entspricht dem PRD-Auftrag einer "vollen" Matching-Formel statt einfacher Filter | 2026-07-30 |
| Vier Score-Faktoren: Skills, Region, Verfügbarkeitszeitraum, Pensum | Objektiv gegen eine Anfrage prüfbare Kriterien; Zertifikate/Sprachen/Berufserfahrung/bevorzugte Regionen haben (noch) keinen vergleichbaren Soll-Wert auf der Anfrage | 2026-07-30 |
| Neues optionales Feld `personnel_requests.required_workload_percent` | Ohne Soll-Pensum auf der Anfrage kein Vergleichswert für den Pensum-Faktor möglich; kleine additive Erweiterung analog zu PROJ-20 | 2026-07-30 |
| Gewichte werden pro Suche in der UI angepasst, nicht global/persistiert | Deutlich kleinerer Scope als eine Einstellungsseite; reicht für den Pilot, jede Suche startet mit sinnvollen Standardwerten | 2026-07-30 |
| Standard-Gewichtung: Skills 40% / Region 25% / Verfügbarkeit 25% / Pensum 10% | Skills als wichtigstes Kriterium für die Vermittlung; Pensum am wenigsten oft entscheidend | 2026-07-30 |
| Fehlende Kandidatendaten (Verfügbarkeitszeitraum, Pensum) werden neutral (volle Punktzahl) gewertet | Verhindert systematische Benachteiligung von Kandidaten, die die neuen PROJ-20-Selbstpflege-Felder noch nicht ausgefüllt haben | 2026-07-30 |
| Score + Aufschlüsselung als Prozent-Badge mit aufklappbarer Detailansicht | Volle Nachvollziehbarkeit der Bewertung ohne die Tabelle zu überladen | 2026-07-30 |
| PROJ-14 entwickelt die bestehende PROJ-6-Seite (`/internal/requests/[id]/candidates`) weiter, kein neuer Screen | Gleicher Zweck (Kandidat für eine Anfrage finden), keine Duplikation; PROJ-6 gilt danach als durch PROJ-14 abgelöst | 2026-07-30 |
| Skills-/Region-Eingabefelder aus PROJ-6 bleiben erhalten, wirken aber jetzt auf den Score statt auf einen harten Ausschluss | Konsistente, vertraute UI; kleinstmögliche Änderung an einer bereits bewährten Oberfläche | 2026-07-30 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Score-Berechnung läuft vollständig im Browser (Client), nicht als Server-Roundtrip pro Änderung | Die Seite lädt alle relevanten Kandidaten- und Anfrage-Daten einmalig; jede Änderung an Gewichten, Skills oder Region berechnet den Score sofort neu und sortiert die Liste um — ohne Seitenneuladen, wie in der Spec gefordert | 2026-07-30 |
| Löst das PROJ-6-Muster ab, Filter als URL-Suchparameter mit Server-Refetch abzubilden | War für einen harten Ausschluss-Filter sinnvoll (verlinkbar, keine doppelte Logik); für sofortiges Neu-Scoren bei jedem Regler-Tick wäre ein Server-Roundtrip pro Änderung spürbar langsamer und unnötig, da bereits alle Daten geladen sind | 2026-07-30 |
| Gewichte werden bei Eingabe automatisch proportional auf 100% normalisiert, statt eine Validierungsfehlermeldung zu zeigen | Einfachere, reibungslosere Bedienung als ein "Summe muss 100% ergeben"-Fehlerzustand | 2026-07-30 |
| Neues Feld `personnel_requests.required_workload_percent` (optional, additiv) statt Erweiterung um eine neue Tabelle | Kein Eingriff in bestehendes Schema/RLS von PROJ-5, gleiches additive Muster wie bereits in PROJ-20 etabliert | 2026-07-30 |
| Neue shadcn-Komponente `Slider` installieren | Für die vier Gewichtungs-Regler gibt es noch keine passende Komponente im Projekt; kein Custom-Build nötig, shadcn deckt das ab | 2026-07-30 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
/internal/requests/[id]/candidates/  (bestehende PROJ-6-Route, weiterentwickelt)
  Server Component: lädt einmalig alle Kandidaten (aktives/kein Konto) + Anfrage-Daten
  │
  └── CandidateMatchingPanel (Client, neu — hält den gemeinsamen Zustand)
        ├── GewichtungsRegler                 4 Slider (Skills/Region/Verfügbarkeit/Pensum),
        │                                      Summe wird automatisch auf 100% normalisiert
        ├── MatchFiltersBar (bestehend,        Skills-/Region-Eingabe, wirkt jetzt sofort auf
        │    angepasst)                        den Score statt einen Seiten-Reload auszulösen
        └── MatchingCandidatesTable            + neue Score-Spalte: Prozent-Badge, absteigend
             (bestehend, erweitert)              sortiert, aufklappbare Faktor-Aufschlüsselung
                                                  je Kandidat (Skills/Region/Verfügbarkeit/Pensum)

Ergänzung auf dem Anfrage-Formular (PROJ-5): neues optionales Feld "Benötigtes Pensum (%)"
```

### B) Data Model (plain language)

Keine neue Tabelle. Eine zusätzliche, optionale Spalte auf der bestehenden Anfrage:
- Benötigtes Pensum in Prozent (leer = keine Anforderung)

Alles andere nutzt bereits vorhandene Felder:
- Von der Anfrage: geforderte Fähigkeiten, Region, Start-/Enddatum, benötigtes Pensum (neu)
- Vom Kandidaten: Fähigkeiten, Region, Verfügbarkeitszeitraum, Pensum (alle aus PROJ-4/PROJ-6/PROJ-20)

Gespeichert in: bestehende Supabase-Datenbank. Die eigentliche Score-Berechnung selbst wird nirgends gespeichert — sie entsteht bei jedem Seitenaufruf/jeder Reglerbewegung neu im Browser.

### C) Tech Decisions (justified for PM)

1. **Score-Berechnung im Browser statt auf dem Server.** Damit sich die Trefferliste beim Verschieben eines Reglers sofort neu sortiert (keine Wartezeit, kein Seiten-Neuladen), werden alle nötigen Daten einmalig geladen und die Punkteberechnung läuft direkt im Browser. Das ist möglich, weil Personalanfragen und Kandidatenlisten im Pilot-Massstab überschaubar bleiben (wie bereits in PROJ-6 festgelegt).
2. **Automatische Normalisierung der Gewichte statt Fehlermeldung.** Verschiebt der Nutzer einen Regler, werden die anderen automatisch proportional angepasst, sodass die Summe immer 100% ergibt — kein zusätzlicher Bedienschritt, keine Fehlerzustände.
3. **Ein neues, optionales Anfrage-Feld für das benötigte Pensum.** Kleinstmögliche Erweiterung, um den Pensum-Faktor überhaupt vergleichbar zu machen — betrifft nur PROJ-5s Formular um ein zusätzliches, nicht verpflichtendes Feld.
4. **Wiederverwendung der bestehenden PROJ-6-Bausteine.** Die Skills-/Region-Eingabe und die Trefferliste werden nicht neu gebaut, sondern erweitert — spart Aufwand und erhält das vertraute Erscheinungsbild.

### D) Dependencies (packages to install)
- Neue shadcn-Komponente: `Slider` (`npx shadcn@latest add slider --yes`) — für die vier Gewichtungs-Regler
- Keine neuen npm-Pakete darüber hinaus

## Implementation Notes

Vollständig implementiert (Datenbank, Frontend, Scoring-Logik) in einem Durchgang, konsistent mit dem etablierten Vorgehen in diesem Projekt.

**Datenbank (`supabase/migrations/20260730090000_personnel_requests_required_workload.sql`):**
- Neue optionale Spalte `personnel_requests.required_workload_percent` (0–100, additiv) + Check-Constraint

**Scoring-Logik (`src/lib/matching/score.ts`, neu):**
- Reine, gut testbare Funktion `computeMatchScore()` + `normalizeWeights()` — läuft vollständig im Browser
- Vier Faktoren: Skills (% der geforderten Skills vorhanden, case-insensitiv), Region (case-insensitiver Teilstring-Vergleich, identisch zur bisherigen PROJ-6-Logik), Verfügbarkeitszeitraum (Datums-Überlappung Kandidat ↔ Anfrage), Pensum (erfüllt/anteilig, gedeckelt bei 100%)
- Fehlende Kandidatendaten (kein Verfügbarkeitszeitraum, kein Pensum) und fehlende Anfrage-Sollwerte werden jeweils neutral (100%) gewertet, wie in der Spec festgelegt
- 16 neue Vitest-Tests, decken Normalfall, fehlende Daten, Gewichte-Summe-0 und Normalisierung ab

**UI:**
- `/internal/requests/[id]/candidates` (bestehende PROJ-6-Route) umgebaut: Server Component lädt jetzt **alle** Kandidaten mit aktivem/keinem Konto (kein harter Ausschluss mehr) inkl. der PROJ-20-Felder (Verfügbarkeitszeitraum, Pensum)
- Neue `CandidateMatchingPanel` (Client) hält Skills/Region/Gewichte als State, berechnet und sortiert die Trefferliste bei jeder Änderung neu — kein Server-Roundtrip, kein Seiten-Reload
- Neue `MatchWeightsSliders`: vier Slider (neue shadcn-Komponente), automatische Normalisierung auf 100% in der Anzeige
- `MatchFiltersBar` von URL-Parameter-Navigation auf kontrollierten State umgebaut (kein `router.push` mehr)
- `MatchingCandidatesTable` erweitert: Score-Badge (farbcodiert nach Höhe) + Popover mit Faktor-Aufschlüsselung; Leer-Zustand-Text angepasst ("Noch keine Kandidaten vorhanden", da nicht mehr filterbedingt leer)
- Anfrage-Formular (PROJ-5) um optionales Feld "Benötigtes Pensum in %" ergänzt; Anzeige auf beiden Anfrage-Detailseiten (Gemeinde + intern) ergänzt

**Nebenbei behoben (gleiche Dateien ohnehin bearbeitet):** fehlende `error`-Prüfung auf beiden Anfrage-Detailseiten (`/municipality/requests/[id]`, `/internal/requests/[id]`) und der Kandidaten-Matching-Seite selbst — gleiches Muster wie in PROJ-20 BUG-1/6/11 dokumentiert.

**Verifikation:** `npm run build` grün, `npm run lint` ohne neue Fehler, volle Vitest-Suite 108/108 grün (19 davon neu — 16 für die Scoring-Logik, 3 für die neue Pensum-Validierung in den Anfrage-Actions). Kein neuer E2E-Test nötig — die bestehende `tests/PROJ-6-kandidatensuche-matching-filter.spec.ts` deckt den unauthentifizierten Redirect für dieselbe Route bereits ab; die authentifizierte Score-/Sortier-Logik ist mangels Testkonto mit echten Anfrage-/Kandidatendaten nicht per E2E testbar (gleiche, bereits dokumentierte Einschränkung wie PROJ-2/3/4/5/6/9/20) und wird durch die neue Vitest-Suite + Code-Review abgedeckt.

**Nicht durchgeführt (kein Browser-Tool verfügbar):** manuelles Durchklicken der neuen Regler/Score-Anzeige in einer echten Browser-Session.

## QA Test Results

**Tested:** 2026-07-30
**App URL:** Kein Browser-Tool/keine funktionierenden Supabase-Zugangsdaten in dieser Umgebung — siehe Testmethode
**Tester:** QA Engineer (AI)

### Testmethode
Wie bereits bei PROJ-20 etabliert: kein Browser-Tool und keine `.env.local` in dieser Umgebung (Playwright-Webserver-Start würde ohnehin an fehlenden Supabase-Credentials scheitern). Abdeckung dieses Durchgangs:
1. Vollständige Vitest-Suite (108/108, 19 neu) — insbesondere die Scoring-Logik (16 Tests, deckt jede Formel-Verzweigung inkl. Edge Cases ab) und die neue Pensum-Validierung (3 Tests, gezielt gegen dieselbe "Leerstring wird zu 0 statt null"-Bug-Klasse getestet, die in PROJ-20 einmal real auftrat — hier bestanden)
2. Gezielter Code-Audit aller neuen/geänderten Dateien, mit Fokus auf dieselben Bug-Muster, die in PROJ-20 mehrfach real auftraten (ungeprüfte `error`-Werte, RLS-Spaltenrestriktionen, Typ-Mismatches zwischen Formular und Server Action)
3. Bestehender PROJ-6-E2E-Test (unauthentifizierter Redirect) bleibt für dieselbe Route gültig

### Acceptance Criteria Status
- [x] Alle Kandidaten (aktiv/kein Konto) werden gezeigt, sortiert nach Score — Code-Review: harter Ausschluss entfernt, `MatchingCandidatesTable` erhält bereits sortierte Rows
- [x] Kandidat mit 0 Übereinstimmungen bleibt sichtbar mit niedrigem Score — Vitest bestätigt (`score.test.ts`)
- [x] Fehlende Kandidatendaten (Verfügbarkeit/Pensum) werden neutral (100%) gewertet — Vitest bestätigt
- [x] Stabile Sekundärsortierung nach Name bei Score-Gleichstand — Code-Review (`localeCompare` auf `lastName firstName`)
- [x] Gewichtungs-Regler sortieren die Liste ohne Seitenneuladen neu — Code-Review (`useMemo` in `CandidateMatchingPanel`, kein Server-Roundtrip)
- [x] Gewichte summieren sich auf 100% (automatische Normalisierung) — Vitest bestätigt (`normalizeWeights`), UI zeigt normalisierten Wert
- [x] Keine Persistierung der Gewichte zwischen Seitenaufrufen — Code-Review (reiner `useState`, kein Speichern)
- [x] Score-Badge pro Kandidat sichtbar — Code-Review
- [x] Aufklappbare Faktor-Aufschlüsselung — Code-Review (Popover mit allen vier Teilscores)
- [x] Skills/Region weiterhin anpassbar, wirken jetzt auf den Score — Code-Review + Vitest (Score reagiert auf geänderte `requiredSkills`/`region`)
- [x] Zugriffsschutz für municipality/candidate — unverändert aus PROJ-6, weiterhin per bestehendem E2E-Test abgedeckt

### Edge Cases Status
- [x] Anfrage ohne Skills/Region/Daten/Pensum → betroffene Faktoren neutral — Vitest bestätigt
- [x] Kandidat mit leerer Skills-Liste → 0% nur im Skills-Faktor, nicht Gesamt-Score — Vitest bestätigt
- [x] Alle Gewichte auf 0 → Score 0% für alle, keine Division durch 0 — Vitest bestätigt (`overall: 0`, kein Fehler)
- [x] Ungültige Anfrage-ID → `notFound()` statt Absturz — Code-Review (unverändert aus PROJ-6, jetzt zusätzlich mit explizitem `PGRST116`-Check)

### Security Audit Results
- [x] Authentication/Authorization: unverändert aus PROJ-6, Zugriff weiterhin ausschliesslich `/internal/*` mit Rollenprüfung im Layout
- [x] RLS-Update-Policies für `personnel_requests` sind zeilen-, nicht spaltenbasiert — das neue Feld `required_workload_percent` unterliegt keiner zusätzlichen Einschränkung, kein neues Risiko
- [x] Input-Validierung: Zod client- und serverseitig für das neue Pensum-Feld + DB-Check-Constraint als dritte Schicht
- [x] XSS/SQL-Injection: keine neuen Angriffsflächen, Score ist rein berechnet aus bereits zugänglichen Daten, keine neuen Eingabefelder mit Freitext-Rendering ohne React-Escaping
- [x] Keine neue Datenexposition: Score nutzt ausschliesslich Felder, die internes Personal bereits sehen durfte

### Bugs Found

#### BUG-1: Fehlende `.limit()` auf der Kandidaten-Query
- **Severity:** Low
- **Steps to Reproduce:** `/internal/requests/[id]/candidates/page.tsx` lädt alle Kandidaten ohne `.limit()`, entgegen der Projekt-Regel "Use `.limit()` on all list queries" (`backend.md`)
- **Kontext:** Vorbestehend seit PROJ-6 (dort ebenfalls kein Limit), von dieser Spec übernommen statt neu eingeführt; im Pilot-Massstab (wenige Kandidaten) ohne praktische Auswirkung, PROJ-6s eigene Spec hat Performance explizit als out of scope deklariert
- **Priority:** Nice to have

#### BUG-2: Slider-Position entspricht nicht immer der angezeigten Prozentzahl
- **Severity:** Low
- **Steps to Reproduce:**
  1. Alle vier Gewichtungs-Regler auf 100 stellen
  2. Erwartet: angezeigte Prozentzahl entspricht intuitiv der Reglerposition
  3. Tatsächlich: Regler stehen alle ganz rechts (100), aber die angezeigte normalisierte Prozentzahl zeigt jeweils 25% (da alle vier gleich gewichtet, normalisiert auf Summe 100) — kann kurzzeitig verwirren, obwohl der berechnete Score korrekt ist
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 11/11 bestanden (Code-Review + Vitest, siehe Testmethode für Einschränkungen)
- **Bugs Found:** 2 total (0 Critical, 0 High, 0 Medium, 2 Low)
- **Security:** Pass — keine Authorization-/Injection-Lücken, keine neue Datenexposition
- **Production Ready:** **YES** — keine Critical/High-Bugs
- **Empfehlung:** Beide Low-Findings können gesammelt in einem späteren Aufräum-Pass behoben werden. Vor dem nächsten echten Pilot-Einsatz der Matching-Seite empfiehlt sich einmal ein manueller Klick-Test mit echten Anfrage-/Kandidatendaten (gleiche Empfehlung wie bei PROJ-6 selbst nie nachgeholt).

## Deployment
_To be added by /deploy_
