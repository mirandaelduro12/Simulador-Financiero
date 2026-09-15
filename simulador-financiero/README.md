# Simulador Financiero Personal — Full Stack

Aplicación web para registrar ingresos, gastos, deudas, objetivos, escenarios y compras, con Dashboard, análisis y proyecciones. Esta versión evoluciona la Etapa 1 a una arquitectura Full Stack:

- Frontend: HTML + CSS + JavaScript ES Modules + Chart.js.
- Backend: Node.js sin framework pesado, API REST y SQLite.
- Persistencia: SQLite (`db/finance.sqlite`).
- Integración externa: Google Forms → Google Sheets → Google Apps Script → API.
- Respaldo local: caché en `localStorage` como modo offline/fallback.

## Caso de uso principal

Puedes abrir un Google Form desde el celular y registrar:

> Descripción: Galleta  
> Monto: 2.00  
> Categoría: Gustito  
> Frecuencia: Ocasional (único)  
> Fecha: 2026-09-14

Google Forms guarda la respuesta en Sheets. El trigger de Apps Script envía el gasto a `POST /api/sync/form`. El backend lo guarda en SQLite. Al cargar/sincronizar el frontend, el gasto aparece en **Gastos** y, como es un movimiento ocasional del mes actual, reduce el **Disponible** del Dashboard.

Google documenta los triggers `onFormSubmit` y las Web Apps con `doGet/doPost`; Apps Script puede actuar como puente HTTP hacia la API. citeturn558548search2turn558548search5

## Ejecutar localmente

Requiere Node.js 22.5+ por el uso de `node:sqlite`.

```bash
npm start
```

Abre:

```text
http://localhost:3000
```

El frontend se sirve desde el mismo servidor, así que `apiUrl: '/api'` funciona sin configuración adicional.

## API

```text
GET    /api/health
GET    /api/state
GET    /api/:collection
POST   /api/:collection
PATCH  /api/:collection/:id
DELETE /api/:collection/:id
DELETE /api/state
POST   /api/import
POST   /api/sync/form
```

Colecciones: `income`, `expenses`, `debts`, `goals`, `purchases`, `scenarios`.

## Google Forms

Sigue `google-apps-script/FORM_SETUP.md`. Los títulos de las preguntas deben coincidir con el script.

En Apps Script cambia:

```js
const CONFIG = {
  API_URL: 'https://TU-DOMINIO/api/sync/form',
  SECRET: 'TU-SECRETO'
};
```

Luego ejecuta `setup()` una vez para crear el trigger de envío de formulario. Google indica que los triggers instalables pueden reaccionar al envío de un formulario y ejecutarse con la autorización del usuario que los creó. citeturn558548search2turn558548search10

## Publicación real

Para que un Google Form pueda llamar a tu API, el backend debe estar publicado en una URL HTTPS accesible desde Internet. En producción configura un secreto largo en `FORM_WEBHOOK_SECRET` y despliega el servidor con una base SQLite persistente o cambia la capa de datos por PostgreSQL/MySQL.

Google Sheets también dispone de operaciones para leer y anexar valores, pero en esta arquitectura Sheets funciona principalmente como bandeja de entrada/auditoría y SQLite como fuente de datos de la aplicación. citeturn558548search0

## Estructura

```text
simulador-financiero/
├── index.html
├── package.json
├── .env.example
├── css/
├── data/
├── db/
│   └── schema.sql
├── google-apps-script/
│   ├── Code.gs
│   └── FORM_SETUP.md
├── js/
│   ├── app.js
│   ├── app-config.js
│   ├── storage.js
│   ├── calculations.js
│   └── views/ ...
└── server/
    ├── server.js
    ├── db.js
    └── test-api.js
```

## Prueba rápida

```bash
npm test
```

La prueba levanta la API, limpia el estado, inserta un gasto de S/ 2, verifica que se guarde en SQLite y limpia los datos de prueba.
