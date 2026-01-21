-- Comprehensive Fix for Role Permissions RLS and Grants

-- 1. Ensure Table Grants (Base Level Security)
-- Allow authenticated users to interact with these tables (RLS will filter rows)
GRANT ALL ON TABLE roles TO service_role;
GRANT ALL ON TABLE permissions TO service_role;
GRANT ALL ON TABLE role_permissions TO service_role;

GRANT ALL ON TABLE roles TO authenticated;
GRANT ALL ON TABLE permissions TO authenticated;
GRANT ALL ON TABLE role_permissions TO authenticated;

-- 2. Reset RLS Policies (Drop All to be clean)
DROP POLICY IF EXISTS "Admins can view roles" ON roles;
DROP POLICY IF EXISTS "Super Admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Admins with permission can manage roles" ON roles;

DROP POLICY IF EXISTS "Admins can view permissions" ON permissions;

DROP POLICY IF EXISTS "Admins can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Super Admins can manage role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins with permission can manage role permissions" ON role_permissions;


-- 3. Re-Create Policies using the Secure Function (created in 037)

-- ROLES Table
CREATE POLICY "Allow view roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated'); /* Everyone can see roles */

CREATE POLICY "Allow manage roles" ON roles
    FOR ALL USING (
        -- Super Admin
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin')
        OR
        -- Has 'definitions.manage' permission
        public.check_user_permission('definitions.manage')
    );


-- PERMISSIONS Table (Read Only for most)
CREATE POLICY "Allow view permissions" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');


-- ROLE_PERMISSIONS Table
CREATE POLICY "Allow view role_permissions" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow manage role_permissions" ON role_permissions
    FOR ALL USING (
        -- Super Admin
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin')
        OR
        -- Has 'definitions.manage' permission
        public.check_user_permission('definitions.manage')
    );

-- 4. Just in case, grant the 'definitions.manage' permission again to ensure it sticks
-- (Re-run logic from 038/039 safely)
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
