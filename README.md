# 📈 Investment Tracker

A local browser-only app to monitor your PAC investments month by month — no server, no installation, no cloud.

![Dark dashboard with charts](https://img.shields.io/badge/browser-Chrome%20%7C%20Edge-6366f1?style=flat-square) ![Vanilla JS](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20JS-f59e0b?style=flat-square) ![File System Access API](https://img.shields.io/badge/storage-File%20System%20Access%20API-10b981?style=flat-square)

---

## Features

- **Dashboard** — total portfolio value, amount invested, return in € and %, trend chart over time, breakdown by instrument
- **Monthly entry** — log versamento and end-of-month value for each fund, grouped by platform
- **History** — full table filterable by platform or instrument, inline editing, JSON export
- **Instruments** — configure your funds with name, platform, type and optional ISIN
- **Persistent storage** — data lives in a `pac-data.json` file on your disk, never in the cloud
- **Dark theme** — easy on the eyes for regular use

---

## How it works

Data is stored locally in a JSON file you choose. The app uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to read and write it directly from the browser — no backend needed.

```
pac-data.json
├── strumenti   → your funds (name, platform, type, ISIN)
└── registrazioni → monthly entries (month, versamento, end value)
```

All return calculations happen at runtime — nothing redundant is stored.

---

## Getting started

1. Clone the repo
2. Open `index.html` in **Chrome or Edge** (Firefox does not support the File System Access API)
3. Click **"Nuovo file JSON"** → choose where to save your `pac-data.json`
4. Go to **Strumenti** → add your funds
5. Go to **Inserisci** → log your first monthly entry
6. Check the **Dashboard** for your full picture

> `pac-data.json` is in `.gitignore` — your financial data never leaves your machine.

---

## Stack

| | |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES2022) |
| Charts | [Chart.js 4](https://www.chartjs.org/) via CDN |
| Storage | File System Access API |
| Dependencies | None |

---

## Screenshots

> *Coming soon — add your own after first use.*

---

## License

MIT
