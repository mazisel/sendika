-- Aidat sistemi için üye bazlı ayarlar ve güncel fonksiyonlar

-- Üye bazlı aidat ayarları
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS dues_enabled BOOLEAN DEFAULT true;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS dues_amount NUMERIC(12,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_dues_amount_check'
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT members_dues_amount_check
      CHECK (dues_amount IS NULL OR dues_amount >= 0);
  END IF;
END $$;

-- Aidat statüsünü güncelleyen yardımcı fonksiyon (0 tutar = paid)
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

  IF v_total_due <= 0 THEN
    v_target_status := 'paid';
  ELSIF v_record.paid_amount >= v_total_due THEN
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

-- Dönem için aidat kayıtlarını toplu oluşturma fonksiyonu (üye bazlı tutar/aktiflik)
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
    COALESCE(m.dues_amount, v_period.due_amount),
    0,
    0,
    0,
    CASE
      WHEN COALESCE(m.dues_amount, v_period.due_amount) <= 0 THEN 'paid'
      WHEN v_period.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
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
    AND COALESCE(m.dues_enabled, TRUE) = TRUE
    AND (m.membership_date IS NULL OR m.membership_date <= v_period.period_end)
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
