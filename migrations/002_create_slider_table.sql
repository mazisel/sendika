-- Slider tablosu oluştur
CREATE TABLE IF NOT EXISTS sliders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    button_text VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Slider tablosu için RLS politikaları
ALTER TABLE sliders ENABLE ROW LEVEL SECURITY;

-- Herkes slider'ları okuyabilir
CREATE POLICY "Anyone can view active sliders" ON sliders
    FOR SELECT USING (is_active = true);

-- Sadece admin'ler slider'ları yönetebilir
CREATE POLICY "Admins can manage sliders" ON sliders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid()
        )
    );

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sliders_updated_at BEFORE UPDATE
    ON sliders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Örnek slider verileri
INSERT INTO sliders (title, description, image_url, link_url, button_text, sort_order) VALUES
('İşçi Haklarını Koruyoruz', 'Güçlü birliktelik, adil çalışma koşulları ve sosyal adalet için buradayız', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', '#hakkimizda', 'Daha Fazla Bilgi', 1),
('Üye Ol ve Haklarını Koru', 'Sendikamıza katılarak güçlü bir dayanışma ağının parçası olun', 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', '#', 'Üye Ol', 2),
('Hukuki Destek Hizmetleri', 'İş hukuku konularında profesyonel danışmanlık ve destek alın', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', '#hizmetler', 'Hizmetlerimizi İncele', 3);
