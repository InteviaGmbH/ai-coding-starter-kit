# PROJ-1: Supabase Infrastructure Setup

## Status: Planned
**Created:** 2026-07-25
**Last Updated:** 2026-07-25

## Dependencies
- None (fundamentales Infrastruktur-Feature, alle weiteren Features bauen darauf auf)

## User Stories
- Als Dafinex-Admin möchte ich, dass sich Gemeinde-Ansprechpartner und Kandidaten selbst registrieren können, damit ich sie nicht manuell anlegen muss.
- Als Dafinex-Admin möchte ich neue Registrierungen prüfen, freischalten oder ablehnen können, damit nur legitime Nutzer Zugriff erhalten.
- Als Kandidat möchte ich mich mit Profil und optionalen Dokumenten (CV, Zertifikate) registrieren können, damit Dafinex meine Eignung beurteilen kann.
- Als Gemeinde-Ansprechpartner möchte ich mich registrieren können, damit ich nach Freischaltung Anfragen erstellen kann.
- Als Nutzer möchte ich, dass meine Daten DSG/nDSG-konform gespeichert werden, damit meine Persönlichkeitsrechte gewahrt bleiben.
- Als Entwicklungsteam möchte ich eine vollständig konfigurierte Supabase-Infrastruktur (Schema, RLS, Storage, Auth), damit PROJ-2 bis PROJ-12 darauf aufbauen können.

## Out of Scope
- Login-Screens, Registrierungsformulare, Freischaltungs-Oberfläche (→ PROJ-2 Rollenbasierte Auth & Portal-Grundgerüst)
- Digitale Multi-Party-Signaturen (→ PROJ-15, Phase 2)
- Volle Matching-Score-Formel (→ PROJ-14, Phase 2)
- Partnerfirmen-Tabellen/Datensätze (→ PROJ-13, Phase 2) — nur Rollen-Enum-Wert vorbereitet
- Dokumentenversionierung, Ablauf, Archivierung (→ PROJ-16, Phase 2)
- Vollständiges Nachrichtensystem (→ PROJ-17, Phase 2)
- Zwei-Faktor-Authentifizierung, erweiterte Passwort-Policies
- Automatisiertes Backup-/Monitoring-Konzept

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Supabase-Projekt ist eingerichtet, wenn die Applikation startet, dann kann sie sich erfolgreich mit der Datenbank verbinden
- [ ] Angenommen eine Person füllt die Registrierung als Gemeinde-Ansprechpartner oder Kandidat aus, wenn sie absendet, dann wird ein Konto mit Status „ausstehend" angelegt, ohne vollen Zugriff
- [ ] Angenommen ein Konto hat den Status „ausstehend", wenn sich der Nutzer einloggt, dann sieht er nur einen Hinweis auf die ausstehende Freischaltung, keine geschützten Inhalte
- [ ] Angenommen ein Konto ist ausstehend, wenn ein `dafinex_admin` es freischaltet, dann wechselt der Status auf „aktiv" und voller rollenbasierter Zugriff wird gewährt
- [ ] Angenommen ein Konto ist ausstehend, wenn ein `dafinex_admin` es ablehnt, dann wechselt der Status auf „abgelehnt" und der Nutzer wird informiert
- [ ] Angenommen ein Nutzer mit Rolle `municipality` ist eingeloggt, wenn er auf Daten zugreift, dann sieht er ausschliesslich Anfragen, Vorschläge und Einsätze seiner eigenen Gemeinde
- [ ] Angenommen ein Nutzer mit Rolle `candidate` ist eingeloggt, wenn er auf Daten zugreift, dann sieht er ausschliesslich sein eigenes Profil und die ihn betreffenden Vorschläge/Einsätze
- [ ] Angenommen ein Nutzer mit Rolle `internal_coordinator` oder `dafinex_admin` ist eingeloggt, wenn er auf Daten zugreift, dann sieht er alle Gemeinden, Kandidaten, Anfragen und Einsätze
- [ ] Angenommen ein Kandidat registriert sich, wenn er ein Dokument (CV/Zertifikat) hochlädt, dann wird es sicher in Supabase Storage abgelegt und ist nur für berechtigte Rollen einsehbar
- [ ] Angenommen ein Vertrag wird generiert, wenn die unterschriebene Version hochgeladen wird, dann wird sie sicher in Supabase Storage abgelegt und ist nur für berechtigte Rollen (Gemeinde, Kandidat, Dafinex) einsehbar
- [ ] Angenommen alle Tabellen sind angelegt, wenn eine RLS-Prüfung durchgeführt wird, dann ist Row Level Security auf jeder Tabelle aktiviert
- [ ] Angenommen personenbezogene Daten werden gespeichert, wenn das Supabase-Projekt konfiguriert wird, dann liegt es in einer EU-Region (DSG/nDSG-konform)

## Edge Cases
- Doppelte Registrierung mit derselben E-Mail (einmal als Gemeinde, einmal als Kandidat) → muss verhindert werden, E-Mail eindeutig pro Konto
- Datei-Upload überschreitet Grössenlimit oder hat nicht unterstütztes Format → Fehlermeldung, Upload wird abgelehnt
- Netzwerkabbruch während Datei-Upload → Upload gilt als fehlgeschlagen, kein Teil-Upload wird gespeichert
- Löschversuch einer Gemeinde/eines Kandidaten, der noch in aktiven Anfragen/Einsätzen referenziert wird → durch Datenbank-Constraints verhindert
- Kein verfügbarer `dafinex_admin` zur Freischaltung → `super_admin` kann als Fallback ebenfalls freischalten (siehe Open Questions)

## Technical Requirements (optional)
- Security: Row Level Security auf allen Tabellen aktiviert, Supabase Auth für Authentifizierung
- Datenstandort: EU-Region (DSG/nDSG-Konformität)
- Alle Zugangsdaten (Supabase URL, Keys) über Umgebungsvariablen, nie hartcodiert

## Open Questions
<!-- Unresolved questions from the spec interview. Close them in /refine when answered. -->
- [ ] Darf ein abgelehnter Kandidat/Gemeinde-Kontakt sich erneut registrieren, oder bleibt das Konto dauerhaft gesperrt?
- [ ] Gibt es ein konkretes Dateigrössen-/Formatlimit für Uploads (CV, Verträge)?
- [ ] Soll `super_admin` als Fallback ebenfalls Freischaltungen vornehmen können?

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Kandidaten erhalten in Phase 1 einen eigenen Account | Kandidaten sollen langfristig Verfügbarkeit selbst pflegen; Konto wird von Dafinex freigeschaltet | 2026-07-25 |
| Self-Registrierung mit Dafinex-Freischaltung für Gemeinde- und Kandidaten-Accounts | Reduziert manuellen Erfassungsaufwand für Dafinex; Freischaltung bleibt Kontrollpunkt | 2026-07-25 |
| Nur `dafinex_admin` kann Registrierungen freischalten/ablehnen | Klare Verantwortlichkeit für eine administrative Aufgabe | 2026-07-25 |
| `partner_company` bleibt nur Rollen-Enum ohne eigene Tabellen in Phase 1 | Phase-2-Feature gemäss PRD | 2026-07-25 |
| Supabase-Projekt in EU-Region | Schweizer B2B-Produkt mit Personendaten, DSG/nDSG-Anforderung | 2026-07-25 |
| Kandidaten können bei Registrierung Dokumente hochladen | Wird von Gemeinden/internen Koordinatoren zur Beurteilung erwartet | 2026-07-25 |

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
