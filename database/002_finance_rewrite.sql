-- 1. Chart of Accounts (Hesap Planı)
CREATE TABLE accounting_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL, -- e.g. 100, 320, 600
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    parent_id UUID REFERENCES accounting_accounts(id),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(code)
);

-- 2. Cost Centers (Masraf Merkezleri / Şubeler / Projeler)
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('HEADQUARTERS', 'BRANCH', 'PROJECT', 'EVENT')),
    code VARCHAR(50),
    manager_id UUID REFERENCES admin_users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Header Table for Transactions (Fiş Başlığı)
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE NOT NULL,
    description TEXT,
    document_no VARCHAR(100), -- Fatura No, Makbuz No etc.
    document_type VARCHAR(50) CHECK (document_type IN ('PAYMENT', 'RECEIPT', 'INVOICE', 'SALARY', 'OPENING_BALANCE', 'TRANSFER')),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'VOID')),
    created_by UUID REFERENCES admin_users(id),
    approved_by UUID REFERENCES admin_users(id),
    approved_at TIMESTAMPTZ,
    total_amount NUMERIC(15, 2) DEFAULT 0, -- Denormalized for query ease
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ledger (Yevmiye Defteri / Detay Satırlar)
CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounting_accounts(id) NOT NULL,
    description TEXT,
    debit NUMERIC(15, 2) DEFAULT 0,
    credit NUMERIC(15, 2) DEFAULT 0,
    cost_center_id UUID REFERENCES cost_centers(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. System Bank Accounts & Cash Registers (Kasa/Banka Tanımları)
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL, -- e.g. "Ziraat Main", "Ofis Kasa"
    type VARCHAR(20) CHECK (type IN ('BANK', 'CASH', 'POS')),
    iban VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'TRY',
    account_id UUID REFERENCES accounting_accounts(id), -- Link to Chart of Accounts (100 or 102)
    min_balance_limit NUMERIC(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Payment/Expense Requests (Satınalma/Avans Talep)
CREATE TABLE payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES admin_users(id),
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    description TEXT NOT NULL,
    category_id UUID REFERENCES accounting_accounts(id), -- Gider kalemi
    cost_center_id UUID REFERENCES cost_centers(id),
    document_urls TEXT[], -- Array of file URLs
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED')),
    approved_by UUID REFERENCES admin_users(id),
    rejection_reason TEXT,
    transaction_id UUID REFERENCES financial_transactions(id), -- Link to actual accounting transaction when paid
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Budgets (Bütçe)
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    cost_center_id UUID REFERENCES cost_centers(id),
    account_id UUID REFERENCES accounting_accounts(id),
    amount NUMERIC(15, 2) DEFAULT 0, -- Planned amount
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(year, cost_center_id, account_id)
);

-- 8. Enable RLS
ALTER TABLE accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 9. Basic Permissions (Open for authenticated for now, refine later)
GRANT SELECT, INSERT, UPDATE, DELETE ON accounting_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cost_centers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

-- 10. Initial Seed Data (Standard Turkish Uniform Chart of Accounts - Simplified)
INSERT INTO accounting_accounts (code, name, type) VALUES
('100', 'KASA', 'ASSET'),
('102', 'BANKALAR', 'ASSET'),
('120', 'ALICILAR (ÜYE ALACAKLARI)', 'ASSET'),
('320', 'SATICILAR (BORÇLAR)', 'LIABILITY'),
('600', 'YURTİÇİ SATIŞLAR (GELİRLER)', 'INCOME'),
('601', 'ÜYE AİDAT GELİRLERİ', 'INCOME'),
('602', 'BAĞIŞ VE YARDIMLAR', 'INCOME'),
('770', 'GENEL YÖNETİM GİDERLERİ', 'EXPENSE')
ON CONFLICT (code) DO NOTHING;

INSERT INTO cost_centers (name, type, code) VALUES
('Genel Merkez', 'HEADQUARTERS', 'HQ')
ON CONFLICT DO NOTHING;
