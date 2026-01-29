-- verify_member_credentials fonksiyonuna anonim erişim izni ver
GRANT EXECUTE ON FUNCTION public.verify_member_credentials(TEXT, TEXT) TO anon, authenticated, service_role;

-- set_member_password fonksiyonuna da (admin paneli için) garanti olsun
GRANT EXECUTE ON FUNCTION public.set_member_password(UUID, TEXT) TO authenticated, service_role;
