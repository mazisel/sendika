-- verify_member_credentials fonksiyonunu daha sağlam hale getir
CREATE OR REPLACE FUNCTION public.verify_member_credentials(
  p_tc_identity TEXT,
  p_password TEXT
) RETURNS TABLE (
  id UUID,
  membership_number VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  tc_identity VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  city VARCHAR,
  district VARCHAR,
  workplace VARCHAR,
  "position" VARCHAR,
  membership_status VARCHAR,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  member_record members%ROWTYPE;
BEGIN
  -- Girdilerdeki boşlukları temizle (kopyala yapıştır hataları için)
  p_tc_identity := TRIM(p_tc_identity);
  p_password := TRIM(p_password);

  -- members.tc_identity olarak tablo adını belirterek belirsizliği önle
  SELECT * INTO member_record
  FROM members
  WHERE members.tc_identity = p_tc_identity
    AND members.is_active = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF member_record.password_hash IS NULL OR member_record.password_hash = '' THEN
    RETURN;
  END IF;

  -- search_path sayesinde crypt fonksiyonu extensions şemasından bulunabilir
  IF crypt(p_password, member_record.password_hash) = member_record.password_hash THEN
    -- members.id olarak tablo adını belirterek id belirsizliğini önle
    UPDATE members
    SET last_login_at = CURRENT_TIMESTAMP
    WHERE members.id = member_record.id;

    RETURN QUERY
      SELECT member_record.id,
             member_record.membership_number,
             member_record.first_name,
             member_record.last_name,
             member_record.tc_identity,
             member_record.email,
             member_record.phone,
             member_record.city,
             member_record.district,
             member_record.workplace,
             member_record.position AS "position",
             member_record.membership_status,
             member_record.updated_at;
  END IF;
END;
$$;

-- Fonksiyon sahipliğini postgres (süper kullanıcı) yaparak RLS'i kesin olarak aşmasını sağla
ALTER FUNCTION public.verify_member_credentials(TEXT, TEXT) OWNER TO postgres;

-- İzinleri tekrar garanti altına al
GRANT EXECUTE ON FUNCTION public.verify_member_credentials(TEXT, TEXT) TO anon, authenticated, service_role;
