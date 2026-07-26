# PROJ-7: Kandidatenvorschlag & interne Freigabe

## Status: Planned
**Created:** 2026-07-26

## Dependencies
- Requires: PROJ-5 (Personalanfrage-Workflow) — eine Anfrage muss Status „geprüft" haben, bevor Kandidaten vorgeschlagen werden können
- Requires: PROJ-6 (Kandidatensuche mit Matching-Filter) — liefert den „Kandidat vorschlagen"-Button (bisher deaktivierter Platzhalter), der hier aktiviert wird

## User Stories
- Als `dafinex_admin`/`internal_coordinator` möchte ich aus der Kandidatensuche heraus einen Kandidaten für eine Anfrage vorschlagen, damit der Auswahlprozess dokumentiert ist.
- Als `dafinex_admin`/`internal_coordinator` möchte ich alle Vorschläge zu einer Anfrage mit Status sehen, damit ich den Überblick behalte, wer bereits vorgeschlagen wurde.
- Als `dafinex_admin`/`internal_coordinator` möchte ich einen Vorschlag intern freigeben oder ablehnen, damit nur geprüfte Vorschläge in den nächsten Schritt (Gemeinde-Interview, PROJ-8) gehen.
- Als `dafinex_admin`/`internal_coordinator` möchte ich einen versehentlich erstellten, noch nicht entschiedenen Vorschlag zurückziehen können, damit Fehler korrigierbar sind.

## Out of Scope
- Sichtbarkeit/Interaktion für die Gemeinde (Ansehen, Interview, Annahme/Ablehnung eines freigegebenen Vorschlags) — das ist PROJ-8; diese Spec liefert nur die interne Seite des Workflows
- Automatische Benachrichtigung der Gemeinde bei Freigabe — es existiert noch keine Gemeinde-Ansicht für Vorschläge (kommt mit PROJ-8); volle Benachrichtigungstrigger ohnehin erst PROJ-11
- Freitext-Begründung/Notizen zu einem Vorschlag oder einer Ablehnung — volles Nachrichtensystem ist PROJ-17 (P2), hier reicht der reine Status
- Erneutes Entscheiden eines bereits freigegebenen/abgelehnten Vorschlags (Rückgängig machen) — Entscheidungen sind final in P0
- Automatische Konflikterkennung (z.B. Kandidat bereits einem anderen, überschneidenden Einsatz vorgeschlagen) — nicht Teil des PRD-Scopes für den Pilot
- Globale, anfrageübergreifende Vorschlagsliste (`/internal/proposals`) — für den Pilot mit einer Gemeinde reicht die anfragebezogene Ansicht; kann später per `/refine` ergänzt werden

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen eine Anfrage hat Status „geprüft", wenn ein interner Nutzer in der Kandidatensuche (PROJ-6) auf „Kandidat vorschlagen" klickt und bestätigt, dann wird ein Vorschlag mit Status „vorgeschlagen" angelegt und ein Aktivitätseintrag erstellt
- [ ] Angenommen eine Anfrage hat Status „erstellt" (noch nicht geprüft), dann ist „Kandidat vorschlagen" weiterhin deaktiviert mit einem erklärenden Hinweis
- [ ] Angenommen für einen Kandidaten existiert bereits ein Vorschlag mit Status „vorgeschlagen" zur selben Anfrage, wenn erneut „vorschlagen" versucht wird, dann wird dies verhindert (kein doppelter offener Vorschlag) und ein Hinweis erklärt warum
- [ ] Angenommen ein interner Nutzer öffnet die Detailseite einer Anfrage, dann sieht er die Anzahl/den Zugang zu den bisherigen Vorschlägen dieser Anfrage
- [ ] Angenommen ein interner Nutzer öffnet die Vorschlagsliste einer Anfrage, dann sieht er alle Vorschläge mit Kandidatenname, Status-Badge, vorgeschlagen von, Datum
- [ ] Angenommen ein Vorschlag hat Status „vorgeschlagen", wenn ein interner Nutzer ihn freigibt, dann wechselt der Status zu „freigegeben" und ein Aktivitätseintrag wird erstellt
- [ ] Angenommen ein Vorschlag hat Status „vorgeschlagen", wenn ein interner Nutzer ihn ablehnt, dann wechselt der Status zu „abgelehnt" und ein Aktivitätseintrag wird erstellt
- [ ] Angenommen ein Vorschlag hat Status „vorgeschlagen", wenn ein interner Nutzer ihn zurückzieht, dann wird der Vorschlag entfernt
- [ ] Angenommen ein Vorschlag hat bereits Status „freigegeben" oder „abgelehnt", dann sind Freigeben/Ablehnen/Zurückziehen-Aktionen deaktiviert (Entscheidung ist final)
- [ ] Angenommen ein Nutzer mit Rolle `municipality` oder `candidate` ist eingeloggt, wenn er versucht, die internen Vorschlags-Aktionen (vorschlagen/freigeben/ablehnen/zurückziehen) per direktem Aufruf auszulösen, dann wird dies durch RLS und serverseitige Prüfung verhindert
- [ ] Angenommen eine Vorschlagsliste ist leer, wenn sie geöffnet wird, dann wird ein Hinweistext statt einer leeren Tabelle angezeigt

## Edge Cases
- Kandidat wird für dieselbe Anfrage nach einer Ablehnung erneut vorgeschlagen → erlaubt (neuer Vorschlagseintrag), da Situationen sich ändern können (z.B. neue Informationen); nur ein gleichzeitig *offener* (Status „vorgeschlagen") Doppel-Vorschlag pro Kandidat/Anfrage wird verhindert
- Zwei interne Nutzer entscheiden gleichzeitig über denselben Vorschlag → zweiter Versuch scheitert serverseitig (Status ist bereits final), Hinweis statt stiller Erfolg
- Anfrage wird zwischen Öffnen der Kandidatensuche und Klick auf „vorschlagen" extern auf einen anderen Status geändert (sollte in der Praxis kaum vorkommen, da nur „erstellt"→„geprüft" möglich ist und das kein Rückschritt ist) → serverseitige Prüfung lässt Vorschlag in diesem Fall weiterhin zu, da „geprüft" ein Endzustand ist
- Kandidat wird zwischen Suche und Vorschlag deaktiviert (Konto-Status ändert sich) → serverseitige Prüfung lehnt den Vorschlag ab, auch wenn der Button clientseitig noch aktiv war
- Sehr viele Vorschläge zu einer Anfrage → Performance nicht Teil dieser Spec (Pilot-Massstab, wie bei PROJ-4/6)

## Technical Requirements (optional)
- Security: Schreiboperationen (vorschlagen/freigeben/ablehnen/zurückziehen) ausschliesslich für interne Rollen, serverseitig per Zod validiert, RLS aus PROJ-1 (`candidate_proposals_insert_internal`/`_update_internal`/`_delete_internal`) als zweite Verteidigungslinie — bereits vorhanden, keine neue Migration nötig
- Zugriff ausschliesslich über `/internal/*`-Portal

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Soll eine globale, anfrageübergreifende Vorschlagsliste (`/internal/proposals`) ergänzt werden, sobald mehr als eine Gemeinde/mehr parallele Anfragen aktiv sind? Aktuell als Out of Scope zurückgestellt (siehe oben)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Diese Spec wurde im autonomen Batch-Modus ohne Einzel-Rückfragen erstellt (Nutzerfreigabe für den PROJ-7–11-Batch) | Wie bei PROJ-2–6 vereinbart | 2026-07-26 |
| Ein Kandidat kann erst vorgeschlagen werden, wenn die Anfrage Status „geprüft" hat | Erzwingt die vorgesehene Reihenfolge (interne Prüfung vor Kandidatensuche/-vorschlag), verhindert Vorschläge zu noch nicht triagierten Anfragen | 2026-07-26 |
| Freigeben/Ablehnen/Zurückziehen kann jede interne Rolle ausführen, keine Trennung „Vorschlagender ≠ Freigebender" | Team von 2-3 Personen im Pilot; ein Vier-Augen-Prinzip wäre Over-Engineering für diese Grösse und ist im PRD nicht gefordert | 2026-07-26 |
| Nur ein gleichzeitig offener Vorschlag (Status „vorgeschlagen") pro Kandidat/Anfrage-Paar; nach Ablehnung ist ein erneuter Vorschlag für denselben Kandidaten erlaubt | Verhindert versehentliche Doppel-Vorschläge (z.B. Doppelklick), ohne eine Ablehnung endgültig zu machen — Umstände können sich ändern | 2026-07-26 |
| Freigabe-/Ablehnungsentscheidung ist final (kein Rückgängig) in P0 | Konsistent mit dem „geprüft"-Muster aus PROJ-5; hält den Statusverlauf einfach und nachvollziehbar für den Piloten | 2026-07-26 |
| Keine Freitext-Begründung beim Ablehnen | PRD-Non-Goal „kein volles Nachrichtensystem" (→ PROJ-17); Status allein genügt für den Piloten | 2026-07-26 |
| Keine Gemeinde-Benachrichtigung bei Freigabe in dieser Spec | Es existiert noch keine Gemeinde-Ansicht für Vorschläge (kommt erst mit PROJ-8); eine Benachrichtigung ohne Ziel-UI wäre nutzlos | 2026-07-26 |

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
