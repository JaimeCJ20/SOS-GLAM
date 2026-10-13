export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // Encabezados CORS para permitir peticiones desde el frontend
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Inicio de sesión
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json();
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        const user = await env.DB.prepare(
          'SELECT id, shop_id, email, name, role, password_hash FROM users WHERE lower(email) = ?'
        ).bind(email).first();

        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return json({ error: 'Correo o contraseña incorrectos' }, 401);
        }

        const token = await createToken({
          sub: user.id,
          shopId: user.shop_id,
          email: user.email,
          role: user.role,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
        }, env);
        return json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role, shopId: user.shop_id } });
      }

      // 2. Validar sesión vigente
      if (path === '/api/auth/me' && request.method === 'GET') {
        const session = await authenticate(request, env);
        if (!session) return json({ error: 'No autorizado' }, 401);
        return json({ ok: true, user: session });
      }

      // 1. Ruta Raíz (Bienvenida)
      if (path === '/') {
        return json({
          ok: true,
          message: 'SOS GLAM API activa',
          endpoints: [
            '/api/health',
            '/api/shops',
            '/peluquerias',
            '/servicios'
          ]
        });
      }

      // 2. Health check
      if (path === '/api/health') {
        return json({ ok: true, message: 'SOS GLAM API online', timestamp: new Date().toISOString() });
      }

      // 3. Obtener todas las tiendas / peluquerías (soporta varias rutas)
      if ((path === '/api/shops' || path === '/peluquerias' || path === '/api/locales') && request.method === 'GET') {
        const shops = await env.DB.prepare('SELECT * FROM shops ORDER BY created_at DESC').all();
        return json({ ok: true, shops: shops.results, peluquerias: shops.results });
      }

      // 4. Obtener todos los servicios (acceso directo)
      if ((path === '/servicios' || path === '/api/servicios') && request.method === 'GET') {
        const services = await env.DB.prepare('SELECT * FROM services WHERE active = 1 ORDER BY price ASC').all();
        return json({ ok: true, services: services.results });
      }

      // 5. Obtener un local específico por su slug
      const shopMatch = path.match(/^\/api\/shops\/([^/]+)$/);
      if (shopMatch && request.method === 'GET') {
        const slug = decodeURIComponent(shopMatch[1]);
        const shop = await env.DB.prepare('SELECT * FROM shops WHERE slug = ?').bind(slug).first();
        if (!shop) {
          return json({ error: 'Shop not found' }, 404);
        }

        const services = await env.DB.prepare('SELECT * FROM services WHERE shop_id = ? AND active = 1 ORDER BY price ASC').bind(shop.id).all();
        const barbers = await env.DB.prepare('SELECT * FROM barbers WHERE shop_id = ? AND active = 1 ORDER BY name ASC').bind(shop.id).all();

        return json({ shop, services: services.results, barbers: barbers.results });
      }

      // 6. Consultar agenda por tienda
      const agendaMatch = path.match(/^\/api\/shops\/([^/]+)\/agenda$/);
      if (agendaMatch && request.method === 'GET') {
        const session = await authenticate(request, env);
        if (!session) return json({ error: 'No autorizado' }, 401);
        const slug = decodeURIComponent(agendaMatch[1]);
        const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
        const shop = await env.DB.prepare('SELECT * FROM shops WHERE slug = ?').bind(slug).first();
        if (!shop) {
          return json({ error: 'Shop not found' }, 404);
        }

        const sql = `
          SELECT a.*, s.name AS service_name, s.price AS service_price, s.duration_minutes,
                 b.name AS barber_name, c.name AS customer_name, c.phone AS customer_phone
          FROM appointments a
          LEFT JOIN services s ON s.id = a.service_id
          LEFT JOIN barbers b ON b.id = a.barber_id
          LEFT JOIN customers c ON c.id = a.customer_id
          WHERE a.shop_id = ? AND date(a.scheduled_at) = date(?)
          ORDER BY a.scheduled_at ASC
        `;

        const appointments = await env.DB.prepare(sql).bind(shop.id, date).all();
        return json({ date, appointments: appointments.results });
      }

      // 7. Servicios por tienda
      const servicesMatch = path.match(/^\/api\/shops\/([^/]+)\/services$/);
      if (servicesMatch && request.method === 'GET') {
        const slug = decodeURIComponent(servicesMatch[1]);
        const shop = await env.DB.prepare('SELECT * FROM shops WHERE slug = ?').bind(slug).first();
        if (!shop) {
          return json({ error: 'Shop not found' }, 404);
        }

        const services = await env.DB.prepare('SELECT * FROM services WHERE shop_id = ? AND active = 1 ORDER BY price ASC').bind(shop.id).all();
        return json({ services: services.results });
      }

      // 8. Crear cita / reserva
      const appointmentsCreateMatch = path.match(/^\/api\/shops\/([^/]+)\/appointments$/);
      if (appointmentsCreateMatch && request.method === 'POST') {
        const slug = decodeURIComponent(appointmentsCreateMatch[1]);
        const shop = await env.DB.prepare('SELECT * FROM shops WHERE slug = ?').bind(slug).first();
        if (!shop) {
          return json({ error: 'Shop not found' }, 404);
        }

        const body = await request.json();
        const customerName = String(body.customerName || '').trim();
        const phone = String(body.phone || '').trim();
        const serviceId = String(body.serviceId || '').trim();
        const barberId = String(body.barberId || '').trim();
        const scheduledAt = String(body.scheduledAt || '').trim();

        if (!customerName || !phone || !serviceId || !scheduledAt) {
          return json({ error: 'Faltan campos obligatorios: customerName, phone, serviceId, scheduledAt' }, 400);
        }

        const service = await env.DB.prepare('SELECT * FROM services WHERE id = ? AND shop_id = ?').bind(serviceId, shop.id).first();
        if (!service) {
          return json({ error: 'Servicio no encontrado' }, 404);
        }

        let customer = await env.DB.prepare('SELECT * FROM customers WHERE shop_id = ? AND phone = ?').bind(shop.id, phone).first();
        if (!customer) {
          const customerId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO customers (id, shop_id, name, phone, whatsapp_opt_in)
            VALUES (?, ?, ?, ?, 1)
          `).bind(customerId, shop.id, customerName, phone).run();
          customer = { id: customerId };
        }

        const appointmentId = crypto.randomUUID();
        const finalBarberId = barberId || (await env.DB.prepare('SELECT id FROM barbers WHERE shop_id = ? ORDER BY name ASC LIMIT 1').bind(shop.id).first())?.id;

        if (!finalBarberId) {
          return json({ error: 'No hay barberos disponibles en este local' }, 400);
        }

        await env.DB.prepare(`
          INSERT INTO appointments (id, shop_id, customer_id, barber_id, service_id, scheduled_at, duration_minutes, status, reminder_sent, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
        `).bind(
          appointmentId,
          shop.id,
          customer.id,
          finalBarberId,
          service.id,
          scheduledAt,
          service.duration_minutes,
          body.notes || 'Reserva creada por el cliente'
        ).run();

        const created = await env.DB.prepare(`
          SELECT a.*, s.name AS service_name, b.name AS barber_name, c.name AS customer_name
          FROM appointments a
          LEFT JOIN services s ON s.id = a.service_id
          LEFT JOIN barbers b ON b.id = a.barber_id
          LEFT JOIN customers c ON c.id = a.customer_id
          WHERE a.id = ?
        `).bind(appointmentId).first();

        return json({ ok: true, appointment: created }, 201);
      }

      // 9. Actualizar estado de cita
      const statusPatchMatch = path.match(/^\/api\/appointments\/([^/]+)\/status$/);
      if (statusPatchMatch && request.method === 'PATCH') {
        const appointmentId = decodeURIComponent(statusPatchMatch[1]);
        const body = await request.json();
        const status = String(body.status || '').trim();

        if (!status) {
          return json({ error: 'Se requiere status' }, 400);
        }

        const result = await env.DB.prepare('UPDATE appointments SET status = ? WHERE id = ?').bind(status, appointmentId).run();
        if (result.meta.changes === 0) {
          return json({ error: 'Cita no encontrada' }, 404);
        }

        return json({ ok: true, id: appointmentId, status });
      }

      return json({ error: 'Ruta no encontrada', path }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: 'Error interno del servidor', details: error.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function base64UrlEncode(value) {
  let binary = '';
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signToken(header, payload, env) {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = encodedHeader + '.' + encodedPayload;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.AUTH_SECRET || 'sos-glam-development-secret-change-me'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return data + '.' + base64UrlEncode(new Uint8Array(signature));
}

async function createToken(payload, env) {
  return signToken({ alg: 'HS256', typ: 'JWT' }, payload, env);
}

async function authenticate(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.AUTH_SECRET || 'sos-glam-development-secret-change-me'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1])
    );
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
    if (!valid || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

async function verifyPassword(password, encodedHash) {
  try {
    const [algorithm, iterationsText, saltHex, expectedHex] = String(encodedHash || '').split('$');
    if (algorithm !== 'pbkdf2' || !iterationsText || !saltHex || !expectedHex) return false;
    const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((pair) => parseInt(pair, 16)));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: Number(iterationsText), hash: 'SHA-256' },
      key,
      expectedHex.length * 4
    );
    return base64UrlEncode(new Uint8Array(bits)) === base64UrlEncode(Uint8Array.from(expectedHex.match(/.{2}/g).map((pair) => parseInt(pair, 16))));
  } catch (error) {
    return false;
  }
}