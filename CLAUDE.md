# PAC Tracker — CLAUDE.md

## Project overview

Browser-only SPA (Chrome/Edge) to track PAC investments month by month. No build step, no npm. Run via `server.py` for full functionality (Yahoo Finance proxy), or open `index.html` directly for everything except fund info cards.

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
| `server.py` | Local HTTP server + `/yf/` proxy for Yahoo Finance CORS |

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
- New registrazioni are added via modal in the Storico tab (no dedicated Inserisci tab)

## Git / SSH

- Repo: `git@github-personal-443:belliAlessio/investment-tracker.git`
- SSH host alias `github-personal-443` uses `ssh.github.com:443` (corporate firewall bypass)
- Git identity is set **locally only** (`git config --local`) — work account is unaffected
- `pac-data.json` is in `.gitignore` — financial data never leaves the machine

## Running locally

```bash
python3 server.py
```

Starts a local server on `http://localhost:8080` and opens the browser automatically. Required for Yahoo Finance fund info (the `/yf/` proxy bypasses CORS). Without it, open `index.html` directly — everything works except fund info cards.
