import { registerRoute, startRouter, navigateTo, refreshCurrent } from './router.js';
import { renderDashboard } from './views/dashboard.js';
import { renderIncome } from './views/income.js';
import { renderExpenses } from './views/expenses.js';
import { renderDebts } from './views/debts.js';
import { renderGoals } from './views/goals.js';
import { renderScenarios } from './views/scenarios.js';
import { renderPurchases } from './views/purchases.js';
import { renderAnalytics } from './views/analytics.js';
import { renderSettings } from './views/settings.js';
import { Storage } from './storage.js';

const NAV_ITEMS = [
  { route: '/dashboard', label: 'Dashboard', icon: iconGrid() },
  { route: '/income', label: 'Ingresos', icon: iconArrowDown() },
  { route: '/expenses', label: 'Gastos', icon: iconArrowUp() },
  { route: '/debts', label: 'Deudas', icon: iconCard() },
  { route: '/goals', label: 'Objetivos', icon: iconFlag() },
  { route: '/scenarios', label: 'Escenarios', icon: iconBranch() },
  { route: '/purchases', label: 'Compras', icon: iconBag() },
  { route: '/analytics', label: 'Análisis', icon: iconChart() },
  { route: '/settings', label: 'Ajustes', icon: iconGear() }
];

function buildShell() {
  const app = document.getElementById('app');

  const nav = document.createElement('nav');
  nav.className = 'nav';
  NAV_ITEMS.forEach(item => {
    const a = document.createElement('a');
    a.className = 'nav-item';
    a.href = `#${item.route}`;
    a.dataset.route = item.route;
    a.innerHTML = `${item.icon}<span>${item.label}</span>`;
    nav.appendChild(a);
  });

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">SFP // v1</span>
          <h1>Simulador Financiero</h1>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div>
            <h2>Dashboard</h2>
            <div class="topbar-sub"></div><span id="connection-badge" class="connection-badge"></span><button id="sync-button" class="btn btn-sm sync-button" type="button">↻ Sincronizar</button>
          </div>
        </header>
        <section class="view" id="view-outlet"></section>
      </div>
    </div>
  `;

  app.querySelector('.sidebar').appendChild(nav);
  app.querySelector('.sidebar').insertAdjacentHTML('beforeend', `
    <div class="sidebar-footer">Full Stack · JS + Node + SQLite<br>Google Forms → API → Dashboard</div>
  `);

  return {
    outlet: document.getElementById('view-outlet'),
    topbar: app.querySelector('.topbar')
  };
}

function registerRoutes() {
  registerRoute('/dashboard', (outlet) => renderDashboard(outlet, document.querySelector('.topbar')));
  registerRoute('/income', (outlet) => { setTitle('Ingresos', 'Registra sueldo, freelance, bonos y otros ingresos'); renderIncome(outlet); });
  registerRoute('/expenses', (outlet) => { setTitle('Gastos', 'Registra y categoriza tus gastos mensuales'); renderExpenses(outlet); });
  registerRoute('/debts', (outlet) => { setTitle('Deudas', 'Registra tus deudas y su plan de pago'); renderDebts(outlet); });
  registerRoute('/goals', (outlet) => { setTitle('Objetivos', 'Define metas y sigue tu progreso de ahorro'); renderGoals(outlet); });
  registerRoute('/scenarios', (outlet) => { setTitle('Simulador de escenarios', 'Compara "qué pasaría si..." sin tocar tus datos reales'); renderScenarios(outlet); });
  registerRoute('/purchases', (outlet) => { setTitle('Simulador de compras', 'Compara contado, ahorro previo y financiamiento'); renderPurchases(outlet); });
  registerRoute('/analytics', (outlet) => { setTitle('Análisis', 'Tendencias, patrones y comportamientos atípicos'); renderAnalytics(outlet); });
  registerRoute('/settings', (outlet) => { setTitle('Ajustes', 'Datos de ejemplo, respaldo y borrado'); renderSettings(outlet); });
}

function setTitle(title, sub) {
  document.querySelector('.topbar h2').textContent = title;
  document.querySelector('.topbar-sub').textContent = sub;
}

document.addEventListener('DOMContentLoaded', async () => {
  const { outlet, topbar } = buildShell();
  registerRoutes();
  document.getElementById('sync-button').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = '↻ Sincronizando...';
    const status = await StorageInit();
    updateConnectionStatus(status.online);
    button.disabled = false;
    button.textContent = '↻ Sincronizar';
    refreshCurrent();
  });
  const status = await StorageInit();
  updateConnectionStatus(status.online);
  startRouter(outlet, topbar);
  if (!window.location.hash) navigateTo('/dashboard');
});

async function StorageInit() {
  const mod = await import('./storage.js');
  return mod.Storage.init();
}
function updateConnectionStatus(online) {
  const badge = document.getElementById('connection-badge');
  if (!badge) return;
  badge.className = `connection-badge ${online ? 'online' : 'offline'}`;
  badge.textContent = online ? '● Sincronizado' : '● Modo local';
  badge.title = online ? 'Datos sincronizados con la API' : 'La API no está disponible; se usa el caché del navegador';
}

// ---- Iconos SVG inline (sin dependencias externas) ----
function iconGrid() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`; }
function iconArrowDown() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16M6 14l6 6 6-6"/></svg>`; }
function iconArrowUp() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V4M6 10l6-6 6 6"/></svg>`; }
function iconCard() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`; }
function iconFlag() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V4h14l-3 4 3 4H4"/></svg>`; }
function iconBranch() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M6 8.5v7M8.3 6H15c1.7 0 3 1.3 3 3v.5"/></svg>`; }
function iconBag() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`; }
function iconChart() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>`; }
function iconGear() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/></svg>`; }
