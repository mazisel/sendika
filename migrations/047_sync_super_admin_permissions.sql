-- 047_sync_super_admin_permissions.sql
-- Grant ALL existing permissions to the 'Sistem Yöneticisi' (Super Admin) role

DO $$
DECLARE
    super_admin_role_id uuid;
    permission_rec record;
BEGIN
    -- 1. Get the Role ID for 'Sistem Yöneticisi'
    SELECT id INTO super_admin_role_id FROM roles WHERE name = 'Sistem Yöneticisi' LIMIT 1;

    IF super_admin_role_id IS NOT NULL THEN
        -- 2. Add all missing permissions to this role
        FOR permission_rec IN SELECT id FROM permissions LOOP
            -- Try to insert, ignore if already exists
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (super_admin_role_id, permission_rec.id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Sistem Yöneticisi (Super Admin) permissions synced.';
    ELSE
        RAISE NOTICE 'Sistem Yöneticisi role not found.';
    END IF;
END $$;
