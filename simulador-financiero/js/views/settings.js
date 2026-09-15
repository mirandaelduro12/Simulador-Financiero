import { Storage } from '../storage.js';
import { h, showToast } from '../utils.js';
import { icon } from '../icons.js';

function sampleData() {
  const today = new Date();
  const isoMonthsAgo = (n, day = 5) => {
    const d = new Date(today.getFullYear(), today.getMonth() - n, day);
    return d.toISOString().slice(0, 10);
  };

  return {
    income: [
      { description: 'Sueldo principal', category: 'sueldo', frequency: 'mensual', amount: 2500, date: isoMonthsAgo(0, 1) },
      { description: 'Proyecto freelance', category: 'freelance', frequency: 'ocasional', amount: 400, date: isoMonthsAgo(1, 15) }
    ],
    expenses: [
      ...[0, 1, 2, 3].flatMap(m => ([
        { description: 'Mercado', category: 'alimentacion', frequency: 'mensual', amount: 450 + (m === 2 ? 300 : 0), date: isoMonthsAgo(m, 3) },
        { description: 'Pasajes/combustible', category: 'transporte', frequency: 'mensual', amount: 180 + m * 8, date: isoMonthsAgo(m, 4) },
        { description: 'Alquiler', category: 'vivienda', frequency: 'mensual', amount: 700, date: isoMonthsAgo(m, 1) },
        { description: 'Luz, agua, internet', category: 'servicios', frequency: 'mensual', amount: 160, date: isoMonthsAgo(m, 6) },
        { description: 'Streaming y salidas', category: 'entretenimiento', frequency: 'mensual', amount: 120, date: isoMonthsAgo(m, 10) }
      ]))
    ],
    debts: [
      { name: 'Tarjeta de crédito', remainingBalance: 1800, monthlyPayment: 250, interestRate: 42, initialAmount: 2500, startDate: isoMonthsAgo(6, 1) },
      { name: 'Préstamo personal', remainingBalance: 3200, monthlyPayment: 200, interestRate: 18, initialAmount: 4000, startDate: isoMonthsAgo(10, 1) }
    ],
    goals: [
      { name: 'Laptop nueva', targetAmount: 3000, currentSaved: 800, monthlyContribution: 300 },
      { name: 'Fondo de emergencia', targetAmount: 5000, currentSaved: 1200, monthlyContribution: 250 }
    ]
  };
}

export function renderSettings(outlet) {
  const formUrl = window.APP_CONFIG?.googleFormUrl || '';
  const online = Storage.isOnline();
  const connectionText = online
    ? 'Conectado: tus cambios se guardan en la API + SQLite.'
    : 'Sin API disponible: la aplicación trabaja con el caché local y sincroniza cuando vuelva a estar disponible.';

  const grid = h('div', { class: 'settings-grid' }, [
    h('div', { class: 'card' }, [
      h('div', { class: 'spread' }, [
        h('h3', {}, 'Conexión'),
        h('span', { class: `tag ${online ? 'positive' : 'accent'}` }, online ? 'Sincronizado' : 'Modo local')
      ]),
      h('p', { class: 'text-soft' }, connectionText),
      h('div', { class: 'kbd-line' }, 'API: ' + (window.APP_CONFIG?.apiUrl || '/api'))
    ]),

    h('div', { class: 'card sync-card' }, [
      h('h3', {}, 'Registro rápido desde celular'),
      h('p', { class: 'text-soft' }, 'Usa tu Google Form para registrar una compra como “Galleta · S/ 2 · Gustito”. El registro entra por Google Sheets/Apps Script y aparece en el Dashboard.'),
      formUrl
        ? h('div', { class: 'row' }, [
          h('a', { class: 'btn btn-primary', href: formUrl, target: '_blank', rel: 'noopener' }, [h('span', { html: icon('external', 15) }), 'Abrir Google Form'])
        ])
        : h('div', { class: 'kbd-line' }, 'Configura googleFormUrl en js/app-config.js para mostrar el botón del formulario.')
    ]),

    h('div', { class: 'card' }, [
      h('h3', {}, 'Tus datos'),
      h('p', { class: 'text-soft' }, 'Carga datos de ejemplo para explorar la app o descarga un respaldo en JSON.'),
      h('div', { class: 'row' }, [
        h('button', { class: 'btn btn-primary', onClick: loadSample }, 'Cargar datos de ejemplo'),
        h('button', { class: 'btn', onClick: exportData }, [h('span', { html: icon('download', 15) }), 'Exportar respaldo (JSON)'])
      ])
    ]),

    h('div', { class: 'card danger-zone' }, [
      h('h3', {}, 'Zona de riesgo'),
      h('p', { class: 'text-soft' }, 'Borra todos los ingresos, gastos, deudas y objetivos guardados. No se puede deshacer.'),
      h('div', { class: 'row' }, [
        h('button', { class: 'btn btn-danger', onClick: wipeData }, [h('span', { html: icon('trash', 15) }), 'Borrar todos mis datos'])
      ])
    ])
  ]);
  outlet.appendChild(grid);

  function loadSample() {
    const data = sampleData();
    data.income.forEach(r => Storage.insert('income', r));
    data.expenses.forEach(r => Storage.insert('expenses', r));
    data.debts.forEach(r => Storage.insert('debts', r));
    data.goals.forEach(r => Storage.insert('goals', r));
    showToast('Datos de ejemplo cargados. Ve al Dashboard.', 'success');
  }

  function exportData() {
    const json = Storage.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulador-financiero-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Respaldo descargado', 'success');
  }

  function wipeData() {
    if (!confirm('Esto borrará todos tus datos guardados localmente. ¿Continuar?')) return;
    Storage.clearAll();
    showToast('Datos borrados', 'success');
  }
}
