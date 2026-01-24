-- Add missing columns to dm_document_templates table
-- These columns are needed for saving full template configuration

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS decision_number TEXT;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS header_title TEXT DEFAULT 'T.C.';

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS header_org_name TEXT DEFAULT 'SENDİKA YÖNETİM SİSTEMİ';

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_header BOOLEAN DEFAULT true;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_date BOOLEAN DEFAULT true;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_sayi BOOLEAN DEFAULT true;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_konu BOOLEAN DEFAULT true;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_karar_no BOOLEAN DEFAULT true;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_receiver BOOLEAN DEFAULT true;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_signatures BOOLEAN DEFAULT true;

ALTER TABLE dm_document_templates 
ADD COLUMN IF NOT EXISTS show_footer BOOLEAN DEFAULT true;
