# PROJ-8: Gemeinde-Interview & Annahme

## Status: Planned
**Created:** 2026-07-26

## Dependencies
- Requires: PROJ-7 (Kandidatenvorschlag & interne Freigabe) — nur intern freigegebene (`approved`) Vorschläge sind für die Gemeinde relevant

## User Stories
- Als `municipality`-Nutzer möchte ich die für meine Anfragen intern freigegebenen Kandidatenvorschläge sehen, damit ich weiss, wen Dafinex mir vorschlägt.
- Als `municipality`-Nutzer möchte ich einen freigegebenen Vorschlag annehmen oder ablehnen, damit meine Entscheidung nach dem (informellen, ausserhalb der Plattform stattfindenden) Interview dokumentiert ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich sehen, ob und wie die Gemeinde über einen freigegebenen Vorschlag entschieden hat, damit ich weiss, ob ein Einsatz vorbereitet werden kann.

## Out of Scope
- Terminplanung/Durchführung des eigentlichen Interviews (Video-Call, Kalenderintegration) — laut PROJ-1-Datenmodell-Kommentar ist das Interview für den P1-Piloten bewusst informell und ausserhalb der Plattform (Telefon/E-Mail)
- Automatische Einsatzerstellung nach Annahme — das ist PROJ-9 (Einsatzverwaltung)
- Benachrichtigung der Gemeinde bei Freigabe über den bestehenden einfachen Mechanismus hinaus (volles Trigger-System → PROJ-11)
- Sichtbarkeit für Kandidaten (ob/wie ein Kandidat seinen eigenen Vorschlagsstatus sieht) — nicht im PRD-Scope für P0, kann per `/refine` ergänzt werden
- Vorschläge, die noch nicht intern freigegeben sind (`proposed`) oder intern abgelehnt wurden (`rejected`) — bleiben für die Gemeinde unsichtbar (siehe Decision Log, schliesst eine in PROJ-7 bereits vorhandene RLS-Lücke)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein `municipality`-Nutzer öffnet eine eigene Anfrage, dann sieht er die Anzahl/den Zugang zu den für ihn sichtbaren Vorschlägen (nur „freigegeben" oder bereits entschieden, nicht „vorgeschlagen"/„intern abgelehnt")
- [ ] Angenommen ein `municipality`-Nutzer öffnet die Vorschlagsliste einer eigenen Anfrage, dann sieht er nur Vorschläge mit Status „freigegeben", „angenommen" oder „abgelehnt" (durch Gemeinde) — nicht intern noch offene oder intern abgelehnte Vorschläge
- [ ] Angenommen ein Vorschlag hat Status „freigegeben", wenn die Gemeinde ihn annimmt, dann wechselt der Status zu „von Gemeinde angenommen" und ein Aktivitätseintrag wird erstellt sowie der vorschlagende interne Nutzer benachrichtigt
- [ ] Angenommen ein Vorschlag hat Status „freigegeben", wenn die Gemeinde ihn ablehnt, dann wechselt der Status zu „von Gemeinde abgelehnt" und ein Aktivitätseintrag wird erstellt sowie der vorschlagende interne Nutzer benachrichtigt
- [ ] Angenommen ein Vorschlag hat bereits Status „von Gemeinde angenommen" oder „abgelehnt", dann sind Annehmen/Ablehnen-Aktionen deaktiviert (Entscheidung ist final)
- [ ] Angenommen ein interner Nutzer öffnet die Vorschlagsliste einer Anfrage (PROJ-7), dann sieht er auch den Entscheidungsstatus der Gemeinde, sobald diese entschieden hat
- [ ] Angenommen eine Vorschlagsliste (Gemeinde-Sicht) ist leer, wenn sie geöffnet wird, dann wird ein Hinweistext statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein Nutzer mit Rolle `dafinex_admin`/`internal_coordinator`/`candidate` versucht per direktem Aufruf, eine Annahme/Ablehnung für eine fremde Anfrage auszulösen, dann wird dies durch RLS und serverseitige Prüfung verhindert
- [ ] Angenommen ein `municipality`-Nutzer versucht per direktem Aufruf, über einen Vorschlag einer fremden Gemeinde zu entscheiden, dann wird dies durch RLS und serverseitige Prüfung verhindert

## Edge Cases
- Vorschlag wird zwischen Laden der Seite und Klick auf „annehmen" intern noch nicht freigegeben oder von einer anderen Aktion beeinflusst (sollte praktisch nicht vorkommen, da nur `approved` → `municipality_*` möglich ist) → serverseitige Statusprüfung verhindert falsche Übergänge
- Zwei Nutzer derselben Gemeinde entscheiden gleichzeitig über denselben Vorschlag → zweiter Versuch scheitert serverseitig (Status bereits final), Hinweis statt stiller Erfolg
- Anfrage hat mehrere freigegebene Vorschläge gleichzeitig → alle bleiben unabhängig voneinander entscheidbar; die Gemeinde kann grundsätzlich mehr als einen Vorschlag annehmen (Konfliktprüfung/Exklusivität ist nicht Teil dieser Spec, siehe Open Questions)
- Sehr viele Vorschläge zu einer Anfrage → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bei PROJ-4/6/7)

## Technical Requirements (optional)
- Security: Schreiboperationen (annehmen/ablehnen) ausschliesslich für `municipality`-Nutzer auf eigene Anfragen, serverseitig per Zod validiert, RLS als zweite Verteidigungslinie
- Neue RLS-Policies erforderlich (siehe Technical Decisions): PROJ-1/7 kennt bisher keine Gemeinde-seitige UPDATE-Berechtigung auf `candidate_proposals`, und die bestehende SELECT-Policy für Gemeinden filtert nicht nach Status
- Zugriff ausschliesslich über `/municipality/*`-Portal

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll das Annehmen eines Vorschlags automatisch andere offene Vorschläge zur selben Anfrage sperren/ablehnen (Exklusivität)? Aktuell nicht umgesetzt — mehrere angenommene Vorschläge pro Anfrage sind möglich (z.B. falls mehrere Stellen mit derselben Anfrage besetzt werden sollen); kann per `/refine` präzisiert werden, sobald PROJ-9 (Einsatzverwaltung) den nächsten Schritt definiert

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–7 vereinbart | 2026-07-26 |
| Nur Vorschläge mit Status „freigegeben" oder später (`municipality_accepted`/`municipality_declined`) sind für die Gemeinde sichtbar; „vorgeschlagen" und intern „abgelehnt" bleiben unsichtbar | Die interne Prüfung (PROJ-7) soll abgeschlossen sein, bevor die Gemeinde etwas sieht — verhindert, dass die Gemeinde von noch nicht geprüften oder intern verworfenen Kandidaten erfährt (schliesst eine bislang ungenutzte, aber vorhandene RLS-Lücke aus PROJ-1/7) | 2026-07-26 |
| Interview selbst findet offline statt (Telefon/E-Mail), die Plattform bildet nur die Entscheidung danach ab | Explizit so im PROJ-1-Datenmodell-Kommentar für den P1-Piloten angelegt („informal, for the P1 pilot") | 2026-07-26 |
| Entscheidung (annehmen/ablehnen) ist final, kein Rückgängig in P0 | Konsistent mit dem „final"-Muster aus PROJ-5 (geprüft) und PROJ-7 (freigegeben/abgelehnt) | 2026-07-26 |
| Keine Exklusivität zwischen mehreren angenommenen Vorschlägen derselben Anfrage | Würde eine Annahme über den Scope hinaus vorwegnehmen, wie PROJ-9 (Einsatzverwaltung) mit mehreren Annahmen umgehen soll; als offene Frage vermerkt | 2026-07-26 |
| Einfache In-App-Benachrichtigung an die vorschlagende interne Person bei Annahme/Ablehnung | Schliesst den in PROJ-7 bewusst offen gelassenen Kreis (dort: „keine Benachrichtigung, da noch keine Gemeinde-Sicht existiert"); konsistent mit dem in PROJ-5 etablierten Muster einfacher In-App-Benachrichtigungen | 2026-07-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Neue Migration erforderlich (kein Neubau der Tabelle) — ändert nur RLS auf dem bestehenden `candidate_proposals` | Zwei Lücken im bisherigen Schema: (1) Gemeinden hatten keine UPDATE-Berechtigung, (2) die bestehende SELECT-Policy filtert nicht nach Status und hätte auch „vorgeschlagen"/intern „abgelehnt" offengelegt | 2026-07-26 |
| `candidate_proposals_select` wird ersetzt: der Gemeinde-Zweig bekommt zusätzlich `and status not in ('proposed', 'rejected')`; der Kandidat-Zweig (`candidate_id = current_candidate_id()`) bleibt unverändert | Trennt bewusst die beiden Sichtbarkeits-Fragen — Kandidaten-Sichtbarkeit ist nicht Teil dieser Spec (siehe Out of Scope) und wird nicht mit-verschärft, um keine unbeabsichtigte Verhaltensänderung ausserhalb des Scopes einzuführen | 2026-07-26 |
| Neue Policy `candidate_proposals_update_municipality_decision`: `using` verlangt `status = 'approved'` + eigene Gemeinde, `with check` erlaubt nur den Zielwert `municipality_accepted`/`municipality_declined` + weiterhin eigene Gemeinde | Verhindert, dass eine Gemeinde einen Vorschlag in einen beliebigen Status setzt oder auf eine fremde Anfrage umbiegt; kombiniert sich per OR mit der bestehenden internen UPDATE-Policy | 2026-07-26 |
| Sowohl inkrementeller Patch (`20260726090000_municipality_proposal_decision.sql`) als auch Ergänzung in der kanonischen `20260725120000_init_schema.sql` | Gleiches Muster wie PROJ-5 (`20260725140000_municipality_request_policies.sql`) für bereits migrierte Umgebungen vs. Neuinstallationen | 2026-07-26 |
| `acceptProposal`/`declineProposal` prüfen serverseitig zusätzlich Rolle, Status „freigegeben" und Zugehörigkeit zur eigenen Gemeinde, und die Anzahl betroffener Zeilen nach dem Update | Gleiche Lehre wie PROJ-5/7: RLS-blockierte Schreibvorgänge liefern keinen Fehler, sondern betreffen still null Zeilen | 2026-07-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/municipality/requests/[id]/proposals/          — Vorschlagsliste einer eigenen Anfrage (Server Component)
  └── MunicipalityProposalsTable                   Kandidatenname, Fähigkeiten, Region, Verfügbarkeit,
                                                      Status-Badge, Annehmen/Ablehnen (nur bei "freigegeben")
  └── Empty State                                   "Noch keine freigegebenen Vorschläge" bei leerer Liste

Ergänzung auf /municipality/requests/[id]/: neuer Button "Vorschläge (N)" → verlinkt hierher
Ergänzung auf /internal/requests/[id]/proposals/ (PROJ-7): Status-Badges zeigen bereits "municipality_accepted"/"municipality_declined" (Labels waren dort vorsorglich schon angelegt), keine Code-Änderung nötig
```

### Data Model
Keine neue Tabelle. Nutzt `candidate_proposals` (Status-Übergang `approved` → `municipality_accepted`/`municipality_declined`), `personnel_requests` (Eigentümerprüfung), `candidates` (Anzeige), `profiles` (vorschlagende Person für die Benachrichtigung), `notifications`, `activity_log`. Zwei RLS-Änderungen wie oben beschrieben, sonst keine Schema-Änderung.

### Tech Decisions (Begründung)
- **Statusgefilterte Sichtbarkeit direkt in der RLS statt nur in der Abfrage** — eine rein anwendungsseitige Filterung liesse sich über einen direkten API-Aufruf umgehen; die Einschränkung gehört auf die gleiche Verteidigungsebene wie die übrige Autorisierung im Projekt.
- **`with check` beschränkt den Zielstatus explizit auf die zwei erlaubten Werte** — verhindert, dass eine Gemeinde einen Vorschlag z.B. zurück auf „vorgeschlagen" setzt oder sich selbst intern freigibt.
- **Anfragebezogene Route** (`/municipality/requests/[id]/proposals`) statt globaler Liste — konsistent mit dem in PROJ-6/7 etablierten Muster.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Table, Badge, AlertDialog, Button) aus PROJ-3/4/5/6/7.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- Neue Migration `supabase/migrations/20260726090000_municipality_proposal_decision.sql` (+ gleiche Policy-Änderungen bereits in `20260725120000_init_schema.sql` für Neuinstallationen ergänzt): `candidate_proposals_select` schränkt den Gemeinde-Zweig auf `status not in ('proposed', 'rejected')` ein; neue Policy `candidate_proposals_update_municipality_decision` erlaubt der eigenen Gemeinde ausschliesslich den Übergang `approved` → `municipality_accepted`/`municipality_declined`
- `supabase/README.md` um Hinweis auf die neue Migration ergänzt (inkl. der bisher dort fehlenden PROJ-5-Migration, die schon existierte aber nicht dokumentiert war)
- `src/app/municipality/requests/[id]/proposals/actions.ts`: `acceptProposal`/`declineProposal` — prüfen Rolle, Eigentum an der Anfrage (über `personnel_requests.municipality_id`) und Status „freigegeben", aktualisieren, prüfen betroffene Zeilenanzahl statt nur `error`, schreiben `activity_log`-Eintrag und benachrichtigen den vorschlagenden internen Nutzer (`proposed_by_id`)
- `src/app/municipality/requests/[id]/proposals/page.tsx` + `src/components/portal/municipality-proposals-table.tsx`: Vorschlagsliste (Gemeinde-Sicht) mit Kandidat, Fähigkeiten, Region, Verfügbarkeit, Status-Badge, Annehmen/Ablehnen (nur bei „freigegeben"); verlässt sich auf die RLS-Statusfilterung, keine zusätzliche Filterung nötig
- `src/app/municipality/requests/[id]/page.tsx`: neuer Button „Vorschläge (N)" mit Live-Anzahl
- Internes `ProposalsTable` (PROJ-7) zeigt die Gemeinde-Entscheidung automatisch mit, da die Status-Labels für `municipality_accepted`/`municipality_declined` dort bereits vorsorglich angelegt waren — keine Änderung nötig
- 4 neue Vitest-Tests für `municipality/requests/[id]/proposals/actions.ts` (Berechtigung, fremde Gemeinde, falscher Status, erfolgreiche Annahme inkl. Aktivitätseintrag + Benachrichtigung, Ablehnung)
- `npm test` (40/40), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: neue geschützte Route `/municipality/requests/[id]/proposals` → 307-Redirect ohne Login

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
