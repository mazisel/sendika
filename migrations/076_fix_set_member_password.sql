-- Pgcrypto eklentisinin extensions şemasında olduğundan emin ol
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- set_member_password fonksiyonunu search_path ile güncelle
CREATE OR REPLACE FUNCTION public.set_member_password(
  p_member_id UUID,
  p_new_password TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
