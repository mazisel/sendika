-- Add Granular Permissions

INSERT INTO permissions (key, name, description, group_name) VALUES
-- Users Granular
('users.view.all', 'Tüm Kullanıcıları Görüntüle', 'Peki tüm admin kullanıcılarını görüntüleme', 'users'),
('users.view.region', 'Bölge Kullanıcılarını Görüntüle', 'Sadece kendi bölgesindeki kullanıcıları görüntüleme', 'users'),
('users.view.branch', 'Şube Kullanıcılarını Görüntüle', 'Sadece kendi şubesindeki kullanıcıları görüntüleme', 'users'),

('users.manage.all', 'Tüm Kullanıcıları Yönet', 'Tüm admin kullanıcılarını yönetme (Ekle/Sil/Düzenle)', 'users'),
('users.manage.region', 'Bölge Kullanıcılarını Yönet', 'Sadece kendi bölgesindeki kullanıcıları yönetme', 'users'),
('users.manage.branch', 'Şube Kullanıcılarını Yönet', 'Sadece kendi şubesindeki kullanıcıları yönetme', 'users'),

-- Members Granular (Refining existing members.view/manage)
('members.view.all', 'Tüm Üyeleri Görüntüle', 'Tüm üyeleri görüntüleme yetkisi', 'members'),
('members.view.region', 'Bölge Üyelerini Görüntüle', 'Sadece bağlı bölgedeki üyeleri görüntüleme', 'members'),
('members.view.branch', 'Şube Üyelerini Görüntüle', 'Sadece bağlı şubedeki üyeleri görüntüleme', 'members'),

('members.manage.all', 'Tüm Üyeleri Yönet', 'Tüm üyeleri yönetme yetkisi', 'members'),
('members.manage.region', 'Bölge Üyelerini Yönet', 'Sadece bağlı bölgedeki üyeleri yönetme', 'members'),
('members.manage.branch', 'Şube Üyelerini Yönet', 'Sadece bağlı şubedeki üyeleri yönetme', 'members')
ON CONFLICT (key) DO NOTHING;

-- Update existing roles with granular permissions
-- Şube Yöneticisi gets Branch Scopes
DO $$
DECLARE
    role_id UUID;
BEGIN
    SELECT id INTO role_id FROM roles WHERE name = 'Şube Yöneticisi';
    
    IF role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT role_id, id FROM permissions 
        WHERE key IN ('users.view.branch', 'users.manage.branch', 'members.view.branch', 'members.manage.branch', 'members.edit_restricted')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Genel Merkez gets Global Scopes (except maybe system settings if separate)
DO $$
DECLARE
    role_id UUID;
BEGIN
    SELECT id INTO role_id FROM roles WHERE name = 'Genel Merkez Yöneticisi';
    
    IF role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT role_id, id FROM permissions 
        WHERE key IN ('users.view.all', 'users.manage.all', 'members.view.all', 'members.manage.all')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
