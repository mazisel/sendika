-- Add new date columns to members table for flexible automation triggers
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS marriage_date DATE,
ADD COLUMN IF NOT EXISTS custom_date_1 DATE,
ADD COLUMN IF NOT EXISTS custom_date_2 DATE,
ADD COLUMN IF NOT EXISTS custom_date_3 DATE;

-- Add comments for clarity
COMMENT ON COLUMN public.members.marriage_date IS 'Üyenin evlilik yıldönümü';
COMMENT ON COLUMN public.members.custom_date_1 IS 'Özel tarih 1 (Örn: Diploma, Sertifika vb.)';
COMMENT ON COLUMN public.members.custom_date_2 IS 'Özel tarih 2';
COMMENT ON COLUMN public.members.custom_date_3 IS 'Özel tarih 3';
