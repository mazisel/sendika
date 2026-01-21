-- Fix infinite recursion in RLS policies by using a SECURITY DEFINER function

-- 1. Create a secure function to check permissions without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_permission(permission_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: runs with privileges of the creator (postgres), bypassing RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_users au
    JOIN role_permissions rp ON au.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE au.id = auth.uid()
    AND p.key = permission_key
  );
END;
$$;

-- 2. Update RLS Policy for role_permissions
-- Drop previous policy that caused recursion
DROP POLICY IF EXISTS "Admins with permission can manage role permissions" ON role_permissions;

CREATE POLICY "Admins with permission can manage role permissions" ON role_permissions
    FOR ALL USING (
        -- Allow if super_admin
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
        OR
        -- Allow if user has definitions.manage permission (using secure function)
        public.check_user_permission('definitions.manage')
    );

-- 3. Update RLS Policy for roles
DROP POLICY IF EXISTS "Admins with permission can manage roles" ON roles;

CREATE POLICY "Admins with permission can manage roles" ON roles
    FOR ALL USING (
        -- Allow if super_admin
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
        OR
        -- Allow if user has definitions.manage permission (using secure function)
        public.check_user_permission('definitions.manage')
    );
