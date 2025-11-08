-- Şubelere bölge bilgisi ekle (bölge değerini adminler belirleyecek)
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS region SMALLINT CHECK (region BETWEEN 1 AND 8);
