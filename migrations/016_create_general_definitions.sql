-- Genel tanımlamalar tablosu (işyeri, pozisyon vb.)
CREATE TABLE IF NOT EXISTS general_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_general_definitions_type_label
  ON general_definitions (type, LOWER(label));

CREATE INDEX IF NOT EXISTS idx_general_definitions_type_active
  ON general_definitions (type)
  WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION update_general_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_general_definitions_updated_at
  BEFORE UPDATE ON general_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_general_definitions_updated_at();

-- Öntanımlı işyeri ve pozisyon kayıtları
INSERT INTO general_definitions (type, label, sort_order) VALUES
  ('workplace', 'Devlet Hastanesi', 10),
  ('workplace', 'Özel Hastane', 20),
  ('workplace', 'Aile Sağlığı Merkezi', 30),
  ('workplace', '112 Acil', 40),
  ('position', 'Hemşire', 10),
  ('position', 'Ebe', 20),
  ('position', 'Sağlık Memuru', 30),
  ('position', 'Doktor', 40),
  ('position', 'Paramedik', 50);
