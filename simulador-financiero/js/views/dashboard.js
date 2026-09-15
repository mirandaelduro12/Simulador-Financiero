import { Storage } from '../storage.js';
import { h, formatCurrency, formatPercent, monthLabel, clamp } from '../utils.js';
import { buildSummary, evaluateRules, generateProjection, groupByCategory, RULES } from '../calculations.js';
import { generateInsights } from '../analytics.js';
import { renderLineChart, renderDoughnutChart, themeColor } from '../charts.js';
import { loadConfig } from '../config.js';

const FALLBACK_COLORS = ['#205E5A', '#C97B3D', '#3A6EA5', '#B23A48', '#6C4F94', '#B8862E', '#1F7A5C', '#4A5568'];

export async function renderDashboard(outlet, titleEl) {
  titleEl.querySelector('h2').textContent = 'Dashboard';
  titleEl.querySelector('.topbar-sub').textContent = 'Resumen de tu situación financiera actual';

  const config = await loadConfig();
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
        h('strong', {}, 'Tu libro de cuentas está en blanco'),
        h('p', {}, 'Aún no registras ingresos, gastos ni deudas.'),
        h('div', { class: 'row mt-16' }, [
          h('a', { href: '#/income', class: 'btn btn-primary' }, 'Registrar mi primer ingreso'),
          h('a', { href: '#/settings', class: 'btn' }, 'Cargar datos de ejemplo')
        ])
      ])
    ]));
    return;
  }

  outlet.appendChild(h('div', { class: 'hero-grid' }, [heroCard(summary), healthCard(summary)]));

  const alertsCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, [
      h('span', {}, 'Alertas y recomendaciones'),
      h('span', { class: 'tag' }, String(alerts.filter(a => a.level !== 'positive').length))
    ]),
    h('div', { class: 'stack' }, alerts.map(a => h('div', { class: `alert ${a.level}` }, a.message)))
  ]);
  const chartCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, [
      h('span', {}, 'Proyección de ahorro acumulado'),
      h('span', { class: 'card-sub' }, 'próximos 6 meses')
    ]),
    h('div', { class: 'chart-wrap' }, [h('canvas', { id: 'dashProjectionChart' })])
  ]);
  outlet.appendChild(h('div', { class: 'grid-2' }, [chartCard, alertsCard]));

  const catBreakdown = groupByCategory(expenses).map((c, i) => {
    const cat = config.expenseCategories.find(x => x.id === c.category);
    return { ...c, label: cat?.label || c.category, color: cat?.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length] };
  });

  const insightsCard = h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, 'Lo que dicen tus datos'),
    h('div', { class: 'stack' }, insights.map(msg => h('div', { class: 'alert' }, msg)))
  ]);
  outlet.appendChild(h('div', { class: 'grid-2 mt-16' }, [categoryCard(catBreakdown), insightsCard]));

  // Charts se pintan después de insertar los canvas en el DOM
  const projection = generateProjection(summary, 6);
  const endsPositive = (projection.at(-1)?.cumulativeSavings ?? 0) >= 0;
  renderLineChart('dashProjectionChart', {
    labels: projection.map(p => monthLabel(p.month)),
    series: [{
      label: 'Ahorro acumulado',
      data: projection.map(p => p.cumulativeSavings),
      color: themeColor(endsPositive ? '--primary' : '--negative')
    }]
  });

  if (catBreakdown.length) {
    renderDoughnutChart('dashCategoryChart', {
      labels: catBreakdown.map(c => c.label),
      data: catBreakdown.map(c => c.total),
      colors: catBreakdown.map(c => c.color)
    });
  }
}

// ---------- Tarjeta héroe: disponible + flujo del mes ----------

function heroCard(summary) {
  const { totalIncome, totalExpenses, totalDebtPayments, available } = summary;
  const outflows = totalExpenses + totalDebtPayments;
  const base = Math.max(totalIncome, outflows) || 1;
  const pct = v => `${(v / base) * 100}%`;
  const deficit = available < 0;

  const segments = [
    ['expenses', totalExpenses],
    ['debts', totalDebtPayments],
    ['available', deficit ? 0 : available]
  ].filter(([, v]) => v > 0)
    .map(([kind, v]) => h('div', { class: `flow-seg ${kind}`, style: `flex-basis:${pct(v)}` }));

  const track = h('div', { class: 'flow-track' }, [h('div', { class: 'flow-bar' }, segments)]);
  if (deficit && totalIncome > 0) {
    track.appendChild(h('div', { class: 'flow-over', style: `left:${pct(totalIncome)}`, title: 'Lo que excede tus ingresos' }));
    track.appendChild(h('div', { class: 'flow-mark', style: `left:${pct(totalIncome)}` }));
  }

  const amountText = formatCurrency(Math.abs(available)).replace('S/', '').trim();

  return h('div', { class: 'hero-card' }, [
    h('div', { class: 'eyebrow' }, deficit ? 'Déficit este mes' : 'Disponible este mes'),
    h('div', { class: `hero-amount ${deficit ? 'negative' : 'positive'}` }, [
      h('span', { class: 'currency' }, 'S/'),
      `${deficit ? '−' : ''}${amountText}`
    ]),
    h('p', { class: 'hero-caption' }, [
      'Ingresas ', h('b', {}, formatCurrency(totalIncome)), ' al mes. ',
      h('b', {}, formatCurrency(totalExpenses)), ' se van en gastos y ',
      h('b', {}, formatCurrency(totalDebtPayments)), ' en cuotas de deuda.'
    ]),
    h('div', { class: 'flow' }, [
      track,
      h('div', { class: 'flow-legend' }, [
        legendItem('Ingresos', formatCurrency(totalIncome), 'var(--rail-ink)'),
        legendItem('Gastos', formatCurrency(totalExpenses), 'oklch(76% 0.1 58)'),
        legendItem('Cuotas de deuda', formatCurrency(totalDebtPayments), 'oklch(70% 0.07 250)'),
        deficit
          ? legendItem('Exceso', formatCurrency(-available), 'oklch(70% 0.14 25)')
          : legendItem('Disponible', formatCurrency(available), 'var(--rail-accent)')
      ])
    ])
  ]);
}

function legendItem(label, value, color) {
  const key = h('span', { class: 'key' }, label);
  key.style.setProperty('--c', color);
  return h('div', {}, [key, h('span', { class: 'val' }, value)]);
}

// ---------- Salud financiera: ratios contra umbrales ----------

function healthCard(summary) {
  return h('div', { class: 'card meter-card' }, [
    h('div', { class: 'card-title' }, [
      h('span', {}, 'Salud financiera'),
      h('span', { class: 'card-sub' }, 'vs. rangos recomendados')
    ]),
    meter({
      label: 'Capacidad de ahorro', value: summary.savingsRate, mark: RULES.savingsRateWarning,
      good: summary.savingsRate >= RULES.savingsRateWarning, note: `Meta: ${RULES.savingsRateWarning}% o más`
    }),
    meter({
      label: 'Gastos sobre ingresos', value: summary.expenseRatio, mark: RULES.expenseRatioAlert,
      good: summary.expenseRatio <= RULES.expenseRatioAlert, note: `Límite: ${RULES.expenseRatioAlert}%`
    }),
    meter({
      label: '% en deuda', value: summary.debtRatio, mark: RULES.debtRatioAlert,
      good: summary.debtRatio <= RULES.debtRatioAlert, note: `Límite: ${RULES.debtRatioAlert}%`
    })
  ]);
}

function meter({ label, value, mark, good, note }) {
  const tone = good ? 'positive' : 'negative';
  return h('div', { class: 'meter' }, [
    h('div', { class: 'meter-head' }, [
      h('span', { class: 'meter-label' }, label),
      h('span', { class: `meter-value ${tone}` }, formatPercent(value))
    ]),
    h('div', { class: 'meter-track' }, [
      h('div', { class: `meter-fill ${tone}`, style: `width:${clamp(value, 0, 100)}%` }),
      h('div', { class: 'meter-mark', style: `left:${mark}%`, title: note })
    ]),
    h('div', { class: 'meter-foot' }, [h('span', {}, note), h('span', {}, good ? 'Saludable' : 'Fuera de rango')])
  ]);
}

// ---------- Gastos por categoría: dona + leyenda ----------

function categoryCard(breakdown) {
  const total = breakdown.reduce((acc, c) => acc + c.total, 0);
  return h('div', { class: 'card' }, [
    h('div', { class: 'card-title' }, [
      h('span', {}, 'Gastos por categoría'),
      h('span', { class: 'card-sub' }, 'equivalente mensual')
    ]),
    breakdown.length
      ? h('div', { class: 'donut-layout' }, [
        h('div', { class: 'donut-wrap' }, [
          h('canvas', { id: 'dashCategoryChart' }),
          h('div', { class: 'donut-center' }, [h('strong', {}, formatCurrency(total)), h('span', {}, 'al mes')])
        ]),
        h('ul', { class: 'legend-list' }, breakdown.slice(0, 7).map(c => {
          const li = h('li', {}, [
            h('span', { class: 'dot' }),
            h('span', { class: 'name' }, c.label),
            h('span', { class: 'amt' }, formatCurrency(c.total)),
            h('span', { class: 'pct' }, total ? formatPercent((c.total / total) * 100) : '—')
          ]);
          li.style.setProperty('--c', c.color);
          return li;
        }))
      ])
      : h('div', { class: 'empty-state' }, [h('p', {}, 'Sin gastos registrados todavía.')])
  ]);
}
