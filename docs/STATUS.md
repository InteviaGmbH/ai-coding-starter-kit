# Projekt-Status

**Letztes Update:** 28.07.2026

## Aktueller Stand
- **PROJ-1 bis PROJ-12 sind live deployed** auf Vercel: https://ai-coding-starter-kit-sand.vercel.app (siehe Deployment-Abschnitt in `features/PROJ-1-supabase-infrastructure-setup.md`)
- PROJ-1 bis PROJ-12 sind vollständig umgesetzt und Approved (Supabase-Infrastruktur bis Aktivitätenprotokoll)
- Vollständiger End-to-End-Testlauf mit echten Accounts erfolgreich durchgeführt (siehe `docs/e2e-dry-run-2026-07-26.md`); dabei zwei reale Bugs gefunden und behoben (PROJ-8 BUG-3, PROJ-12 BUG-1)
- Codebase-weites Audit auf ungeprüfte Supabase-`error`-Werte durchgeführt (siehe `docs/rls-error-handling-audit-2026-07-26.md`); Konvention dazu in `.claude/rules/backend.md` ergänzt
- E2E-Testdaten-Cleanup wurde in DB-Skript + manuelle Storage-Bereinigung aufgeteilt (siehe „Wichtige Entscheidungen" unten)
- **Verifiziert (2026-07-27): Cleanup ist vollständig abgeschlossen** — keine `e2e-*@dafinex-test.ch`-Profile, keine `E2E Test Gemeinde*`-Einträge mehr in der Datenbank; beide Storage-Buckets (`candidate-documents`, `contracts`) sind leer

## Nächste Schritte
- [ ] Nächsten Feature-Batch angehen: PROJ-13–19 stehen noch auf „Roadmap" (P1/P2, ausserhalb des Pilot-Scopes) — PROJ-12 war das letzte offene P0/MVP-Item laut PRD
- [ ] Optional: 11 vorbestehende ESLint-Fehler bereinigen (unescaped quotes, `Math.random`-Purity-Hinweis in `sidebar.tsx`, `window.location.href`-Zuweisungen in Auth-Formularen) — nicht blockierend, siehe Deployment-Abschnitt PROJ-1
- [ ] Manueller Klick-Test des echten Login-/Registrierungs-Flows in Produktion (Formular-Submit) — automatisierter Post-Deployment-Test konnte nur Seiten-Erreichbarkeit/HTTP-Status/Header prüfen, kein Browser-Tool verfügbar

## Offene Fragen / Blocker
- (keine)

## Wichtige Entscheidungen

### 2026-07-27: Storage-Cleanup nicht direkt per SQL
Direktes Löschen aus `storage.objects` ist nicht erlaubt (Supabase-Storage-API muss genutzt werden — Fehler: *"Direct deletion from storage tables is not allowed. Use the Storage API instead."*).
→ Cleanup daher in 3 Schritte aufgeteilt: `docs/e2e-test-data-storage-lookup.sql` (lesend, IDs vor dem DB-Cleanup sichern) → manuelle/Skript-Storage-Bereinigung (`docs/e2e-test-data-storage-cleanup.md`) → `docs/e2e-test-data-cleanup.sql` (DB-Zeilen, FK-Reihenfolge beachten).
