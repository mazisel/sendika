-- Üye numarası otomatik oluşturma için sequence ve trigger

-- 1. Sequence oluştur (eğer yoksa)
CREATE SEQUENCE IF NOT EXISTS membership_number_seq START 1;

-- 2. Mevcut en yüksek üye numarasından sequence'ı başlat
DO $$
DECLARE
    max_num INTEGER;
BEGIN
    -- Mevcut en yüksek sayısal üye numarasını bul
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN membership_number ~ '^[0-9]+$' THEN membership_number::INTEGER
                WHEN membership_number ~ '^UYE-([0-9]+)$' THEN SUBSTRING(membership_number FROM 'UYE-([0-9]+)')::INTEGER
                ELSE 0
            END
        ),
        0
    ) INTO max_num
    FROM members
    WHERE membership_number IS NOT NULL;
    
    -- Sequence'ı bu değerden 1 fazla olarak ayarla
    PERFORM setval('membership_number_seq', GREATEST(max_num, 0) + 1, false);
END $$;

-- 3. Trigger fonksiyonu oluştur
CREATE OR REPLACE FUNCTION generate_membership_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer membership_number boş veya NULL ise otomatik oluştur
    IF NEW.membership_number IS NULL OR NEW.membership_number = '' THEN
        NEW.membership_number := 'UYE-' || LPAD(nextval('membership_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Mevcut trigger'ı sil (eğer varsa) ve yeni trigger oluştur
DROP TRIGGER IF EXISTS set_membership_number ON members;

CREATE TRIGGER set_membership_number
    BEFORE INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION generate_membership_number();

-- Test: Yeni bir üye eklendiğinde otomatik olarak UYE-000001 formatında numara atanacak
-- Örnek: UYE-000001, UYE-000002, UYE-000003...
