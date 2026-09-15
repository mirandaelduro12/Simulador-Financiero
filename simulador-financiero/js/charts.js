// charts.js — capa fina sobre Chart.js (cargado por CDN en index.html).
// Si mañana se cambia de librería, sólo se toca este archivo.
// Los colores se leen de las variables CSS del tema activo en cada render.

import { formatCurrency } from './utils.js';

const activeCharts = new Map();

const PALETTE = ['#205E5A', '#C97B3D', '#3A6EA5', '#B23A48', '#6C4F94', '#B8862E', '#1F7A5C', '#4A5568', '#8A8F98'];

function destroyIfExists(canvasId) {
  const existing = activeCharts.get(canvasId);
  if (existing) { existing.destroy(); activeCharts.delete(canvasId); }
}

// Convierte cualquier color CSS (incluido oklch) a rgba, pintándolo en un
// canvas de 1px: Chart.js no entiende oklch, pero el canvas del navegador sí.
const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
function toRgba(cssColor, alpha = 1) {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = cssColor;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function token(name, alpha = 1) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return toRgba(value || '#888', alpha);
}

// Color de un token CSS del tema activo, listo para pasar a un gráfico
export function themeColor(name, alpha = 1) {
  return token(name, alpha);
}

function theme() {
  return {
    ink: token('--ink'),
    ink3: token('--ink-3'),
    line: token('--line'),
    surface: token('--surface'),
    tooltipBg: token('--rail'),
    tooltipInk: token('--rail-ink'),
    primary: token('--primary'),
    negative: token('--negative')
  };
}

// Respeta la preferencia del sistema de reducir animaciones
if (typeof Chart !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  Chart.defaults.animation = false;
}

const FONT_UI = "'Hanken Grotesk', sans-serif";
const FONT_DATA = "'Geist Mono', monospace";

function baseTooltip(t) {
  return {
    backgroundColor: t.tooltipBg,
    titleColor: t.tooltipInk,
    bodyColor: t.tooltipInk,
    titleFont: { family: FONT_UI, size: 12, weight: '600' },
    bodyFont: { family: FONT_DATA, size: 12 },
    padding: 10,
    cornerRadius: 10,
    displayColors: false,
    caretSize: 5
  };
}

function baseScales(t, { currency = true } = {}) {
  return {
    y: {
      border: { display: false },
      grid: { color: t.line, drawTicks: false },
      ticks: {
        color: t.ink3, padding: 8, maxTicksLimit: 6,
        font: { family: FONT_DATA, size: 11 },
        callback: v => currency ? compactCurrency(v) : v
      }
    },
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: { color: t.ink3, padding: 6, font: { family: FONT_UI, size: 12 } }
    }
  };
}

function horizontalScales(t) {
  const { x, y } = baseScales(t);
  return {
    x: { ...y, ticks: { ...y.ticks, padding: 6 } },
    y: { ...x, ticks: { ...x.ticks, color: t.ink, padding: 8, font: { family: FONT_UI, size: 12.5 } } }
  };
}

function compactCurrency(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1000) return `${sign}${(abs / 1000).toLocaleString('es-PE', { maximumFractionDigits: 1 })}k`;
  return `${sign}${abs.toLocaleString('es-PE')}`;
}

export function renderLineChart(canvasId, { labels, series }) {
  destroyIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;
  const t = theme();

  activeCharts.set(canvasId, new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: series.map((s, i) => {
        const color = s.color || PALETTE[i % PALETTE.length];
        return {
          label: s.label,
          data: s.data,
          borderColor: color,
          borderWidth: 2.5,
          cubicInterpolationMode: 'monotone',
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: t.surface,
          fill: series.length === 1 ? 'origin' : false,
          backgroundColor: (context) => areaGradient(context, color)
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: series.length > 1, labels: { color: t.ink, font: { family: FONT_UI } } },
        tooltip: { ...baseTooltip(t), callbacks: { label: c => `${c.dataset.label}: ${formatCurrency(c.parsed.y)}` } }
      },
      scales: baseScales(t)
    }
  }));
}

function areaGradient(context, color) {
  const { chart } = context;
  const { ctx, chartArea } = chart;
  if (!chartArea) return 'transparent';
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, withAlpha(color, 0.22));
  gradient.addColorStop(1, withAlpha(color, 0));
  return gradient;
}

function withAlpha(color, alpha) {
  return toRgba(color, alpha);
}

export function renderBarChart(canvasId, { labels, data, colors }) {
  destroyIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;
  const t = theme();

  activeCharts.set(canvasId, new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || PALETTE,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 26
      }]
    },
    options: {
      indexAxis: 'y', // barras horizontales: las etiquetas de categoría se leen sin rotar
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...baseTooltip(t), callbacks: { label: c => formatCurrency(c.parsed.x) } }
      },
      scales: horizontalScales(t)
    }
  }));
}

export function renderDoughnutChart(canvasId, { labels, data, colors }) {
  destroyIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx || typeof Chart === 'undefined') return;
  const t = theme();

  activeCharts.set(canvasId, new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || PALETTE,
        borderColor: t.surface,
        borderWidth: 3,
        borderRadius: 4,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      layout: { padding: 6 },
      plugins: {
        legend: { display: false },
        tooltip: { ...baseTooltip(t), callbacks: { label: c => `${c.label}: ${formatCurrency(c.parsed)}` } }
      }
    }
  }));
}
