-- Update sms_automations table to support dynamic automations
-- 1. Add new columns
ALTER TABLE public.sms_automations 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS trigger_column TEXT;

-- 2. Rename days_before to trigger_days_before if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_automations' AND column_name = 'days_before') THEN
        ALTER TABLE public.sms_automations RENAME COLUMN days_before TO trigger_days_before;
    END IF;
END $$;

-- 3. Make automation_type nullable since custom automations won't have a system type
ALTER TABLE public.sms_automations ALTER COLUMN automation_type DROP NOT NULL;

-- 4. Update existing system automations with names and trigger settings
UPDATE public.sms_automations 
SET 
    name = 'Doğum Günü Kutlaması',
    trigger_column = 'birth_date',
    trigger_days_before = 0
WHERE automation_type = 'birthday';

UPDATE public.sms_automations 
SET 
    name = 'Üyelik Yıldönümü',
    trigger_column = 'membership_date',
    trigger_days_before = 0
WHERE automation_type = 'membership_anniversary';

UPDATE public.sms_automations 
SET 
    name = 'Hoş Geldin Mesajı',
    trigger_column = 'created_at',
    trigger_days_before = 0
WHERE automation_type = 'welcome';
