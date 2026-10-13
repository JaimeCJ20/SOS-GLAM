# SOS GLAM · Cloudflare MVP

Este directorio contiene la base para convertir la maqueta en un MVP real con Cloudflare.

## Estructura

- `wrangler.toml` — configuración del proyecto y D1
- `src/worker.js` — API para shops, servicios, agenda y citas
- `src/schema.sql` — esquema de base de datos
- `src/seed.sql` — datos de ejemplo realistas de peluquerías

## Comandos

```bash
cd cloudflare
npm install -D wrangler
npx wrangler d1 create sos-glam
```

Luego copia el `database_id` que te devuelve Wrangler y actualiza `wrangler.toml`.

```bash
npx wrangler d1 execute sos-glam --file=src/schema.sql
npx wrangler d1 execute sos-glam --file=src/seed.sql
npx wrangler dev
```

## Endpoints principales

- `GET /api/health`
- `GET /api/shops`
- `GET /api/shops/:slug`
- `GET /api/shops/:slug/services`
- `GET /api/shops/:slug/agenda?date=2026-10-12`
- `POST /api/shops/:slug/appointments`
- `PATCH /api/appointments/:id/status`

## Ejemplo de petición

```bash
curl -X POST http://localhost:8787/api/shops/el-flaco/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Carlos Ruiz",
    "phone": "987654321",
    "serviceId": "svc_002",
    "barberId": "bar_001",
    "scheduledAt": "2026-10-18T16:00:00",
    "notes": "Reserva desde web"
  }'
```

## Siguientes pasos

1. Conectar el frontend real con estos endpoints.
2. Integrar login del dueño.
3. Agregar recordatorios por WhatsApp.
4. Añadir cron jobs para avisos automáticos.
5. Desplegar en Cloudflare Pages + Workers.
