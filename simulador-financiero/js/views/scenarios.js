import { Storage } from '../storage.js';
import { h, formatCurrency, formatPercent, showToast } from '../utils.js';
import { loadConfig } from '../config.js';
import { SCENARIO_TYPES, SCENARIO_LABELS, compareScenario } from '../scenarios.js';
import { selectField, textField, readForm } from './shared.js';

export async function renderScenarios(outlet) {
  const config = await loadConfig();
  const debts = Storage.getAll('debts');

  const formCard = h('div', { class: 'card' }, [
    h('h3', {}, 'Crear un escenario hipotético'),
    h('p', { class: 'text-soft mt-16' }, 'Nada de esto modifica tus datos reales: es una simulación aislada para comparar "qué pasaría si...".')
  ]);
  const typeSelect = selectField({
    id: 'sc-type', label: 'Tipo de escenario',
    options: Object.values(SCENARIO_TYPES).map(t => ({ id: t, label: SCENARIO_LABELS[t] })),
    value: SCENARIO_TYPES.INCOME_INCREASE
  });
  const dynamicFields = h('div', { class: 'form-row mt-16' });
  const nameField = textField({ id: 'sc-name', label: 'Nombre del escenario', value: '' });
  const errorBox = h('div', { class: 'field-error hidden' });
  const resultWrap = h('div', { class: 'mt-16' });

  formCard.appendChild(h('div', { class: 'form-row mt-16' }, [typeSelect, nameField]));
  formCard.appendChild(dynamicFields);
  formCard.appendChild(errorBox);
  formCard.appendChild(h('div', { class: 'row mt-16' }, [
    h('button', { class: 'btn btn-primary', onClick: runScenario }, 'Simular escenario')
  ]));

  outlet.appendChild(formCard);
  outlet.appendChild(resultWrap);

  typeSelect.querySelector('select').addEventListener('change', renderDynamicFields);
  renderDynamicFields();

  function renderDynamicFields() {
    const type = document.getElementById('sc-type').value;
    dynamicFields.innerHTML = '';
    const fields = [];

    if (type === SCENARIO_TYPES.INCOME_INCREASE) {
      fields.push(textField({ id: 'sc-amount', label: 'Aumento mensual (S/)', type: 'number', min: '0', required: true }));
    } else if (type === SCENARIO_TYPES.EXPENSE_REDUCTION) {
      fields.push(textField({ id: 'sc-amount', label: 'Reducción mensual (S/)', type: 'number', min: '0', required: true }));
      fields.push(selectField({ id: 'sc-category', label: 'Categoría (opcional)', options: config.expenseCategories, value: '' }));
    } else if (type === SCENARIO_TYPES.NEW_DEBT) {
      fields.push(textField({ id: 'sc-amount', label: 'Monto de la deuda (S/)', type: 'number', min: '0', required: true }));
      fields.push(textField({ id: 'sc-monthlyPayment', label: 'Cuota mensual estimada (S/)', type: 'number', min: '0', required: true }));
      fields.push(textField({ id: 'sc-interestRate', label: 'Tasa de interés anual (%)', type: 'number', min: '0', value: '0' }));
    } else if (type === SCENARIO_TYPES.DEBT_PAYMENT_INCREASE) {
      fields.push(selectField({ id: 'sc-debtId', label: 'Deuda a modificar', options: debts.map(d => ({ id: d.id, label: d.name })), required: true }));
      fields.push(textField({ id: 'sc-amount', label: 'Aumento en la cuota (S/)', type: 'number', min: '0', required: true }));
    } else if (type === SCENARIO_TYPES.EXTRA_SAVINGS) {
      fields.push(textField({ id: 'sc-amount', label: 'Ahorro adicional mensual (S/)', type: 'number', min: '0', required: true }));
    }

    fields.forEach(f => dynamicFields.appendChild(f));
  }

  function runScenario() {
    const type = document.getElementById('sc-type').value;
    const requiredIds = ['sc-amount'];
    if (type === SCENARIO_TYPES.NEW_DEBT) requiredIds.push('sc-monthlyPayment');
    if (type === SCENARIO_TYPES.DEBT_PAYMENT_INCREASE) requiredIds.push('sc-debtId');

    const { values, errors } = readForm(requiredIds);
    if (errors.length || Number(values['sc-amount']) <= 0) {
      errorBox.textContent = 'Completa los campos requeridos con valores mayores a 0.';
      errorBox.classList.remove('hidden');
      return;
    }
    errorBox.classList.add('hidden');

    const nameEl = document.getElementById('sc-name');
    const catEl = document.getElementById('sc-category');
    const rateEl = document.getElementById('sc-interestRate');

    const scenario = {
      type,
      name: nameEl?.value || SCENARIO_LABELS[type],
      params: {
        amount: Number(values['sc-amount']),
        category: catEl ? catEl.value : undefined,
        monthlyPayment: values['sc-monthlyPayment'] ? Number(values['sc-monthlyPayment']) : undefined,
        interestRate: rateEl ? Number(rateEl.value) : undefined,
        debtId: values['sc-debtId']
      }
    };

    const baseState = { income: Storage.getAll('income'), expenses: Storage.getAll('expenses'), debts: Storage.getAll('debts') };
    const result = compareScenario(baseState, scenario);
    renderResult(scenario, result);
    Storage.insert('scenarios', scenario);
    showToast('Escenario simulado', 'success');
  }

  function renderResult(scenario, result) {
    resultWrap.innerHTML = '';
    resultWrap.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'section-head' }, [h('h3', {}, `Resultado: ${scenario.name}`), h('span', { class: 'tag' }, SCENARIO_LABELS[scenario.type])]),
      h('div', { class: 'compare-cols' }, [
        compareColumn('Situación actual', result.baseSummary),
        compareColumn('Con el escenario', result.scenarioSummary)
      ]),
      h('div', { class: 'form-panel stack' }, [
        diffLine('Cambio en disponible mensual', result.diff.available, true),
        diffLine('Cambio en capacidad de ahorro', result.diff.savingsRate, false, '%'),
        diffLine('Cambio en % de gastos sobre ingresos', result.diff.expenseRatio, false, '%', true),
        diffLine('Cambio en % de deuda sobre ingresos', result.diff.debtRatio, false, '%', true)
      ])
    ]));
  }

  function compareColumn(title, summary) {
    return h('div', { class: 'compare-col' }, [
      h('h4', {}, title),
      h('div', { class: 'stack' }, [
        statLine('Disponible', formatCurrency(summary.available)),
        statLine('Ahorro', formatPercent(summary.savingsRate)),
        statLine('% gastos/ingresos', formatPercent(summary.expenseRatio)),
        statLine('% deuda/ingresos', formatPercent(summary.debtRatio))
      ])
    ]);
  }

  function statLine(label, value) {
    return h('div', { class: 'spread' }, [h('span', { class: 'text-soft' }, label), h('span', { class: 'mono' }, value)]);
  }

  // lowerIsBetter: para ratios de gasto/deuda, una baja es mejor (verde)
  function diffLine(label, value, isCurrency, suffix = '', lowerIsBetter = false) {
    const good = lowerIsBetter ? value <= 0 : value >= 0;
    const formatted = (isCurrency ? formatCurrency(Math.abs(value)) : `${Math.abs(value).toFixed(1)}${suffix}`);
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return h('div', { class: 'spread' }, [
      h('span', { class: 'text-soft' }, label),
      h('span', { class: `mono ${good ? 'diff-up' : 'diff-down'}` }, `${sign}${formatted}`)
    ]);
  }
}
