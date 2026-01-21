-- Fix RLS policies for role_permissions table
-- Previous policy restricted modifications ONLY to super_admin
-- We want to allow users with 'definitions.manage' permission to also manage roles

DROP POLICY IF EXISTS "Super Admins can manage role permissions" ON role_permissions;

CREATE POLICY "Admins with permission can manage role permissions" ON role_permissions
    FOR ALL USING (
        -- Allow if super_admin
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
        OR
        -- Allow if user has definitions.manage permission
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN role_permissions rp ON au.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE au.id = auth.uid() 
            AND p.key = 'definitions.manage'
        )
    );

-- Also ensure 'roles' table can be managed by authorized users
DROP POLICY IF EXISTS "Super Admins can manage roles" ON roles;

CREATE POLICY "Admins with permission can manage roles" ON roles
    FOR ALL USING (
        -- Allow if super_admin
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
        OR
        -- Allow if user has definitions.manage permission
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN role_permissions rp ON au.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE au.id = auth.uid() 
            AND p.key = 'definitions.manage'
        )
    );
