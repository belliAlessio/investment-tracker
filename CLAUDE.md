# PAC Tracker — CLAUDE.md

## Project overview

Browser-only SPA (Chrome/Edge) to track PAC investments month by month. No server, no build step, no npm. Open `index.html` directly in the browser.

## Stack

| Layer | Tech |
|---|---|
| UI | Vanilla HTML + CSS + JS (ES2022) |
| Charts | Chart.js 4 (CDN) |
| Storage | File System Access API → `pac-data.json` on disk |
| Handle persistence | IndexedDB (for auto-reopen on refresh) |

## File layout

| File | Role |
|---|---|
| `index.html` | App shell — tab nav, view containers, script imports |
| `style.css` | Dark theme, all components |
| `data.js` | File I/O, IndexedDB handle cache, CRUD, computed stats |
| `charts.js` | Chart.js wrappers (line, bar, donut) |
| `app.js` | View rendering, event handlers, tab routing |

## Data model (`pac-data.json`)

```json
{
  "strumenti": [
    { "id": "...", "nome": "...", "piattaforma": "...", "tipo": "fondo|pac|pensione",
      "isin": "...", "capitalePreesistente": 0 }
  ],
  "registrazioni": [
    { "id": "...", "mese": "2025-05", "strumentoId": "...", "versamento": 150, "valoreFinale": 5840 }
  ]
}
```

`capitalePreesistente` is capital invested before the first tracked month — it's added to `totalInvestito` in `computeStrumentoStats()` so rendimento % is accurate.

## Key conventions

- No build process — edit files directly, refresh browser to test
- All stats computed at runtime from raw registrazioni + capitalePreesistente
- `persistData()` is called after every mutation; it writes the full JSON to disk
- Charts use `getOrCreateChart()` to avoid duplicate Chart.js instances
- `document._pacMese` holds the currently selected month in the Inserisci tab

## Git / SSH

- Repo: `git@github-personal-443:belliAlessio/investment-tracker.git`
- SSH host alias `github-personal-443` uses `ssh.github.com:443` (corporate firewall bypass)
- Git identity is set **locally only** (`git config --local`) — work account is unaffected
- `pac-data.json` is in `.gitignore` — financial data never leaves the machine

## Running locally

Open `index.html` in Chrome or Edge. No server needed.
