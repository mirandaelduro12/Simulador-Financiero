// utils.js — helpers puros, sin dependencias de estado

export function formatCurrency(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return 'S/ ' + value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value, decimals = 0) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function monthLabel(offsetFromNow) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetFromNow);
  return d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
}

// Crea un elemento DOM con atributos y children de forma declarativa.
// Reduce el boilerplate de document.createElement sin traer un framework.
export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, val]) => {
    if (val === null || val === undefined || val === false) return;
    if (key === 'class') el.className = val;
    else if (key === 'html') el.innerHTML = val;
    else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      el.setAttribute(key, val);
    }
  });
  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (child === null || child === undefined || child === false) return;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Convierte una clave "2026-09" en una etiqueta corta "set. 26".
export function formatMonthKey(key) {
  const [year, month] = String(key).split('-').map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString('es-PE', { month: 'short', year: '2-digit' });
}

let toastTimeout = null;
export function showToast(message, tone = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(el);
  }
  el.className = `toast ${tone}`;
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { el.classList.remove('show'); }, 2600);
}
