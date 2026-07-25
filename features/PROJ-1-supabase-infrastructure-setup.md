# PROJ-1: Supabase Infrastructure Setup

## Status: In Progress
**Created:** 2026-07-25
**Last Updated:** 2026-07-25 (refine: assignment/proposal status correction)

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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
