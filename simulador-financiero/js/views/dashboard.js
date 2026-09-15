import { Storage } from '../storage.js';
import { h, formatCurrency, formatPercent, monthLabel } from '../utils.js';
import { buildSummary, evaluateRules, generateProjection } from '../calculations.js';
import { generateInsights } from '../analytics.js';
import { renderLineChart, renderDoughnutChart } from '../charts.js';
import { groupByCategory } from '../calculations.js';

export function renderDashboard(outlet, titleEl) {
  titleEl.querySelector('h2').textContent = 'Dashboard';
  titleEl.querySelector('.topbar-sub').textContent = 'Resumen de tu situación financiera actual';

  const income = Storage.getAll('income');
  const expenses = Storage.getAll('expenses');
  const debts = Storage.getAll('debts');
  const summary = buildSummary({ income, expenses, debts });
  const alerts = evaluateRules(summary);
  const insights = generateInsights({ expenses, summary });

  const hasAnyData = income.length || expenses.length || debts.length;

  if (!hasAnyData) {
    outlet.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'empty-state' }, [
        h('p', {}, 'Aún no registras ingresos, gastos ni deudas.'),
        h('p', { class: 'mt-16' }, [
          h('a', { href: '#/income', class: 'btn btn-primary' }, 'Registrar mi primer ingreso')
        ])
      ])
    ]));
    return;
  }

  outlet.appendChild(kpiGrid(summary));

  const grid2 = h('div', { class: 'grid-2' });
  const chartCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Proyección de ahorro acumulado (6 meses)'),
    h('div', { class: 'chart-wrap' }, [h('canvas', { id: 'dashProjectionChart' })])
  ]);
  const alertsCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Alertas y recomendaciones'),
    h('div', { class: 'stack' }, alerts.map(a =>
      h('div', { class: `alert ${a.level}` }, a.message)
    ))
  ]);
  grid2.appendChild(chartCard);
  grid2.appendChild(alertsCard);
  outlet.appendChild(grid2);

  const grid2b = h('div', { class: 'grid-2 mt-16' });
  const catBreakdown = groupByCategory(expenses);
  const catCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Gastos por categoría'),
    catBreakdown.length
      ? h('div', { class: 'chart-wrap' }, [h('canvas', { id: 'dashCategoryChart' })])
      : h('div', { class: 'empty-state' }, 'Sin gastos registrados todavía.')
  ]);
  const insightsCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Lo que dicen tus datos'),
    h('div', { class: 'stack' }, insights.map(msg => h('div', { class: 'alert' }, msg)))
  ]);
  grid2b.appendChild(catCard);
  grid2b.appendChild(insightsCard);
  outlet.appendChild(grid2b);

  // Charts se pintan después de insertar los canvas en el DOM
  const projection = generateProjection(summary, 6);
  renderLineChart('dashProjectionChart', {
    labels: projection.map(p => monthLabel(p.month)),
    series: [{ label: 'Ahorro acumulado', data: projection.map(p => p.cumulativeSavings), color: '#205E5A' }]
  });

  if (catBreakdown.length) {
    renderDoughnutChart('dashCategoryChart', {
      labels: catBreakdown.map(c => c.category),
      data: catBreakdown.map(c => c.total)
    });
  }
}

function kpiGrid(summary) {
  return h('div', { class: 'kpi-grid' }, [
    kpiCard('Ingresos mensuales', formatCurrency(summary.totalIncome)),
    kpiCard('Gastos mensuales', formatCurrency(summary.totalExpenses)),
    kpiCard('Cuotas de deuda', formatCurrency(summary.totalDebtPayments)),
    kpiCard('Disponible', formatCurrency(summary.available), summary.available >= 0 ? 'positive' : 'negative'),
    kpiCard('Capacidad de ahorro', formatPercent(summary.savingsRate), summary.savingsRate >= 10 ? 'positive' : 'negative'),
    kpiCard('% en deuda', formatPercent(summary.debtRatio), summary.debtRatio <= 30 ? 'positive' : 'negative')
  ]);
}

function kpiCard(label, value, tone) {
  return h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, label),
    h('div', { class: `kpi-value ${tone || ''}` }, value)
  ]);
}
