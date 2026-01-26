-- =====================================================
-- EYP Gönderen Kurum Bilgileri
-- site_settings tablosuna yeni kolonlar eklenir
-- =====================================================

-- Gönderen kurum bilgileri için kolonları ekle
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_kkk VARCHAR(20);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_mersis VARCHAR(20);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_name VARCHAR(500);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_phone VARCHAR(20);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_email VARCHAR(255);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_address TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_city VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS eyp_sender_district VARCHAR(100);

-- =====================================================
-- EYP Alıcı Kurumlar Tablosu
-- =====================================================
CREATE TABLE IF NOT EXISTS eyp_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Temel Bilgiler
    name VARCHAR(500) NOT NULL,                    -- Kurum Adı
    short_name VARCHAR(100),                       -- Kısa Ad
    kkk VARCHAR(20),                               -- Kurum Kayıt Kodu
    mersis VARCHAR(20),                            -- MERSIS Numarası
    vkn VARCHAR(11),                               -- Vergi Kimlik Numarası
    
    -- İletişim Bilgileri
    phone VARCHAR(20),                             -- Telefon
    fax VARCHAR(20),                               -- Faks
    email VARCHAR(255),                            -- E-posta
    website VARCHAR(255),                          -- Web sitesi
    
    -- Adres Bilgileri
    address TEXT,                                  -- Açık Adres
    postal_code VARCHAR(10),                       -- Posta Kodu
    district VARCHAR(100),                         -- İlçe
    city VARCHAR(100),                             -- İl
    country VARCHAR(100) DEFAULT 'Türkiye',        -- Ülke
    
    -- KEP Bilgileri (varsa)
    kep_address VARCHAR(255),                      -- KEP Adresi
    
    -- Kategori ve Durum
    organization_type VARCHAR(50) DEFAULT 'public', -- public, private, ngo, other
    is_active BOOLEAN DEFAULT true,
    is_favorite BOOLEAN DEFAULT false,             -- Sık kullanılanlar için
    
    -- Meta
    notes TEXT,                                    -- Notlar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_eyp_organizations_name ON eyp_organizations(name);
CREATE INDEX IF NOT EXISTS idx_eyp_organizations_kkk ON eyp_organizations(kkk);
CREATE INDEX IF NOT EXISTS idx_eyp_organizations_city ON eyp_organizations(city);
CREATE INDEX IF NOT EXISTS idx_eyp_organizations_is_active ON eyp_organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_eyp_organizations_is_favorite ON eyp_organizations(is_favorite);

-- RLS Policies
ALTER TABLE eyp_organizations ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
DROP POLICY IF EXISTS "eyp_organizations_select" ON eyp_organizations;
CREATE POLICY "eyp_organizations_select" ON eyp_organizations
    FOR SELECT USING (true);

-- Herkes yazabilir (uygulama seviyesinde kontrol edilir)
DROP POLICY IF EXISTS "eyp_organizations_insert" ON eyp_organizations;
CREATE POLICY "eyp_organizations_insert" ON eyp_organizations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "eyp_organizations_update" ON eyp_organizations;
CREATE POLICY "eyp_organizations_update" ON eyp_organizations
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "eyp_organizations_delete" ON eyp_organizations;
CREATE POLICY "eyp_organizations_delete" ON eyp_organizations
    FOR DELETE USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_eyp_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eyp_organizations_updated_at ON eyp_organizations;
CREATE TRIGGER eyp_organizations_updated_at
    BEFORE UPDATE ON eyp_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_eyp_organizations_updated_at();

COMMENT ON TABLE eyp_organizations IS 'EYP paketlerinde kullanılacak alıcı kurum bilgileri';
