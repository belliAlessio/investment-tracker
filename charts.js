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
