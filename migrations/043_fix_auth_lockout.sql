-- Fix Auth Lockout: ID Mismatch Issue
-- The previous RLS policies assumed admin_users.id matches auth.uid().
-- If they don't match, users cannot see their own rows or verify their role.
-- We add EMAIL-based checks using the JWT claims as a fallback.

-- 1. Update Safe Function to check by Email as well
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_email text;
BEGIN
  -- Get email from JWT
  current_email := current_setting('request.jwt.claim.email', true);

  RETURN EXISTS (
      SELECT 1 FROM admin_users 
      WHERE 
        (
            id = auth.uid() -- If IDs match
            OR
            (current_email IS NOT NULL AND email = current_email) -- If IDs don't match
        )
        AND role = 'super_admin'
  );
END;
$$;

-- 2. Update ADMIN_USERS Policies with Email Fallback
DROP POLICY IF EXISTS "Allow view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow manage admin_users" ON admin_users;

CREATE POLICY "Allow view admin_users" ON admin_users
FOR SELECT USING (
    -- 1. View Own Profile (ID or Email)
    auth.uid() = id
    OR
    email = current_setting('request.jwt.claim.email', true)
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
        region = (
            SELECT region FROM admin_users 
            WHERE id = auth.uid() OR email = current_setting('request.jwt.claim.email', true)
            LIMIT 1
        )
    )
    OR
    -- 5. Branch View Permission
    (
        public.check_user_permission('users.view.branch')
        AND
        city = (
            SELECT city FROM admin_users 
            WHERE id = auth.uid() OR email = current_setting('request.jwt.claim.email', true)
            LIMIT 1
        )
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
        region = (
            SELECT region FROM admin_users 
            WHERE id = auth.uid() OR email = current_setting('request.jwt.claim.email', true)
            LIMIT 1
        )
    )
    OR
    -- 4. Branch Manage Permission
    (
        public.check_user_permission('users.manage.branch')
        AND
        city = (
            SELECT city FROM admin_users 
            WHERE id = auth.uid() OR email = current_setting('request.jwt.claim.email', true)
            LIMIT 1
        )
    )
);

-- 3. Update Check Permission Function to Support Email-based User Lookup
CREATE OR REPLACE FUNCTION public.check_user_permission(permission_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_email text;
BEGIN
  current_email := current_setting('request.jwt.claim.email', true);

  RETURN EXISTS (
    SELECT 1
    FROM admin_users au
    JOIN role_permissions rp ON au.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE 
        (au.id = auth.uid() OR (current_email IS NOT NULL AND au.email = current_email))
        AND p.key = permission_key
  );
END;
$$;

-- 4. Update MEMBERS Policies (using the updated check_user_permission)
-- We just need to re-apply them to be sure, using the ID/Email agnostic helper functions takes care of the logic.
-- The MEMBERS policies rely on `check_user_permission` and `current_user_is_super_admin`, 
-- so simply updating those functions fixes the members table RLS implicitly.
-- BUT, the `EXISTS` clauses inside explicit policies need update if they query admin_users directly.

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
            WHERE (id = auth.uid() OR email = current_setting('request.jwt.claim.email', true))
            AND admin_users.region = members.region
        )
    )
    OR
    -- 4. Branch View Permission
    (
        public.check_user_permission('members.view.branch')
        AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE (id = auth.uid() OR email = current_setting('request.jwt.claim.email', true))
            AND admin_users.city = members.city
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
            WHERE (id = auth.uid() OR email = current_setting('request.jwt.claim.email', true))
            AND admin_users.region = members.region
        )
    )
    OR
    -- 4. Branch Manage Permission
    (
        public.check_user_permission('members.manage.branch')
        AND
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE (id = auth.uid() OR email = current_setting('request.jwt.claim.email', true))
            AND admin_users.city = members.city
        )
    )
);
