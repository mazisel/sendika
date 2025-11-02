-- Finans ve muhasebe modülü için temel tablolar
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Finans hesapları (kasa, banka vb.)
CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('cash', 'bank', 'other')),
  currency CHAR(3) NOT NULL DEFAULT 'TRY',
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, currency)
);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_type ON finance_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_active ON finance_accounts(is_active);

-- Finans kategorileri (gelir, gider, transfer)
CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('income', 'expense', 'transfer')),
  parent_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, category_type)
);

CREATE INDEX IF NOT EXISTS idx_finance_categories_type ON finance_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_finance_categories_parent ON finance_categories(parent_id);

-- Finans işlemleri
CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES finance_categories(id) ON DELETE RESTRICT,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL,
  reference_code VARCHAR(100),
  description TEXT,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  member_due_id UUID REFERENCES member_dues(id) ON DELETE SET NULL,
  transfer_account_id UUID REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_account ON finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category ON finance_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(transaction_type);

-- updated_at tetikleyicileri
CREATE TRIGGER trg_finance_accounts_touch_updated
  BEFORE UPDATE ON finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_finance_categories_touch_updated
  BEFORE UPDATE ON finance_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_finance_transactions_touch_updated
  BEFORE UPDATE ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Hesap bakiyelerini otomatik güncelleyen yardımcı fonksiyonlar
CREATE OR REPLACE FUNCTION public.apply_finance_transaction(
  p_transaction finance_transactions,
  p_is_reversal BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_multiplier NUMERIC := CASE WHEN p_is_reversal THEN -1 ELSE 1 END;
BEGIN
  IF p_transaction.transaction_type = 'income' THEN
    UPDATE finance_accounts
    SET current_balance = current_balance + (p_transaction.amount * v_multiplier)
    WHERE id = p_transaction.account_id;
  ELSIF p_transaction.transaction_type = 'expense' THEN
    UPDATE finance_accounts
    SET current_balance = current_balance - (p_transaction.amount * v_multiplier)
    WHERE id = p_transaction.account_id;
  ELSIF p_transaction.transaction_type = 'transfer' THEN
    IF p_transaction.transfer_account_id IS NULL THEN
      RAISE EXCEPTION 'Transfer işlemi için hedef hesap gereklidir';
    END IF;

    UPDATE finance_accounts
    SET current_balance = current_balance - (p_transaction.amount * v_multiplier)
    WHERE id = p_transaction.account_id;

    UPDATE finance_accounts
    SET current_balance = current_balance + (p_transaction.amount * v_multiplier)
    WHERE id = p_transaction.transfer_account_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_finance_transaction_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.apply_finance_transaction(NEW, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_finance_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Önce eski kaydın etkisini geri al
  PERFORM public.apply_finance_transaction(OLD, TRUE);
  -- Yeni kaydı uygula
  PERFORM public.apply_finance_transaction(NEW, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_finance_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.apply_finance_transaction(OLD, TRUE);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_finance_transaction_after_insert
  AFTER INSERT ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_finance_transaction_insert();

CREATE TRIGGER trg_finance_transaction_after_update
  AFTER UPDATE ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_finance_transaction_update();

CREATE TRIGGER trg_finance_transaction_after_delete
  AFTER DELETE ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_finance_transaction_delete();

-- Hesap bazlı özet görünümü
CREATE OR REPLACE VIEW public.finance_account_summary AS
SELECT
  a.id AS account_id,
  a.name,
  a.account_type,
  a.currency,
  a.opening_balance,
  a.current_balance,
  COUNT(t.id) AS transaction_count,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0)::NUMERIC(14,2) AS total_income,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0)::NUMERIC(14,2) AS total_expense,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'transfer' AND t.account_id = a.id THEN t.amount ELSE 0 END), 0)::NUMERIC(14,2) AS total_outgoing_transfer,
  COALESCE(SUM(CASE WHEN t.transaction_type = 'transfer' AND t.transfer_account_id = a.id THEN t.amount ELSE 0 END), 0)::NUMERIC(14,2) AS total_incoming_transfer
FROM finance_accounts a
LEFT JOIN finance_transactions t
  ON t.account_id = a.id
  OR (t.transaction_type = 'transfer' AND t.transfer_account_id = a.id)
GROUP BY a.id;
