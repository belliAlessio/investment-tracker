const EMPTY_DATA = { strumenti: [], registrazioni: [] };

let fileHandle = null;
let appData = null;

// ── File I/O ──────────────────────────────────────────────────────────────

function isApiSupported() {
  return 'showOpenFilePicker' in window;
}

// ── Handle persistence (IndexedDB) ───────────────────────────────────────

const IDB_NAME = 'pac-tracker';
const IDB_STORE = 'file-handle';
const IDB_KEY = 'last-handle';

function _openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function _saveHandleToIDB(handle) {
  const db = await _openIDB();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = e => rej(e.target.error); });
}

async function _loadHandleFromIDB() {
  const db = await _openIDB();
  const tx = db.transaction(IDB_STORE, 'readonly');
  const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
  return new Promise((res, rej) => { req.onsuccess = e => res(e.target.result ?? null); req.onerror = e => rej(e.target.error); });
}

// Returns 'auto' (opened), 'prompt' (handle found but needs user gesture), or null (no handle)
async function tryAutoOpenFile() {
  try {
    const handle = await _loadHandleFromIDB();
    if (!handle) return null;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      fileHandle = handle;
      const file = await fileHandle.getFile();
      appData = JSON.parse(await file.text());
      return 'auto';
    }
    return { status: 'prompt', handle };
  } catch {
    return null;
  }
}

async function reopenSavedHandle(handle) {
  const perm = await handle.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') throw new Error('Permesso negato');
  fileHandle = handle;
  const file = await fileHandle.getFile();
  appData = JSON.parse(await file.text());
  return appData;
}

async function openExistingFile() {
  [fileHandle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
  });
  const file = await fileHandle.getFile();
  appData = JSON.parse(await file.text());
  await _saveHandleToIDB(fileHandle);
  return appData;
}

async function createNewFile() {
  fileHandle = await window.showSaveFilePicker({
    suggestedName: 'pac-data.json',
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
  });
  appData = structuredClone(EMPTY_DATA);
  await persistData();
  await _saveHandleToIDB(fileHandle);
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

async function addStrumento({ nome, piattaforma, tipo, isin = '', capitalePreesistente = 0 }) {
  const strumento = { id: generateId(nome), nome, piattaforma, tipo, isin, capitalePreesistente: Number(capitalePreesistente) || 0 };
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
  const strumento = appData.strumenti.find(s => s.id === strumentoId);
  const capitalePreesistente = strumento ? (strumento.capitalePreesistente || 0) : 0;
  const regs = appData.registrazioni
    .filter(r => r.strumentoId === strumentoId)
    .sort((a, b) => a.mese.localeCompare(b.mese));
  const totalInvestito = capitalePreesistente + regs.reduce((sum, r) => sum + r.versamento, 0);
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

// ── Fund Info API (Yahoo Finance via ISIN) ────────────────────────────────

const _fundCache = new Map();

async function fetchFundInfo(isin) {
  if (_fundCache.has(isin)) return _fundCache.get(isin);
  try {
    // Step 1: ISIN → ticker via search
    const searchResp = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=5&newsCount=0`
    );
    if (!searchResp.ok) return null;
    const searchJson = await searchResp.json();
    const quotes = searchJson.quotes ?? [];
    const match = quotes.find(q => ['ETF', 'MUTUALFUND', 'EQUITY'].includes(q.quoteType)) ?? quotes[0];
    if (!match) return null;

    // Step 2: 5-year monthly chart — no crumb needed
    const chartResp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(match.symbol)}?range=5y&interval=1mo`
    );
    if (!chartResp.ok) return null;
    const chartJson = await chartResp.json();
    const cr = chartJson?.chart?.result?.[0];
    if (!cr) return null;

    const meta     = cr.meta;
    const closes   = cr.indicators?.quote?.[0]?.close ?? [];
    const tss      = cr.timestamp ?? [];
    const current  = meta.regularMarketPrice;
    const nowSec   = Date.now() / 1000;

    const priceAt = (targetSec) => {
      let best = null, bestDiff = Infinity;
      for (let i = 0; i < tss.length; i++) {
        const d = Math.abs(tss[i] - targetSec);
        if (d < bestDiff && closes[i] != null) { bestDiff = d; best = closes[i]; }
      }
      return best;
    };

    const ret = (past) => (past && current) ? (current - past) / past * 100 : null;
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime() / 1000;

    const info = {
      symbol:          match.symbol,
      longName:        meta.longName ?? match.longname ?? match.shortname,
      currency:        meta.currency,
      quoteType:       meta.instrumentType ?? match.quoteType,
      exchange:        meta.fullExchangeName ?? meta.exchangeName,
      currentPrice:    current,
      high52:          meta.fiftyTwoWeekHigh,
      low52:           meta.fiftyTwoWeekLow,
      ytdReturn:       ret(priceAt(startOfYear)),
      oneYearReturn:   ret(priceAt(nowSec - 365 * 86400)),
      threeYearReturn: ret(priceAt(nowSec - 3 * 365 * 86400)),
      fiveYearReturn:  ret(priceAt(nowSec - 5 * 365 * 86400)),
    };
    _fundCache.set(isin, info);
    return info;
  } catch {
    return null;
  }
}
