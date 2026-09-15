// analytics.js
// Análisis descriptivo sobre los registros históricos: agrupación por mes,
// comparación mes a mes, y detección de valores atípicos vía z-score.
// Es una versión JS del mismo análisis que en la Etapa 5 se reproduce con
// Pandas/NumPy — mismas ideas (agrupar, comparar medias, desviación estándar).

function monthKey(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthlyTotals(records) {
  const map = new Map();
  records.forEach(r => {
    const key = monthKey(r.date);
    if (!key) return;
    map.set(key, round((map.get(key) || 0) + Number(r.amount || 0)));
  });
  return Array.from(map.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function monthlyTotalsByCategory(records, category) {
  return monthlyTotals(records.filter(r => r.category === category));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Detecta meses cuyo gasto se aleja más de `threshold` desviaciones
// estándar de la media histórica (valor atípico / comportamiento inusual).
export function detectAnomalies(records, threshold = 1.5) {
  const totals = monthlyTotals(records);
  if (totals.length < 3) return [];
  const values = totals.map(t => t.total);
  const m = mean(values);
  const sd = stdDev(values);
  if (sd === 0) return [];

  return totals
    .map(t => ({ ...t, zScore: round((t.total - m) / sd) }))
    .filter(t => Math.abs(t.zScore) >= threshold)
    .map(t => ({
      ...t,
      direction: t.zScore > 0 ? 'alto' : 'bajo',
      averageForComparison: round(m)
    }));
}

export function topCategory(records) {
  const map = new Map();
  records.forEach(r => map.set(r.category, (map.get(r.category) || 0) + Number(r.amount || 0)));
  let best = null;
  map.forEach((total, category) => {
    if (!best || total > best.total) best = { category, total: round(total) };
  });
  return best;
}

// Compara el total del último mes con registros vs el mes anterior, por categoría.
export function monthOverMonthChange(records) {
  const byMonth = new Map();
  records.forEach(r => {
    const key = monthKey(r.date);
    if (!key) return;
    if (!byMonth.has(key)) byMonth.set(key, new Map());
    const catMap = byMonth.get(key);
    catMap.set(r.category, (catMap.get(r.category) || 0) + Number(r.amount || 0));
  });
  const months = Array.from(byMonth.keys()).sort();
  if (months.length < 2) return [];

  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const lastMap = byMonth.get(last);
  const prevMap = byMonth.get(prev);

  const changes = [];
  lastMap.forEach((total, category) => {
    const prevTotal = prevMap.get(category) || 0;
    if (prevTotal === 0) return;
    const pctChange = round(((total - prevTotal) / prevTotal) * 100);
    if (Math.abs(pctChange) >= 10) {
      changes.push({ category, pctChange, from: round(prevTotal), to: round(total) });
    }
  });
  return changes.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
}

// Genera mensajes en lenguaje natural a partir de los análisis anteriores.
export function generateInsights({ expenses, summary }) {
  const insights = [];

  const changes = monthOverMonthChange(expenses);
  changes.slice(0, 3).forEach(c => {
    const direction = c.pctChange > 0 ? 'aumentaron' : 'disminuyeron';
    insights.push(`Tus gastos de ${c.category} ${direction} ${Math.abs(c.pctChange)}% respecto al mes anterior.`);
  });

  const anomalies = detectAnomalies(expenses);
  anomalies.forEach(a => {
    insights.push(`En ${a.month} tu gasto total fue inusualmente ${a.direction} (S/ ${a.total.toFixed(2)} vs. un promedio de S/ ${a.averageForComparison.toFixed(2)}).`);
  });

  const top = topCategory(expenses);
  if (top) insights.push(`Tu categoría de mayor gasto es ${top.category}, con S/ ${top.total.toFixed(2)} acumulados.`);

  if (summary) {
    insights.push(`Tu deuda representa el ${summary.debtRatio}% de tus ingresos mensuales.`);
  }

  if (insights.length === 0) {
    insights.push('Registra más movimientos para empezar a ver patrones y tendencias aquí.');
  }
  return insights;
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
