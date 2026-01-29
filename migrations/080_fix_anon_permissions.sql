-- Anonim rolünün Extensions şemasına erişebildiğinden emin ol
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

-- Anonim rolünün şifreleme fonksiyonlarını çalıştırabildiğinden emin ol
GRANT EXECUTE ON FUNCTION extensions.crypt(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION extensions.gen_salt(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION extensions.bf() TO anon, authenticated;

-- verify_member_credentials fonksiyonunu tekrar teyit et
GRANT EXECUTE ON FUNCTION public.verify_member_credentials(TEXT, TEXT) TO anon, authenticated;

-- Debug: Hatanın kaynağını anlamak için basit bir "ping" fonksiyonu ekle
CREATE OR REPLACE FUNCTION public.ping_anon()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'pong';
$$;

GRANT EXECUTE ON FUNCTION public.ping_anon() TO anon;
