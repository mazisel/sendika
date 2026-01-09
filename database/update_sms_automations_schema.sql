-- Add new columns for generic automation triggers
ALTER TABLE public.sms_automations
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS trigger_column TEXT, -- 'birth_date', 'membership_date', 'custom_date'
ADD COLUMN IF NOT EXISTS trigger_days_before INTEGER DEFAULT 0;

-- Update existing records to new format
UPDATE public.sms_automations
SET name = 'Doğum Günü Kutlaması',
    trigger_column = 'birth_date'
WHERE automation_type = 'birthday';

UPDATE public.sms_automations
SET name = 'Üyelik Yıldönümü',
    trigger_column = 'membership_date'
WHERE automation_type = 'membership_anniversary';

UPDATE public.sms_automations
SET name = 'Hoş Geldin Mesajı',
    trigger_column = 'created_at' -- Trigger on registration date for welcome message logic
WHERE automation_type = 'welcome';

-- Remove unique constraint on automation_type since we want multiple custom automations
ALTER TABLE public.sms_automations DROP CONSTRAINT IF EXISTS sms_automations_automation_type_key;

-- Make automation_type optional or keep it for system types, but name is now primary identifier for UI
ALTER TABLE public.sms_automations ALTER COLUMN automation_type DROP NOT NULL;
