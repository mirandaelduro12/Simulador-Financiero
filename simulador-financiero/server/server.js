import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import { getAll, getById, insert, update, remove, clearAll, exportState, importState, findExpenseByExternalId, COLLECTIONS } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 3000);
const secret = process.env.FORM_WEBHOOK_SECRET || '';

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Form-Secret',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 2_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(new Error('JSON inválido')); } });
    req.on('error', reject);
  });
}

function safeRecord(record, collection) {
  const forbidden = new Set(['__proto__','constructor','prototype']);
  const copy = {};
  for (const [k,v] of Object.entries(record || {})) if (!forbidden.has(k)) copy[k] = v;
  if (collection === 'expenses') {
    copy.amount = Number(copy.amount);
    if (!Number.isFinite(copy.amount) || copy.amount <= 0) throw new Error('Monto de gasto inválido');
    copy.source = copy.source || 'app';
  }
  return copy;
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return false;

  if (req.method === 'OPTIONS') { res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, X-Form-Secret','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'}); return res.end(); }
  if (req.method === 'GET' && parts[1] === 'health') return send(res, 200, { ok: true, service: 'simulador-financiero-api', time: new Date().toISOString() });
  if (req.method === 'GET' && (parts[1] === 'state' || parts[1] === 'db')) return send(res, 200, exportState());

  if (req.method === 'POST' && parts[1] === 'import') {
    const body = await readBody(req); return send(res, 200, { ok: true, state: importState(body.state || body) });
  }
  if (req.method === 'DELETE' && parts[1] === 'state') { clearAll(); return send(res, 200, { ok: true }); }

  if (req.method === 'POST' && parts[1] === 'sync' && parts[2] === 'form') {
    if (secret && req.headers['x-form-secret'] !== secret) return send(res, 401, { ok: false, error: 'Secreto de formulario inválido' });
    const body = safeRecord(await readBody(req), 'expenses');
    const externalId = String(body.externalId || body.responseId || '').trim();
    const duplicate = externalId ? findExpenseByExternalId(externalId) : null;
    if (duplicate) return send(res, 200, { ok: true, duplicate: true, expense: duplicate });
    const expense = insert('expenses', { ...body, externalId: externalId || null, source: 'google-form' });
    return send(res, 201, { ok: true, expense });
  }

  const collection = parts[1];
  if (!COLLECTIONS.includes(collection)) return send(res, 404, { error: 'Colección no encontrada' });
  const id = parts[2];

  if (req.method === 'GET' && !id) return send(res, 200, getAll(collection));
  if (req.method === 'GET' && id) return send(res, 200, getById(collection, id));
  if (req.method === 'POST' && !id) return send(res, 201, insert(collection, safeRecord(await readBody(req), collection)));
  if (req.method === 'PATCH' && id) {
    const result = update(collection, id, safeRecord(await readBody(req), collection));
    return result ? send(res, 200, result) : send(res, 404, { error: 'Registro no encontrado' });
  }
  if (req.method === 'DELETE' && id) return send(res, 200, { ok: remove(collection, id) });
  return send(res, 405, { error: 'Método no permitido' });
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'})[ext] || 'application/octet-stream';
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.normalize(path.join(root, pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('Not found');
    }
    res.writeHead(200, {'Content-Type': contentType(file)});
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: err.message });
  }
});

server.listen(port, () => console.log(`Simulador Financiero en http://localhost:${port}`));
