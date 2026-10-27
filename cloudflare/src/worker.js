export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // 1. Manejo de peticiones preflight (CORS)
    if (request.method === "OPTIONS") {
      return json(null, 204);
    }

    // 2. Enrutador de Assets Estáticos con URLs Limpias (Sin .html visible)
    if (env.ASSETS && request.method === "GET" && !path.startsWith("/api/")) {
      let assetPath = path;

      // Mapeo de rutas públicas y privadas
      if (path === "/") assetPath = "/index.html";
      else if (path === "/login") assetPath = "/login.html";
      else if (path === "/registro") assetPath = "/registro.html";
      else if (path === "/panel") assetPath = "/panel/index.html";
      else if (path === "/panel/servicios") assetPath = "/panel/servicios.html";
      else if (path === "/panel/configuracion") assetPath = "/panel/configuracion.html";
      else if (path.startsWith("/cita/")) assetPath = "/cita.html";
      else if (!path.includes(".")) assetPath = "/reservar.html"; // Slug dinámico del local (ej. /el-flaco)

      const assetReq = new Request(new URL(assetPath, request.url), request);
      const response = await env.ASSETS.fetch(assetReq);
      if (response.status !== 404) return response;
    }

    try {
      // ENDPOINTS PÚBLICOS Y SISTEMA

      // Estado del sistema
      if (path === "/" || path === "/api/health") {
        return json({
          ok: true,
          brand: "StylisHub",
          message: "StylisHub API activa y operacional",
          timestamp: new Date().toISOString(),
        });
      }

      // AUTENTICACIÓN Y REGISTRO B2B

      // Registro inicial de local y cuenta de dueño
      if (path === "/api/auth/register" && request.method === "POST") {
        const body = await request.json();
        const shopName = String(body.shopName || "").trim();
        const ownerName = String(body.ownerName || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        // Campos opcionales del local
        const address = String(body.address || "").trim();
        const district = String(body.district || "").trim();
        const city = String(body.city || "Lima").trim();
        const country = String(body.country || "PE").trim();
        const phone = String(body.phone || "").trim();
        const whatsapp = String(body.whatsapp || phone).trim();
        const taxId = String(body.taxId || "").trim();
        const docType = String(body.docType || "DNI").trim();
        const docNumber = String(body.docNumber || "").trim();
        const services = Array.isArray(body.services) ? body.services : [];

        if (!shopName || !ownerName || !email || !password) {
          return json({ error: "Completa el nombre del local, tu nombre, correo y contraseña" }, 400);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
          return json({ error: "Usa un correo válido y una contraseña de al menos 8 caracteres" }, 400);
        }

        const existingUser = await env.DB.prepare("SELECT id FROM users WHERE lower(email) = ?")
          .bind(email)
          .first();
        if (existingUser) return json({ error: "Ya existe una cuenta registrada con este correo" }, 409);

        // Generar slug único
        const baseSlug = slugify(shopName) || "mi-local";
        let slug = baseSlug;
        let suffix = 2;
        while (
          suffix < 100 &&
          (await env.DB.prepare("SELECT id FROM shops WHERE slug = ?").bind(slug).first())
        ) {
          slug = `${baseSlug}-${suffix++}`;
        }

        const shopId = crypto.randomUUID();
        const userId = crypto.randomUUID();
        const barberId = crypto.randomUUID();
        const passwordHash = await hashPassword(password);
        const createdAt = new Date().toISOString();

        const statements = [
          env.DB.prepare(
            `INSERT INTO shops (id, name, slug, address, district, city, country, phone, whatsapp, tax_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(shopId, shopName, slug, address || null, district || null, city, country, phone || null, whatsapp || null, taxId || null, createdAt),
          
          env.DB.prepare(
            `INSERT INTO users (id, shop_id, email, name, phone, doc_type, doc_number, role, password_hash, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'owner', ?, ?)`
          ).bind(userId, shopId, email, ownerName, phone || null, docType, docNumber || null, passwordHash, createdAt),

          env.DB.prepare(
            `INSERT INTO barbers (id, shop_id, name, specialty, active)
             VALUES (?, ?, ?, 'Propietario / Principal', 1)`
          ).bind(barberId, shopId, ownerName)
        ];

        // Procesar servicios iniciales
        const validServices = services
          .map((svc) => {
            const name = String(svc.name || "").trim().slice(0, 80);
            const price = Number(svc.price);
            const duration = Number(svc.durationMinutes || svc.duration);
            if (!name || isNaN(price) || price < 0 || isNaN(duration) || duration < 5) return null;
            return { id: crypto.randomUUID(), name, price, duration };
          })
          .filter(Boolean)
          .slice(0, 30);

        if (!validServices.length) {
          validServices.push({ id: crypto.randomUUID(), name: "Corte Tradicional", price: 30, duration: 30 });
        }

        validServices.forEach((svc) => {
          statements.push(
            env.DB.prepare(
              `INSERT INTO services (id, shop_id, name, price, duration_minutes, active) VALUES (?, ?, ?, ?, ?, 1)`
            ).bind(svc.id, shopId, svc.name, svc.price, svc.duration)
          );
        });

        await env.DB.batch(statements);

        const token = await createToken(
          { sub: userId, shopId, email, role: "owner", exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
          env
        );

        return json({
          ok: true,
          token,
          user: { id: userId, email, name: ownerName, role: "owner", shopId },
          shop: { id: shopId, name: shopName, slug },
        }, 201);
      }

      // Inicio de sesión para dueños
      if (path === "/api/auth/login" && request.method === "POST") {
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");

        const user = await env.DB.prepare(
          "SELECT id, shop_id, email, name, role, password_hash FROM users WHERE lower(email) = ?"
        ).bind(email).first();

        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return json({ error: "Correo o contraseña incorrectos" }, 401);
        }

        const token = await createToken(
          { sub: user.id, shopId: user.shop_id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
          env
        );

        return json({
          ok: true,
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role, shopId: user.shop_id },
        });
      }

      // Validar sesión del usuario autenticado
      if (path === "/api/auth/me" && request.method === "GET") {
        const session = await authenticate(request, env);
        if (!session) return json({ error: "No autorizado" }, 401);

        const shop = await env.DB.prepare("SELECT * FROM shops WHERE id = ?").bind(session.shopId).first();
        return json({ ok: true, user: session, shop });
      }

      // GESTIÓN DE LOCALES Y PERFILES PÚBLICOS

      // Búsqueda y listado de tiendas activas (Buscador general)
      if (path === "/api/shops" && request.method === "GET") {
        const district = url.searchParams.get("district");
        let query = "SELECT id, name, slug, address, district, city, phone, whatsapp, instagram, logo_url FROM shops WHERE active = 1";
        const params = [];

        if (district) {
          query += " AND lower(district) = ?";
          params.push(district.toLowerCase());
        }
        query += " ORDER BY name ASC";

        const shops = await env.DB.prepare(query).bind(...params).all();
        return json({ ok: true, shops: shops.results });
      }

      // Obtener perfil público del local por Slug (Servicios + Barberos)
      const shopMatch = path.match(/^\/api\/shops\/([^/]+)$/);
      if (shopMatch && request.method === "GET") {
        const slug = decodeURIComponent(shopMatch[1]);
        const shop = await env.DB.prepare("SELECT * FROM shops WHERE slug = ? AND active = 1").bind(slug).first();
        if (!shop) return json({ error: "Local no encontrado" }, 404);

        const services = await env.DB.prepare("SELECT * FROM services WHERE shop_id = ? AND active = 1 ORDER BY price ASC")
          .bind(shop.id).all();
        const barbers = await env.DB.prepare("SELECT * FROM barbers WHERE shop_id = ? AND active = 1 ORDER BY name ASC")
          .bind(shop.id).all();

        return json({ shop, services: services.results, barbers: barbers.results });
      }

      // Actualizar configuración del local (Privado)
      if (shopMatch && request.method === "PATCH") {
        const session = await authenticate(request, env);
        if (!session) return json({ error: "No autorizado" }, 401);

        const slug = decodeURIComponent(shopMatch[1]);
        const shop = await env.DB.prepare("SELECT id FROM shops WHERE slug = ?").bind(slug).first();
        if (!shop || shop.id !== session.shopId) {
          return json({ error: "Acceso denegado" }, 403);
        }

        const body = await request.json();
        await env.DB.prepare(
          `UPDATE shops SET 
            address = COALESCE(?, address),
            district = COALESCE(?, district),
            city = COALESCE(?, city),
            country = COALESCE(?, country),
            phone = COALESCE(?, phone),
            whatsapp = COALESCE(?, whatsapp),
            instagram = COALESCE(?, instagram),
            tiktok = COALESCE(?, tiktok),
            tax_id = COALESCE(?, tax_id),
            opening_time = COALESCE(?, opening_time),
            closing_time = COALESCE(?, closing_time)
           WHERE id = ?`
        ).bind(
          body.address !== undefined ? String(body.address).trim() : null,
          body.district !== undefined ? String(body.district).trim() : null,
          body.city !== undefined ? String(body.city).trim() : null,
          body.country !== undefined ? String(body.country).trim() : null,
          body.phone !== undefined ? String(body.phone).trim() : null,
          body.whatsapp !== undefined ? String(body.whatsapp).trim() : null,
          body.instagram !== undefined ? String(body.instagram).trim() : null,
          body.tiktok !== undefined ? String(body.tiktok).trim() : null,
          body.taxId !== undefined ? String(body.taxId).trim() : null,
          body.openingTime !== undefined ? String(body.openingTime).trim() : null,
          body.closingTime !== undefined ? String(body.closingTime).trim() : null,
          session.shopId
        ).run();

        return json({ ok: true, message: "Configuración actualizada correctamente" });
      }

      // GESTIÓN DE SERVICIOS

      const servicesMatch = path.match(/^\/api\/shops\/([^/]+)\/services$/);
      if (servicesMatch && request.method === "POST") {
        const session = await authenticate(request, env);
        if (!session) return json({ error: "No autorizado" }, 401);

        const body = await request.json();
        const name = String(body.name || "").trim();
        const price = Number(body.price);
        const durationMinutes = Number(body.durationMinutes || 30);
        const category = String(body.category || "General").trim();

        if (!name || isNaN(price) || price < 0 || durationMinutes <= 0) {
          return json({ error: "Nombre, precio o duración inválidos" }, 400);
        }

        const serviceId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO services (id, shop_id, name, category, price, duration_minutes, active) VALUES (?, ?, ?, ?, ?, ?, 1)`
        ).bind(serviceId, session.shopId, name, category, price, durationMinutes).run();

        return json({ ok: true, id: serviceId, message: "Servicio creado correctamente" }, 201);
      }

      const serviceToggleMatch = path.match(/^\/api\/services\/([^/]+)\/toggle$/);
      if (serviceToggleMatch && request.method === "PATCH") {
        const session = await authenticate(request, env);
        if (!session) return json({ error: "No autorizado" }, 401);

        const serviceId = decodeURIComponent(serviceToggleMatch[1]);
        const body = await request.json();
        const activeState = body.active ? 1 : 0;

        await env.DB.prepare(`UPDATE services SET active = ? WHERE id = ? AND shop_id = ?`)
          .bind(activeState, serviceId, session.shopId).run();

        return json({ ok: true, id: serviceId, active: activeState });
      }

      // AGENDA Y CITAS (Reserva Web + Walk-in Presencial)

      // Consultar agenda del día por tienda (Privado)
      const agendaMatch = path.match(/^\/api\/shops\/([^/]+)\/agenda$/);
      if (agendaMatch && request.method === "GET") {
        const session = await authenticate(request, env);
        if (!session) return json({ error: "No autorizado" }, 401);

        const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
        const sql = `
          SELECT a.*, s.name AS service_name, s.price AS service_price,
                 b.name AS barber_name, c.name AS customer_name, c.phone AS customer_phone, c.no_show_count
          FROM appointments a
          LEFT JOIN services s ON s.id = a.service_id
          LEFT JOIN barbers b ON b.id = a.barber_id
          LEFT JOIN customers c ON c.id = a.customer_id
          WHERE a.shop_id = ? AND date(a.scheduled_at) = date(?)
          ORDER BY a.scheduled_at ASC
        `;

        const appointments = await env.DB.prepare(sql).bind(session.shopId, date).all();
        return json({ date, appointments: appointments.results });
      }

      // Crear Reserva (Guest Checkout o Walk-In)
      const appointmentsCreateMatch = path.match(/^\/api\/shops\/([^/]+)\/appointments$/);
      if (appointmentsCreateMatch && request.method === "POST") {
        const slug = decodeURIComponent(appointmentsCreateMatch[1]);
        const shop = await env.DB.prepare("SELECT * FROM shops WHERE slug = ?").bind(slug).first();
        if (!shop) return json({ error: "Local no encontrado" }, 404);

        const body = await request.json();
        const customerName = String(body.customerName || "").trim();
        const phone = String(body.phone || "").trim();
        const email = String(body.email || "").trim();
        const serviceId = String(body.serviceId || "").trim();
        const barberId = String(body.barberId || "").trim();
        const scheduledAt = String(body.scheduledAt || "").trim();
        const isWalkIn = body.isWalkIn ? 1 : 0;

        if (!customerName || !phone || !serviceId || !scheduledAt) {
          return json({ error: "Completa todos los campos obligatorios para agendar" }, 400);
        }

        const service = await env.DB.prepare("SELECT * FROM services WHERE id = ? AND shop_id = ?")
          .bind(serviceId, shop.id).first();
        if (!service) return json({ error: "Servicio no seleccionado" }, 404);

        // Registro o vinculación automática del cliente sin login
        let customer = await env.DB.prepare("SELECT id FROM customers WHERE shop_id = ? AND phone = ?")
          .bind(shop.id, phone).first();
        let customerId;

        if (!customer) {
          customerId = crypto.randomUUID();
          await env.DB.prepare(
            `INSERT INTO customers (id, shop_id, name, phone, email, total_appointments, no_show_count)
             VALUES (?, ?, ?, ?, ?, 1, 0)`
          ).bind(customerId, shop.id, customerName, phone, email || null).run();
        } else {
          customerId = customer.id;
          await env.DB.prepare(
            `UPDATE customers SET name = ?, email = COALESCE(?, email), total_appointments = total_appointments + 1 WHERE id = ?`
          ).bind(customerName, email || null, customerId).run();
        }

        const finalBarberId = barberId || (await env.DB.prepare("SELECT id FROM barbers WHERE shop_id = ? AND active = 1 LIMIT 1").bind(shop.id).first())?.id;
        if (!finalBarberId) return json({ error: "No hay barberos o sillas disponibles" }, 400);

        // Verificación de traslape/ocupación
        const occupied = await env.DB.prepare(
          `SELECT id FROM appointments WHERE shop_id = ? AND barber_id = ? AND scheduled_at = ? AND status NOT IN ('cancelled', 'cancelada') LIMIT 1`
        ).bind(shop.id, finalBarberId, scheduledAt).first();
        if (occupied) return json({ error: "Ese horario ya fue reservado" }, 409);

        const appointmentId = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO appointments (id, shop_id, customer_id, barber_id, service_id, scheduled_at, duration_minutes, status, is_walk_in, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        ).bind(appointmentId, shop.id, customerId, finalBarberId, service.id, scheduledAt, service.duration_minutes, isWalkIn, String(body.notes || "").slice(0, 300)).run();

        // Generar Tokens de Acción Instantánea por WhatsApp (1-Clic)
        const actionTokens = {};
        for (const action of ["confirm", "cancel"]) {
          const rawToken = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
          await env.DB.prepare(
            `INSERT INTO appointment_tokens (id, appointment_id, token_hash, action, expires_at) VALUES (?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), appointmentId, await hashToken(rawToken), action, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()).run();
          actionTokens[action] = rawToken;
        }

        return json({ ok: true, appointmentId, actionTokens, message: "Cita reservada correctamente" }, 201);
      }

      // Consulta de citas por teléfono (Rescate desde celular)
      if (path === "/api/customers/lookup" && request.method === "GET") {
        const phone = url.searchParams.get("phone");
        if (!phone) return json({ error: "Ingresa tu número de teléfono" }, 400);

        const appointments = await env.DB.prepare(
          `SELECT a.*, s.name AS service_name, s.price AS service_price, sh.name AS shop_name, sh.slug AS shop_slug
           FROM appointments a
           JOIN customers c ON c.id = a.customer_id
           JOIN services s ON s.id = a.service_id
           JOIN shops sh ON sh.id = a.shop_id
           WHERE c.phone = ? AND a.scheduled_at >= date('now', '-1 day')
           ORDER BY a.scheduled_at DESC`
        ).bind(phone).all();

        return json({ ok: true, appointments: appointments.results });
      }

      // Acción pública mediante Token de WhatsApp (Confirmar / Cancelar en 1-Clic)
      if (path === "/api/appointments/action" && request.method === "POST") {
        const body = await request.json();
        const token = String(body.token || "").trim();
        const action = String(body.action || "").trim().toLowerCase();

        if (!token || !["confirm", "cancel"].includes(action)) {
          return json({ error: "Token o acción no válida" }, 400);
        }

        const tokenRecord = await env.DB.prepare(
          `SELECT id, appointment_id FROM appointment_tokens WHERE token_hash = ? AND action = ? AND used_at IS NULL AND expires_at > ? LIMIT 1`
        ).bind(await hashToken(token), action, new Date().toISOString()).first();

        if (!tokenRecord) return json({ error: "El enlace ya caducó o fue utilizado" }, 410);

        await env.DB.prepare(`UPDATE appointment_tokens SET used_at = ? WHERE id = ?`).bind(new Date().toISOString(), tokenRecord.id).run();

        const status = action === "cancel" ? "cancelada" : "confirmada";
        await env.DB.prepare(`UPDATE appointments SET status = ? WHERE id = ?`).bind(status, tokenRecord.appointment_id).run();

        return json({ ok: true, appointmentId: tokenRecord.appointment_id, status });
      }

      // Actualizar Estado de Cita desde el Dashboard
      const statusPatchMatch = path.match(/^\/api\/appointments\/([^/]+)\/status$/);
      if (statusPatchMatch && request.method === "PATCH") {
        const session = await authenticate(request, env);
        if (!session) return json({ error: "No autorizado" }, 401);

        const appointmentId = decodeURIComponent(statusPatchMatch[1]);
        const body = await request.json();
        const status = String(body.status || "").trim().toLowerCase();

        const appointment = await env.DB.prepare("SELECT customer_id FROM appointments WHERE id = ? AND shop_id = ?")
          .bind(appointmentId, session.shopId).first();

        if (!appointment) return json({ error: "Cita no encontrada" }, 404);

        await env.DB.prepare(`UPDATE appointments SET status = ? WHERE id = ?`).bind(status, appointmentId).run();

        // Incrementar contador de no-show si el cliente faltó
        if (status === "novino" || status === "no_show") {
          await env.DB.prepare(`UPDATE customers SET no_show_count = no_show_count + 1 WHERE id = ?`)
            .bind(appointment.customer_id).run();
        }

        return json({ ok: true, id: appointmentId, status });
      }

      return json({ error: "Ruta no encontrada" }, 404);
    } catch (error) {
      console.error("Worker Error:", error);
      return json({ error: "Error interno en el servidor", details: error.message }, 500);
    }
  },
};

// FUNCIONES AUXILIARES CENTRALIZADAS

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      /* Encabezados de Seguridad HTTP */
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

function base64UrlEncode(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function createToken(payload, env) {
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.AUTH_SECRET || "stylishub-secret-key-development"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function authenticate(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.AUTH_SECRET || "stylishub-secret-key-development"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
    if (!valid || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64UrlEncode(new Uint8Array(digest));
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$100000$${saltHex}$${hashHex}`;
}

async function verifyPassword(password, encodedHash) {
  try {
    const [algorithm, iterations, saltHex, expectedHex] = String(encodedHash || "").split("$");
    if (algorithm !== "pbkdf2" || !saltHex || !expectedHex) return false;

    const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((pair) => parseInt(pair, 16)));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: Number(iterations), hash: "SHA-256" }, key, expectedHex.length * 4);

    const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex === expectedHex;
  } catch {
    return false;
  }
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}