import { h, clear } from '../utils.js';

// Tabla genérica con acciones editar/eliminar. `columns` = [{ key, label, render? }]
export function buildTable({ records, columns, onEdit, onDelete, emptyMessage }) {
  if (!records.length) {
    return h('div', { class: 'empty-state' }, emptyMessage || 'Todavía no hay registros.');
  }

  const thead = h('thead', {}, [
    h('tr', {}, [
      ...columns.map(c => h('th', { class: c.numeric ? 'num' : '' }, c.label)),
      h('th', {}, '')
    ])
  ]);

  const tbody = h('tbody', {}, records.map(record => {
    const cells = columns.map(c =>
      h('td', { class: c.numeric ? 'num' : '' }, c.render ? c.render(record) : String(record[c.key] ?? ''))
    );
    const actions = h('td', {}, [
      h('div', { class: 'table-actions' }, [
        h('button', { class: 'btn btn-sm btn-icon', onClick: () => onEdit(record), title: 'Editar' }, '✎'),
        h('button', { class: 'btn btn-sm btn-icon btn-danger', onClick: () => onDelete(record), title: 'Eliminar' }, '✕')
      ])
    ]);
    return h('tr', {}, [...cells, actions]);
  }));

  return h('table', {}, [thead, tbody]);
}

// Construye un <select> a partir de una lista {id,label}
export function selectField({ id, label, options, value, required }) {
  const select = h('select', { id, required: required || null }, [
    h('option', { value: '' }, 'Selecciona...'),
    ...options.map(opt => {
      const o = h('option', { value: opt.id }, opt.label);
      if (opt.id === value) o.setAttribute('selected', 'selected');
      return o;
    })
  ]);
  return h('div', {}, [h('label', { for: id }, label), select]);
}

export function textField({ id, label, type = 'text', value = '', required, step, min }) {
  return h('div', {}, [
    h('label', { for: id }, label),
    h('input', { id, type, value, required: required || null, step: step || null, min: min ?? null })
  ]);
}

export function readForm(fieldIds) {
  const values = {};
  const errors = [];
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    values[id] = el.value;
    if (el.hasAttribute('required') && !el.value) errors.push(id);
  });
  return { values, errors };
}

export function clearAndRender(container, node) {
  clear(container);
  container.appendChild(node);
}
