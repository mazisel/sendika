-- =====================================================
-- SENDIKA SaaS - Complete Database Setup
-- Her yeni sendika projesi için bu SQL dosyasını çalıştırın
-- Supabase SQL Editor'da bu dosyayı çalıştırarak
-- tüm tabloları ve yapıları oluşturabilirsiniz.
-- =====================================================

-- =====================================================
-- 1. ADMIN USERS - Yönetici Kullanıcılar
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    role_type VARCHAR(50) DEFAULT 'general_manager',
    city VARCHAR(100),
    region SMALLINT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- =====================================================
-- 2. BRANCHES - Şubeler
-- =====================================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city VARCHAR(100) NOT NULL UNIQUE,
    city_code VARCHAR(10) UNIQUE,
    branch_name VARCHAR(255),
    president_name VARCHAR(255),
    president_phone VARCHAR(20),
    president_email VARCHAR(255),
    member_count INTEGER DEFAULT 0,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches Indexes
CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city);
CREATE INDEX IF NOT EXISTS idx_branches_city_code ON branches(city_code);

-- =====================================================
-- 3. MEMBERS - Üyeler
-- =====================================================
CREATE TABLE IF NOT EXISTS members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    tc_identity VARCHAR(11) UNIQUE,
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    city VARCHAR(100),
    district VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    workplace VARCHAR(255),
    position VARCHAR(255),
    start_date DATE,
    membership_number VARCHAR(50) UNIQUE,
    membership_status VARCHAR(20) DEFAULT 'pending' CHECK (membership_status IN ('pending', 'active', 'inactive', 'suspended', 'resigned')),
    membership_date DATE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(100),
    education_level VARCHAR(50),
    marital_status VARCHAR(20),
    children_count INTEGER DEFAULT 0,
    notes TEXT,
    region SMALLINT,
    password_hash TEXT,
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members Indexes
CREATE INDEX IF NOT EXISTS idx_members_tc ON members(tc_identity);
CREATE INDEX IF NOT EXISTS idx_members_city ON members(city);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_membership_number ON members(membership_number);

-- =====================================================
-- 4. MEMBER DOCUMENTS - Üye Belgeleri
-- =====================================================
CREATE TABLE IF NOT EXISTS member_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES admin_users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member Documents Indexes
CREATE INDEX IF NOT EXISTS idx_member_documents_member ON member_documents(member_id);
CREATE INDEX IF NOT EXISTS idx_member_documents_type ON member_documents(document_type);

-- =====================================================
-- 5. CATEGORIES - Kategoriler (Haberler, Duyurular için)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    category_type VARCHAR(50) DEFAULT 'news',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. NEWS - Haberler
-- =====================================================
CREATE TABLE IF NOT EXISTS news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE,
    summary TEXT,
    content TEXT,
    image_url TEXT,
    category_id UUID REFERENCES categories(id),
    author_id UUID REFERENCES admin_users(id),
    view_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News Indexes
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published);
CREATE INDEX IF NOT EXISTS idx_news_featured ON news(is_featured);

-- =====================================================
-- 7. ANNOUNCEMENTS - Duyurular
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE,
    summary TEXT,
    content TEXT,
    image_url TEXT,
    category_id UUID REFERENCES categories(id),
    author_id UUID REFERENCES admin_users(id),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_slug ON announcements(slug);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);

-- =====================================================
-- 8. SLIDERS - Ana Sayfa Slider
-- =====================================================
CREATE TABLE IF NOT EXISTS sliders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255),
    subtitle TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_text VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. MANAGEMENT - Yönetim Kurulu
-- =====================================================
CREATE TABLE IF NOT EXISTS management (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    position_order INTEGER DEFAULT 0,
    photo_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. GENERAL DEFINITIONS - Genel Tanımlar
-- =====================================================
CREATE TABLE IF NOT EXISTS general_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    definition_type VARCHAR(50) NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES general_definitions(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- General Definitions Indexes
CREATE INDEX IF NOT EXISTS idx_general_definitions_type ON general_definitions(definition_type);
CREATE INDEX IF NOT EXISTS idx_general_definitions_code ON general_definitions(code);

-- =====================================================
-- 11. FINANCE ACCOUNTS - Finans Hesapları
-- =====================================================
CREATE TABLE IF NOT EXISTS finance_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('bank', 'cash', 'credit_card', 'other')),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    iban VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'TRY',
    initial_balance NUMERIC(15, 2) DEFAULT 0,
    current_balance NUMERIC(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 12. FINANCE CATEGORIES - Finans Kategorileri
-- =====================================================
CREATE TABLE IF NOT EXISTS finance_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('income', 'expense', 'transfer')),
    parent_id UUID REFERENCES finance_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 13. MEMBER DUE PERIODS - Aidat Dönemleri
-- =====================================================
CREATE TABLE IF NOT EXISTS member_due_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    due_date DATE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
);

-- =====================================================
-- 14. MEMBER DUES - Üye Aidatları
-- =====================================================
CREATE TABLE IF NOT EXISTS member_dues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES member_due_periods(id),
    due_date DATE NOT NULL,
    amount_due NUMERIC(10, 2) NOT NULL CHECK (amount_due >= 0),
    discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    penalty_amount NUMERIC(10, 2) DEFAULT 0 CHECK (penalty_amount >= 0),
    paid_amount NUMERIC(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, period_id)
);

-- Member Dues Indexes
CREATE INDEX IF NOT EXISTS idx_member_dues_member ON member_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_member_dues_status ON member_dues(status);

-- =====================================================
-- 15. MEMBER DUE PAYMENTS - Aidat Ödemeleri
-- =====================================================
CREATE TABLE IF NOT EXISTS member_due_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_due_id UUID NOT NULL REFERENCES member_dues(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    recorded_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 16. FINANCE TRANSACTIONS - Finans Hareketleri
-- =====================================================
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES finance_accounts(id),
    category_id UUID REFERENCES finance_categories(id),
    member_id UUID REFERENCES members(id),
    member_due_id UUID REFERENCES member_dues(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    payment_method VARCHAR(50),
    to_account_id UUID REFERENCES finance_accounts(id),
    recorded_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_finance_transactions_account ON finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(transaction_type);

-- =====================================================
-- 17. VIEWS - Özet Görünümler
-- =====================================================

-- Finance Account Summary View
CREATE OR REPLACE VIEW finance_account_summary AS
SELECT 
    fa.id,
    fa.account_name,
    fa.account_type,
    fa.bank_name,
    fa.currency,
    fa.initial_balance,
    fa.current_balance,
    fa.is_active,
    COALESCE(income.total, 0) as total_income,
    COALESCE(expense.total, 0) as total_expense
FROM finance_accounts fa
LEFT JOIN (
    SELECT account_id, SUM(amount) as total
    FROM finance_transactions
    WHERE transaction_type = 'income'
    GROUP BY account_id
) income ON fa.id = income.account_id
LEFT JOIN (
    SELECT account_id, SUM(amount) as total
    FROM finance_transactions
    WHERE transaction_type = 'expense'
    GROUP BY account_id
) expense ON fa.id = expense.account_id;

-- Member Due Period Summary View
CREATE OR REPLACE VIEW member_due_period_summary AS
SELECT 
    p.id,
    p.name,
    p.year,
    p.month,
    p.amount,
    COUNT(d.id) as total_dues,
    COUNT(CASE WHEN d.status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN d.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN d.status = 'overdue' THEN 1 END) as overdue_count,
    COALESCE(SUM(d.amount_due), 0) as total_amount,
    COALESCE(SUM(d.paid_amount), 0) as total_paid
FROM member_due_periods p
LEFT JOIN member_dues d ON p.id = d.period_id
GROUP BY p.id, p.name, p.year, p.month, p.amount;

-- =====================================================
-- 18. TRIGGERS - Otomatik Güncelleme
-- =====================================================

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- =====================================================
-- 19. DEFAULT DATA - Varsayılan Veriler
-- =====================================================

-- Default Finance Categories
INSERT INTO finance_categories (name, category_type, description) VALUES
    ('Üyelik Aidatları', 'income', 'Üyelerden alınan aidatlar'),
    ('Bağışlar', 'income', 'Bağış gelirleri'),
    ('Diğer Gelirler', 'income', 'Diğer gelir kalemleri'),
    ('Personel Giderleri', 'expense', 'Maaş ve personel masrafları'),
    ('Kira Giderleri', 'expense', 'Ofis ve şube kiraları'),
    ('Fatura Giderleri', 'expense', 'Elektrik, su, doğalgaz, internet'),
    ('Etkinlik Giderleri', 'expense', 'Toplantı ve etkinlik masrafları'),
    ('Diğer Giderler', 'expense', 'Diğer gider kalemleri')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 20. ROW LEVEL SECURITY (Optional)
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_dues ENABLE ROW LEVEL SECURITY;

-- Note: Add specific RLS policies based on your authentication setup

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Tüm tablolar ve yapılar başarıyla oluşturuldu.
-- Supabase Dashboard'dan Storage bucket'larını da oluşturmayı unutmayın:
-- - member-documents
-- - news-images
-- - slider-images
-- - management-photos
