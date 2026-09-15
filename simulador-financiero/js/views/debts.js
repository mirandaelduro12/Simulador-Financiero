import { Storage } from '../storage.js';
import { h, formatCurrency, formatDate, showToast } from '../utils.js';
import { projectDebtPayoff } from '../calculations.js';
import { buildTable, textField, readForm } from './shared.js';

export function renderDebts(outlet) {
  let editingId = null;

  const tableWrap = h('div', {});
  const detailWrap = h('div', { class: 'mt-16' });
  const formWrap = h('div', { class: 'form-panel' });

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'section-head' }, [
      h('h3', {}, 'Deudas registradas'),
      h('button', { class: 'btn btn-primary', onClick: () => { editingId = null; renderForm(); } }, '+ Nueva deuda')
    ]),
    tableWrap,
    formWrap
  ]);
  outlet.appendChild(card);
  outlet.appendChild(detailWrap);

  function renderTable() {
    const records = Storage.getAll('debts');
    clear(tableWrap);
    tableWrap.appendChild(buildTable({
      records,
      columns: [
        { key: 'name', label: 'Deuda' },
        { key: 'remainingBalance', label: 'Saldo pendiente', numeric: true, render: r => formatCurrency(r.remainingBalance) },
        { key: 'interestRate', label: 'Tasa anual', numeric: true, render: r => `${r.interestRate}%` },
        { key: 'monthlyPayment', label: 'Cuota mensual', numeric: true, render: r => formatCurrency(r.monthlyPayment) },
        {
          key: 'payoff', label: 'Tiempo restante', render: r => {
            const p = projectDebtPayoff(r);
            return p.feasible ? `${p.months} meses` : 'No se cubre con la cuota actual';
          }
        }
      ],
      onEdit: (r) => { editingId = r.id; renderForm(r); },
      onDelete: (r) => { Storage.remove('debts', r.id); showToast('Deuda eliminada', 'success'); renderTable(); renderDetail(); },
      emptyMessage: 'No tienes deudas registradas.'
    }));
    renderDetail();
  }

  function renderDetail() {
    const records = Storage.getAll('debts');
    clear(detailWrap);
    if (!records.length) return;

    const cards = records.map(debt => {
      const p = projectDebtPayoff(debt);
      return h('div', { class: 'card' }, [
        h('div', { class: 'card-title' }, debt.name),
        p.feasible ? h('div', { class: 'stack' }, [
          statLine('Meses restantes', `${p.months}`),
          statLine('Interés total a pagar', formatCurrency(p.totalInterest)),
          statLine('Costo total de la deuda', formatCurrency(p.totalCost))
        ]) : h('div', { class: 'alert negative' }, 'La cuota mensual no cubre ni el interés generado: esta deuda nunca se terminaría de pagar con las condiciones actuales.')
      ]);
    });
    detailWrap.appendChild(h('div', { class: 'card-title mt-16' }, 'Proyección de cada deuda'));
    detailWrap.appendChild(h('div', { class: 'grid-3' }, cards));
  }

  function statLine(label, value) {
    return h('div', { class: 'spread' }, [h('span', { class: 'text-soft' }, label), h('span', { class: 'mono' }, value)]);
  }

  function renderForm(existing) {
    clear(formWrap);
    formWrap.appendChild(h('div', { class: 'form-row' }, [
      textField({ id: 'debt-name', label: 'Nombre de la deuda', value: existing?.name || '', required: true }),
      textField({ id: 'debt-initial', label: 'Monto inicial (S/)', type: 'number', step: '0.01', min: '0', value: existing?.initialAmount ?? '' }),
      textField({ id: 'debt-balance', label: 'Saldo pendiente (S/)', type: 'number', step: '0.01', min: '0', value: existing?.remainingBalance ?? '', required: true }),
      textField({ id: 'debt-rate', label: 'Tasa de interés anual (%)', type: 'number', step: '0.01', min: '0', value: existing?.interestRate ?? '0' }),
      textField({ id: 'debt-payment', label: 'Cuota mensual (S/)', type: 'number', step: '0.01', min: '0', value: existing?.monthlyPayment ?? '', required: true }),
      textField({ id: 'debt-start', label: 'Fecha de inicio', type: 'date', value: existing?.startDate || new Date().toISOString().slice(0, 10) })
    ]));
    const errorBox = h('div', { class: 'field-error hidden' });
    formWrap.appendChild(errorBox);
    formWrap.appendChild(h('div', { class: 'row' }, [
      h('button', { class: 'btn btn-primary', onClick: () => handleSave(errorBox) }, existing ? 'Guardar cambios' : 'Agregar deuda'),
      h('button', { class: 'btn', onClick: () => clear(formWrap) }, 'Cancelar')
    ]));
  }

  function handleSave(errorBox) {
    const { values, errors } = readForm(['debt-name', 'debt-balance', 'debt-payment']);
    if (errors.length || Number(values['debt-balance']) <= 0 || Number(values['debt-payment']) <= 0) {
      errorBox.textContent = 'Nombre, saldo pendiente y cuota mensual son obligatorios y deben ser mayores a 0.';
      errorBox.classList.remove('hidden');
      return;
    }
    const extra = readForm(['debt-initial', 'debt-rate', 'debt-start']).values;
    const record = {
      name: values['debt-name'],
      remainingBalance: Number(values['debt-balance']),
      monthlyPayment: Number(values['debt-payment']),
      initialAmount: Number(extra['debt-initial']) || Number(values['debt-balance']),
      interestRate: Number(extra['debt-rate']) || 0,
      startDate: extra['debt-start'] || new Date().toISOString().slice(0, 10)
    };
    if (editingId) Storage.update('debts', editingId, record);
    else Storage.insert('debts', record);

    showToast('Deuda guardada', 'success');
    editingId = null;
    clear(formWrap);
    renderTable();
  }

  renderTable();
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
