-- Üyeler tablosuna üyelik kaydı tarih alanı ekle
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS membership_date DATE;

