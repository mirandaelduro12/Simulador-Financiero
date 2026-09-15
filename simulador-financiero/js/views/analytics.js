import { Storage } from '../storage.js';
import { h, formatMonthKey } from '../utils.js';
import { buildSummary, groupByCategory } from '../calculations.js';
import { monthlyTotals, detectAnomalies, generateInsights, monthOverMonthChange } from '../analytics.js';
import { renderLineChart, renderBarChart, themeColor } from '../charts.js';
import { loadConfig } from '../config.js';

export async function renderAnalytics(outlet) {
  const config = await loadConfig();
  const income = Storage.getAll('income');
  const expenses = Storage.getAll('expenses');
  const debts = Storage.getAll('debts');
  const summary = buildSummary({ income, expenses, debts });
  const categoryLabel = id => config.expenseCategories.find(c => c.id === id)?.label || id;

  if (!expenses.length) {
    outlet.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'empty-state' }, [h('p', {}, 'Registra algunos gastos con fecha para ver tendencias y patrones aquí.')])
    ]));
    return;
  }

  const insights = generateInsights({ expenses, summary });
  outlet.appendChild(h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Insights generados a partir de tus datos'),
    h('div', { class: 'stack' }, insights.map(msg => h('div', { class: 'alert' }, msg)))
  ]));

  const trendCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, [h('span', {}, 'Evolución de gastos por mes'), h('span', { class: 'card-sub' }, 'total registrado')]),
    h('div', { class: 'chart-wrap' }, [h('canvas', { id: 'anTrendChart' })])
  ]);
  const catCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, [h('span', {}, 'Gasto total por categoría'), h('span', { class: 'card-sub' }, 'equivalente mensual')]),
    h('div', { class: 'chart-wrap' }, [h('canvas', { id: 'anCategoryChart' })])
  ]);
  outlet.appendChild(h('div', { class: 'grid-2 mt-16' }, [trendCard, catCard]));

  const anomalies = detectAnomalies(expenses);
  const changes = monthOverMonthChange(expenses);

  outlet.appendChild(h('div', { class: 'grid-2 mt-16' }, [
    h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, 'Meses con comportamiento atípico'),
      anomalies.length
        ? h('div', { class: 'stack' }, anomalies.map(a => h('div', { class: 'alert warning' },
          `${formatMonthKey(a.month)}: gasto total ${a.direction === 'alto' ? 'muy por encima' : 'muy por debajo'} de tu promedio (S/ ${a.total.toFixed(2)} vs. S/ ${a.averageForComparison.toFixed(2)}, z-score ${a.zScore}).`
        )))
        : h('p', { class: 'text-soft' }, 'No se detectaron meses atípicos con los datos actuales (se necesitan al menos 3 meses de historial).')
    ]),
    h('div', { class: 'card' }, [
      h('div', { class: 'card-title' }, 'Cambios relevantes vs. el mes anterior'),
      changes.length
        ? h('div', { class: 'stack' }, changes.map(c => h('div', { class: `alert ${c.pctChange > 0 ? 'negative' : 'positive'}` },
          `${categoryLabel(c.category)}: ${c.pctChange > 0 ? 'subió' : 'bajó'} ${Math.abs(c.pctChange)}% (de S/ ${c.from.toFixed(2)} a S/ ${c.to.toFixed(2)}).`
        )))
        : h('p', { class: 'text-soft' }, 'Aún no hay suficiente historial mensual para comparar.')
    ])
  ]));

  const totals = monthlyTotals(expenses);
  renderLineChart('anTrendChart', {
    labels: totals.map(t => formatMonthKey(t.month)),
    series: [{ label: 'Gasto mensual total', data: totals.map(t => t.total), color: themeColor('--negative') }]
  });

  const byCategory = groupByCategory(expenses);
  renderBarChart('anCategoryChart', {
    labels: byCategory.map(c => categoryLabel(c.category)),
    data: byCategory.map(c => c.total),
    colors: byCategory.map(c => config.expenseCategories.find(x => x.id === c.category)?.color || '#8A8F98')
  });
}
