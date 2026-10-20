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
- `POST /api/appointments/action` — confirma o cancela con token temporal de un solo uso
- `PATCH /api/appointments/:id/status`

La creación de citas valida el payload, rechaza fechas pasadas y protege el mismo cupo con un índice único en D1. La respuesta devuelve tokens separados para `confirm` y `cancel`; el sistema solo guarda sus hashes y los invalida después del primer uso.

## Revisión adversaria del MVP

- **Cancelar otra cita:** el enlace no usa el ID de la cita como autorización. Se entrega un token aleatorio, con hash en D1, acción limitada, expiración de 7 días y consumo atómico.
- **Dos reservas simultáneas:** la consulta previa mejora el mensaje al usuario y el índice único es la garantía final; una colisión devuelve `409`.
- **Cambio de estado por terceros:** la ruta interna exige un JWT vigente y limita la actualización al `shop_id` de la sesión.
- **Abuso de endpoints y WhatsApp:** en producción hay que activar WAF, reglas de rate limiting y protección de webhooks en Cloudflare; no se deben considerar sustituidos por la validación del Worker.
- **Bloqueo de Meta/WhatsApp:** el MVP debe conservar una cola de reintentos y un canal alternativo de aviso (email o SMS) antes de depender de una sola cuenta o número.

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
