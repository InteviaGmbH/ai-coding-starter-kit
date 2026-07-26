# Audit: Ungeprüfte `error`-Werte bei Supabase-Queries (2026-07-26)

> Ausgangspunkt: PROJ-8 BUG-3 und PROJ-12 BUG-1 wurden beide dadurch verursacht, dass ein RLS-blockierter bzw. mehrdeutiger Datenbank-Join in PostgREST **keinen Fehler auslöst, sondern `null` zurückgibt** — und der Code destrukturierte nur `{ data }`, ohne `error` zu prüfen. Diese Suche findet alle Stellen mit demselben Muster, um einzuschätzen, wo ähnliche Bugs lauern könnten.

## Root Cause, kurz zusammengefasst
Zwei unabhängige Fehlerklassen, beide durch fehlende `error`-Prüfung maskiert:
1. **RLS-blockierter Join:** Der äussere Query gelingt, aber die eingebettete Relation liefert `null`, weil der Akteur laut RLS keinen Lesezugriff auf die verknüpfte Zeile hat (PROJ-8 BUG-3: Gemeinde durfte `candidates` nicht lesen).
2. **Mehrdeutiges PostgREST-Embedding (`PGRST201`):** Eine Tabelle mit **zwei Fremdschlüsseln zur selben Zieltabelle** macht `tabelle(...)`-Embedding-Syntax mehrdeutig; die ganze Query schlägt fehl, `data` ist `null` (PROJ-12 BUG-1: `activity_log` hat `actor_id` UND `created_by_id`, beide → `profiles`).

**Systemischer Befund:** Das Standardfeld-Paar `created_by_id` + eine zweite rollenspezifische Profil-Referenz (`actor_id`, `proposed_by_id`, `recipient_id`, …) kommt in mehreren Tabellen vor. **Jede Tabelle mit zwei Fremdschlüsseln zu `profiles` ist strukturell anfällig für Fehlerklasse 2**, sobald jemand implizites Embedding-Syntax (`irgendwas:profiles(...)`) darauf verwendet:

| Tabelle | Fremdschlüssel zu `profiles` | Status |
|---|---|---|
| `activity_log` | `actor_id`, `created_by_id` | **Bug gefunden & behoben** (PROJ-12 BUG-1) |
| `notifications` | `recipient_id`, `created_by_id` | Kein aktuelles Embedding — **latentes Risiko**, falls künftig `recipient:profiles(...)` verwendet wird |
| `candidate_proposals` | `proposed_by_id`, `created_by_id` | Kein aktuelles Embedding — Code nutzt bereits korrekt eine separate Lookup-Query (`proposedByName` in PROJ-7), **latentes Risiko** nur bei künftigem Embedding-Versuch |

**Empfehlung für künftige Features:** Nie `profiles(...)` implizit embedden, wenn die Quelltabelle mehr als einen FK zu `profiles` hat — entweder den expliziten Relationship-Hint (`profiles!activity_log_actor_id_fkey(...)`) verwenden oder (konsistent mit dem bereits etablierten Muster in PROJ-7/12) eine separate `.in("id", [...])`-Lookup-Query.

## Fundstellen nach Risiko sortiert

### Tier 1 — Bereits gefunden und behoben
| Datei | Query | Fix |
|---|---|---|
| `src/app/internal/activity/page.tsx` | `activity_log` → `actor:profiles(...)` Embed | Entfernt, separate Lookup-Query (Migration keine, reiner Code-Fix) |
| `src/app/municipality/requests/[id]/proposals/page.tsx:33` | `candidate_proposals` → `candidate:candidates(...)` Embed, Gemeinde-Akteur | Neue RLS-Policy `candidates_select_municipality_proposed` (Migration `20260726140000`) |

### Tier 2 — Gleiche RLS-Abhängigkeit wie Tier 1 Fund #2, transitiv mitbehoben, aber nicht alle direkt E2E-getestet
| Datei | Query | Status |
|---|---|---|
| `src/app/municipality/assignments/[id]/page.tsx:21` | `candidate:candidates(...)` Embed, Gemeinde-Akteur | Durch dieselbe Policy abgedeckt — **im E2E-Testlauf bestätigt funktionierend** (Kandidatenname korrekt angezeigt) |
| `src/app/municipality/assignments/page.tsx:15` | Identisches Embed auf der Einsatz-**Liste** (nicht der Detailseite) | Nachträglich per gezieltem Diagnose-Check bestätigt: zeigt korrekt „E2E Kandidat …" und Status „Abgeschlossen" — gleiche Policy greift wie erwartet |

### Tier 3 — Latentes Risiko (kein aktueller Bug, aber gleiches fragiles Schema-Muster)
Siehe Tabelle oben (`notifications`, `candidate_proposals`) — aktuell keine betroffene Codestelle, aber jede künftige Embedding-Nutzung würde denselben Fehler reproduzieren.

### Tier 4 — Verschachtelte Embeds mit eindeutigen (Ein-FK-)Beziehungen, nur von internen Akteuren mit vollem RLS-Lesezugriff aufgerufen — geringes Risiko
| Datei:Zeile | Embed-Kette |
|---|---|
| `internal/assignments/actions.ts:118` | `proposal:candidate_proposals(request:personnel_requests(...))` |
| `internal/assignments/page.tsx:10` | `proposal→candidate`, `proposal→request→municipality` (dreifach verschachtelt) |
| `internal/assignments/[id]/page.tsx:20` | identisch zu obigem |
| `internal/contracts/actions.ts:44` | `proposal:candidate_proposals(request:personnel_requests(...))` |
| `internal/requests/[id]/proposals/page.tsx:27` | `candidate:candidates(...)` |

Alle beteiligten Fremdschlüssel (`candidate_proposals.request_id`, `candidate_proposals.candidate_id`, `personnel_requests.municipality_id`) sind jeweils **eindeutig** (nur ein FK zur Zieltabelle) — kein `PGRST201`-Risiko. RLS-Risiko gering, da der Akteur in allen Fällen intern ist (`is_internal_role()` gewährt vollen Lesezugriff auf alle beteiligten Tabellen). Würde nur brechen, wenn sich das RLS-Design für interne Rollen künftig ändert.

### Tier 5 — Einzel-Lookups mit `.single()`/`.maybeSingle()` + `if (!x) return/notFound()`
Grösste Gruppe (ca. 25 Fundstellen, u.a. `municipalities/[id]`, `candidates/[id]`, sämtliche Proposal-/Assignment-/Contract-Lookups in den Server Actions, alle Request-Detailseiten). Diese sind **nicht** von der PROJ-8/12-Fehlerklasse betroffen (keine Embeds, kein „falsche Daten sichtbar"-Risiko) — jeder `null`-Fall wird bereits als „nicht gefunden" behandelt. Einziger (kleinerer) Schwachpunkt: ein echter DB-/RLS-Fehler wird ununterscheidbar als „nicht gefunden" gemeldet statt als eigener Fehlerzustand — ein Beobachtbarkeits-, kein Sicherheits- oder Korrektheitsproblem.

### Tier 6 — Listen-/Sekundär-Lookup-Queries mit `?? []`, kein Embed
Listenseiten (`municipalities`, `candidates`, `requests`, `approvals`) und die dort verwendeten Zweit-Queries (Namens-Lookups per `.in("id", [...])`). Gleiche grundsätzliche Fehlerklasse wie PROJ-12 (ein RLS-Block würde still eine leere statt eine Fehler-Anzeige produzieren), aber **aktuell nicht ausnutzbar**, da alle Aufrufer interne Akteure mit vollem RLS-Lesezugriff sind. Würde erst relevant, falls eine dieser Seiten künftig auch für `municipality`/`candidate` geöffnet wird, ohne die RLS-Policies entsprechend zu erweitern.

## Zusammenfassung / Priorisierung
1. **Keine Code-Änderung nötig, nur Konvention festhalten:** Tier 3 (latentes Risiko bei `notifications`/`candidate_proposals`) — beim nächsten Feature, das Akteur-/Empfänger-Namen aus einer dieser Tabellen anzeigen soll, das Embedding-Muster vermeiden (siehe Empfehlung oben).
2. **Kein Handlungsbedarf:** Tier 2, 4–6 sind alle verifiziert bzw. beim aktuellen RLS-Design nicht ausnutzbar; sie sind hier dokumentiert, damit sie bei künftigen RLS-Änderungen (z.B. neue Rollen, erweiterte Sichtbarkeit) erneut geprüft werden.

## Nachtrag
`src/app/municipality/assignments/page.tsx` wurde per gezieltem Diagnose-Check gegen das echte Supabase-Projekt verifiziert (2026-07-26): zeigt korrekt den Kandidatennamen und Status. Damit sind alle Tier-1/2-Fundstellen aus diesem Audit bestätigt behoben bzw. bereits korrekt.
