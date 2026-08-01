# PROJ-19: Vollständige Dashboards für alle Rollen

## Status: In Progress
**Created:** 2026-07-31
**Last Updated:** 2026-08-01 (Implementation abgeschlossen — siehe Abschnitt "Implementation Notes")

## Dependencies
- Requires: PROJ-2 (Auth & Portal-Grundgerüst) — Portal-Shell, Rollenprüfung
- Requires: PROJ-11/17/18 (Benachrichtigungen) — Basis für die Aktivitäts-Vorschau bei Gemeinde/Kandidat
- Requires: PROJ-12 (Aktivitätenprotokoll Basis) — Basis für die Aktivitäts-Vorschau bei internem Personal
- Requires: PROJ-2 (Freischaltungen) — Anzahl ausstehender Konten für den internen Schnellzugriff

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich auf meinem Dashboard sofort sehen, was zuletzt im System passiert ist, damit ich nicht erst das Aktivitätenprotokoll separat öffnen muss.
- Als `dafinex_admin`/`internal_coordinator` möchte ich vom Dashboard aus direkt eine neue Gemeinde/einen neuen Kandidaten anlegen oder ausstehende Freischaltungen prüfen können, damit die häufigsten nächsten Schritte einen Klick entfernt sind.
- Als `dafinex_admin`/`internal_coordinator` möchte ich auf einen Blick sehen, wie sich alle Einsätze über die Statusstufen verteilen, damit ich den Gesamtüberblick habe, ohne die Einsatzliste zu filtern.
- Als `municipality`-Nutzer möchte ich auf meinem Dashboard meine letzten Benachrichtigungen, die Statusverteilung meiner eigenen Einsätze und einen direkten Weg zu "Neue Anfrage erstellen" sehen, damit das Dashboard ein echter Startpunkt ist, nicht nur eine Zahlenübersicht.
- Als `candidate` möchte ich auf meinem Dashboard meine letzten Benachrichtigungen sowie einen direkten Weg zu Profil/Dokumenten sehen, damit ich meinen Status auf einen Blick erfasse.
- Als jede/r Nutzer/in möchte ich einzelne Dashboard-Bereiche, die mich nicht interessieren, ausblenden können, damit mein Dashboard nur zeigt, was für mich relevant ist.
- Als Partnerfirmen-Kontakt (`partner_company`, Phase 2 vorbereitet) möchte ich beim Einloggen zumindest eine "Kommt bald"-Seite sehen statt eines Fehlers, falls mein Konto vorzeitig existiert.

## Out of Scope
- **Neue, von Benachrichtigungen unabhängige Aktivitäts-Tabelle für Gemeinde/Kandidat** — die Aktivitäts-Vorschau dieser beiden Rollen nutzt ausschliesslich die bereits bestehenden eigenen Benachrichtigungen (PROJ-11/17/18), keine neue Datenquelle
- **Frei anordenbare Widgets per Drag & Drop** — Reihenfolge bleibt fest, nur Ein-/Ausblenden ist konfigurierbar (siehe Product Decisions)
- **Inline-Erstellformulare direkt auf dem Dashboard** — die Schnellzugriffe verlinken auf die jeweils bestehende Seite mit dem bereits etablierten Erstell-Dialog (z.B. `/municipality/requests` für "Neue Anfrage"), keine Duplizierung der Formulare auf dem Dashboard selbst
- **Vollwertiges Partnerfirmen-Dashboard mit echten Daten/Kennzahlen** — die `partner_company`-Rolle hat laut PRD (Non-Goals: "Kein Partnerportal → Phase 2") noch keinen Login-Weg, kein Layout, kein Datenmodell; diese Spec liefert nur eine minimale Platzhalter-Seite, kein funktionales Dashboard. Ein vollwertiges Partner-Dashboard ist Teil von PROJ-13, sobald das Partnerportal selbst spezifiziert wird
- **Zeitverlaufs-Charts** (z.B. Anfragen pro Woche) — nur Status-Verteilung (Momentaufnahme), kein Zeitreihen-Aggregat für den Piloten
- **Chart auf dem Kandidaten-Dashboard** — zu wenig eigene Verlaufsdaten pro Kandidat, um ein aussagekräftiges Diagramm zu rechtfertigen
- **Echtzeit-Aktualisierung ohne Neuladen** — Dashboard-Inhalte werden beim Laden der Seite geholt, kein Realtime-Abo, konsistent mit dem Rest des Projekts

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion], dann [Ergebnis]

### Internes Dashboard (`/internal/dashboard`)
- [ ] Angenommen internes Personal öffnet das Dashboard, dann sieht es weiterhin die bestehenden Kennzahlen-Kacheln (Gemeinden, Kandidaten, Offene Anfragen) unverändert
- [ ] Angenommen internes Personal öffnet das Dashboard, dann sieht es zusätzlich eine Liste der letzten 5 Einträge aus dem Aktivitätenprotokoll, mit derselben deutschen Beschreibung wie auf `/internal/activity`
- [ ] Angenommen es gibt noch keine Aktivität, dann erscheint ein Hinweistext statt einer leeren Liste
- [ ] Angenommen internes Personal öffnet das Dashboard, dann sieht es drei Schnellzugriffe: „Neue Gemeinde", „Neuer Kandidat", „Freischaltungen" — Letzterer zeigt die Anzahl ausstehender Konten an, falls vorhanden
- [ ] Angenommen es gibt keine ausstehenden Freischaltungen, dann zeigt der Schnellzugriff keine Zahl an (oder „0"), führt aber weiterhin zur Freischaltungs-Seite
- [ ] Angenommen internes Personal öffnet das Dashboard, dann sieht es ein Diagramm mit der Verteilung aller Einsätze nach Status (proposed/accepted/active/completed)
- [ ] Angenommen es gibt noch keine Einsätze, dann zeigt das Diagramm einen Hinweistext statt eines leeren/fehlerhaften Charts

### Gemeinde-Dashboard (`/municipality/dashboard`)
- [ ] Angenommen ein `municipality`-Nutzer öffnet das Dashboard, dann sieht er weiterhin die bestehenden Kennzahlen-Kacheln unverändert
- [ ] Angenommen ein `municipality`-Nutzer öffnet das Dashboard, dann sieht er zusätzlich seine letzten 5 eigenen Benachrichtigungen (unabhängig von gelesen/ungelesen)
- [ ] Angenommen es gibt noch keine Benachrichtigungen, dann erscheint ein Hinweistext statt einer leeren Liste
- [ ] Angenommen ein `municipality`-Nutzer öffnet das Dashboard, dann sieht er einen Schnellzugriff „Neue Anfrage erstellen", der zu `/municipality/requests` führt
- [ ] Angenommen ein `municipality`-Nutzer öffnet das Dashboard, dann sieht er ein Diagramm mit der Statusverteilung ausschliesslich seiner eigenen Einsätze
- [ ] Angenommen die Gemeinde hat noch keine eigenen Einsätze, dann zeigt das Diagramm einen Hinweistext

### Kandidaten-Dashboard (`/candidate/dashboard`)
- [ ] Angenommen ein `candidate` öffnet das Dashboard, dann sieht er weiterhin die bestehenden Kennzahlen-Kacheln unverändert
- [ ] Angenommen ein `candidate` öffnet das Dashboard, dann sieht er zusätzlich seine letzten 5 eigenen Benachrichtigungen
- [ ] Angenommen es gibt noch keine Benachrichtigungen, dann erscheint ein Hinweistext statt einer leeren Liste
- [ ] Angenommen ein `candidate` öffnet das Dashboard, dann sieht er Schnellzugriffe „Profil bearbeiten" (→ `/candidate/profile`) und „Dokumente verwalten" (→ `/candidate/profile`, Dokumente-Bereich)

### Konfigurierbare Widgets (alle drei Dashboards)
- [ ] Angenommen ein Nutzer öffnet sein Dashboard, dann sieht er eine Möglichkeit ("Widgets anpassen"), jeden einzelnen Bereich (Kennzahlen/Aktivität/Chart/Schnellzugriffe, je nach Rolle) ein- oder auszublenden
- [ ] Angenommen ein Nutzer blendet ein Widget aus, dann bleibt diese Einstellung beim nächsten Login erhalten (pro Nutzer gespeichert)
- [ ] Angenommen alle Widgets eines Nutzers sind ausgeblendet, dann bleibt die "Widgets anpassen"-Möglichkeit trotzdem sichtbar, damit er sie wieder einblenden kann
- [ ] Angenommen ein Nutzer hat noch nie eine Einstellung geändert, dann sind standardmässig alle für seine Rolle vorgesehenen Widgets sichtbar

### Partnerfirmen-Platzhalterseite
- [ ] Angenommen ein Profil mit Rolle `partner_company` und Status `active` loggt sich ein, dann landet es auf einer eigenen Seite mit einem „Kommt bald"-Hinweistext statt einem Fehler oder einer falschen Weiterleitung
- [ ] Angenommen ein Profil mit Rolle `partner_company` und Status `pending`/`rejected` loggt sich ein, dann greift dieselbe Status-Weiterleitung wie bei den anderen Rollen (`/pending`/`/rejected`)

## Edge Cases
- Internes Aktivitätenprotokoll ist noch komplett leer (frisches System) → Hinweistext, kein Fehler
- Sehr viele ausstehende Freischaltungen (zweistellig) → Zahl wird trotzdem einfach angezeigt, keine Sonderbehandlung nötig (Pilot-Massstab)
- Gemeinde/Kandidat mit sehr vielen Benachrichtigungen → nur die letzten 5 werden angezeigt, „Alle anzeigen"-Link zu `/notifications` (PROJ-17) bleibt der Weg zur vollständigen Liste
- Eine Benachrichtigung wird direkt vom Dashboard aus angeklickt → führt zur jeweils verlinkten Seite (gleiches Verhalten wie in der Glocke, PROJ-17), Status wird dabei nicht automatisch als gelesen markiert (das Markieren bleibt der Glocke/`/notifications` vorbehalten, keine Dopplung der Logik)
- Internes Personal ohne jegliche Berechtigung für eine der drei Schnellzugriff-Zielseiten → kann praktisch nicht vorkommen, da alle drei Ziele bereits für jede aktive interne Rolle zugänglich sind (keine zusätzliche Rollenprüfung nötig)
- Gemeinde/intern hat nur Einsätze in genau einer Statusstufe → Diagramm zeigt trotzdem korrekt einen einzelnen Balken/ein Segment, keine Sonderbehandlung nötig
- `partner_company`-Profil existiert bereits (z.B. testweise von einem Super-Admin gesetzt), obwohl es aktuell keinen regulären Weg gibt, ein solches Konto anzulegen → Platzhalterseite verhindert zumindest einen Fehler/eine falsche Weiterleitung, falls das doch vorkommt
- Nutzer blendet ein Widget aus, öffnet das Dashboard dann in einem anderen Browser/Gerät → Einstellung ist pro Nutzer (nicht pro Gerät) gespeichert, gilt also überall gleich

## Technical Requirements (optional)
- Security: Keine neuen Schreibrechte — alle drei Dashboards lesen ausschliesslich bereits über RLS zugängliche, eigene Daten (Aktivitätenprotokoll bleibt intern-only, Benachrichtigungen bleiben strikt eigene)

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| "Vollständig" bedeutet: bestehende Kennzahlen + Aktivitäts-Vorschau + Schnellzugriffe, nicht nur mehr/andere Kennzahlen | Macht das Dashboard zu einem echten Startpunkt statt einer reinen Zahlenübersicht — direktes Nutzerfeedback in der Spec-Interview-Runde | 2026-07-31 |
| Aktivitäts-Vorschau für Gemeinde/Kandidat nutzt die bereits bestehenden eigenen Benachrichtigungen, keine neue Datenquelle | Das bestehende Aktivitätenprotokoll ist laut RLS ausschliesslich intern sichtbar; Benachrichtigungen decken für diese beiden Rollen bereits alle relevanten Ereignisse ab (PROJ-11/17/18), kein Grund für eine zusätzliche, parallele Datenstruktur | 2026-07-31 |
| Internes Dashboard nutzt das bestehende Aktivitätenprotokoll (PROJ-12), auf 5 Einträge begrenzt | Bereits vorhandene, vollständige Datenquelle für internes Personal, keine neue Tabelle nötig | 2026-07-31 |
| Schnellzugriffe sind reine Links zu bestehenden Seiten mit bereits etablierten Erstell-Dialogen, keine Inline-Formulare auf dem Dashboard | Vermeidet Dopplung der bereits bestehenden `PersonnelRequestFormDialog`/`CandidateFormDialog`/`MunicipalityFormDialog`-Komponenten | 2026-07-31 |
| Feste Schnellzugriffe pro Rolle (intern: Gemeinde/Kandidat anlegen + Freischaltungen; Gemeinde: neue Anfrage; Kandidat: Profil/Dokumente) statt konfigurierbarer Auswahl | Deckt die jeweils häufigste nächste Aktion pro Rolle ab, ohne die Komplexität einer anpassbaren Dashboard-Konfiguration für den Piloten | 2026-07-31 |
| Chart als Status-Verteilung (Momentaufnahme), nicht als Zeitverlauf | Direkt aus bereits vorhandenen Statuswerten ableitbar, kein Aggregations-Aufwand über Zeit; bei den bisher kleinen Datenmengen im Pilot ohnehin aussagekräftiger als ein Zeitverlauf | 2026-07-31 |
| Chart zeigt Einsätze nach Status (nicht Anfragen) | Vier sinnvolle Kategorien (proposed/accepted/active/completed) statt nur zwei bei Anfragen (created/reviewed) — visuell aussagekräftiger | 2026-07-31 |
| Kein Chart auf dem Kandidaten-Dashboard | Ein Kandidat hat typischerweise nur einen oder sehr wenige eigene Einsätze — zu wenig Datenpunkte für ein aussagekräftiges Diagramm | 2026-07-31 |
| Nutzer-Korrektur: Scope um Partnerfirmen-Platzhalterseite, Charts und konfigurierbare Widgets (Ein-/Ausblenden) erweitert | Ursprünglicher schlankerer Vorschlag wurde vom Nutzer explizit abgelehnt ("nicht so schlank") — alle drei Ergänzungen aufgenommen, mit Ausnahme des vollwertigen Partner-Dashboards (siehe unten) | 2026-07-31 |
| Partnerfirmen-Dashboard nur als Platzhalter-Seite, kein echtes Dashboard mit Daten | Kompromiss zwischen Nutzerwunsch und der expliziten PRD-Entscheidung "Kein Partnerportal → Phase 2": die Rolle hat noch keinen Login-Weg/kein Datenmodell; ein echtes Partner-Dashboard wäre faktisch der Start von PROJ-13 und damit ein deutlich grösseres, eigenes Feature, kein Bestandteil einer Dashboard-Spec | 2026-07-31 |
| Widget-Konfiguration: nur Ein-/Ausblenden, keine freie Anordnung per Drag & Drop | Deckt den Hauptbedarf ("ich will X nicht sehen") ab, ohne den deutlich höheren Aufwand einer Drag-and-Drop-Positionierung bei nur 3-4 Widgets pro Dashboard | 2026-07-31 |
| Widget-Sichtbarkeit wird pro Nutzer (nicht pro Gerät/Browser) gespeichert | Konsistentes Erlebnis über Geräte hinweg, passt zum bestehenden Muster (alle anderen Präferenzen/Daten sind ebenfalls an das Profil gebunden, nicht an ein Gerät) | 2026-07-31 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Neue Spalte `profiles.hidden_dashboard_widgets` (Text-Array, Default leer) statt einer eigenen Präferenz-Tabelle | Deckt "welche Widgets sind ausgeblendet" vollständig ab; additive Spalte auf einer bereits bestehenden, für jede Rolle zugänglichen Tabelle, gleiches Muster wie `personnel_requests.required_workload_percent` (PROJ-14) | 2026-07-31 |
| Widget-Sichtbarkeits-Update über eine einfache, selbst-scoped Server Action (`update({hidden_dashboard_widgets: [...]}).eq("id", auth.uid())`), keine neue RLS-Policy nötig | Die bestehende `profiles_update_own_limited`-Policy erlaubt bereits Selbst-Updates; die neue Spalte ist kein sicherheitsrelevantes Feld (Rolle/Status/Zuordnung bleiben durch die bestehende `WITH CHECK`-Klausel weiterhin geschützt) | 2026-07-31 |
| shadcn/ui Chart-Komponente (Recharts-Wrapper) statt einer rohen Recharts-Einbindung oder einer alternativen Bibliothek (z.B. Chart.js) | Konsistent mit dem "shadcn zuerst"-Grundsatz, einheitliches Look-and-Feel mit dem Rest der UI (Theming über CSS-Variablen) | 2026-07-31 |
| Status-Diagramm-Daten werden serverseitig beim Laden der Seite aggregiert (Anzahl je Status, eine kleine Datenbankabfrage), nicht clientseitig aus einer vollständigen Einsatzliste berechnet | Vermeidet unnötige Übertragung aller Einsatz-Datensätze nur für eine Zählung; passt zum bestehenden Muster von Kennzahlen-Kacheln, die ebenfalls serverseitig gezählt werden | 2026-07-31 |
| Partnerfirmen-Route (`/partner/dashboard`) folgt demselben Layout-/Rollenprüfungs-Muster wie die drei bestehenden Portale (eigenes `layout.tsx`, `getPortalPathForProfile` um einen `partner_company`-Zweig ergänzt) | Konsistenz mit dem etablierten Portal-Aufbau; verhindert, dass ein `partner_company`-Profil ins Leere (`/login`) läuft, falls die Rolle doch vorzeitig gesetzt wird | 2026-07-31 |



---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
Dashboard (intern / Gemeinde / Kandidat — dieselbe Grundstruktur, je nach
Rolle unterschiedliche Widgets)
├── "Widgets anpassen" (neu, immer sichtbar)
│     └── Kleines Auswahlmenü mit einem Schalter pro Widget dieser Rolle
├── Kennzahlen-Kacheln (bestehend, jetzt ausblendbar)
├── Aktivitäts-Vorschau (neu, ausblendbar)
│     ├── Intern: letzte 5 Einträge aus dem bestehenden Aktivitätenprotokoll
│     ├── Gemeinde/Kandidat: letzte 5 eigene Benachrichtigungen
│     └── Leerer Zustand ("Noch keine Aktivität")
├── Status-Diagramm (neu, nur intern + Gemeinde, ausblendbar)
│     ├── Intern: alle Einsätze nach Status
│     ├── Gemeinde: nur eigene Einsätze nach Status
│     └── Leerer Zustand, falls keine Einsätze vorhanden
└── Schnellzugriffe (neu, ausblendbar)
      ├── Intern: Neue Gemeinde / Neuer Kandidat / Freischaltungen (mit Anzahl)
      ├── Gemeinde: Neue Anfrage erstellen
      └── Kandidat: Profil bearbeiten / Dokumente verwalten

Partnerfirmen-Platzhalterseite (neuer, minimaler Portal-Zweig)
└── Eigene Seite mit "Kommt bald"-Hinweistext, kein Widget, keine Daten
```

### B) Data Model (plain language)

Keine neue Tabelle nötig — alle Inhalte (Kennzahlen, Aktivität, Status-Diagramm) werden aus bereits vorhandenen Daten (Aktivitätenprotokoll, Benachrichtigungen, Einsätze) zusammengestellt.

Eine kleine Ergänzung am bestehenden Profil ist nötig, um die Widget-Sichtbarkeit zu merken:

**Jedes Profil** bekommt zusätzlich:
- Liste der vom Nutzer ausgeblendeten Widget-Namen (leer, solange nichts ausgeblendet wurde)

### C) Tech Decisions (justified for PM)

1. **Diagramm-Bibliothek: Recharts über die bereits im Projekt genutzte shadcn/ui-Komponentenbibliothek.** shadcn/ui bietet eine fertige Chart-Komponente auf Basis von Recharts — passt zum bestehenden "shadcn zuerst"-Grundsatz des Projekts, kein neues, fremdes UI-System nötig.
2. **Widget-Sichtbarkeit als einfache Liste auf dem bestehenden Profil, statt einer eigenen Einstellungs-Tabelle.** Eine einzelne zusätzliche Spalte reicht für "welche Widgets sind ausgeblendet" vollständig aus — kleinstmögliche Erweiterung, gleiches Muster wie bereits mehrfach im Projekt verwendet (z.B. Pensum-Feld aus PROJ-14).
3. **Status-Diagramm ist eine Momentaufnahme, keine Zeitreihen-Auswertung.** Wird direkt aus den bereits vorhandenen Status-Werten der Einsätze berechnet, kein zusätzlicher Aggregations-/Speicherbedarf.
4. **Partnerfirmen-Seite als eigener, minimaler Portal-Zweig statt eines vollen Dashboards.** Reine Platzhalter-Seite ohne Datenanbindung — verhindert einen Fehler/eine falsche Weiterleitung, falls die Rolle vorzeitig vergeben wird, ohne den viel grösseren Aufwand eines echten Partner-Datenmodells vorwegzunehmen (das bleibt PROJ-13 vorbehalten).
5. **Aktivitäts-Vorschau und Schnellzugriffe nutzen ausschliesslich bereits bestehende Datenquellen/Seiten** (Aktivitätenprotokoll, Benachrichtigungen, bestehende Erstell-Dialoge) — kein neuer Schreibpfad, nur zusätzliche Lesezugriffe beim Laden der Seite.

### D) Dependencies (packages to install)
- `recharts` (+ die shadcn/ui-Chart-Komponente, die darauf aufbaut) — für die beiden Status-Diagramme

## Implementation Notes

### Datenbank
- Migration `20260801090000_dashboard_widget_visibility.sql`: eine neue Spalte `profiles.hidden_dashboard_widgets` (Text-Array, Default leer). Keine RLS-Änderung nötig — die bestehende `profiles_update_own_limited`-Policy erlaubt Selbst-Updates bereits, und die neue Spalte ist nicht Teil der bestehenden `WITH CHECK`-Einschränkungen (Rolle/Status/Zuordnung).

### Anwendungscode
- Neue Pakete: `recharts` + die shadcn/ui-`chart`-Komponente (`src/components/ui/chart.tsx`).
- `src/lib/dashboard/widget-keys.ts`: gemeinsame Widget-Schlüssel/-Labels (`stats`/`activity`/`chart`/`quickActions`) und `isWidgetVisible()`.
- `src/lib/dashboard/load-activity-preview.ts`: letzte 5 Aktivitätenprotokoll-Einträge (intern), nutzt dieselbe `describeActivity()`-Beschriftung wie `/internal/activity`.
- `src/lib/dashboard/load-assignment-status-distribution.ts`: zählt Einsätze je Status — bewusst ohne expliziten Gemeinde-Filter, RLS (`assignments_select`) skaliert die Zählung für Gemeinde-Aufrufer automatisch korrekt auf die eigenen Einsätze, exakt wie die bereits bestehenden Kennzahlen-Kacheln.
- Neue Server Action `src/app/dashboard-preferences/actions.ts` (`updateHiddenDashboardWidgets`): selbst-scoped Update auf das eigene Profil.
- Neue UI-Bausteine: `dashboard-widget-toggle.tsx` (Popover mit Checkboxen, persistiert sofort bei jedem Toggle), `dashboard-activity-list.tsx`, `dashboard-quick-actions.tsx`, `status-distribution-chart.tsx` (Balkendiagramm über die shadcn-Chart-Komponente).
- `getCurrentProfile()` (`src/lib/auth/get-current-profile.ts`) liefert jetzt zusätzlich `hiddenDashboardWidgets`; `getPortalPathForProfile()` um einen `partner_company`-Zweig ergänzt (→ `/partner/dashboard`).
- Neuer, minimaler Portal-Zweig `src/app/partner/` (`layout.tsx` + `dashboard/page.tsx`): reine Platzhalter-Seite ohne Datenanbindung, gleiches Rollenprüfungs-Muster wie die drei bestehenden Portale.
- Alle drei bestehenden Dashboard-Seiten (`internal`/`municipality`/`candidate`) erweitert: bestehende Kennzahlen-Kacheln bleiben unverändert, neu je nach Rolle Aktivitäts-Vorschau, Status-Diagramm (nicht bei Kandidat) und Schnellzugriffe, alle über den Widget-Toggle ein-/ausblendbar.

### Verifikation
- `npx eslint` (alle neuen/geänderten Dateien): keine Fehler
- `npx vitest run`: 157/157 Tests grün (5 neu: `isWidgetVisible`, `updateHiddenDashboardWidgets`)
- `npm run build`: erfolgreich, alle Routen (inkl. neuer `/partner/dashboard`-Route) kompilieren

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
