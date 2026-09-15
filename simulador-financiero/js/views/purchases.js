import { Storage } from '../storage.js';
import { h, formatCurrency, showToast } from '../utils.js';
import { buildSummary, simulatePurchase } from '../calculations.js';
import { textField, readForm } from './shared.js';

export function renderPurchases(outlet) {
  const summary = buildSummary({
    income: Storage.getAll('income'), expenses: Storage.getAll('expenses'), debts: Storage.getAll('debts')
  });

  const formCard = h('div', { class: 'card' }, [
    h('h3', {}, 'Simular una compra grande'),
    h('p', { class: 'text-soft mt-16' }, `Tu disponible mensual actual es ${formatCurrency(summary.available)}. Esta simulación no registra la compra, solo muestra su impacto.`)
  ]);
  formCard.appendChild(h('div', { class: 'form-row mt-16' }, [
    textField({ id: 'p-product', label: 'Producto', value: '', required: true }),
    textField({ id: 'p-price', label: 'Precio (S/)', type: 'number', min: '0', required: true }),
    textField({ id: 'p-months', label: 'Plazo de financiamiento (meses)', type: 'number', min: '1', value: '12' }),
    textField({ id: 'p-rate', label: 'Tasa de interés anual del financiamiento (%)', type: 'number', min: '0', value: '25' })
  ]));
  const errorBox = h('div', { class: 'field-error hidden' });
  formCard.appendChild(errorBox);
  formCard.appendChild(h('div', { class: 'row mt-16' }, [
    h('button', { class: 'btn btn-primary', onClick: run }, 'Comparar opciones')
  ]));

  const resultWrap = h('div', { class: 'mt-16' });
  outlet.appendChild(formCard);
  outlet.appendChild(resultWrap);

  function run() {
    const { values, errors } = readForm(['p-product', 'p-price']);
    if (errors.length || Number(values['p-price']) <= 0) {
      errorBox.textContent = 'Ingresa un producto y un precio mayor a 0.';
      errorBox.classList.remove('hidden');
      return;
    }
    errorBox.classList.add('hidden');
    const months = Number(document.getElementById('p-months').value) || 12;
    const rate = Number(document.getElementById('p-rate').value) || 0;
    const price = Number(values['p-price']);

    const result = simulatePurchase({
      price,
      currentAvailable: summary.available,
      financing: { months, annualInterestRate: rate }
    });

    renderResult(values['p-product'], price, result);
    showToast('Simulación calculada', 'success');
  }

  function renderResult(product, price, result) {
    resultWrap.innerHTML = '';

    const options = [
      {
        title: 'Al contado',
        lines: [
          ['Impacto en tu disponible del mes', formatCurrency(result.contado.impactOnAvailable), result.contado.impactOnAvailable >= 0],
          ['Costo total', formatCurrency(price), true]
        ]
      },
      {
        title: 'Ahorro previo',
        lines: [
          ['Meses necesarios para juntar el monto', result.savePrevious.monthsToSave === Infinity ? 'No es posible con tu disponible actual' : `${result.savePrevious.monthsToSave} meses`, result.savePrevious.monthsToSave !== Infinity],
          ['Costo total', formatCurrency(price), true]
        ]
      },
      {
        title: `Financiado (${document.getElementById('p-months').value} meses)`,
        lines: result.financed ? [
          ['Cuota mensual', formatCurrency(result.financed.monthlyQuota), true],
          ['Interés total pagado', formatCurrency(result.financed.totalInterest), false],
          ['Costo total', formatCurrency(result.financed.totalCost), false],
          ['Impacto en tu disponible del mes', formatCurrency(result.financed.impactOnAvailable), result.financed.impactOnAvailable >= 0]
        ] : []
      }
    ];

    // Determina cuál opción tiene menor costo total para destacarla
    const totalCosts = [
      { key: 'contado', total: price },
      { key: 'ahorro', total: price },
      { key: 'financiado', total: result.financed ? result.financed.totalCost : Infinity }
    ];
    const cheapest = totalCosts.reduce((a, b) => (b.total < a.total ? b : a));

    resultWrap.appendChild(h('div', { class: 'section-label' }, `Impacto de comprar "${product}" por ${formatCurrency(price)}`));
    resultWrap.appendChild(h('div', { class: 'grid-3' }, options.map((opt, i) => {
      const isBest = (i === 0 && cheapest.key === 'contado') || (i === 1 && cheapest.key === 'ahorro') || (i === 2 && cheapest.key === 'financiado');
      return h('div', { class: `card option-card ${isBest ? 'is-best' : ''}` }, [
        h('div', { class: 'spread' }, [
          h('h4', {}, opt.title),
          isBest ? h('span', { class: 'tag positive' }, 'Menor costo') : null
        ]),
        h('div', { class: 'stack mt-16' }, opt.lines.map(([label, value, good]) =>
          h('div', { class: 'spread' }, [
            h('span', { class: 'text-soft' }, label),
            h('span', { class: `mono ${good ? '' : 'diff-down'}` }, value)
          ])
        ))
      ]);
    })));

    resultWrap.appendChild(h('p', { class: 'text-faint mt-16' },
      'Comparación basada en tus datos registrados. El financiamiento asume cuota fija (sistema francés) sobre la tasa anual indicada.'));
  }
}
