import { h, clear } from '../utils.js';
import { icon } from '../icons.js';

// Tabla genérica con acciones editar/eliminar. `columns` = [{ key, label, render?, numeric?, muted? }]
export function buildTable({ records, columns, onEdit, onDelete, emptyMessage }) {
  if (!records.length) {
    return h('div', { class: 'empty-state' }, [h('p', {}, emptyMessage || 'Todavía no hay registros.')]);
  }

  const thead = h('thead', {}, [
    h('tr', {}, [
      ...columns.map(c => h('th', { class: c.numeric ? 'num' : '' }, c.label)),
      h('th', { 'aria-label': 'Acciones' }, '')
    ])
  ]);

  const tbody = h('tbody', {}, records.map(record => {
    const cells = columns.map(c => {
      const cls = [c.numeric ? 'num' : '', c.muted ? 'muted' : ''].filter(Boolean).join(' ');
      return h('td', { class: cls }, c.render ? c.render(record) : String(record[c.key] ?? ''));
    });
    const actions = h('td', {}, [actionButtons({ onEdit: () => onEdit(record), onDelete: () => onDelete(record) })]);
    return h('tr', {}, [...cells, actions]);
  }));

  return h('div', { class: 'table-scroll' }, [h('table', {}, [thead, tbody])]);
}

export function actionButtons({ onEdit, onDelete }) {
  return h('div', { class: 'table-actions' }, [
    h('button', { class: 'btn btn-sm btn-icon btn-ghost', type: 'button', onClick: onEdit, title: 'Editar', 'aria-label': 'Editar', html: icon('edit', 15) }),
    h('button', { class: 'btn btn-sm btn-icon btn-ghost btn-danger', type: 'button', onClick: onDelete, title: 'Eliminar', 'aria-label': 'Eliminar', html: icon('trash', 15) })
  ]);
}

// Botón primario con icono "+"
export function addButton(label, onClick) {
  return h('button', { class: 'btn btn-primary', type: 'button', onClick }, [
    h('span', { html: icon('plus', 16) }),
    label
  ]);
}

// Chip de categoría con punto de color
export function categoryChip(label, color) {
  const chip = h('span', { class: 'chip' }, label);
  if (color) chip.style.setProperty('--c', color);
  return chip;
}

// Celda con valor principal y una línea secundaria opcional
export function stackedCell(main, sub) {
  return h('span', {}, [
    h('span', { class: 'cell-main' }, main),
    sub ? h('span', { class: 'cell-sub' }, sub) : null
  ]);
}

// Título del panel de formulario y foco en el primer campo
export function formHead(title) {
  return h('div', { class: 'form-panel-head' }, title);
}

export function focusForm(container) {
  const first = container.querySelector('input, select');
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (first) first.focus({ preventScroll: true });
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
