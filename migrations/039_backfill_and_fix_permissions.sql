-- Backfill and Fix Permissions

-- 1. Backfill admin_users.role_id based on legacy 'role' column
-- This ensures that existing users have a valid link to the roles table
DO $$
DECLARE
    role_record RECORD;
BEGIN
    FOR role_record IN SELECT * FROM roles LOOP
        -- Map legacy text roles to new Role IDs
        IF role_record.name = 'Genel Merkez Yöneticisi' THEN
            UPDATE admin_users SET role_id = role_record.id WHERE role = 'general_manager' AND role_id IS NULL;
        ELSIF role_record.name = 'Şube Yöneticisi' THEN
            UPDATE admin_users SET role_id = role_record.id WHERE role = 'branch_manager' AND role_id IS NULL;
        ELSIF role_record.name = 'Bölge Yöneticisi' OR role_record.name = 'Bölge Sorumlusu' THEN
            UPDATE admin_users SET role_id = role_record.id WHERE role = 'regional_manager' AND role_id IS NULL;
        ELSIF role_record.name = 'Sistem Yöneticisi' THEN
            UPDATE admin_users SET role_id = role_record.id WHERE role = 'super_admin' AND role_id IS NULL;
        END IF;
    END LOOP;
END $$;

-- 2. Re-apply Grant definitions.manage to be absolutely sure
DO $$
DECLARE
    genel_merkez_id UUID;
    perm_id UUID;
BEGIN
    SELECT id INTO perm_id FROM permissions WHERE key = 'definitions.manage';
    SELECT id INTO genel_merkez_id FROM roles WHERE name = 'Genel Merkez Yöneticisi';
    
    IF genel_merkez_id IS NOT NULL AND perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (genel_merkez_id, perm_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
