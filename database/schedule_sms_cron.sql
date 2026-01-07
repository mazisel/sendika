-- SMS Automation Cron Job Scheduling
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın
-- Edge Function deploy edildikten sonra kullanın

-- 1. pg_cron extension'ı etkinleştirin (bir kere yeterli)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. pg_net extension'ı etkinleştirin (HTTP istekleri için)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Her gün saat 09:00'da SMS otomasyonlarını çalıştır
-- NOT: Edge function URL'ini kendi projenize göre güncelleyin
SELECT cron.schedule(
    'sms-automations-daily',  -- job adı
    '0 9 * * *',              -- cron schedule: her gün 09:00 UTC (Türkiye 12:00)
    $$
    SELECT net.http_post(
        url := 'https://hhxzddkfpyjambqoizop.supabase.co/functions/v1/sms-automations',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('supabase.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Alternatif: Türkiye saati ile 09:00 için (UTC 06:00)
-- SELECT cron.schedule(
--     'sms-automations-daily',
--     '0 6 * * *',  -- 06:00 UTC = 09:00 Türkiye
--     ...
-- );

-- Mevcut cron job'ları görüntüle
-- SELECT * FROM cron.job;

-- Cron job'ı silmek için
-- SELECT cron.unschedule('sms-automations-daily');
