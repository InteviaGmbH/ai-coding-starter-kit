# PROJ-11: Kern-Benachrichtigungen

## Status: Approved
**Created:** 2026-07-26
**Last Updated:** 2026-07-26 (QA: 1 Low gefunden, kosmetische Badge-Ungenauigkeit ohne Sicherheitsrisiko — production-ready)

## Dependencies
- Requires: PROJ-2 (Auth & Portal-Grundgerüst) — `notifications`-Tabelle, Portal-Shell
- Requires: PROJ-5, PROJ-7, PROJ-8, PROJ-9, PROJ-10 — liefern die Ereignisse, die benachrichtigt werden

## User Stories
- Als Nutzer (egal welche Rolle) möchte ich meine ungelesenen Benachrichtigungen auf einen Blick sehen, damit ich nicht jede Seite manuell nach Neuigkeiten durchsuchen muss.
- Als Nutzer möchte ich eine Benachrichtigung als gelesen markieren können, damit meine Liste übersichtlich bleibt.
- Als `dafinex_admin`/`internal_coordinator` möchte ich benachrichtigt werden, sobald eine Gemeinde eine neue Personalanfrage stellt, damit ich zeitnah reagieren kann.
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, sobald ein Kandidat für meine Anfrage intern freigegeben wurde, damit ich weiss, dass ein Vorschlag auf meine Entscheidung wartet.
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, sobald mein Einsatz aktiv wird, damit ich weiss, dass die Fachkraft nun im Einsatz ist.

## Out of Scope
- E-Mail-/Push-Benachrichtigungen — ausschliesslich In-App (`notifications`-Tabelle), wie bereits in PROJ-2/5/7/8/10 festgelegt
- Erinnerungslogik (z.B. wiederholte Erinnerungen bei fehlender Reaktion) — volle Trigger-/Erinnerungsübersicht ist PROJ-18 (P2)
- Benachrichtigungs-Einstellungen/Präferenzen pro Nutzer (z.B. abschaltbar machen) — nicht im PRD-Scope für den Piloten
- Benachrichtigung bei „abgelehnt" (intern oder durch Gemeinde) — PRD nennt explizit nur „neue Anfrage, Vorschlag, Einsatz aktiv, Vertrag bereit" als Kern-Trigger; Ablehnungen sind bereits über die jeweilige Detailseite sichtbar
- Kandidaten-seitige Trigger — es existieren noch keine Kandidaten-Workflows, die einen der vier PRD-Trigger auslösen (konsistent mit dem schrittweisen Portal-Ausbau); die Benachrichtigungs-UI selbst wird trotzdem auch im Kandidatenportal ergänzt, für künftige Trigger

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Nutzer hat ungelesene Benachrichtigungen, wenn er ein Portal öffnet, dann zeigt ein Glocken-Symbol in der Kopfzeile die Anzahl ungelesener Benachrichtigungen
- [ ] Angenommen ein Nutzer klickt auf das Glocken-Symbol, dann öffnet sich eine Liste der letzten Benachrichtigungen (Nachricht, Datum, gelesen/ungelesen)
- [ ] Angenommen ein Nutzer öffnet eine einzelne Benachrichtigung oder markiert sie explizit, dann wechselt sie zu „gelesen" und die Zähleranzeige aktualisiert sich
- [ ] Angenommen keine Benachrichtigungen vorhanden, wenn die Liste geöffnet wird, dann erscheint ein Hinweistext statt einer leeren Liste
- [ ] Angenommen ein `municipality`-Nutzer erstellt eine neue Personalanfrage, dann erhalten alle aktiven internen Nutzer (`dafinex_admin`/`internal_coordinator`/`super_admin`) je eine Benachrichtigung „Neue Anfrage"
- [ ] Angenommen ein interner Nutzer gibt einen Kandidatenvorschlag frei, dann erhält die erstellende Person der zugehörigen Anfrage eine Benachrichtigung „Neuer Kandidatenvorschlag verfügbar"
- [ ] Angenommen ein interner Nutzer setzt einen Einsatz auf Status „aktiv", dann erhält die erstellende Person der zugehörigen Anfrage eine Benachrichtigung „Einsatz aktiv"
- [ ] Angenommen ein Vertrag wird generiert (PROJ-10), dann bleibt die bestehende „Vertrag bereit"-Benachrichtigung unverändert bestehen
- [ ] Angenommen ein Nutzer versucht per direktem Aufruf, eine Benachrichtigung eines anderen Nutzers als gelesen zu markieren oder eine Benachrichtigung an einen beliebigen Empfänger zu senden, dann wird dies durch RLS und serverseitige Prüfung verhindert

## Edge Cases
- Gemeinde erstellt eine Anfrage, aber es gibt aktuell keine aktiven internen Nutzer (sollte praktisch nicht vorkommen) → Anfrage wird trotzdem erstellt, einfach keine Benachrichtigungen versendet, kein Fehler
- Sehr viele Benachrichtigungen → Liste zeigt die letzten 10, kein Pagination-Mechanismus nötig für den Pilot-Massstab
- Nutzer markiert eine bereits gelesene Benachrichtigung erneut als gelesen → keine Fehlermeldung, bleibt einfach „gelesen" (idempotent)

## Technical Requirements (optional)
- Security: Neue, eng begrenzte RLS-Policy nötig, damit eine Gemeinde beim Erstellen einer Anfrage Benachrichtigungen an mehrere interne Empfänger schreiben kann (aktuell nur `notifications_insert_internal`, das setzt einen internen Akteur voraus) — siehe Decision Log
- Empfänger-Ermittlung für den „neue Anfrage"-Broadcast (welche Profile sind aktiv+intern) erfordert den Admin-Client (`service_role`), da eine Gemeinde per RLS keine fremden `profiles`-Zeilen lesen darf — die eigentliche Benachrichtigungs-`INSERT` läuft weiterhin über den normalen, RLS-geprüften Client
- Bestehendes `notifications_update_own` (PROJ-1) deckt „als gelesen markieren" bereits ab, keine Änderung nötig

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll die Benachrichtigungsliste bei Klick auf eine Benachrichtigung direkt zur betroffenen Anfrage/zum Vorschlag/Einsatz navigieren? Aktuell nur „als gelesen markieren", kein Deep-Link — könnte in `/refine` ergänzt werden

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–10 vereinbart | 2026-07-26 |
| PROJ-11 baut die tatsächliche Benachrichtigungs-UI (Glocke + Liste + „gelesen"-Markierung); bisherige Features (PROJ-2/5/7/8/10) schreiben bereits Zeilen in `notifications`, aber es gab noch keine Oberfläche, sie zu sehen | Diese Lücke wurde beim Vorbereiten dieser Spec festgestellt — ohne UI sind alle bisherigen Benachrichtigungen für Nutzer unsichtbar; das ist der eigentliche Kern dieser Spec, nicht nur zusätzliche Trigger | 2026-07-26 |
| „Neue Anfrage" geht an ALLE aktiven internen Nutzer (Broadcast), nicht an eine bestimmte Person | Zum Zeitpunkt der Anfrage-Erstellung ist noch kein interner Nutzer zugewiesen; im 2-3-köpfigen Pilotteam ist ein Broadcast an alle die einfachste sinnvolle Lösung | 2026-07-26 |
| „Vorschlag"-Trigger feuert bei interner Freigabe (`approved`), nicht bereits bei „vorgeschlagen" | Die Gemeinde sieht laut PROJ-8-RLS ohnehin erst ab „freigegeben"; eine frühere Benachrichtigung wäre für die Gemeinde nutzlos, da sie den Vorschlag noch nicht einsehen könnte | 2026-07-26 |
| „Vertrag bereit" (PROJ-10) wird nicht erneut implementiert, nur die neue UI macht sie erstmals sichtbar | Vermeidet Doppelarbeit; die Trigger-Logik existiert bereits korrekt | 2026-07-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Tabelle — `notifications` existiert bereits aus PROJ-1 mit passenden Feldern (`recipient_id`, `type`, `message`, `is_read`) | Schema deckt bereits alles Nötige ab | 2026-07-26 |
| Neue RLS-Policy `notifications_insert_municipality_new_request`: `with check` beschränkt auf `type = 'new_request'` und `recipient_id` aus aktiven internen Profilen | Analoge, eng begrenzte Policy wie bei PROJ-8 (`..._proposal_decision`); verhindert, dass eine Gemeinde beliebige Benachrichtigungstypen an beliebige Empfänger senden kann | 2026-07-26 |
| Empfänger-Ermittlung für den Broadcast nutzt den Admin-Client (`service_role`) nur lesend, um aktive interne `profiles`-IDs zu ermitteln (Gemeinde darf per RLS keine fremden Profile lesen); der eigentliche `INSERT` in `notifications` läuft weiterhin über den normalen, RLS-geprüften Client | Trennt „wer darf was lesen" von „wer darf was schreiben" — die Autorisierung des Schreibvorgangs bleibt vollständig bei RLS (zweite Verteidigungslinie), der Admin-Client wird nicht für den sicherheitskritischen Teil verwendet | 2026-07-26 |
| „Vorschlag"- und „Einsatz aktiv"-Trigger werden in bereits bestehende interne Server Actions (`reviewProposal`, `advanceAssignmentStatus`) ergänzt, keine neue RLS-Policy nötig | Beide Aktionen laufen bereits über einen internen Akteur → `notifications_insert_internal` deckt das ab | 2026-07-26 |
| `NotificationBell` (Client) wird in `PortalShell` integriert, alle drei Portal-Layouts (`internal`/`municipality`/`candidate`) laden die letzten 10 Benachrichtigungen + ungelesene Anzahl serverseitig und reichen sie als Props durch | Wiederverwendung derselben Shell für alle Rollen; serverseitiges Laden vermeidet einen zusätzlichen Client-Request beim ersten Rendern | 2026-07-26 |
| „Als gelesen markieren" nutzt eine neue Server Action unter `src/app/notifications/actions.ts` (kein eigener Seitenpfad, nur Aktionen) auf Basis der bereits bestehenden `notifications_update_own`-Policy | Kein neues RLS nötig; Ordner ohne `page.tsx` ist im Projekt bereits üblich (z.B. `internal/contracts/`) | 2026-07-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
PortalShell (alle drei Portale, erweitert)
  └── NotificationBell (Client)     Glocke mit Badge (ungelesene Anzahl), Popover mit Liste
        └── NotificationList          letzte 10 Benachrichtigungen, "Als gelesen markieren" pro Zeile
        └── Empty State                "Keine Benachrichtigungen" bei leerer Liste

Erweiterte Server Actions (kein neuer Bildschirm):
  municipality/requests/actions.ts    createPersonnelRequest: + Broadcast an aktive interne Nutzer
  internal/requests/[id]/proposals/actions.ts   reviewProposal: + Benachrichtigung bei "approved"
  internal/assignments/actions.ts     advanceAssignmentStatus: + Benachrichtigung bei "active"
```

### Data Model
Keine neue Tabelle. Nutzt ausschliesslich `notifications` (bestehend) sowie `profiles` (Admin-Client-Lookup für den Broadcast).

### Tech Decisions (Begründung)
- **Admin-Client nur für den Lese-Lookup, nie für den Schreibvorgang selbst** — hält die Sicherheitsgarantie „RLS ist die zweite Verteidigungslinie für jeden Schreibzugriff" konsequent ein, auch für diesen Sonderfall.
- **Serverseitiges Vorladen statt Client-seitigem Fetch/Polling** — für den Pilot-Massstab ausreichend, keine Echtzeit-Anforderung im PRD; vermeidet zusätzliche Komplexität (kein Realtime-Subscription nötig).
- **Wiederverwendung der bestehenden `notifications_update_own`-Policy** — keine neue Sicherheitsfläche für das Lesen/Markieren nötig.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Popover, Badge, Button) und `lucide-react` (bereits für das Menü-Symbol in `PortalShell` im Einsatz) für das Glocken-Icon.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- Neue Migration `supabase/migrations/20260726130000_notifications_new_request_broadcast.sql` (+ gleiche Ergänzungen bereits in `20260725120000_init_schema.sql` für Neuinstallationen): neue `SECURITY DEFINER`-Hilfsfunktion `is_active_internal_profile(profile_id)` und darauf aufbauend die Policy `notifications_insert_municipality_new_request`
- **Während der Umsetzung gefundener und sofort korrigierter Entwurfsfehler:** eine rohe Subquery gegen `profiles` in der neuen Policy hätte unter den RLS-Rechten des Gemeinde-Akteurs ausgewertet — der hat aber nur Lesezugriff auf die eigene Profilzeile (`profiles_select_own_or_internal`), die Subquery hätte also immer leer und der Broadcast-Insert immer fehlgeschlagen. Gelöst mit einer `SECURITY DEFINER`-Funktion, analog zu den bestehenden `current_*`/`is_*`-Helfern
- `src/app/notifications/actions.ts`: `markNotificationRead`/`markAllNotificationsRead`, nutzen die bereits bestehende `notifications_update_own`-Policy, keine neue RLS nötig
- `src/components/portal/notification-bell.tsx`: Glocke mit Badge (ungelesene Anzahl) + Popover-Liste (letzte 10, „als gelesen markieren" pro Zeile + „alle als gelesen markieren")
- `src/lib/notifications/get-recent-notifications.ts`: gemeinsamer Helper, von allen drei Portal-Layouts (`internal`/`municipality`/`candidate`) genutzt
- `src/components/portal/portal-shell.tsx` um `notifications`-Prop erweitert, rendert `NotificationBell` im Header
- Drei neue Trigger in bestehenden Server Actions:
  - `municipality/requests/actions.ts` (`createPersonnelRequest`): Broadcast „Neue Anfrage" an alle aktiven internen Nutzer — Empfänger-Ermittlung über den Admin-Client (`service_role`, nur lesend), der eigentliche Insert läuft weiterhin über den normalen, RLS-geprüften Client
  - `internal/requests/[id]/proposals/actions.ts` (`reviewProposal`): Benachrichtigung „Neuer Kandidatenvorschlag verfügbar" an `personnel_requests.created_by_id`, wenn `decision === "approved"`
  - `internal/assignments/actions.ts` (`advanceAssignmentStatus`): Benachrichtigung „Einsatz aktiv" an `personnel_requests.created_by_id`, wenn `nextStatus === "active"`
  - „Vertrag bereit" (PROJ-10) unverändert übernommen, nur jetzt über die neue UI sichtbar
- 6 neue/erweiterte Vitest-Tests (3 neue in `notifications/actions.test.ts`, je 1 erweiterter/neuer Test in den drei bestehenden Action-Testdateien für die neuen Trigger)
- `npm test` (61/61), `npm run build` grün

## QA Test Results

**Tested:** 2026-07-26
**App URL:** http://localhost:3000 (laufender Dev-Server, echtes Supabase-Projekt — Migration `20260726130000` dort noch nicht angewendet)
**Tester:** QA Engineer (AI)

### Automatisierte Tests
- `npm test`: 61/61 grün (6 neue/erweiterte Tests für die drei neuen Trigger + `notifications/actions.ts`)
- `npm run build`: erfolgreich
- Kein neuer E2E-Redirect-Test nötig: PROJ-11 fügt keine neue Route hinzu, die Glocke lebt ausschliesslich innerhalb der drei bereits per PROJ-2-E2E-Tests abgesicherten Portal-Layouts

### Coverage-Lücke (dokumentiert, kein Bug)
Das tatsächliche Erscheinungsbild der Glocke/Liste im Browser (Badge-Anzeige, Popover-Öffnen, „als gelesen markieren"-Klick) konnte mangels aktivem Testkonto nicht visuell verifiziert werden (gleiche Einschränkung wie PROJ-2–10). Die Trigger-Logik selbst ist vollständig per Vitest abgedeckt.

### Acceptance Criteria Status
- [x] Glocke zeigt Anzahl ungelesener Benachrichtigungen (Code-Review: `NotificationBell`, siehe aber BUG-1 zur Genauigkeit)
- [x] Klick öffnet Popover-Liste mit Nachricht/Datum/Status (Code-Review)
- [x] Einzelnes „als gelesen markieren" aktualisiert Status + Zähler (Vitest für die Server Action; Code-Review für `router.refresh()`-Aktualisierung)
- [x] Leere Liste zeigt Hinweistext (Code-Review: `NotificationBell` early return)
- [x] „Neue Anfrage" erreicht alle aktiven internen Nutzer (Vitest: Broadcast-Insert mit korrektem Empfänger)
- [x] „Vorschlag freigegeben" erreicht die Gemeinde (Vitest)
- [x] „Einsatz aktiv" erreicht die Gemeinde (Vitest, inkl. Test dass andere Statuswechsel NICHT benachrichtigen)
- [x] „Vertrag bereit" (PROJ-10) unverändert, jetzt sichtbar (Code-Review: keine Logikänderung, nur neue UI)
- [x] Fremde Benachrichtigung kann nicht als gelesen markiert werden (Vitest: `.eq("recipient_id", actor.id)` + RLS `notifications_update_own`)

### Security Audit Results (Red Team)
- [x] `markNotificationRead`/`markAllNotificationsRead` sind auf die eigene `recipient_id` beschränkt (Vitest + bestehende RLS)
- [x] Broadcast-Policy (`notifications_insert_municipality_new_request`) korrekt auf `type = 'new_request'` und aktive interne Empfänger beschränkt — verifiziert per Lesen der Migration, dass kein beliebiger Empfänger/Typ möglich ist
- [x] Admin-Client wird ausschliesslich für den Lese-Lookup verwendet, nie für den sicherheitsrelevanten Schreibvorgang selbst — der tatsächliche `INSERT` bleibt RLS-geprüft
- [x] Gefundener und korrigierter Entwurfsfehler (rohe `profiles`-Subquery hätte den Broadcast immer stillschweigend blockiert) — siehe Implementation Notes; während der Umsetzung selbst behoben, kein QA-Fund
- [ ] BUG-1 (Low): Die ungelesene Anzahl im Glocken-Badge wird aus den zuletzt geladenen 10 Benachrichtigungen berechnet (`notifications.filter(n => !n.isRead).length`), nicht aus einer echten Gesamtzahl — bei mehr als 10 ungelesenen Benachrichtigungen zeigt das Badge höchstens 10 an, auch wenn mehr ungelesen sind

### Bugs Found

#### BUG-1: Ungelesene-Anzahl im Badge kann bei mehr als 10 Benachrichtigungen zu niedrig sein
- **Severity:** Low
- **Steps to Reproduce:**
  1. Ein Nutzer sammelt mehr als 10 ungelesene Benachrichtigungen an, ohne je die Liste zu öffnen
  2. Das Badge zeigt maximal 10 an (Anzahl der geladenen Zeilen), nicht die tatsächliche Gesamtzahl
  3. Bei der geringen erwarteten Nutzungsfrequenz im 2-3-köpfigen Pilotteam mit einer Gemeinde sehr unwahrscheinlich, kein Sicherheitsrisiko, rein kosmetische Ungenauigkeit
- **Priority:** Nice to have — liesse sich mit einer separaten `count`-Abfrage (`is_read = false`, ohne `limit`) für den Badge-Wert beheben, unabhängig von der auf 10 begrenzten Listenanzeige

### Summary
- **Acceptance Criteria:** Alle 9 Kriterien bestätigt (1 mit dokumentierter Genauigkeits-Einschränkung, siehe BUG-1)
- **Bugs Found:** 1 total (1 Low, kein Sicherheitsrisiko)
- **Security:** Keine Autorisierungslücke; ein während der Umsetzung selbst gefundener und behobener Entwurfsfehler (RLS-Subquery-Falle) zeigt, dass die in PROJ-8 gelernte Lektion („RLS-Subqueries laufen unter den Rechten des Aufrufers") inzwischen aktiv in die Architekturplanung einfliesst
- **Production Ready:** **YES** — keine offenen Critical/High/Medium-Bugs
- **Empfehlung:** Migration `20260726130000_notifications_new_request_broadcast.sql` muss vor dem ersten Nutzen dieser Funktion im echten Supabase-Projekt ausgeführt werden. Sobald Testkonten für alle Rollen existieren, das Glocken-Symbol einmal end-to-end visuell verifizieren; BUG-1 kann gesammelt mit den übrigen Low-Findings in einem späteren Aufräum-Pass behoben werden

## Deployment
_To be added by /deploy_
