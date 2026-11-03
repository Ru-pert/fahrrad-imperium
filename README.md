# Fahrrad-Imperium

Rundenbasiertes Unternehmensplanspiel (Vite + React + TypeScript). Spezifikation: [SPEZIFIKATION.md](SPEZIFIKATION.md).

- `npm run dev` – Entwicklung, `npm test` – Engine-Tests, `npm run build` – statischer Build
- Engine: `src/engine/` (reine Funktionen), Balancing-Parameter: `src/engine/config/`
- Deployment: GitHub Pages per Actions (`.github/workflows/deploy.yml`, Vite-Base `/fahrrad-imperium/`).
  Einmalig in den Repo-Einstellungen unter *Pages → Source* „GitHub Actions“ wählen.
- Stand: Umsetzungsstufen 1 (Engine-Kern) und 2 (Basis-UI) aus Abschnitt 16.
