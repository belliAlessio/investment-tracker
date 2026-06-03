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

// ── Strumenti View ────────────────────────────────────────────────────────

function renderStrumenti() {
  const data = getData();
  const container = document.getElementById('view-strumenti');

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

// ── Inserisci View ────────────────────────────────────────────────────────

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

// ── Dashboard View ────────────────────────────────────────────────────────

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

// ── Storico View ──────────────────────────────────────────────────────────

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
