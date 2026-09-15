import { Storage } from '../storage.js';
import { h, formatCurrency, formatDate, showToast, clamp } from '../utils.js';
import { projectGoal, requiredContribution } from '../calculations.js';
import { textField, readForm } from './shared.js';

export function renderGoals(outlet) {
  let editingId = null;
  const listWrap = h('div', { class: 'grid-3' });
  const formWrap = h('div', { class: 'form-panel' });

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'section-head' }, [
      h('h3', {}, 'Objetivos financieros'),
      h('button', { class: 'btn btn-primary', onClick: () => { editingId = null; renderForm(); } }, '+ Nuevo objetivo')
    ]),
    formWrap
  ]);
  outlet.appendChild(card);
  outlet.appendChild(h('div', { class: 'mt-16' }, [listWrap]));

  function renderList() {
    const goals = Storage.getAll('goals');
    clear(listWrap);
    if (!goals.length) {
      listWrap.appendChild(h('div', { class: 'card' }, [h('div', { class: 'empty-state' }, 'No tienes objetivos creados todavía.')]));
      return;
    }
    goals.forEach(goal => {
      const p = projectGoal(goal);
      const pct = clamp(p.progressPct, 0, 100);
      listWrap.appendChild(h('div', { class: 'card' }, [
        h('div', { class: 'spread' }, [
          h('h4', {}, goal.name),
          h('div', { class: 'table-actions' }, [
            h('button', { class: 'btn btn-sm btn-icon', onClick: () => { editingId = goal.id; renderForm(goal); } }, '✎'),
            h('button', { class: 'btn btn-sm btn-icon btn-danger', onClick: () => { Storage.remove('goals', goal.id); showToast('Objetivo eliminado', 'success'); renderList(); } }, '✕')
          ])
        ]),
        h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
        h('div', { class: 'spread text-faint' }, [
          h('span', {}, `${formatCurrency(goal.currentSaved)} de ${formatCurrency(goal.targetAmount)}`),
          h('span', {}, `${pct.toFixed(0)}%`)
        ]),
        h('div', { class: 'mt-16 stack' }, [
          p.monthsLeft === Infinity
            ? h('div', { class: 'alert warning' }, 'Con un aporte mensual de S/ 0 no se alcanzará esta meta. Define un aporte mensual.')
            : h('div', { class: 'text-soft' }, `A ${formatCurrency(goal.monthlyContribution)}/mes: faltan ${p.monthsLeft} meses (${p.estimatedDate ? formatDate(p.estimatedDate) : '—'}).`)
        ])
      ]));
    });
  }

  function renderForm(existing) {
    clear(formWrap);
    formWrap.appendChild(h('div', { class: 'form-row' }, [
      textField({ id: 'goal-name', label: 'Nombre del objetivo', value: existing?.name || '', required: true }),
      textField({ id: 'goal-target', label: 'Meta (S/)', type: 'number', step: '0.01', min: '0', value: existing?.targetAmount ?? '', required: true }),
      textField({ id: 'goal-current', label: 'Ahorro actual (S/)', type: 'number', step: '0.01', min: '0', value: existing?.currentSaved ?? '0' }),
      textField({ id: 'goal-monthly', label: 'Aporte mensual (S/)', type: 'number', step: '0.01', min: '0', value: existing?.monthlyContribution ?? '' })
    ]));
    const errorBox = h('div', { class: 'field-error hidden' });
    formWrap.appendChild(errorBox);
    formWrap.appendChild(h('div', { class: 'row' }, [
      h('button', { class: 'btn btn-primary', onClick: () => handleSave(errorBox) }, existing ? 'Guardar cambios' : 'Crear objetivo'),
      h('button', { class: 'btn', onClick: () => clear(formWrap) }, 'Cancelar')
    ]));
  }

  function handleSave(errorBox) {
    const { values, errors } = readForm(['goal-name', 'goal-target']);
    if (errors.length || Number(values['goal-target']) <= 0) {
      errorBox.textContent = 'Nombre y meta son obligatorios; la meta debe ser mayor a 0.';
      errorBox.classList.remove('hidden');
      return;
    }
    const extra = readForm(['goal-current', 'goal-monthly']).values;
    const record = {
      name: values['goal-name'],
      targetAmount: Number(values['goal-target']),
      currentSaved: Number(extra['goal-current']) || 0,
      monthlyContribution: Number(extra['goal-monthly']) || 0
    };
    if (editingId) Storage.update('goals', editingId, record);
    else Storage.insert('goals', record);

    showToast('Objetivo guardado', 'success');
    editingId = null;
    clear(formWrap);
    renderList();
  }

  renderList();
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
