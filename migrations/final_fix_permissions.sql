-- 1. Tablo izinlerini açıkça verelim
GRANT ALL ON TABLE public.sticky_messages TO postgres;
GRANT ALL ON TABLE public.sticky_messages TO anon;
GRANT ALL ON TABLE public.sticky_messages TO authenticated;
GRANT ALL ON TABLE public.sticky_messages TO service_role;

-- 2. Eğer gerekiyorsa schema kullanım izni verelim
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 3. RLS'yi aktif tutalım
ALTER TABLE public.sticky_messages ENABLE ROW LEVEL SECURITY;

-- 4. Eski tüm politikaları temizleyelim ve en baştan temizce oluşturalım
DROP POLICY IF EXISTS "Allow all users to read sticky messages" ON public.sticky_messages;
DROP POLICY IF EXISTS "Allow authenticated users to read sticky messages" ON public.sticky_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert sticky messages" ON public.sticky_messages;
DROP POLICY IF EXISTS "Allow authenticated users to delete sticky messages" ON public.sticky_messages;

-- OKUMA: Herkes görebilmeli (Header banner için)
CREATE POLICY "Allow all users to read sticky messages"
    ON public.sticky_messages
    FOR SELECT
    USING (true);

-- EKLEME: Sadece giriş yapmış kullanıcılar
CREATE POLICY "Allow authenticated users to insert sticky messages"
    ON public.sticky_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- SİLME: Sadece giriş yapmış kullanıcılar
CREATE POLICY "Allow authenticated users to delete sticky messages"
    ON public.sticky_messages
    FOR DELETE
    TO authenticated
    USING (true);

-- GÜNCELLEME (Opsiyonel ama iyi olur)
CREATE POLICY "Allow authenticated users to update sticky messages"
    ON public.sticky_messages
    FOR UPDATE
    TO authenticated
    USING (true);
