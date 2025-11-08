-- Telefon ve e-posta alanlarını opsiyonel hâle getir
ALTER TABLE members
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

