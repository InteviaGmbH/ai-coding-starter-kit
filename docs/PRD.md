# Product Requirements Document

## Vision
Dafinex ist eine B2B-Vermittlungs- und Einsatzplattform, die temporäre Fachkräfte ("Springer") an Schweizer Gemeinden und Sozialdienste vermittelt. Sie digitalisiert den heute manuellen Prozess (E-Mail/Telefon) von der Personalanfrage über die Kandidatensuche bis zum abgeschlossenen Einsatz — mit klaren Rollen, Nachvollziehbarkeit und CH-spezifischer Lokalisierung.

## Target Users
- **Gemeinden/Sozialdienste (municipality):** Brauchen schnell qualifizierte, verfügbare Fachkräfte für befristete Einsätze, ohne selbst aufwändig suchen zu müssen.
- **Dafinex-Admins & interne Koordinatoren (dafinex_admin, internal_coordinator):** Verwalten Anfragen, prüfen und vermitteln Kandidaten, überwachen den gesamten Prozess.
- **Kandidaten/Springer (candidate):** Suchen befristete Einsätze bei Gemeinden, passend zu Fähigkeiten, Region und Verfügbarkeit.
- **Super Admin (super_admin):** Systemweite Verwaltung, Rollen, Konfiguration.
- *(Später: Partnerfirmen (partner_company) — schlagen eigene Kandidaten vor; in Phase 2)*

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Supabase Infrastructure Setup (Auth, DB-Schema, RLS, Storage) | Approved — Spec: [PROJ-1](../features/PROJ-1-supabase-infrastructure-setup.md) |
| P0 (MVP) | Gemeindenverwaltung | Approved — Spec: [PROJ-3](../features/PROJ-3-gemeindenverwaltung.md) |
| P0 (MVP) | Kandidatenverwaltung (source_type: dafinex) | Approved — Spec: [PROJ-4](../features/PROJ-4-kandidatenverwaltung.md) |
| P0 (MVP) | Personalanfrage-Workflow (erstellen → prüfen) | Approved — Spec: [PROJ-5](../features/PROJ-5-personalanfrage-workflow.md) |
| P0 (MVP) | Kandidatensuche mit einfachem Matching (Filter: Fähigkeiten/Region/Verfügbarkeit) | Approved — Spec: [PROJ-6](../features/PROJ-6-kandidatensuche-matching-filter.md) |
| P0 (MVP) | Interner Kandidatenvorschlag → Freigabe | Approved — Spec: [PROJ-7](../features/PROJ-7-kandidatenvorschlag-interne-freigabe.md) |
| P0 (MVP) | Gemeinde-Interview/Annahme | Approved — Spec: [PROJ-8](../features/PROJ-8-gemeinde-interview-annahme.md) |
| P0 (MVP) | Einsatzverwaltung mit Statusverlauf (proposed → accepted → active → completed) | Approved — Spec: [PROJ-9](../features/PROJ-9-einsatzverwaltung-statusverlauf.md) |
| P0 (MVP) | Einfache Vertragsgenerierung (generiertes Dokument, Unterschrift als Upload) | Approved — Spec: [PROJ-10](../features/PROJ-10-einfache-vertragsgenerierung.md) |
| P0 (MVP) | Kern-Benachrichtigungen (neue Anfrage, Vorschlag, Einsatz aktiv, Vertrag bereit) | Approved — Spec: [PROJ-11](../features/PROJ-11-kern-benachrichtigungen.md) |
| P0 (MVP) | Aktivitätenprotokoll (Basis) | Approved — Spec: [PROJ-12](../features/PROJ-12-aktivitaetenprotokoll-basis.md) |
| P0 (MVP) | Gemeindeportal + interne Dafinex-Seiten | Planned |
| P1 | Partnerportal + Partnerfirmen-Kandidatenvorschläge | Planned |
| P1 | Volle Matching-Score-Formel mit einstellbaren Gewichtungen | Planned — Spec: [PROJ-14](../features/PROJ-14-volle-matching-score-formel.md) |
| P1 | Digitale Multi-Party-Signaturen mit Protokollierung | Planned |
| P1 | Vollständiges Dokumentenmanagement (Versionierung, Ablauf, Archivierung) | Planned — Spec: [PROJ-16](../features/PROJ-16-vollstaendiges-dokumentenmanagement.md) |
| P2 | Vollständiges Nachrichtensystem (interne Notizen, alle Filter) | Planned |
| P2 | Alle Benachrichtigungstrigger + Erinnerungslogik | Planned |
| P2 | Vollständige Dashboards für alle Rollen | Planned |

## Success Metrics
- Mindestens 1 Gemeinde nutzt die Plattform aktiv für echte Anfragen im Pilotzeitraum
- Durchlaufzeit Anfrage → Einsatz-Start messbar reduziert gegenüber dem heutigen manuellen Prozess
- Mindestens 3 erfolgreich abgeschlossene Einsätze während der Pilotphase
- Positives Feedback von Gemeinde-Ansprechpartner und internen Koordinatoren

## Constraints
- Team: 2-3 Entwickler
- Zeitrahmen: 2-3 Monate bis MVP
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Design-System: siehe `docs/design-system.md`
- Pilot mit genau einer Gemeinde, nur Dafinex-eigene Kandidaten (kein Partnerfirmen-Onboarding in Phase 1)
- UI auf Deutsch, Gebietsschema de-CH, Währung CHF, Zeitzone Europe/Zurich

## Non-Goals
- Kein Partnerportal / keine Partnerfirmen-Integration (→ Phase 2)
- Keine volle Matching-Score-Formel (→ Phase 2)
- Keine digitalen Multi-Party-Signaturen (→ Phase 2)
- Keine Lohnabrechnung/Payroll-Integration
- Keine Rechnungsstellung/Fakturierung
- Keine native Mobile-App (nur responsive Web)
- Keine Mehrsprachigkeit über Deutsch hinaus
- Keine automatisierte Vertragsprüfung durch Dritte

---

Use `/write-spec` to create detailed feature specifications for each item in the roadmap above.
