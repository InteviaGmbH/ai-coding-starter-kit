# Design System — Dafinex

Seriöses Schweizer B2B-Design. Desktop-first für interne Administration (Dafinex-Team), responsive für alle Rollen-Portale (Gemeinde, Kandidat).

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Primary (dunkles Blau) | `#0F2A4A` | Vertrauen, Seriosität — Header, primäre Buttons, Navigation |
| Accent (Türkis/Grün) | `#0FA3A3` | Call-to-Actions, Status "aktiv", Hervorhebungen |
| Neutral | Tailwind Gray-Skala | Admin-Tabellen, Listen, Hintergründe |
| Success | Grün (shadcn default) | Status "completed", Bestätigungen |
| Warning | Amber (shadcn default) | Status "pending", Fristen |
| Destructive | Rot (shadcn default) | Fehler, Ablehnungen |

## Typography
- **Font:** Inter (gute Lesbarkeit, neutral, unterstützt de-CH Umlaute)

## Layout Principles
- Desktop-first für interne Dafinex-Seiten (Anfragen, Kandidatensuche, Vorschläge, Einsätze) — dichte Tabellen, viele Datenpunkte gleichzeitig sichtbar
- Responsive/Mobile-friendly für Gemeindeportal und Kandidatenportal — einfachere, fokussierte Ansichten
- shadcn/ui-Komponenten als Basis, Theme via Tailwind-Variablen angepasst an obige Farbpalette

## Locale
- Sprache: Deutsch (de-CH)
- Währung: CHF
- Zeitzone: Europe/Zurich
- Datumsformat: DD.MM.YYYY (Schweizer Konvention)
