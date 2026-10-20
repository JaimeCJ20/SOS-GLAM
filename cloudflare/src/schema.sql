DROP TABLE IF EXISTS reminder_logs;
DROP TABLE IF EXISTS appointment_tokens;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS barbers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS shops;

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

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'owner',
  password_hash TEXT NOT NULL,
  auth_provider TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id)
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(shop_id) REFERENCES shops(id)
);

CREATE TABLE barbers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(shop_id) REFERENCES shops(id)
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp_opt_in INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id)
);

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  customer_id TEXT,
  barber_id TEXT,
  service_id TEXT,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reminder_sent INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shop_id) REFERENCES shops(id),
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(barber_id) REFERENCES barbers(id),
  FOREIGN KEY(service_id) REFERENCES services(id)
);

CREATE UNIQUE INDEX appointments_slot_idx
  ON appointments (shop_id, barber_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'cancelada');

CREATE TABLE appointment_tokens (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('confirm', 'cancel')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id)
);

CREATE TABLE reminder_logs (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id)
);
