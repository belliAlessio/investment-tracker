// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  if (!isApiSupported()) {
    document.getElementById('browser-warning').classList.remove('hidden');
    return;
  }
  document.getElementById('btn-open-file').addEventListener('click', handleOpenFile);
  document.getElementById('btn-new-file').addEventListener('click', handleNewFile);
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  const result = await tryAutoOpenFile();
  if (result === 'auto') {
    onFileLoaded();
  } else if (result && result.status === 'prompt') {
    showReopenBanner(result.handle);
  }
});

function showReopenBanner(handle) {
  const banner = document.getElementById('no-file-banner');
  banner.innerHTML = `
    <p>Trovato il file precedente <strong>${handle.name}</strong>.</p>
    <button class="btn btn-primary" id="btn-reopen">Riapri</button>
    <button class="btn btn-secondary" style="margin-left:8px" id="btn-reopen-other">Scegli altro file</button>
  `;
  document.getElementById('btn-reopen').addEventListener('click', async () => {
    try {
      await reopenSavedHandle(handle);
      onFileLoaded();
    } catch (e) {
      if (e.message !== 'Permesso negato') alert('Errore: ' + e.message);
    }
  });
  document.getElementById('btn-reopen-other').addEventListener('click', handleOpenFile);
}

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
    case 'storico':   renderStorico();   break;
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
      <div id="sc-${s.id}" class="panel" style="padding:14px 16px">
        <div class="strumento-item">
          <div class="strumento-info">
            <div class="strumento-name">${escHtml(s.nome)}</div>
            <div class="strumento-meta">
              ${escHtml(s.piattaforma)} · ${escHtml(s.tipo)}
              ${s.isin ? ` · <span style="font-family:monospace">${escHtml(s.isin)}</span>` : ''}
            </div>
          </div>
          <div class="strumento-actions">
            ${s.isin ? `<button class="btn btn-sm btn-ghost" onclick="toggleFundInfo('${s.id}')">ⓘ Info</button>` : ''}
            <button class="btn btn-sm btn-secondary" onclick="startEditStrumento('${s.id}')">Modifica</button>
            <button class="btn btn-sm btn-danger" onclick="handleDeleteStrumento('${s.id}')"
              ${hasRegs ? 'title="Ha registrazioni — rimuovile prima dallo Storico"' : ''}>
              Elimina
            </button>
          </div>
        </div>
        <div id="fip-${s.id}" class="fund-info-panel">${s.isin ? '<div class="fund-loading">Caricamento scheda...</div>' : ''}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="max-width:700px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700">Strumenti</h2>
        <button class="btn btn-primary" onclick="showStrumentoForm()">+ Aggiungi strumento</button>
      </div>
      <div id="strumento-form-container"></div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${data.strumenti.length === 0
          ? '<div class="panel"><p style="color:var(--text-muted);text-align:center;padding:20px">Nessuno strumento configurato.</p></div>'
          : rows}
      </div>
    </div>`;

  data.strumenti.filter(s => s.isin).forEach(s => {
    fetchFundInfo(s.isin).then(info => {
      const panel = document.getElementById(`fip-${s.id}`);
      if (!panel) return;
      if (info) panel.innerHTML = buildFundCard(info);
      else panel.innerHTML = '';
    });
  });
}

function showStrumentoForm(existing = null) {
  const isEdit = !!existing;
  const s = existing ?? { nome: '', piattaforma: '', tipo: 'fondo', isin: '', capitalePreesistente: 0 };
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
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Capitale preesistente (€)</label>
          <input id="sf-capitale" type="number" min="0" step="0.01" class="form-input"
            value="${s.capitalePreesistente || 0}" placeholder="0">
          <span style="font-size:12px;color:var(--text-muted);margin-top:4px;display:block">Capitale già investito prima della prima registrazione — viene incluso nel calcolo del rendimento.</span>
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
  const capitalePreesistente = parseFloat(document.getElementById('sf-capitale').value) || 0;
  if (!nome || !piattaforma) { alert('Nome e Piattaforma sono obbligatori.'); return; }
  try {
    if (id) {
      await updateStrumento(id, { nome, piattaforma, tipo, isin, capitalePreesistente });
    } else {
      await addStrumento({ nome, piattaforma, tipo, isin, capitalePreesistente });
    }
    renderStrumenti();
  } catch (e) { alert('Errore: ' + e.message); }
}

// ── Fund Info Panel ───────────────────────────────────────────────────────

function toggleFundInfo(id) {
  const panel = document.getElementById(`fip-${id}`);
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? '' : 'none';
}

function buildFundCard(info) {
  const name    = info.longName ?? info.symbol;
  const meta    = [info.quoteType, info.exchange, info.currency].filter(Boolean).join(' · ');
  const price   = info.currentPrice != null ? `${info.currentPrice.toFixed(2)} ${info.currency}` : null;
  const range52 = (info.high52 != null && info.low52 != null)
    ? `${info.low52.toFixed(2)} – ${info.high52.toFixed(2)} ${info.currency}` : null;

  const r = (n) => n != null ? fmtPerc(n) : null;
  const ytd = r(info.ytdReturn);
  const y1  = r(info.oneYearReturn);
  const y3  = r(info.threeYearReturn);
  const y5  = r(info.fiveYearReturn);

  const stat = (label, val) => val
    ? `<div class="fic-stat"><div class="fic-stat-label">${label}</div><div class="fic-stat-value">${val}</div></div>` : '';
  const retCell = (label, val) => val
    ? `<div class="fic-ret"><div class="fic-ret-label">${label}</div><div class="fic-ret-value ${val.startsWith('+') ? 'positive' : 'negative'}">${val}</div></div>` : '';

  const stats   = [stat('Prezzo', price), stat('52 settimane', range52)].filter(Boolean).join('');
  const returns = [retCell('YTD', ytd), retCell('1 anno', y1), retCell('3 anni', y3), retCell('5 anni', y5)].filter(Boolean).join('');

  return `
    <div class="fund-info-card">
      <div class="fic-header">
        <div class="fic-name">${escHtml(name)}</div>
        ${meta ? `<div class="fic-meta">${escHtml(meta)}</div>` : ''}
      </div>
      ${stats   ? `<div class="fic-stats">${stats}</div>` : ''}
      ${returns ? `<div class="fic-section"><div class="fic-section-title">Rendimenti storici (calcolati)</div><div class="fic-returns">${returns}</div></div>` : ''}
    </div>`;
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

// ── Modal nuova registrazione ─────────────────────────────────────────────

function openNewRegistrazioneModal(preStrumentoId = null) {
  const data = getData();
  if (data.strumenti.length === 0) {
    alert('Aggiungi prima degli strumenti dalla tab Strumenti.');
    return;
  }

  const now = new Date();
  const currentMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const strumentoOptions = data.strumenti
    .map(s => `<option value="${s.id}" ${s.id === preStrumentoId ? 'selected' : ''}>${escHtml(s.nome)} — ${escHtml(s.piattaforma)}</option>`)
    .join('');

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border)">
        <span style="font-size:15px;font-weight:600">Nuova registrazione</span>
        <button onclick="closeModal()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;line-height:1;padding:2px">✕</button>
      </div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Mese *</label>
            <input id="modal-mese" type="month" class="form-input" value="${currentMese}">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Strumento *</label>
            <select id="modal-strumento" class="form-select">${strumentoOptions}</select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Versamento (€)</label>
            <input id="modal-versamento" type="number" min="0" step="0.01" class="form-input" placeholder="0">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Valore finale (€)</label>
            <input id="modal-valore" type="number" min="0" step="0.01" class="form-input" placeholder="0">
          </div>
        </div>
        <div id="modal-existing-note" style="font-size:12px;color:var(--text-muted)"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--border)">
        <button class="btn btn-secondary" onclick="closeModal()">Annulla</button>
        <button class="btn btn-primary" onclick="handleSaveModal()">Salva</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  // Pre-fill if record already exists for current selection
  const checkExisting = () => {
    const mese = document.getElementById('modal-mese').value;
    const strumentoId = document.getElementById('modal-strumento').value;
    const existing = getData().registrazioni.find(r => r.mese === mese && r.strumentoId === strumentoId);
    const note = document.getElementById('modal-existing-note');
    if (existing) {
      document.getElementById('modal-versamento').value = existing.versamento || '';
      document.getElementById('modal-valore').value = existing.valoreFinale || '';
      note.textContent = `Esiste già una registrazione per questo mese — verrà sovrascritta.`;
    } else {
      document.getElementById('modal-versamento').value = '';
      document.getElementById('modal-valore').value = '';
      note.textContent = '';
    }
  };

  document.getElementById('modal-mese').addEventListener('change', checkExisting);
  document.getElementById('modal-strumento').addEventListener('change', checkExisting);
  checkExisting();

  document.getElementById('modal-mese').focus();
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.remove();
}

async function handleSaveModal() {
  const mese = document.getElementById('modal-mese').value;
  const strumentoId = document.getElementById('modal-strumento').value;
  const versamento = parseFloat(document.getElementById('modal-versamento').value) || 0;
  const valoreFinale = parseFloat(document.getElementById('modal-valore').value) || 0;

  if (!mese) { alert('Seleziona un mese.'); return; }
  if (!strumentoId) { alert('Seleziona uno strumento.'); return; }
  if (versamento === 0 && valoreFinale === 0) { alert('Inserisci almeno un valore.'); return; }

  try {
    await upsertRegistrazione(mese, strumentoId, versamento, valoreFinale);
    closeModal();
    renderStorico();
  } catch (e) { alert('Errore: ' + e.message); }
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
    const totalInv = (s.capitalePreesistente || 0) + data.registrazioni
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
    const totalInv = (s.capitalePreesistente || 0) + data.registrazioni
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
        <button class="btn btn-primary" onclick="openNewRegistrazioneModal()">+ Nuova registrazione</button>
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
