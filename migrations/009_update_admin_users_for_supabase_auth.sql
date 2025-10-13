-- Admin users tablosunu Supabase Auth ile uyumlu hale getir
-- password_hash sütununu kaldır çünkü Supabase Auth şifreleri yönetecek
-- id sütununu Supabase Auth user ID'si ile eşleştir

-- Önce mevcut password_hash sütununu kaldır
ALTER TABLE admin_users DROP COLUMN IF EXISTS password_hash;

-- id sütununu UUID olarak ayarla ve Supabase Auth user ID'si ile eşleştir
-- Mevcut id'ler varsa onları koruyalım ama yeni kayıtlar için Supabase Auth ID kullanacağız
ALTER TABLE admin_users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Supabase Auth ile entegrasyon için trigger oluştur
-- Yeni bir kullanıcı Supabase Auth'da oluşturulduğunda otomatik olarak admin_users tablosuna eklensin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Sadece admin kullanıcıları için kayıt oluştur
  -- Bu fonksiyon manuel olarak çağrılacak, otomatik değil
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mevcut admin kullanıcılarını güncelle
-- Email adresi admin@sendika.com olan kullanıcıyı bul ve güncelle
UPDATE admin_users 
SET updated_at = NOW()
WHERE email = 'admin@sendika.com';

-- İndeksleri güncelle
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_type ON admin_users(role_type);
