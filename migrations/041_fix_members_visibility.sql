-- Fix Members and Admin Users RLS and Permissions - Comprehensive Fix

-- ==========================================
-- 0. CRITICAL: SYNC ROLE IDs
-- ==========================================
-- Ensure admin_users have the correct role_id based on their role_type
-- This is crucial for check_user_permission to work correctly

-- Sync Genel Merkez Yöneticisi
UPDATE admin_users au
SET role_id = r.id
FROM roles r
WHERE r.name = 'Genel Merkez Yöneticisi' 
AND (au.role_type = 'general_manager' OR au.role_type IS NULL) -- Default fallback
AND au.role != 'super_admin'
AND au.role_id IS NULL;

-- Sync Şube Yöneticisi
UPDATE admin_users au
SET role_id = r.id
FROM roles r
WHERE r.name = 'Şube Yöneticisi'
AND au.role_type = 'branch_manager'
AND au.role_id IS NULL;

-- Sync Bölge Sorumlusu (If role exists)
UPDATE admin_users au
SET role_id = r.id
FROM roles r
WHERE r.name = 'Bölge Sorumlusu'
AND au.role_type = 'regional_manager'
AND au.role_id IS NULL;


-- ==========================================
-- 1. MEMBERS TABLE FIX
-- ==========================================

-- Ensure RLS is enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON TABLE members TO authenticated;
GRANT ALL ON TABLE members TO service_role;

-- Clean up existing policies
DROP POLICY IF EXISTS "Members are viewable by authorized users" ON members;
DROP POLICY IF EXISTS "Members are insertable by authorized users" ON members;
DROP POLICY IF EXISTS "Members are updatable by authorized users" ON members;
DROP POLICY IF EXISTS "Members are deletable by authorized users" ON members;
DROP POLICY IF EXISTS "Allow view members" ON members;
DROP POLICY IF EXISTS "Allow manage members" ON members;

-- VIEW POLICY
CREATE POLICY "Allow view members" ON members
FOR SELECT USING (
    -- 1. Super Admin
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- 2. Global View Permission (Genel Merkez etc.)
    public.check_user_permission('members.view.all')
    OR
    -- 3. Regional View Permission
    (
        public.check_user_permission('members.view.region')
        AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND admin_users.region = members.region
        )
    )
    OR
    -- 4. Branch View Permission (based on City)
    (
        public.check_user_permission('members.view.branch')
        AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND admin_users.city = members.city
        )
    )
);

-- MANAGE POLICY (Insert/Update/Delete)
CREATE POLICY "Allow manage members" ON members
FOR ALL USING (
    -- 1. Super Admin
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- 2. Global Manage Permission
    public.check_user_permission('members.manage.all')
    OR
    -- 3. Regional Manage Permission
    (
        public.check_user_permission('members.manage.region')
        AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND admin_users.region = members.region
        )
    )
    OR
    -- 4. Branch Manage Permission
    (
        public.check_user_permission('members.manage.branch')
        AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND admin_users.city = members.city
        )
    )
);

-- ==========================================
-- 2. ADMIN USERS TABLE FIX
-- ==========================================

-- Ensure RLS is enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Grant access
GRANT ALL ON TABLE admin_users TO authenticated;
GRANT ALL ON TABLE admin_users TO service_role;

-- Clean up policies
DROP POLICY IF EXISTS "Allow view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow manage admin_users" ON admin_users;

-- VIEW POLICY
CREATE POLICY "Allow view admin_users" ON admin_users
FOR SELECT USING (
    -- 1. View Own Profile (Always allowed)
    auth.uid() = id
    OR
    -- 2. Super Admin
    (SELECT role FROM admin_users WHERE id = auth.uid()) = 'super_admin'
    OR
    -- 3. Global View Permission
    public.check_user_permission('users.view.all')
    OR
    -- 4. Regional View Permission
    (
        public.check_user_permission('users.view.region')
        AND
        region = (SELECT region FROM admin_users WHERE id = auth.uid())
    )
    OR
    -- 5. Branch View Permission
    (
        public.check_user_permission('users.view.branch')
        AND
        city = (SELECT city FROM admin_users WHERE id = auth.uid())
    )
);

-- MANAGE POLICY
CREATE POLICY "Allow manage admin_users" ON admin_users
FOR ALL USING (
    -- 1. Super Admin
    (SELECT role FROM admin_users WHERE id = auth.uid()) = 'super_admin'
    OR
    -- 2. Global Manage Permission
    public.check_user_permission('users.manage.all')
    OR
    -- 3. Regional Manage Permission
    (
        public.check_user_permission('users.manage.region')
        AND
        region = (SELECT region FROM admin_users WHERE id = auth.uid())
    )
    OR
    -- 4. Branch Manage Permission
    (
        public.check_user_permission('users.manage.branch')
        AND
        city = (SELECT city FROM admin_users WHERE id = auth.uid())
    )
);


-- ==========================================
-- 3. ENSURE PERMISSIONS
-- ==========================================

DO $$
DECLARE
    role_gm_id UUID;
    role_branch_id UUID;
    
    perm_view_all UUID;
    perm_manage_all UUID;
    perm_u_view_all UUID;
    
    perm_view_branch UUID;
    perm_manage_branch UUID;
    perm_u_view_branch UUID;
BEGIN
    SELECT id INTO role_gm_id FROM roles WHERE name = 'Genel Merkez Yöneticisi';
    SELECT id INTO role_branch_id FROM roles WHERE name = 'Şube Yöneticisi';
    
    -- Members Permissions
    SELECT id INTO perm_view_all FROM permissions WHERE key = 'members.view.all';
    SELECT id INTO perm_manage_all FROM permissions WHERE key = 'members.manage.all';
    SELECT id INTO perm_view_branch FROM permissions WHERE key = 'members.view.branch';
    SELECT id INTO perm_manage_branch FROM permissions WHERE key = 'members.manage.branch';

    -- Users Permissions
    SELECT id INTO perm_u_view_all FROM permissions WHERE key = 'users.view.all';
    SELECT id INTO perm_u_view_branch FROM permissions WHERE key = 'users.view.branch';
    
    -- Grant to Genel Merkez
    IF role_gm_id IS NOT NULL THEN
        IF perm_view_all IS NOT NULL THEN INSERT INTO role_permissions (role_id, permission_id) VALUES (role_gm_id, perm_view_all) ON CONFLICT DO NOTHING; END IF;
        IF perm_manage_all IS NOT NULL THEN INSERT INTO role_permissions (role_id, permission_id) VALUES (role_gm_id, perm_manage_all) ON CONFLICT DO NOTHING; END IF;
        IF perm_u_view_all IS NOT NULL THEN INSERT INTO role_permissions (role_id, permission_id) VALUES (role_gm_id, perm_u_view_all) ON CONFLICT DO NOTHING; END IF;
    END IF;
    
    -- Grant to Şube Yöneticisi
    IF role_branch_id IS NOT NULL THEN
        IF perm_view_branch IS NOT NULL THEN INSERT INTO role_permissions (role_id, permission_id) VALUES (role_branch_id, perm_view_branch) ON CONFLICT DO NOTHING; END IF;
        IF perm_manage_branch IS NOT NULL THEN INSERT INTO role_permissions (role_id, permission_id) VALUES (role_branch_id, perm_manage_branch) ON CONFLICT DO NOTHING; END IF;
        IF perm_u_view_branch IS NOT NULL THEN INSERT INTO role_permissions (role_id, permission_id) VALUES (role_branch_id, perm_u_view_branch) ON CONFLICT DO NOTHING; END IF;
    END IF;
    
END $$;
