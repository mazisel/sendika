-- Migration: Add Visibility and Header Settings to Document Templates
-- Purpose: Allow templates to store section visibility and custom header/footer text

ALTER TABLE dm_document_templates
ADD COLUMN IF NOT EXISTS decision_number TEXT,
ADD COLUMN IF NOT EXISTS header_title TEXT DEFAULT 'T.C.',
ADD COLUMN IF NOT EXISTS header_org_name TEXT DEFAULT 'SENDİKA YÖNETİM SİSTEMİ',
ADD COLUMN IF NOT EXISTS show_header BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_date BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_sayi BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_konu BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_karar_no BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_receiver BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_signatures BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_footer BOOLEAN DEFAULT true;
