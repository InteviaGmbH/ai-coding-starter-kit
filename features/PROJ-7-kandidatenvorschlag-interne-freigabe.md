# PROJ-7: Kandidatenvorschlag & interne Freigabe

## Status: Deployed
**Created:** 2026-07-26
**Last Updated:** 2026-07-28 (Deployed: siehe Abschnitt "Deployment" unten)

## Dependencies
- Requires: PROJ-5 (Personalanfrage-Workflow) — eine Anfrage muss Status „geprüft" haben, bevor Kandidaten vorgeschlagen werden können
- Requires: PROJ-6 (Kandidatensuche mit Matching-Filter) — liefert den „Kandidat vorschlagen"-Button (bisher deaktivierter Platzhalter), der hier aktiviert wird

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich aus der Kandidatensuche heraus einen Kandidaten für eine Anfrage vorschlagen, damit der Auswahlprozess dokumentiert ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich alle Vorschläge zu einer Anfrage mit Status sehen, damit ich den Überblick behalte, wer bereits vorgeschlagen wurde.
- Als `dafinex_admin`/`internal_coordinator` möchte ich einen Vorschlag intern freigeben oder ablehnen, damit nur geprüfte Vorschläge in den nächsten Schritt (Gemeinde-Interview, PROJ-8) gehen.
- Als `dafinex_admin`/`internal_coordinator` möchte ich einen versehentlich erstellten, noch nicht entschiedenen Vorschlag zurückziehen können, damit Fehler korrigierbar sind.

## Out of Scope
- Sichtbarkeit/Interaktion für die Gemeinde (Ansehen, Interview, Annahme/Ablehnung eines freigegebenen Vorschlags) — das ist PROJ-8; diese Spec liefert nur die interne Seite des Workflows
- Automatische Benachrichtigung der Gemeinde bei Freigabe — es existiert noch keine Gemeinde-Ansicht für Vorschläge (kommt mit PROJ-8); volle Benachrichtigungstrigger ohnehin erst PROJ-11
- Freitext-Begründung/Notizen zu einem Vorschlag oder einer Ablehnung — volles Nachrichtensystem ist PROJ-17 (P2), hier reicht der reine Status
- Erneutes Entscheiden eines bereits freigegebenen/abgelehnten Vorschlags (Rückgängig machen) — Entscheidungen sind final in P0
- Automatische Konflikterkennung (z.B. Kandidat bereits einem anderen, überschneidenden Einsatz vorgeschlagen) — nicht Teil des PRD-Scopes für den Pilot
- Globale, anfrageübergreifende Vorschlagsliste (`/internal/proposals`) — für den Pilot mit einer Gemeinde reicht die anfragebezogene Ansicht; kann später per `/refine` ergänzt werden

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen eine Anfrage hat Status „geprüft", wenn ein interner Nutzer in der Kandidatensuche (PROJ-6) auf „Kandidat vorschlagen" klickt und bestätigt, dann wird ein Vorschlag mit Status „vorgeschlagen" angelegt und ein Aktivitätseintrag erstellt
- [ ] Angenommen eine Anfrage hat Status „erstellt" (noch nicht geprüft), dann ist „Kandidat vorschlagen" weiterhin deaktiviert mit einem erklärenden Hinweis
- [ ] Angenommen für einen Kandidaten existiert bereits ein Vorschlag mit Status „vorgeschlagen" zur selben Anfrage, wenn erneut „vorschlagen" versucht wird, dann wird dies verhindert (kein doppelter offener Vorschlag) und ein Hinweis erklärt warum
- [ ] Angenommen ein interner Nutzer öffnet die Detailseite einer Anfrage, dann sieht er die Anzahl/den Zugang zu den bisherigen Vorschlägen dieser Anfrage
- [ ] Angenommen ein interner Nutzer öffnet die Vorschlagsliste einer Anfrage, dann sieht er alle Vorschläge mit Kandidatenname, Status-Badge, vorgeschlagen von, Datum
- [ ] Angenommen ein Vorschlag hat Status „vorgeschlagen", wenn ein interner Nutzer ihn freigibt, dann wechselt der Status zu „freigegeben" und ein Aktivitätseintrag wird erstellt
- [ ] Angenommen ein Vorschlag hat Status „vorgeschlagen", wenn ein interner Nutzer ihn ablehnt, dann wechselt der Status zu „abgelehnt" und ein Aktivitätseintrag wird erstellt
- [ ] Angenommen ein Vorschlag hat Status „vorgeschlagen", wenn ein interner Nutzer ihn zurückzieht, dann wird der Vorschlag entfernt
- [ ] Angenommen ein Vorschlag hat bereits Status „freigegeben" oder „abgelehnt", dann sind Freigeben/Ablehnen/Zurückziehen-Aktionen deaktiviert (Entscheidung ist final)
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht, die internen Vorschlags-Aktionen (vorschlagen/freigeben/ablehnen/zurückziehen) per direktem Aufruf auszulösen, dann wird dies durch RLS und serverseitige Prüfung verhindert
- [ ] Angenommen eine Vorschlagsliste ist leer, wenn sie geöffnet wird, dann wird ein Hinweistext statt einer leeren Tabelle angezeigt

## Edge Cases
- Kandidat wird für dieselbe Anfrage nach einer Ablehnung erneut vorgeschlagen → erlaubt (neuer Vorschlagseintrag), da Situationen sich ändern können (z.B. neue Informationen); nur ein gleichzeitig *offener* (Status „vorgeschlagen") Doppel-Vorschlag pro Kandidat/Anfrage wird verhindert
- Zwei interne Nutzer entscheiden gleichzeitig über denselben Vorschlag → zweiter Versuch scheitert serverseitig (Status ist bereits final), Hinweis statt stiller Erfolg
- Anfrage wird zwischen Öffnen der Kandidatensuche und Klick auf „vorschlagen" extern auf einen anderen Status geändert (sollte in der Praxis kaum vorkommen, da nur „erstellt"→„geprüft" möglich ist und das kein Rückschritt ist) → serverseitige Prüfung lässt Vorschlag in diesem Fall weiterhin zu, da „geprüft" ein Endzustand ist
- Kandidat wird zwischen Suche und Vorschlag deaktiviert (Konto-Status ändert sich) → serverseitige Prüfung lehnt den Vorschlag ab, auch wenn der Button clientseitig noch aktiv war
- Sehr viele Vorschläge zu einer Anfrage → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bei PROJ-4/6)

## Technical Requirements (optional)
- Security: Schreiboperationen (vorschlagen/freigeben/ablehnen/zurückziehen) ausschliesslich für interne Rollen, serverseitig per Zod validiert, RLS aus PROJ-1 (`candidate_proposals_insert_internal`/`_update_internal`/`_delete_internal`) als zweite Verteidigungslinie — bereits vorhanden, keine neue Migration nötig
- Zugriff ausschliesslich über `/internal/*`-Portal

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll eine globale, anfrageübergreifende Vorschlagsliste (`/internal/proposals`) ergänzt werden, sobald mehr als eine Gemeinde/mehr parallele Anfragen aktiv sind? Aktuell als Out of Scope zurückgestellt (siehe oben)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–6 vereinbart | 2026-07-26 |
| Ein Kandidat kann erst vorgeschlagen werden, wenn die Anfrage Status „geprüft" hat | Erzwingt die vorgesehene Reihenfolge (interne Prüfung vor Kandidatensuche/-vorschlag), verhindert Vorschläge zu noch nicht triagierten Anfragen | 2026-07-26 |
| Freigeben/Ablehnen/Zurückziehen kann jede interne Rolle ausführen, keine Trennung „Vorschlagender ≠ Freigebender" | Team von 2-3 Personen im Pilot; ein Vier-Augen-Prinzip wäre Over-Engineering für diese Grösse und ist im PRD nicht gefordert | 2026-07-26 |
| Nur ein gleichzeitig offener Vorschlag (Status „vorgeschlagen") pro Kandidat/Anfrage-Paar; nach Ablehnung ist ein erneuter Vorschlag für denselben Kandidaten erlaubt | Verhindert versehentliche Doppel-Vorschläge (z.B. Doppelklick), ohne eine Ablehnung endgültig zu machen — Umstände können sich ändern | 2026-07-26 |
| Freigabe-/Ablehnungsentscheidung ist final (kein Rückgängig) in P0 | Konsistent mit dem „geprüft"-Muster aus PROJ-5; hält den Statusverlauf einfach und nachvollziehbar für den Piloten | 2026-07-26 |
| Keine Freitext-Begründung beim Ablehnen | PRD-Non-Goal „kein volles Nachrichtensystem" (→ PROJ-17); Status allein genügt für den Piloten | 2026-07-26 |
| Keine Gemeinde-Benachrichtigung bei Freigabe in dieser Spec | Es existiert noch keine Gemeinde-Ansicht für Vorschläge (kommt erst mit PROJ-8); eine Benachrichtigung ohne Ziel-UI wäre nutzlos | 2026-07-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Tabelle, keine neue Migration — `candidate_proposals` und die zugehörigen RLS-Policies (`_insert_internal`, `_update_internal`, `_delete_internal`, `_select`) existieren bereits vollständig aus PROJ-1 | Schema wurde beim ursprünglichen PROJ-1-Design bereits mit diesem Workflow im Kopf entworfen (Status-Enum `proposed/approved/rejected/...` deckt genau diesen Schritt ab) | 2026-07-26 |
| Neue Route `/internal/requests/[id]/proposals` statt einer globalen Vorschlagsliste | Konsistent mit dem in PROJ-6 etablierten Muster (anfragebezogene Kontextseiten statt globaler Listen) im Pilot-Massstab | 2026-07-26 |
| „Kandidat vorschlagen"-Button aus PROJ-6 wird aktiviert und ruft eine Server Action auf, die den Nutzer danach zur neuen Vorschlagsliste weiterleitet | Direktes Feedback nach der Aktion, ohne eine separate Bestätigungsseite zu bauen | 2026-07-26 |
| Duplikatsprüfung („nur ein offener Vorschlag pro Kandidat/Anfrage") erfolgt in der Server Action (Abfrage vor Insert), keine DB-Unique-Constraint | Eine harte Unique-Constraint würde erneutes Vorschlagen nach Ablehnung strukturell verhindern; die Prüfung auf Anwendungsebene erlaubt das gezielt (siehe Product Decision), Race Conditions sind bei diesem Nutzungsmuster (interne Einzelaktion, kein Massen-Insert) im Pilot vernachlässigbar | 2026-07-26 |
| `proposeCandidate`/`reviewProposal`/`withdrawProposal` prüfen nach jedem Schreibvorgang die Anzahl betroffener Zeilen statt nur auf `error` | Gleiche Lehre wie PROJ-5: RLS-blockierte Schreibvorgänge liefern keinen Fehler, sondern betreffen still null Zeilen | 2026-07-26 |
| Anfrage-Statusprüfung („geprüft" erforderlich) und Kandidat-Statusprüfung (aktiv/kein ausstehendes Konto) erfolgen serverseitig in der Server Action, zusätzlich zur clientseitigen Button-Deaktivierung | Verteidigung gegen den in den Edge Cases dokumentierten Zeitfenster-Fall (Status ändert sich zwischen Laden der Seite und Klick) | 2026-07-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/internal/requests/[id]/candidates/            — PROJ-6, "Kandidat vorschlagen"-Button jetzt aktiv
  └── ProposeCandidateButton (Client)             Bestätigungsdialog → Server Action → Redirect zur Vorschlagsliste

/internal/requests/[id]/proposals/              — Vorschlagsliste einer Anfrage (Server Component)
  └── ProposalsTable                              Kandidatenname, Status-Badge, vorgeschlagen von/am,
                                                    Freigeben/Ablehnen/Zurückziehen-Aktionen (nur bei Status "vorgeschlagen")
  └── Empty State                                  "Noch keine Vorschläge" bei leerer Liste

Ergänzung auf /internal/requests/[id]/ (PROJ-5/6): neuer Button/Badge "Vorschläge (N)" → verlinkt hierher
```

### Data Model
Keine neuen Tabellen. Nutzt ausschliesslich bereits bestehende Strukturen aus PROJ-1:
- `candidate_proposals` — `request_id`, `candidate_id`, `proposed_by_id`, `status` (`proposed`/`approved`/`rejected`)
- `personnel_requests` — Statusprüfung ("geprüft" als Voraussetzung fürs Vorschlagen)
- `candidates`/`profiles` — Statusprüfung (aktives Konto bzw. kein Konto)
- `activity_log` — ein Eintrag je Statuswechsel (vorgeschlagen/freigegeben/abgelehnt)

### Tech Decisions (Begründung)
- **Keine neue Migration** — das PROJ-1-Schema wurde bereits mit diesem Workflow im Kopf entworfen; das spart Risiko und Aufwand.
- **Anwendungsseitige statt DB-seitige Duplikatsprüfung** — bewusster Trade-off zugunsten von Flexibilität (erneutes Vorschlagen nach Ablehnung bleibt möglich), passend zur geringen Nutzungsfrequenz im Pilot.
- **Anfragebezogene statt globale Vorschlagsliste** — hält den Scope konsistent mit PROJ-6 und dem Pilot-Massstab (eine Gemeinde, überschaubare Anzahl paralleler Anfragen).

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Table, Badge, Dialog, Button) aus PROJ-3/4/5/6.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- Keine neue Migration — nutzt die bestehende `candidate_proposals`-Tabelle und RLS aus PROJ-1
- `src/app/internal/requests/[id]/proposals/actions.ts`: `proposeCandidate` (prüft Anfrage-Status „geprüft", Kandidat-Kontostatus, verhindert doppelten offenen Vorschlag, setzt `created_by_id`/`created_by` explizit, `activity_log`-Eintrag), `reviewProposal` (freigeben/ablehnen, nur bei Status „vorgeschlagen", idempotent-abweisend bei bereits entschiedenen Vorschlägen, `activity_log`-Eintrag), `withdrawProposal` (löschen, nur bei Status „vorgeschlagen"); alle drei prüfen die Anzahl betroffener Zeilen nach jedem Schreibvorgang statt nur auf `error` (gleiche Lehre wie PROJ-5)
- `src/components/portal/propose-candidate-button.tsx`: aktiviert den bisherigen PROJ-6-Platzhalter-Button mit Bestätigungsdialog (`AlertDialog` + eigenständiger `Button` statt `AlertDialogAction`, damit Fehlermeldungen sichtbar bleiben — Lehre aus PROJ-3), Redirect zur Vorschlagsliste nach Erfolg
- `src/app/internal/requests/[id]/candidates/page.tsx` (PROJ-6): liest zusätzlich `personnel_requests.status` und bereits offene Vorschläge (`candidate_proposals` mit Status „vorgeschlagen") pro Kandidat, reicht beides an die Tabelle weiter, damit der Button korrekt aktiviert/deaktiviert wird
- `src/app/internal/requests/[id]/proposals/page.tsx` + `src/components/portal/proposals-table.tsx`: Vorschlagsliste je Anfrage mit Kandidat, Status-Badge, „vorgeschlagen von", Datum, Freigeben/Ablehnen/Zurückziehen (nur bei Status „vorgeschlagen")
- `src/app/internal/requests/[id]/page.tsx`: neuer Button „Vorschläge (N)" mit Live-Anzahl, verlinkt zur neuen Vorschlagsliste
- 10 neue Vitest-Tests für `proposals/actions.ts` (Berechtigung, Statusprüfung der Anfrage, Kandidat-Kontostatus, Duplikatsprüfung, erfolgreicher Vorschlag inkl. Aktivitätseintrag, Freigeben/Ablehnen inkl. Ablehnung bei bereits entschiedenem Vorschlag, Zurückziehen inkl. Ablehnung bei bereits entschiedenem Vorschlag)
- `npm test` (35/35), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: neue geschützte Route `/internal/requests/[id]/proposals` → 307-Redirect ohne Login

## QA Test Results

**Tested:** 2026-07-26
**App URL:** http://localhost:3000 (laufender Dev-Server, echtes Supabase-Projekt)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 35/35 grün (10 neue Tests für `proposals/actions.ts`)
- `npm run build`: erfolgreich
- E2E (`tests/PROJ-7-kandidatenvorschlag-interne-freigabe.spec.ts`): 2/2 grün (Chromium + Mobile Safari, nicht authentifizierter Zugriff → Redirect zu `/login`)

### Coverage-Lücke (dokumentiert, kein Bug)
Der eigentliche Vorschlags-Workflow (vorschlagen → freigeben/ablehnen → zurückziehen, Duplikat-/Statusprüfungen im Browser) konnte mangels aktivem `dafinex_admin`-Testkonto und echter Anfrage-/Kandidatendaten nicht per E2E gegen die echte Anwendung getestet werden (gleiche Einschränkung wie PROJ-2/3/4/5/6). Abgedeckt durch Vitest (gemockter Supabase-Client, alle Verzweigungen der drei Server Actions) + Code-Review.

### Acceptance Criteria Status
- [x] Vorschlagen nur bei Status „geprüft" (Vitest: Server Action lehnt bei „erstellt" ab; Code-Review: Button clientseitig zusätzlich deaktiviert mit Hinweistext)
- [x] Duplikat-Vorschlag (Status „vorgeschlagen") wird verhindert (Vitest + Code-Review: Button ausserdem clientseitig deaktiviert)
- [x] „Vorschläge (N)"-Zugang auf der Anfrage-Detailseite (Code-Review: Live-Count per `count: "exact", head: true`)
- [x] Vorschlagsliste zeigt Kandidat, Status-Badge, „vorgeschlagen von", Datum (Code-Review)
- [x] Freigeben/Ablehnen wechselt Status + Aktivitätseintrag (Vitest)
- [x] Zurückziehen entfernt offenen Vorschlag (Vitest)
- [x] Aktionen bei bereits entschiedenem Vorschlag deaktiviert/serverseitig abgelehnt (Vitest: „bereits entschieden"-Fehler; Code-Review: Buttons clientseitig zusätzlich deaktiviert mit Tooltip)
- [x] Rollen-Guard für `municipality`/`candidate` bei internen Aktionen (Vitest: `requireInternalRole()` lehnt ab; RLS als zweite Linie bestätigt, siehe Security Audit)
- [x] Leere Vorschlagsliste zeigt Hinweistext (Code-Review: `ProposalsTable` early return)

### Security Audit Results (Red Team)
- [x] Unauthentifizierter Zugriff → Redirect, keine Daten sichtbar (E2E bestätigt)
- [x] `municipality`/`candidate`-Rollen können `proposeCandidate`/`reviewProposal`/`withdrawProposal` nicht auslösen — `requireInternalRole()` prüft Rolle UND `account_status === 'active'` (Vitest bestätigt)
- [x] Kandidat mit nicht-aktivem verknüpftem Konto kann nicht vorgeschlagen werden, auch wenn der Aufruf die PROJ-6-Filterung umgeht (Vitest: separate serverseitige Prüfung in `proposeCandidate`, unabhängig von der UI-Liste)
- [x] Statuswechsel nur bei aktuellem Status „vorgeschlagen" möglich — verhindert nachträgliches Verändern einer bereits final entschiedenen Zeile über einen erneuten Server-Action-Aufruf (Vitest)
- [x] Alle drei Server Actions prüfen die Anzahl betroffener Zeilen nach Schreibvorgang statt nur auf `error` (Code-Review, gleiche Lehre wie PROJ-5) — verhindert, dass eine von RLS still blockierte Schreiboperation fälschlich als Erfolg gemeldet wird
- [ ] BUG-1 (Low): `candidate_proposals_insert_internal`/`_update_internal`/`_delete_internal` (RLS, aus PROJ-1) prüfen nur `is_internal_role()`, nicht zusätzlich `is_active()` — bei direktem API-Zugriff unter Umgehung der Server Action (die `account_status` sehr wohl prüft) könnte ein interner Account mit Status „pending" theoretisch schreiben. Kein neuer Fund dieser Spec, sondern ein geerbtes PROJ-1-RLS-Verhalten; praktisch nicht ausnutzbar, da interne Rollen nie per Selbstregistrierung entstehen (`handle_new_user` erlaubt nur `municipality`/`candidate`) und ein bestehender Dafinex-Admin die Rolle explizit vergeben muss

### Bugs Found

#### BUG-1: RLS auf `candidate_proposals` (Insert/Update/Delete) prüft keinen `account_status`
- **Severity:** Low
- **Steps to Reproduce:**
  1. Ein `dafinex_admin` setzt (hypothetisch, z.B. via SQL Editor) bei einem noch nicht aktivierten Profil die Rolle direkt auf `internal_coordinator`, ohne `account_status` auf `active` zu setzen
  2. Dieses Profil könnte per direktem PostgREST-Aufruf (unter Umgehung der App/Server Actions) einen Vorschlag anlegen/ändern/löschen, da `is_internal_role()` allein prüft
  3. Über die App selbst nicht erreichbar: `requireInternalRole()` in `proposals/actions.ts` prüft zusätzlich `account_status === 'active'`
- **Priority:** Nice to have — geerbtes PROJ-1-Verhalten (dort bewusst nur auf Policies angewendet, die Cross-Party-Daten exponieren), keine neue Lücke durch PROJ-7; könnte im selben Aufräum-Pass wie PROJ-1 BUG-5 behoben werden

### Summary
- **Acceptance Criteria:** Alle 9 Kriterien bestätigt (Server-Action-Logik per Vitest vollständig abgedeckt, UI-Verhalten per Code-Review)
- **Bugs Found:** 1 total (1 Low, geerbtes RLS-Verhalten aus PROJ-1, kein praktischer Angriffsweg über die App)
- **Security:** Keine Autorisierungslücke über die Anwendung selbst; Server Actions bilden eine vollständige zweite Verteidigungslinie zur RLS
- **Production Ready:** **YES** — keine offenen Critical/High/Medium-Bugs
- **Empfehlung:** BUG-1 zusammen mit PROJ-1 BUG-5 (Column-Level-Protection) in einem gemeinsamen RLS-Härtungs-Pass behandeln; sobald ein `dafinex_admin`-Testkonto existiert, den vollständigen Vorschlags-Lebenszyklus einmal end-to-end manuell verifizieren

## Deployment

Gemeinsam mit allen anderen P0/MVP-Features live deployed auf Vercel. Volle Deployment-Details (Produktions-URL, Env Vars, Post-Deployment-Test, Pre-Deployment-Fixes) siehe [PROJ-1](PROJ-1-supabase-infrastructure-setup.md#deployment).
