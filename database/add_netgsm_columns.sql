-- Add NetGSM columns to existing site_settings table
-- Run this migration if table already exists

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS netgsm_usercode TEXT,
ADD COLUMN IF NOT EXISTS netgsm_password TEXT,
ADD COLUMN IF NOT EXISTS netgsm_header TEXT;
