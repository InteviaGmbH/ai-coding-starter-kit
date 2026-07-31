# PROJ-18: Alle Benachrichtigungstrigger + Erinnerungslogik

## Status: In Progress
**Created:** 2026-07-31
**Last Updated:** 2026-07-31 (Implementation abgeschlossen — siehe Abschnitt "Implementation Notes")

## Dependencies
- Requires: PROJ-11 (Kern-Benachrichtigungen) — bestehende `notifications`-Tabelle, Glocke, `/notifications`-Seite (PROJ-17)
- Requires: PROJ-8 (Gemeinde-Interview & Annahme) — Vorschlag-Status `approved`/`municipality_accepted`/`municipality_declined`, Basis für die neue Vorschlag-Erinnerung
- Requires: PROJ-9 (Einsatzverwaltung) — Einsatz-Statusverlauf (proposed/accepted/active/completed) inkl. Start-/Enddatum, Basis für die Einsatz-Trigger und die neuen Termin-Erinnerungen
- Requires: PROJ-10 (Vertragsgenerierung) — Vertragsstatus (generated/signed), Basis für den „Vertrag unterschrieben"-Trigger und die neue Unterschrift-Erinnerung
- Requires: PROJ-16 (Vollständiges Dokumentenmanagement) — `candidate_document_versions.expiry_date`, Basis für die Ablauf-Erinnerung; PROJ-16 hat diese Abhängigkeit bereits explizit als „Enables: PROJ-18" dokumentiert
- Requires: PROJ-20 (Kandidatenportal-Selbstverwaltung) — Kandidat hat inzwischen ein eigenes Portal und damit ein berechtigtes Interesse an Einsatz-/Vertrags-/Termin-Benachrichtigungen, die PROJ-11 noch nicht vorsehen konnte

## User Stories
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, wenn mein Einsatz von „akzeptiert" zu „aktiv" zu „abgeschlossen" wechselt, damit ich den Fortschritt verfolgen kann, ohne die Seite manuell zu prüfen.
- Als `candidate` möchte ich bei denselben Statuswechseln meines eigenen Einsatzes benachrichtigt werden, damit ich genauso informiert bin wie die Gemeinde.
- Als `municipality`-/`candidate`-Nutzer möchte ich benachrichtigt werden, sobald die unterschriebene Vertragsversion verfügbar ist, damit ich weiss, dass der Prozess formal abgeschlossen ist.
- Als `municipality`-/`candidate`-Nutzer möchte ich rechtzeitig vor Beginn bzw. Ende eines Einsatzes erinnert werden, damit ich mich vorbereiten bzw. bei Bedarf rechtzeitig eine Verlängerung ansprechen kann.
- Als `dafinex_admin`/`internal_coordinator` möchte ich dieselben Termin-Erinnerungen erhalten, damit ich daran denke, den Einsatz-Status manuell auf „aktiv"/„abgeschlossen" zu setzen (das passiert laut PROJ-9 nicht automatisch).
- Als `dafinex_admin`/`internal_coordinator` möchte ich automatisch erinnert werden, wenn ein Kandidaten-Dokument bald abläuft oder bereits abgelaufen ist, damit ich rechtzeitig nachfassen kann, ohne jede Kandidatenseite manuell durchzuklicken.
- Als `dafinex_admin`/`internal_coordinator` möchte ich erinnert werden, wenn ein generierter Vertrag seit einiger Zeit noch nicht unterschrieben zurück ist, damit ich bei der Gemeinde nachfassen kann.
- Als `dafinex_admin`/`internal_coordinator` möchte ich erinnert werden, wenn eine Gemeinde einen freigegebenen Kandidatenvorschlag seit einiger Zeit noch nicht angenommen/abgelehnt hat, damit ich nachfassen kann.
- Als `dafinex_admin`/`internal_coordinator` möchte ich für denselben Sachverhalt nicht wiederholt dieselbe Erinnerung erhalten, damit die Benachrichtigungsliste nicht zugespamt wird.

## Out of Scope
- **Echter Cron-/Scheduled-Job** — es gibt noch keine Scheduled-Job-Infrastruktur in diesem Projekt (kein Vercel Cron, kein Supabase pg_cron). Alle Erinnerungen in dieser Spec sind ereignisbasiert: Ein zentraler Check läuft, sobald irgendein internes Mitglied `/internal/dashboard` öffnet — da diese Seite bei jedem Login aufgerufen wird, ist das im Praxisbetrieb ausreichend zuverlässig, ohne einen eigenen Infrastruktur-Baustein einzuführen.
- **E-Mail-/Push-Benachrichtigungen** — bleibt ausschliesslich In-App (`notifications`-Tabelle), unverändert aus PROJ-11
- **Benachrichtigung bei intern abgelehntem Vorschlag** (`reviewProposal` mit `decision: "rejected"`) — die Gemeinde hat den Vorschlag nie gesehen (laut PROJ-8-RLS erst ab „approved" sichtbar), eine Ablehnungs-Benachrichtigung an sie wäre nutzlos/verwirrend; unverändert aus PROJ-11
- **Erinnerung bei unbearbeiteten, unreviewten Anfragen** (`personnel_requests.status = 'created'` seit langer Zeit) — kein vergleichbarer Schwellenwert aus der ursprünglichen Anforderung bekannt; kann bei Bedarf per `/refine` ergänzt werden
- **Wiederholte/eskalierende Erinnerungen** (z.B. täglich erneut, solange der Zustand anhält) — jede Erinnerung feuert genau einmal pro Sachverhalt, keine Wiederholung, um die Benachrichtigungsliste nicht zuzuspammen (siehe Decision Log)
- **Benachrichtigungs-Einstellungen/Präferenzen pro Nutzer** — nicht im PRD-Scope für den Piloten (unverändert aus PROJ-11)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion], dann [Ergebnis]

### Einsatz-Statuswechsel (Gemeinde + Kandidat)
- [ ] Angenommen ein Einsatz wechselt zu „akzeptiert", dann erhalten sowohl die erstellende Person der zugehörigen Anfrage (Gemeinde) als auch der zugehörige Kandidat je eine Benachrichtigung „Einsatz akzeptiert"
- [ ] Angenommen ein Einsatz wechselt zu „aktiv", dann erhalten beide Parteien je eine Benachrichtigung „Einsatz aktiv" (erweitert den bisherigen, nur an die Gemeinde gerichteten PROJ-11-Trigger um den Kandidaten als zweiten Empfänger)
- [ ] Angenommen ein Einsatz wechselt zu „abgeschlossen", dann erhalten beide Parteien je eine Benachrichtigung „Einsatz abgeschlossen"
- [ ] Angenommen der zugehörige Kandidat hat kein eigenes Portal-Konto (kein `profile_id`), dann wird die Benachrichtigung an ihn übersprungen, ohne Fehler — die Gemeinde erhält ihre Benachrichtigung trotzdem

### Vertrag unterschrieben (Gemeinde + Kandidat)
- [ ] Angenommen intern lädt die unterschriebene Vertragsversion hoch (Status wechselt zu „signed"), dann erhalten sowohl die Gemeinde als auch der zugehörige Kandidat je eine Benachrichtigung „Vertrag unterschrieben"
- [ ] Angenommen der zugehörige Kandidat hat kein eigenes Portal-Konto, dann wird seine Benachrichtigung übersprungen, ohne Fehler

### Zentraler Erinnerungs-Check (beim Öffnen von /internal/dashboard)
- [ ] Angenommen ein interner Nutzer öffnet `/internal/dashboard`, dann prüft das System im Hintergrund systemweit alle Kandidaten-Dokumente, Einsätze, Verträge und Vorschläge auf die unten genannten Schwellenwerte und erzeugt für jeden neu erreichten Fall die passende Erinnerung
- [ ] Angenommen ein Sachverhalt wurde bereits einmal gemeldet, dann löst ein erneuter Dashboard-Aufruf (durch dieselbe oder eine andere Person) keine zweite Erinnerung für denselben Sachverhalt aus

### Ablauf-Erinnerung für Kandidaten-Dokumente
- [ ] Angenommen ein Dokument einer Kandidaten-Dokument-Version fällt in den Status „Läuft bald ab" oder „Abgelaufen", dann erhalten alle aktiven internen Nutzer je eine Benachrichtigung mit Kandidat, Dokumenttyp und Ablaufdatum, sobald der zentrale Check das nächste Mal läuft
- [ ] Angenommen eine Dokument-Version wurde bereits als „Läuft bald ab" gemeldet und läuft nun tatsächlich ab, dann wird zusätzlich einmalig eine separate „Abgelaufen"-Erinnerung ausgelöst (beide Status lösen je maximal eine Erinnerung pro Version aus, nicht dieselbe)
- [ ] Angenommen ein Dokument wird durch eine neue Version ersetzt, dann kann die neue Version unabhängig wieder eine eigene Erinnerung auslösen, falls sie ihrerseits ein Ablaufdatum hat

### Einsatzbeginn/-ende bald (Gemeinde + Kandidat + intern)
- [ ] Angenommen ein Einsatz hat noch den Status „proposed" oder „accepted" und sein Startdatum liegt in höchstens 3 Tagen, dann erhalten Gemeinde, Kandidat (falls vorhanden) und alle aktiven internen Nutzer je eine Benachrichtigung „Einsatzbeginn bald"
- [ ] Angenommen ein Einsatz hat den Status „active" und sein Enddatum (falls gesetzt) liegt in höchstens 3 Tagen, dann erhalten dieselben drei Parteien je eine Benachrichtigung „Einsatzende bald"
- [ ] Angenommen ein Einsatz hat kein Enddatum gesetzt, dann wird für ihn keine „Einsatzende bald"-Erinnerung ausgelöst
- [ ] Angenommen eine dieser beiden Erinnerungen wurde für einen Einsatz bereits ausgelöst, dann wird sie für denselben Einsatz kein zweites Mal ausgelöst

### Fehlende Vertragsunterschrift (nur intern)
- [ ] Angenommen ein Vertrag ist seit mindestens 3 Tagen im Status „generated" (noch nicht unterschrieben), dann erhalten alle aktiven internen Nutzer eine Benachrichtigung „Unterschrift ausstehend", sobald der zentrale Check das nächste Mal läuft
- [ ] Angenommen für diesen Vertrag wurde diese Erinnerung bereits ausgelöst, dann wird sie nicht erneut ausgelöst

### Unbearbeiteter Kandidatenvorschlag (nur intern)
- [ ] Angenommen ein Kandidatenvorschlag ist seit mindestens 3 Tagen im Status „approved" (intern freigegeben, aber die Gemeinde hat noch nicht entschieden), dann erhalten alle aktiven internen Nutzer eine Benachrichtigung „Vorschlag ohne Entscheidung"
- [ ] Angenommen für diesen Vorschlag wurde diese Erinnerung bereits ausgelöst, dann wird sie nicht erneut ausgelöst

### Bestehende Benachrichtigungsseite (PROJ-17)
- [ ] Angenommen die neuen Benachrichtigungstypen werden erzeugt, dann erscheinen sie auf `/notifications` mit einer verständlichen deutschen Typ-Bezeichnung, nicht dem generischen Fallback

## Edge Cases
- Einsatz-Statuswechsel, aber die erstellende Person der Anfrage existiert nicht mehr (`created_by_id` ist `null`) → Benachrichtigung an die Gemeinde wird übersprungen, kein Fehler (analog zu bestehenden Triggern)
- Kandidat eines Einsatzes/Vertrags hat kein Portal-Konto → wie oben, seine Benachrichtigung wird übersprungen, alle anderen Empfänger erhalten ihre trotzdem
- Mehrere Sachverhalte treffen gleichzeitig zu (z.B. zwei Dokumente laufen gleichzeitig ab, ein Einsatz beginnt UND ein anderer endet bald) → je Sachverhalt eine eigene Erinnerung, keine Bündelung nötig
- Erster Dashboard-Aufruf nach langer Zeit (z.B. nach dem Wochenende) findet mehrere neu fällige Erinnerungen gleichzeitig → alle werden in diesem einen Durchlauf ausgelöst, keine künstliche Begrenzung pro Aufruf nötig (Pilot-Massstab)
- Zwei interne Nutzer öffnen `/internal/dashboard` nahezu gleichzeitig, während ein Sachverhalt gerade neu fällig wird → beide Aufrufe könnten theoretisch gleichzeitig prüfen, ob schon erinnert wurde; eine doppelte Erinnerung im seltenen Gleichzeitigkeitsfall ist ein akzeptables, rein kosmetisches Risiko (kein Datenverlust, kein Sicherheitsproblem), kein zusätzlicher Sperrmechanismus für den Piloten nötig
- Ablaufdatum/Start-/Enddatum liegt exakt am Tag des Checks → zählt als „bald" (≤ 3 Tage schliesst 0 Tage ein), nicht als bereits verstrichen

## Technical Requirements (optional)
- Security: Der zentrale Check läuft ausschliesslich im bereits rollenbasiert geschützten serverseitigen Ladepfad von `/internal/dashboard`; keine neue Angriffsfläche
- Deduplizierung erfordert je Erinnerungstyp eine Möglichkeit zu erkennen, ob für den jeweiligen Datensatz (Dokument-Version/Einsatz/Vertrag/Vorschlag) bereits erinnert wurde (technische Umsetzung: siehe Tech Design)

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Erinnerungslogik ist ereignisbasiert (ausgelöst beim Öffnen von `/internal/dashboard`), kein Cron-Job | Keine Scheduled-Job-Infrastruktur im Projekt vorhanden; `/internal/dashboard` wird von jedem internen Nutzer bei jedem Login geöffnet, macht diesen Ansatz im Praxisbetrieb ausreichend zuverlässig, ohne einen grösseren, eigenständigen Infrastruktur-Baustein einzuführen | 2026-07-31 |
| Ursprünglich auf `/internal/candidates/[id]` vorgesehener Check wurde auf `/internal/dashboard` verschoben | Nutzer-Korrektur: eine einzelne Kandidaten-Detailseite wird nur besucht, wenn zufällig jemand genau diesen Kandidaten öffnet — unzuverlässig. Das Dashboard wird garantiert bei jedem Login besucht | 2026-07-31 |
| Scope um drei zusätzliche Erinnerungstypen erweitert: Einsatzbeginn/-ende bald, fehlende Vertragsunterschrift, unbearbeiteter Vorschlag | Nutzer-Korrektur: waren Teil der ursprünglichen Anforderung, in der ersten Entwurfsrunde fälschlich als „braucht Cron" ausgeschlossen — der Dashboard-Ansatz löst dasselbe Zuverlässigkeitsproblem für alle fünf Erinnerungstypen einheitlich | 2026-07-31 |
| Einsatz-Statuswechsel (akzeptiert/aktiv/abgeschlossen) benachrichtigen jetzt sowohl Gemeinde als auch Kandidat | Beide Parteien haben seit PROJ-20 ein eigenes Portal und ein berechtigtes Interesse am selben Einsatz; der bisherige PROJ-11-Trigger (nur Gemeinde, nur „aktiv") stammt aus einer Zeit vor dem Kandidatenportal | 2026-07-31 |
| „Vertrag unterschrieben" benachrichtigt Gemeinde und Kandidat | Beide sehen den unterschriebenen Vertrag bereits in ihrem jeweiligen Portal (`MunicipalityContractCard` ist auf beiden Detailseiten eingebunden), beide sollen wissen, dass er verfügbar ist | 2026-07-31 |
| Einsatzbeginn/-ende bald: 3 Tage Vorlauf, an Gemeinde + Kandidat + intern | Gemeinde/Kandidat bereiten sich vor bzw. können bei Bedarf rechtzeitig eine Verlängerung ansprechen; intern wird erinnert, den Status manuell auf „aktiv"/„abgeschlossen" zu setzen, da dieser Wechsel laut PROJ-9 kein automatischer Vorgang ist | 2026-07-31 |
| Fehlende Unterschrift/unbearbeiteter Vorschlag: 3 Tage Schwelle, nur an intern | Intern soll entscheiden, ob/wie bei der Gemeinde nachgefasst wird — eine direkte Erinnerung an die Gemeinde könnte als drängend/unhöflich wirken; intern hat die Kundenbeziehung | 2026-07-31 |
| Jede Erinnerung feuert höchstens einmal pro Sachverhalt, keine Wiederholung | Verhindert, dass die Benachrichtigungsliste durch wiederholte Erinnerungen für denselben, unveränderten Sachverhalt zugespamt wird | 2026-07-31 |
| Intern abgelehnte Vorschläge lösen weiterhin keine Benachrichtigung aus | Unverändert aus PROJ-11 — die Gemeinde sieht einen Vorschlag laut RLS ohnehin erst ab „approved", eine Ablehnungs-Benachrichtigung vor diesem Zeitpunkt wäre kontextlos | 2026-07-31 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Vier neue Boolean-Spalten zur Deduplizierung: `candidate_document_versions.expiring_soon_notified`/`expired_notified`, `assignments.start_reminder_sent`/`end_reminder_sent`, `contracts.signature_reminder_sent`, `candidate_proposals.decision_reminder_sent` — insgesamt sieben neue Spalten über vier bestehende Tabellen, statt einer separaten "Erinnerungs-Log"-Tabelle | Kleinste zusätzliche Struktur, die Mehrfach-Erinnerungen pro Sachverhalt zuverlässig verhindert; kein Bedarf an einem vollständigen, generischen Protokoll für den Piloten | 2026-07-31 |
| Zentraler Erinnerungs-Check läuft serverseitig beim Laden von `/internal/dashboard`, als ein gemeinsamer Durchlauf für alle fünf Erinnerungstypen, nicht als eigene API-Route | Konsistent mit dem bereits in PROJ-16/17 etablierten Muster, Seiteneffekte (z.B. "als gelesen markieren") direkt im serverseitigen Laden einer Seite auszuführen, ohne zusätzlichen Client-Roundtrip; ein gemeinsamer Durchlauf statt fünf verstreuter Einzel-Checks hält den Code an einer Stelle wartbar | 2026-07-31 |
| Neun neue `notifications.type`-Werte: `assignment_accepted`, `assignment_completed`, `contract_signed`, `document_expiring_soon`, `document_expired`, `assignment_starting_soon`, `assignment_ending_soon`, `contract_signature_pending`, `proposal_decision_pending` (`assignment_active` bleibt unverändert, bekommt nur einen zweiten Empfänger) | `notifications.type` ist bereits ein freies Textfeld ohne CHECK-Constraint (siehe PROJ-11/17) — neue Werte brauchen keine Schema-Änderung | 2026-07-31 |
| Einsatz-/Vertrags-Trigger ermitteln den Kandidaten-Empfänger über denselben Join-Pfad, der in `internal/assignments/actions.ts`/`internal/contracts/actions.ts` bereits für die Anfrage-Ermittlung existiert (`assignment → candidate_proposals → candidates.profile_id`), keine neue Abfrage-Struktur | Wiederverwendung eines bereits vorhandenen, bewährten Join-Musters statt einer neuen Query-Form | 2026-07-31 |
| Broadcast-Empfänger-Ermittlung für die internen Erinnerungen nutzt den bereits in PROJ-17 extrahierten gemeinsamen Helper (aktive interne Profile ermitteln), keine neue Implementierung | Vermeidet Doppelarbeit, dieselbe Logik existiert bereits als wiederverwendbare Funktion | 2026-07-31 |
| „Seit X Tagen approved" (Vorschlag) bzw. „seit X Tagen generated" (Vertrag) wird anhand der bestehenden `updated_date`-Spalte berechnet, keine neue Zeitstempel-Spalte | `updated_date` wird bereits automatisch bei jedem Statuswechsel aktualisiert (bestehender `set_updated_date`-Trigger); zum Zeitpunkt, an dem der Status auf „approved"/„generated" wechselt, spiegelt `updated_date` exakt diesen Zeitpunkt wider | 2026-07-31 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

Diese Spec fügt keine neuen Bildschirme hinzu — sie erweitert bestehende Abläufe um zusätzliche Benachrichtigungs-Empfänger sowie einen neuen, zentralen Erinnerungs-Check:

```
Bestehende interne Aktion "Einsatz-Status weiterschalten"
  (auf /internal/assignments/[id])
└── erweitert um: bei "akzeptiert"/"aktiv"/"abgeschlossen" jetzt ZWEI
      Empfänger statt einem (Gemeinde-Ansprechperson UND Kandidat,
      falls vorhanden)

Bestehende interne Aktion "Unterschriebenen Vertrag hochladen"
  (auf /internal/assignments/[id])
└── erweitert um: neue Benachrichtigung an Gemeinde UND Kandidat

Interne Dashboard-Seite (/internal/dashboard)
└── beim Laden zusätzlich: ein zentraler, stiller Hintergrund-Check
      "Gibt es systemweit neu fällige Erinnerungen?"
      ├── Kandidaten-Dokumente: läuft bald ab / ist abgelaufen
      │     → Broadcast an alle aktiven internen Nutzer
      ├── Einsätze: Beginn/Ende in ≤ 3 Tagen
      │     → Gemeinde + Kandidat + alle aktiven internen Nutzer
      ├── Verträge: seit ≥ 3 Tagen generiert, nicht unterschrieben
      │     → Broadcast an alle aktiven internen Nutzer
      └── Vorschläge: seit ≥ 3 Tagen freigegeben, keine Gemeinde-Entscheidung
            → Broadcast an alle aktiven internen Nutzer
      (jeder Sachverhalt wird beim Erzeugen der Erinnerung markiert,
      damit derselbe Sachverhalt nie ein zweites Mal erinnert)

Benachrichtigungsseite (/notifications, aus PROJ-17)
└── zeigt alle neuen Typen mit verständlicher deutscher Bezeichnung
      im Typ-Filter
```

### B) Data Model (plain language)

Keine neue Tabelle für die Benachrichtigungen selbst — sie nutzen weiterhin die bestehende Benachrichtigungs-Tabelle aus PROJ-11/17, nur mit neun neuen möglichen "Typ"-Werten.

Kleine Ergänzungen an vier bestehenden Tabellen sind nötig, um Mehrfach-Erinnerungen zu verhindern — jede bekommt einen oder zwei zusätzliche Ja/Nein-Merker "wurde dafür schon erinnert?":
- **Kandidaten-Dokument-Version** (aus PROJ-16): je ein Merker für "läuft bald ab gemeldet" und "abgelaufen gemeldet"
- **Einsatz**: je ein Merker für "Beginn bald gemeldet" und "Ende bald gemeldet"
- **Vertrag**: ein Merker für "Unterschrift-Erinnerung gemeldet"
- **Kandidatenvorschlag**: ein Merker für "Vorschlag-Erinnerung gemeldet"

Jeder Merker startet bei "nein" und wird einmalig auf "ja" gesetzt, sobald die jeweilige Erinnerung tatsächlich verschickt wurde — derselbe Sachverhalt kann danach nie wieder dieselbe Erinnerung auslösen.

### C) Tech Decisions (justified for PM)

1. **Kein neuer Hintergrund-Job/Cron.** Der Erinnerungs-Check läuft als ein zusätzlicher Schritt beim Laden von `/internal/dashboard` — einer Seite, die jeder interne Nutzer bei jedem Login ohnehin öffnet. Kein neuer Infrastruktur-Baustein, keine neuen Umgebungsvariablen/Secrets.
2. **Ein zentraler, gemeinsamer Check statt fünf verstreuter Einzel-Lösungen.** Alle fünf Erinnerungstypen werden an einer Stelle geprüft, wenn das Dashboard geladen wird — einfacher zu warten als fünf verteilte Prüfungen an fünf verschiedenen Orten.
3. **Einfache Ja/Nein-Merker pro Sachverhalt statt eines komplexeren Protokolls.** Reicht vollständig aus, um Mehrfach-Erinnerungen zu verhindern, ohne eine zusätzliche Tabelle nur für "wer wurde wann worüber informiert" einzuführen.
4. **Wiederverwendung der bestehenden Benachrichtigungs-Infrastruktur** (Tabelle, Glocke, `/notifications`-Seite aus PROJ-11/17) für alle neuen Trigger — nur neue Typ-Werte, keine Strukturänderung.
5. **Einsatz-/Vertrags-Statuswechsel-Benachrichtigungen werden in den bereits bestehenden internen Aktionen ergänzt** (Status weiterschalten, Vertrag unterschreiben), nicht als neue, separate Bausteine.
6. **Broadcast an alle aktiven internen Nutzer für interne Erinnerungen**, Wiederverwendung des bereits aus PROJ-11/17 bekannten "Alle aktiven internen Nutzer ermitteln"-Mechanismus.

### D) Dependencies (packages to install)
- Keine neuen Pakete.

## Implementation Notes

### Datenbank
- Migration `20260731100000_reminder_flags.sql`: sieben neue Boolean-Spalten (Default `false`) über vier bestehende Tabellen — `candidate_document_versions.expiring_soon_notified`/`expired_notified`, `assignments.start_reminder_sent`/`end_reminder_sent`, `contracts.signature_reminder_sent`, `candidate_proposals.decision_reminder_sent`. Keine RLS-/Trigger-Änderungen nötig: internes Personal hat auf allen vier Tabellen bereits uneingeschränkten UPDATE-Zugriff, und keine bestehende Spalten-Lockdown-Trigger betrifft interne Akteure.

### Anwendungscode
- `src/lib/reminders/run-reminder-checks.ts`: zentrale `runReminderChecks()`-Funktion, die nacheinander alle vier Bereiche prüft (Dokument-Ablauf, Einsatz-Termine, Vertrags-Unterschrift, Vorschlag-Entscheidung) und dabei jeweils die passende Dedup-Spalte setzt, sobald tatsächlich erinnert wurde.
- `src/lib/notifications/notify-assignment-parties.ts`: neuer gemeinsamer Helper, der Gemeinde und/oder Kandidat benachrichtigt und dabei fehlende Empfänger (kein Portal-Konto) stillschweigend überspringt — genutzt von `advanceAssignmentStatus`, `setSignedDocument` und den beiden Termin-Erinnerungen.
- `src/app/internal/assignments/actions.ts` (`advanceAssignmentStatus`): benachrichtigt jetzt bei allen drei Statuswechseln (akzeptiert/aktiv/abgeschlossen) sowohl Gemeinde als auch Kandidat, statt nur bei „aktiv" nur die Gemeinde.
- `src/app/internal/contracts/actions.ts` (`setSignedDocument`): neue Benachrichtigung „Vertrag unterschrieben" an Gemeinde und Kandidat (vorher: keine Benachrichtigung bei dieser Statusänderung).
- `src/app/internal/dashboard/page.tsx`: ruft `runReminderChecks()` vor dem Rendern auf — der zentrale Ort, an dem alle fünf Erinnerungstypen ausgelöst werden, ereignisbasiert beim Laden dieser garantiert oft besuchten Seite.
- `src/lib/notifications/type-labels.ts`: neun neue deutsche Typ-Bezeichnungen für die `/notifications`-Seite (PROJ-17).
- Bestehende Tests für `advanceAssignmentStatus`/`setSignedDocument` aktualisiert (Notifications-Insert erfolgt jetzt als Array über den neuen Helper statt als einzelnes Objekt); neue Tests für alle drei Einsatz-Statuswechsel sowie für `setSignedDocument`s neue Benachrichtigungslogik ergänzt.

### Verifikation
- `npx eslint` (alle neuen/geänderten Dateien): keine Fehler
- `npx vitest run`: 152/152 Tests grün (9 neu für `run-reminder-checks.ts`, plus erweiterte/neue Tests für die beiden geänderten Action-Dateien)
- `npm run build`: erfolgreich, alle Routen kompilieren

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
