-- Admin rollerini genişlet ve bölge bazlı yetkilendirme alanlarını ekle

-- admin_users tablosu: yeni rol tipleri ve bölge alanı
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS region SMALLINT CHECK (region BETWEEN 1 AND 8);

ALTER TABLE admin_users
  ALTER COLUMN role_type SET DEFAULT 'general_manager';

ALTER TABLE admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_type_check;

ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_type_check
  CHECK (
    role_type IS NULL
    OR role_type IN ('general_manager', 'regional_manager', 'branch_manager')
  );

CREATE INDEX IF NOT EXISTS idx_admin_users_region ON admin_users(region);

-- members tablosu: bölge bilgisini sakla
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS region SMALLINT CHECK (region BETWEEN 1 AND 8);

UPDATE members m
SET region = b.region
FROM branches b
WHERE m.city = b.city
  AND b.region IS NOT NULL
  AND (m.region IS NULL OR m.region <> b.region);

CREATE INDEX IF NOT EXISTS idx_members_region ON members(region);
