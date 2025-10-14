-- Üye girişini desteklemek için parola ve doğrulama fonksiyonları ekleyin
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Parola belirleme fonksiyonu (sadece service_role kullanabilir)
CREATE OR REPLACE FUNCTION public.set_member_password(
  p_member_id UUID,
  p_new_password TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_new_password IS NULL OR length(trim(p_new_password)) < 6 THEN
    RAISE EXCEPTION 'Parola en az 6 karakter olmalıdır' USING errcode = '22023';
  END IF;

  UPDATE members
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Üye bulunamadı' USING errcode = 'P0002';
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.set_member_password(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_member_password(UUID, TEXT) TO service_role;

-- TC + şifre ile giriş doğrulama fonksiyonu
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
AS $$
DECLARE
  member_record members%ROWTYPE;
BEGIN
  SELECT * INTO member_record
  FROM members
  WHERE tc_identity = p_tc_identity
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF member_record.password_hash IS NULL OR member_record.password_hash = '' THEN
    RETURN;
  END IF;

  IF crypt(p_password, member_record.password_hash) = member_record.password_hash THEN
    UPDATE members
    SET last_login_at = CURRENT_TIMESTAMP
    WHERE id = member_record.id;

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

REVOKE ALL ON FUNCTION public.verify_member_credentials(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_member_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_member_credentials(TEXT, TEXT) TO authenticated;
