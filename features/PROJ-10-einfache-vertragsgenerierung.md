# PROJ-10: Einfache Vertragsgenerierung

## Status: Planned
**Created:** 2026-07-26

## Dependencies
- Requires: PROJ-9 (Einsatzverwaltung mit Statusverlauf) — ein Vertrag gehört zu einem Einsatz, der mindestens „akzeptiert" sein muss

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich für einen akzeptierten Einsatz ein vorbereitetes Vertragsdokument hochladen, damit der Vertrag für die Unterschrift bereitsteht.
- Als `dafinex_admin`/`internal_coordinator` möchte ich die von den Parteien unterschriebene Version nachträglich hochladen, damit der Vertragsabschluss dokumentiert ist.
- Als `municipality`-Nutzer möchte ich das Vertragsdokument meines Einsatzes herunterladen können, damit ich es unterschreiben/weiterleiten kann.
- Als `municipality`-Nutzer möchte ich benachrichtigt werden, sobald ein Vertrag bereitsteht, damit ich nicht manuell nachfragen muss.

## Out of Scope
- Automatisierte PDF-Generierung aus Vorlage/Daten — „generiert" bedeutet hier: intern bereitet den Vertrag ausserhalb der Plattform vor und lädt ihn hoch (siehe Decision Log); kein PDF-Templating-Paket wird eingeführt
- Digitale Multi-Party-Signaturen — explizites PRD-Non-Goal für Phase 1; Unterschrift erfolgt offline, das Ergebnis wird als Datei hochgeladen
- Upload durch Gemeinde/Kandidat selbst — beide Uploads (generiert und unterschrieben) erfolgen ausschliesslich intern; Gemeinde/Kandidat können nur herunterladen (siehe Decision Log)
- Eigene Vertragsübersichtsliste — ein Vertrag gehört 1:1 zu einem Einsatz und wird auf der bestehenden Einsatz-Detailseite verwaltet
- Benachrichtigung bei „unterschrieben" — nur die im PRD explizit genannte „Vertrag bereit"-Benachrichtigung ist Teil dieser Spec; das volle Trigger-System ist PROJ-11
- Versionierung/Ablauf/Archivierung von Dokumenten (→ PROJ-16, Phase 2)
- Kandidaten-seitige Ansicht des eigenen Vertrags — konsistent mit dem in PROJ-9 etablierten, schrittweisen Ausbau des Kandidatenportals

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Einsatz hat Status „akzeptiert", „aktiv" oder „abgeschlossen" und noch keinen Vertrag, wenn ein interner Nutzer ein Dokument hochlädt, dann wird ein Vertrag mit Status „generiert" angelegt, ein Aktivitätseintrag erstellt und die Gemeinde (Ersteller der ursprünglichen Anfrage) benachrichtigt
- [ ] Angenommen ein Einsatz hat Status „vorgeschlagen", dann ist der Upload eines Vertragsdokuments nicht verfügbar (mit erklärendem Hinweis)
- [ ] Angenommen ein Einsatz hat bereits einen Vertrag, dann wird kein zweiter Vertrag für denselben Einsatz angeboten
- [ ] Angenommen ein Vertrag hat Status „generiert", wenn ein interner Nutzer die unterschriebene Version hochlädt, dann wechselt der Status zu „unterschrieben" und ein Aktivitätseintrag wird erstellt
- [ ] Angenommen ein Vertrag hat Status „unterschrieben", dann ist kein weiterer Upload der unterschriebenen Version mehr möglich
- [ ] Angenommen ein interner Nutzer öffnet die Einsatz-Detailseite, dann sieht er den Vertragsstatus und kann beide Dokumente (sofern vorhanden) herunterladen
- [ ] Angenommen ein `municipality`-Nutzer öffnet die Detailseite eines eigenen Einsatzes, dann sieht er den Vertragsstatus und kann beide Dokumente (sofern vorhanden) herunterladen, jedoch nicht hochladen
- [ ] Angenommen ein `municipality`- oder `candidate`-Nutzer versucht per direktem Aufruf, ein Vertragsdokument hochzuladen oder den Vertragsstatus zu ändern, dann wird dies durch RLS und serverseitige Prüfung verhindert
- [ ] Angenommen ein `municipality`-Nutzer versucht, den Vertrag eines fremden Einsatzes einzusehen, dann wird dies durch RLS verhindert

## Edge Cases
- Falscher Dateityp/zu grosse Datei beim Upload → Validierungsfehler, nichts wird gespeichert (gleiche Grenzen wie PROJ-4: PDF/JPG/PNG, max. 10 MB)
- Zwei interne Nutzer laden gleichzeitig ein generiertes Dokument für denselben Einsatz hoch → zweiter Versuch scheitert an der Duplikatsprüfung (gleiche, bereits in PROJ-7/9 akzeptierte Absicherung auf Anwendungsebene statt DB-Ebene)
- Einsatz wird nach Vertragserstellung auf „abgeschlossen" gesetzt → Vertrag bleibt unverändert einsehbar, keine Wechselwirkung mit dem Einsatzstatus
- Sehr viele Verträge → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bei PROJ-4/6/7/8/9)

## Technical Requirements (optional)
- Security: RLS-Härtung erforderlich — die bestehenden PROJ-1-Policies `contracts_update` und `contracts_documents_insert` erlauben Gemeinde/Kandidat aktuell Schreibzugriff (kein `with check` bei `contracts_update`); werden durch rein interne Policies ersetzt (siehe Decision Log — direkte Anwendung der bei PROJ-8/9 gemachten Erfahrung, diesmal proaktiv statt erst in der QA gefunden)
- Wiederverwendung des bestehenden `contracts`-Storage-Buckets aus PROJ-1 (`<assignment_id>/...`)
- Zugriff: interne Aktionen über `/internal/*`, Lesezugriff der Gemeinde über `/municipality/*`

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Sollen Gemeinde/Kandidat künftig selbst die unterschriebene Version hochladen können, statt sie intern einzureichen? Aktuell bewusst nicht (siehe Decision Log); die dafür nötige RLS-Grundlage existierte bereits aus PROJ-1, wird hier aber durch eine rein interne Policy ersetzt

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–9 vereinbart | 2026-07-26 |
| „Generierung" bedeutet manueller Upload eines extern vorbereiteten Dokuments durch intern, kein automatisiertes PDF-Templating | Kein PDF-Generierungs-Paket im Tech-Stack; „Einfache Vertragsgenerierung" laut PRD-Bezeichnung, echtes Templating wäre über den MVP-Scope hinaus | 2026-07-26 |
| Sowohl das generierte als auch das unterschriebene Dokument werden ausschliesslich von intern hochgeladen; Gemeinde/Kandidat können nur herunterladen | Vermeidet die RLS-Komplexität eines partei-beschränkten Teil-Updates (gleiche Fehlerklasse wie PROJ-8 BUG-1/BUG-2); Dafinex koordiniert den Unterschriftsprozess ohnehin offline und lädt das Endergebnis hoch | 2026-07-26 |
| Vertrag kann erst ab Einsatzstatus „akzeptiert" angelegt werden, nicht bei „vorgeschlagen" | Ein Vertrag ergibt erst Sinn, sobald der Einsatz intern bestätigt ist | 2026-07-26 |
| Nur die „Vertrag bereit"-Benachrichtigung an die Gemeinde ist Teil dieser Spec | Explizit im PRD als Kern-Benachrichtigung genannt; alle weiteren Trigger (inkl. „unterschrieben") sind PROJ-11 | 2026-07-26 |
| Kein separates Vertragslisten-Screen | Verträge sind 1:1 an Einsätze gebunden; die bestehende Einsatz-Detailseite (PROJ-9) ist der richtige Ort, keine zusätzliche Liste nötig im Pilot-Massstab | 2026-07-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## Implementation Notes (Frontend/Backend)
_To be added by /frontend and /backend_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
