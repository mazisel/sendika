-- Üyeler tablosu oluşturma
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  tc_identity VARCHAR(11) UNIQUE NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('Erkek', 'Kadın', 'Diğer')),
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  workplace VARCHAR(255),
  position VARCHAR(255),
  start_date DATE,
  membership_number VARCHAR(20) UNIQUE,
  membership_status VARCHAR(20) DEFAULT 'pending' CHECK (membership_status IN ('pending', 'active', 'inactive', 'suspended')),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  education_level VARCHAR(50),
  marital_status VARCHAR(20),
  children_count INTEGER DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Üye numarası için sequence oluştur
CREATE SEQUENCE IF NOT EXISTS member_number_seq START 1000;

-- Üye numarası otomatik oluşturma trigger'ı
CREATE OR REPLACE FUNCTION generate_membership_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.membership_number IS NULL THEN
    NEW.membership_number := 'UYE' || LPAD(nextval('member_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_membership_number
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION generate_membership_number();

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_members_tc_identity ON members(tc_identity);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_membership_number ON members(membership_number);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_city ON members(city);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at);
