# PROJ-17: Vollständiges Nachrichtensystem

## Status: Architected
**Created:** 2026-07-31
**Last Updated:** 2026-07-31 (Tech Design ergänzt — siehe Abschnitt "Tech Design (Solution Architect)")

## Dependencies
- Requires: PROJ-2 (Auth & Portal-Grundgerüst) — Rollenprüfung, Portal-Shell (intern/Gemeinde/Kandidat)
- Requires: PROJ-3 (Gemeindenverwaltung) — Gemeinde als Bezugsentität für den allgemeinen Nachrichten-Thread ohne Anfrage-Bezug
- Requires: PROJ-4 (Kandidatenverwaltung) — für interne Notizen an Kandidaten und den allgemeinen Nachrichten-Thread ohne Einsatz-Bezug
- Requires: PROJ-5 (Personalanfrage-Workflow) — Anfrage als Bezugsentität für Nachrichten-Threads und interne Notizen
- Requires: PROJ-9 (Einsatzverwaltung) — Einsatz als Bezugsentität für Nachrichten-Threads und interne Notizen
- Requires: PROJ-11 (Kern-Benachrichtigungen) — bestehende `notifications`-Tabelle, Glocke, „als gelesen markieren"; diese Spec erweitert die Anzeige um eine vollständige, filterbare Seite und einen neuen Trigger-Typ „Neue Nachricht"
- Requires: PROJ-12 (Aktivitätenprotokoll Basis) — neue Notiz-Aktionen (Hinzufügen/Löschen) werden dort als Ereignis sichtbar, analog zu bestehenden Schreibaktionen

## User Stories
- Als `municipality`-Nutzer möchte ich zu einer meiner Personalanfragen eine Nachricht an Dafinex schreiben können (z.B. Rückfrage zum Status), damit ich nicht per Telefon/E-Mail ausserhalb der Plattform kommunizieren muss.
- Als `candidate` möchte ich zu einem meiner Einsätze eine Nachricht an Dafinex schreiben können (z.B. Frage zu Startdatum oder Konditionen), damit ich eine dokumentierte, direkte Kommunikationsmöglichkeit habe.
- Als `candidate` ohne aktuell aktiven Einsatz möchte ich trotzdem eine allgemeine Nachricht an Dafinex schreiben können (z.B. eine Frage vor dem ersten Einsatz), damit ich nicht erst auf einen Einsatz warten muss, um überhaupt Kontakt aufnehmen zu können.
- Als `dafinex_admin`/`internal_coordinator` möchte ich Nachrichten von Gemeinden und Kandidaten sehen und beantworten können, direkt im Kontext der jeweiligen Anfrage/des jeweiligen Einsatzes, damit ich nicht zwischen E-Mail-Postfach und Plattform wechseln muss.
- Als Nutzer (egal welche Rolle) möchte ich auf einen Blick sehen, ob es ungelesene Nachrichten gibt, damit ich nichts übersehe.
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine interne Notiz an einen Kandidaten, eine Anfrage oder einen Einsatz anhängen können, damit Absprachen und Beobachtungen, die NICHT für die Gemeinde/den Kandidaten bestimmt sind, trotzdem für das ganze interne Team sichtbar festgehalten werden.
- Als Nutzer (egal welche Rolle) möchte ich meine vollständige Benachrichtigungshistorie durchsuchen/filtern können (nach Status und Typ), statt nur die letzten 10 in der Glocke zu sehen.

## Out of Scope
- **Direkte Kommunikation zwischen Gemeinde und Kandidat** — Dafinex bleibt in jedem Nachrichten-Thread die vermittelnde Partei, passend zum B2B-Vermittlungsmodell aus dem PRD; Gemeinde und Kandidat sehen sich gegenseitig nicht und tauschen keine Nachrichten direkt aus
- **Eigenständige Nachrichten mit je eigenem Betreff (E-Mail-artiges Postfach)** — stattdessen ein durchgehender Verlauf pro Anfrage bzw. Einsatz mit einem einmalig gesetzten Betreff, siehe Decision Log
- **Nachrichten-Threads zu anderen Entitäten** (z.B. zu einem einzelnen Kandidatenvorschlag oder Vertrag) — nur Anfrage, Einsatz und der allgemeine Thread (ohne Bezugsentität, siehe unten) sind vorgesehen
- **Anhänge/Dateien in Nachrichten** — reiner Text; Dateien laufen weiterhin über das bestehende Dokumentenmanagement (PROJ-16) bzw. Verträge (PROJ-10)
- **Echtzeit-Aktualisierung (Live-Chat ohne Neuladen)** — Nachrichten erscheinen beim nächsten Laden/Neuladen der Seite, kein WebSocket/Realtime-Abo nötig für den Pilot-Massstab
- **Bearbeiten oder Löschen einer bereits gesendeten Nachricht** — Nachrichten sind unveränderlich, sobald gesendet (wie bei E-Mail); Korrekturen erfolgen durch eine neue Nachricht im selben Verlauf
- **Notizen sichtbar für Gemeinde oder Kandidat** — interne Notizen bleiben ausschliesslich ein internes Koordinationswerkzeug, klar optisch getrennt von den Nachrichten-Threads, analog zur bestehenden Abgrenzung des Aktivitätenprotokolls (PROJ-12: `activity_log_select_internal`)
- **Soft Delete / Wiederherstellen gelöschter Notizen** — echtes Löschen, siehe Decision Log
- **Bearbeiten (Editieren) einer bestehenden Notiz** — nur Hinzufügen und Löschen
- **Filter/Suche im Aktivitätenprotokoll (`/internal/activity`)** — bleibt bewusst aussen vor; „alle Filter" in dieser Spec bezieht sich ausschliesslich auf die Benachrichtigungsseite
- **E-Mail-/Push-Benachrichtigungen, Erinnerungslogik** — bleibt vollständig PROJ-18 (P2), wie bereits in PROJ-11/16 festgelegt
- **Benachrichtigungs-Einstellungen/Präferenzen pro Nutzer** — nicht im PRD-Scope für den Piloten (unverändert aus PROJ-11)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion], dann [Ergebnis]

### Nachrichten: Gemeinde ↔ Dafinex (an einer Anfrage)
- [ ] Angenommen ein `municipality`-Nutzer öffnet eine seiner Anfragen, dann sieht er einen Bereich „Nachrichten" mit dem bisherigen Verlauf (falls vorhanden), chronologisch aufsteigend, inkl. Absender und Zeitpunkt je Nachricht
- [ ] Angenommen noch keine Nachricht existiert, wenn der Nutzer die erste Nachricht zu dieser Anfrage schreibt, dann kann er optional einen Betreff und muss einen Inhalt angeben; der Betreff gilt für den gesamten Verlauf dieser Anfrage
- [ ] Angenommen ein Verlauf existiert bereits (Betreff gesetzt), wenn eine weitere Nachricht geschrieben wird, dann wird nur noch der Inhalt erfasst, kein neuer Betreff
- [ ] Angenommen eine Nachricht wird ohne Inhalt abgeschickt, dann erscheint eine Validierungsfehlermeldung
- [ ] Angenommen ein `municipality`-Nutzer sendet eine Nachricht, dann sehen alle aktiven internen Nutzer diese Nachricht im selben Anfrage-Verlauf und erhalten eine Benachrichtigung „Neue Nachricht"
- [ ] Angenommen internes Personal antwortet auf einer Anfrage, dann erhält die erstellende Person der Anfrage (`personnel_requests.created_by_id`) eine Benachrichtigung „Neue Nachricht"
- [ ] Angenommen ein `municipality`-Nutzer versucht, den Nachrichtenverlauf einer fremden (nicht seiner eigenen Gemeinde zugehörigen) Anfrage einzusehen, dann wird der Zugriff verweigert

### Nachrichten: Kandidat ↔ Dafinex (an einem Einsatz)
- [ ] Angenommen ein Kandidat öffnet einen seiner Einsätze, dann sieht er einen Bereich „Nachrichten" mit demselben Verhalten (Betreff einmalig, Verlauf, Absender, Zeitpunkt) wie beim Anfrage-Verlauf
- [ ] Angenommen ein Kandidat sendet eine Nachricht, dann sehen alle aktiven internen Nutzer diese im selben Einsatz-Verlauf und erhalten eine Benachrichtigung „Neue Nachricht"
- [ ] Angenommen internes Personal antwortet in einem Einsatz-Verlauf, dann erhält der zugehörige Kandidat (`assignments` → `candidates.profile_id`) eine Benachrichtigung „Neue Nachricht"
- [ ] Angenommen ein Kandidat versucht, den Nachrichtenverlauf eines fremden Einsatzes einzusehen, dann wird der Zugriff verweigert
- [ ] Angenommen eine Gemeinde versucht, auf den Nachrichtenverlauf eines Einsatzes zuzugreifen (Kandidat-Dafinex-Kommunikation), dann wird der Zugriff verweigert — und umgekehrt kann ein Kandidat nicht auf den Anfrage-Verlauf einer Gemeinde zugreifen

### Allgemeiner Nachrichten-Thread (ohne Bezugsentität)
- [ ] Angenommen ein Kandidat hat keinen aktiven Einsatz, dann sieht er auf seinem Dashboard trotzdem einen Bereich „Allgemeine Nachrichten an Dafinex" mit demselben Verhalten (Betreff einmalig, Verlauf, Absender, Zeitpunkt, automatisch gelesen beim Öffnen) wie ein Anfrage-/Einsatz-Verlauf
- [ ] Angenommen ein Kandidat sendet eine allgemeine Nachricht, dann erhalten alle aktiven internen Nutzer eine Benachrichtigung „Neue Nachricht" und sehen den Verlauf diesem Kandidaten zugeordnet (nicht einer Anfrage/einem Einsatz)
- [ ] Angenommen eine Gemeinde hat noch keine Personalanfrage erstellt, dann steht ihr aus demselben Grund ebenfalls ein allgemeiner Nachrichten-Thread auf ihrem Dashboard zur Verfügung
- [ ] Angenommen ein Kandidat/eine Gemeinde erhält später einen Einsatz/eine Anfrage, dann bleibt der allgemeine Thread als eigener, unveränderter Verlauf bestehen (kein automatisches Zusammenführen mit dem neuen Anfrage-/Einsatz-Thread)

### Gelesen/Ungelesen
- [ ] Angenommen ein Verlauf enthält Nachrichten, die die aktuell eingeloggte Partei noch nicht gesehen hat, dann sind diese optisch als ungelesen erkennbar, solange die Seite nicht geöffnet wurde
- [ ] Angenommen die betroffene Partei öffnet die Anfrage-/Einsatz-Seite mit dem Nachrichtenverlauf, dann gelten alle bis dahin empfangenen Nachrichten automatisch als gelesen, ohne zusätzlichen Klick

### Interne Notizen
- [ ] Angenommen internes Personal öffnet eine Kandidaten-, Anfrage- oder Einsatz-Detailseite, dann sieht es einen separaten, klar als „intern" gekennzeichneten Bereich „Interne Notizen" — optisch getrennt vom Nachrichten-Bereich — mit allen bisherigen Notizen zu dieser Entität, neueste zuerst
- [ ] Angenommen internes Personal trägt Notiztext ein und speichert, dann erscheint die neue Notiz sofort oben in der Liste, mit Autor (Name) und Zeitpunkt
- [ ] Angenommen eine Notiz wird ohne Text abgeschickt, dann erscheint eine Validierungsfehlermeldung statt einer leeren Notiz
- [ ] Angenommen eine Entität hat noch keine Notizen, dann erscheint ein Hinweistext („Noch keine Notizen") statt einer leeren Liste
- [ ] Angenommen internes Personal klickt bei einer Notiz auf „Löschen" und bestätigt, dann verschwindet sie dauerhaft aus der Liste
- [ ] Angenommen eine Gemeinde oder ein Kandidat versucht (z.B. direkt über die API), auf interne Notizen zuzugreifen, dann wird der Zugriff verweigert
- [ ] Angenommen eine Notiz wird hinzugefügt oder gelöscht, dann erscheint ein entsprechender Eintrag im Aktivitätenprotokoll (`/internal/activity`)

### Vollständige Benachrichtigungsseite
- [ ] Angenommen ein Nutzer öffnet `/notifications`, dann sieht er seine vollständige Benachrichtigungshistorie (nicht nur die letzten 10), absteigend nach Zeitpunkt sortiert, mit Pagination (20 pro Seite)
- [ ] Angenommen die Seite wird geöffnet, dann kann nach Status (alle/gelesen/ungelesen) und Typ gefiltert werden (inkl. des neuen Typs „Neue Nachricht")
- [ ] Angenommen ein Filter ist aktiv, wenn die Liste neu geladen wird, dann werden nur die passenden Benachrichtigungen angezeigt, ohne dass fremde Einträge sichtbar werden
- [ ] Angenommen keine Benachrichtigungen entsprechen dem aktuellen Filter, dann erscheint ein Hinweistext statt einer leeren Liste ohne Erklärung
- [ ] Angenommen der Nutzer markiert eine Benachrichtigung auf dieser Seite als gelesen, dann aktualisiert sich sowohl die Liste als auch der Zähler im Glocken-Symbol
- [ ] Angenommen die Glocke wird geöffnet, dann gibt es einen Link „Alle anzeigen", der zu `/notifications` führt
- [ ] Angenommen ein Nutzer klickt auf eine „Neue Nachricht"-Benachrichtigung, dann wird er zur betroffenen Anfrage-/Einsatzseite mit dem Nachrichtenverlauf weitergeleitet
- [ ] Angenommen ein Nutzer versucht per direktem Aufruf, Benachrichtigungen eines anderen Nutzers auf `/notifications` einzusehen oder zu filtern, dann liefert die Abfrage ausschliesslich die eigenen Benachrichtigungen (RLS)

## Edge Cases
- Gemeinde schreibt eine Nachricht, aber es gibt aktuell keine aktiven internen Nutzer → Nachricht wird trotzdem gespeichert und im Verlauf sichtbar, einfach keine Benachrichtigung versendet (analog zu PROJ-11)
- Zwei interne Nutzer antworten gleichzeitig im selben Verlauf → beide Nachrichten werden unabhängig gespeichert und erscheinen beide, kein Konflikt (jede Nachricht ist ein eigener Datensatz)
- Sehr lange Nachricht/Notiz (nahe am Zeichenlimit) → wird vollständig gespeichert und angezeigt, Textfeld umbricht mehrzeilig
- Anfrage/Einsatz wird gelöscht (kaskadierend, falls das je vorkommt) → zugehörige Nachrichten/Notizen werden per `ON DELETE CASCADE` mitentfernt, kein verwaister Datensatz
- Kandidat/Gemeinde hat noch keine Anfrage/keinen Einsatz → allgemeiner Thread auf dem Dashboard deckt diesen Fall ab, kein Nachrichten-Bereich fehlt komplett
- Kandidat/Gemeinde hat sowohl einen allgemeinen Thread als auch mindestens einen Anfrage-/Einsatz-Thread → beide bleiben unabhängig nebeneinander bestehen, keine Zusammenführung
- Nutzer hat gar keine Benachrichtigungen → `/notifications` zeigt Hinweistext, kein Fehler
- Sehr viele Benachrichtigungen (>1000) → Pagination verhindert, dass die Seite alles auf einmal lädt

## Technical Requirements (optional)
- Security: Neue Tabellen für Nachrichten und für interne Notizen, beide mit RLS; Nachrichten-RLS beschränkt eine Gemeinde/einen Kandidaten strikt auf die eigene(n) Anfrage(n)/Einsätze, interne Notizen ausschliesslich für interne Rollen (`is_internal_role()`)
- Wiederverwendung der bestehenden `notifications`-Tabelle/RLS-Policies aus PROJ-11 für Nachrichten-Benachrichtigungen und die neue `/notifications`-Seite — keine Schemaänderung an `notifications`, nur ein neuer Typwert und zusätzliche Abfragen (Filter/Pagination)

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
_Keine offenen Fragen._

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Scope umfasst jetzt echte Nachrichten zwischen Gemeinde/Dafinex und Kandidat/Dafinex, zusätzlich zu internen Notizen und der Benachrichtigungsseite | Nutzer-Korrektur nach erster Entwurfsrunde: laut ursprünglicher Anforderung (Abschnitt 11) und als zentrales Verkaufsargument für die Kunden-Präsentation ausdrücklich gefordert | 2026-07-31 |
| Dafinex bleibt in jedem Nachrichten-Thread die vermittelnde Partei — keine direkte Gemeinde↔Kandidat-Kommunikation | Passt zum B2B-Vermittlungsmodell aus dem PRD; Gemeinde und Kandidat haben laut PRD ohnehin keinen direkten Kontakt (Interview läuft z.B. laut PROJ-8 informell über Dafinex) | 2026-07-31 |
| Ein durchgehender Nachrichten-Thread pro Anfrage (Gemeinde) bzw. pro Einsatz (Kandidat), kein Postfach mit mehreren Betreffs | Einfacher, passt zum etablierten Detailseiten-Muster im Projekt; ein Betreff pro Anfrage/Einsatz reicht für den Piloten, keine Notwendigkeit für mehrere parallele Gesprächsfäden zur selben Entität | 2026-07-31 |
| Zusätzlich genau ein allgemeiner Thread pro Kandidat bzw. pro Gemeinde (ohne Anfrage-/Einsatz-Bezug, `message_type = 'general'`), sichtbar auf dem jeweiligen Dashboard | Nutzer-Korrektur: ein Kandidat ohne aktiven Einsatz muss trotzdem Dafinex kontaktieren können; aus Konsistenzgründen dieselbe Möglichkeit auch für eine Gemeinde ohne aktuelle Anfrage ergänzt (nicht explizit gefordert, aber dieselbe Lücke), da dieselbe Tabellenstruktur (nullable Bezugsentität) dies ohne Mehraufwand abdeckt — bei Bedarf in `/refine` wieder einschränkbar | 2026-07-31 |
| Betreff wird einmalig mit der ersten Nachricht eines Verlaufs gesetzt (optional), danach nur noch Inhalt pro weiterer Nachricht | Erfüllt die Anforderung „Betreff" beim Erstellen einer Nachricht, ohne ein volles E-Mail-Postfach-Modell nachzubauen | 2026-07-31 |
| Kein Editieren/Löschen gesendeter Nachrichten | Nachrichten sind wie E-Mail eine verbindliche Kommunikation zwischen Parteien; nachträgliches Ändern würde Nachvollziehbarkeit untergraben | 2026-07-31 |
| Keine Datei-Anhänge in Nachrichten | Dateien laufen bereits über etablierte, eigene Prozesse (PROJ-16 Dokumente, PROJ-10 Verträge); Vermischung würde Scope unnötig vergrössern | 2026-07-31 |
| Kein Echtzeit-Chat (kein WebSocket/Realtime) | Pilot-Massstab, konsistent mit dem Rest des Projekts (kein Realtime irgendwo sonst im Einsatz); Nachrichten erscheinen beim nächsten Laden | 2026-07-31 |
| Gelesen/Ungelesen wird automatisch beim Öffnen des Verlaufs gesetzt (nicht per Klick) | Für einen Nachrichtenverlauf ist automatisches Lesen das erwartete Verhalten (wie Chat/E-Mail); explizites Klicken wie bei Benachrichtigungen wäre hier unüblich und würde die Live-Demo unnötig verkomplizieren | 2026-07-31 |
| Neue Nachricht löst automatisch eine Glocken-Benachrichtigung bei der Gegenseite aus (Broadcast an alle aktiven internen Nutzer analog zu „Neue Anfrage" aus PROJ-11, bzw. gezielt an Gemeinde/Kandidat) | Stellt sicher, dass Nachrichten nicht übersehen werden — insbesondere für die Kunden-Präsentation wichtig, dass die Funktion sichtbar und nachvollziehbar reagiert | 2026-07-31 |
| Interne Notizen bleiben bestehen, aber klar optisch von Nachrichten getrennt und weiterhin nur intern sichtbar | Ausdrücklicher Nutzerwunsch: beide Konzepte sind unterschiedlich (Notiz = intern, nie sichtbar für Gegenseite; Nachricht = direkte Kommunikation mit der Gegenseite) und dürfen nicht vermischt werden | 2026-07-31 |
| Notizen an Kandidaten, Anfragen UND Einsätze anhängbar | Deckt die typischen internen Koordinationsfälle über den ganzen Workflow ab | 2026-07-31 |
| Jedes interne Personal darf jede Notiz bearbeiten/löschen, nicht nur der Ersteller | Passend zum 2-3-köpfigen, eng zusammenarbeitenden Team; konsistent mit „Last write wins" bei anderen gemeinsam gepflegten Feldern im Projekt | 2026-07-31 |
| Echtes Löschen (kein Soft Delete) für Notizen, kein Editieren bestehender Notizen | Reine Freitext-Vermerke ohne Rechtsverbindlichkeit; Löschen als Aktion bleibt trotzdem im Aktivitätenprotokoll (PROJ-12) sichtbar; Korrektur = neue Notiz nach Löschen der alten | 2026-07-31 |
| Neue, eigene Seite `/notifications` statt Erweiterung des Glocken-Popovers | Eine echte Historie mit Filtern/Pagination passt nicht sinnvoll in ein Popover; die Glocke bleibt für den Schnellüberblick, bekommt nur einen Link zur neuen Seite | 2026-07-31 |
| Filter auf der Benachrichtigungsseite: Status (gelesen/ungelesen) + Typ; Pagination 20/Seite | Deckt die naheliegendsten Suchbedürfnisse ab, ohne die UI zu überladen; konsistent mit bereits etablierten festen Listenlimits im Projekt | 2026-07-31 |
| Nachrichten-/Notiz-Textlimit: 5000 bzw. 2000 Zeichen | Nachrichten dürfen etwas ausführlicher sein als interne Kurz-Notizen; beide grosszügig genug, aber nicht unbegrenzt | 2026-07-31 |
| Filter/Suche im Aktivitätenprotokoll (PROJ-12) bleibt explizit ausserhalb dieser Spec | War in PROJ-12 nur als offene Frage vermerkt, nicht als PROJ-17-Abhängigkeit dokumentiert | 2026-07-31 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Eine einzige `messages`-Tabelle mit Bezugstyp (`request`/`assignment`/`general_candidate`/`general_municipality`) + nullable Bezugs-ID statt vier getrennter Tabellen | Einfacher zu pflegen, eine gemeinsame Filterlogik für „alle meine Nachrichten"/„alle neuen Nachrichten" | 2026-07-31 |
| Betreff wird als eigenes, nullable Feld auf der Nachrichten-Zeile geführt (nicht auf einer separaten „Thread"-Tabelle), gesetzt bei der ersten Nachricht eines Verlaufs und beim Anzeigen von der jeweils ältesten Nachricht mit gesetztem Betreff übernommen | Vermeidet eine zusätzliche Tabelle nur für den Betreff; ein Verlauf ist bereits durch Bezugstyp+Bezugs-ID eindeutig identifiziert | 2026-07-31 |
| Gelesen-Status als zwei Boolean-Spalten (`read_by_internal`, `read_by_counterpart`) statt einer nutzerbezogenen Zuordnungstabelle | Deckt das Produkt-Verhalten „automatisch gelesen beim Öffnen durch die jeweils andere Seite" ab, ohne pro-Nutzer-Tracking; passt zum kleinen internen Team, das sich eine gemeinsame „gelesen"-Sicht teilt | 2026-07-31 |
| Neuer Benachrichtigungstyp „Neue Nachricht" in der bestehenden `notifications`-Tabelle (kein Schema-Update, nur ein neuer zulässiger Wert im bereits text-basierten Typ-Feld) | Wiederverwendung der aus PROJ-11 etablierten Infrastruktur (Glocke, RLS, „als gelesen markieren") | 2026-07-31 |
| Broadcast-Empfänger-Ermittlung für Nachrichten von Gemeinde/Kandidat an „alle aktiven internen Nutzer" nutzt denselben Admin-Client-Lookup wie der bestehende „Neue Anfrage"-Broadcast aus PROJ-11 | Bereits etabliertes, sicheres Muster (Admin-Client nur lesend für den Empfänger-Lookup, der eigentliche Insert bleibt RLS-geprüft) — keine neue Sicherheitsfläche | 2026-07-31 |
| Separate `candidate_notes`/`request_notes`/`assignment_notes`-Zeilen über eine gemeinsame `internal_notes`-Tabelle mit Bezugstyp+Bezugs-ID (analog zu `messages`), statt drei eigener Tabellen | Konsistent mit der Nachrichten-Tabelle; eine Tabelle statt drei vereinfacht RLS (eine Policy: „nur intern") und künftige Erweiterungen um weitere Entitätstypen | 2026-07-31 |
| RLS für `messages`: Gemeinde-Zugriff geprüft über Zugehörigkeit der referenzierten Anfrage zur eigenen Gemeinde bzw. direkten Profilvergleich beim allgemeinen Thread; Kandidat analog über den referenzierten Einsatz bzw. den eigenen Kandidaten-Datensatz; internes Personal uneingeschränkt (`is_internal_role()`) | Gleiches Verteidigungs-in-der-Tiefe-Prinzip wie überall sonst im Projekt: serverseitige Rollenprüfung in der Server Action plus RLS als zweite Linie | 2026-07-31 |
| RLS für `internal_notes`: ausschliesslich `is_internal_role()`, keine Ausnahme | Notizen dürfen unter keinen Umständen für Gemeinde/Kandidat sichtbar sein, auch nicht versehentlich über einen direkten API-Aufruf | 2026-07-31 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure

```
Anfrage-Detailseite (Gemeinde: /municipality/requests/[id], Intern: /internal/requests/[id])
└── Nachrichten-Bereich (neu, gemeinsamer Baustein)
      ├── Verlauf (bisherige Nachrichten, Absender + Zeitpunkt, neueste unten)
      ├── Betreff-Anzeige (gesetzt) bzw. Betreff-Eingabe (nur bei der allerersten Nachricht)
      └── Formular „Neue Nachricht" (Inhalt + Senden-Button)

Einsatz-Detailseite (Kandidat: /candidate/assignments/[id], Intern: /internal/assignments/[id])
└── Nachrichten-Bereich (derselbe Baustein wie oben, andere Bezugsentität)

Dashboard (Kandidat: /candidate/dashboard, Gemeinde: /municipality/dashboard)
└── „Allgemeine Nachrichten an Dafinex" (derselbe Baustein, ohne Anfrage-/Einsatz-Bezug)

Kandidaten-/Anfrage-/Einsatz-Detailseite (nur intern: /internal/candidates/[id],
/internal/requests/[id], /internal/assignments/[id])
└── Interne Notizen (neuer, klar als „intern" gekennzeichneter, separater Bereich)
      ├── Notizliste (Autor, Zeitpunkt, Text, neueste zuerst)
      ├── Formular „Neue Notiz"
      └── „Löschen" pro Notiz (mit Bestätigungsdialog)

Neue Seite /notifications (eigene Version pro Portal: intern/Gemeinde/Kandidat)
├── Filterleiste (Status: alle/gelesen/ungelesen · Typ: Dropdown inkl. „Neue Nachricht")
├── Liste (paginiert, 20 pro Seite)
└── Leerer Zustand („Keine Benachrichtigungen gefunden")

Glocken-Symbol (bestehend aus PROJ-11, erweitert)
└── neuer Link „Alle anzeigen" → /notifications
```

### B) Data Model (plain language)

**Nachrichten** (eine neue Tabelle, eine Zeile pro einzelner Nachricht):
- Bezugstyp: Anfrage / Einsatz / Allgemein-Kandidat / Allgemein-Gemeinde
- Bezugs-ID (bei „Allgemein" leer, da keine Anfrage/Einsatz zugrunde liegt)
- Betreff (nur bei der ersten Nachricht eines Verlaufs gesetzt, danach leer/übernommen)
- Inhalt (Text, bis 5000 Zeichen)
- Absender (Person + erkennbar, ob Gemeinde/Kandidat/intern)
- Zeitpunkt
- Gelesen-Status je Seite: „von Dafinex gelesen" und „von der Gegenseite (Gemeinde/Kandidat) gelesen" — zwei getrennte Merker, kein einzelnes gelesen/ungelesen-Feld, weil auf der internen Seite mehrere Personen denselben Verlauf teilen

**Interne Notizen** (eine neue Tabelle, eine Zeile pro Notiz):
- Bezugstyp: Kandidat / Anfrage / Einsatz
- Bezugs-ID
- Text (bis 2000 Zeichen)
- Autor (Name der internen Person)
- Zeitpunkt

**Bestehende `notifications`-Tabelle** (aus PROJ-11, unverändert im Aufbau): bekommt lediglich einen neuen möglichen Wert für den Benachrichtigungstyp („Neue Nachricht"), keine neue Spalte nötig.

### C) Tech Decisions (justified for PM)

1. **Ein Bezugstyp+Bezugs-ID-Paar statt vier getrennter Nachrichten-Tabellen.** Eine einzige Tabelle für alle vier Nachrichten-Kontexte (Anfrage/Einsatz/beide Allgemein-Varianten) ist einfacher zu pflegen, und die Filterlogik für „alle meine Nachrichten" bleibt an einer Stelle statt über vier Tabellen verteilt.
2. **Gelesen-Status ist seitenbezogen, nicht personenbezogen.** Da mehrere interne Personen denselben Verlauf sehen (2-3-köpfiges Team), würde ein Gelesen-Status pro einzelner Person unnötige Komplexität schaffen — „von Dafinex gelesen" reicht, sobald irgendeine interne Person den Verlauf geöffnet hat (konsistent mit dem bereits etablierten „jedes interne Personal darf..."-Muster bei Notizen).
3. **Wiederverwendung der bestehenden Benachrichtigungs-Infrastruktur** (Glocke, `notifications`-Tabelle aus PROJ-11) für den Hinweis auf neue Nachrichten, statt eines zweiten, separaten Benachrichtigungswegs.
4. **Ein gemeinsamer UI-Baustein „Nachrichten-Bereich"** für alle vier Kontexte (Anfrage/Einsatz/beide Allgemein-Varianten) sorgt für konsistentes Verhalten und weniger Aufwand als vier eigene Implementierungen.
5. **Zugriffsschutz strikt nach Bezug getrennt:** Eine Gemeinde sieht ausschliesslich ihre eigenen Anfrage-Threads plus ihren eigenen allgemeinen Thread; ein Kandidat ausschliesslich seine eigenen Einsatz-Threads plus seinen eigenen allgemeinen Thread; internes Personal sieht alles. Interne Notizen sind in jedem Fall ausschliesslich für internes Personal sichtbar.
6. **Bestehende `Pagination`-Komponente (shadcn, bereits installiert)** wird für `/notifications` wiederverwendet.

### D) Dependencies (packages to install)
- Keine neuen Pakete — nutzt bereits installierte shadcn-Komponenten (`Textarea`, `Card`, `Pagination`, `Select`, `Badge`, `AlertDialog`).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
