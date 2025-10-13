-- Admin kullanıcıları tablosunu güncelle - şube yöneticileri için il bilgisi ekle
ALTER TABLE admin_users 
ADD COLUMN city VARCHAR(100),
ADD COLUMN role_type VARCHAR(50) DEFAULT 'general_manager' CHECK (role_type IN ('general_manager', 'branch_manager'));

-- Mevcut role sütununu güncelle
ALTER TABLE admin_users 
DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'super_admin', 'branch_manager'));

-- Üye başvuruları tablosuna il bilgisi ekle
ALTER TABLE members 
ADD COLUMN city VARCHAR(100);

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_admin_users_city ON admin_users(city);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_type ON admin_users(role_type);
CREATE INDEX IF NOT EXISTS idx_members_city ON members(city);

-- Örnek şube yöneticisi kullanıcısı ekle
INSERT INTO admin_users (email, password_hash, full_name, role, role_type, city) 
VALUES ('istanbul@sendika.com', '$2b$10$oTlyMCBvljNIK3oYYLZeEO2zyqU4PLyC3hoTscVBks6fWz7ov6YTm', 'İstanbul Şube Yöneticisi', 'branch_manager', 'branch_manager', 'İstanbul')
ON CONFLICT (email) DO NOTHING;

INSERT INTO admin_users (email, password_hash, full_name, role, role_type, city) 
VALUES ('ankara@sendika.com', '$2b$10$oTlyMCBvljNIK3oYYLZeEO2zyqU4PLyC3hoTscVBks6fWz7ov6YTm', 'Ankara Şube Yöneticisi', 'branch_manager', 'branch_manager', 'Ankara')
ON CONFLICT (email) DO NOTHING;
