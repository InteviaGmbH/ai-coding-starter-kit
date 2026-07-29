# PROJ-20: Kandidatenportal – Selbstverwaltung für Kandidaten

## Status: In Progress
**Created:** 2026-07-28
**Last Updated:** 2026-07-29 (BUG-3 live gefunden und behoben — 403 beim CV-Upload, siehe "Implementation Notes")

## Dependencies
- Requires: PROJ-1 (Supabase Infrastructure Setup) — Schema, RLS, Storage
- Requires: PROJ-2 (Rollenbasierte Auth & Portal-Grundgerüst) — Candidate-Rolle, Portal-Layout, Redirects
- Requires: PROJ-4 (Kandidatenverwaltung) — bestehende `candidates`-Tabelle; die interne Detailansicht wird um eine read-only Anzeige der neuen Felder ergänzt (siehe Acceptance Criteria)
- Requires: PROJ-9 (Einsatzverwaltung mit Statusverlauf) — `assignments`-Tabelle und bestehende RLS
- Requires: PROJ-10 (Einfache Vertragsgenerierung) — `contracts`-Tabelle, bestehendes ContractCard-Muster
- Requires: PROJ-11 (Kern-Benachrichtigungen) — `notifications`-Tabelle, bestehende RLS (`recipient_id = auth.uid()`)

## User Stories
- Als Kandidat möchte ich mein eigenes Profil (Name, Telefonnummer) einsehen und bearbeiten können, damit meine Kontaktdaten aktuell bleiben.
- Als Kandidat möchte ich meine Verfügbarkeit (Zeitraum, Pensum in %) jederzeit selbst pflegen können, damit Dafinex und Gemeinden meinen aktuellen Stand sehen — nicht nur einmalig bei der Registrierung.
- Als Kandidat möchte ich meine Fähigkeiten und Qualifikationen (Skills, Zertifikate, Sprachen, Berufserfahrung, bevorzugte Regionen) jederzeit selbst nachtragen und aktualisieren können.
- Als Kandidat möchte ich meine eigenen Einsätze (Liste und Detail) einsehen können, damit ich weiss, wo und wann ich im Einsatz bin oder war.
- Als Kandidat möchte ich den Vertrag zu einem meiner Einsätze einsehen und herunterladen können, damit ich die Unterlagen jederzeit griffbereit habe.
- Als Kandidat möchte ich mein hochgeladenes CV einsehen und bei Bedarf durch eine neue Version ersetzen können, damit meine Bewerbungsunterlagen aktuell bleiben.
- Als Kandidat möchte ich meine Benachrichtigungen einsehen können, damit ich über neue Vorschläge, aktive Einsätze oder bereitgestellte Verträge informiert bin.

## Out of Scope
- **E-Mail-Adresse ändern** — an das Supabase-Auth-Konto gebunden, bräuchte einen eigenen Verifizierungs-Flow. Separates zukünftiges Feature, falls benötigt.
- **Mehrere Dokumente / Dokumentenversionierung** — bleibt vollständig PROJ-16 (Phase 2). Der CV-Ersatz-Upload in dieser Spec überschreibt die vorherige Datei ohne Versionshistorie, konsistent mit dem bestehenden Verhalten aus PROJ-4.
- **Vollständiges Nachrichtensystem** (Chat, interne Notizen, neue Benachrichtigungsarten, alle Filter) — bleibt vollständig PROJ-17 (Phase 2). PROJ-20 zeigt ausschliesslich bereits durch PROJ-11 erzeugte Benachrichtigungen an.
- **Ersetzen/Migrieren der bestehenden `region`/`availability`-Felder** — bleiben unverändert für PROJ-4 (interne Kandidatenverwaltung) und PROJ-6 (Kandidatensuche/Matching-Filter). Die neuen Felder (`availability_start`, `availability_end`, `max_workload_percent`, `preferred_regions`, `certifications`, `languages`, `experience_years`) sind rein additiv.
- **Bearbeitung von `candidate_proposals`/`assignments`/`contracts`-Status durch den Kandidaten** — bleibt ausschliesslich intern, bereits durch bestehende RLS aus PROJ-8/9/10 gesperrt. Diese Spec ist rein lesend für Einsätze/Verträge.
- **`rating`/`internal_notes`** — existieren aktuell **gar nicht** in der Datenbank (geprüft: kein solches Feld in der `candidates`-Tabelle). Diese Spec führt sie nicht ein. Falls sie künftig ergänzt werden (z.B. im Rahmen von PROJ-14), muss die dann neue RLS-Policy sicherstellen, dass sie für die Rolle `candidate` nicht sichtbar sind — vorsorglicher Hinweis für spätere Specs, keine aktive Anforderung hier.
- **Optimistic Locking / Konfliktauflösung bei gleichzeitiger Bearbeitung** — bewusst nicht eingeführt, "Last write wins" wie bereits in PROJ-3/PROJ-4 etabliert.
- **Bearbeitung der neuen Felder durch internes Personal** — die interne Kandidatenverwaltung (PROJ-4) zeigt die neuen Felder nur lesend an, um Dateninkonsistenzen mit der Selbstpflege durch den Kandidaten zu vermeiden.
- **Partnerfirmen-Kandidaten** (`source_type: partner`) — Phase 2, PROJ-13.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

### Eigenes Profil
- [ ] Angenommen ein Kandidat ist eingeloggt, wenn er sein Profil öffnet, dann sieht er seinen Namen, seine Telefonnummer und seine (nicht editierbare) Login-E-Mail-Adresse
- [ ] Angenommen ein Kandidat bearbeitet Name oder Telefonnummer und speichert gültige Werte, dann werden die Änderungen übernommen und sofort angezeigt
- [ ] Angenommen ein Kandidat lässt das Namensfeld leer, wenn er speichert, dann erscheint eine Validierungsfehlermeldung und nichts wird gespeichert
- [ ] Angenommen ein Kandidat betrachtet sein Profil, dann gibt es keine Eingabemöglichkeit, die Login-E-Mail-Adresse zu ändern

### Verfügbarkeit
- [ ] Angenommen ein Kandidat ist eingeloggt, wenn er ein Pensum zwischen 0 und 100 sowie optional einen Verfügbarkeits-Zeitraum (Start-/Enddatum) einträgt und speichert, dann werden die Werte übernommen
- [ ] Angenommen ein Kandidat trägt ein Enddatum ein, das vor dem Startdatum liegt, wenn er speichert, dann erscheint eine Validierungsfehlermeldung und nichts wird gespeichert
- [ ] Angenommen ein Kandidat trägt ein Pensum ausserhalb von 0–100 ein, wenn er speichert, dann erscheint eine Validierungsfehlermeldung
- [ ] Angenommen ein Kandidat hat noch keine Verfügbarkeit angegeben, wenn er die Seite öffnet, dann werden die Felder leer angezeigt statt eines Fehlers

### Fähigkeiten & Qualifikationen
- [ ] Angenommen ein Kandidat ist eingeloggt, wenn er Fähigkeiten, Zertifikate, Sprachen, Berufserfahrung (Jahre) oder bevorzugte Regionen nach der Registrierung erneut bearbeitet und speichert, dann werden die aktualisierten Werte gespeichert und sind danach überall sichtbar, wo diese Daten angezeigt werden
- [ ] Angenommen ein Kandidat gibt einen negativen Wert bei Berufserfahrung ein, wenn er speichert, dann erscheint eine Validierungsfehlermeldung

### Eigene Einsätze
- [ ] Angenommen ein Kandidat ist eingeloggt, wenn er seine Einsatzliste öffnet, dann sieht er ausschliesslich Einsätze, die ihn selbst betreffen, mit Status, Zeitraum und Gemeinde
- [ ] Angenommen ein Kandidat hat noch keine Einsätze, wenn er die Liste öffnet, dann wird ein Hinweistext statt einer leeren Tabelle angezeigt
- [ ] Angenommen ein Kandidat öffnet die Detailansicht eines eigenen Einsatzes, dann sieht er die Einsatzdetails sowie den zugehörigen Vertrag (falls vorhanden) mit Download-Link, eingebettet auf derselben Seite (kein separates Vertrags-Menü, analog zum Gemeindeportal)
- [ ] Angenommen ein Kandidat versucht, die Detailseite eines Einsatzes aufzurufen, der nicht ihn selbst betrifft, dann wird der Zugriff verweigert

### Dokumente (CV)
- [ ] Angenommen ein Kandidat hat bereits ein CV hochgeladen, wenn er die entsprechende Ansicht öffnet, dann sieht er einen Download-Link sowie das Upload-Datum
- [ ] Angenommen ein Kandidat lädt erfolgreich ein neues CV hoch, dann ersetzt es das vorherige CV vollständig (kein Versionsverlauf, konsistent mit PROJ-4)
- [ ] Angenommen ein Kandidat lädt eine Datei mit nicht unterstütztem Format oder über dem Grössenlimit hoch, dann wird der Upload abgelehnt und eine Fehlermeldung angezeigt

### Benachrichtigungen
- [ ] Angenommen ein Kandidat ist eingeloggt, wenn er seine Benachrichtigungen öffnet, dann sieht er ausschliesslich an ihn selbst gerichtete Benachrichtigungen
- [ ] Angenommen ein Kandidat hat ungelesene Benachrichtigungen, wenn er eine davon öffnet, dann wird sie als gelesen markiert

### Interne Sichtbarkeit (PROJ-4-Ergänzung)
- [ ] Angenommen ein Kandidat hat Verfügbarkeitszeitraum, Pensum, Zertifikate, Sprachen, Berufserfahrung oder bevorzugte Regionen gepflegt, wenn ein `dafinex_admin`/`internal_coordinator` die bestehende Kandidaten-Detailansicht (PROJ-4) öffnet, dann sieht er diese Werte zusätzlich, jedoch nicht editierbar

## Edge Cases
- Kandidat hat keine verknüpfte `candidates`-Zeile (`profile.candidateId` ist null) → Profilseite zeigt einen verständlichen Hinweis statt eines technischen Fehlers
- Gleichzeitige Bearbeitung durch den Kandidaten selbst und einen internen Koordinator über PROJ-4 → Last write wins, keine Fehlermeldung
- Netzwerkabbruch während des CV-Ersatz-Uploads → alter CV-Verweis bleibt erhalten, kein Teil-Upload wird übernommen (konsistent mit PROJ-1)
- Kandidat mit `account_status` „pending"/„rejected" versucht das Portal aufzurufen → weiterhin Redirect auf `/pending` bzw. `/rejected` (bestehendes Verhalten aus PROJ-2, keine Änderung nötig)
- Kandidat versucht per direkter URL auf Einsatz/Vertrag eines anderen Kandidaten zuzugreifen → Zugriff wird verweigert, Seite zeigt „nicht gefunden" statt fremder Daten

## Technical Requirements (optional)
- Security: Schreiboperationen serverseitig per Zod validiert; RLS als zweite Verteidigungslinie, analog PROJ-1
- Zugriff ausschliesslich über `/candidate/*`-Portal, weiterhin gesperrt für pending/rejected-Konten

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log
<!-- Record of conscious decisions made and why. Added to by /write-spec and /architecture. -->

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Priorität P1 | MVP (PROJ-1–12) ist bereits deployed, Pilot mit der Gemeinde noch nicht gestartet; diese Funktion blockiert den Pilotstart nicht, verbessert aber direkt das Erlebnis bereits registrierter Kandidaten | 2026-07-28 |
| „Nachrichten" = nur Anzeige bestehender PROJ-11-Benachrichtigungen | Vermeidet Überschneidung mit PROJ-17 (Vollständiges Nachrichtensystem, Phase 2); keine neuen Trigger, kein Chat, keine internen Notizen | 2026-07-28 |
| E-Mail-Adresse bleibt nicht editierbar | An Supabase-Auth-Konto gebunden, bräuchte eigenen Verifizierungs-Flow — separates zukünftiges Feature bei Bedarf | 2026-07-28 |
| CV-Ersatz-Upload erlaubt, überschreibt ohne Versionshistorie | Konsistent mit bestehendem PROJ-4-Verhalten; Mehrfach-Dokumente/Versionierung bleiben PROJ-16 (Phase 2) | 2026-07-28 |
| Neue Felder (`availability_start`/`_end`, `max_workload_percent`, `preferred_regions`, `certifications`, `languages`, `experience_years`) sind additiv, bestehende `region`/`availability`-Felder bleiben unverändert | Kein Eingriff in PROJ-4/PROJ-6, kleinerer Blast Radius, keine Datenmigration nötig | 2026-07-28 |
| Verfügbarkeits-Validierung: Pensum 0–100, `availability_end` ≥ `availability_start`, beide Felder optional | Kandidat hat evtl. noch keine konkrete Verfügbarkeit; strikte Pflichtfelder wären für MVP zu restriktiv | 2026-07-28 |
| Konflikt zwischen Selbstbearbeitung und interner Bearbeitung (PROJ-4): Last write wins | Konsistent mit bereits etablierter Vereinfachung aus PROJ-3/PROJ-4, kein neuer Locking-Mechanismus | 2026-07-28 |
| Verträge werden in die Einsatz-Detailansicht eingebettet, keine eigene „Verträge"-Seite | Konsistent mit dem bereits etablierten Muster im Gemeindeportal (`/municipality/assignments/[id]`) | 2026-07-28 |
| Neue Felder werden in PROJ-4 nur lesend ergänzt, nicht editierbar durch internes Personal | Vermeidet Dateninkonsistenzen zwischen interner Bearbeitung und Selbstpflege durch den Kandidaten | 2026-07-28 |
| Kandidaten-Telefonnummer wird neu eingeführt (existierte bisher nicht) | „Kontaktdaten" aus der Anfrage braucht ein Feld; kein bestehendes Feld vorhanden, kleinste sinnvolle Ergänzung analog zum bestehenden Gemeinde-Feld | 2026-07-28 |
| `certifications`/`languages` als einfache `text[]`-Tag-Listen (wie bestehendes `skills`), ohne Zusatzfelder (kein Ausstellungsdatum, kein Sprachniveau) | Passt zum bestehenden `skills`-Muster, hält den Aufwand im Rahmen. Falls sich im Pilotbetrieb zeigt, dass z.B. ein Sprachniveau für besseres Matching gebraucht wird, kann das gezielt nachgerüstet werden | 2026-07-28 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Eine gemeinsame `/candidate/profile`-Seite mit mehreren Kartenbereichen statt drei getrennter Seiten für Profil/Verfügbarkeit/Fähigkeiten | Weniger Navigation, konsistent mit dem bereits etablierten Muster im Gemeindeportal (z.B. "Anfrage erstellen" als Dialog statt eigene Seite) | 2026-07-29 |
| Bestehende Komponenten/Muster wiederverwenden statt neu bauen: `NotificationBell` (0 Aufwand, bereits vollständig fertig), Dokument-Upload-Muster aus `CandidateDocumentCard` (interne Kandidatenverwaltung), Einsatz-/Vertragsansicht aus dem Gemeindeportal (`assignments`-Tabelle + `ContractCard`) | Deutlich weniger Aufwand als Neubau, garantiert konsistentes Verhalten/Look&Feel zu bereits bewährten Mustern | 2026-07-29 |
| Neue Kandidaten-Selbstpflege-Felder als zusätzliche, rein additive Spalten auf der bestehenden `candidates`-Tabelle (kein neues Datenbankschema/keine neue Tabelle) | Kein Eingriff in PROJ-4/PROJ-6, keine Migration bestehender Daten nötig | 2026-07-29 |
| Neue Spalten-Sperre (Trigger/`with check`, analog zum bestehenden `profiles.municipality_id`/`candidate_id`-Lockdown-Muster aus PROJ-1) für die `candidates`-Tabelle beim Kandidaten-Self-Update | Sicherheitsfund: `candidates_update` erlaubt Kandidaten schon seit PROJ-1 row-level Self-Update ohne Spalteneinschränkung — bisher folgenlos, da keine Oberfläche das nutzte. PROJ-20 ist die erste Funktion, die tatsächlich von einem Kandidaten aus schreibt, daher jetzt der richtige Zeitpunkt, das zu schliessen: Kandidat darf nur `first_name`, `last_name`, `phone`, `skills`, `cv_document_path` sowie die neuen Felder ändern — nicht `id`, `profile_id`, `source_type`, `region`, `availability` (alt), `created_*`, `is_sample` | 2026-07-29 |
| `skills` wird zusätzlich zum Kandidaten-Self-Update freigegeben (dual editierbar: Kandidat + intern via PROJ-4) | Explizit Teil der ursprünglichen Anfrage ("Fähigkeiten... skills, ..."); nutzt die bereits beschlossene "Last write wins"-Konfliktregel | 2026-07-29 |
| Telefonnummer wird auf der `candidates`-Tabelle ergänzt (nicht auf `profiles`) | Konsistent damit, wie `municipalities.contact_phone` bereits entitätsspezifisch (nicht auf `profiles`) abgelegt ist | 2026-07-29 |
| Skills/Zertifikate/Sprachen weiterhin als einfaches kommagetrenntes Text-Eingabefeld (wie im bestehenden internen Kandidatenformular), keine neue Tag-Input-Komponente | Kein neues UI-Paradigma, kein zusätzliches Package nötig | 2026-07-29 |
| CV-Ersatz-Upload nutzt eine neue, candidate-scoped Server Action (nicht die bestehende interne `setCandidateDocumentPath`) | Die interne Action ist für `internal_coordinator`/`dafinex_admin` gedacht; eine neue Action stellt sicher, dass ein Kandidat nur seine eigene `candidates`-Zeile referenzieren kann | 2026-07-29 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
Kandidatenportal (erweitert)
├── Navigation: Dashboard | Profil | Einsätze   (bisher nur "Dashboard")
│
├── Dashboard (bestehend, unverändert)
│
├── Profil (neu) — eine Seite, mehrere Kartenbereiche
│   ├── Karte "Kontaktdaten" — Name, Telefonnummer (editierbar), E-Mail (nur Anzeige)
│   ├── Karte "Verfügbarkeit" — Pensum in %, Verfügbar von/bis (editierbar)
│   ├── Karte "Fähigkeiten & Qualifikationen" — Skills, Zertifikate, Sprachen,
│   │     Berufserfahrung (Jahre), bevorzugte Regionen (editierbar)
│   └── Karte "Dokument" — aktuelles CV (Download-Link) + Upload-Feld zum Ersetzen
│
├── Einsätze (neu)
│   ├── Liste eigener Einsätze (Status, Zeitraum, Gemeinde) — analog Gemeindeportal
│   └── Einsatzdetail (neu)
│       ├── Einsatz-Informationen
│       └── eingebettete Vertrags-Karte (Status, Download-Link) — kein eigenes Menü
│
└── Benachrichtigungen — bereits vollständig vorhanden (Glocke im Header, alle Portale) — keine neue Arbeit
```

### B) Data Model (plain language)

Erweiterung der bestehenden **`candidates`-Tabelle** um folgende zusätzliche, alle optionale Felder:
- Telefonnummer (Text)
- Verfügbar von / Verfügbar bis (je ein Datum)
- Pensum in Prozent (Zahl, 0–100)
- Bevorzugte Regionen (Liste von Text-Einträgen) — zusätzlich zur bestehenden einzelnen "Region", die unverändert bleibt
- Zertifikate (Liste von Text-Einträgen)
- Sprachen (Liste von Text-Einträgen)
- Berufserfahrung in Jahren (Zahl, nicht negativ)

Keine neue Tabelle nötig — alles auf der bestehenden `candidates`-Zeile des Kandidaten. Die bestehenden Felder `region`, `availability` (Freitext) und die `profiles`-Tabelle bleiben strukturell unverändert; `skills` wird zusätzlich zur bestehenden internen Bearbeitung auch vom Kandidaten selbst bearbeitbar.

Gespeichert in: bestehende Supabase-Datenbank (kein neuer Speicherort).

### C) Tech Decisions (justified for PM)

1. **Bestehende Komponenten wiederverwenden statt neu bauen.** Die Benachrichtigungs-Glocke ist bereits fertig (0 Aufwand). Das Dokument-Upload-Verhalten und die Einsatz-/Vertragsansicht werden vom bereits bewährten internen bzw. Gemeindeportal-Muster übernommen. Das spart Aufwand und garantiert, dass sich das neue Portal gleich anfühlt wie die bestehenden.
2. **Eine "Profil"-Seite statt drei getrennter Seiten.** Weniger Navigation für eine überschaubare Datenmenge, konsistent mit dem bereits etablierten, bewusst einfachen Muster im Gemeindeportal.
3. **Rein additive Datenbank-Erweiterung.** Es wird nichts an bestehenden Feldern geändert oder migriert — dadurch besteht kein Risiko für die bereits laufende interne Kandidatenverwaltung (PROJ-4) oder die Kandidatensuche (PROJ-6).
4. **Neue Sicherheits-Absicherung beim Speichern.** Es wird zusätzlich sichergestellt, dass ein Kandidat wirklich nur die für ihn vorgesehenen Felder ändern kann — nicht z.B. seine Herkunftsart oder interne Kennzeichnungen. Dieselbe bewährte Absicherung existiert bereits für das Profil-Konto selbst.
5. **Kein neues UI-Paradigma.** Skills/Zertifikate/Sprachen werden wie bereits im internen Kandidatenformular als einfache kommagetrennte Texteingabe erfasst — kein neues Package, keine neue Komponente nötig.

### D) Dependencies (packages to install)
Keine neuen Packages — vollständig mit dem bestehenden Stack umsetzbar (Zod, react-hook-form, shadcn/ui-Komponenten, Supabase-Client).

## Implementation Notes

Vollständig implementiert (Datenbank, RLS, Server Actions, UI) in einem Durchgang, konsistent mit dem bisherigen Vorgehen in diesem Projekt (PROJ-3 bis PROJ-12 wurden ebenfalls jeweils komplett in einem `/frontend`-Durchgang umgesetzt statt frontend/backend zu trennen).

**Datenbank (`supabase/migrations/20260729090000_candidate_self_service_fields.sql`):**
- 8 neue Spalten auf `candidates`: `phone`, `availability_start`, `availability_end`, `max_workload_percent`, `preferred_regions`, `certifications`, `languages`, `experience_years` — alle optional, additiv
- Check-Constraints: `max_workload_percent` 0–100, `availability_end >= availability_start` (falls beide gesetzt), `experience_years >= 0`
- Neuer Trigger `enforce_candidate_self_update_columns`: schliesst die im Architecture-Gespräch gefundene RLS-Lücke vollständig — ein Kandidat kann beim Self-Update nur noch `first_name`, `last_name`, `phone`, `skills`, `cv_document_path` sowie die 7 neuen Felder ändern, nicht `id`, `profile_id`, `source_type`, `region`, `availability` (alt), `created_date`, `created_by_id`, `created_by`, `is_sample`
- 2 neue Select-Policies (`personnel_requests_select_candidate_assigned`, `municipalities_select_candidate_assigned`): während der Implementierung festgestellt, dass ein Kandidat für "Eigene Einsätze mit Gemeinde-Name" bisher gar keinen Lesezugriff auf `personnel_requests`/`municipalities` hatte — analog zum bestehenden PROJ-8-Muster (umgekehrte Richtung) ergänzt

**Server Actions (`src/app/candidate/profile/actions.ts`):** `updateCandidateContact` (aktualisiert zusätzlich `profiles.full_name`, damit der Portal-Header synchron bleibt), `updateCandidateAvailability`, `updateCandidateQualifications`, `setOwnCandidateDocumentPath` (verifiziert zusätzlich zur RLS explizit, dass die übergebene `candidateId` der eigenen entspricht). 12 neue Vitest-Tests in `actions.test.ts`, alle grün.

**UI:**
- `/candidate/profile` — eine Seite mit 4 Karten (Kontaktdaten, Verfügbarkeit, Fähigkeiten & Qualifikationen, Dokument)
- `/candidate/assignments` (Liste) + `/candidate/assignments/[id]` (Detail, inkl. wiederverwendeter `MunicipalityContractCard`)
- `CandidateDocumentCard` refaktoriert: nimmt die Speicher-Action jetzt als Prop entgegen, dadurch von interner Kandidatenverwaltung UND Kandidatenportal gemeinsam genutzt, keine Code-Duplikation
- Navigation im Kandidatenportal um "Profil" und "Einsätze" ergänzt
- Interne Kandidaten-Detailansicht (PROJ-4) um eine neue, rein lesende Karte "Selbstpflege" ergänzt (Telefonnummer, Pensum, Verfügbarkeitszeitraum, Berufserfahrung, Zertifikate, Sprachen, bevorzugte Regionen)

**Verifikation:** `npm run build` grün, `npm run lint` ohne neue Fehler (11 vorbestehende, unveränderte Fehler aus dem Deploy bleiben bestehen), volle Vitest-Suite 87/87 grün (12 davon neu für PROJ-20).

**Nicht durchgeführt (kein Browser-Tool verfügbar):** manuelles Durchklicken der neuen Seiten in einer echten Browser-Session — sollte vor `/qa` bzw. vor dem nächsten Deploy einmal manuell verifiziert werden.

**BUG-1 (Live gefunden, behoben):** Nach Anwenden der Migration zeigte `/candidate/profile` "Profil konnte nicht geladen werden" und `/candidate/dashboard` zeigte "—" statt echter Werte für Verfügbarkeit/Region. Ursache, via Vercel Function Logs gefunden: Postgres-Fehler `42P17` ("infinite recursion detected in policy for relation candidate_proposals"). Die beiden neuen Policies (`personnel_requests_select_candidate_assigned`, `municipalities_select_candidate_assigned`) griffen mit rohen Inline-Subqueries direkt auf `candidate_proposals`/`personnel_requests` zu, statt wie jede andere tabellenübergreifende RLS-Prüfung in diesem Schema über eine `SECURITY DEFINER`-Hilfsfunktion zu gehen — da `candidate_proposals_select` selbst `personnel_requests` liest, entstand ein zirkulärer Auswertungs-Loop zwischen den beiden Tabellen. Fix: zwei neue `SECURITY DEFINER`-Hilfsfunktionen (`candidate_own_request_ids()`, `candidate_own_municipality_ids()`), die intern ohne RLS ausgewertet werden. `20260729090000` direkt korrigiert (für neue Setups) + neuer Patch `20260729100000_fix_candidate_assigned_policies_recursion.sql` für bereits migrierte Datenbanken. Ausserdem wurde dabei ein zweiter, unabhängiger Bug behoben: `/candidate/profile/page.tsx` prüfte den Supabase-`error` nie (nur `data`) — exakt das PROJ-8-BUG-3/PROJ-12-BUG-1-Muster aus dem eigenen Audit, jetzt behoben (`error` wird geprüft und geloggt).

**BUG-2 (Live gefunden, behoben):** Beim Hochladen einer zu grossen Datei in der Dokument-Karte (`/candidate/profile`) kam ein 400 im Netzwerk-Tab zurück, aber es erschien keine Fehlermeldung im UI. Ursache: der Bucket `candidate-documents` wurde in PROJ-1 ohne explizites `file_size_limit`/`allowed_mime_types` angelegt, sodass serverseitig nur das projektweite Storage-Standardlimit galt — unabhängig vom clientseitigen 10-MB-Check in `CandidateDocumentCard`. Eine Datei, die den Client-Check bestand, konnte serverseitig trotzdem am (abweichenden) Default scheitern; der generische Fehlertext wurde zwar gesetzt, aber ohne konkreten Grössenhinweis. Fix: `20260729110000_candidate_documents_bucket_size_limit.sql` setzt das Bucket-Limit explizit auf 10 MB + erlaubte MIME-Types, synchron zum Client. Zusätzlich zeigt `CandidateDocumentCard` jetzt bei einer erkannten Grössen-Überschreitung gezielt "Datei zu gross. Maximal 10 MB erlaubt." statt der generischen Meldung, und der gesamte Upload-Ablauf ist in try/catch/finally gekapselt, damit `uploading` in jedem Fall zurückgesetzt und immer eine Fehlermeldung angezeigt wird.

**BUG-3 (Live gefunden, behoben):** Nach Behebung von BUG-2 lieferte der Upload einer regulären, unter dem Grössenlimit liegenden Datei einen 403 "new row violates row-level security policy" von `storage.objects`. Ursache: `candidate_documents_select`/`candidate_documents_insert` (aus PROJ-1) hatten für nicht-interne Rollen bereits einen Kandidat-Branch (`(storage.foldername(name))[1] = current_candidate_id()::text`) — dieser wurde aber vor PROJ-20 nie tatsächlich durchlaufen, da jeder reale Zugriff bislang über den `is_internal_role()`-Branch lief (nur internes Personal hat je ein Kandidaten-Dokument hoch-/heruntergeladen). Fix (`20260729120000_fix_candidate_documents_own_folder_check.sql`): Ersetzt den array-basierten Vergleich durch einen einfachen `name like (current_candidate_id()::text || '/%')`-Prefix-Match, der nicht von der genauen Slicing-Semantik von `storage.foldername()` abhängt. Das identische Muster existiert auch für den `contracts`-Bucket — dort nicht angefasst, da ausserhalb des gemeldeten Bugs; sollte bei ähnlichen Symptomen separat geprüft werden.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
