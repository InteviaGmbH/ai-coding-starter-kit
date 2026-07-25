# PROJ-2: Rollenbasierte Auth & Portal-Grundgerüst

## Status: In Review
**Created:** 2026-07-25
**Last Updated:** 2026-07-25 (QA: 1 Critical, 1 High, 1 Medium, 1 Low — not production-ready)

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Auth, `profiles`-Schema, RLS, Storage-Buckets

## User Stories
- Als Gemeinde-Ansprechpartner möchte ich mich registrieren können, damit ich nach Freischaltung Personalanfragen erstellen kann.
- Als Kandidat möchte ich mich mit meinem Profil (Fähigkeiten, Region, Verfügbarkeit) und optional einem CV registrieren können, damit Dafinex meine Eignung beurteilen kann.
- Als registrierter Nutzer möchte ich mich einloggen können, damit ich auf mein rollenspezifisches Portal zugreifen kann.
- Als Nutzer mit ausstehendem Konto möchte ich einen klaren Hinweis sehen, dass mein Konto auf Freischaltung wartet, damit ich weiss, dass ich nichts falsch gemacht habe.
- Als `dafinex_admin` möchte ich eine Liste ausstehender Registrierungen sehen und sie freischalten oder ablehnen können, damit nur legitime Nutzer Zugriff erhalten.
- Als eingeloggter Nutzer möchte ich eine rollenspezifische Navigation sehen, die nur die für meine Rolle relevanten Bereiche zeigt, damit ich mich nicht in fremden Funktionen verirre.
- Als Nutzer möchte ich mein Passwort zurücksetzen können, falls ich es vergessen habe.
- Als Nutzer möchte ich mich ausloggen können.

## Out of Scope
- Fachliche Inhalte der einzelnen Portale (Gemeindenverwaltung → PROJ-3, Kandidatenverwaltung → PROJ-4, Personalanfragen → PROJ-5, etc.) — PROJ-2 liefert nur das Navigations-/Auth-Grundgerüst mit leeren Platzhalter-Dashboards
- Zuordnung eines Gemeinde-Kontakts zu seiner Gemeinde bei der Registrierung selbst (Selbstauswahl) — laut PROJ-1-Entscheidung (BUG-2-Fix) kann `municipality_id` nur von `dafinex_admin` gesetzt werden; das geschieht im Freischaltungs-Screen dieser Spec, nicht im Registrierungsformular
- Partnerportal (`partner_company`) — Phase 2, PROJ-13
- Zwei-Faktor-Authentifizierung
- E-Mail-Bestätigung bei Freischaltung/Ablehnung per Resend — die Storage-/DB-Grundlage existiert, der tatsächliche E-Mail-Versand wird in dieser Spec als einfache In-App-Benachrichtigung umgesetzt (Notifications-Tabelle); vollwertiger Trigger-Mechanismus für alle Benachrichtigungsarten ist PROJ-11
- Passwort-Policy-Anpassungen über Supabase-Standard hinaus

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Besucher öffnet die Registrierungsseite, wenn er sich als Gemeinde-Ansprechpartner registriert (Name, E-Mail, Passwort, Kontaktdaten), dann wird ein Konto mit Status „ausstehend" angelegt und eine Bestätigungsseite angezeigt
- [ ] Angenommen ein Besucher öffnet die Registrierungsseite, wenn er sich als Kandidat registriert (Name, E-Mail, Passwort, Fähigkeiten, Region, Verfügbarkeit, optional CV-Upload), dann wird ein Konto plus `candidates`-Profil angelegt und eine Bestätigungsseite angezeigt
- [ ] Angenommen ein Konto hat Status „ausstehend", wenn sich der Nutzer einloggt, dann landet er auf einer Warteseite ohne Zugriff auf geschützte Portal-Inhalte
- [ ] Angenommen ein Konto hat Status „abgelehnt", wenn sich der Nutzer einloggt, dann sieht er eine entsprechende Meldung ohne Zugriff auf geschützte Inhalte
- [ ] Angenommen ein `dafinex_admin` ist eingeloggt, wenn er die Freischaltungsseite öffnet, dann sieht er alle Konten mit Status „ausstehend" inkl. Registrierungsdetails
- [ ] Angenommen ein `dafinex_admin` schaltet ein Gemeinde-Konto frei, wenn er dabei eine bestehende Gemeinde zuordnet, dann wechselt der Status auf „aktiv", `municipality_id` wird gesetzt und der Nutzer erhält eine In-App-Benachrichtigung
- [ ] Angenommen ein `dafinex_admin` schaltet ein Kandidaten-Konto frei, dann wechselt der Status auf „aktiv" und der Nutzer erhält eine In-App-Benachrichtigung
- [ ] Angenommen ein `dafinex_admin` lehnt ein Konto ab, dann wechselt der Status auf „abgelehnt" und der Nutzer erhält eine In-App-Benachrichtigung
- [ ] Angenommen ein Nutzer mit aktivem Konto meldet sich mit korrekten Zugangsdaten an, dann wird er auf das seiner Rolle entsprechende Portal weitergeleitet (super_admin/dafinex_admin/internal_coordinator → internes Dashboard, municipality → Gemeindeportal, candidate → Kandidatenportal)
- [ ] Angenommen ein Nutzer meldet sich mit falschen Zugangsdaten an, dann wird eine Fehlermeldung angezeigt, ohne preiszugeben, ob die E-Mail existiert
- [ ] Angenommen ein Nutzer ist eingeloggt, wenn er eine Portal-URL einer anderen Rolle direkt aufruft, dann wird er auf sein eigenes Portal zurückgeleitet (serverseitig durchgesetzt, nicht nur UI-Verstecken)
- [ ] Angenommen ein nicht eingeloggter Besucher ruft eine geschützte Portal-URL auf, dann wird er zur Login-Seite umgeleitet
- [ ] Angenommen ein Nutzer klickt „Passwort vergessen", wenn er seine E-Mail eingibt, dann erhält er eine Reset-E-Mail (Supabase-Standardflow) und kann ein neues Passwort setzen
- [ ] Angenommen ein eingeloggter Nutzer klickt „Abmelden", dann wird die Session beendet und er landet auf der Login-Seite

## Edge Cases
- Registrierung mit bereits verwendeter E-Mail → Supabase Auth liefert Fehler, Formular zeigt „E-Mail bereits registriert"
- Kandidat lädt beim Registrieren eine zu grosse oder falsche Datei hoch → Fehlermeldung, Rest des Formulars bleibt erhalten (Wert aus Open Question PROJ-1 bleibt offen, UI validiert clientseitig ein sinnvolles Default-Limit von 10 MB / PDF+JPG+PNG, serverseitig über Storage-Policy)
- `dafinex_admin` versucht ein bereits freigeschaltetes/abgelehntes Konto erneut zu bearbeiten → Freischaltungsliste zeigt nur „ausstehend"-Konten, verhindert Doppelaktionen
- Nutzer mit Rolle `municipality`/`candidate` versucht per direktem API-Call auf interne Routen zuzugreifen → durch RLS (PROJ-1) und serverseitige Rollenprüfung im Route-Handler blockiert, nicht nur clientseitig
- Session läuft während der Nutzung ab → Redirect zur Login-Seite bei nächster Server-Anfrage (via `proxy.ts` Session-Refresh aus PROJ-1)
- Gemeinde-Konto wird freigeschaltet, aber keine passende Gemeinde existiert in der Liste → `dafinex_admin` muss zuerst über PROJ-3 (Gemeindenverwaltung) eine Gemeinde anlegen; Freischaltungsscreen zeigt Hinweis statt Fehler

## Technical Requirements (optional)
- Security: Rollenprüfung serverseitig (Server Components/Route Handlers), nie nur im Client
- Nutzt bestehende RLS/Trigger aus PROJ-1 (`handle_new_user`, `link_candidate_profile`, `profiles_update_by_dafinex_admin`)
- Formulare mit Zod-Validierung (react-hook-form + @hookform/resolvers), shadcn/ui-Komponenten

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Konkretes Datei-Upload-Limit für CVs (siehe auch offene Frage in PROJ-1) — vorläufig 10 MB / PDF, JPG, PNG angenommen, bitte bestätigen
- [ ] Soll es eine Möglichkeit geben, dass ein `dafinex_admin` ein bereits abgelehntes Konto später doch noch freischaltet (Korrektur bei Fehlentscheidung)?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für PROJ-2–PROJ-5) | Nutzer hat explizit autonome Bearbeitung mit Haltepunkten nur bei /architecture und /qa freigegeben | 2026-07-25 |
| Gemeinde-Zuordnung (`municipality_id`) erfolgt ausschliesslich im Freischaltungs-Screen durch `dafinex_admin`, nicht durch Selbstauswahl bei der Registrierung | Konsistent mit PROJ-1 BUG-2-Fix (kein Self-Assignment zu beliebiger Gemeinde) | 2026-07-25 |
| E-Mail-Versand bei Freischaltung/Ablehnung wird in PROJ-2 durch eine einfache In-App-Benachrichtigung ersetzt, kein Resend-Versand | Volles Benachrichtigungssystem inkl. E-Mail ist PROJ-11; für den Pilot reicht In-App, reduziert Scope von PROJ-2 | 2026-07-25 |
| CV-Upload-Limit vorläufig auf 10 MB / PDF,JPG,PNG festgelegt | Pragmatischer Default für den Pilot, da die zugehörige Open Question aus PROJ-1 noch nicht abschliessend beantwortet ist | 2026-07-25 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neuen Tabellen — PROJ-2 nutzt ausschliesslich `profiles`, `municipalities`, `candidates`, `notifications` aus PROJ-1 | Schema wurde in PROJ-1 bereits vollständig für diesen Zweck entworfen | 2026-07-25 |
| Rollen-/Status-Prüfung erfolgt in jedem Portal-Layout als Server Component (liest `profiles`-Zeile serverseitig, `redirect()` bei Mismatch) statt nur im Client zu verstecken | Verhindert, dass ein Nutzer per direktem URL-Aufruf ein fremdes Portal-Layout lädt, bevor ein Client-Check greift | 2026-07-25 |
| Freischaltung/Ablehnung läuft über eine normale, authentifizierte Supabase-Anfrage (kein Service-Role-Client nötig) | `profiles_update_by_dafinex_admin`-RLS-Policy aus PROJ-1 erlaubt das bereits direkt | 2026-07-25 |
| Kandidaten-Registrierung läuft in 2 Schritten: (1) `signUp` mit `role: 'candidate'` erzeugt Auth-User + pending Profil, (2) direkt anschliessend `insert` in `candidates` mit `profile_id = user.id`, danach optionaler Storage-Upload in `candidate-documents/<neue candidate_id>/...` | Nutzt die in PROJ-1 gebauten Policies (`candidates_insert_self_or_internal`, `link_candidate_profile`-Trigger) ohne zusätzliche Backend-Logik | 2026-07-25 |
| react-hook-form + Zod für alle Formulare | Bereits im Tech-Stack vorgesehen (CLAUDE.md) | 2026-07-25 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
App (Next.js App Router, route groups)
├── (auth)/                      — öffentlich, kein Login nötig
│   ├── login/                   (LoginForm)
│   ├── register/                (RoleToggle → MunicipalityRegisterForm | CandidateRegisterForm+CV-Upload)
│   ├── forgot-password/         (ForgotPasswordForm)
│   └── reset-password/          (ResetPasswordForm)
├── pending/                     — eingeloggt, Status "ausstehend" (PendingStatusCard)
├── rejected/                    — eingeloggt, Status "abgelehnt" (RejectedStatusCard)
├── internal/                    — Layout mit Sidebar-Nav (super_admin, dafinex_admin, internal_coordinator)
│   ├── layout.tsx                 (serverseitiger Rollen-Guard + Nav)
│   ├── dashboard/                (Platzhalter)
│   └── approvals/                (PendingAccountsTable, ApproveDialog mit Gemeinde-Select, RejectDialog)
├── municipality/                — Layout mit Nav (Rolle municipality)
│   ├── layout.tsx
│   └── dashboard/                (Platzhalter)
└── candidate/                   — Layout mit Nav (Rolle candidate)
    ├── layout.tsx
    └── dashboard/                (Platzhalter)

Shared: <LogoutButton>, <RoleBadge>, Server-Helper getCurrentProfile()
```

### Data Model
Keine neuen Tabellen. PROJ-2 liest/schreibt ausschliesslich:
- `profiles` (Status-Anzeige, Freischaltung/Ablehnung durch `dafinex_admin`)
- `municipalities` (Auswahlliste im Freischaltungs-Dialog)
- `candidates` (Anlage bei Registrierung)
- `notifications` (einfacher Eintrag bei Freischaltung/Ablehnung: „Ihr Konto wurde freigeschaltet/abgelehnt")

### Tech Decisions (Begründung)
- **Serverseitiger Rollen-Guard pro Portal-Layout** statt globaler Middleware-Redirect-Logik — jedes Layout kennt genau seine erlaubte(n) Rolle(n) und den erforderlichen Status, einfacher zu lesen und zu testen als eine zentrale Regel-Tabelle.
- **Kein Service-Role-Client für Freischaltung** — die bestehende RLS-Policy erlaubt `dafinex_admin` bereits volle Schreibrechte auf `profiles`; ein privilegierter Client wäre unnötige zusätzliche Angriffsfläche.
- **Zweistufige Kandidaten-Registrierung** (Auth-Signup → `candidates`-Insert → Storage-Upload) — nutzt die in PROJ-1 gebaute Infrastruktur 1:1, keine neue Backend-Route nötig.
- **In-App-Benachrichtigung statt E-Mail** bei Freischaltung/Ablehnung — reduziert PROJ-2 auf UI+Datenbank, kein E-Mail-Provider-Setup in dieser Spec nötig.

### Dependencies (zu installierende Pakete)
- `react-hook-form`, `@hookform/resolvers`, `zod` — bereits im Projekt vorhanden
- Keine neuen Pakete nötig

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- Design-System angewendet: `globals.css`/`tailwind.config.ts` mit dunklem Blau als Primärfarbe, neuer `brand`-Farbtoken (Türkis) für spätere CTA-/Status-Verwendung, gebrandete Sidebar-Farben; Inter-Font, `lang="de"`, Titel „Dafinex" in `layout.tsx`
- `src/lib/auth/get-current-profile.ts`: zentraler Server-Helper (`getCurrentProfile`, `getPortalPathForProfile`, `INTERNAL_ROLES`)
- Auth-Seiten: `/login`, `/register` (Rollen-Umschalter Gemeinde/Kandidat via Tabs), `/forgot-password`, `/reset-password` (bewusst ausserhalb der `(auth)`-Gruppe, siehe Kommentar im Code — sonst würde der Redirect-Guard die Supabase-Recovery-Session sofort wegleiten)
- `/pending`, `/rejected`: Status-Screens mit Logout
- Drei geschützte Portale (`/internal`, `/municipality`, `/candidate`) mit serverseitigem Rollen-/Status-Guard im jeweiligen `layout.tsx`, gemeinsame `PortalShell`-Komponente (Sidebar Desktop, Sheet-Drawer Mobile)
- `/internal/approvals`: Liste ausstehender Konten (Server Component), `ApproveRejectDialog` mit Gemeinde-Select (Kandidat/Gemeinde-Details je nach Rolle), Server Actions in `actions.ts` (`approveMunicipalityAccount`, `approveCandidateAccount`, `rejectAccount`) inkl. Zod-Validierung der IDs und In-App-Benachrichtigung
- `/` leitet je nach Session/Rolle/Status weiter, ersetzt die Next.js-Standardseite
- Vitest-Integrationstests für die Approval-Server-Actions (`actions.test.ts`, gemockter Supabase-Client): Berechtigungsprüfung, Validierung, Happy Path, DB-Fehlerfall
- `npm test` (6/6), `npm run build` grün; Smoke-Test gegen den laufenden Dev-Server (echtes Supabase-Projekt) bestätigt: öffentliche Seiten 200, geschützte Routen ohne Login 307-Redirect, `/api/health` 200

**Wichtige Abhängigkeit von einer Supabase-Projekteinstellung:**
- „Confirm email" muss im Supabase-Dashboard deaktiviert sein, sonst bricht der zweistufige Kandidaten-Registrierungsfluss (Signup → sofortiger `candidates`-Insert → Upload) mangels Session ab. Dokumentiert in `supabase/README.md`.

**Abweichungen / bewusste Vereinfachungen:**
- Kein `SidebarProvider`/shadcn-`Sidebar`-Primitive verwendet (zu viel Overhead für dieses MVP-Grundgerüst) — stattdessen eine schlanke, aus Button/Sheet komponierte `PortalShell`. Verstösst nicht gegen „shadcn first", da keine der gelisteten Primitiven (Button, Dialog, Sheet, Table, Select …) neu implementiert wurde.
- Datei-Upload-Limit (10 MB, PDF/JPG/PNG) clientseitig umgesetzt wie in der Spec vorgesehen; serverseitige Durchsetzung erfolgt nur indirekt über die Storage-Policy (kein zusätzliches Limit auf Bucket-Ebene konfiguriert) — siehe Open Question.
- Passwort-Reset nutzt den Supabase-Standardflow ohne eigene Rate-Limiting-Konfiguration.

## QA Test Results

**Tested:** 2026-07-25
**App URL:** http://localhost:3000 (laufender Dev-Server des Nutzers, echtes Supabase-Projekt)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 6/6 grün (inkl. Approval-Server-Actions)
- `npm run build`: erfolgreich
- Playwright-Browser (chromium, webkit) mussten zuerst installiert werden (`npx playwright install chromium webkit`) — danach lauffähig
- E2E-Suite `tests/PROJ-2-rollenbasierte-auth-portal-grundgeruest.spec.ts`: **4 von 10 Tests bestanden** (2 Szenarien × chromium + Mobile Safari), 6 fehlgeschlagen — siehe Bugs unten

### Acceptance Criteria Status

#### Registrierung Gemeinde
- [ ] BUG: Schlägt in der Praxis fehl, siehe BUG-2 (Umgebungsproblem, kein Code-Fehler in der Spec-Logik selbst)

#### Registrierung Kandidat
- [ ] BUG: Formular stürzt beim Öffnen des "Kandidat"-Tabs vollständig ab, siehe BUG-1 (Critical)

#### Pending/Rejected-Screens, Rollen-Redirects, Login-Fehlermeldung, Passwort-Reset
- [x] Unauthentifizierter Zugriff auf `/internal/dashboard` → Redirect zu `/login` (E2E bestätigt)
- [x] Login mit falschem Passwort → generische Fehlermeldung, bleibt auf `/login` (E2E bestätigt)
- [x] Serverseitige Rollen-Guards (Code-Review): jedes Portal-Layout prüft Rolle+Status serverseitig, kein reines Client-Verstecken
- Restliche Kriterien (Freischaltung durch dafinex_admin, Rollen-Redirect nach aktivem Login) konnten mangels eines bereits existierenden `dafinex_admin`-Testkontos nicht per E2E durchgetestet werden (siehe Coverage-Lücke unten)

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff liefert überall Redirects, keine Daten
- [x] Login verrät nicht, ob eine E-Mail existiert (generische Fehlermeldung)
- [x] Passwort-Reset verrät nicht, ob eine E-Mail existiert (generische Bestätigung immer)
- [x] Freischaltungs-Server-Actions per Code-Review geprüft: Zod-Validierung der IDs, RLS als zweite Verteidigungslinie, `requireDafinexAdmin()` blockt `internal_coordinator` korrekt vor der eigentlichen Mutation
- [ ] BUG-3 (Medium): `internal_coordinator` sieht die komplette Freischaltungsseite inkl. Buttons, obwohl er laut Spec nicht freischalten darf — Aktion schlägt erst beim Klick fehl statt die Seite/den Nav-Punkt gar nicht erst anzuzeigen
- [ ] BUG-4 (Low): Dateiname beim CV-Upload wird nicht bereinigt (kein Sicherheitsrisiko, da Object-Storage-Keys nicht als Dateisystempfade aufgelöst werden — rein kosmetisch, z.B. bei Sonderzeichen/Leerzeichen im Dateinamen)

### Bugs Found

#### BUG-1: CandidateRegisterForm stürzt beim Rendern ab
- **Severity:** Critical
- **Steps to Reproduce:**
  1. `/register` öffnen, Tab „Kandidat" anklicken
  2. Erwartet: Registrierungsformular für Kandidaten wird angezeigt
  3. Tatsächlich: Next.js Runtime-Error-Overlay — `useFormField should be used within <FormField>` in `src/components/ui/form.tsx:48`, ausgelöst von `<FormLabel htmlFor="cv">` im CV-Upload-Abschnitt von `candidate-register-form.tsx`, das ausserhalb eines `<FormField>`/`<FormItem>`-Kontexts verwendet wird (der CV-Upload ist kein react-hook-form-Feld, sondern manuell mit `useState` verwaltet)
  4. Wirkung: Die komplette Kandidaten-Registrierung ist unbenutzbar — bestätigt durch E2E-Test (Timeout beim Warten auf das Vorname-Feld, weil die Seite bereits abgestürzt ist, bevor das Feld je sichtbar wurde)
- **Priority:** Fix before deployment

#### BUG-2: Registrierung schlägt wegen Supabase E-Mail-Rate-Limit fehl
- **Severity:** High
- **Steps to Reproduce:**
  1. Diagnose-Skript hat die tatsächliche Supabase-Antwort auf `signUp()` mitgeloggt: `429 {"code":"over_email_send_rate_limit","message":"email rate limit exceeded"}`
  2. Erwartet: Registrierung erzeugt einen Account, ohne dass Supabase in kurzer Zeit blockiert
  3. Tatsächlich: Supabase versucht bei jedem `signUp()` eine E-Mail zu versenden und trifft das strikte Standard-Rate-Limit des eingebauten E-Mail-Providers (ohne eigenes SMTP typischerweise nur einzelne E-Mails pro Stunde) — bereits 2–3 Registrierungsversuche kurz hintereinander reichen aus
  4. Vermutete Ursache: „Confirm email" ist im Supabase-Dashboard vermutlich noch nicht deaktiviert (in `supabase/README.md` als nötiger Setup-Schritt dokumentiert), oder Supabase versendet unabhängig davon eine Willkommens-/Bestätigungsmail
  5. Auswirkung: Nicht nur auf die Test-Suite beschränkt — im echten Pilotbetrieb würden mehrere Gemeinde-/Kandidaten-Registrierungen kurz hintereinander ebenfalls fehlschlagen, mit der generischen Fehlermeldung "Registrierung fehlgeschlagen", die den wahren Grund verschleiert
- **Priority:** Fix before deployment (Konfiguration prüfen; zusätzlich: generische Fehlermeldung im Formular sollte Rate-Limit-Fälle künftig unterscheiden, statt sie als "bereits registriert"-ähnlichen Standardfehler zu verschleiern)

#### BUG-3: `internal_coordinator` sieht Freischaltungsseite ohne Berechtigung zu haben
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Als `internal_coordinator` einloggen (aktiv)
  2. Nav-Punkt „Freischaltungen" ist sichtbar und die Seite lädt die volle Liste inkl. Kandidaten-/Gemeinde-Details
  3. Erwartet laut PROJ-1-Entscheidung: Nur `dafinex_admin`/`super_admin` dürfen freischalten
  4. Tatsächlich: Erst der Klick auf „Freischalten"/„Ablehnen" schlägt mit „Keine Berechtigung." fehl — die Seite selbst hätte für diese Rolle gar nicht erst zugänglich sein sollen
- **Priority:** Fix in next sprint

#### BUG-4: CV-Dateiname wird nicht bereinigt
- **Severity:** Low
- **Steps to Reproduce:**
  1. CV mit Sonderzeichen/Leerzeichen im Dateinamen hochladen
  2. Pfad wird unverändert als `<candidate_id>/<originalDateiname>` gespeichert
  3. Kein Sicherheitsrisiko (Object-Storage-Keys werden nicht als Dateisystempfade aufgelöst, `(storage.foldername(name))[1]` bleibt korrekt der `candidate_id`-Präfix), aber potenziell unschöne/inkonsistente Pfade
- **Priority:** Nice to have

### Coverage-Lücke (dokumentiert, kein Bug)
Freischaltung durch `dafinex_admin` und der anschliessende Login mit Redirect ins jeweilige Portal konnten nicht per E2E getestet werden, da kein `dafinex_admin`-Testkonto ohne den manuellen Bootstrap-Schritt (`supabase/README.md`) existiert. Sobald ein Testkonto verfügbar ist, sollte dieser Pfad ergänzt werden.

### Summary
- **Acceptance Criteria:** 3 von 14 E2E-testbar bestätigt, 2 zentrale Flows (Kandidaten-Registrierung, Gemeinde-Registrierung) schlagen in der Praxis fehl
- **Bugs Found:** 4 total (1 Critical, 1 High, 1 Medium, 1 Low)
- **Security:** Keine Autorisierungslücke gefunden (RLS + serverseitige Guards greifen korrekt), aber ein UX/Berechtigungs-Mismatch (BUG-3)
- **Production Ready:** **NO** — Critical- und High-Bug offen
- **Recommendation:** BUG-1 (Code-Fix, klar lokalisiert) und BUG-2 (Supabase-Projekteinstellung/Fehlermeldung) vor jedem weiteren Schritt beheben

## Deployment
_To be added by /deploy_
