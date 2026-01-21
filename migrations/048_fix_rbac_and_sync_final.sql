-- 048_fix_rbac_and_sync_final.sql
-- Fix recursion and grant all permissions to super admin

-- 1. Update ROLES Policies
DROP POLICY IF EXISTS "Admins can view roles" ON roles;
DROP POLICY IF EXISTS "Super Admins can manage roles" ON roles;

CREATE POLICY "Allow view roles" ON roles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow manage roles" ON roles
FOR ALL USING (
    public.current_user_is_super_admin()
)
WITH CHECK (
    public.current_user_is_super_admin()
);

-- 2. Update ROLE_PERMISSIONS Policies
DROP POLICY IF EXISTS "Admins can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Super Admins can manage role permissions" ON role_permissions;

CREATE POLICY "Allow view role_permissions" ON role_permissions
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow manage role_permissions" ON role_permissions
FOR ALL USING (
    public.current_user_is_super_admin()
)
WITH CHECK (
    public.current_user_is_super_admin()
);

-- 3. Update PERMISSIONS Policies
DROP POLICY IF EXISTS "Admins can view permissions" ON permissions;
CREATE POLICY "Allow view permissions" ON permissions
FOR SELECT TO authenticated
USING (true);

-- 4. EMERGENCY SYNC: Ensure Sistem Yöneticisi has ALL permissions
DO $$
DECLARE
    super_admin_role_id uuid;
    permission_id uuid;
BEGIN
    -- Get the Role ID
    SELECT id INTO super_admin_role_id FROM roles WHERE name = 'Sistem Yöneticisi' LIMIT 1;

    IF super_admin_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT super_admin_role_id, id FROM permissions
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;
