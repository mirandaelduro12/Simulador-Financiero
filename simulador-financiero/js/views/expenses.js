import { Storage } from '../storage.js';
import { h, formatCurrency, formatDate, showToast } from '../utils.js';
import { loadConfig } from '../config.js';
import { toMonthlyAmount } from '../calculations.js';
import { buildTable, selectField, textField, readForm } from './shared.js';

export async function renderExpenses(outlet) {
  const config = await loadConfig();
  let editingId = null;
  let categoryFilter = '';

  const tableWrap = h('div', {});
  const formWrap = h('div', { class: 'form-panel' });

  const filterSelect = selectField({
    id: 'exp-filter', label: '', options: config.expenseCategories, value: ''
  });
  filterSelect.querySelector('label').remove();
  filterSelect.querySelector('select').addEventListener('change', (e) => {
    categoryFilter = e.target.value;
    renderTable();
  });

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'section-head' }, [
      h('h3', {}, 'Gastos registrados'),
      h('div', { class: 'row' }, [
        filterSelect,
        h('button', { class: 'btn btn-primary', onClick: () => { editingId = null; renderForm(); } }, '+ Nuevo gasto')
      ])
    ]),
    tableWrap,
    formWrap
  ]);
  outlet.appendChild(card);

  function renderTable() {
    let records = Storage.getAll('expenses').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (categoryFilter) records = records.filter(r => r.category === categoryFilter);

    clear(tableWrap);
    tableWrap.appendChild(buildTable({
      records,
      columns: [
        { key: 'description', label: 'Descripción' },
        { key: 'category', label: 'Categoría', render: r => labelFor(config.expenseCategories, r.category) },
        { key: 'frequency', label: 'Frecuencia', render: r => labelFor(config.frequencies, r.frequency) },
        { key: 'date', label: 'Fecha', render: r => formatDate(r.date) },
        { key: 'amount', label: 'Monto', numeric: true, render: r => `${formatCurrency(r.amount)}${r.frequency !== 'mensual' ? ` (${formatCurrency(toMonthlyAmount(r.amount, r.frequency))}/mes)` : ''}` }
      ],
      onEdit: (r) => { editingId = r.id; renderForm(r); },
      onDelete: (r) => { Storage.remove('expenses', r.id); showToast('Gasto eliminado', 'success'); renderTable(); },
      emptyMessage: 'Aún no registras gastos.'
    }));
  }

  function renderForm(existing) {
    clear(formWrap);
    formWrap.appendChild(h('div', { class: 'form-row' }, [
      textField({ id: 'exp-description', label: 'Descripción', value: existing?.description || '', required: true }),
      selectField({ id: 'exp-category', label: 'Categoría', options: config.expenseCategories, value: existing?.category, required: true }),
      selectField({ id: 'exp-frequency', label: 'Frecuencia', options: config.frequencies, value: existing?.frequency || 'mensual', required: true }),
      textField({ id: 'exp-amount', label: 'Monto (S/)', type: 'number', step: '0.01', min: '0', value: existing?.amount ?? '', required: true }),
      textField({ id: 'exp-date', label: 'Fecha', type: 'date', value: existing?.date || new Date().toISOString().slice(0, 10), required: true })
    ]));
    const errorBox = h('div', { class: 'field-error hidden' });
    formWrap.appendChild(errorBox);
    formWrap.appendChild(h('div', { class: 'row' }, [
      h('button', { class: 'btn btn-primary', onClick: () => handleSave(errorBox) }, existing ? 'Guardar cambios' : 'Agregar gasto'),
      h('button', { class: 'btn', onClick: () => clear(formWrap) }, 'Cancelar')
    ]));
  }

  function handleSave(errorBox) {
    const { values, errors } = readForm(['exp-description', 'exp-category', 'exp-frequency', 'exp-amount', 'exp-date']);
    if (errors.length || Number(values['exp-amount']) <= 0) {
      errorBox.textContent = 'Completa todos los campos con un monto mayor a 0.';
      errorBox.classList.remove('hidden');
      return;
    }
    const record = {
      description: values['exp-description'],
      category: values['exp-category'],
      frequency: values['exp-frequency'],
      amount: Number(values['exp-amount']),
      date: values['exp-date']
    };
    if (editingId) Storage.update('expenses', editingId, record);
    else Storage.insert('expenses', record);

    showToast('Gasto guardado', 'success');
    editingId = null;
    clear(formWrap);
    renderTable();
  }

  renderTable();
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
function labelFor(list, id) { return list.find(o => o.id === id)?.label || id || '—'; }
