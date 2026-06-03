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
