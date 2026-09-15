// charts.js — capa fina sobre Chart.js (cargado por CDN en index.html).
// Si mañana se cambia de librería, sólo se toca este archivo.

const activeCharts = new Map();

function destroyIfExists(canvasId) {
  const existing = activeCharts.get(canvasId);
  if (existing) { existing.destroy(); activeCharts.delete(canvasId); }
}

const PALETTE = ['#205E5A', '#C97B3D', '#3A6EA5', '#B23A48', '#6C4F94', '#B8862E', '#1F7A5C', '#4A5568', '#8A8F98'];

export function renderLineChart(canvasId, { labels, series }) {
  destroyIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  activeCharts.set(canvasId, new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s, i) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color || PALETTE[i % PALETTE.length],
        backgroundColor: 'transparent',
        tension: 0.25,
        pointRadius: 3
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: series.length > 1, labels: { font: { family: 'Manrope' } } } },
      scales: {
        y: { grid: { color: '#E3E6EC' }, ticks: { font: { family: 'IBM Plex Mono', size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Manrope', size: 11 } } }
      }
    }
  }));
}

export function renderBarChart(canvasId, { labels, data, colors }) {
  destroyIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  activeCharts.set(canvasId, new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors || PALETTE, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: '#E3E6EC' }, ticks: { font: { family: 'IBM Plex Mono', size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Manrope', size: 11 } } }
      }
    }
  }));
}

export function renderDoughnutChart(canvasId, { labels, data, colors }) {
  destroyIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;

  activeCharts.set(canvasId, new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors || PALETTE, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { position: 'right', labels: { font: { family: 'Manrope', size: 11 }, boxWidth: 10 } } }
    }
  }));
}
