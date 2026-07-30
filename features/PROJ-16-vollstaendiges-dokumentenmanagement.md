# PROJ-16: Vollständiges Dokumentenmanagement (Versionierung, Ablauf, Archivierung)

## Status: In Progress
**Created:** 2026-07-30
**Last Updated:** 2026-07-30 (Implementation abgeschlossen — siehe Abschnitt "Implementation Notes")

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
| Zwei neue Tabellen statt einer: "Dokument" (Typ/Name/archiviert) getrennt von "Dokument-Version" (Datei/Datum/Ablauf) | Trennt sauber "was ist das für ein Dokument" von "welche Datei-Version gehört dazu" — ermöglicht Versionierung ohne die Übersichtlichkeit zu verlieren | 2026-07-30 |
| CV/Arbeitsbewilligung: genau ein Dokument-Eintrag pro Kandidat und Typ (durchgesetzt beim Anlegen); Zertifikate: beliebig viele | Setzt die Produktentscheidung technisch um, ohne die Datenmodell-Komplexität für CV/Arbeitsbewilligung unnötig zu erhöhen | 2026-07-30 |
| Wiederverwendung des bestehenden `candidate-documents`-Storage-Buckets, nur mit strukturierteren Pfaden pro Dokument-Version statt einer einzigen Datei pro Kandidat | Kein neuer Speicherort nötig, bestehende Storage-RLS-Grundlage (PROJ-1/20) bleibt die Basis | 2026-07-30 |
| Gemeinsame UI-Bausteine für Kandidatenportal (PROJ-20) und interne Kandidatenverwaltung (PROJ-4), analog zur bisherigen einfachen Dokument-Karte | Vermeidet Doppelarbeit und stellt sicher, dass sich beide Ansichten gleich verhalten | 2026-07-30 |
| Ablauf-Warnung wird bei jedem Seitenaufruf clientseitig anhand des aktuellen Datums berechnet, nicht in der Datenbank vorberechnet/gespeichert | Einfacher, kein Hintergrundjob nötig; passt dazu, dass die automatische Benachrichtigung erst PROJ-18 liefert | 2026-07-30 |
| Bestehende shadcn-Komponenten (`Accordion`/`Collapsible`, `AlertDialog` für die Archivieren-Bestätigung) wiederverwenden | Bereits im Projekt installiert, kein neues Paket nötig | 2026-07-30 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
Kandidaten-Dokumente (neuer, gemeinsam genutzter Bereich)
├── Im Kandidatenportal (/candidate/profile) — ersetzt die bisherige einfache Dokument-Karte
└── In der internen Kandidatenverwaltung (/internal/candidates/[id]) — ersetzt dieselbe bisherige Karte

Aufbau (identisch an beiden Orten):
├── CV                    ein aktueller Slot (Upload/Ersatz, Download) +
│                          aufklappbare "Frühere Versionen" (Datum + Download)
├── Arbeitsbewilligung     wie CV, zusätzlich Ablaufdatum-Feld + Warn-Badge
│                          ("Läuft bald ab" / "Abgelaufen")
└── Zertifikate            Liste beliebig vieler benannter Einträge, je mit:
                            eigenem aktuellen Slot, Ablaufdatum + Warn-Badge,
                            aufklappbarer Historie, "Archivieren"-Aktion
                            (mit Bestätigungsdialog) und "+ Neues Zertifikat"

Jeder Slot/Eintrag (CV, Arbeitsbewilligung, jedes einzelne Zertifikat) bietet:
Datei hochladen (ersetzt aktuelle Version → alte wird automatisch archiviert),
Ablaufdatum setzen (optional), frühere Versionen einsehen/herunterladen,
manuell archivieren (auch ohne Ersatz-Upload)
```

### B) Data Model (plain language)

Zwei neue, zusammengehörige Informationseinheiten:

**Ein Dokument** (z.B. "CV von Kandidat X" oder "SVEB-Zertifikat von Kandidat X") hat:
- Zugehöriger Kandidat
- Typ (CV / Zertifikat / Arbeitsbewilligung)
- Name (bei Zertifikaten frei wählbar, bei CV/Arbeitsbewilligung fest vergeben)
- Manuell archiviert? (ja/nein)

**Jede hochgeladene Datei-Version** eines Dokuments hat:
- Zugehöriges Dokument
- Die Datei selbst
- Hochgeladen am
- Ablaufdatum (optional)
- Ist dies die aktuell gültige Version?

Gespeichert in: bestehende Supabase-Datenbank (zwei neue, verknüpfte Tabellen) + der bereits bestehende `candidate-documents`-Storage-Bucket aus PROJ-1 (jetzt mit mehreren Dateien pro Kandidat statt einer einzigen).

### C) Tech Decisions (justified for PM)

1. **Zwei getrennte Tabellen statt einer.** Eine Tabelle beschreibt "was für ein Dokument ist das", die andere "welche Datei-Versionen gehören dazu". Das trennt die Frage "ist das Dokument archiviert?" sauber von "welche Version ist gerade aktuell?" — beides kann unabhängig voneinander gelten.
2. **CV/Arbeitsbewilligung bleiben Einzelstücke, Zertifikate sind wiederholbar.** Technisch wird beim Anlegen sichergestellt, dass ein Kandidat nur ein CV und eine Arbeitsbewilligung hat, aber beliebig viele Zertifikate — genau wie in der Spec festgelegt.
3. **Bestehender Speicherort wird weiterverwendet.** Es gibt keinen neuen Speicherort/Bucket, nur eine strukturiertere Ablage mit mehreren Dateien statt einer.
4. **Ein gemeinsamer Baustein für beide Oberflächen.** Kandidatenportal und interne Kandidatenverwaltung zeigen exakt dieselbe Komponente — spart Aufwand und garantiert gleiches Verhalten.
5. **Keine neuen Pakete.** Alle benötigten UI-Bausteine (aufklappbare Listen, Bestätigungsdialog für "Archivieren") sind bereits im Projekt vorhanden.

### D) Dependencies (packages to install)
- Keine neuen Pakete — nutzt bereits installierte shadcn-Komponenten (`Accordion`/`Collapsible`, `AlertDialog`, `Input`, `Badge`)

## Implementation Notes

### Datenbank
- Migration `20260730100000_candidate_document_management.sql`: neue Tabellen `candidate_documents` (Typ/Name/archiviert) und `candidate_document_versions` (Datei/Datum/Ablauf/aktuell), je mit RLS (Kandidat sieht nur eigene Dokumente, internes Personal sieht alle).
- Partial-Unique-Index setzt "genau ein Dokument pro Kandidat und Typ" für `cv`/`work_permit` durch; Zertifikate bleiben unbeschränkt wiederholbar.
- Partial-Unique-Index setzt "genau eine aktuelle Version pro Dokument" durch (`is_current`).
- `candidate_document_belongs_to_caller()` als SECURITY DEFINER-Hilfsfunktion, um RLS-Rekursion zwischen den beiden neuen Tabellen zu vermeiden (etabliertes Muster aus PROJ-20).
- Spalten-Lockdown-Trigger je Tabelle, analog zu PROJ-20, verhindern dass ein Kandidat fremde Spalten (z.B. `is_sample`) verändert.
- Neue, nicht-SECURITY-DEFINER RPC `save_candidate_document_version(...)` kapselt "Dokument finden-oder-anlegen, alte Version auf `is_current=false` setzen, neue Version einfügen" atomar in einer Transaktion — sowohl vom Kandidatenportal als auch von der internen Verwaltung als auch bei der Registrierung genutzt.
- Einmaliges Backfill aus den alten Feldern `candidates.cv_document_path`/`cv_uploaded_at` in die neuen Tabellen; alte Felder bewusst NICHT gelöscht (Sicherheitsnetz).

### Anwendungscode
- `src/lib/matching` unverändert; neue Logik unter `src/lib/candidateDocuments/` (Schema, Ablauf-Berechnung `getExpiryStatus`, Server-Loader `loadCandidateDocuments`).
- Neue Server Actions: `src/app/candidate/documents/actions.ts` (Kandidat verwaltet eigene Dokumente) und `src/app/internal/candidates/documents-actions.ts` (internes Personal verwaltet beliebige Kandidaten-Dokumente).
- Neue UI-Bausteine (gemeinsam genutzt von Kandidatenportal und interner Verwaltung): `candidate-document-slot.tsx` (CV/Arbeitsbewilligung/einzelnes Zertifikat inkl. Upload, Ablauf-Badge, Versionshistorie, Archivieren), `candidate-archived-documents.tsx`, `add-certificate-form.tsx`, `candidate-documents-manager.tsx` (Orchestrierung).
- `/candidate/profile` und `/internal/candidates/[id]` nutzen jetzt `CandidateDocumentsManager` statt der alten einfachen Dokument-Karte (gelöscht: `candidate-document-card.tsx`).
- Bestehende, unabhängige Selbstangabe-Zertifikate (Kurzliste als Text, PROJ-20) bleiben unverändert bestehen; UI-Texte an beiden Stellen ergänzt, um die Abgrenzung zu den neuen datei-basierten Zertifikaten klarzustellen.
- Registrierungsformular (`candidate-register-form.tsx`) lädt den initialen CV jetzt direkt über die neue RPC hoch statt über das alte Feld.

### Nachträglich entdeckte und behobene Regression
- Nach Abschluss der Kernarbeit ergab eine abschliessende Suche nach verbleibenden Referenzen auf `cv_document_path`/`cv_uploaded_at`, dass die interne Freischaltungs-Seite (`/internal/approvals`, aus PROJ-2) noch das alte Feld abfragte, um anzuzeigen, ob ein neu registrierter Kandidat ein CV hochgeladen hat. Da die Registrierung jetzt in die neuen Tabellen schreibt, hätte dieser Hinweis für jede neue Registrierung fälschlich "kein Dokument" angezeigt.
- Behoben durch Umstellung der Abfrage in `internal/approvals/page.tsx` auf eine Existenzprüfung gegen `candidate_documents` (Typ `cv`, nicht archiviert) und Anpassung von `PendingAccount`/`ApproveRejectDialog` auf ein einfaches `hasCv`-Flag statt des alten Pfad-Felds.

### Verifikation
- `npx eslint`: keine Fehler
- `npx vitest run`: 124/124 Tests grün (inkl. 7 neue Tests für `getExpiryStatus`, Tests für beide neuen Action-Dateien)
- `npm run build`: erfolgreich, alle Routen kompilieren

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
