-- Service Role için Auth kullanıcısını telefon numarası ile bulma fonksiyonu
CREATE OR REPLACE FUNCTION public.get_auth_user_by_phone(
  p_phone TEXT
) RETURNS TABLE (
  id UUID,
  email VARCHAR,
  phone VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sadece service_role rolüne izin ver
  IF current_user <> 'service_role' THEN
      RAISE EXCEPTION 'Bu fonksiyonu çalıştırma yetkiniz yok';
  END IF;

  RETURN QUERY
  SELECT 
    au.id, 
    au.email::VARCHAR, 
    au.phone::VARCHAR, 
    au.created_at
  FROM auth.users au
  WHERE au.phone = p_phone;
END;
$$;

-- Fonksiyon izinlerini ayarla
REVOKE ALL ON FUNCTION public.get_auth_user_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_by_phone(TEXT) TO service_role;
