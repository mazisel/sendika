-- Assign DMS permissions to default roles

DO $$
DECLARE
    r_sys_admin_id UUID;
    r_center_admin_id UUID;
BEGIN
    -- Get Role IDs by name
    SELECT id INTO r_sys_admin_id FROM roles WHERE name = 'Sistem Yöneticisi';
    SELECT id INTO r_center_admin_id FROM roles WHERE name = 'Genel Merkez Yöneticisi';

    -- Assign ALL DMS permissions to System Admin
    IF r_sys_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r_sys_admin_id, id FROM permissions 
        WHERE key LIKE 'documents.%' OR key LIKE 'decisions.%'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Assign ALL DMS permissions to General Center Admin
    IF r_center_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r_center_admin_id, id FROM permissions 
        WHERE key LIKE 'documents.%' OR key LIKE 'decisions.%'
        ON CONFLICT DO NOTHING;
    END IF;

END $$;
