// router.js — SPA muy simple basada en location.hash.
// No usamos un framework de routing todavía (llega en la Etapa 2 con React
// Router); esto es intencional para practicar el patrón a mano primero.

const routes = new Map();
let currentCleanup = null;

export function registerRoute(path, renderFn) {
  routes.set(path, renderFn);
}

export function navigateTo(path) {
  window.location.hash = path;
}

export function refreshCurrent() {
  if (lastOutlet && lastTitle) renderCurrent(lastOutlet, lastTitle);
}

let lastOutlet = null;
let lastTitle = null;

export function startRouter(outletEl, titleEl) {
  lastOutlet = outletEl;
  lastTitle = titleEl;
  window.addEventListener('hashchange', () => renderCurrent(outletEl, titleEl));
  renderCurrent(outletEl, titleEl);
}

function renderCurrent(outletEl, titleEl) {
  const path = (window.location.hash || '#/dashboard').replace('#', '');
  const view = routes.get(path) || routes.get('/dashboard');

  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  outletEl.innerHTML = '';
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === path);
  });

  if (view) {
    const result = view(outletEl, titleEl);
    if (typeof result === 'function') currentCleanup = result;
  }
}
