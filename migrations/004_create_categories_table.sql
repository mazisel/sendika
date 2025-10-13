-- Kategori tablosu oluştur
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex renk kodu
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Haber tablosuna kategori_id sütunu ekle
ALTER TABLE news ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Varsayılan kategoriler ekle
INSERT INTO categories (name, slug, description, color, sort_order) VALUES
('Genel', 'genel', 'Genel haberler ve duyurular', '#3B82F6', 1),
('Sendika Faaliyetleri', 'sendika-faaliyetleri', 'Sendika etkinlikleri ve toplantıları', '#10B981', 2),
('İş Güvenliği', 'is-guvenligi', 'İş güvenliği ile ilgili haberler', '#F59E0B', 3),
('Hukuki Gelişmeler', 'hukuki-gelismeler', 'Hukuki düzenlemeler ve gelişmeler', '#EF4444', 4),
('Eğitim', 'egitim', 'Eğitim programları ve kurslar', '#8B5CF6', 5),
('Sosyal Etkinlikler', 'sosyal-etkinlikler', 'Sosyal ve kültürel etkinlikler', '#EC4899', 6);

-- Trigger fonksiyonu oluştur (updated_at otomatik güncelleme için)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger ekle
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- İndeksler ekle
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_news_category_id ON news(category_id);
