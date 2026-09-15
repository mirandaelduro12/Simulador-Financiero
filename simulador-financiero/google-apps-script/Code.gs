/**
 * Puente Google Forms -> API del Simulador Financiero.
 * Coloca este código en Apps Script vinculado a la hoja de respuestas.
 * Luego ejecuta setup() una vez para crear el trigger.
 */

const CONFIG = {
  API_URL: 'https://TU-DOMINIO/api/sync/form',
  SECRET: 'CAMBIA_ESTE_SECRETO'
};

function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onFormSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onFormSubmit()
    .create();
}

function onFormSubmit(e) {
  const r = e.namedValues || {};
  const get = (label, fallback = '') => String((r[label] && r[label][0]) || fallback).trim();

  const categoryMap = {
    'Alimentación':'alimentacion','Transporte':'transporte','Vivienda':'vivienda','Servicios':'servicios',
    'Educación':'educacion','Entretenimiento':'entretenimiento','Gustito':'gustito','Salud':'salud','Tecnología':'tecnologia','Otros':'otros'
  };
  const frequencyMap = {
    'Mensual':'mensual','Quincenal':'quincenal','Semanal':'semanal','Ocasional (único)':'ocasional'
  };
  const rawDate = get('Fecha');
  const isoDate = normalizeDate(rawDate);
  const payload = {
    externalId: `sheet-row-${e.range.getRow()}`,
    description: get('Descripción', 'Gasto desde Google Forms'),
    amount: Number(get('Monto', '0').replace(',', '.')),
    category: categoryMap[get('Categoría')] || get('Categoría', 'otros').toLowerCase(),
    frequency: frequencyMap[get('Frecuencia')] || 'ocasional',
    date: isoDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    notes: get('Nota', '')
  };

  if (!payload.description || !Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error('El formulario debe contener una descripción y un monto mayor a 0.');
  }

  const response = UrlFetchApp.fetch(CONFIG.API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Form-Secret': CONFIG.SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`La API respondió ${code}: ${response.getContentText()}`);
  }
}

function normalizeDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return '';
}
