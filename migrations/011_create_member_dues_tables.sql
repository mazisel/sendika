-- Aidat yönetimi için temel tablolar ve fonksiyonlar
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Aidat dönemleri tablosu
CREATE TABLE IF NOT EXISTS member_due_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  due_amount NUMERIC(12,2) NOT NULL CHECK (due_amount >= 0),
  penalty_rate NUMERIC(5,2) DEFAULT 0 CHECK (penalty_rate >= 0),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'collecting', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_member_due_periods_status ON member_due_periods(status);
CREATE INDEX IF NOT EXISTS idx_member_due_periods_due_date ON member_due_periods(due_date);

-- Üye bazlı aidat kayıtları
CREATE TABLE IF NOT EXISTS member_dues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES member_due_periods(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL CHECK (amount_due >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  penalty_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (member_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_member_dues_member_id ON member_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_period_id ON member_dues(period_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_status ON member_dues(status);

-- Aidat ödemeleri tablosu
CREATE TABLE IF NOT EXISTS member_due_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_due_id UUID NOT NULL REFERENCES member_dues(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'credit_card', 'debit_card', 'online', 'other')),
  reference_number VARCHAR(100),
  recorded_by UUID REFERENCES admin_users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_member_due_payments_due_id ON member_due_payments(member_due_id);
CREATE INDEX IF NOT EXISTS idx_member_due_payments_date ON member_due_payments(payment_date);

-- updated_at alanını güncelleyen trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_member_dues_touch_updated_at
  BEFORE UPDATE ON member_dues
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_member_due_payments_touch_updated_at
  BEFORE UPDATE ON member_due_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Aidat statüsünü güncelleyen yardımcı fonksiyon
CREATE OR REPLACE FUNCTION public.recalculate_member_due_status(p_member_due_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_record member_dues%ROWTYPE;
  v_total_due NUMERIC(12,2);
  v_target_status VARCHAR(20);
BEGIN
  SELECT * INTO v_record
  FROM member_dues
  WHERE id = p_member_due_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_record.status = 'cancelled' THEN
    RETURN;
  END IF;

  v_total_due := GREATEST(v_record.amount_due - v_record.discount_amount + v_record.penalty_amount, 0);

  IF v_record.paid_amount >= v_total_due AND v_total_due > 0 THEN
    v_target_status := 'paid';
  ELSIF v_record.paid_amount > 0 THEN
    IF CURRENT_DATE > v_record.due_date THEN
      v_target_status := 'overdue';
    ELSE
      v_target_status := 'partial';
    END IF;
  ELSE
    IF CURRENT_DATE > v_record.due_date THEN
      v_target_status := 'overdue';
    ELSE
      v_target_status := 'pending';
    END IF;
  END IF;

  UPDATE member_dues
  SET status = v_target_status,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_member_due_id;
END;
$$;

-- Ödeme ekleme/güncelleme/silme sonrasında aidat durumunu güncelle
CREATE OR REPLACE FUNCTION public.handle_member_due_payment_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE member_dues
  SET paid_amount = paid_amount + NEW.amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.member_due_id;

  PERFORM public.recalculate_member_due_status(NEW.member_due_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_member_due_payment_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE member_dues
  SET paid_amount = paid_amount - OLD.amount + NEW.amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.member_due_id;

  PERFORM public.recalculate_member_due_status(NEW.member_due_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_member_due_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE member_dues
  SET paid_amount = GREATEST(paid_amount - OLD.amount, 0),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.member_due_id;

  PERFORM public.recalculate_member_due_status(OLD.member_due_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_member_due_payment_after_insert
  AFTER INSERT ON member_due_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_member_due_payment_insert();

CREATE TRIGGER trg_member_due_payment_after_update
  AFTER UPDATE ON member_due_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_member_due_payment_update();

CREATE TRIGGER trg_member_due_payment_after_delete
  AFTER DELETE ON member_due_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_member_due_payment_delete();

-- Dönem için aidat kayıtlarını toplu oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.generate_member_dues_for_period(
  p_period_id UUID,
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period member_due_periods%ROWTYPE;
  v_inserted_count INTEGER;
BEGIN
  SELECT * INTO v_period
  FROM member_due_periods
  WHERE id = p_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aidat dönemi bulunamadı' USING errcode = 'P0002';
  END IF;

  INSERT INTO member_dues (
    member_id,
    period_id,
    due_date,
    amount_due,
    discount_amount,
    penalty_amount,
    paid_amount,
    status,
    created_at,
    updated_at
  )
  SELECT
    m.id,
    v_period.id,
    v_period.due_date,
    v_period.due_amount,
    0,
    0,
    0,
    CASE WHEN v_period.due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM members m
  WHERE (
    p_include_inactive
    OR (
      m.is_active = TRUE
      AND m.membership_status IN ('active', 'pending')
    )
  )
    AND NOT EXISTS (
      SELECT 1
      FROM member_dues md
      WHERE md.member_id = m.id
        AND md.period_id = v_period.id
    );

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  UPDATE member_due_periods
  SET status = 'collecting',
      published_at = COALESCE(published_at, CURRENT_TIMESTAMP)
  WHERE id = v_period.id
    AND status = 'draft';

  RETURN COALESCE(v_inserted_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_member_dues_for_period(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_member_dues_for_period(UUID, BOOLEAN) TO service_role;

-- Aidat dönemleri için özet görünüm
CREATE OR REPLACE VIEW public.member_due_period_summary AS
SELECT
  p.id AS period_id,
  COUNT(md.id) AS total_members,
  COALESCE(SUM(md.amount_due - md.discount_amount + md.penalty_amount), 0)::NUMERIC(12,2) AS total_expected_amount,
  COALESCE(SUM(md.paid_amount), 0)::NUMERIC(12,2) AS total_paid_amount,
  COALESCE(SUM(GREATEST((md.amount_due - md.discount_amount + md.penalty_amount) - md.paid_amount, 0)), 0)::NUMERIC(12,2) AS total_outstanding_amount,
  SUM(CASE WHEN md.status = 'paid' THEN 1 ELSE 0 END) AS paid_member_count,
  SUM(CASE WHEN md.status = 'partial' THEN 1 ELSE 0 END) AS partial_member_count,
  SUM(CASE WHEN md.status = 'overdue' THEN 1 ELSE 0 END) AS overdue_member_count,
  SUM(CASE WHEN md.status = 'pending' THEN 1 ELSE 0 END) AS pending_member_count
FROM member_due_periods p
LEFT JOIN member_dues md ON md.period_id = p.id
GROUP BY p.id;
