-- Şubeler tablosu
CREATE TABLE branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city VARCHAR(100) NOT NULL UNIQUE,
  city_code VARCHAR(10) NOT NULL UNIQUE, -- İl plaka kodu
  region SMALLINT NOT NULL DEFAULT 1 CHECK (region BETWEEN 1 AND 8),
  branch_name VARCHAR(200) NOT NULL,
  president_name VARCHAR(200) NOT NULL,
  president_phone VARCHAR(20),
  president_email VARCHAR(100),
  address TEXT,
  coordinates_lat DECIMAL(10, 8), -- Harita için koordinatlar
  coordinates_lng DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- Örnek veri ekleme
INSERT INTO branches (city, city_code, branch_name, president_name, president_phone, president_email, address, coordinates_lat, coordinates_lng, region) VALUES
('İstanbul', '34', 'İstanbul Şubesi', 'Ahmet Yılmaz', '0212 555 0101', 'istanbul@sendika.org.tr', 'Fatih Mahallesi, Atatürk Caddesi No:45, Fatih/İstanbul', 41.0082, 28.9784, 1),
('Ankara', '06', 'Ankara Şubesi', 'Mehmet Demir', '0312 555 0102', 'ankara@sendika.org.tr', 'Kızılay Mahallesi, Cumhuriyet Caddesi No:123, Çankaya/Ankara', 39.9334, 32.8597, 2),
('İzmir', '35', 'İzmir Şubesi', 'Fatma Kaya', '0232 555 0103', 'izmir@sendika.org.tr', 'Alsancak Mahallesi, Kordon Caddesi No:67, Konak/İzmir', 38.4237, 27.1428, 3),
('Bursa', '16', 'Bursa Şubesi', 'Ali Özkan', '0224 555 0104', 'bursa@sendika.org.tr', 'Osmangazi Mahallesi, Atatürk Caddesi No:89, Osmangazi/Bursa', 40.1826, 29.0665, 1),
('Antalya', '07', 'Antalya Şubesi', 'Zeynep Arslan', '0242 555 0105', 'antalya@sendika.org.tr', 'Muratpaşa Mahallesi, Atatürk Bulvarı No:234, Muratpaşa/Antalya', 36.8969, 30.7133, 4);
