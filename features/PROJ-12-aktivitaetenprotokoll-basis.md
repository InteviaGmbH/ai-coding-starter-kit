# PROJ-12: Aktivitätenprotokoll (Basis)

## Status: Planned
**Created:** 2026-07-26

## Dependencies
- Requires: PROJ-5, PROJ-7, PROJ-8, PROJ-9, PROJ-10 — schreiben bereits Einträge in `activity_log` (Anfrage geprüft, Vorschlag vorgeschlagen/freigegeben/abgelehnt/von Gemeinde entschieden, Einsatz angelegt/Statuswechsel, Vertrag generiert/unterschrieben)

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich eine chronologische Übersicht aller wichtigen Ereignisse im System sehen, damit ich nachvollziehen kann, was passiert ist, ohne jede Detailseite einzeln zu prüfen.
- Als `dafinex_admin`/`internal_coordinator` möchte ich erkennen, wer eine Aktion ausgeführt hat, damit Verantwortlichkeiten nachvollziehbar sind.
- Als `dafinex_admin`/`internal_coordinator` möchte ich verständliche, deutsche Beschreibungen der Ereignisse sehen statt roher technischer Feldwerte (`entity_type`/`action`).

## Out of Scope
- Verlinkung der Einträge zu den betroffenen Anfragen/Vorschlägen/Einsätzen/Verträgen (siehe Decision Log) — kann per `/refine` ergänzt werden
- Filter/Suche (z.B. nach Ereignis-Typ, Zeitraum, Akteur) — für die „Basis"-Version bewusst weggelassen, siehe Decision Log
- Vollständige Historie mit Pagination — nur die letzten 50 Einträge, siehe Decision Log
- Nutzung des `details`-JSONB-Felds aus dem PROJ-1-Schema — aktuell befüllt keine der acht bestehenden Schreibstellen dieses Feld, daher kein Anzeige-Bedarf in dieser Spec
- Sichtbarkeit für `municipality`/`candidate` — die bestehende RLS-Policy `activity_log_select_internal` beschränkt das Protokoll bereits auf interne Rollen; diese Spec ändert daran nichts
- Rückwirkendes Ergänzen von Log-Einträgen für Aktionen, die aktuell keinen Eintrag schreiben (z.B. Gemeinden-/Kandidaten-/Kontofreischaltungs-Aktionen aus PROJ-2/3/4/6) — diese Spec macht ausschliesslich die acht bereits bestehenden Schreibstellen sichtbar, ergänzt keine neuen

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein interner Nutzer öffnet `/internal/activity`, dann sieht er die letzten 50 Ereignisse, absteigend nach Zeitpunkt sortiert
- [ ] Angenommen ein Ereignis wird angezeigt, dann sind Akteur (Name), eine verständliche deutsche Beschreibung des Ereignisses und der Zeitpunkt sichtbar
- [ ] Angenommen es liegen noch keine Ereignisse vor, wenn die Seite geöffnet wird, dann erscheint ein Hinweistext statt einer leeren Liste
- [ ] Angenommen ein Ereignis hat eine `entity_type`/`action`-Kombination, für die noch keine deutsche Beschreibung hinterlegt ist, dann wird trotzdem ein sinnvoller Fallback-Text angezeigt statt eines Fehlers oder Absturzes
- [ ] Angenommen der Akteur eines Eintrags ist nicht ermittelbar (`actor_id` ist `null` oder das Profil existiert nicht mehr), dann wird ein Platzhaltertext angezeigt statt eines Fehlers
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht, `/internal/activity` aufzurufen, dann wird er serverseitig auf sein eigenes Portal zurückgeleitet

## Edge Cases
- Sehr viele Ereignisse am selben Tag → reine Sortierung nach Zeitstempel, keine Gruppierung nötig für die Basis-Version
- Unbekannte `entity_type`/`action`-Kombination (z.B. durch eine künftige Feature, die noch nicht ins Mapping aufgenommen wurde) → Fallback-Text statt Absturz (siehe AC)
- Sehr lange Zeit ohne jegliche Aktivität → Hinweistext statt leerer Tabelle
- Direkter Aufruf durch `municipality`/`candidate` → serverseitiger Redirect (Standard-Guard-Muster wie in allen anderen internen Routen)

## Technical Requirements (optional)
- Reine Lesefunktion, keine neue Schreiblogik — nutzt ausschliesslich bereits bestehende `activity_log`-Einträge aus PROJ-5/7/8/9/10
- RLS bereits vorhanden (`activity_log_select_internal` aus PROJ-1) — keine neue Migration erwartet
- Zugriff ausschliesslich über `/internal/*`-Portal

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Sollen Filter, Verlinkung zu den betroffenen Entitäten und/oder Pagination in einem späteren Ausbauschritt ergänzt werden, sobald das Protokoll durch mehr Nutzung länger wird? Aktuell bewusst zurückgestellt (siehe Out of Scope)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Eigene globale Seite `/internal/activity` statt Einbettung pro Entität | Einfachste Umsetzung für eine „Basis"-Version, liefert sofort einen vollständigen Überblick ohne vier bestehende Detailseiten anzufassen | 2026-07-26 |
| Keine Verlinkung der Einträge zu den betroffenen Entitäten | Manche Entitäten (Vorschläge, Verträge) haben keinen eigenständigen Detail-Screen bzw. keinen direkten Anfrage-Bezug im `activity_log`-Datensatz selbst — einheitliches „nur Anzeige"-Verhalten ist konsistenter als teilweise Links | 2026-07-26 |
| Kein Filter/keine Suche in der Basis-Version | Bei aktuell vier Entitätstypen und Pilot-Datenvolumen reicht eine einfache chronologische Liste; Filter ist eine naheliegende spätere Ergänzung, aber kein MVP-Erfordernis | 2026-07-26 |
| Nur die letzten 50 Einträge, keine Pagination | Reicht für den Pilot-Massstab (wenige Gemeinden/Anfragen); konsistent mit dem Muster anderer Listen im Projekt (z.B. Benachrichtigungen in PROJ-11) | 2026-07-26 |
| `details`-JSONB-Feld wird nicht angezeigt | Keine der acht bestehenden Schreibstellen befüllt es aktuell — Anzeige eines leeren Felds hätte keinen Nutzen | 2026-07-26 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Keine neue Tabelle — nutzt `activity_log` (bestehend seit PROJ-1) und `profiles` (Akteur-Name per Join) | Schema deckt bereits alles Nötige ab | 2026-07-26 |
| Reine Server-Component-Seite ohne Server Actions | Rein lesende Funktion (siehe Spec), kein Zustand, kein Client-seitiges Formular nötig — analog zum Ansatz aus PROJ-6 | 2026-07-26 |
| Deutsche Beschreibungstexte über eine feste Zuordnungstabelle (`entity_type` + `action` → Text) im Code, mit Fallback-Text für nicht gemappte Kombinationen | Erfüllt die Anforderung „verständliche deutsche Beschreibung" und den Fallback-AC ohne Schema-Änderung; Fallback verhindert, dass künftige, noch nicht gemappte Ereignistypen (z.B. aus PROJ-13+) die Seite zum Absturz bringen | 2026-07-26 |
| Abfrage: neueste 50 Einträge nach `created_date` absteigend, kein Pagination-Mechanismus | Entspricht der Product Decision „letzte 50, keine Pagination" | 2026-07-26 |
| Akteur-Anzeige mit Fallback „Unbekannt", falls `actor_id` null ist oder das verknüpfte Profil nicht (mehr) existiert | Erfüllt den entsprechenden AC/Edge-Case ohne Absturz | 2026-07-26 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
/internal/activity/                — Aktivitätenprotokoll (Server Component)
  └── ActivityLogTable                Akteur, Beschreibung (deutsch), Zeitpunkt — letzte 50 Einträge
  └── Empty State                     "Noch keine Aktivitäten" bei leerer Liste

Nav-Ergänzung in /internal/layout.tsx: neuer Punkt "Aktivitäten" (nach "Freischaltungen")
```

### Data Model
Keine neue Tabelle. Nutzt ausschliesslich bereits bestehende Strukturen:
- `activity_log` — `actor_id`, `entity_type`, `action`, `created_date` (bereits von PROJ-5/7/8/9/10 befüllt)
- `profiles` — Anzeige des Akteur-Namens (`full_name` oder `email` als Fallback)

### Tech Decisions (Begründung)
- **Reine Server-Component ohne Server Actions** — die Seite liest ausschliesslich, es gibt keinen Nutzer-Input, der eine Mutation auslösen würde; das hält die Implementierung minimal.
- **Feste Text-Zuordnungstabelle statt generischer Anzeige der Rohwerte** — macht das Protokoll für Menschen lesbar (PRD-Anforderung „Basis"-Protokoll), ohne das bestehende Schema zu verändern; ein Fallback deckt zukünftige, noch nicht gemappte Ereignisse ab, ohne dass diese Seite bei jeder neuen Feature-Erweiterung zwingend mit angepasst werden müsste.
- **Kein Pagination-Mechanismus** — bei Pilot-Datenvolumen unnötig; die letzten 50 Einträge decken den relevanten Zeitraum ab.

### Dependencies (zu installierende Pakete)
- Keine neuen Pakete — nutzt bereits vorhandene shadcn-Komponenten (Table, Badge) aus PROJ-3/4/5/6/7/8/9.

## Implementation Notes (Frontend/Backend)

**Umgesetzt:**
- `src/app/internal/activity/page.tsx`: Server Component, liest die letzten 50 `activity_log`-Einträge (`order by created_date desc, limit 50`) inkl. Akteur-Join auf `profiles`
- `src/components/portal/activity-log-table.tsx`: `ActivityLogTable` + `describeActivity()`-Mapping (`entity_type`/`action` → deutscher Satz) mit Fallback `"${entityType}: ${action}"` für nicht gemappte Kombinationen; deckt aktuell alle 12 bestehenden Kombinationen aus PROJ-5/7/8/9/10 ab
- Akteur-Anzeige mit Fallback „Unbekannt" bei fehlendem `actor_id`/Profil
- Nav-Eintrag „Aktivitäten" in `internal/layout.tsx` ergänzt
- Keine neue Server Action, keine neue Migration — reine Lesefunktion auf Basis bestehender RLS (`activity_log_select_internal`)
- Kein neuer Vitest-Test nötig (keine Server-Action-Logik, analog zu PROJ-6); Testabdeckung der Mapping-/Fallback-Logik erfolgt in `/qa`
- `npm test` (61/61, unverändert), `npm run build` grün; Smoke-Test gegen laufenden Dev-Server: neue geschützte Route `/internal/activity` → 307-Redirect ohne Login

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
