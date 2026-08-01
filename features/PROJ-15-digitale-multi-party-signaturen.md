# PROJ-15: Digitale Multi-Party-Signaturen mit Protokollierung

## Status: In Review
**Created:** 2026-08-01
**Last Updated:** 2026-08-01 (QA durchgeführt — 1 High-Bug gefunden, wartet auf Nutzer-Freigabe vor Fix. Siehe „QA Test Results".)

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
| Neue Tabelle `contract_signatures` (contract_id, party_type, method, signer-Angaben bzw. Datei-Pfad) statt Erweiterung von `contracts` um drei Spaltensätze | Sauberere Modellierung "ein Vertrag hat mehrere Partei-Unterschriften" als drei fast identische Spaltengruppen auf einer Tabelle | 2026-08-01 |
| Unique-Index auf `(contract_id, party_type)` statt einer Anwendungs-seitigen Prüfung allein | Erzwingt Unveränderlichkeit/Einmaligkeit direkt in der Datenbank — ein zweiter Versuch scheitert unabhängig vom Aufrufpfad, konsistent mit der Produktentscheidung "keine Bearbeitung/kein Widerruf" | 2026-08-01 |
| Zeitpunkt/IP-Adresse/Browser-Kennung werden von einer serverseitig ausgeführten Funktion gesetzt, nicht aus vom Client übermittelten Werten übernommen | Verhindert Manipulation der Protokoll-Daten — dieselbe Überlegung wie bei den bereits bestehenden serverseitig gesetzten Gelesen-/Absenderflags in PROJ-17 | 2026-08-01 |
| Automatischer Statuswechsel `contracts.status → 'signed'` über eine SECURITY-DEFINER-Trigger-Funktion, die nach jeder neuen `contract_signatures`-Zeile prüft, ob alle drei Parteien vorhanden sind | Eine Gemeinde/ein Kandidat, die ihre eigene Unterschrift einfügen, haben kein UPDATE-Recht auf `contracts` (weiterhin `is_internal_role()`-only aus PROJ-9). Die Trigger-Funktion muss daher mit erhöhten Rechten laufen, um den Status trotzdem automatisch zu setzen — dasselbe etablierte Muster wie `link_candidate_profile` und weitere SECURITY-DEFINER-Funktionen im Projekt | 2026-08-01 |
| Kandidaten-Fallback-Datei wird direkt auf der jeweiligen `contract_signatures`-Zeile gespeichert (eigene `file_path`-Spalte), `contracts.signed_document_path` bleibt unangetastet/ungenutzt | Das alte Feld ging von "ein Dokument für den ganzen Vertrag" aus, was im neuen Drei-Parteien-Modell nicht mehr eindeutig ist; Spalte wird analog zu `candidates.cv_document_path` aus PROJ-16 als Altlast belassen, nicht gelöscht | 2026-08-01 |
| RLS für `contract_signatures` spiegelt exakt die bestehenden Zugriffspfade aus `contracts_select`/`assignments_select` (Kandidat/Gemeinde über denselben Proposal→Request-Join), keine neuen Hilfsfunktionen nötig | Wiederverwendung bereits bewährter, funktionierender RLS-Muster statt einer neuen Zugriffslogik | 2026-08-01 |



---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
Bestehende Vertrags-Karte (auf /internal/assignments/[id],
/municipality/assignments/[id], /candidate/assignments/[id])
└── Neuer Bereich "Unterschriften" (ersetzt den bisherigen einzelnen
      "Unterschriebene Version hochladen"-Upload aus PROJ-10)
      ├── Drei Zeilen, eine je Partei (Dafinex / Gemeinde / Kandidat):
      │     ├── Für die eigene Partei, falls noch offen:
      │     │     Namensfeld (vorausgefüllt) + Zustimmungs-Checkbox +
      │     │     "Digital unterschreiben"-Button
      │     ├── Für die eigene Partei, falls bereits abgeschlossen:
      │     │     "Unterschrieben am [Datum] von [Name]"
      │     ├── Für andere Parteien: nur Status sichtbar
      │     │     ("Offen" / "Unterschrieben am ... von ...")
      │     └── Kandidat ohne Konto (nur für internes Personal sichtbar):
      │           Datei-Upload statt digitaler Unterschrift
      └── Gesamtstatus-Anzeige ("2 von 3 Parteien haben unterschrieben"
            bzw. "Vollständig unterschrieben am ...")
```

### B) Data Model (plain language)

Eine neue, zusammengehörige Informationseinheit ergänzt den bestehenden Vertrag:

**Jede Partei-Unterschrift** (eine neue Zeile pro Partei und Vertrag) hat:
- Zugehöriger Vertrag
- Partei (Dafinex / Gemeinde / Kandidat)
- Methode (digital unterschrieben / Datei hochgeladen)
- Bei digital: eingegebener Name, Zeitpunkt, IP-Adresse, Browser-Kennung
- Bei Datei-Upload: hochgeladene Datei, wer sie hochgeladen hat, Zeitpunkt
- Genau eine Zeile pro Partei und Vertrag — ein zweiter Versuch derselben Partei wird abgelehnt (Unveränderlichkeit)

**Der bestehende Vertrag** (aus PROJ-10) wechselt automatisch auf Status „signed", sobald für alle drei Parteien eine Zeile existiert — das bereits bestehende, generierte PDF bleibt dabei unverändert.

Gespeichert in: bestehende Supabase-Datenbank (eine neue, mit dem Vertrag verknüpfte Tabelle) + der bereits bestehende `contracts`-Storage-Bucket aus PROJ-1/10 für den Kandidaten-Fallback-Upload.

### C) Tech Decisions (justified for PM)

1. **Eine neue Tabelle "Partei-Unterschrift" statt einer Erweiterung der bestehenden Vertrags-Tabelle.** Ein Vertrag braucht jetzt bis zu drei unabhängige Unterschrifts-Datensätze statt eines einzigen Upload-Felds — eine eigene Tabelle bildet das sauber ab, ohne die bestehende Vertrags-Tabelle mit drei Sätzen ähnlicher Spalten zu überladen.
2. **Automatischer Statuswechsel, sobald alle drei Parteien vorhanden sind.** Die Datenbank prüft das selbst nach jeder neuen Unterschrift — kein manueller Schritt, kein Vergessen, konsistent mit dem Rest des Projekts, wo Status-Übergänge bereits automatisiert ausgelöst werden.
3. **Zeitpunkt, IP-Adresse und Browser-Kennung werden ausschliesslich serverseitig erfasst, nie vom Browser übermittelt.** Verhindert, dass diese Angaben manipuliert werden könnten — wichtig für die Glaubwürdigkeit der Protokollierung.
4. **Unveränderlichkeit wird direkt in der Datenbank erzwungen** (nicht nur in der Oberfläche) — ein zweiter Unterschriftsversuch derselben Partei wird immer abgelehnt, unabhängig davon, wie die Anfrage zustande kommt.
5. **Wiederverwendung der bestehenden Vertrags-Karte und des bestehenden Storage-Buckets.** Kein neuer Bildschirm, keine neue Datei-Ablage — die bestehende Struktur aus PROJ-10 wird um den neuen Unterschriften-Bereich ergänzt.
6. **Wiederverwendung der bestehenden Benachrichtigungs-Infrastruktur** (PROJ-11/17/18) für die neuen "X hat unterschrieben"/"vollständig unterschrieben"-Hinweise.

### D) Dependencies (packages to install)
- Keine neuen Pakete.

## Implementation Notes

### Datenbank
- Migration `20260801100000_contract_signatures.sql`: neue Tabelle `contract_signatures` (contract_id, party_type, method, signer-Angaben bzw. Datei-Pfad, IP/Browser). Unique-Index auf `(contract_id, party_type)` erzwingt genau eine Unterschrift pro Partei; keine UPDATE/DELETE-Policy existiert, damit Unterschriften unter keinen Umständen nachträglich veränderbar sind.
- Trigger `check_contract_fully_signed` (SECURITY DEFINER) setzt `contracts.status = 'signed'`, sobald für alle drei Parteien eine Zeile existiert — läuft mit erhöhten Rechten, da eine Gemeinde/ein Kandidat, die ihre eigene Zeile einfügen, kein UPDATE-Recht auf `contracts` haben.
- RLS auf `contract_signatures` spiegelt exakt die bestehende Sichtbarkeits-Kette aus `contracts_select`; INSERT ist strikt pro Rolle auf den jeweils eigenen `party_type` beschränkt (Gemeinde nur `municipality`, Kandidat nur `candidate` und nur `method='digital'`, intern `dafinex` und `candidate` per Fallback-Upload).
- **Doppel-Klick-Schutz (Nutzeranfrage aus der Architektur-Freigabe):** Der Unique-Index sorgt dafür, dass ein zweiter Unterschriftsversuch derselben Partei serverseitig immer mit einem `23505`-Fehler (Unique-Constraint-Verstoss) abgelehnt wird. Alle drei Signier-Aktionen fangen diesen Fehlercode gezielt ab und liefern statt der rohen Datenbank-Fehlermeldung „Sie haben bereits unterschrieben." zurück. Zusätzlich deaktiviert sich der „Digital unterschreiben"-Button clientseitig sofort nach dem ersten Klick (`disabled={submitting}`), wodurch ein echter Doppelklick in der Praxis meist gar nicht erst zwei Anfragen auslöst.
- Der bestehende, alte Weg (`setSignedDocument`, ein einzelner Upload direkt auf `contracts.status = 'signed'`) wurde entfernt, um zwei parallele, widersprüchliche Wege zu „signed" zu vermeiden — `contracts.signed_document_path` bleibt als ungenutzte Altlast bestehen (Backward-Anzeige für bereits vor dieser Migration signierte Verträge).

### Anwendungscode
- `src/lib/contracts/`: `schema.ts` (Zod), `get-request-metadata.ts` (serverseitige IP/Browser-Erfassung über `next/headers`, nie vom Client übernommen), `load-signing-context.ts` (gemeinsamer, RLS-scoped Kontext-Loader), `sign-digital.ts` (gemeinsamer Kern für alle drei digitalen Signier-Wege + den Datei-Upload-Fallback), `notify-signature-parties.ts`, `loadSignatures.ts` (lädt alle drei Partei-Zeilen inkl. signierter Download-URLs für Uploads).
- Drei dünne, rollenspezifische Server Actions: `internal/contracts/actions.ts` (`signContractAsDafinex`, `uploadCandidateSignatureFallback`), `municipality/contracts/actions.ts` (`signContractAsMunicipality`, neu), `candidate/contracts/actions.ts` (`signContractAsCandidate`, neu) — jede macht nur ihre eigene Auth-/Eigentums-Prüfung und delegiert danach an den gemeinsamen Kern.
- Neue Komponente `contract-signatures-panel.tsx`: zeigt alle drei Parteien, mit Signier-Formular für die eigene Partei, Datei-Upload für den internen Kandidaten-Fallback, und einer schreibgeschützten Übersicht für die jeweils anderen Parteien.
- `contract-card.tsx` (intern) bereinigt: der alte „Unterschriebene Version hochladen"-Upload ist entfernt (ersetzt durch das neue Panel); der generierte-Dokument-Upload bleibt unverändert.
- Neuer Benachrichtigungstyp `contract_party_signed` ergänzt; `contract_signed` wird jetzt beim vollständigen Abschluss aller drei Parteien ausgelöst statt beim alten Einzel-Upload.
- Alle drei Einsatz-Detailseiten (`internal`/`municipality`/`candidate`) laden jetzt zusätzlich die Unterschriften und binden das neue Panel ein.

### Verifikation
- `npx eslint` (alle neuen/geänderten Dateien): keine Fehler (inkl. einer beiläufig behobenen, vorbestehenden Anführungszeichen-Warnung in `contract-card.tsx`)
- `npx vitest run`: 164/164 Tests grün (12 neu: Berechtigungsprüfung je Rolle, erfolgreiche digitale Unterschrift mit serverseitigen Metadaten, Datei-Upload-Fallback, sowie gezielt der vom Nutzer angefragte Doppel-Unterschrift-Fall — `23505` wird korrekt in „Sie haben bereits unterschrieben." übersetzt)
- `npm run build`: erfolgreich, alle Routen kompilieren

## QA Test Results

**Tested:** 2026-08-01
**App URL:** Kein Browser-Tool/keine funktionierenden Supabase-Zugangsdaten in dieser Umgebung — siehe Testmethode
**Tester:** QA Engineer (AI)

### Testmethode
Wie bereits bei PROJ-14/16/17/18/19 etabliert: kein Browser-Tool und keine `.env.local` in dieser Umgebung. Abdeckung dieses Durchgangs:
1. Vollständige Vitest-Suite (164/164) — 12 neue Tests: Berechtigungsprüfung je Rolle, erfolgreiche digitale Unterschrift mit serverseitig erfassten Metadaten, Datei-Upload-Fallback, und gezielt der vom Nutzer bei der Architektur-Freigabe angefragte Doppel-Unterschrift-Fall
2. Gezielter Code-Audit der Migration (RLS-Policies je Partei/Rolle einzeln durchgespielt, Trigger-Logik, Unique-/Check-Constraints) und aller neuen/geänderten Anwendungsdateien
3. Impersonations-Analyse: durchgespielt, ob eine Gemeinde `party_type='dafinex'`/`'candidate'` unterschieben kann, ob ein Kandidat `method='upload'` für sich selbst einschleusen kann, ob jemand für eine fremde Partei/einen fremden Vertrag unterschreiben kann — in jedem Fall verhindert die RLS `WITH CHECK`-Klausel die Anfrage vollständig
4. **Migrations-/Regressionsprüfung gegen bereits live Daten** (siehe BUG-15-1) — PROJ-10 ist laut `features/INDEX.md` bereits **Deployed**, es kann also in der echten Datenbank bereits vollständig unterschriebene Verträge aus der alten Einzel-Upload-Logik geben
5. Kein neuer E2E-Test ergänzt (gleiche Begründung wie in den vorherigen Runden: Login-Flows in dieser Umgebung nicht sinnvoll testbar)

### Acceptance Criteria Status
**14/14 Acceptance Criteria für den neuen Drei-Parteien-Signaturfluss erfüllt** — alle beziehen sich auf neu erstellte Verträge; die Lücke bei bereits vor dieser Migration abgeschlossenen Verträgen (BUG-15-1) war weder in der Spec noch in den Edge Cases abgedeckt und wurde erst in dieser QA-Runde entdeckt.
- [x] Unterschreiben-Bereich mit Namensfeld + Zustimmungs-Checkbox pro eigener Partei — Code-Review
- [x] Digitale Unterschrift speichert Zeitpunkt/IP/Browser serverseitig — Vitest + Code-Review (`getRequestMetadata`, nie aus Client-Eingabe übernommen)
- [x] Bereits abgeschlossener Anteil zeigt „Unterschrieben am ... von ..." statt Formular, unveränderlich — Code-Review + DB-Unique-Index
- [x] Validierung bei fehlendem Namen/fehlender Zustimmung — Zod (`signDigitalSchema`) + Client-Check
- [x] Automatischer Statuswechsel auf „signed" bei drei abgeschlossenen Anteilen — Code-Review (SECURITY-DEFINER-Trigger) + Vitest (Benachrichtigungs-Verzweigung bei `count === 3`)
- [x] Fallback-Datei-Upload für Kandidaten ohne Konto, nur für internes Personal sichtbar — Code-Review + Vitest
- [x] Fallback-Anteil zählt unabhängig vom Fortschritt der anderen Parteien — Code-Review (Trigger zählt unabhängig von `method`)
- [x] Nachträgliches Konto ändert nichts an einem bereits per Fallback abgeschlossenen Anteil — RLS-Analyse (Unique-Index verhindert jeden zweiten Versuch für denselben `party_type`, unabhängig vom Weg)
- [x] Protokoll-Übersicht je Partei (Status/Name/Zeitpunkt/Methode) — Code-Review (`ContractSignaturesPanel`), s. jedoch **BUG-15-2** (Namensanzeige beim Fallback)
- [x] Aktivitätenprotokoll-Eintrag je Unterschrift — Vitest + Code-Review (neue deutsche Beschreibungen in `activity-log-table.tsx`)
- [x] Gemeinde kann nicht für Kandidat/Dafinex unterschreiben — RLS-Analyse (Impersonationsversuch scheitert an `WITH CHECK`)
- [x] Kandidat kann nicht den Vertrag eines fremden Einsatzes unterschreiben — RLS-Analyse (Subquery-Scoping über `candidate_proposals`)
- [x] Andere Parteien werden bei jeder Teil-Unterschrift benachrichtigt — Vitest + Code-Review (`notifyContractPartySigned`)
- [x] Vollständigkeits-Benachrichtigung an Gemeinde + Kandidat — Vitest (`sendCompletion...`-Test), s. jedoch **BUG-15-3** (seltene Doppel-Benachrichtigung bei echter Gleichzeitigkeit)

### Security Audit Results
- [x] Jede Partei kann ausschliesslich ihren eigenen `party_type` einfügen — für alle drei Rollen einzeln durchgespielt, RLS `WITH CHECK` verhindert jede Fremdzuordnung zuverlässig
- [x] `created_by_id = auth.uid()` in der `WITH CHECK`-Klausel verhindert, dass eine Partei eine Unterschrift im Namen einer anderen Person einträgt
- [x] Unveränderlichkeit doppelt abgesichert: Unique-Index auf `(contract_id, party_type)` UND keine UPDATE/DELETE-Policy überhaupt
- [x] IP-Adresse/Browser-Kennung werden ausschliesslich serverseitig aus den Request-Headern gelesen, nie aus Client-Eingaben übernommen
- [x] Diese Felder werden in der Anwendung nirgends anzeige — `loadContractSignatures` fragt sie bewusst gar nicht erst ab, keine unnötige Exposition in der UI
- [x] Storage-Fallback-Upload nutzt denselben, bereits internal-only abgesicherten `contracts`-Bucket aus PROJ-10, keine neue Storage-Policy nötig
- [x] Kein SQL-Injection-Risiko, keine neuen Secrets

### Bugs Found

| ID | Severity | Beschreibung | Repro |
|----|----------|----|----|
| BUG-15-1 | **High** | **Keine Datenmigration/Backfill für bereits vor dieser Änderung vollständig unterschriebene Verträge.** PROJ-10 ist laut `features/INDEX.md` bereits **Deployed** — in der echten Datenbank können also schon Verträge mit `status = 'signed'` existieren (über den alten Einzel-Upload-Weg). Für diese Verträge gibt es keine `contract_signatures`-Zeilen. Das neue `ContractSignaturesPanel` würde für einen solchen Vertrag alle drei Parteien als „Offen" anzeigen — direkt widersprüchlich zum „Unterschrieben"-Badge der bestehenden `ContractCard`/`MunicipalityContractCard`-Anzeige unmittelbar darüber auf derselben Seite. Kein Datenverlust, aber ein sichtbarer, verwirrender Widerspruch auf genau der Seite, die Vertrauen in den Vertragsabschluss schaffen soll — bei einem Feature, dessen Kernversprechen "Protokollierung" ist. | Migration `20260801100000_contract_signatures.sql` enthält keinen Backfill-Schritt (im Unterschied zum etablierten Muster aus PROJ-16, das genau für diesen alte-Feld-zu-neuem-Modell-Übergang einen Backfill durchführt) |
| BUG-15-2 | Medium | Beim Kandidaten-Fallback (Datei-Upload durch internes Personal) zeigt die Protokoll-Übersicht „Unterschrieben am ... von [Name des internen Mitarbeitenden]" statt des Kandidatennamens — `loadSignatures.ts` verwendet für `method='upload'` das `created_by`-Feld (wer den Upload durchgeführt hat), nicht den Namen der tatsächlich unterschreibenden Person. Kann den Eindruck erwecken, die interne Person hätte selbst unterschrieben, statt nur die physische Unterschrift des Kandidaten stellvertretend hochgeladen zu haben — bei einem "Protokollierung"-Feature eine echte Ungenauigkeit in der Zuordnung. | `src/lib/contracts/loadSignatures.ts:47` |
| BUG-15-3 | Low | Bei echter Gleichzeitigkeit (zwei oder drei Parteien schliessen ihren Anteil im selben Sekundenbruchteil ab) könnten mehrere der beteiligten Server-Aktionen unabhängig voneinander `count === 3` sehen und jede für sich die "vollständig unterschrieben"-Benachrichtigung auslösen — der Vertragsstatus selbst wird durch den Trigger korrekt nur einmal gesetzt, aber die Benachrichtigung könnte doppelt ankommen. Die Spec-Edge-Case-Beschreibung ("keine doppelte Abschluss-Benachrichtigung") ist hier optimistischer als die tatsächliche Garantie. Rein kosmetisch, kein Datenproblem — gleiche Risikoklasse wie bereits in PROJ-17/18 akzeptierte Gleichzeitigkeitsfälle. | `src/lib/contracts/sign-digital.ts` — `finalizeSignature()` liest den Zähler in einer separaten Anfrage nach dem eigenen Insert, kein Lock über alle drei möglichen gleichzeitigen Aufrufe hinweg |

**Kritische Bugs: 0** — **Hohe Bugs: 1** (BUG-15-1)
**Medium: 1, Low: 1**

### Production-Ready Decision
**READY: NO** — BUG-15-1 ist ein High-Bug (widersprüchliche, vertrauensschädigende Anzeige für bereits real existierende, unterschriebene Verträge) und muss vor dem Deployment behoben werden. Status bleibt **In Review**, gemäss Nutzeranweisung wird hier angehalten und auf Freigabe gewartet, bevor mit PROJ-15 fortgefahren oder BUG-15-1 behoben wird.

## Deployment
_To be added by /deploy_
