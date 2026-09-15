import './server.js';

const base = 'http://localhost:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(200);

async function request(path, options = {}) {
  const res = await fetch(base + path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(json)}`);
  return json;
}

try {
  await request('/api/state', { method: 'DELETE' });
  const expense = await request('/api/expenses', { method: 'POST', body: JSON.stringify({ description:'Test galleta', category:'gustito', frequency:'mensual', amount:2, date:'2026-09-14' }) });
  if (expense.amount !== undefined && Number(expense.amount) !== 2) throw new Error('Gasto no creado correctamente');
  const state = await request('/api/state');
  if (state.expenses.length !== 1) throw new Error('Estado incorrecto');
  console.log('OK: API CRUD y SQLite funcionan.');
} finally {
  await request('/api/state', { method: 'DELETE' }).catch(()=>{});
  process.exit(0);
}
