# PROJ-10: Einfache Vertragsgenerierung

## Status: Deployed
**Created:** 2026-07-26
**Last Updated:** 2026-07-28 (Deployed: siehe Abschnitt "Deployment" unten)

## Dependencies
- Requires: PROJ-9 (Einsatzverwaltung mit Statusverlauf) — ein Vertrag gehört zu einem Einsatz, der mindestens „akzeptiert" sein muss

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich für einen akzeptierten Einsatz ein vorbereitetes Vertragsdokument hochladen, damit der Vertrag für die Unterschrift bereitsteht.
- Als `dafinex_admin`/`internal_coordinator` möchte ich die von den Parteien unterschriebene Version nachträglich hochladen, damit der Vertragsabschluss dokumentiert ist.
- Als `municipality`-Nutzer möchte ich das Vertragsdokument meines Einsatzes herunterladen können, damit ich es unterschreiben/weiterleiten kann.
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, sobald ein Vertrag bereitsteht, damit ich nicht manuell nachfragen muss.

## Out of Scope
- Automatisierte PDF-Generierung aus Vorlage/Daten — „generiert" bedeutet hier: intern bereitet den Vertrag ausserhalb der Plattform vor und lädt ihn hoch (siehe Decision Log); kein PDF-Templating-Paket wird eingeführt
- Digitale Multi-Party-Signaturen — explizites PRD-Non-Goal für Phase 1; Unterschrift erfolgt offline, das Ergebnis wird als Datei hochgeladen
- Upload durch Gemeinde/Kandidat selbst — beide Uploads (generiert und unterschrieben) erfolgen ausschliesslich intern; Gemeinde/Kandidat können nur herunterladen (siehe Decision Log)
- Eigene Vertragsübersichtsliste — ein Vertrag gehört 1:1 zu einem Einsatz und wird auf der bestehenden Einsatz-Detailseite verwaltet
- Benachrichtigung bei „unterschrieben" — nur die im PRD explizit genannte „Vertrag bereit"-Benachrichtigung ist Teil dieser Spec; das volle Trigger-System ist PROJ-11
- Versionierung/Ablauf/Archivierung von Dokumenten (→ PROJ-16, Phase 2)
- Kandidaten-seitige Ansicht des eigenen Vertrags — konsistent mit dem in PROJ-9 etablierten, schrittweisen Ausbau des Kandidatenportals

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Einsatz hat Status „akzeptiert", „aktiv" oder „abgeschlossen" und noch keinen Vertrag, wenn ein interner Nutzer ein Dokument hochlädt, dann wird ein Vertrag mit Status „generiert" angelegt, ein Aktivitätseintrag erstellt und die Gemeinde (Ersteller der ursprünglichen Anfrage) benachrichtigt
- [ ] Angenommen ein Einsatz hat Status „vorgeschlagen", dann ist der Upload eines Vertragsdokuments nicht verfügbar (mit erklärendem Hinweis)
- [ ] Angenommen ein Einsatz hat bereits einen Vertrag, dann wird kein zweiter Vertrag für denselben Einsatz angeboten
- [ ] Angenommen ein Vertrag hat Status „generiert", wenn ein interner Nutzer die unterschriebene Version hochlädt, dann wechselt der Status zu „unterschrieben" und ein Aktivitätseintrag wird erstellt
- [ ] Angenommen ein Vertrag hat Status „unterschrieben", dann ist kein weiterer Upload der unterschriebenen Version mehr möglich
- [ ] Angenommen ein interner Nutzer öffnet die Einsatz-Detailseite, dann sieht er den Vertragsstatus und kann beide Dokumente (sofern vorhanden) herunterladen
- [ ] Angenommen ein `municipality`-Nutzer öffnet die Detailseite eines eigenen Einsatzes, dann sieht er den Vertragsstatus und kann beide Dokumente (sofern vorhanden) herunterladen, jedoch nicht hochladen
- [ ] Angenommen ein `municipality`- oder `candidate`-Nutzer versucht per direktem Aufruf, ein Vertragsdokument hochzuladen oder den Vertragsstatus zu ändern, dann wird dies durch RLS und serverseitige Prüfung verhindert
- [ ] Angenommen ein `municipality`-Nutzer versucht, den Vertrag eines fremden Einsatzes einzusehen, dann wird dies durch RLS verhindert

## Edge Cases
- Falscher Dateityp/zu grosse Datei beim Upload → Validierungsfehler, nichts wird gespeichert (gleiche Grenzen wie PROJ-4: PDF/JPG/PNG, max. 10 MB)
- Zwei interne Nutzer laden gleichzeitig ein generiertes Dokument für denselben Einsatz hoch → zweiter Versuch scheitert an der Duplikatsprüfung (gleiche, bereits in PROJ-7/9 akzeptierte Absicherung auf Anwendungsebene statt DB-Ebene)
- Einsatz wird nach Vertragserstellung auf „abgeschlossen" gesetzt → Vertrag bleibt unverändert einsehbar, keine Wechselwirkung mit dem Einsatzstatus
- Sehr viele Verträge → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bei PROJ-4/6/7/8/9)

## Technical Requirements (optional)
- Security: RLS-Härtung erforderlich — die bestehenden PROJ-1-Policies `contracts_update` und `contracts_documents_insert` erlauben Gemeinde/Kandidat aktuell Schreibzugriff (kein `with check` bei `contracts_update`); werden durch rein interne Policies ersetzt (siehe Decision Log — direkte Anwendung der bei PROJ-8/9 gemachten Erfahrung, diesmal proaktiv statt erst in der QA gefunden)
- Wiederverwendung des bestehenden `contracts`-Storage-Buckets aus PROJ-1 (`<assignment_id>/...`)
- Zugriff: interne Aktionen über `/internal/*`, Lesezugriff der Gemeinde über `/municipality/*`

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Sollen Gemeinde/Kandidat künftig selbst die unterschriebene Version hochladen können, statt sie intern einzureichen? Aktuell bewusst nicht (siehe Decision Log); die dafür nötige RLS-Grundlage existierte bereits aus PROJ-1, wird hier aber durch eine rein interne Policy ersetzt

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–9 vereinbart | 2026-07-26 |
| „Generierung" bedeutet manueller Upload eines extern vorbereiteten Dokuments durch intern, kein automatisiertes PDF-Templating | Kein PDF-Generierungs-Paket im Tech-Stack; „Einfache Vertragsgenerierung" laut PRD-Bezeichnung, echtes Templating wäre über den MVP-Scope hinaus | 2026-07-26 |
| Sowohl das generierte als auch das unterschriebene Dokument werden ausschliesslich von intern hochgeladen; Gemeinde/Kandidat können nur herunterladen | Vermeidet die RLS-Komplexität eines partei-beschränkten Teil-Updates (gleiche Fehlerklasse wie PROJ-8 BUG-1/BUG-2); Dafinex koordiniert den Unterschriftsprozess ohnehin offline und lädt das Endergebnis hoch | 2026-07-26 |
| Vertrag kann erst ab Einsatzstatus „akzeptiert" angelegt werden, nicht bei „vorgeschlagen" | Ein Vertrag ergibt erst Sinn, sobald der Einsatz intern bestätigt ist | 2026-07-26 |
| Nur die „Vertrag bereit"-Benachrichtigung an die Gemeinde ist Teil dieser Spec | Explizit im PRD als Kern-Benachrichtigung genannt; alle weiteren Trigger (inkl. „unterschrieben") sind PROJ-11 | 2026-07-26 |
| Kein separates Vertragslisten-Screen | Verträge sind 1:1 an Einsätze gebunden; die bestehende Einsatz-Detailseite (PROJ-9) ist der richtige Ort, keine zusätzliche Liste nötig im Pilot-Massstab | 2026-07-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Tabelle — `contracts` existiert bereits aus PROJ-1 mit passendem `contract_status`-Enum (`generated`/`signed`) und Storage-Bucket `contracts` | Schema deckt bereits alles Nötige ab | 2026-07-26 |
| `contracts_update` (PROJ-1, kein `with check`, liess Gemeinde/Kandidat bislang beliebig schreiben) wird durch `contracts_update_internal` ersetzt (nur `is_internal_role()`) | Schliesst dieselbe Lücken-Klasse wie PROJ-9s `assignments_update`-Fix, hier proaktiv statt erst in der QA gefunden | 2026-07-26 |
| `contracts_documents_insert` (Storage) wird auf `is_internal_role()` beschränkt, die Gemeinde-/Kandidat-Zweige entfallen; `contracts_documents_select` bleibt unverändert (Lesezugriff weiterhin für Gemeinde/Kandidat) | Konsistent mit der Product Decision „nur intern lädt hoch" | 2026-07-26 |
| Datei-Uploads direkt vom Client zum Storage-Bucket (wie PROJ-4s `CandidateDocumentCard`), danach Server Action zum Persistieren des Pfads in `contracts` | Etabliertes, bereits bewährtes Muster im Projekt, keine neue Technik nötig | 2026-07-26 |
| Vertragsverwaltung wird direkt in die bestehende Einsatz-Detailseite (PROJ-9) integriert (`ContractCard`), keine eigene Route | Konsistent mit der Product Decision „kein eigenes Vertragslisten-Screen" | 2026-07-26 |
| Neue Route `/municipality/assignments/[id]` (bisher nur Liste in PROJ-9) für die lesende Gemeinde-Sicht inkl. Vertrags-Downloads | Gemeinde braucht einen Ort, um den Vertrag tatsächlich herunterzuladen — die reine Liste aus PROJ-9 reichte dafür nicht aus | 2026-07-26 |
| Duplikatsprüfung für `createContract` (kein zweiter Vertrag pro Einsatz) auf Anwendungsebene (SELECT vor INSERT), keine DB-Unique-Constraint | Gleiches, bereits akzeptiertes Muster wie PROJ-7 (Vorschläge)/PROJ-9 (Einsätze) | 2026-07-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/internal/assignments/[id]/ (PROJ-9, erweitert): + ContractCard
  ContractCard (Client)
    - kein Vertrag, Einsatz noch "vorgeschlagen"   → Hinweistext, kein Upload
    - kein Vertrag, Einsatz "akzeptiert"+           → Upload "Generiertes Dokument"
    - Vertrag Status "generiert"                    → Download generiert + Upload "Unterschriebene Version"
    - Vertrag Status "unterschrieben"                → beide Downloads, keine weiteren Aktionen

/municipality/assignments/[id]/    — neue Detailseite (Server Component, rein lesend)
  zeigt Einsatzdaten + Vertragsstatus + Downloads (sofern vorhanden)
/municipality/assignments/          — Tabellenzeilen verlinken neu auf die Detailseite
```

### Data Model
Keine neue Tabelle. Nutzt `contracts` (Kern: `assignment_id`, `generated_document_path`, `signed_document_path`, `status`), `assignments` (Statusprüfung „akzeptiert"+), `personnel_requests` (für die „Vertrag bereit"-Benachrichtigung an `created_by_id`), `notifications`, `activity_log`.

### Tech Decisions (Begründung)
- **Rein interne Schreibrechte statt partei-beschränkter Teil-Updates** — vermeidet bewusst die Komplexität (Column-Lock-Trigger, scoped RLS-Policies), die bei PROJ-8 erst nachträglich als Bugfix nötig wurde; hier von Anfang an einfacher gelöst.
- **Direkter Client-Upload zum Storage-Bucket** — etabliertes Muster (PROJ-4), keine neue Server-seitige Datei-Handling-Logik nötig.
- **Integration in bestehende Einsatz-Detailseite statt eigener Vertragsbereich** — ein Vertrag hat ausserhalb seines Einsatzes keinen eigenen Kontext, der eine separate Seite rechtfertigen würde.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Card, Input, Button, Alert) aus PROJ-4/9 und den bereits konfigurierten Supabase-Storage-Client.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- Neue Migration `supabase/migrations/20260726120000_contracts_internal_only.sql` (+ gleiche Änderungen bereits in `20260725120000_init_schema.sql` für Neuinstallationen): `contracts_update` (bisher ohne `with check`) ersetzt durch `contracts_update_internal`; `contracts_documents_insert` (Storage) auf `is_internal_role()` beschränkt, Gemeinde-/Kandidat-Zweige entfernt
- `src/app/internal/contracts/actions.ts`: `createContract` (nur ab Einsatzstatus „akzeptiert"+, Duplikatsprüfung, `activity_log`-Eintrag, „Vertrag bereit"-Benachrichtigung an `personnel_requests.created_by_id`), `setSignedDocument` (nur bei Status „generiert", `activity_log`-Eintrag); beide prüfen betroffene Zeilenanzahl statt nur `error`
- `src/components/portal/contract-card.tsx`: Upload-UI für intern (Datei direkt zum `contracts`-Storage-Bucket, danach Server Action zum Persistieren des Pfads — gleiches Muster wie PROJ-4s `CandidateDocumentCard`), zustandsabhängig (kein Vertrag/Einsatz zu früh, kein Vertrag, generiert, unterschrieben)
- `src/components/portal/municipality-contract-card.tsx`: rein lesende Variante (keine Upload-Inputs, auch nicht UI-seitig, zusätzlich zur RLS-Sperre)
- `/internal/assignments/[id]/page.tsx` um `ContractCard` erweitert (Signed-URL-Erzeugung für beide Dokumente)
- Neue Route `/municipality/assignments/[id]/page.tsx` (bisher gab es in PROJ-9 nur die Liste) inkl. `MunicipalityContractCard`; `MunicipalityAssignmentsTable`-Zeilen verlinken jetzt dorthin
- 7 neue Vitest-Tests für `internal/contracts/actions.ts` (Berechtigung ×2, Einsatzstatus zu früh, Duplikat, erfolgreiche Erstellung inkl. Aktivitätseintrag + Benachrichtigung, erfolgreiches Setzen der unterschriebenen Version, Ablehnung bei bereits unterschrieben)
- `npm test` (55/55), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: neue geschützte Route `/municipality/assignments/[id]` → 307-Redirect ohne Login

## QA Test Results

**Tested:** 2026-07-26
**App URL:** http://localhost:3000 (laufender Dev-Server, echtes Supabase-Projekt)
**Migrationsstatus:** `20260726120000` erfolgreich gegen das echte Supabase-Projekt ausgeführt (2026-07-26, bestätigt durch Nutzer)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 55/55 grün (7 neue Tests für `internal/contracts/actions.ts`)
- `npm run build`: erfolgreich
- E2E (`tests/PROJ-10-einfache-vertragsgenerierung.spec.ts`): 2/2 grün (Chromium + Mobile Safari, nicht authentifizierter Zugriff → Redirect zu `/login`)

### Coverage-Lücke (dokumentiert, kein Bug)
Der eigentliche Upload-/Signatur-Workflow im Browser konnte mangels aktivem `dafinex_admin`-Testkonto und echter Einsatzdaten nicht per E2E gegen die echte Anwendung getestet werden (gleiche Einschränkung wie PROJ-2–9). Nach der PROJ-8-Erfahrung wurde diese QA erneut mit besonderem Fokus auf jeden neuen/berührten Schreibpfad durchgeführt.

### Acceptance Criteria Status
- [x] Vertragserstellung nur ab Einsatzstatus „akzeptiert"+, inkl. Aktivitätseintrag und „Vertrag bereit"-Benachrichtigung (Vitest)
- [x] Upload bei Status „vorgeschlagen" nicht verfügbar, mit Hinweistext (Code-Review: `ContractCard`)
- [x] Kein zweiter Vertrag pro Einsatz (Vitest: Duplikatsprüfung)
- [x] Upload der unterschriebenen Version wechselt Status zu „unterschrieben" inkl. Aktivitätseintrag (Vitest)
- [x] Kein weiterer Upload der unterschriebenen Version nach „unterschrieben" (Vitest + Code-Review: Upload-Input nur bei Status „generiert" gerendert)
- [x] Interne Detailseite zeigt Vertragsstatus + beide Downloads (Code-Review: `ContractCard`, Signed URLs serverseitig erzeugt)
- [x] Gemeinde-Detailseite zeigt Vertragsstatus + Downloads, keine Upload-Möglichkeit (Code-Review: `MunicipalityContractCard` enthält keinerlei Upload-UI, unabhängig von der RLS-Sperre)
- [x] `municipality`/`candidate` können nicht hochladen/Status ändern — weder Tabellen- (`contracts_update_internal`) noch Storage-Ebene (`contracts_documents_insert` jetzt `is_internal_role()`-only) (Vitest + Code-Review der Migration)
- [x] Fremder Einsatz für Gemeinde nicht einsehbar (Code-Review: `assignments_select`/`contracts_select`-RLS unverändert, bereits in PROJ-9 geprüft)

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff → Redirect (E2E bestätigt)
- [x] Alle Schreibpfade dieser Feature (`contracts` insert/update, `contracts`-Storage-Bucket insert, `activity_log`/`notifications` insert) laufen ausschliesslich über bereits bestehende `_internal`-Policies — kein neuer municipality-/candidate-seitiger Schreibpfad wurde eingeführt, anders als bei PROJ-8 gibt es daher keine Möglichkeit für eine analoge RLS-Insert-Lücke
- [x] `contracts_update`/`contracts_documents_insert` aus PROJ-1 (beide ohne wirksame Einschränkung für Gemeinde/Kandidat) wurden durch rein interne Policies ersetzt — verifiziert per Lesen der Migration, dass keine Gemeinde-/Kandidat-Zweige mehr vorhanden sind
- [x] `MunicipalityContractCard` enthält keine Upload-Komponenten — selbst falls RLS versehentlich zu offen wäre, gäbe es keinen UI-Pfad, der einen Schreibversuch auslöst
- [ ] BUG-1 (Low): `createContract`s Duplikatsprüfung ist ein SELECT-vor-INSERT auf Anwendungsebene, keine DB-Unique-Constraint auf `contracts.assignment_id` — gleiches, bereits bei PROJ-7/9 akzeptiertes Muster

### Bugs Found

#### BUG-1: Theoretische Race Condition bei gleichzeitiger Vertragserstellung für denselben Einsatz
- **Severity:** Low
- **Steps to Reproduce:** Analog zu PROJ-9 BUG-1 — zwei interne Nutzer laden nahezu gleichzeitig ein generiertes Dokument für denselben Einsatz hoch, beide bestehen die Duplikatsprüfung, zwei Verträge entstehen. Sehr geringe Eintrittswahrscheinlichkeit im 2-3-köpfigen Pilotteam, kein Sicherheitsrisiko.
- **Priority:** Nice to have — könnte mit einer `unique`-Constraint auf `contracts.assignment_id` behoben werden, falls es in der Praxis je auftritt

### Summary
- **Acceptance Criteria:** Alle 9 Kriterien bestätigt
- **Bugs Found:** 1 total (1 Low, theoretische Race Condition, kein Sicherheitsrisiko)
- **Security:** Keine Autorisierungslücke — die proaktive Architektur-Entscheidung (nur intern lädt hoch) hat die bei PROJ-8 gefundene Fehlerklasse von vornherein vermieden, statt sie nachträglich zu reparieren
- **Production Ready:** **YES** — keine offenen Critical/High/Medium-Bugs
- **Empfehlung:** Migration bereits ausgeführt (siehe Migrationsstatus oben). Sobald ein `dafinex_admin`-Testkonto existiert, den vollständigen Vertrags-Lebenszyklus einmal end-to-end manuell verifizieren

## Deployment

Gemeinsam mit allen anderen P0/MVP-Features live deployed auf Vercel. Volle Deployment-Details (Produktions-URL, Env Vars, Post-Deployment-Test, Pre-Deployment-Fixes) siehe [PROJ-1](PROJ-1-supabase-infrastructure-setup.md#deployment).
