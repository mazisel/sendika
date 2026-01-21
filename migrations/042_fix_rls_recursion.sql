-- Fix Infinite Recursion in RLS Policies
-- The previous policies caused a loop: verifying access required querying admin_users, which triggered RLS, which required querying admin_users...

-- 1. Create a SECURITY DEFINER function to check role safely
-- This function runs with the privileges of the owner (postgres), bypassing RLS on admin_users.
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$;

-- 2. Update ADMIN_USERS Policies to use the safe function
DROP POLICY IF EXISTS "Allow view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow manage admin_users" ON admin_users;

CREATE POLICY "Allow view admin_users" ON admin_users
FOR SELECT USING (
    -- 1. View Own Profile
    auth.uid() = id
    OR
    -- 2. Super Admin (Safe Check)
    public.current_user_is_super_admin()
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

CREATE POLICY "Allow manage admin_users" ON admin_users
FOR ALL USING (
    -- 1. Super Admin (Safe Check)
    public.current_user_is_super_admin()
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

-- 3. Update MEMBERS Policies to use the safe function (Efficiency & Safety)
DROP POLICY IF EXISTS "Allow view members" ON members;
DROP POLICY IF EXISTS "Allow manage members" ON members;

CREATE POLICY "Allow view members" ON members
FOR SELECT USING (
    -- 1. Super Admin (Safe Check)
    public.current_user_is_super_admin()
    OR
    -- 2. Global View Permission
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
    -- 4. Branch View Permission
    (
        public.check_user_permission('members.view.branch')
        AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() AND admin_users.city = members.city
        )
    )
);

CREATE POLICY "Allow manage members" ON members
FOR ALL USING (
    -- 1. Super Admin (Safe Check)
    public.current_user_is_super_admin()
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

-- 4. Grant Execute Permission
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO service_role;
