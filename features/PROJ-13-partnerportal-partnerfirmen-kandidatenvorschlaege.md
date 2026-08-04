# PROJ-13: Partnerportal + Partnerfirmen-Kandidatenvorschläge

## Status: Planned
**Created:** 2026-08-04
**Last Updated:** 2026-08-04

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — `user_role` enthält bereits `partner_company`, `candidate_source_type` bereits `partner` (bisher unbenutzt, für genau diese Spec vorgesehen)
- Requires: PROJ-2 (Auth & Portal-Grundgerüst) — Rollenprüfung/Portal-Shell-Muster
- Requires: PROJ-3 (Gemeindenverwaltung) — Vorbild für die Partnerfirmen-Entität (Name/Kontaktdaten, intern angelegt)
- Requires: PROJ-4 (Kandidatenverwaltung) — Vorbild für die partnerfirmen-eigene Kandidatenverwaltung
- Requires: PROJ-5 (Personalanfrage-Workflow) — Anfragen, die für Partnerfirmen freigegeben werden können
- Requires: PROJ-7 (Kandidatenvorschlag & interne Freigabe) — Partnerfirmen-Vorschläge durchlaufen exakt dasselbe Freigabe-Gate
- Requires: PROJ-19 (Vollständige Dashboards) — ersetzt/erweitert die dort geschaffene Partnerfirmen-Platzhalterseite (`/partner/dashboard`, `partner_company`-Layout-Rollenprüfung)
- Enables: spätere Ausbauschritte für Nachrichten (PROJ-17-artig), Dokumente (PROJ-16-artig) und ein volles Dashboard (PROJ-19-artig) im Partnerportal

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine neue Partnerfirma mit ihrem ersten Nutzerkonto anlegen können, damit die Firma sich sofort einloggen kann.
- Als `partner_company`-Nutzer möchte ich meine eigenen Kandidaten verwalten können, damit ich sie für passende Anfragen vorschlagen kann.
- Als `partner_company`-Nutzer möchte ich sehen, für welche Personalanfragen ich einen Kandidaten vorschlagen darf, damit ich weiss, wo ich aktiv werden kann.
- Als `partner_company`-Nutzer möchte ich einen eigenen Kandidaten für eine freigegebene Anfrage vorschlagen können, damit mein Kandidatenpool eine Chance auf Vermittlung hat.
- Als `dafinex_admin`/`internal_coordinator` möchte ich entscheiden können, welche Anfragen für Partnerfirmen sichtbar sind, damit ich die Kontrolle darüber behalte, was extern bekannt wird.
- Als `dafinex_admin`/`internal_coordinator` möchte ich Partnervorschläge genau wie interne Vorschläge prüfen und freigeben, damit die Qualitätskontrolle gegenüber der Gemeinde erhalten bleibt.
- Als `partner_company`-Nutzer möchte ich erfahren, wie über meinen Vorschlag entschieden wurde, damit ich den Status meiner Kandidaten nachverfolgen kann.

## Out of Scope
- **Nachrichten, Dokumente, volles Dashboard fürs Partnerportal** (PROJ-17-/PROJ-16-/PROJ-19-artige Funktionen) — bewusst kleinerer Scope für diese Spec, spätere eigenständige Erweiterungen; die PROJ-19-Platzhalterseite bleibt bis dahin bestehen
- **Selbstregistrierung für Partnerfirmen** — `handle_new_user` bleibt unverändert (erlaubt weiterhin ausschliesslich `municipality`/`candidate`); Partnerfirmen-Konten werden ausschliesslich von internem Personal angelegt, ohne Änderung an dieser bewusst abgesicherten Auth-Logik
- **Sichtbarkeit des Gemeinde-Namens für Partnerfirmen** — Partnerfirmen sehen nur Anfrage-Kriterien (Titel/Fähigkeiten/Region/Zeitraum/Pensum), nicht welche konkrete Gemeinde dahintersteht
- **Partnervorschläge ohne internes Freigabe-Gate** — nutzt das bestehende PROJ-7-Freigabe-Muster unverändert, kein direkter Weg an Dafinex vorbei
- **Partner-Kandidaten mit eigenem Portal-Konto/Selbstverwaltung** (PROJ-20-artige Funktionen) — Partner-Kandidaten haben in dieser Spec kein eigenes Login, werden ausschliesslich von der Partnerfirma verwaltet (analog zu intern erfassten Dafinex-Kandidaten ohne Konto)
- **Automatisches Zurückziehen von Vorschlägen bei Widerruf der Partner-Freigabe einer Anfrage** — bleibt eine manuelle interne Aktion
- **Mehrstufige/differenzierte Partnerfirmen-Berechtigungen** (z.B. verschiedene Rollen innerhalb einer Partnerfirma) — alle `partner_company`-Nutzer einer Firma haben dieselben Rechte, analog zum bestehenden Gemeinde-Modell
- **Partnerfirmen-Onboarding-Self-Service-Formular** — Firma und erstes Konto werden vollständig intern angelegt

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion], dann [Ergebnis]

### Partnerfirmen-Verwaltung (intern)
- [ ] Angenommen internes Personal öffnet die Partnerfirmen-Verwaltung, wenn es eine neue Partnerfirma mit Name und Kontaktdaten sowie einem ersten Nutzerkonto (E-Mail) anlegt, dann kann sich dieser Nutzer sofort einloggen (kein Freischaltungs-Workflow, da nicht selbst registriert)
- [ ] Angenommen internes Personal öffnet die Liste der Partnerfirmen, dann sieht es alle bestehenden Partnerfirmen mit Basisdaten

### Portal-Zugriff (Partnerfirma)
- [ ] Angenommen ein `partner_company`-Nutzer loggt sich ein, dann landet er in seinem eigenen Portal mit eigener Navigation (Dashboard, Kandidaten, Anfragen)
- [ ] Angenommen eine andere Rolle versucht, auf das Partnerportal zuzugreifen, dann wird sie auf ihr eigenes Portal umgeleitet (bestehendes Muster aus PROJ-2/19)

### Kandidatenverwaltung (Partnerfirma)
- [ ] Angenommen ein `partner_company`-Nutzer öffnet seine Kandidatenliste, dann sieht er ausschliesslich die Kandidaten der eigenen Partnerfirma
- [ ] Angenommen ein `partner_company`-Nutzer legt einen neuen Kandidaten an (Vorname, Nachname, Fähigkeiten, Region, Verfügbarkeit), dann wird dieser automatisch mit `source_type: partner` und der eigenen Partnerfirma verknüpft
- [ ] Angenommen ein `partner_company`-Nutzer versucht, einen Kandidaten einer anderen Partnerfirma oder einen Dafinex-eigenen Kandidaten einzusehen oder zu bearbeiten, dann wird der Zugriff verweigert
- [ ] Angenommen internes Personal öffnet einen Partner-Kandidaten, dann kann es ihn wie jeden anderen Kandidaten in der bestehenden internen Kandidatenverwaltung einsehen

### Freigabe von Anfragen für Partnerfirmen (intern)
- [ ] Angenommen internes Personal öffnet eine geprüfte Anfrage, dann kann es sie explizit „für Partnerfirmen freigeben" bzw. die Freigabe wieder zurückziehen
- [ ] Angenommen eine Anfrage ist nicht (mehr) für Partnerfirmen freigegeben, dann erscheint sie in keinem Partnerportal

### Kandidatenvorschlag durch Partnerfirma
- [ ] Angenommen ein `partner_company`-Nutzer öffnet die Liste freigegebener Anfragen, dann sieht er Titel, benötigte Fähigkeiten, Region, Zeitraum und Pensum, aber nicht den Namen der Gemeinde
- [ ] Angenommen ein `partner_company`-Nutzer schlägt einen eigenen Kandidaten für eine freigegebene Anfrage vor, dann entsteht ein Vorschlag im Status „proposed", identisch zum bestehenden internen Vorschlagsprozess (PROJ-7)
- [ ] Angenommen derselbe Kandidat wurde für dieselbe Anfrage bereits vorgeschlagen und wartet noch auf Entscheidung, dann wird ein erneuter Vorschlag abgelehnt (bestehende Regel aus PROJ-7 gilt unverändert)
- [ ] Angenommen internes Personal genehmigt oder lehnt einen Partner-Vorschlag ab, dann wird die vorschlagende Partnerfirma benachrichtigt
- [ ] Angenommen die Gemeinde nimmt einen ursprünglich von einer Partnerfirma stammenden Vorschlag an oder lehnt ihn ab, dann wird die Partnerfirma zusätzlich zur bestehenden internen Benachrichtigung ebenfalls benachrichtigt
- [ ] Angenommen ein `partner_company`-Nutzer versucht, einen Vorschlag für eine nicht freigegebene oder für eine fremde (nicht existierende sichtbare) Anfrage zu erstellen, dann wird das verweigert

## Edge Cases
- Anfrage wird nach der Freigabe für Partner wieder zurückgezogen → verschwindet aus der Partneransicht; bereits eingereichte Vorschläge dazu bleiben unverändert im bestehenden Freigabe-Prozess
- Partnerfirma hat noch keine eigenen Kandidaten → leerer Zustand mit Hinweistext, kein Vorschlag möglich
- Keine Anfragen für Partnerfirmen freigegeben → leerer Zustand mit Hinweistext
- Partnerfirma wird vollständig deaktiviert (alle zugehörigen Konten inaktiv) → bereits laufende/angenommene Einsätze bleiben unberührt, nur keine neuen Vorschläge mehr möglich
- Zwei Partnerfirmen schlagen unabhängig voneinander denselben (fiktiv identischen) Kandidaten für dieselbe Anfrage vor → nicht möglich, da jeder Kandidat einer einzigen Partnerfirma gehört, keine Kandidat-Überschneidung zwischen Firmen
- Internes Personal lehnt einen Partnervorschlag ab → Partnerfirma kann für dieselbe Anfrage später einen anderen eigenen Kandidaten erneut vorschlagen (keine Sperre über die Anfrage hinweg)

## Technical Requirements (optional)
- Security: `partner_company`-Zugriff strikt auf die eigene Partnerfirma beschränkt (RLS), analog zum bestehenden Gemeinde-/Kandidaten-Muster; keine Änderung an der bestehenden Selbstregistrierungs-Sperre für diese Rolle
- Bestehende `candidate_proposals`/`personnel_requests`-Workflows (PROJ-7/8) werden erweitert, nicht dupliziert

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PRD-Non-Goal "Kein Partnerportal (Phase 1)" wird für diese Spec bewusst aufgehoben | Explizite Nutzeranweisung; PROJ-19 hat mit der Partnerfirmen-Platzhalterseite bereits bewusst den Platz dafür vorgesehen | 2026-08-04 |
| Partnerfirma ist eine eigene Entität, analog zur Gemeinde (Name/Kontaktdaten, eigene Portal-Nutzer, eigener Kandidatenpool) | Spiegelt das bereits etablierte, bewährte Gemeinde-Muster; `user_role.partner_company` und `candidate_source_type.partner` sind im Schema bereits für genau dieses Modell vorbereitet | 2026-08-04 |
| Partnervorschläge durchlaufen dasselbe interne Freigabe-Gate wie interne Vorschläge (PROJ-7) | Erhält Dafinex' Qualitätskontrolle gegenüber der Gemeinde; keine neue Statuslogik nötig, volle Wiederverwendung von `candidate_proposals` | 2026-08-04 |
| Partnerfirmen-Konten werden ausschliesslich intern angelegt, keine Selbstregistrierung | `handle_new_user` sperrt Rollen-Eskalation bewusst seit PROJ-1; diese sicherheitsrelevante Entscheidung bleibt unangetastet | 2026-08-04 |
| Nur explizit von intern freigegebene Anfragen sind für Partnerfirmen sichtbar, nicht automatisch alle geprüften Anfragen | Dafinex/die Gemeinde behalten die Kontrolle darüber, welche Anfragen extern bekannt werden — passend zum Pilot mit genau einer Gemeinde | 2026-08-04 |
| Partnerfirmen sehen bei einer freigegebenen Anfrage nur die Kriterien, nicht den Gemeinde-Namen | Datensparsamkeit gegenüber einem externen Dritten, bis ein Vorschlag intern freigegeben ist | 2026-08-04 |
| Scope beschränkt auf Portal-Grundgerüst + Kandidatenverwaltung + Kandidatenvorschlag, ohne Nachrichten/Dokumente/volles Dashboard | Konsistent mit der bisherigen Aufteilung des Projekts in kleine, unabhängig testbare Einheiten; diese drei Bereiche wären für eine Partnerfirma ohnehin spätere, eigenständige Erweiterungen | 2026-08-04 |
| Partnerfirmen-Kandidaten haben kein eigenes Portal-Konto in dieser Spec | Analog zu intern erfassten Dafinex-Kandidaten ohne Login; ein Partner-Kandidaten-Portal wäre ein eigener, deutlich grösserer Ausbauschritt | 2026-08-04 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
