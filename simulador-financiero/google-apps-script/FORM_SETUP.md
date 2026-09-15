# Configuración de Google Forms

Crea un Google Form con estos títulos EXACTOS:

1. `Descripción` — respuesta corta
2. `Monto` — respuesta corta / número
3. `Categoría` — lista desplegable: Alimentación, Transporte, Vivienda, Servicios, Educación, Entretenimiento, Gustito, Salud, Tecnología, Otros
4. `Frecuencia` — lista desplegable: Mensual, Quincenal, Semanal, Ocasional (único)
5. `Fecha` — fecha
6. `Nota` — párrafo (opcional)

En el formulario selecciona **Respuestas → Vincular a Hojas de cálculo**.

En la hoja de respuestas abre **Extensiones → Apps Script**, pega `Code.gs`, cambia `API_URL` y `SECRET`, guarda y ejecuta `setup()` una sola vez para autorizar y crear el trigger.

Flujo:

Google Form → Google Sheets → Apps Script trigger → POST `/api/sync/form` → SQLite → Dashboard.

El endpoint es idempotente mediante `externalId`, para evitar duplicados cuando el trigger se reintenta.
