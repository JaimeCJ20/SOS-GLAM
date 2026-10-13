-- Ejecutar una sola vez sobre una base D1 existente.
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';

UPDATE users
SET password_hash = 'pbkdf2$150000$75a90aec467e36268a248e8e7d2ea949$554d04877a5439723fd7facc6e9e61125b8b507cf2ece3bbb9242b02afd44b1a'
WHERE email IN ('juan@elflaco.pe', 'admin@estilocorte.pe', 'hola@lasabarber.pe');
