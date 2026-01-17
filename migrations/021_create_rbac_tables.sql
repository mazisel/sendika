-- Create Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE, -- e.g., 'users.manage', 'finance.view'
    name TEXT NOT NULL,       -- e.g., 'Kullanıcı Yönetimi'
    description TEXT,
    group_name TEXT NOT NULL, -- e.g., 'system', 'finance', 'members'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE, -- To prevent deletion of core roles
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Add role_id to admin_users
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for Permissions (Read-only for authenticated admins, only Super Admin can manage potentially but for now lets say all admins can read)
CREATE POLICY "Admins can view permissions" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for Roles
CREATE POLICY "Admins can view roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Super Admins can manage roles" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Policies for Role Permissions
CREATE POLICY "Admins can view role permissions" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Super Admins can manage role permissions" ON role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Seed Permissions
INSERT INTO permissions (key, name, description, group_name) VALUES
-- System / Users
('users.manage', 'Kullanıcı Yönetimi', 'Admin kullanıcılarını oluşturma, düzenleme ve silme', 'system'),
('definitions.manage', 'Tanımlamalar Yönetimi', 'İşyeri ve pozisyon gibi genel tanımları yönetme', 'system'),
('settings.manage', 'Sistem Ayarları', 'Site ayarlarını yönetme', 'system'),
('logs.view', 'Denetim Kayıtları', 'Sistem loglarını görüntüleme', 'system'),

-- Members
('members.view', 'Üye Görüntüleme', 'Üye listesini görüntüleme', 'members'),
('members.manage', 'Üye Yönetimi', 'Üye ekleme, düzenleme ve silme', 'members'),
('members.edit_restricted', 'Kısıtlı Alan Düzenleme', 'TCKN gibi hassas verileri düzenleme', 'members'),

-- Finance
('finance.view', 'Finans Görüntüleme', 'Finansal verileri görüntüleme', 'finance'),
('finance.manage', 'Finans Yönetimi', 'Gelir/Gider ekleme ve düzenleme', 'finance'),
('dues.view', 'Aidat Görüntüleme', 'Aidat listesini görüntüleme', 'finance'),
('dues.manage', 'Aidat Yönetimi', 'Aidatları yönetme', 'finance'),

-- Content
('news.manage', 'Haber Yönetimi', 'Haber ekleme ve düzenleme', 'content'),
('announcements.manage', 'Duyuru Yönetimi', 'Duyuru ekleme ve düzenleme', 'content'),
('sliders.manage', 'Slider Yönetimi', 'Slider görsellerini yönetme', 'content'),
('categories.manage', 'Kategori Yönetimi', 'Haber kategorilerini yönetme', 'content'),
('management.manage', 'Yönetim Kadrosu', 'Yönetim kurulu listesini düzenleme', 'content'),

-- Structure
('branches.manage', 'Şube Yönetimi', 'Şube ve bölge yapılarını yönetme', 'structure'),

-- Legal
('legal.view', 'Hukuk Talepleri Görüntüleme', 'Hukuk taleplerini görüntüleme', 'legal'),
('legal.manage', 'Hukuk Talepleri Yönetimi', 'Hukuk taleplerini yanıtlama ve yönetme', 'legal')

ON CONFLICT (key) DO NOTHING;

-- Seed Default Roles (Optional but helpful)
-- System Administrator role will be handled by 'super_admin' check usually, but let's create a corresponding role.
-- Note: We rely on name uniqueness.

INSERT INTO roles (name, description, is_system_role) VALUES
('Sistem Yöneticisi', 'Tüm yetkilere sahip yönetici', TRUE),
('Genel Merkez Yöneticisi', 'Sistem ayarları hariç genel yetkili', TRUE),
('Şube Yöneticisi', 'Sadece kendi şubesindeki üyeleri yönetebilir', TRUE),
('Hukuk Sorumlusu', 'Hukuk taleplerini yönetir', TRUE)
ON CONFLICT (name) DO NOTHING;
