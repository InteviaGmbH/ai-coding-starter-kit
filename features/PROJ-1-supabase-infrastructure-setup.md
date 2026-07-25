# PROJ-1: Supabase Infrastructure Setup

## Status: In Progress
**Created:** 2026-07-25
**Last Updated:** 2026-07-25 (Fix-Runde 1: BUG-1–4 behoben, BUG-5/6 zurückgestellt — erneuter /qa-Durchgang gegen echte DB nötig)

## Dependencies
- None (fundamentales Infrastruktur-Feature, alle weiteren Features bauen darauf auf)

## User Stories
- Als Dafinex-Admin möchte ich, dass sich Gemeinde-Ansprechpartner und Kandidaten selbst registrieren können, damit ich sie nicht manuell anlegen muss.
- Als Dafinex-Admin möchte ich neue Registrierungen prüfen, freischalten oder ablehnen können, damit nur legitime Nutzer Zugriff erhalten.
- Als Kandidat möchte ich mich mit Profil und optionalen Dokumenten (CV, Zertifikate) registrieren können, damit Dafinex meine Eignung beurteilen kann.
- Als Gemeinde-Ansprechpartner möchte ich mich registrieren können, damit ich nach Freischaltung Anfragen erstellen kann.
- Als Nutzer möchte ich, dass meine Daten DSG/nDSG-konform gespeichert werden, damit meine Persönlichkeitsrechte gewahrt bleiben.
- Als Entwicklungsteam möchte ich eine vollständig konfigurierte Supabase-Infrastruktur (Schema, RLS, Storage, Auth), damit PROJ-2 bis PROJ-12 darauf aufbauen können.

## Out of Scope
- Login-Screens, Registrierungsformulare, Freischaltungs-Oberfläche (→ PROJ-2 Rollenbasierte Auth & Portal-Grundgerüst)
- Digitale Multi-Party-Signaturen (→ PROJ-15, Phase 2)
- Volle Matching-Score-Formel (→ PROJ-14, Phase 2)
- Partnerfirmen-Tabellen/Datensätze (→ PROJ-13, Phase 2) — nur Rollen-Enum-Wert vorbereitet
- Dokumentenversionierung, Ablauf, Archivierung (→ PROJ-16, Phase 2)
- Vollständiges Nachrichtensystem (→ PROJ-17, Phase 2)
- Zwei-Faktor-Authentifizierung, erweiterte Passwort-Policies
- Automatisiertes Backup-/Monitoring-Konzept

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Supabase-Projekt ist eingerichtet, wenn die Applikation startet, dann kann sie sich erfolgreich mit der Datenbank verbinden
- [ ] Angenommen eine Person füllt die Registrierung als Gemeinde-Ansprechpartner oder Kandidat aus, wenn sie absendet, dann wird ein Konto mit Status „ausstehend" angelegt, ohne vollen Zugriff
- [ ] Angenommen ein Konto hat den Status „ausstehend", wenn sich der Nutzer einloggt, dann sieht er nur einen Hinweis auf die ausstehende Freischaltung, keine geschützten Inhalte
- [ ] Angenommen ein Konto ist ausstehend, wenn ein `dafinex_admin` es freischaltet, dann wechselt der Status auf „aktiv" und voller rollenbasierter Zugriff wird gewährt
- [ ] Angenommen ein Konto ist ausstehend, wenn ein `dafinex_admin` es ablehnt, dann wechselt der Status auf „abgelehnt" und der Nutzer wird informiert
- [ ] Angenommen ein Nutzer mit Rolle `municipality` ist eingeloggt, wenn er auf Daten zugreift, dann sieht er ausschliesslich Anfragen, Vorschläge und Einsätze seiner eigenen Gemeinde
- [ ] Angenommen ein Nutzer mit Rolle `candidate` ist eingeloggt, wenn er auf Daten zugreift, dann sieht er ausschliesslich sein eigenes Profil und die ihn betreffenden Vorschläge/Einsätze
- [ ] Angenommen ein Nutzer mit Rolle `internal_coordinator` oder `dafinex_admin` ist eingeloggt, wenn er auf Daten zugreift, dann sieht er alle Gemeinden, Kandidaten, Anfragen und Einsätze
- [ ] Angenommen ein Kandidat registriert sich, wenn er ein Dokument (CV/Zertifikat) hochlädt, dann wird es sicher in Supabase Storage abgelegt und ist nur für berechtigte Rollen einsehbar
- [ ] Angenommen ein Vertrag wird generiert, wenn die unterschriebene Version hochgeladen wird, dann wird sie sicher in Supabase Storage abgelegt und ist nur für berechtigte Rollen (Gemeinde, Kandidat, Dafinex) einsehbar
- [ ] Angenommen alle Tabellen sind angelegt, wenn eine RLS-Prüfung durchgeführt wird, dann ist Row Level Security auf jeder Tabelle aktiviert
- [ ] Angenommen personenbezogene Daten werden gespeichert, wenn das Supabase-Projekt konfiguriert wird, dann liegt es in einer EU-Region (DSG/nDSG-konform)

## Edge Cases
- Doppelte Registrierung mit derselben E-Mail (einmal als Gemeinde, einmal als Kandidat) → muss verhindert werden, E-Mail eindeutig pro Konto
- Datei-Upload überschreitet Grössenlimit oder hat nicht unterstütztes Format → Fehlermeldung, Upload wird abgelehnt
- Netzwerkabbruch während Datei-Upload → Upload gilt als fehlgeschlagen, kein Teil-Upload wird gespeichert
- Löschversuch einer Gemeinde/eines Kandidaten, der noch in aktiven Anfragen/Einsätzen referenziert wird → durch Datenbank-Constraints verhindert
- Kein verfügbarer `dafinex_admin` zur Freischaltung → `super_admin` kann als Fallback ebenfalls freischalten (siehe Open Questions)

## Technical Requirements (optional)
- Security: Row Level Security auf allen Tabellen aktiviert, Supabase Auth für Authentifizierung
- Datenstandort: EU-Region (DSG/nDSG-Konformität)
- Alle Zugangsdaten (Supabase URL, Keys) über Umgebungsvariablen, nie hartcodiert

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Darf ein abgelehnter Kandidat/Gemeinde-Kontakt sich erneut registrieren, oder bleibt das Konto dauerhaft gesperrt?
- [ ] Gibt es ein konkretes Dateigrössen-/Formatlimit für Uploads (CV, Verträge)?
- [ ] Soll `super_admin` als Fallback ebenfalls Freischaltungen vornehmen können?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Kandidaten erhalten in Phase 1 einen eigenen Account | Kandidaten sollen langfristig Verfügbarkeit selbst pflegen; Konto wird von Dafinex freigeschaltet | 2026-07-25 |
| Self-Registrierung mit Dafinex-Freischaltung für Gemeinde- und Kandidaten-Accounts | Reduziert manuellen Erfassungsaufwand für Dafinex; Freischaltung bleibt Kontrollpunkt | 2026-07-25 |
| Nur `dafinex_admin` kann Registrierungen freischalten/ablehnen | Klare Verantwortlichkeit für eine administrative Aufgabe | 2026-07-25 |
| `partner_company` bleibt nur Rollen-Enum ohne eigene Tabellen in Phase 1 | Phase-2-Feature gemäss PRD | 2026-07-25 |
| Supabase-Projekt in EU-Region | Schweizer B2B-Produkt mit Personendaten, DSG/nDSG-Anforderung | 2026-07-25 |
| Kandidaten können bei Registrierung Dokumente hochladen | Wird von Gemeinden/internen Koordinatoren zur Beurteilung erwartet | 2026-07-25 |
| Kein eigener Status für Gemeinde-Interview/-Interesse (`municipality_interested`/`municipality_interview`) in Phase 1 — Interview läuft informell ohne Statusabbildung | Reduziert Komplexität für den Pilot mit einer Gemeinde; bei Bedarf in Phase 2 ergänzbar | 2026-07-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Supabase Auth (E-Mail/Passwort) für Login und Selbst-Registrierung | Nutzt fertige, geprüfte Auth-Infrastruktur statt Eigenbau | 2026-07-25 |
| Separates Benutzerprofil zusätzlich zum Supabase-Auth-Konto | Rolle, Konto-Status und Verknüpfung zu Gemeinde/Kandidat sind im Auth-Konto selbst nicht abbildbar | 2026-07-25 |
| Row Level Security (RLS) als zentraler Zugriffsschutz direkt in der Datenbank | Zugriffsregeln greifen unabhängig vom Zugriffsweg — sicherer als reine Prüfung im Frontend | 2026-07-25 |
| EU-Hosting (Frankfurt) statt Standard-US-Region | Einzige praktikable Möglichkeit bei Supabase für DSG/nDSG-konforme Datenhaltung | 2026-07-25 |
| Private Storage-Bereiche mit zeitlich begrenzten Zugriffslinks statt öffentlicher Dateiablage | Verträge und CVs enthalten sensible Personendaten | 2026-07-25 |
| Freischaltung/Ablehnung löst zusätzlich zur In-App-Benachrichtigung eine E-Mail aus (via Resend) | Nutzer merkt sonst evtl. nicht, dass sein Konto freigeschaltet wurde, da er sich ohne Freischaltung nicht sinnvoll einloggen kann | 2026-07-25 |
| Alle Tabellen erhalten einheitliche Standard-Felder: id, created_date, updated_date, created_by_id, created_by, optional is_sample | Konsistente Nachvollziehbarkeit über alle Entitäten hinweg; is_sample erlaubt spätere Kennzeichnung von Demo-/Testdaten getrennt von echten Produktionsdaten | 2026-07-25 |
| Korrektur: `assignment_status` wieder auf `proposed/accepted/active/completed` (kein `declined`); `proposal_status` stattdessen um `municipality_accepted`/`municipality_declined` erweitert | Ein Einsatz wird laut Kernprozess erst nach Gemeinde-Annahme erstellt — eine Ablehnung kann daher nie als Einsatz-Status auftreten, sondern gehört an den Kandidatenvorschlag (im Refine-Gespräch vom Nutzer korrigiert) | 2026-07-25 |
| Tabellen-Definitionen stehen in der Migration vor den `language sql`-Helper-Funktionen | Postgres validiert `language sql`-Funktionsrümpfe gegen den Datenbank-Katalog bereits bei `CREATE FUNCTION`; eine Funktion, die auf `profiles` verweist, kann nicht vor `CREATE TABLE profiles` stehen (führte beim ersten Testlauf im Supabase-Projekt zu einem Fehler) | 2026-07-25 |
| Self-Registrierung akzeptiert im Signup-Trigger nur `municipality`/`candidate`; interne Rollen werden ausschliesslich nachträglich von `dafinex_admin` vergeben | QA-Fund BUG-1: clientseitige Signup-Metadaten dürfen nicht direkt über die Rolle entscheiden (Rollen-Eskalationsrisiko) | 2026-07-25 |
| `profiles.municipality_id`/`candidate_id` sind für den Profil-Eigentümer nicht mehr selbst änderbar, nur für `link_candidate_profile()`/`handle_new_user()` (SECURITY DEFINER) oder `dafinex_admin` | QA-Fund BUG-2: ohne diese Sperre kann sich jeder Nutzer selbst einer beliebigen Gemeinde/einem beliebigen Kandidaten zuordnen | 2026-07-25 |
| `is_active()` als zusätzliche Bedingung in SELECT/UPDATE-Policies für Tabellen, die Daten Dritter exponieren (Anfragen, Vorschläge, Einsätze, Verträge); bewusst nicht bei reinem Selbstzugriff (eigenes Profil, eigene Kandidaten-Zeile, eigene Dokumente) | QA-Fund BUG-3: ausstehende Konten dürfen laut AC keine geschützten Inhalte sehen, konnten dies aber über Zuordnung ohne Freischaltung | 2026-07-25 |
| Kandidaten dürfen per `candidates_insert_self_or_internal` genau eine eigene `candidates`-Zeile anlegen (`profile_id = auth.uid()`, zusätzlich per `unique`-Constraint auf eine Zeile begrenzt); Verknüpfung zum Profil läuft automatisch über den `link_candidate_profile()`-Trigger | QA-Fund BUG-4: `candidates_insert_internal` verhinderte die im Spec vorgesehene Selbstregistrierung von Kandidaten komplett | 2026-07-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
PROJ-1 hat keine eigene Benutzeroberfläche — es ist reine Infrastruktur (Datenbank, Zugriffsregeln, Dateispeicher, Authentifizierung), auf der alle folgenden Features (ab PROJ-2) aufbauen. Es gibt daher keinen UI-Baum für dieses Feature.

### Data Model (in einfachen Worten)

**Standard-Felder (auf jeder Entität):** Jede Tabelle erhält automatisch dieselben Basisfelder — eindeutige ID, Erstellungsdatum, letztes Änderungsdatum, wer den Datensatz erstellt hat (Referenz + Anzeigename), sowie optional eine Markierung „ist Beispieldatensatz" (für Demo-/Testdaten, die sich von echten Produktionsdaten unterscheiden lassen, z.B. für den Pilot-Showcase oder QA). Im Folgenden sind nur die fachlichen Felder je Entität aufgeführt.

**Benutzerprofil** (erweitert den Supabase-Auth-Account)
- Rolle: super_admin, dafinex_admin, internal_coordinator, municipality, candidate, partner_company (Enum, `partner_company` bleibt ungenutzt in Phase 1)
- Konto-Status: ausstehend, aktiv, abgelehnt
- Verknüpfung zu Gemeinde (falls Rolle municipality) oder Kandidat (falls Rolle candidate)

**Gemeinden** — Name, Adresse, Ansprechpartner-Kontaktdaten

**Kandidaten** — Name, Fähigkeiten, Region, Verfügbarkeit, Quelle (dafinex/partner — nur „dafinex" aktiv genutzt), Verweis auf hochgeladene Dokumente

**Personalanfragen** — Gemeinde, gesuchte Qualifikation/Rolle, Region, Zeitraum, Status (erstellt/geprüft), erstellt von

**Kandidatenvorschläge** — Verweis auf Anfrage + Kandidat, vorgeschlagen von, Status: `proposed` (vorgeschlagen) → `approved`/`rejected` (interne Freigabe/Ablehnung durch Dafinex) → bei interner Freigabe zusätzlich `municipality_accepted`/`municipality_declined` (Entscheidung der Gemeinde nach dem — für den P1-Pilot informellen — Interview). Ein Einsatz wird ausschliesslich bei `municipality_accepted` erstellt.

**Einsätze** — Verweis auf einen bereits von der Gemeinde akzeptierten Vorschlag, Statusverlauf (proposed → accepted → active → completed), Start-/Enddatum. Da ein Einsatz erst nach Gemeinde-Annahme entsteht, gibt es hier keinen „abgelehnt"-Status — eine Ablehnung wird bereits vorher am Kandidatenvorschlag festgehalten.

**Verträge** — Verweis auf Einsatz, generiertes Dokument, hochgeladene unterschriebene Version, Status

**Benachrichtigungen** — Empfänger, Typ, Nachricht, gelesen/ungelesen

**Aktivitätenprotokoll** — Wer hat was wann getan (Basis-Ereignisliste)

**Gespeichert in:** Supabase (PostgreSQL-Datenbank), EU-Region (Frankfurt) für DSG/nDSG-Konformität

**Dateispeicher (Supabase Storage):** zwei private Bereiche — einer für Kandidaten-Dokumente (CV, Zertifikate), einer für unterschriebene Vertragsdokumente. Beide nicht öffentlich zugänglich, nur über Berechtigungsprüfung.

### Tech Decisions (Begründung)
- **Supabase Auth (E-Mail/Passwort)** für Login und Selbst-Registrierung — nutzt fertige, geprüfte Infrastruktur statt Eigenbau.
- **Separates Benutzerprofil** zusätzlich zum Supabase-Auth-Konto — weil Rolle, Konto-Status und Verknüpfung zu Gemeinde/Kandidat dort nicht nativ abgebildet werden können.
- **Row Level Security (RLS)** als zentraler Zugriffsschutz direkt in der Datenbank — jede Rolle sieht nur die Daten, die ihr laut Spec zustehen. Dieser Schutz greift unabhängig davon, über welchen Weg auf die Daten zugegriffen wird — sicherer als reine Prüfung im Frontend.
- **EU-Hosting (Frankfurt)** statt Standard-US-Region — für DSG/nDSG-konforme Datenhaltung.
- **Private Storage-Bereiche mit zeitlich begrenzten Zugriffslinks** statt öffentlicher Dateiablage — Verträge und CVs enthalten sensible Personendaten.
- **E-Mail-Benachrichtigung bei Freischaltung/Ablehnung** zusätzlich zur In-App-Benachrichtigung (via Resend) — Nutzer wird aktiv informiert, statt erst beim nächsten Login davon zu erfahren.
- **Einheitliche Standard-Felder auf jeder Tabelle** (ID, Erstellungs-/Änderungsdatum, Ersteller-Referenz, optionale Beispieldaten-Markierung) — konsistente Nachvollziehbarkeit und Basis für Aktivitätenprotokoll und spätere Demo-/QA-Daten.

### Dependencies (zu installierende Pakete)
- `@supabase/supabase-js` — Datenbank- und Auth-Client
- `@supabase/ssr` — Session-Handling für Next.js App Router (Server- und Client-Komponenten)
- `zod` — Validierung von Formulareingaben
- `resend` — Transaktionale E-Mails (Konto-Freischaltung/Ablehnung)

## Implementation Notes (Backend)
**Umgesetzt:**
- SQL-Migration `supabase/migrations/20260725120000_init_schema.sql`: alle 9 Tabellen, Enums, Standard-Felder (`id`, `created_date`, `updated_date`, `created_by_id`, `created_by`, `is_sample`), RLS-Policies je Rolle, Indexe, `updated_date`-Trigger, `handle_new_user`-Trigger (legt bei Supabase-Auth-Signup automatisch ein `profiles`-Row mit `account_status = 'pending'` an), zwei private Storage-Buckets (`candidate-documents`, `contracts`) inkl. Storage-RLS.
- `supabase/README.md`: Setup-Anleitung (Projekt anlegen, Migration ausführen, Env-Vars befüllen).
- Supabase-Client-Struktur unter `src/lib/supabase/`: `client.ts` (Browser), `server.ts` (Server Components/Route Handlers), `admin.ts` (Service-Role, nur serverseitig), `middleware.ts` (Session-Refresh-Helper). Alter Platzhalter `src/lib/supabase.ts` entfernt.
- `src/proxy.ts` für Session-Refresh auf jedem Request — bewusst `proxy.ts` statt `middleware.ts` benannt, da Next.js 16 die `middleware`-Konvention zugunsten von `proxy` deprecated hat (Codemod-Hinweis beim Build bestätigt).
- `GET /api/health` + Vitest-Tests (`src/app/api/health/health.test.ts`, gemockter Supabase-Client) — deckt Akzeptanzkriterium „Applikation kann sich mit der Datenbank verbinden" ab, ohne dass Tests echte Zugangsdaten brauchen.
- Paket installiert: `@supabase/ssr`. `npm run build`, `npm test` grün.

**Abweichungen vom Tech Design:**
- `resend` (E-Mail bei Freischaltung/Ablehnung) ist **noch nicht installiert/implementiert**. Die eigentliche Freischaltungs-Aktion (API-Route, die die E-Mail auslöst) gehört laut Out-of-Scope-Abschnitt zur Freischaltungs-Oberfläche und wird erst mit PROJ-2 bzw. der zugehörigen Backend-Arbeit gebaut. Die Infrastruktur (Tabellen, Status-Feld) ist bereit dafür.
- ~~`assignment_status`-Enum enthält zusätzlich den Wert `declined`~~ → **Behoben per `/refine` (2026-07-25):** `declined` aus `assignment_status` entfernt (zurück auf `proposed/accepted/active/completed`), stattdessen `proposal_status` um `municipality_accepted`/`municipality_declined` erweitert — siehe Decision Log. Migration entsprechend angepasst.
- Das reale Supabase-Projekt wurde **nicht** durch mich provisioniert — dafür fehlen mir Zugangsdaten/CLI-Zugriff. Die Migration muss im vorhandenen Projekt (SQL Editor) ausgeführt und `.env.local` befüllt werden (siehe `supabase/README.md`).
- `npm run lint` ist aktuell nicht lauffähig — Next.js 16 hat den Befehl `next lint` entfernt (vorbestehendes Problem, nicht durch PROJ-1 verursacht).
- ~~Migration schlug beim ersten Ausführungsversuch im Supabase SQL Editor fehl~~ → **Behoben (2026-07-25):** `relation "profiles" does not exist`, weil die Helper-Funktionen (`current_role()` etc., `language sql`) vor der `CREATE TABLE profiles`-Anweisung standen. Postgres validiert `language sql`-Funktionsrümpfe gegen den Katalog bereits bei `CREATE FUNCTION`, nicht erst beim Aufruf. Reihenfolge in der Migration korrigiert: Tabellen jetzt vor den Helper-Funktionen. Vom Nutzer beim Testen gegen das echte Projekt gefunden.
- **QA Fix-Runde 1 (2026-07-25):** BUG-1 (Rollen-Eskalation), BUG-2 (Selbst-Zuordnung Gemeinde/Kandidat), BUG-3 (fehlende `is_active()`-Prüfung), BUG-4 (Kandidaten-Selbstregistrierung blockiert) behoben — Details siehe QA Test Results und Decision Log. Der allererste `super_admin`-Account kann dadurch nicht mehr über den öffentlichen Signup entstehen; siehe `supabase/README.md` für den nötigen manuellen Bootstrap-Schritt. **Noch nicht gegen das echte Supabase-Projekt verifiziert** — erneuter `/qa`-Durchgang nach Ausführen der aktualisierten Migration ausstehend.

## QA Test Results

**Tested:** 2026-07-25
**Scope:** Code-/Migrations-Review + automatisierte Tests (kein UI vorhanden — laut Tech Design bewusst, siehe Out of Scope). Kein Live-Zugriff auf das reale Supabase-Projekt (keine Zugangsdaten verfügbar); Ergebnisse basieren auf statischer Analyse der Migration/RLS-Policies plus `npm test` / `npm run build`.
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 2/2 grün (Health-Endpoint, gemockt)
- `npm run build`: erfolgreich, keine TS-Fehler
- `npm run lint`: weiterhin nicht lauffähig (vorbestehend, `next lint` von Next.js 16 entfernt — kein PROJ-1-Bug)
- Playwright/E2E: nicht anwendbar — PROJ-1 hat laut Tech Design keine eigene UI; E2E-Tests folgen mit PROJ-2

### Acceptance Criteria Status

#### AC-1: Applikation verbindet sich erfolgreich mit der Datenbank
- [x] Code-seitig abgedeckt: `GET /api/health` + Tests grün
- [ ] BUG: Live-Verbindung gegen das echte Supabase-Projekt noch nicht bestätigt — dein letzter Check (enums_found/public_tables_found) steht noch aus

#### AC-2: Registrierung legt Konto mit Status „ausstehend" an
- [x] `handle_new_user`-Trigger legt bei Signup ein `profiles`-Row mit `account_status = 'pending'` an
- [ ] BUG: siehe BUG-1 — die Rolle wird ungeprüft aus clientseitigen Metadaten übernommen

#### AC-3: Ausstehendes Konto sieht keine geschützten Inhalte
- [ ] BUG: siehe BUG-3 — SELECT-Policies prüfen `account_status` nicht, nur Rolle/Zuordnung

#### AC-4/AC-5: dafinex_admin schaltet frei/lehnt ab → Status wechselt
- [x] `profiles_update_by_dafinex_admin` erlaubt `dafinex_admin` (und `super_admin`) beliebige Status-Änderungen auf fremden Profilen
- [ ] BUG: siehe BUG-6 — `super_admin`-Rechte sind bereits implementiert, obwohl die zugehörige Open Question im Spec nie geschlossen wurde

#### AC-6: municipality sieht nur eigene Anfragen/Vorschläge/Einsätze
- [ ] BUG: Scoping-Logik (Joins über `municipality_id`) ist korrekt geschrieben, aber „eigene Gemeinde" ist nicht gegen Missbrauch abgesichert — siehe BUG-2, BUG-3

#### AC-7: candidate sieht nur eigenes Profil/Vorschläge/Einsätze
- [ ] BUG: Gleiches Muster wie AC-6 (BUG-2, BUG-3) — zusätzlich strukturell blockiert durch BUG-4 (Kandidat kann sich gar nicht selbst registrieren)

#### AC-8: internal_coordinator/dafinex_admin sehen alles
- [x] `is_internal_role()` gewährt in allen 9 Tabellen vollen Zugriff — korrekt

#### AC-9: Kandidat lädt Dokument sicher hoch, nur berechtigte Rollen sehen es
- [ ] BUG: Storage-Policy-Logik (`candidate-documents/<candidate_id>/...`) ist korrekt, aber strukturell unerreichbar — siehe BUG-4

#### AC-10: Unterschriebener Vertrag sicher hochgeladen, nur berechtigte Rollen sehen ihn
- [x] Storage-/Tabellen-Policies scopen korrekt auf verknüpfte Gemeinde/Kandidat/interne Rollen
- [ ] BUG: gleiche fehlende Status-Prüfung wie BUG-3

#### AC-11: RLS auf jeder Tabelle aktiviert
- [x] Bestätigt: `enable row level security` auf allen 9 Tabellen vorhanden

#### AC-12: Supabase-Projekt in EU-Region (DSG/nDSG)
- [ ] Nicht per Code verifizierbar — bitte in den Supabase-Projekteinstellungen (Dashboard) bestätigen, dass die Region Frankfurt/EU ist

### Edge Cases Status

#### EC-1: Doppelte Registrierung mit derselben E-Mail
- [x] Abgedeckt durch die eindeutige `email`-Spalte in `auth.users` (Supabase-Auth-Standard)

#### EC-2: Datei-Upload überschreitet Grössen-/Formatlimit
- [ ] Noch nicht implementiert (kein `file_size_limit`/`allowed_mime_types` auf den Storage-Buckets) — konsistent mit der noch offenen Spec-Frage dazu, kein neuer Bug

#### EC-3: Netzwerkabbruch während Upload
- [x] N/A auf Infrastruktur-Ebene — Supabase Storage speichert keine Teil-Uploads; UI-seitiges Retry-Verhalten ist Sache von PROJ-2

#### EC-4: Löschversuch einer referenzierten Gemeinde/eines Kandidaten
- [x] Durch `on delete restrict` auf den Fremdschlüsseln verhindert — bestätigt

#### EC-5: Kein dafinex_admin verfügbar, super_admin als Fallback
- [x] Funktional bereits implementiert (siehe BUG-6 zur Doku-Inkonsistenz)

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff: liefert überall leere Ergebnismengen (`auth.uid()` ist NULL → keine Policy greift)
- [x] Keine Secrets im committeten Code gefunden (Service-Role-Key nur über `process.env`)
- [ ] BUG-1 (Critical): Rollen-Eskalation bei Selbst-Registrierung
- [ ] BUG-2 (Critical): Nutzer können sich selbst beliebiger Gemeinde/Kandidat zuordnen
- [ ] BUG-3 (High): Fehlende `account_status`-Prüfung in SELECT/UPDATE-Policies
- [ ] BUG-4 (High): Kandidaten können sich strukturell nicht selbst registrieren
- [ ] BUG-5 (Medium): Keine Spalten-Schutz bei Self-Service-Updates

### Bugs Found

#### BUG-1: Rollen-Eskalation bei Selbst-Registrierung — ✅ FIXED (2026-07-25)
- **Fix:** `handle_new_user()` lehnt jede Rolle ausser `municipality`/`candidate` per `raise exception` ab. Interne Rollen können nur nachträglich von einem `dafinex_admin` per normalem `profiles`-UPDATE vergeben werden.
- **Severity:** Critical
- **Steps to Reproduce:**
  1. `supabase.auth.signUp({ email, password, options: { data: { role: 'dafinex_admin' } } })` aufrufen
  2. `handle_new_user()` übernimmt die Rolle ungeprüft: `coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'candidate')`
  3. Erwartet: Self-Registrierung sollte nur `municipality`/`candidate` zulassen
  4. Tatsächlich: Jede gültige `user_role`-Ausprägung wird akzeptiert, inkl. `super_admin`/`dafinex_admin`
- **Priority:** Fix before deployment

#### BUG-2: Selbst-Zuordnung zu beliebiger Gemeinde/Kandidat — ✅ FIXED (2026-07-25)
- **Fix:** `profiles_update_own_limited`s `WITH CHECK` pinnt jetzt zusätzlich `municipality_id` und `candidate_id` auf den aktuellen Wert (`is not distinct from`, NULL-sicher). Diese Felder können nur noch von `handle_new_user()`/`link_candidate_profile()` (SECURITY DEFINER) oder einem `dafinex_admin` gesetzt werden.
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Als eingeloggter Nutzer `update profiles set municipality_id = '<fremde-gemeinde-id>' where id = auth.uid()` senden
  2. `profiles_update_own_limited` prüft im `WITH CHECK` nur `role` und `account_status`, nicht `municipality_id`/`candidate_id`
  3. Erwartet: Diese Felder sollten nur von internen Rollen (bei Freischaltung) gesetzt werden können
  4. Tatsächlich: Jeder Nutzer kann sich selbst mit jeder existierenden Gemeinde/jedem Kandidaten verknüpfen
- **Priority:** Fix before deployment

#### BUG-3: Fehlende `account_status`-Prüfung in SELECT/UPDATE-Policies — ✅ FIXED (2026-07-25)
- **Fix:** `public.is_active()` als zusätzliche Bedingung ergänzt in: `profiles_select_own_or_internal` (nur im internen Zweig — der eigene Profil-Zeile bleibt bewusst immer lesbar, sonst könnte ein „ausstehend"-Nutzer seinen eigenen Status nie sehen), `municipalities_select`, `personnel_requests_select`, `candidate_proposals_select`, `assignments_select`/`_update`, `contracts_select`/`_update`, sowie die Storage-Policies `contracts_documents_select`/`_insert`. Bewusst **nicht** ergänzt bei `candidates_select`/`_update` (Selbst-Zugriff) und `candidate-documents`-Storage — ein Kandidat muss sein eigenes Profil/CV auch vor Freischaltung einsehen/bearbeiten können, das exponiert keine Daten Dritter.
- **Severity:** High
- **Steps to Reproduce:**
  1. Konto mit `account_status = 'pending'`, aber bereits gesetztem `municipality_id`/`candidate_id` (z.B. via BUG-2)
  2. Direkte Supabase-Abfrage auf `personnel_requests`, `candidate_proposals`, `assignments`, `contracts` absetzen
  3. Erwartet: Ausstehende Konten sehen laut AC-3 keine geschützten Inhalte
  4. Tatsächlich: Nur die `personnel_requests`-INSERT-Policy prüft `is_active()`; alle SELECT/UPDATE-Policies für `municipality`/`candidate` prüfen ausschliesslich Zuordnung, nicht Freischaltungsstatus
- **Priority:** Fix before deployment

#### BUG-4: Kandidaten können sich nicht selbst registrieren — ✅ FIXED (2026-07-25)
- **Fix:** `candidates_insert_internal` ersetzt durch `candidates_insert_self_or_internal` (`profile_id = auth.uid()` erlaubt). Neuer Trigger `link_candidate_profile()` verknüpft `profiles.candidate_id` automatisch (SECURITY DEFINER, da Self-Update dieses Feld laut BUG-2-Fix nicht mehr selbst setzen darf). `candidates.profile_id` erhält eine `unique`-Constraint, damit ein Kandidat nicht mehrfach eigene Zeilen anlegen kann.
- **Severity:** High
- **Steps to Reproduce:**
  1. Neuer Kandidat registriert sich (Auth-Signup erfolgreich, `profiles`-Row mit `role = 'candidate'` wird erstellt)
  2. Kandidat versucht, seine eigenen Profildaten (Fähigkeiten, Region, Verfügbarkeit) als neue Zeile in `candidates` zu speichern
  3. Erwartet: Laut Produktentscheidung registriert sich der Kandidat mit eigenem Profil (siehe User Stories)
  4. Tatsächlich: `candidates_insert_internal` erlaubt INSERT nur für interne Rollen — der Kandidat kann keine eigene `candidates`-Zeile anlegen und bleibt ohne `candidate_id` auf seinem Profil, wodurch auch der Dokumenten-Upload (AC-9) unerreichbar ist
- **Priority:** Fix before deployment

#### BUG-5: Keine Spalten-Beschränkung bei Self-Service-Updates
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Kandidat aktualisiert die eigene `candidates`-Zeile (`candidates_update` erlaubt dies ohne Einschränkung)
  2. Felder wie `source_type`, `is_sample`, `created_by_id`, `created_by` sind Teil des Updates und nicht schreibgeschützt
  3. Erwartet: Interne Buchhaltungsfelder sollten nur von internen Rollen änderbar sein
  4. Tatsächlich: Ein Kandidat könnte z.B. `source_type` auf `'partner'` setzen. Gleiches Muster bei `profiles.email` (Nutzer kann den angezeigten Wert unabhängig von der echten `auth.users.email` verändern)
- **Priority:** Fix in next sprint

#### BUG-6: Offene Spec-Frage zu `super_admin`-Fallback bereits implementiert, aber nicht dokumentiert geschlossen
- **Severity:** Low
- **Steps to Reproduce:**
  1. Spec, Open Questions: „Soll `super_admin` als Fallback ebenfalls Freischaltungen vornehmen können?" ist weiterhin als offen (`- [ ]`) markiert
  2. Migration: `profiles_update_by_dafinex_admin`-Policy gewährt `super_admin` bereits dieselben Rechte wie `dafinex_admin`
  3. Erwartet: Implementierte Entscheidungen sollten im Decision Log stehen und die Open Question schliessen
  4. Tatsächlich: Diskrepanz zwischen Spec-Dokumentation und tatsächlichem Verhalten
- **Priority:** Nice to have (Doku-Fix, kein Code-Fix)

### Summary
- **Acceptance Criteria:** 4/12 klar bestanden (AC-8, AC-11 vollständig; AC-1, AC-4/5, AC-10 teilweise), 1 nicht per Code verifizierbar (AC-12), Rest mit Bugs behaftet
- **Bugs Found:** 6 total (2 Critical, 2 High, 1 Medium, 1 Low)
- **Security:** Issues found — Autorisierungslücken, die den Kernzweck von RLS in diesem Feature (Rollen-/Freischaltungs-basierte Zugriffskontrolle) untergraben
- **Production Ready:** NO
- **Recommendation:** Fix bugs first — insbesondere BUG-1, BUG-2, BUG-3, BUG-4 vor jeder weiteren Arbeit auf PROJ-2 (Auth/Portale), da PROJ-2 direkt auf dieser RLS-Grundlage aufbaut

### Fix-Runde 1 (2026-07-25)
Auf Nutzeranweisung behoben, in dieser Reihenfolge: BUG-1 + BUG-2 (gleiche Ursache), dann BUG-3, dann BUG-4. BUG-5 (Medium) und BUG-6 (Low) bewusst zurückgestellt für einen späteren QA-Durchgang.

- **Bugs Found (Stand nach Fix-Runde 1):** 6 total — **4 behoben** (BUG-1, BUG-2, BUG-3, BUG-4), **2 zurückgestellt** (BUG-5 Medium, BUG-6 Low)
- **Automatisierte Tests:** `npm test` (2/2) und `npm run build` weiterhin grün nach den SQL-Änderungen
- **Nicht erneut verifiziert:** Die Fixes wurden per Code-Review umgesetzt, aber noch **nicht gegen das echte Supabase-Projekt getestet** — dafür ist ein erneuter `/qa`-Durchgang nach dem Ausführen der aktualisierten Migration nötig
- **Production Ready:** Weiterhin NO, bis Fix-Runde 1 gegen die echte DB verifiziert ist und BUG-5/BUG-6 entschieden sind

## Deployment
_To be added by /deploy_
