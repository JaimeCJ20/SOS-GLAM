INSERT INTO shops (id, name, slug, address, district, phone, whatsapp, instagram)
VALUES
  ('shop_001', 'Barbería El Flaco', 'el-flaco', 'Av. Larco 123', 'Miraflores', '014567890', '51987654321', '@elflacobarber'),
  ('shop_002', 'Estilo & Corte', 'estilo-corte', 'Calle Los Álamos 456', 'Surquillo', '013334455', '51991234567', '@estilocorte.pe'),
  ('shop_003', 'LASA Barber Studio', 'lasa-barber', 'Jr. Pardo 72', 'San Isidro', '012345678', '51993332211', '@lasabarber');

INSERT INTO users (id, shop_id, email, name, role, password_hash, auth_provider)
VALUES
  ('user_001', 'shop_001', 'juan@elflaco.pe', 'Juan Pérez', 'owner', 'pbkdf2$150000$75a90aec467e36268a248e8e7d2ea949$554d04877a5439723fd7facc6e9e61125b8b507cf2ece3bbb9242b02afd44b1a', 'email'),
  ('user_002', 'shop_002', 'admin@estilocorte.pe', 'Ana García', 'owner', 'pbkdf2$150000$75a90aec467e36268a248e8e7d2ea949$554d04877a5439723fd7facc6e9e61125b8b507cf2ece3bbb9242b02afd44b1a', 'email'),
  ('user_003', 'shop_003', 'hola@lasabarber.pe', 'Sergio Ramos', 'owner', 'pbkdf2$150000$75a90aec467e36268a248e8e7d2ea949$554d04877a5439723fd7facc6e9e61125b8b507cf2ece3bbb9242b02afd44b1a', 'email');

INSERT INTO services (id, shop_id, name, price, duration_minutes, active)
VALUES
  ('svc_001', 'shop_001', 'Corte clásico', 25, 45, 1),
  ('svc_002', 'shop_001', 'Fade premium', 35, 60, 1),
  ('svc_003', 'shop_001', 'Barba', 15, 30, 1),
  ('svc_004', 'shop_001', 'Corte + barba', 40, 75, 1),
  ('svc_005', 'shop_001', 'Perfilado', 12, 20, 1),

  ('svc_006', 'shop_002', 'Corte', 30, 45, 1),
  ('svc_007', 'shop_002', 'Corte + barba', 45, 75, 1),
  ('svc_008', 'shop_002', 'Tinte', 80, 90, 1),
  ('svc_009', 'shop_002', 'Lavado y secado', 18, 25, 1),

  ('svc_010', 'shop_003', 'Corte premium', 38, 60, 1),
  ('svc_011', 'shop_003', 'Barba diseño', 25, 35, 1),
  ('svc_012', 'shop_003', 'Afeitado clásico', 20, 30, 1),
  ('svc_013', 'shop_003', 'Corte + barba', 52, 90, 1);

INSERT INTO barbers (id, shop_id, name, specialty, active)
VALUES
  ('bar_001', 'shop_001', 'Juan', 'Fade y cortes modernos', 1),
  ('bar_002', 'shop_001', 'Carlos', 'Cortes clásicos y perfilados', 1),
  ('bar_003', 'shop_001', 'Mía', 'Barba y diseño', 1),

  ('bar_004', 'shop_002', 'Renzo', 'Corte clásico', 1),
  ('bar_005', 'shop_002', 'Diego', 'Fade premium', 1),
  ('bar_006', 'shop_002', 'Luis', 'Tinte y color', 1),

  ('bar_007', 'shop_003', 'Sergio', 'Cortes premium', 1),
  ('bar_008', 'shop_003', 'Andrés', 'Barba y afeitado', 1),
  ('bar_009', 'shop_003', 'Pablo', 'Fade y estilos', 1);

INSERT INTO customers (id, shop_id, name, phone, whatsapp_opt_in)
VALUES
  ('cust_001', 'shop_001', 'Carlos Ruiz', '987654321', 1),
  ('cust_002', 'shop_001', 'Pedro Mena', '953112233', 1),
  ('cust_003', 'shop_001', 'María Torres', '968774455', 1),
  ('cust_004', 'shop_001', 'Diego Salazar', '944556677', 1),

  ('cust_005', 'shop_002', 'Renzo Silva', '912345678', 1),
  ('cust_006', 'shop_002', 'Javier Ortega', '981234567', 1),
  ('cust_007', 'shop_002', 'Sofía Gómez', '955667788', 1),
  ('cust_008', 'shop_002', 'Mateo Quispe', '999001122', 1),

  ('cust_009', 'shop_003', 'Alex Paredes', '933221144', 1),
  ('cust_010', 'shop_003', 'Bruno Vega', '986554433', 1),
  ('cust_011', 'shop_003', 'Felipe Castro', '941122334', 1),
  ('cust_012', 'shop_003', 'Miguel Rojas', '978665544', 1);

INSERT INTO appointments (id, shop_id, customer_id, barber_id, service_id, scheduled_at, duration_minutes, status, reminder_sent, notes)
VALUES
  ('appt_001', 'shop_001', 'cust_001', 'bar_001', 'svc_002', '2026-10-12T16:00:00', 60, 'confirmed', 1, 'Cliente habitual'),
  ('appt_002', 'shop_001', 'cust_002', 'bar_002', 'svc_001', '2026-10-12T11:30:00', 45, 'pending', 0, 'Solicitó corte clásico'),
  ('appt_003', 'shop_001', 'cust_003', 'bar_003', 'svc_004', '2026-10-12T18:30:00', 75, 'arrived', 1, 'Corte + barba'),
  ('appt_004', 'shop_001', 'cust_004', 'bar_001', 'svc_003', '2026-10-12T09:00:00', 30, 'no_show', 1, 'No avisó'),

  ('appt_005', 'shop_002', 'cust_005', 'bar_004', 'svc_006', '2026-10-13T13:00:00', 45, 'pending', 0, 'Reserva por Instagram'),
  ('appt_006', 'shop_002', 'cust_006', 'bar_005', 'svc_007', '2026-10-13T17:30:00', 75, 'confirmed', 1, 'Cliente con cita repetida'),
  ('appt_007', 'shop_002', 'cust_007', 'bar_006', 'svc_008', '2026-10-13T15:00:00', 90, 'pending', 0, 'Tinte con tono oscuro'),

  ('appt_008', 'shop_003', 'cust_009', 'bar_007', 'svc_010', '2026-10-14T12:00:00', 60, 'confirmed', 1, 'Corte premium'),
  ('appt_009', 'shop_003', 'cust_010', 'bar_008', 'svc_011', '2026-10-14T14:30:00', 35, 'pending', 0, 'Barba diseño'),
  ('appt_010', 'shop_003', 'cust_011', 'bar_009', 'svc_013', '2026-10-14T19:00:00', 90, 'cancelled', 1, 'Se canceló por traslado'),
  ('appt_011', 'shop_003', 'cust_012', 'bar_007', 'svc_010', '2026-10-14T18:00:00', 60, 'arrived', 1, 'Llega puntual');

INSERT INTO reminder_logs (id, appointment_id, sent_at, channel, status)
VALUES
  ('log_001', 'appt_001', '2026-10-11T16:00:00', 'whatsapp', 'sent'),
  ('log_002', 'appt_006', '2026-10-12T09:00:00', 'whatsapp', 'sent'),
  ('log_003', 'appt_008', '2026-10-13T10:00:00', 'whatsapp', 'sent');
