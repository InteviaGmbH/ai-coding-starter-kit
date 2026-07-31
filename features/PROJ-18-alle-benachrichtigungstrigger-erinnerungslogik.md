# PROJ-18: Alle Benachrichtigungstrigger + Erinnerungslogik

## Status: Planned
**Created:** 2026-07-31
**Last Updated:** 2026-07-31

## Dependencies
- Requires: PROJ-11 (Kern-Benachrichtigungen) — bestehende `notifications`-Tabelle, Glocke, `/notifications`-Seite (PROJ-17)
- Requires: PROJ-9 (Einsatzverwaltung) — Einsatz-Statusverlauf (proposed/accepted/active/completed), Basis für die neuen Einsatz-Trigger
- Requires: PROJ-10 (Vertragsgenerierung) — Vertragsstatus (generated/signed), Basis für den neuen „Vertrag unterschrieben"-Trigger
- Requires: PROJ-16 (Vollständiges Dokumentenmanagement) — `candidate_document_versions.expiry_date`, Basis für die Ablauf-Erinnerung; PROJ-16 hat diese Abhängigkeit bereits explizit als „Enables: PROJ-18" dokumentiert
- Requires: PROJ-20 (Kandidatenportal-Selbstverwaltung) — Kandidat hat inzwischen ein eigenes Portal und damit ein berechtigtes Interesse an Einsatz-/Vertrags-Benachrichtigungen, die PROJ-11 noch nicht vorsehen konnte

## User Stories
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, wenn mein Einsatz von „akzeptiert" zu „aktiv" zu „abgeschlossen" wechselt, damit ich den Fortschritt verfolgen kann, ohne die Seite manuell zu prüfen.
- Als `candidate` möchte ich bei denselben Statuswechseln meines eigenen Einsatzes benachrichtigt werden, damit ich genauso informiert bin wie die Gemeinde.
- Als `municipality`-/`candidate`-Nutzer möchte ich benachrichtigt werden, sobald die unterschriebene Vertragsversion verfügbar ist, damit ich weiss, dass der Prozess formal abgeschlossen ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich automatisch erinnert werden, wenn ein Kandidaten-Dokument bald abläuft oder bereits abgelaufen ist, damit ich rechtzeitig nachfassen kann, ohne jede Kandidatenseite manuell durchzuklicken.
- Als `dafinex_admin`/`internal_coordinator` möchte ich für dasselbe abgelaufene/bald ablaufende Dokument nicht wiederholt dieselbe Erinnerung erhalten, damit die Benachrichtigungsliste nicht zugespamt wird.

## Out of Scope
- **Echte zeitgesteuerte/geplante Erinnerungen (Cron-Job)** — es gibt noch keine Scheduled-Job-Infrastruktur in diesem Projekt (kein Vercel Cron, kein Supabase pg_cron); alle Erinnerungen in dieser Spec sind ereignisbasiert (ausgelöst beim Öffnen einer Seite durch internes Personal), nicht proaktiv ohne Seitenaufruf. Ein echter Cron-Job wäre ein deutlich grösserer, eigenständiger Infrastruktur-Baustein und angesichts der Zeitknappheit vor der Kunden-Präsentation bewusst zurückgestellt.
- **Erinnerungen bei "liegengebliebenen" Anfragen/Vorschlägen ohne Reaktion** (z.B. "Anfrage seit 5 Tagen ungeprüft", "Vorschlag seit 3 Tagen ohne Gemeinde-Entscheidung") — reine zeitbasierte Eskalation, die ohne Cron-Infrastruktur nur ungenau über Seitenaufrufe angenähert werden könnte; bewusst zurückgestellt für einen späteren Ausbauschritt, sobald eine Scheduled-Job-Lösung existiert
- **E-Mail-/Push-Benachrichtigungen** — bleibt ausschliesslich In-App (`notifications`-Tabelle), unverändert aus PROJ-11
- **Benachrichtigung bei intern abgelehntem Vorschlag** (`reviewProposal` mit `decision: "rejected"`) — die Gemeinde hat den Vorschlag nie gesehen (laut PROJ-8-RLS erst ab „approved" sichtbar), eine Ablehnungs-Benachrichtigung an sie wäre nutzlos/verwirrend; unverändert aus PROJ-11
- **Benachrichtigungs-Einstellungen/Präferenzen pro Nutzer** — nicht im PRD-Scope für den Piloten (unverändert aus PROJ-11)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion], dann [Ergebnis]

### Einsatz-Statuswechsel (Gemeinde + Kandidat)
- [ ] Angenommen ein Einsatz wechselt zu „akzeptiert", dann erhalten sowohl die erstellende Person der zugehörigen Anfrage (Gemeinde) als auch der zugehörige Kandidat je eine Benachrichtigung „Einsatz akzeptiert"
- [ ] Angenommen ein Einsatz wechselt zu „aktiv", dann erhalten beide Parteien je eine Benachrichtigung „Einsatz aktiv" (ersetzt/erweitert den bisherigen, nur an die Gemeinde gerichteten PROJ-11-Trigger um den Kandidaten als zweiten Empfänger)
- [ ] Angenommen ein Einsatz wechselt zu „abgeschlossen", dann erhalten beide Parteien je eine Benachrichtigung „Einsatz abgeschlossen"
- [ ] Angenommen der zugehörige Kandidat hat kein eigenes Portal-Konto (kein `profile_id`), dann wird die Benachrichtigung an ihn übersprungen, ohne Fehler — die Gemeinde erhält ihre Benachrichtigung trotzdem

### Vertrag unterschrieben (Gemeinde + Kandidat)
- [ ] Angenommen intern lädt die unterschriebene Vertragsversion hoch (Status wechselt zu „signed"), dann erhalten sowohl die Gemeinde als auch der zugehörige Kandidat je eine Benachrichtigung „Vertrag unterschrieben"
- [ ] Angenommen der zugehörige Kandidat hat kein eigenes Portal-Konto, dann wird seine Benachrichtigung übersprungen, ohne Fehler

### Ablauf-Erinnerung für Kandidaten-Dokumente
- [ ] Angenommen internes Personal öffnet die Detailseite eines Kandidaten (`/internal/candidates/[id]`), wenn ein Dokument dieses Kandidaten dabei erstmals in den Status „Läuft bald ab" oder „Abgelaufen" fällt, dann erhalten alle aktiven internen Nutzer je eine Benachrichtigung mit Kandidat, Dokumenttyp und Ablaufdatum
- [ ] Angenommen für dieselbe Dokument-Version wurde bereits eine „Läuft bald ab"-Erinnerung gesendet, dann wird beim erneuten Öffnen derselben Seite keine weitere „Läuft bald ab"-Erinnerung für dieselbe Version ausgelöst
- [ ] Angenommen eine Dokument-Version wurde bereits als „Läuft bald ab" gemeldet und läuft nun tatsächlich ab, dann wird zusätzlich einmalig eine separate „Abgelaufen"-Erinnerung ausgelöst (die beiden Status lösen je maximal eine Erinnerung pro Version aus, nicht dieselbe)
- [ ] Angenommen ein Dokument wird durch eine neue Version ersetzt, dann kann die neue Version unabhängig wieder eine eigene Erinnerung auslösen, falls sie ihrerseits ein Ablaufdatum hat

### Bestehende Benachrichtigungsseite (PROJ-17)
- [ ] Angenommen die neuen Benachrichtigungstypen werden erzeugt, dann erscheinen sie auf `/notifications` mit einer verständlichen deutschen Typ-Bezeichnung, nicht dem generischen Fallback

## Edge Cases
- Einsatz-Statuswechsel, aber die erstellende Person der Anfrage existiert nicht mehr (`created_by_id` ist `null`) → Benachrichtigung an die Gemeinde wird übersprungen, kein Fehler (analog zu bestehenden Triggern)
- Kandidat eines Einsatzes hat kein Portal-Konto → wie oben, Benachrichtigung an ihn wird übersprungen
- Mehrere Dokumente desselben Kandidaten laufen gleichzeitig ab → je Dokument-Version eine eigene Erinnerung, keine gebündelte Nachricht nötig
- Internes Personal öffnet eine Kandidatenseite, aber aktuell gibt es keine aktiven internen Nutzer (sollte praktisch nicht vorkommen, Person selbst ist ja gerade aktiv) → Erinnerung wird trotzdem erzeugt für alle, die zum Zeitpunkt aktiv sind; keine rückwirkende Zustellung an später aktivierte Nutzer
- Ablaufdatum liegt exakt am Tag des Seitenaufrufs → gilt als „Läuft bald ab", nicht als „Abgelaufen" (konsistent mit der bestehenden `getExpiryStatus`-Logik aus PROJ-16)
- Dieselbe Kandidatenseite wird von zwei internen Nutzern gleichzeitig geöffnet, während ein Dokument gerade erstmals in den Warnbereich fällt → beide Aufrufe könnten theoretisch gleichzeitig prüfen, ob schon erinnert wurde; eine doppelte Erinnerung im seltenen Gleichzeitigkeitsfall ist ein akzeptables, rein kosmetisches Risiko (kein Datenverlust, kein Sicherheitsproblem), kein zusätzlicher Sperrmechanismus für den Piloten nötig

## Technical Requirements (optional)
- Security: Neue Trigger-Logik läuft ausschliesslich in bereits bestehenden, rollenbasiert geschützten Server-Codepfaden (internen Server Actions bzw. dem serverseitigen Laden von `/internal/candidates/[id]`); keine neue Angriffsfläche
- Deduplizierung der Ablauf-Erinnerung erfordert eine Möglichkeit, pro Dokument-Version zu erkennen, ob bereits erinnert wurde (technische Umsetzung: siehe `/architecture`)

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Erinnerungslogik ist ereignisbasiert (ausgelöst beim Seitenaufruf), kein Cron-Job | Keine Scheduled-Job-Infrastruktur im Projekt vorhanden; ein echter Cron wäre ein grösserer, eigenständiger technischer Baustein — angesichts der Zeitknappheit vor der Kunden-Präsentation bewusst einfacher gehalten, passt zum bereits in PROJ-16 etablierten Muster (Ablauf-Berechnung erfolgt beim Seitenaufruf, nicht vorberechnet) | 2026-07-31 |
| Einsatz-Statuswechsel (akzeptiert/aktiv/abgeschlossen) benachrichtigen jetzt sowohl Gemeinde als auch Kandidat | Beide Parteien haben seit PROJ-20 ein eigenes Portal und ein berechtigtes Interesse am selben Einsatz; der bisherige PROJ-11-Trigger (nur Gemeinde, nur „aktiv") stammt aus einer Zeit vor dem Kandidatenportal | 2026-07-31 |
| „Vertrag unterschrieben" benachrichtigt Gemeinde und Kandidat | Beide sehen den unterschriebenen Vertrag bereits in ihrem jeweiligen Portal (`MunicipalityContractCard` ist auf beiden Detailseiten eingebunden), beide sollen wissen, dass er verfügbar ist | 2026-07-31 |
| Ablauf-Erinnerung geht als Broadcast an alle aktiven internen Nutzer, nicht nur an die Person, die die Seite gerade geöffnet hat | Diese Person sieht die Ablauf-Badge ohnehin schon direkt in der UI (PROJ-16); die Benachrichtigung soll das ganze Team erreichen, nicht nur zufällige Seitenbesucher | 2026-07-31 |
| Ablauf-Erinnerung höchstens einmal pro Dokument-Version und Status („läuft bald ab" und „abgelaufen" zählen getrennt) | Verhindert, dass jeder erneute Seitenaufruf dieselbe Erinnerung wiederholt erzeugt und die Benachrichtigungsliste zuspammt | 2026-07-31 |
| Reine zeitbasierte Erinnerungen für liegengebliebene Anfragen/Vorschläge (ohne Dokument-Bezug) bleiben ausserhalb dieser Spec | Ohne Cron-Infrastruktur nur ungenau über Seitenaufrufe annäherbar; kleinerer, klar abgegrenzter Scope für den Piloten reicht aus, kann später ergänzt werden, sobald eine Scheduled-Job-Lösung existiert | 2026-07-31 |
| Intern abgelehnte Vorschläge lösen weiterhin keine Benachrichtigung aus | Unverändert aus PROJ-11 — die Gemeinde sieht einen Vorschlag laut RLS ohnehin erst ab „approved", eine Ablehnungs-Benachrichtigung vor diesem Zeitpunkt wäre kontextlos | 2026-07-31 |

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
