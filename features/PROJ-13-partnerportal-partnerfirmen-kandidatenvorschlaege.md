# PROJ-13: Partnerportal + Partnerfirmen-Kandidatenvorschläge

## Status: Architected
**Created:** 2026-08-04
**Last Updated:** 2026-08-04 (Tech Design ergänzt — siehe Abschnitt "Tech Design (Solution Architect)")

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
| Neue Tabelle `partner_companies` (Name, Adresse, Kontaktperson, Kontakt-E-Mail, Kontakt-Telefon), Spaltenaufbau identisch zu `municipalities` | Bewährtes, bereits produktiv genutztes Muster 1:1 wiederverwendet, keine neue Modellierungsentscheidung nötig | 2026-08-04 |
| `profiles.partner_company_id` (nullable, FK auf `partner_companies`), analog zu `profiles.municipality_id` | Gleiches Verknüpfungsmuster wie bei Gemeinde-Nutzern; ein Profil hat höchstens eine der beiden Verknüpfungen, nie beide | 2026-08-04 |
| `candidates.partner_company_id` (nullable, FK auf `partner_companies`), gesetzt genau dann, wenn `source_type = 'partner'` | Nutzt das bereits vorhandene, bisher ungenutzte `source_type`-Feld aus PROJ-1 wie ursprünglich vorgesehen; Dafinex-eigene Kandidaten (`source_type = 'dafinex'`) bleiben mit `partner_company_id = null` unverändert | 2026-08-04 |
| `personnel_requests.visible_to_partners boolean not null default false` | Einfachste Modellierung für „ist diese Anfrage extern sichtbar" — additive Spalte, keine Migration bestehender Daten nötig (Standard `false` erhält das bisherige Verhalten für alle existierenden Anfragen) | 2026-08-04 |
| Neue RLS-Policies für `partner_companies`/`candidates`/`personnel_requests` folgen der Struktur der bestehenden Gemeinde-Policies (`is_internal_role() or <eigene-Zuordnung>`); neue `current_partner_company_id()`-SECURITY-DEFINER-Funktion analog zu `current_municipality_id()` | Konsistenz mit dem bereits etablierten RLS-Muster; eine neue, einfache SECURITY-DEFINER-Funktion nach exakt demselben Vorbild wie die drei bereits bestehenden (`current_municipality_id`, `current_candidate_id`, `current_role`) | 2026-08-04 |
| **`candidate_proposals_select` bekommt einen neuen Zweig**: `candidate_id in (select id from candidates where partner_company_id = current_partner_company_id())` — eine Partnerfirma sieht damit ausschliesslich Vorschläge für ihre eigenen Kandidaten, nie Vorschläge anderer Partnerfirmen oder interne Vorschläge für dieselbe Anfrage | Ohne diesen expliziten Zweig hätte eine Partnerfirma über die bestehenden Policies gar keinen Zugriff (weder `is_internal_role()` noch `candidate_id = current_candidate_id()` noch der Gemeinde-Zweig passen); die Formulierung ist bewusst identisch zum bereits bestehenden `candidate_id = current_candidate_id()`-Muster, nur auf Firmen- statt Personen-Ebene — verhindert insbesondere, dass eine Partnerfirma konkurrierende Vorschläge (eigene wie fremde) für dieselbe Anfrage einsehen kann | 2026-08-04 |
| **Neue `candidate_proposals_insert_partner`-Policy**: `current_role() = 'partner_company' AND candidate_id in (eigene Kandidaten) AND request_id in (select id from personnel_requests where visible_to_partners = true)` | Ergänzt die bestehende `candidate_proposals_insert_internal`-Policy um einen zweiten, gleichwertigen Erstell-Weg — verhindert sowohl das Vorschlagen fremder Kandidaten als auch das Vorschlagen für nicht freigegebene Anfragen direkt auf Datenbankebene, nicht nur in der Oberfläche | 2026-08-04 |
| **Neue `candidates_select_own_partner`-Policy** (zusätzlich zum bestehenden `is_internal_role()`-Zweig): `partner_company_id = current_partner_company_id()` — spiegelbildlich dazu auch `candidates_update_own_partner` (nur eigene Kandidaten bearbeitbar) und `candidates_insert_partner` (`current_role() = 'partner_company'` und `partner_company_id = current_partner_company_id()` und `source_type = 'partner'` erzwungen) | Gleiches Muster wie die bereits bestehende `candidates_update`-Policy (`is_internal_role() or id = current_candidate_id()`), nur auf Firmen-Ebene; verhindert, dass eine Partnerfirma einen Kandidaten mit `source_type = 'dafinex'` oder der `partner_company_id` einer anderen Firma anlegt | 2026-08-04 |
| **`personnel_requests_select` bekommt einen neuen Zweig**: `visible_to_partners = true AND current_role() = 'partner_company'` (ohne den `municipality`-Join in der Partnerportal-Abfrage selbst, siehe Zeile oben) | Setzt die Sichtbarkeits-Freigabe direkt auf Datenbank-Ebene durch, nicht nur als Oberflächen-Filter — eine Partnerfirma kann eine nicht freigegebene Anfrage auch über einen direkten API-Aufruf nicht einsehen | 2026-08-04 |
| Partnerfirmen-Konto-Erstellung nutzt denselben internen „Profil + Rolle direkt anlegen"-Servercode-Pfad, der für interne Gemeinde-Konten bereits existiert (kein `auth.signUp`, keine E-Mail-Bestätigung) | Konto entsteht nie über die abgesicherte Selbstregistrierung; internes Personal legt Profil und Zuordnung direkt und sofort aktiv an, exakt wie bereits für andere intern erstellte Konten etabliert | 2026-08-04 |
| Partnerfirmen-Ansicht der freigegebenen Anfragen fragt `personnel_requests` ohne den `municipality`-Join ab (bzw. blendet ihn in der Antwort explizit aus) | Setzt die Produktentscheidung „kein Gemeinde-Name sichtbar" technisch um — die Daten sind serverseitig nie Teil der an das Partnerportal ausgelieferten Antwort, nicht nur clientseitig ausgeblendet | 2026-08-04 |
| Benachrichtigung an die Partnerfirma bei Freigabe-Entscheidung (intern) und bei Gemeinde-Entscheidung nutzt die bestehende `notifications`-Infrastruktur (PROJ-11/17/18), `recipient_id` zeigt auf den vorschlagenden Partnerfirmen-Nutzer (bereits über `proposed_by_id` bekannt) | Keine neue Benachrichtigungs-Mechanik nötig, reine Wiederverwendung bereits vorhandener Trigger-Punkte in `reviewProposal`/`acceptProposal`/`declineProposal` | 2026-08-04 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
Partnerfirmen-Verwaltung (neu, intern: /internal/partners)
├── Liste aller Partnerfirmen (analog /internal/municipalities)
│     └── "Neue Partnerfirma"-Dialog (Name/Kontaktdaten + erstes Nutzerkonto)
└── Partnerfirma-Detailseite
      └── Verknüpfte Nutzerkonten (analog Gemeinde-Detailseite)

Bestehende Anfrage-Detailseite (/internal/requests/[id])
└── Neuer Schalter „Für Partnerfirmen freigeben" (An/Aus)

Bestehende interne Vorschlagsliste (/internal/requests/[id]/proposals)
└── zeigt Partnervorschläge gleichberechtigt neben internen Vorschlägen,
      mit Kennzeichnung „von Partnerfirma X"

Partnerportal (erweitert die PROJ-19-Platzhalterseite um zwei neue Bereiche)
├── Dashboard (bleibt vorerst der bestehende Platzhalter aus PROJ-19)
├── Kandidaten (neu, analog /internal/candidates, aber auf die eigene Firma beschränkt)
│     ├── Liste eigener Kandidaten
│     └── „Neuer Kandidat"-Dialog (Vorname/Nachname/Fähigkeiten/Region/Verfügbarkeit)
└── Anfragen (neu)
      ├── Liste freigegebener Anfragen (Titel/Fähigkeiten/Region/Zeitraum/Pensum,
      │     ohne Gemeinde-Name)
      └── „Kandidat vorschlagen"-Dialog pro Anfrage (Auswahl aus eigenen Kandidaten)
```

### B) Data Model (plain language)

**Neue Partnerfirma** (eine neue Tabelle, exakt nach dem bestehenden Gemeinde-Muster):
- Name, Adresse, Kontaktperson, Kontakt-E-Mail, Kontakt-Telefon

**Bestehendes Profil** bekommt eine neue, optionale Verknüpfung zur eigenen Partnerfirma — analog zur bereits bestehenden Gemeinde-Verknüpfung, nur für `partner_company`-Nutzer gesetzt.

**Bestehender Kandidat**: das bereits vorhandene, bisher ungenutzte Feld `source_type: partner` kommt jetzt tatsächlich zum Einsatz; dazu eine neue, optionale Verknüpfung zur besitzenden Partnerfirma (nur gesetzt, wenn `source_type = partner`).

**Bestehende Personalanfrage**: ein neues Feld „für Partnerfirmen freigegeben?" (ja/nein, Standard: nein).

**Bestehender Kandidatenvorschlag**: keine neuen Felder nötig — die bereits vorhandene „wer hat vorgeschlagen"-Verknüpfung zeigt jetzt auch auf Partnerfirmen-Nutzer, der komplette bestehende Status-Ablauf (PROJ-7/8) bleibt unverändert.

### C) Tech Decisions (justified for PM)

1. **Partnerfirma als eigene Tabelle, exaktes Abbild des bereits bewährten Gemeinde-Musters** — kein neues Konzept, volle Wiederverwendung von etwas, das im Projekt schon funktioniert.
2. **Kandidat bekommt nur eine neue, optionale Verknüpfung zur Partnerfirma** — Dafinex-eigene Kandidaten bleiben davon komplett unberührt, keine Änderung an ihrem bestehenden Verhalten.
3. **Ein einfacher Ja/Nein-Freigabe-Schalter direkt auf der Anfrage**, keine eigene Freigabe-Tabelle — reicht vollständig aus, um zu steuern, was extern sichtbar ist.
4. **Vollständige Wiederverwendung des bestehenden Vorschlags-/Freigabe-Ablaufs (PROJ-7/8) ohne jede Schema-Änderung** — ein Partnervorschlag ist technisch identisch zu einem internen Vorschlag, nur die Rolle des vorschlagenden Nutzers unterscheidet sich. Die komplette bestehende Qualitätskontrolle (interne Prüfung vor Gemeinde-Sichtbarkeit) greift automatisch, ohne Zusatzaufwand.
5. **Zugriffsbeschränkung nach demselben Muster wie bei Gemeinden**: eine Partnerfirma sieht ausschliesslich ihre eigenen Kandidaten und ausschliesslich freigegebene Anfragen — dieselbe Art Datenbank-Regel, die für Gemeinden bereits zuverlässig funktioniert.
6. **Die freigegebenen Anfragen werden für Partnerfirmen bewusst ohne die Gemeinde-Verknüpfung abgefragt** — die Ansicht zeigt nur die Kriterien-Felder, nie den Gemeinde-Namen.
7. **Kein neuer Registrierungsweg**: Partnerfirmen-Konten entstehen über denselben internen „Konto direkt anlegen"-Mechanismus, der für Gemeinden schon existiert — die bestehende, bewusst eingeschränkte Selbstregistrierung bleibt komplett unangetastet.

### D) Dependencies (packages to install)
- Keine neuen Pakete.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
