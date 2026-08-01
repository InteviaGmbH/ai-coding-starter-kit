# PROJ-15: Digitale Multi-Party-Signaturen mit Protokollierung

## Status: Planned
**Created:** 2026-08-01
**Last Updated:** 2026-08-01

## Dependencies
- Requires: PROJ-10 (Einfache Vertragsgenerierung) — bestehendes Vertragsmodell (`contracts`: generated/signed), das um digitale Mehrparteien-Unterschriften erweitert wird
- Requires: PROJ-9 (Einsatzverwaltung) — Einsatz liefert die Zuordnung zu Gemeinde und Kandidat, damit die drei Parteien eindeutig bestimmt sind
- Requires: PROJ-20 (Kandidatenportal-Selbstverwaltung) — Kandidat kann nur digital unterschreiben, wenn er ein eigenes Portal-Konto hat
- Requires: PROJ-11/17/18 (Benachrichtigungen) — neue Unterschrifts-Benachrichtigungen nutzen die bestehende Infrastruktur
- Requires: PROJ-12 (Aktivitätenprotokoll Basis) — jede Unterschrift erscheint als Eintrag

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich einen Vertrag direkt im Portal digital unterschreiben können, statt ihn auszudrucken und wieder hochzuladen.
- Als `municipality`-Nutzer möchte ich den Vertrag meines Einsatzes direkt in meinem Portal digital unterschreiben können.
- Als `candidate` mit eigenem Konto möchte ich denselben Vertrag ebenfalls direkt in meinem Portal digital unterschreiben können.
- Als `dafinex_admin`/`internal_coordinator` möchte ich für einen Kandidaten ohne eigenes Portal-Konto weiterhin eine offline unterschriebene Kopie hochladen können, damit dieser Fall niemanden blockiert.
- Als jede beteiligte Partei möchte ich jederzeit nachvollziehen können, wer wann (und wie) unterschrieben hat, damit der Vertragsabschluss lückenlos dokumentiert ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich auf einen Blick sehen, welche Partei(en) noch nicht unterschrieben haben, damit ich bei Bedarf nachfassen kann.

## Out of Scope
- **Qualifizierte elektronische Signatur über einen Drittanbieter** (z.B. Skribble, Swisscom Signing Service, DocuSign) — würde neues Budget, einen neuen Vertrag mit einem Drittanbieter und eine neue API-Integration erfordern; diese Spec liefert eine einfache elektronische Signatur (Namenseingabe + Zustimmung + Protokollierung von Zeitpunkt/IP/Browser), rechtlich nach Schweizer OR für die meisten Vertragsarten ausreichend, aber nicht ZertES-qualifiziert
- **Automatisch generiertes PDF mit eingebetteten Signatur-Blöcken** — das bereits bestehende, generierte Vertrags-PDF (PROJ-10) bleibt unverändert; der Unterschriften-Nachweis wird als strukturiertes Protokoll in der App angezeigt, kein PDF-Bearbeitungswerkzeug
- **Feste Signatur-Reihenfolge/Workflow-Gating** (z.B. "erst Dafinex, dann Gemeinde, dann Kandidat") — alle drei Parteien können unabhängig voneinander unterschreiben, sobald der Vertrag existiert
- **Bearbeiten oder Widerrufen einer bereits geleisteten Unterschrift** — Unterschriften sind unveränderlich, sobald abgegeben (Protokollierungs-Integrität)
- **E-Mail-Benachrichtigung an externe, nicht eingeloggte Unterzeichner** — bleibt ausschliesslich In-App (bestehende `notifications`-Infrastruktur), kein E-Mail-Versand
- **Mehrere Vertragsversionen/Nachträge pro Einsatz** — weiterhin genau ein Vertrag pro Einsatz, wie in PROJ-10 festgelegt
- **Stornierungs-/Rückabwicklungs-Workflow, falls ein Einsatz nach Teil-Unterschriften abgebrochen wird** — kein solcher Workflow existiert in PROJ-9/10, ausserhalb des Scopes dieser Spec

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion], dann [Ergebnis]

### Digitale Unterschrift (Dafinex, Gemeinde, Kandidat mit Konto)
- [ ] Angenommen ein Vertrag hat Status „generated", wenn eine berechtigte Partei die Vertragsseite öffnet, dann sieht sie für ihren eigenen Anteil einen Bereich „Unterschreiben" mit einem Link zum Vertrags-PDF, einem mit dem eigenen Namen vorausgefüllten Namensfeld und einer Zustimmungs-Checkbox
- [ ] Angenommen eine Partei hat ihren Anteil noch nicht unterschrieben, wenn sie den Namen bestätigt, die Checkbox aktiviert und „Digital unterschreiben" klickt, dann wird ihre Unterschrift mit Zeitpunkt, IP-Adresse und Browser-Kennung gespeichert
- [ ] Angenommen eine Partei hat bereits unterschrieben, dann zeigt die Seite für ihren Anteil „Unterschrieben am [Datum] von [Name]" statt des Formulars, unveränderlich
- [ ] Angenommen die Zustimmungs-Checkbox ist nicht aktiviert oder das Namensfeld ist leer, wenn „Digital unterschreiben" geklickt wird, dann erscheint eine Validierungsfehlermeldung
- [ ] Angenommen alle drei Parteien haben ihren Anteil abgeschlossen (digital oder per Fallback), dann wechselt der Vertragsstatus automatisch auf „signed"

### Fallback für Kandidaten ohne Portal-Konto
- [ ] Angenommen ein Kandidat hat kein eigenes Portal-Konto, dann zeigt der Kandidaten-Anteil für internes Personal einen Datei-Upload (wie bisher aus PROJ-10) statt einer digitalen Unterschrifts-Möglichkeit
- [ ] Angenommen internes Personal lädt für einen kontolosen Kandidaten eine unterschriebene Kopie hoch, dann gilt dessen Anteil als abgeschlossen, unabhängig vom Fortschritt der anderen beiden Parteien
- [ ] Angenommen ein Kandidat erhält nachträglich ein Konto, nachdem sein Anteil bereits per Fallback abgeschlossen wurde, dann bleibt der Fallback-Eintrag gültig — keine zusätzliche digitale Unterschrift für denselben Anteil möglich

### Protokollierung / Audit-Trail
- [ ] Angenommen mindestens eine Partei hat ihren Anteil abgeschlossen, dann zeigt die Vertragsseite eine Übersicht mit je Partei: Status (offen/abgeschlossen), Name, Zeitpunkt, Methode (digital/Datei-Upload)
- [ ] Angenommen eine Partei schliesst ihren Anteil ab (digital oder per Fallback), dann erscheint dazu ein Eintrag im bestehenden Aktivitätenprotokoll (PROJ-12)

### Zugriffsschutz
- [ ] Angenommen eine Gemeinde versucht, den Anteil des Kandidaten oder von Dafinex digital zu unterschreiben, dann wird das verweigert — jede Partei kann ausschliesslich ihren eigenen Anteil abschliessen
- [ ] Angenommen ein Kandidat versucht, den Vertrag eines fremden Einsatzes zu unterschreiben, dann wird der Zugriff verweigert (bestehende Zugriffsgrenzen aus PROJ-10 gelten unverändert weiter)

### Benachrichtigung
- [ ] Angenommen eine Partei schliesst ihren Anteil ab, dann werden die jeweils anderen beiden Parteien benachrichtigt
- [ ] Angenommen alle drei Parteien haben abgeschlossen, dann erhalten Gemeinde und Kandidat (falls vorhanden) je eine „Vertrag vollständig unterschrieben"-Benachrichtigung (ersetzt den bisherigen, einfacheren PROJ-18-„Vertrag unterschrieben"-Trigger für denselben Übergang)

## Edge Cases
- Vertrag hat noch nicht den Status „generated" (noch nicht erstellt) → keine Unterschriften-Möglichkeit sichtbar, konsistent mit dem bestehenden PROJ-10-Verhalten
- Zwei Parteien schliessen ihren jeweiligen Anteil gleichzeitig ab → unabhängige Datensätze pro Partei, kein Konflikt möglich
- Interner Nutzer, der unterschrieben hat, wird später deaktiviert/die Rolle geändert → die historische Unterschrift bleibt unverändert bestehen (Protokollierung darf nicht rückwirkend verändert werden)
- Alle drei Parteien versuchen, gleichzeitig als letzte den Vertrag zu „vervollständigen" → Status wechselt genau einmal zu „signed", keine doppelte Abschluss-Benachrichtigung
- Vertrag wurde bereits vollständig unterschrieben, ein Nutzer ruft die Unterschriften-Seite erneut auf → zeigt weiterhin die vollständige, unveränderliche Übersicht, kein erneutes Unterschreiben möglich

## Technical Requirements (optional)
- Security: Jede Partei darf ausschliesslich ihren eigenen Anteil abschliessen — serverseitige Rollen-/Zuordnungsprüfung, RLS als zweite Verteidigungslinie (analog zum Rest des Projekts)
- Protokollierung: Zeitpunkt, IP-Adresse und Browser-Kennung werden serverseitig erfasst (nicht vom Client übermittelt), um Manipulation auszuschliessen

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PRD-Non-Goal "Keine digitalen Multi-Party-Signaturen (Phase 1)" wird für diese Spec bewusst aufgehoben | Explizite Nutzeranweisung, PROJ-15 jetzt umzusetzen; in PROJ-10 bereits als "später"-Abhängigkeit vorgesehen | 2026-08-01 |
| Einfache elektronische Signatur (Namenseingabe + Zustimmung + Protokollierung), keine qualifizierte Signatur über Drittanbieter | Kein Budget/Vertrag für einen Signatur-Dienstleister im Projekt vorgesehen; einfache elektronische Signatur ist nach Schweizer OR für die meisten Vertragsarten ausreichend und ohne neue Abhängigkeit umsetzbar | 2026-08-01 |
| Drei unterzeichnende Parteien: Dafinex, Gemeinde, Kandidat | Bildet alle drei am Einsatz beteiligten Parteien ab, passend zum Namen "Multi-Party"; Dafinex unterschreibt intern (zuständiger Koordinator), Gemeinde/Kandidat je im eigenen Portal | 2026-08-01 |
| Beliebige Reihenfolge, alle Parteien unabhängig | Einfacher umzusetzen als ein Freigabe-Workflow mit fester Reihenfolge; kein Zustand für "wer ist als nächstes dran" nötig | 2026-08-01 |
| Fallback (Datei-Upload durch internes Personal) ausschliesslich für Kandidaten ohne Portal-Konto | Dafinex und Gemeinde haben an diesem Punkt im Prozess immer bereits ein aktives Konto; nur der Kandidat kann kontolos sein (intern erfasste Kandidaten, `source_type: dafinex`) — niemand soll vom Vertragsabschluss blockiert werden | 2026-08-01 |
| Kein automatisch generiertes PDF mit Signatur-Blöcken, stattdessen strukturierter Nachweis in der App | Deutlich weniger Aufwand als eine PDF-Bearbeitungsbibliothek einzuführen; das Original-PDF aus PROJ-10 bleibt unverändert | 2026-08-01 |
| Unterschriften sind unveränderlich, kein Widerruf | Protokollierungs-Integrität — eine korrigierbare/löschbare "Unterschrift" würde den Audit-Trail-Zweck untergraben | 2026-08-01 |
| Neue "Vertrag vollständig unterschrieben"-Benachrichtigung ersetzt den bisherigen, einfacheren PROJ-18-Trigger für denselben Übergang (generated → signed) | Der alte Trigger ging vom alten Ein-Schritt-Upload-Modell aus; mit drei unabhängigen Anteilen ist "vollständig unterschrieben" jetzt ein eigener, aussagekräftigerer Zeitpunkt | 2026-08-01 |

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
