-- password: password123
INSERT INTO users (email, password_hash, role, name, phone, kota) VALUES
  ('user@test.com',  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user',  'Test User',  '081234567890', NULL),
  ('agent@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent', 'Test Agent', '081234567891', 'Depok'),
  ('mover@test.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'mover', 'Test Mover', '081234567892', NULL)
ON CONFLICT (email) DO NOTHING;
