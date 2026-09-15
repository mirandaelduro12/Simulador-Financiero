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

let toastTimeout = null;
export function showToast(message, tone = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast' });
    Object.assign(el.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 999,
      padding: '10px 16px', borderRadius: '8px', fontSize: '13.5px',
      fontFamily: 'Manrope, sans-serif', color: '#fff', transition: 'opacity .2s'
    });
    document.body.appendChild(el);
  }
  const colors = { info: '#16213A', success: '#1F7A5C', error: '#B23A48' };
  el.style.background = colors[tone] || colors.info;
  el.textContent = message;
  el.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2400);
}
