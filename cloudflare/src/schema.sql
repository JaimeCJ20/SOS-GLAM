DROP TABLE IF EXISTS reminder_logs;
DROP TABLE IF EXISTS appointment_tokens;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS barbers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS shops;

-- 1. LOCALES (Shops)
CREATE TABLE shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  district TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_shops_district ON shops(district);

-- 2. USUARIOS / DUEÑOS (Users)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'staff')),
  password_hash TEXT NOT NULL,
  auth_provider TEXT DEFAULT 'email',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_shop ON users(shop_id);
CREATE INDEX idx_users_email ON users(lower(email));

-- 3. SERVICIOS (Services)
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  active INTEGER DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE INDEX idx_services_shop_active ON services(shop_id, active);

-- 4. BARBEROS / ESTILISTAS (Barbers)
CREATE TABLE barbers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  active INTEGER DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE INDEX idx_barbers_shop_active ON barbers(shop_id, active);

-- 5. CLIENTES (Customers)
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_opt_in INTEGER DEFAULT 1 CHECK (whatsapp_opt_in IN (0, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE INDEX idx_customers_shop_phone ON customers(shop_id, phone);

-- 6. CITAS (Appointments)
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  barber_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL, -- Formato ISO: YYYY-MM-THH:MM:SS
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'confirmada', 'arrived', 'llego', 'no_show', 'novino', 'cancelled', 'cancelada')),
  reminder_sent INTEGER DEFAULT 0 CHECK (reminder_sent IN (0, 1)),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(barber_id) REFERENCES barbers(id),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

-- Garantía Anti-Doble Cita
CREATE UNIQUE INDEX appointments_slot_idx
  ON appointments (shop_id, barber_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'cancelada');

-- Índice Compuesto para Carga Ultrarrápida de Agenda
CREATE INDEX idx_appointments_agenda
  ON appointments (shop_id, scheduled_at, status);

CREATE INDEX idx_appointments_customer
  ON appointments (customer_id);

-- 7. TOKENS DE CITA (Appointment Tokens)
CREATE TABLE appointment_tokens (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('confirm', 'cancel')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE INDEX idx_tokens_hash_action ON appointment_tokens(token_hash, action);

-- 8. REGISTRO DE RECORDATORIOS (Reminder Logs)
CREATE TABLE reminder_logs (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE INDEX idx_reminder_logs_appointment ON reminder_logs(appointment_id);