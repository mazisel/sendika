-- Add resignation_date and resignation_reason columns to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS resignation_date DATE,
ADD COLUMN IF NOT EXISTS resignation_reason TEXT;

-- Update existing resigned/inactive members to have resignation_date = updated_at if null
-- This serves as a fallback for legacy data
UPDATE members 
SET resignation_date = updated_at::date,
    resignation_reason = 'Eski Kayıt (Sistem Güncellemesi)'
WHERE (membership_status = 'inactive' OR membership_status = 'suspended' OR membership_status = 'resigned')
  AND resignation_date IS NULL;
