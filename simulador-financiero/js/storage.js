// storage.js — capa de persistencia híbrida.
// La app mantiene un caché local para render inmediato, pero sincroniza CRUD
// contra la API cuando está disponible. Así el mismo frontend funciona en
// modo local o conectado a Node.js + SQLite.

const DB_KEY = 'simulador-financiero:cache:v2';
const API_URL = (window.APP_CONFIG?.apiUrl || '/api').replace(/\/$/, '');
const COLLECTIONS = ['income', 'expenses', 'debts', 'goals', 'purchases', 'scenarios'];
let db = readLocal();
let online = false;
let syncQueue = [];

function emptyDb() { return Object.fromEntries(COLLECTIONS.map(c => [c, []])); }
function readLocal() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(COLLECTIONS.map(c => [c, Array.isArray(parsed[c]) ? parsed[c] : []]));
  } catch { return emptyDb(); }
}
function writeLocal() { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function assertCollection(name) { if (!COLLECTIONS.includes(name)) throw new Error(`Colección desconocida: "${name}"`); }
function generateId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function queueSync(fn) {
  syncQueue.push(fn);
  void flushQueue();
}
async function flushQueue() {
  if (!online || !syncQueue.length) return;
  const queue = [...syncQueue];
  syncQueue = [];
  for (const fn of queue) {
    try { await fn(); } catch { syncQueue.push(fn); online = false; break; }
  }
}

export const Storage = {
  async init() {
    try {
      const remote = await request('/state');
      const localHasData = COLLECTIONS.some(c => db[c].length);
      const remoteHasData = COLLECTIONS.some(c => remote[c]?.length);
      if (localHasData && !remoteHasData) {
        const imported = await request('/import', { method: 'POST', body: JSON.stringify({ state: db }) });
        db = imported.state;
      } else {
        db = remote;
      }
      writeLocal();
      online = true;
      return { online: true };
    } catch (e) {
      console.warn('API no disponible; usando caché local.', e);
      online = false;
      return { online: false };
    }
  },

  isOnline() { return online; },

  getAll(collection) { assertCollection(collection); return [...db[collection]]; },
  getById(collection, id) { assertCollection(collection); return db[collection].find(item => item.id === id) || null; },

  insert(collection, record) {
    assertCollection(collection);
    const entry = { id: generateId(), createdAt: new Date().toISOString(), ...record };
    db[collection].push(entry); writeLocal();
    if (online) {
      queueSync(async () => {
        const serverRecord = await request(`/${collection}`, { method: 'POST', body: JSON.stringify(record) });
        const idx = db[collection].findIndex(r => r.id === entry.id);
        if (idx !== -1) db[collection][idx] = serverRecord;
        writeLocal();
      });
    }
    return entry;
  },

  update(collection, id, patch) {
    assertCollection(collection);
    const idx = db[collection].findIndex(item => item.id === id);
    if (idx === -1) return null;
    db[collection][idx] = { ...db[collection][idx], ...patch, id };
    writeLocal();
    if (online) queueSync(async () => {
      const serverRecord = await request(`/${collection}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
      const i = db[collection].findIndex(r => r.id === id);
      if (i !== -1) db[collection][i] = serverRecord;
      writeLocal();
    });
    return db[collection][idx];
  },

  remove(collection, id) {
    assertCollection(collection);
    const before = db[collection].length;
    db[collection] = db[collection].filter(item => item.id !== id);
    const removed = db[collection].length < before;
    writeLocal();
    if (removed && online) queueSync(() => request(`/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE' }));
    return removed;
  },

  replaceAll(collection, records) { assertCollection(collection); db[collection] = records; writeLocal(); },

  clearAll() {
    db = emptyDb(); writeLocal();
    if (online) queueSync(() => request('/state', { method: 'DELETE' }));
  },

  exportJson() { return JSON.stringify(db, null, 2); }
};
