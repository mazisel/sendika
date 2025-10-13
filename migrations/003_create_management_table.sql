CREATE TABLE management (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  position_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE management ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Anyone can view active management" ON management
  FOR SELECT USING (is_active = true);

-- Sadece authenticated kullanıcılar ekleyebilir/güncelleyebilir/silebilir
CREATE POLICY "Authenticated users can insert management" ON management
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update management" ON management
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete management" ON management
  FOR DELETE USING (auth.role() = 'authenticated');

-- Güncelleme zamanı için trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_management_updated_at BEFORE UPDATE
    ON management FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
