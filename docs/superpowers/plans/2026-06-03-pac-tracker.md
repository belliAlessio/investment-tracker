# PAC Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local browser-only app (Chrome/Edge) to track PAC investments monthly, with a dark-theme dashboard, charts, and JSON file persistence via the File System Access API.

**Architecture:** Single-page app with 4 tab views (Dashboard, Inserisci, Storico, Strumenti) rendered via vanilla JS DOM manipulation. All data lives in a user-selected `pac-data.json` file, read and written on every change via the File System Access API. Charts powered by Chart.js loaded from CDN.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES2022), Chart.js 4.x (CDN), File System Access API (Chrome/Edge only)

---

## File Map

| File | Responsibility |
|------|----------------|
| `index.html` | Shell: tab nav, view containers, script/CSS imports |
| `style.css` | Dark theme, layout, all component styles |
| `data.js` | File System Access API I/O, CRUD on strumenti/registrazioni, computed stats |
| `charts.js` | Chart.js wrappers: renders line, bar, donut charts |
| `app.js` | View rendering for all 4 tabs, event handlers, tab routing |

---

### Task 1: HTML Shell + CSS Dark Theme + Tab Navigation

**Files:**
- Create: `index.html`
- Create: `style.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAC Tracker</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js" defer></script>
  <script src="data.js" defer></script>
  <script src="charts.js" defer></script>
  <script src="app.js" defer></script>
</head>
<body>
  <div id="app">
    <header class="app-header">
      <div class="app-title">PAC Tracker</div>
      <div class="file-controls">
        <span id="file-name" class="file-name">Nessun file aperto</span>
        <button id="btn-open-file" class="btn btn-secondary">Apri file JSON</button>
        <button id="btn-new-file" class="btn btn-secondary">Nuovo file JSON</button>
      </div>
    </header>

    <div id="browser-warning" class="browser-warning hidden">
      Questo browser non supporta la File System Access API. Usa Chrome o Edge.
    </div>

    <div id="no-file-banner" class="no-file-banner">
      <p>Apri o crea un file <code>pac-data.json</code> per iniziare.</p>
    </div>

    <nav id="tab-nav" class="tab-nav hidden">
      <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
      <button class="tab-btn" data-tab="inserisci">Inserisci</button>
      <button class="tab-btn" data-tab="storico">Storico</button>
      <button class="tab-btn" data-tab="strumenti">Strumenti</button>
    </nav>

    <main id="main-content" class="main-content hidden">
      <div id="view-dashboard" class="view active"></div>
      <div id="view-inserisci" class="view"></div>
      <div id="view-storico" class="view"></div>
      <div id="view-strumenti" class="view"></div>
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 2: Create `style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f0f1a;
  --surface: #1a1a2e;
  --surface2: #2a2a3e;
  --border: #2d2d4e;
  --text: #e2e8f0;
  --text-muted: #64748b;
  --indigo: #6366f1;
  --blue: #3b82f6;
  --amber: #f59e0b;
  --green: #10b981;
  --red: #ef4444;
  --radius: 8px;
}

body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; min-height: 100vh; }

/* Header */
.app-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; background: var(--surface); border-bottom: 1px solid var(--border);
}
.app-title { font-size: 18px; font-weight: 700; color: var(--indigo); }
.file-controls { display: flex; align-items: center; gap: 10px; }
.file-name { font-size: 13px; color: var(--text-muted); }

/* Tab nav */
.tab-nav {
  display: flex; gap: 4px; padding: 12px 24px 0;
  border-bottom: 1px solid var(--border); background: var(--surface);
}
.tab-btn {
  padding: 8px 18px; background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--text-muted); cursor: pointer; font-size: 14px; font-weight: 500;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn.active { color: var(--indigo); border-bottom-color: var(--indigo); }
.tab-btn:hover:not(.active) { color: var(--text); }

/* Layout */
.main-content { padding: 24px; max-width: 1400px; margin: 0 auto; }
.view { display: none; }
.view.active { display: block; }
.hidden { display: none !important; }

/* Buttons */
.btn { padding: 8px 16px; border: none; border-radius: var(--radius); cursor: pointer; font-size: 14px; font-weight: 500; transition: opacity 0.15s; }
.btn:hover { opacity: 0.85; }
.btn-primary { background: var(--indigo); color: #fff; }
.btn-secondary { background: var(--surface2); color: var(--text); }
.btn-danger { background: var(--red); color: #fff; }
.btn-sm { padding: 4px 10px; font-size: 12px; }

/* Banners */
.no-file-banner { text-align: center; padding: 60px 24px; color: var(--text-muted); font-size: 16px; }
.browser-warning { background: var(--red); color: #fff; text-align: center; padding: 10px; font-size: 14px; }

/* KPI Cards */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.kpi-card { background: var(--surface); border-radius: var(--radius); padding: 16px; border-top: 3px solid var(--indigo); }
.kpi-card.blue { border-top-color: var(--blue); }
.kpi-card.green { border-top-color: var(--green); }
.kpi-card.red { border-top-color: var(--red); }
.kpi-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.kpi-value { font-size: 24px; font-weight: 700; }
.kpi-value.positive { color: var(--green); }
.kpi-value.negative { color: var(--red); }

/* Dashboard two-column layout */
.dashboard-cols { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.col-left, .col-right { display: flex; flex-direction: column; gap: 16px; }

/* Panels */
.panel { background: var(--surface); border-radius: var(--radius); padding: 16px; }
.panel-title { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }

/* Tables */
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { color: var(--text-muted); font-weight: 500; text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
.table td { padding: 8px 8px; border-bottom: 1px solid var(--border); }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: var(--surface2); }
.positive { color: var(--green); }
.negative { color: var(--red); }

/* Forms */
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
.form-input { width: 100%; padding: 8px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; }
.form-input:focus { outline: none; border-color: var(--indigo); }
.form-select { width: 100%; padding: 8px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 14px; }

/* Inserisci form */
.platform-group { margin-bottom: 24px; }
.platform-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
.entry-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; align-items: end; margin-bottom: 10px; }
.entry-label { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }

/* Strumenti list */
.strumento-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
.strumento-item:last-child { border-bottom: none; }
.strumento-info { flex: 1; }
.strumento-name { font-size: 15px; font-weight: 500; }
.strumento-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.strumento-actions { display: flex; gap: 6px; }

/* Chart containers */
.chart-container { position: relative; }

/* Responsive */
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-cols { grid-template-columns: 1fr; }
  .entry-row { grid-template-columns: 1fr 1fr; }
  .entry-row > *:first-child { grid-column: 1 / -1; }
}

@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .app-header { flex-direction: column; gap: 10px; align-items: flex-start; }
  .file-controls { flex-wrap: wrap; }
  .main-content { padding: 12px; }
}
```

- [ ] **Step 3: Verify in Chrome**

Open `index.html` in Chrome. Expected: dark page with "PAC Tracker" in the header, "Nessun file aperto" text, two buttons (Apri / Nuovo), and a banner "Apri o crea un file pac-data.json per iniziare." No console errors.

- [ ] **Step 4: Commit**

```bash
git init
git add index.html style.css
git commit -m "feat: HTML shell and dark theme CSS"
```

---

### Task 2: Data Layer — File I/O + CRUD + Computed Stats

**Files:**
- Create: `data.js`

- [ ] **Step 1: Create `data.js`**

```javascript
const EMPTY_DATA = { strumenti: [], registrazioni: [] };

let fileHandle = null;
let appData = null;

// ── File I/O ──────────────────────────────────────────────────────────────

function isApiSupported() {
  return 'showOpenFilePicker' in window;
}

async function openExistingFile() {
  [fileHandle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
  });
  const file = await fileHandle.getFile();
  appData = JSON.parse(await file.text());
  return appData;
}

async function createNewFile() {
  fileHandle = await window.showSaveFilePicker({
    suggestedName: 'pac-data.json',
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
  });
  appData = structuredClone(EMPTY_DATA);
  await persistData();
  return appData;
}

async function persistData() {
  if (!fileHandle) return;
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(appData, null, 2));
  await writable.close();
}

function getData() { return appData; }
function getFileName() { return fileHandle ? fileHandle.name : null; }

// ── Strumenti CRUD ────────────────────────────────────────────────────────

function generateId(base) {
  const slug = base.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `${slug}-${Date.now().toString(36)}`;
}

async function addStrumento({ nome, piattaforma, tipo, isin = '' }) {
  const strumento = { id: generateId(nome), nome, piattaforma, tipo, isin };
  appData.strumenti.push(strumento);
  await persistData();
  return strumento;
}

async function updateStrumento(id, updates) {
  const idx = appData.strumenti.findIndex(s => s.id === id);
  if (idx === -1) throw new Error(`Strumento ${id} non trovato`);
  appData.strumenti[idx] = { ...appData.strumenti[idx], ...updates };
  await persistData();
  return appData.strumenti[idx];
}

async function deleteStrumento(id) {
  if (appData.registrazioni.some(r => r.strumentoId === id)) {
    throw new Error('STRUMENTO_HAS_REGISTRAZIONI');
  }
  appData.strumenti = appData.strumenti.filter(s => s.id !== id);
  await persistData();
}

// ── Registrazioni CRUD ────────────────────────────────────────────────────

async function saveRegistrazioniMese(mese, entries) {
  appData.registrazioni = appData.registrazioni.filter(r => r.mese !== mese);
  const suffix = Date.now().toString(36);
  entries.forEach((e, i) => {
    appData.registrazioni.push({
      id: `reg-${mese}-${suffix}-${i}`,
      mese,
      strumentoId: e.strumentoId,
      versamento: Number(e.versamento) || 0,
      valoreFinale: Number(e.valoreFinale) || 0,
    });
  });
  await persistData();
}

async function updateRegistrazione(id, updates) {
  const idx = appData.registrazioni.findIndex(r => r.id === id);
  if (idx === -1) throw new Error(`Registrazione ${id} non trovata`);
  appData.registrazioni[idx] = {
    ...appData.registrazioni[idx],
    versamento: Number(updates.versamento) || 0,
    valoreFinale: Number(updates.valoreFinale) || 0,
  };
  await persistData();
  return appData.registrazioni[idx];
}

async function deleteRegistrazione(id) {
  appData.registrazioni = appData.registrazioni.filter(r => r.id !== id);
  await persistData();
}

// ── Computed Stats ────────────────────────────────────────────────────────

function computeStrumentoStats(strumentoId) {
  const regs = appData.registrazioni
    .filter(r => r.strumentoId === strumentoId)
    .sort((a, b) => a.mese.localeCompare(b.mese));
  const totalInvestito = regs.reduce((sum, r) => sum + r.versamento, 0);
  const latest = regs[regs.length - 1];
  const valoreAttuale = latest ? latest.valoreFinale : 0;
  const rendimentoEuro = valoreAttuale - totalInvestito;
  const rendimentoPerc = totalInvestito > 0 ? (rendimentoEuro / totalInvestito) * 100 : 0;
  return { totalInvestito, valoreAttuale, rendimentoEuro, rendimentoPerc, regs };
}

function computeTotals() {
  let totalInvestito = 0, valoreAttuale = 0;
  appData.strumenti.forEach(s => {
    const stats = computeStrumentoStats(s.id);
    totalInvestito += stats.totalInvestito;
    valoreAttuale += stats.valoreAttuale;
  });
  const rendimentoEuro = valoreAttuale - totalInvestito;
  const rendimentoPerc = totalInvestito > 0 ? (rendimentoEuro / totalInvestito) * 100 : 0;
  return { totalInvestito, valoreAttuale, rendimentoEuro, rendimentoPerc };
}

function getSortedMesi() {
  return [...new Set(appData.registrazioni.map(r => r.mese))].sort();
}

function getRecentRegistrazioni(limit = 8) {
  return [...appData.registrazioni]
    .sort((a, b) => b.mese.localeCompare(a.mese))
    .slice(0, limit);
}

function getPiattaforme() {
  return [...new Set(appData.strumenti.map(s => s.piattaforma))];
}
```

- [ ] **Step 2: Verify in DevTools**

Open `index.html` in Chrome. In DevTools console run:
```javascript
isApiSupported()
```
Expected: `true`

- [ ] **Step 3: Commit**

```bash
git add data.js
git commit -m "feat: data layer with File System Access API and CRUD"
```

---

### Task 3: App Shell — Tab Routing + File Open/Create

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create `app.js`**

```javascript
// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!isApiSupported()) {
    document.getElementById('browser-warning').classList.remove('hidden');
    return;
  }
  document.getElementById('btn-open-file').addEventListener('click', handleOpenFile);
  document.getElementById('btn-new-file').addEventListener('click', handleNewFile);
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

async function handleOpenFile() {
  try {
    await openExistingFile();
    onFileLoaded();
  } catch (e) {
    if (e.name !== 'AbortError') alert('Errore apertura file: ' + e.message);
  }
}

async function handleNewFile() {
  try {
    await createNewFile();
    onFileLoaded();
  } catch (e) {
    if (e.name !== 'AbortError') alert('Errore creazione file: ' + e.message);
  }
}

function onFileLoaded() {
  document.getElementById('file-name').textContent = getFileName();
  document.getElementById('no-file-banner').classList.add('hidden');
  document.getElementById('tab-nav').classList.remove('hidden');
  document.getElementById('main-content').classList.remove('hidden');
  switchTab('dashboard');
}

// ── Tab routing ───────────────────────────────────────────────────────────

let currentTab = null;

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${tab}`).classList.add('active');
  currentTab = tab;
  renderCurrentTab();
}

function renderCurrentTab() {
  switch (currentTab) {
    case 'dashboard': renderDashboard(); break;
    case 'inserisci': renderInserisci(); break;
    case 'storico': renderStorico(); break;
    case 'strumenti': renderStrumenti(); break;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtPerc(n) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtMese(mese) {
  const [y, m] = mese.split('-');
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Placeholder renderers — replaced in subsequent tasks
function renderDashboard() { document.getElementById('view-dashboard').innerHTML = '<p style="padding:24px;color:var(--text-muted)">Dashboard — coming soon</p>'; }
function renderInserisci() { document.getElementById('view-inserisci').innerHTML = '<p style="padding:24px;color:var(--text-muted)">Inserisci — coming soon</p>'; }
function renderStorico() { document.getElementById('view-storico').innerHTML = '<p style="padding:24px;color:var(--text-muted)">Storico — coming soon</p>'; }
function renderStrumenti() { document.getElementById('view-strumenti').innerHTML = '<p style="padding:24px;color:var(--text-muted)">Strumenti — coming soon</p>'; }
```

- [ ] **Step 2: Verify in Chrome**

Click "Nuovo file JSON" → choose location. Expected: file name appears in header, tabs appear, dashboard shows "coming soon". Clicking each tab switches the view. No console errors.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: tab routing and file open/create"
```

---

### Task 4: Strumenti View

**Files:**
- Modify: `app.js` — replace `renderStrumenti()` placeholder

- [ ] **Step 1: Replace `renderStrumenti()` in `app.js`**

```javascript
function renderStrumenti() {
  const data = getData();
  const container = document.getElementById('view-strumenti');
  const tipi = ['fondo', 'pac', 'pensione'];

  const rows = data.strumenti.map(s => {
    const hasRegs = data.registrazioni.some(r => r.strumentoId === s.id);
    return `
      <div class="strumento-item">
        <div class="strumento-info">
          <div class="strumento-name">${escHtml(s.nome)}</div>
          <div class="strumento-meta">
            ${escHtml(s.piattaforma)} · ${escHtml(s.tipo)}
            ${s.isin ? ` · <span style="font-family:monospace">${escHtml(s.isin)}</span>` : ''}
          </div>
        </div>
        <div class="strumento-actions">
          <button class="btn btn-sm btn-secondary" onclick="startEditStrumento('${s.id}')">Modifica</button>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteStrumento('${s.id}')"
            ${hasRegs ? 'title="Ha registrazioni — rimuovile prima dallo Storico"' : ''}>
            Elimina
          </button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="max-width:700px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700">Strumenti</h2>
        <button class="btn btn-primary" onclick="showStrumentoForm()">+ Aggiungi strumento</button>
      </div>
      <div id="strumento-form-container"></div>
      <div class="panel">
        ${data.strumenti.length === 0
          ? '<p style="color:var(--text-muted);text-align:center;padding:20px">Nessuno strumento configurato.</p>'
          : rows}
      </div>
    </div>`;
}

function showStrumentoForm(existing = null) {
  const isEdit = !!existing;
  const s = existing ?? { nome: '', piattaforma: '', tipo: 'fondo', isin: '' };
  document.getElementById('strumento-form-container').innerHTML = `
    <div class="panel" style="margin-bottom:16px;border:1px solid var(--indigo)">
      <h3 style="font-size:15px;font-weight:600;margin-bottom:16px">${isEdit ? 'Modifica strumento' : 'Nuovo strumento'}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">Nome *</label>
          <input id="sf-nome" class="form-input" value="${escHtml(s.nome)}" placeholder="es. Fondo Azionario Globale">
        </div>
        <div class="form-group">
          <label class="form-label">Piattaforma *</label>
          <input id="sf-piattaforma" class="form-input" value="${escHtml(s.piattaforma)}" placeholder="es. Fineco, Directa">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select id="sf-tipo" class="form-select">
            ${['fondo','pac','pensione'].map(t => `<option value="${t}" ${s.tipo===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">ISIN (opzionale)</label>
          <input id="sf-isin" class="form-input" value="${escHtml(s.isin)}"
            placeholder="es. IE00B4L5Y983" style="font-family:monospace">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-primary" onclick="handleSaveStrumento(${isEdit ? `'${s.id}'` : 'null'})">
          ${isEdit ? 'Salva modifiche' : 'Aggiungi'}
        </button>
        <button class="btn btn-secondary" onclick="renderStrumenti()">Annulla</button>
      </div>
    </div>`;
}

function startEditStrumento(id) {
  const s = getData().strumenti.find(s => s.id === id);
  if (s) showStrumentoForm(s);
}

async function handleSaveStrumento(id) {
  const nome = document.getElementById('sf-nome').value.trim();
  const piattaforma = document.getElementById('sf-piattaforma').value.trim();
  const tipo = document.getElementById('sf-tipo').value;
  const isin = document.getElementById('sf-isin').value.trim().toUpperCase();
  if (!nome || !piattaforma) { alert('Nome e Piattaforma sono obbligatori.'); return; }
  try {
    if (id) {
      await updateStrumento(id, { nome, piattaforma, tipo, isin });
    } else {
      await addStrumento({ nome, piattaforma, tipo, isin });
    }
    renderStrumenti();
  } catch (e) { alert('Errore: ' + e.message); }
}

async function handleDeleteStrumento(id) {
  try {
    await deleteStrumento(id);
    renderStrumenti();
  } catch (e) {
    if (e.message === 'STRUMENTO_HAS_REGISTRAZIONI') {
      alert('Non puoi eliminare questo strumento perché ha registrazioni collegate. Eliminale prima dallo Storico.');
    } else {
      alert('Errore: ' + e.message);
    }
  }
}
```

- [ ] **Step 2: Verify in Chrome**

Go to Strumenti tab. Expected: "Nessuno strumento configurato." Click "+ Aggiungi strumento" → form appears. Fill in Nome="Fondo A", Piattaforma="Piattaforma 1", Tipo="fondo", ISIN="IE00B4L5Y983" → Aggiungi. Strumento appears in list. Click Modifica → form pre-filled → change name → Salva modifiche → name updated. Open `pac-data.json` on disk → verify data is saved.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: strumenti view with add/edit/delete and ISIN support"
```

---

### Task 5: Inserisci View

**Files:**
- Modify: `app.js` — replace `renderInserisci()` placeholder

- [ ] **Step 1: Replace `renderInserisci()` in `app.js`**

```javascript
function renderInserisci() {
  const data = getData();
  const container = document.getElementById('view-inserisci');

  if (data.strumenti.length === 0) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Aggiungi prima degli strumenti dalla tab <strong>Strumenti</strong>.</div>';
    return;
  }

  const now = new Date();
  const currentMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const selectedMese = document._pacMese ?? currentMese;

  const piattaforme = getPiattaforme();
  const platformGroups = piattaforme.map(piattaforma => {
    const strumenti = data.strumenti.filter(s => s.piattaforma === piattaforma);
    return `
      <div class="platform-group">
        <div class="platform-title">${escHtml(piattaforma)}</div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:4px">
          <div class="entry-label">Strumento</div>
          <div class="entry-label">Versamento (€)</div>
          <div class="entry-label">Valore finale (€)</div>
        </div>
        ${strumenti.map(s => {
          const existing = data.registrazioni.find(r => r.strumentoId === s.id && r.mese === selectedMese);
          return `
            <div class="entry-row">
              <div style="display:flex;flex-direction:column;justify-content:center">
                <span style="font-size:14px">${escHtml(s.nome)}</span>
                ${s.isin ? `<span style="font-size:11px;color:var(--text-muted);font-family:monospace">${escHtml(s.isin)}</span>` : ''}
              </div>
              <input type="number" min="0" step="0.01" class="form-input entry-versamento"
                data-id="${s.id}" placeholder="0"
                value="${existing ? existing.versamento : ''}">
              <input type="number" min="0" step="0.01" class="form-input entry-valore"
                data-id="${s.id}" placeholder="0"
                value="${existing ? existing.valoreFinale : ''}">
            </div>`;
        }).join('')}
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="max-width:800px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700">Inserisci registrazione</h2>
        <div style="display:flex;align-items:center;gap:10px">
          <label class="form-label" style="margin:0">Mese:</label>
          <input type="month" id="input-mese" class="form-input" style="width:160px" value="${selectedMese}">
        </div>
      </div>
      <div class="panel" style="margin-bottom:16px">${platformGroups}</div>
      <button class="btn btn-primary" onclick="handleSalvaRegistrazioni()" style="padding:10px 28px;font-size:15px">Salva</button>
    </div>`;

  document.getElementById('input-mese').addEventListener('change', e => {
    document._pacMese = e.target.value;
    renderInserisci();
  });
}

async function handleSalvaRegistrazioni() {
  const mese = document.getElementById('input-mese').value;
  if (!mese) { alert('Seleziona un mese.'); return; }

  const entries = [];
  document.querySelectorAll('.entry-versamento').forEach(input => {
    const id = input.dataset.id;
    const versamento = parseFloat(input.value) || 0;
    const valoreInput = document.querySelector(`.entry-valore[data-id="${id}"]`);
    const valoreFinale = parseFloat(valoreInput?.value) || 0;
    if (versamento > 0 || valoreFinale > 0) {
      entries.push({ strumentoId: id, versamento, valoreFinale });
    }
  });

  if (entries.length === 0) { alert('Inserisci almeno un versamento o valore.'); return; }

  try {
    await saveRegistrazioniMese(mese, entries);
    alert(`Salvate ${entries.length} registrazioni per ${fmtMese(mese)}.`);
    renderInserisci();
  } catch (e) { alert('Errore nel salvataggio: ' + e.message); }
}
```

- [ ] **Step 2: Verify in Chrome**

With 3+ strumenti already configured, go to Inserisci. Expected: strumenti grouped by platform, current month pre-selected, ISINs shown below fund name. Enter versamento=150 and valoreFinale=5840 for one strumento → Salva → alert confirms. Switch month using the month picker → fields clear. Switch back to original month → previous values pre-filled. Open `pac-data.json` → confirm registrazioni array updated.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: inserisci view with monthly form grouped by platform"
```

---

### Task 6: Charts Module

**Files:**
- Create: `charts.js`

- [ ] **Step 1: Create `charts.js`**

```javascript
const PALETTE = {
  indigo: '#6366f1', blue: '#3b82f6', amber: '#f59e0b',
  green: '#10b981', red: '#ef4444',
  text: '#e2e8f0', muted: '#64748b', grid: '#1e1e30',
};

const PLATFORM_COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

function platformColor(piattaforma, allPiattaforme) {
  return PLATFORM_COLORS[allPiattaforme.indexOf(piattaforma) % PLATFORM_COLORS.length];
}

const chartInstances = {};

function getOrCreateChart(canvasId, config) {
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext('2d');
  chartInstances[canvasId] = new Chart(ctx, config);
  return chartInstances[canvasId];
}

// ── Line chart: patrimonio nel tempo ─────────────────────────────────────

function renderLineChart(canvasId, data) {
  const mesi = getSortedMesi();
  if (mesi.length === 0) {
    document.getElementById(canvasId).closest('.chart-container').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);padding:40px 0">Nessun dato da visualizzare.</p>';
    return;
  }

  const piattaforme = getPiattaforme();
  const datasets = piattaforme.map(p => {
    const ids = data.strumenti.filter(s => s.piattaforma === p).map(s => s.id);
    return {
      label: p,
      data: mesi.map(mese =>
        ids.reduce((sum, id) => {
          const reg = data.registrazioni.find(r => r.strumentoId === id && r.mese === mese);
          return sum + (reg ? reg.valoreFinale : 0);
        }, 0)
      ),
      borderColor: platformColor(p, piattaforme),
      backgroundColor: platformColor(p, piattaforme) + '22',
      tension: 0.3, fill: false,
    };
  });

  // Cumulative invested line
  datasets.push({
    label: 'Totale investito',
    data: mesi.map(mese =>
      data.registrazioni.filter(r => r.mese <= mese).reduce((sum, r) => sum + r.versamento, 0)
    ),
    borderColor: PALETTE.muted,
    borderDash: [5, 5],
    tension: 0.1, fill: false, pointRadius: 0,
  });

  getOrCreateChart(canvasId, {
    type: 'line',
    data: { labels: mesi.map(fmtMese), datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: PALETTE.text, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: PALETTE.muted, font: { size: 11 } }, grid: { color: PALETTE.grid } },
        y: {
          ticks: { color: PALETTE.muted, font: { size: 11 }, callback: v => '€' + v.toLocaleString('it-IT') },
          grid: { color: PALETTE.grid },
        },
      },
    },
  });
}

// ── Bar chart: rendimento % per strumento ─────────────────────────────────

function renderBarChart(canvasId, data) {
  const labels = [], values = [], colors = [];
  data.strumenti.forEach(s => {
    const stats = computeStrumentoStats(s.id);
    if (stats.totalInvestito === 0) return;
    labels.push(s.nome);
    values.push(parseFloat(stats.rendimentoPerc.toFixed(1)));
    colors.push(stats.rendimentoPerc >= 0 ? PALETTE.green : PALETTE.red);
  });

  if (labels.length === 0) {
    document.getElementById(canvasId).closest('.chart-container').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);padding:40px 0">Nessun dato.</p>';
    return;
  }

  getOrCreateChart(canvasId, {
    type: 'bar',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: PALETTE.muted, font: { size: 11 }, callback: v => v + '%' },
          grid: { color: PALETTE.grid },
        },
        y: { ticks: { color: PALETTE.text, font: { size: 11 } }, grid: { display: false } },
      },
    },
  });
}

// ── Donut chart: distribuzione per piattaforma ────────────────────────────

function renderDonutChart(canvasId, data) {
  const piattaforme = getPiattaforme();
  const values = piattaforme.map(p => {
    return data.strumenti
      .filter(s => s.piattaforma === p)
      .reduce((sum, s) => sum + computeStrumentoStats(s.id).valoreAttuale, 0);
  });

  if (values.every(v => v === 0)) {
    document.getElementById(canvasId).closest('.chart-container').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);padding:20px 0">Nessun dato.</p>';
    return;
  }

  getOrCreateChart(canvasId, {
    type: 'doughnut',
    data: {
      labels: piattaforme,
      datasets: [{ data: values, backgroundColor: piattaforme.map(p => platformColor(p, piattaforme)), borderWidth: 0 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: PALETTE.text, font: { size: 11 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } },
      },
    },
  });
}
```

- [ ] **Step 2: Verify**

Open `index.html` in Chrome → open DevTools → check Console tab for syntax errors. Expected: no errors. The chart functions are not yet called until Dashboard is implemented in the next task.

- [ ] **Step 3: Commit**

```bash
git add charts.js
git commit -m "feat: Chart.js wrappers for line, bar, and donut charts"
```

---

### Task 7: Dashboard View

**Files:**
- Modify: `app.js` — replace `renderDashboard()` placeholder

- [ ] **Step 1: Replace `renderDashboard()` in `app.js`**

```javascript
function renderDashboard() {
  const data = getData();
  const container = document.getElementById('view-dashboard');

  if (data.strumenti.length === 0) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Aggiungi strumenti e registrazioni per vedere la dashboard.</div>';
    return;
  }

  const totals = computeTotals();
  const pos = totals.rendimentoEuro >= 0;

  const recentRows = getRecentRegistrazioni(8).map(r => {
    const s = data.strumenti.find(st => st.id === r.strumentoId);
    if (!s) return '';
    const totalInv = data.registrazioni
      .filter(reg => reg.strumentoId === s.id && reg.mese <= r.mese)
      .reduce((sum, reg) => sum + reg.versamento, 0);
    const rendP = totalInv > 0 ? ((r.valoreFinale - totalInv) / totalInv) * 100 : 0;
    return `<tr>
      <td>${fmtMese(r.mese)}</td>
      <td>${escHtml(s.nome)}</td>
      <td>${escHtml(s.piattaforma)}</td>
      <td>${fmt(r.versamento)}</td>
      <td>${fmt(r.valoreFinale)}</td>
      <td class="${rendP >= 0 ? 'positive' : 'negative'}">${fmtPerc(rendP)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Valore Totale</div>
        <div class="kpi-value">${fmt(totals.valoreAttuale)}</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Totale Investito</div>
        <div class="kpi-value">${fmt(totals.totalInvestito)}</div>
      </div>
      <div class="kpi-card ${pos ? 'green' : 'red'}">
        <div class="kpi-label">Rendimento €</div>
        <div class="kpi-value ${pos ? 'positive' : 'negative'}">${pos ? '+' : ''}${fmt(totals.rendimentoEuro)}</div>
      </div>
      <div class="kpi-card ${pos ? 'green' : 'red'}">
        <div class="kpi-label">Rendimento %</div>
        <div class="kpi-value ${pos ? 'positive' : 'negative'}">${fmtPerc(totals.rendimentoPerc)}</div>
      </div>
    </div>

    <div class="dashboard-cols">
      <div class="col-left">
        <div class="panel">
          <div class="panel-title">Patrimonio nel tempo</div>
          <div class="chart-container" style="height:220px"><canvas id="chart-line"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-title">Ultime registrazioni</div>
          <table class="table">
            <thead><tr><th>Mese</th><th>Strumento</th><th>Piattaforma</th><th>Versato</th><th>Valore</th><th>Rend.</th></tr></thead>
            <tbody>${recentRows || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Nessuna registrazione</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="col-right">
        <div class="panel">
          <div class="panel-title">Rendimento per strumento</div>
          <div class="chart-container" style="height:200px"><canvas id="chart-bar"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-title">Distribuzione patrimonio</div>
          <div class="chart-container" style="height:200px"><canvas id="chart-donut"></canvas></div>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    renderLineChart('chart-line', data);
    renderBarChart('chart-bar', data);
    renderDonutChart('chart-donut', data);
  }, 0);
}
```

- [ ] **Step 2: Verify in Chrome**

With strumenti and registrazioni already entered: switch to Dashboard. Expected: 4 KPI cards with correct totals, line chart shows one line per piattaforma plus a dashed "Totale investito" line, bar chart shows rendimento % per strumento in green/red, donut chart shows distribution by platform. Switch to Inserisci → add a new entry → switch back to Dashboard → KPIs and charts auto-update.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: dashboard view with KPIs and all three charts"
```

---

### Task 8: Storico View

**Files:**
- Modify: `app.js` — replace `renderStorico()` placeholder

- [ ] **Step 1: Replace `renderStorico()` in `app.js`**

```javascript
let storicoFilters = { strumentoId: '', piattaforma: '' };

function renderStorico() {
  const data = getData();
  const container = document.getElementById('view-storico');
  const piattaforme = getPiattaforme();

  let regs = [...data.registrazioni]
    .sort((a, b) => b.mese.localeCompare(a.mese) || a.strumentoId.localeCompare(b.strumentoId));

  if (storicoFilters.piattaforma) {
    const ids = data.strumenti.filter(s => s.piattaforma === storicoFilters.piattaforma).map(s => s.id);
    regs = regs.filter(r => ids.includes(r.strumentoId));
  }
  if (storicoFilters.strumentoId) {
    regs = regs.filter(r => r.strumentoId === storicoFilters.strumentoId);
  }

  const rows = regs.map(r => {
    const s = data.strumenti.find(st => st.id === r.strumentoId);
    if (!s) return '';
    const totalInv = data.registrazioni
      .filter(reg => reg.strumentoId === s.id && reg.mese <= r.mese)
      .reduce((sum, reg) => sum + reg.versamento, 0);
    const rendE = r.valoreFinale - totalInv;
    const rendP = totalInv > 0 ? (rendE / totalInv) * 100 : 0;
    return `<tr>
      <td>${fmtMese(r.mese)}</td>
      <td>${escHtml(s.nome)}</td>
      <td>${escHtml(s.piattaforma)}</td>
      <td style="font-family:monospace;font-size:12px">${escHtml(s.isin || '—')}</td>
      <td>${fmt(r.versamento)}</td>
      <td>${fmt(r.valoreFinale)}</td>
      <td>${fmt(totalInv)}</td>
      <td class="${rendP >= 0 ? 'positive' : 'negative'}">${rendP >= 0 ? '+' : ''}${fmt(rendE)}</td>
      <td class="${rendP >= 0 ? 'positive' : 'negative'}">${fmtPerc(rendP)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-secondary" onclick="startEditReg('${r.id}')">✏</button>
        <button class="btn btn-sm btn-danger" onclick="handleDeleteReg('${r.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <h2 style="font-size:20px;font-weight:700">Storico</h2>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <select class="form-select" style="width:160px"
          onchange="storicoFilters.piattaforma=this.value;storicoFilters.strumentoId='';renderStorico()">
          <option value="">Tutte le piattaforme</option>
          ${piattaforme.map(p => `<option value="${p}" ${storicoFilters.piattaforma===p?'selected':''}>${escHtml(p)}</option>`).join('')}
        </select>
        <select class="form-select" style="width:180px"
          onchange="storicoFilters.strumentoId=this.value;renderStorico()">
          <option value="">Tutti gli strumenti</option>
          ${data.strumenti.map(s => `<option value="${s.id}" ${storicoFilters.strumentoId===s.id?'selected':''}>${escHtml(s.nome)}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" onclick="handleExportJSON()">⬇ Esporta JSON</button>
      </div>
    </div>

    <div id="edit-reg-container"></div>

    <div style="overflow-x:auto">
      <table class="table">
        <thead>
          <tr>
            <th>Mese</th><th>Strumento</th><th>Piattaforma</th><th>ISIN</th>
            <th>Versato</th><th>Valore</th><th>Tot. Inv.</th><th>Rend. €</th><th>Rend. %</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:20px">Nessuna registrazione.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function startEditReg(id) {
  const r = getData().registrazioni.find(r => r.id === id);
  if (!r) return;
  document.getElementById('edit-reg-container').innerHTML = `
    <div class="panel" style="margin-bottom:16px;border:1px solid var(--indigo)">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Modifica — ${fmtMese(r.mese)}</h3>
      <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">
        <div class="form-group" style="margin:0">
          <label class="form-label">Versamento (€)</label>
          <input id="edit-versamento" type="number" min="0" step="0.01" class="form-input" style="width:150px" value="${r.versamento}">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Valore finale (€)</label>
          <input id="edit-valore" type="number" min="0" step="0.01" class="form-input" style="width:150px" value="${r.valoreFinale}">
        </div>
        <button class="btn btn-primary" onclick="handleSaveEditReg('${id}')">Salva</button>
        <button class="btn btn-secondary" onclick="document.getElementById('edit-reg-container').innerHTML=''">Annulla</button>
      </div>
    </div>`;
}

async function handleSaveEditReg(id) {
  const versamento = parseFloat(document.getElementById('edit-versamento').value) || 0;
  const valoreFinale = parseFloat(document.getElementById('edit-valore').value) || 0;
  try {
    await updateRegistrazione(id, { versamento, valoreFinale });
    renderStorico();
  } catch (e) { alert('Errore: ' + e.message); }
}

async function handleDeleteReg(id) {
  if (!confirm('Eliminare questa registrazione?')) return;
  try {
    await deleteRegistrazione(id);
    renderStorico();
  } catch (e) { alert('Errore: ' + e.message); }
}

function handleExportJSON() {
  const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'pac-data-export.json' });
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Verify in Chrome**

Go to Storico. Expected: table with all entries, newest first. Filter by piattaforma → only matching rows shown. Click ✏ on a row → inline edit form appears with pre-filled values → change a value → Salva → row updates in table and `pac-data.json` is updated. Click ✕ → confirm dialog → row deleted. Click "Esporta JSON" → file `pac-data-export.json` downloads.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: storico view with filters, inline edit, delete, and JSON export"
```

---

## Verification End-to-End

1. Open `index.html` in Chrome — dark page, no console errors
2. Click "Nuovo file JSON" → save as `pac-data.json` in the PAC folder
3. Go to **Strumenti** → add 5 strumenti (3 on "Piattaforma 1", 1 on "Piattaforma 2", 1 "Pensione") with ISINs
4. Go to **Inserisci** → select current month → enter versamento and valoreFinale for each → Salva
5. Repeat Inserisci for 2-3 past months to populate the chart
6. Go to **Dashboard** → confirm 4 KPI cards show correct totals, all 3 charts render with real data
7. Go to **Storico** → filter by piattaforma → edit a row inline → verify update in `pac-data.json`
8. Click "Esporta JSON" → verify download
9. Reload the page → re-open `pac-data.json` → confirm all data persists across reload
