-- Grant definitions.manage permission to key roles
-- This is required for them to access/manage the Roles page under the new RLS policy

DO $$
DECLARE
    genel_merkez_id UUID;
    sistem_yonetici_id UUID;
    perm_id UUID;
BEGIN
    -- Get Permission ID for 'definitions.manage'
    SELECT id INTO perm_id FROM permissions WHERE key = 'definitions.manage';
    
    IF perm_id IS NULL THEN
        RAISE NOTICE 'Permission definitions.manage not found, creating it...';
        INSERT INTO permissions (key, name, description, group_name)
        VALUES ('definitions.manage', 'Tanımlamalar Yönetimi', 'Rol ve tanımları yönetme', 'system')
        RETURNING id INTO perm_id;
    END IF;

    -- 1. Grant to 'Genel Merkez Yöneticisi'
    SELECT id INTO genel_merkez_id FROM roles WHERE name = 'Genel Merkez Yöneticisi';
    
    IF genel_merkez_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (genel_merkez_id, perm_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- 2. Grant to 'Sistem Yöneticisi'
    SELECT id INTO sistem_yonetici_id FROM roles WHERE name = 'Sistem Yöneticisi';
    
    IF sistem_yonetici_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (sistem_yonetici_id, perm_id)
        ON CONFLICT DO NOTHING;
    END IF;

END $$;
