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
import { icon } from './icons.js';

const THEME_KEY = 'simulador-financiero:theme';

const NAV_GROUPS = [
  { label: null, items: [
    { route: '/dashboard', label: 'Dashboard', icon: 'grid' }
  ] },
  { label: 'Registro', items: [
    { route: '/income', label: 'Ingresos', icon: 'income' },
    { route: '/expenses', label: 'Gastos', icon: 'expense' },
    { route: '/debts', label: 'Deudas', icon: 'card' },
    { route: '/goals', label: 'Objetivos', icon: 'flag' }
  ] },
  { label: 'Simulación', items: [
    { route: '/scenarios', label: 'Escenarios', icon: 'branch' },
    { route: '/purchases', label: 'Compras', icon: 'bag' }
  ] },
  { label: 'Entender', items: [
    { route: '/analytics', label: 'Análisis', icon: 'chart' },
    { route: '/settings', label: 'Ajustes', icon: 'gear' }
  ] }
];

function buildShell() {
  const app = document.getElementById('app');

  const navHtml = NAV_GROUPS.map(group => `
    <div class="nav-group">
      ${group.label ? `<div class="nav-label">${group.label}</div>` : ''}
      ${group.items.map(item => `
        <a class="nav-item" href="#${item.route}" data-route="${item.route}">${icon(item.icon, 17)}<span>${item.label}</span></a>
      `).join('')}
    </div>
  `).join('');

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#/dashboard" aria-label="Ir al Dashboard">
          <span class="brand-logo">S/</span>
          <span class="brand-text"><strong>Simulador</strong><span>Finanzas personales</span></span>
        </a>
        <nav class="nav" aria-label="Secciones">${navHtml}</nav>
        <div class="sidebar-footer">
          <span class="footer-note">Node + SQLite<br>Google Forms → API</span>
          <button id="theme-toggle" class="theme-toggle" type="button"></button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div>
            <div class="topbar-eyebrow">${currentMonthLabel()}</div>
            <h2>Dashboard</h2>
            <div class="topbar-sub"></div>
          </div>
          <div class="topbar-actions">
            <span id="connection-badge" class="connection-badge"></span>
            <button id="sync-button" class="btn btn-sm sync-button" type="button">${icon('refresh', 15)}<span>Sincronizar</span></button>
          </div>
        </header>
        <section class="view" id="view-outlet"></section>
      </div>
    </div>
  `;

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

function currentMonthLabel() {
  const label = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ---- Tema claro / oscuro ----
function effectiveTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit) return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function paintThemeToggle() {
  const button = document.getElementById('theme-toggle');
  const dark = effectiveTheme() === 'dark';
  button.innerHTML = icon(dark ? 'sun' : 'moon', 16);
  button.title = dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
  button.setAttribute('aria-label', button.title);
}

function setupThemeToggle() {
  paintThemeToggle();
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* sin almacenamiento disponible */ }
    paintThemeToggle();
    refreshCurrent(); // repinta los gráficos con la paleta del nuevo tema
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const { outlet, topbar } = buildShell();
  registerRoutes();
  setupThemeToggle();

  document.getElementById('sync-button').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const label = button.querySelector('span');
    button.disabled = true;
    button.classList.add('is-syncing');
    label.textContent = 'Sincronizando…';
    const status = await StorageInit();
    updateConnectionStatus(status.online);
    button.disabled = false;
    button.classList.remove('is-syncing');
    label.textContent = 'Sincronizar';
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
  badge.textContent = online ? 'Sincronizado' : 'Modo local';
  badge.title = online ? 'Datos sincronizados con la API' : 'La API no está disponible; se usa el caché del navegador';
}
