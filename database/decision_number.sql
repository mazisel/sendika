-- Karar Numarası (Kabul Kararı) sistemi oluşturma
-- Her üye kabulü bir karar olarak kayıt altına alınır

-- 1. Members tablosuna karar numarası alanları ekle
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS decision_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS decision_date DATE;

-- 2. Karar numarası için sequence oluştur
CREATE SEQUENCE IF NOT EXISTS decision_number_seq START 1;

-- 3. Mevcut en yüksek karar numarasından sequence'ı başlat
DO $$
DECLARE
    max_num INTEGER;
BEGIN
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN decision_number ~ '^[0-9]+$' THEN decision_number::INTEGER
                WHEN decision_number ~ '^KARAR-([0-9]+)$' THEN SUBSTRING(decision_number FROM 'KARAR-([0-9]+)')::INTEGER
                WHEN decision_number ~ '^([0-9]+)/[0-9]+$' THEN SPLIT_PART(decision_number, '/', 1)::INTEGER
                ELSE 0
            END
        ),
        0
    ) INTO max_num
    FROM members
    WHERE decision_number IS NOT NULL;
    
    PERFORM setval('decision_number_seq', GREATEST(max_num, 0) + 1, false);
END $$;

-- 4. Karar numarası otomatik oluşturma trigger fonksiyonu
CREATE OR REPLACE FUNCTION generate_decision_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    seq_value INTEGER;
BEGIN
    -- Eğer decision_number boş veya NULL ise otomatik oluştur
    IF NEW.decision_number IS NULL OR NEW.decision_number = '' THEN
        current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
        seq_value := nextval('decision_number_seq');
        -- Format: KARAR-2024/000001 şeklinde yıl ve sıra numarası
        NEW.decision_number := current_year || '/' || LPAD(seq_value::TEXT, 5, '0');
    END IF;
    
    -- Karar tarihi de boşsa bugünün tarihini ata
    IF NEW.decision_date IS NULL THEN
        NEW.decision_date := CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Mevcut trigger'ı sil (eğer varsa) ve yeni trigger oluştur
DROP TRIGGER IF EXISTS set_decision_number ON members;

CREATE TRIGGER set_decision_number
    BEFORE INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION generate_decision_number();

-- Uygulanan format örnekleri:
-- 2024/00001 - 2024 yılının ilk kararı
-- 2024/00002 - 2024 yılının ikinci kararı
-- 2025/00001 - 2025 yılının ilk kararı (yeni yıl, sequence devam eder)

COMMENT ON COLUMN members.decision_number IS 'Üye kabul karar numarası (Yıl/Sıra formatında)';
COMMENT ON COLUMN members.decision_date IS 'Üye kabul karar tarihi';
