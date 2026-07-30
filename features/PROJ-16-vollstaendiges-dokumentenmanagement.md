# PROJ-16: Vollständiges Dokumentenmanagement (Versionierung, Ablauf, Archivierung)

## Status: Planned
**Created:** 2026-07-30
**Last Updated:** 2026-07-30

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Storage, RLS
- Requires: PROJ-4 (Kandidatenverwaltung) — interne Kandidatenverwaltung, bestehendes CV-Slot-Muster
- Requires: PROJ-20 (Kandidatenportal-Selbstverwaltung) — Kandidat kann bereits sein eigenes CV ersetzen; diese Spec erweitert das um Versionierung und weitere Dokumenttypen
- Enables: PROJ-18 (Alle Benachrichtigungstrigger) — liefert das Ablaufdatum-Feld, auf dem ein späterer automatischer Erinnerungs-Trigger aufbauen kann

## User Stories
- Als Kandidat möchte ich mehrere Dokumenttypen (CV, Zertifikate, Arbeitsbewilligung) hochladen und verwalten können, damit meine vollständigen Unterlagen für Dafinex und Gemeinden verfügbar sind.
- Als Kandidat möchte ich mehrere Zertifikate gleichzeitig hinterlegen können, damit ich nicht nur eines abbilden kann (z.B. SVEB-Zertifikat UND Erste-Hilfe-Kurs).
- Als Kandidat/internes Personal möchte ich beim Ersetzen eines Dokuments die alte Version nicht verlieren, sondern sie weiterhin einsehen können, damit nichts verloren geht.
- Als internes Personal möchte ich sehen, wann ein Dokument (z.B. Arbeitsbewilligung, Zertifikat) abläuft, damit ich rechtzeitig handeln kann.
- Als Kandidat/internes Personal möchte ich ein nicht mehr relevantes Dokument archivieren können, ohne es zu löschen, damit die aktuelle Ansicht übersichtlich bleibt.

## Out of Scope
- **Verträge** — bleiben vollständig beim bestehenden Zwei-Slot-Modell aus PROJ-10 (generiert/unterschrieben); eigener, funktionierender Prozess mit eigener Statuslogik, nicht Teil dieser Vereinheitlichung
- **Automatische Ablauf-Benachrichtigung** — PROJ-16 liefert nur das Ablaufdatum-Feld + einen visuellen Warn-Hinweis; ein automatischer Erinnerungs-Trigger (z.B. E-Mail/In-App-Benachrichtigung X Tage vor Ablauf) ist Teil von PROJ-18
- **Freie, beliebig benannte Dokumente** — nur die drei festen Typen CV, Zertifikat (wiederholbar), Arbeitsbewilligung; kein allgemeiner Datei-Manager
- **Versionslimit / automatisches Aufräumen alter Versionen** — keine Obergrenze, keine automatische Löschung; reine Speicherplatz-Optimierung ist für den Pilot-Massstab nicht relevant
- **Gemeinde-Dokumente** — diese Spec betrifft ausschliesslich Kandidaten-Dokumente

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Dokumenttypen & Struktur
- [ ] Angenommen ein Kandidat oder internes Personal öffnet die Dokumentenverwaltung eines Kandidaten, dann sieht er drei Bereiche: CV, Zertifikate, Arbeitsbewilligung
- [ ] Angenommen im Bereich Zertifikate, wenn ein neues Zertifikat mit eigenem Namen hinzugefügt wird, dann erscheint es als zusätzlicher, unabhängiger Eintrag neben bestehenden Zertifikaten (keine Ersetzung)
- [ ] Angenommen CV oder Arbeitsbewilligung, wenn eine neue Version hochgeladen wird, dann ersetzt sie die vorherige als "aktuell", die alte wird automatisch archiviert (nicht gelöscht)

### Versionierung
- [ ] Angenommen ein Dokument (CV/Zertifikat/Arbeitsbewilligung) hat mehrere Versionen, dann ist die aktuelle Version klar gekennzeichnet und alle älteren Versionen sind unter "Archiviert" mit Upload-Datum einsehbar und herunterladbar
- [ ] Angenommen eine archivierte Version wird heruntergeladen, dann ist es dieselbe Datei wie zum ursprünglichen Upload-Zeitpunkt (kein Datenverlust, keine Überschreibung)

### Ablaufdatum
- [ ] Angenommen ein Dokument wird hochgeladen, dann kann optional ein Ablaufdatum hinterlegt werden
- [ ] Angenommen ein Ablaufdatum liegt vor dem heutigen Datum, wenn es gespeichert werden soll, dann erscheint eine Validierungsfehlermeldung
- [ ] Angenommen ein Dokument hat ein Ablaufdatum, das innerhalb der nächsten 30 Tage liegt, dann wird ein "Läuft bald ab"-Hinweis angezeigt
- [ ] Angenommen das Ablaufdatum eines Dokuments liegt in der Vergangenheit, dann wird ein "Abgelaufen"-Hinweis statt "Läuft bald ab" angezeigt

### Manuelles Archivieren
- [ ] Angenommen ein aktuelles Dokument existiert, wenn der Nutzer "Archivieren" wählt und bestätigt, dann verschwindet es aus der aktuellen Ansicht und ist unter "Archiviert" weiterhin einsehbar — ohne dass eine neue Version hochgeladen wurde
- [ ] Angenommen ein CV oder eine Arbeitsbewilligung wurde ohne Ersatz archiviert, dann zeigt der aktuelle Bereich einen Hinweistext ("Kein aktuelles Dokument") statt eines Fehlers

### Berechtigungen
- [ ] Angenommen ein Kandidat ist eingeloggt, dann kann er ausschliesslich seine eigenen Dokumente verwalten
- [ ] Angenommen internes Personal (`dafinex_admin`/`internal_coordinator`) ist eingeloggt, dann kann es die Dokumente jedes Kandidaten verwalten
- [ ] Angenommen eine Gemeinde oder ein anderer Kandidat versucht, auf fremde Kandidaten-Dokumente zuzugreifen, dann wird der Zugriff verweigert

### Validierung
- [ ] Angenommen eine Datei mit nicht unterstütztem Format oder über dem Grössenlimit wird hochgeladen, dann wird der Upload abgelehnt und eine Fehlermeldung angezeigt (PDF/JPEG/PNG, max. 10 MB, bestehende Konvention)
- [ ] Angenommen ein neues Zertifikat wird ohne Namen hinzugefügt, wenn gespeichert wird, dann erscheint eine Validierungsfehlermeldung

## Edge Cases
- Kandidat hat noch gar keine Dokumente → alle drei Bereiche zeigen einen leeren Zustand statt eines Fehlers
- Gleichzeitiges Hochladen durch Kandidat und internes Personal für denselben Dokumenttyp → Last write wins, konsistent mit der bereits etablierten Projekt-Konvention (PROJ-3/4/20)
- Sehr viele Versionen eines Dokuments über die Zeit → kein Limit, Performance nicht Teil dieser Spec (Pilot-Massstab, wie bereits in PROJ-4/6 entschieden)
- Netzwerkabbruch während des Uploads → alte aktuelle Version bleibt gültig, kein Teil-Upload wird übernommen (Konvention aus PROJ-1/20)
- Ein Zertifikat-Eintrag ohne jemals hochgeladene Datei (nur Name+Ablaufdatum ohne Datei) → nicht zulässig, ein Dokument-Eintrag erfordert immer eine Datei

## Technical Requirements (optional)
- Security: Schreiboperationen serverseitig per Zod validiert; RLS als zweite Verteidigungslinie, analog PROJ-1/20
- Wiederverwendung des bestehenden `candidate-documents`-Storage-Buckets und Upload-Verhaltens (Dateiformat/-grösse) aus PROJ-4/20

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Umfang beschränkt auf Kandidaten-Dokumente, Verträge bleiben unverändert | Verträge sind ein eigener, funktionierender Prozess mit eigener Statuslogik (PROJ-10); Kandidaten-Dokumente sind der explizit in PROJ-4/20 als "später" vermerkte nächste Ausbauschritt | 2026-07-30 |
| Drei feste Dokumenttypen (CV, Zertifikat, Arbeitsbewilligung) statt freier Dokumentliste | Vorhersehbarer, leichter durchsuchbar; passt zum bestehenden CV-Slot-Muster, das hier um Versionierung erweitert wird | 2026-07-30 |
| Zertifikat ist wiederholbar (mehrere gleichzeitig aktive, frei benannte Einträge); CV und Arbeitsbewilligung bleiben je ein aktueller Slot mit Historie | Ein Kandidat hat oft mehrere gleichzeitig gültige Zertifikate (z.B. SVEB + Erste-Hilfe) — das ist etwas anderes als eine ersetzende CV-Version | 2026-07-30 |
| Sowohl Kandidat als auch internes Personal können Dokumente verwalten, dieselbe Rechteaufteilung wie bisher | Konsistente Fortführung von PROJ-4 (intern) und PROJ-20 (Kandidat-Selbstverwaltung); kein neuer Berechtigungsmechanismus nötig | 2026-07-30 |
| Ablaufdatum löst in dieser Spec nur einen visuellen Hinweis aus, keine automatische Benachrichtigung | Automatische Erinnerungen sind Kernumfang von PROJ-18 (nächstes Feature in dieser Reihe) — keine Doppelarbeit, klare Abgrenzung | 2026-07-30 |
| Manuelles Archivieren ohne Ersatz-Upload möglich | V.a. bei Zertifikaten relevant (ein nicht mehr gültiges Zertifikat soll aus der aktuellen Ansicht verschwinden können, auch ohne dass ein neues hochgeladen wird) | 2026-07-30 |
| Kein Versionslimit, keine automatische Löschung alter Versionen | Pilot-Massstab, kein Speicherplatz-/Performance-Problem zu erwarten | 2026-07-30 |
| Dateiformat/-grösse bleibt wie bisher (PDF/JPEG/PNG, max. 10 MB) | Konsistenz mit bereits etablierter Konvention aus PROJ-4/20, kein Grund für Abweichung | 2026-07-30 |

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
