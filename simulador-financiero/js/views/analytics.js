import { Storage } from '../storage.js';
import { h, monthLabel } from '../utils.js';
import { buildSummary } from '../calculations.js';
import { monthlyTotals, detectAnomalies, generateInsights, monthOverMonthChange } from '../analytics.js';
import { renderLineChart, renderBarChart } from '../charts.js';
import { groupByCategory } from '../calculations.js';

export function renderAnalytics(outlet) {
  const income = Storage.getAll('income');
  const expenses = Storage.getAll('expenses');
  const debts = Storage.getAll('debts');
  const summary = buildSummary({ income, expenses, debts });

  if (!expenses.length) {
    outlet.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'empty-state' }, 'Registra algunos gastos con fecha para ver tendencias y patrones aquí.')
    ]));
    return;
  }

  const insights = generateInsights({ expenses, summary });
  const insightsCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Insights generados a partir de tus datos'),
    h('div', { class: 'stack' }, insights.map(msg => h('div', { class: 'alert' }, msg)))
  ]);
  outlet.appendChild(insightsCard);

  const grid2 = h('div', { class: 'grid-2 mt-16' });
  const trendCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Evolución de gastos por mes'),
    h('div', { class: 'chart-wrap' }, [h('canvas', { id: 'anTrendChart' })])
  ]);
  const catCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Gasto total por categoría'),
    h('div', { class: 'chart-wrap' }, [h('canvas', { id: 'anCategoryChart' })])
  ]);
  grid2.appendChild(trendCard);
  grid2.appendChild(catCard);
  outlet.appendChild(grid2);

  const anomalies = detectAnomalies(expenses);
  const anomalyCard = h('div', { class: 'card mt-16' }, [
    h('div', { class: 'card-title' }, 'Meses con comportamiento atípico'),
    anomalies.length
      ? h('div', { class: 'stack' }, anomalies.map(a => h('div', { class: 'alert warning' },
        `${a.month}: gasto total ${a.direction === 'alto' ? 'muy por encima' : 'muy por debajo'} de tu promedio (S/ ${a.total.toFixed(2)} vs. S/ ${a.averageForComparison.toFixed(2)}, z-score ${a.zScore}).`
      )))
      : h('div', { class: 'text-soft' }, 'No se detectaron meses atípicos con los datos actuales (se necesitan al menos 3 meses de historial).')
  ]);
  outlet.appendChild(anomalyCard);

  const changes = monthOverMonthChange(expenses);
  const changesCard = h('div', { class: 'card mt-16' }, [
    h('div', { class: 'card-title' }, 'Cambios relevantes vs. el mes anterior'),
    changes.length
      ? h('div', { class: 'stack' }, changes.map(c => h('div', { class: `alert ${c.pctChange > 0 ? 'negative' : 'positive'}` },
        `${c.category}: ${c.pctChange > 0 ? 'subió' : 'bajó'} ${Math.abs(c.pctChange)}% (de S/ ${c.from.toFixed(2)} a S/ ${c.to.toFixed(2)}).`
      )))
      : h('div', { class: 'text-soft' }, 'Aún no hay suficiente historial mensual para comparar.')
  ]);
  outlet.appendChild(changesCard);

  const totals = monthlyTotals(expenses);
  renderLineChart('anTrendChart', {
    labels: totals.map(t => t.month),
    series: [{ label: 'Gasto mensual total', data: totals.map(t => t.total), color: '#B23A48' }]
  });

  const byCategory = groupByCategory(expenses);
  renderBarChart('anCategoryChart', {
    labels: byCategory.map(c => c.category),
    data: byCategory.map(c => c.total)
  });
}
