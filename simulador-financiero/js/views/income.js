import { Storage } from '../storage.js';
import { h, formatCurrency, formatDate, showToast } from '../utils.js';
import { loadConfig } from '../config.js';
import { buildTable, selectField, textField, readForm, clearAndRender } from './shared.js';

export async function renderIncome(outlet) {
  const config = await loadConfig();
  let editingId = null;

  const tableWrap = h('div', {});
  const formWrap = h('div', { class: 'form-panel' });

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'section-head' }, [
      h('h3', {}, 'Ingresos registrados'),
      h('button', {
        class: 'btn btn-primary', onClick: () => { editingId = null; renderForm(); }
      }, '+ Nuevo ingreso')
    ]),
    tableWrap,
    formWrap
  ]);
  outlet.appendChild(card);

  function renderTable() {
    const records = Storage.getAll('income').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    clearAndRender(tableWrap, buildTable({
      records,
      columns: [
        { key: 'description', label: 'Descripción' },
        { key: 'category', label: 'Categoría', render: r => labelFor(config.incomeCategories, r.category) },
        { key: 'frequency', label: 'Frecuencia', render: r => labelFor(config.frequencies, r.frequency) },
        { key: 'date', label: 'Fecha', render: r => formatDate(r.date) },
        { key: 'amount', label: 'Monto', numeric: true, render: r => formatCurrency(r.amount) }
      ],
      onEdit: (r) => { editingId = r.id; renderForm(r); },
      onDelete: (r) => {
        Storage.remove('income', r.id);
        showToast('Ingreso eliminado', 'success');
        renderTable();
      },
      emptyMessage: 'Aún no registras ingresos. Usa "+ Nuevo ingreso" para empezar.'
    }));
  }

  function renderForm(existing) {
    clear(formWrap);
    formWrap.appendChild(h('div', { class: 'form-row' }, [
      textField({ id: 'inc-description', label: 'Descripción', value: existing?.description || '', required: true }),
      selectField({ id: 'inc-category', label: 'Categoría', options: config.incomeCategories, value: existing?.category, required: true }),
      selectField({ id: 'inc-frequency', label: 'Frecuencia', options: config.frequencies, value: existing?.frequency || 'mensual', required: true }),
      textField({ id: 'inc-amount', label: 'Monto (S/)', type: 'number', step: '0.01', min: '0', value: existing?.amount ?? '', required: true }),
      textField({ id: 'inc-date', label: 'Fecha', type: 'date', value: existing?.date || new Date().toISOString().slice(0, 10), required: true })
    ]));
    const errorBox = h('div', { class: 'field-error hidden' });
    formWrap.appendChild(errorBox);
    formWrap.appendChild(h('div', { class: 'row' }, [
      h('button', { class: 'btn btn-primary', onClick: () => handleSave(errorBox) }, existing ? 'Guardar cambios' : 'Agregar ingreso'),
      h('button', { class: 'btn', onClick: () => clear(formWrap) }, 'Cancelar')
    ]));
  }

  function handleSave(errorBox) {
    const { values, errors } = readForm(['inc-description', 'inc-category', 'inc-frequency', 'inc-amount', 'inc-date']);
    if (errors.length || Number(values['inc-amount']) <= 0) {
      errorBox.textContent = 'Completa todos los campos con un monto mayor a 0.';
      errorBox.classList.remove('hidden');
      return;
    }
    const record = {
      description: values['inc-description'],
      category: values['inc-category'],
      frequency: values['inc-frequency'],
      amount: Number(values['inc-amount']),
      date: values['inc-date']
    };
    if (editingId) Storage.update('income', editingId, record);
    else Storage.insert('income', record);

    showToast('Ingreso guardado', 'success');
    editingId = null;
    clear(formWrap);
    renderTable();
  }

  renderTable();
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
function labelFor(list, id) { return list.find(o => o.id === id)?.label || id || '—'; }
