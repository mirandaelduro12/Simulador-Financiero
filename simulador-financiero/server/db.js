import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dbFile = process.env.DB_FILE ? path.resolve(root, process.env.DB_FILE) : path.join(root, 'db', 'finance.sqlite');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL;');
db.exec(fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8'));

export const COLLECTIONS = ['income', 'expenses', 'debts', 'goals', 'purchases', 'scenarios'];

const columnMap = {
  income: ['description','category','frequency','amount','date'],
  expenses: ['description','category','frequency','amount','date','source','externalId'],
  debts: ['name','remainingBalance','monthlyPayment','interestRate','initialAmount','startDate'],
  goals: ['name','targetAmount','currentSaved','monthlyContribution'],
  purchases: ['name','price','desiredDate','priority','notes'],
  scenarios: ['name','payload']
};

function rowToRecord(collection, row) {
  if (collection !== 'scenarios') return { ...row };
  return { ...row, payload: JSON.parse(row.payload || '{}') };
}

export function getAll(collection) {
  const order = ['income','expenses'].includes(collection) ? 'date DESC, createdAt DESC' : 'createdAt DESC';
  return db.prepare(`SELECT * FROM ${collection} ORDER BY ${order}`).all().map(r => rowToRecord(collection, r));
}

export function getById(collection, id) {
  const row = db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id);
  return row ? rowToRecord(collection, row) : null;
}

export function insert(collection, input) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = new Date().toISOString();
  const values = {};
  for (const key of columnMap[collection]) values[key] = input[key] ?? (key === 'source' ? 'app' : key === 'payload' ? {} : null);
  if (collection === 'scenarios') values.payload = JSON.stringify(values.payload ?? {});
  const cols = ['id','createdAt', ...columnMap[collection]];
  const stmt = db.prepare(`INSERT INTO ${collection} (${cols.join(',')}) VALUES (${cols.map(()=>'?' ).join(',')})`);
  stmt.run(id, createdAt, ...columnMap[collection].map(c => values[c]));
  return getById(collection, id);
}

export function update(collection, id, patch) {
  const allowed = columnMap[collection].filter(k => Object.hasOwn(patch, k));
  if (!allowed.length) return getById(collection, id);
  const values = allowed.map(k => collection === 'scenarios' && k === 'payload' ? JSON.stringify(patch[k]) : patch[k]);
  const result = db.prepare(`UPDATE ${collection} SET ${allowed.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).run(...values, id);
  return result.changes ? getById(collection, id) : null;
}

export function remove(collection, id) {
  return db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id).changes > 0;
}

export function clearAll() {
  db.exec('BEGIN');
  try {
    for (const c of COLLECTIONS) db.prepare(`DELETE FROM ${c}`).run();
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function exportState() {
  return Object.fromEntries(COLLECTIONS.map(c => [c, getAll(c)]));
}

export function importState(state) {
  db.exec('BEGIN');
  try {
    for (const c of COLLECTIONS) {
      db.prepare(`DELETE FROM ${c}`).run();
      for (const record of Array.isArray(state?.[c]) ? state[c] : []) {
        const { id, createdAt, ...payload } = record;
        const cols = columnMap[c];
        const fixedPayload = { ...payload };
        if (c === 'scenarios' && typeof fixedPayload.payload !== 'object') fixedPayload.payload = {};
        const vals = cols.map(k => c === 'scenarios' && k === 'payload' ? JSON.stringify(fixedPayload[k] ?? {}) : fixedPayload[k] ?? null);
        db.prepare(`INSERT INTO ${c} (id,createdAt,${cols.join(',')}) VALUES (?,?,${cols.map(()=>'?').join(',')})`)
          .run(id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`, createdAt ?? new Date().toISOString(), ...vals);
      }
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return exportState();
}

export function findExpenseByExternalId(externalId) {
  if (!externalId) return null;
  const row = db.prepare('SELECT * FROM expenses WHERE externalId = ?').get(externalId);
  return row ? rowToRecord('expenses', row) : null;
}
