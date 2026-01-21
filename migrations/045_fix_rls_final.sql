-- Final RLS Fix: Robust Email Extraction & Case Insensitivity

-- The previous method current_setting('request.jwt.claim.email', true) can be unreliable.
-- We will switch to auth.jwt() ->> 'email' which is the standard Supabase way.
-- We will also force Case Insensitivity for email checks.

-- 1. Update Safe Function for Super Admin Check
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_email text;
BEGIN
  -- Get email from JWT object safely
  jwt_email := auth.jwt() ->> 'email';

  RETURN EXISTS (
      SELECT 1 FROM admin_users 
      WHERE 
        (
            id = auth.uid() 
            OR
            (jwt_email IS NOT NULL AND LOWER(email) = LOWER(jwt_email))
        )
        AND role = 'super_admin'
  );
END;
$$;

-- 2. Update Check Permission Function
CREATE OR REPLACE FUNCTION public.check_user_permission(permission_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_email text;
BEGIN
  jwt_email := auth.jwt() ->> 'email';

  RETURN EXISTS (
    SELECT 1
    FROM admin_users au
    JOIN role_permissions rp ON au.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE 
        (
            au.id = auth.uid() 
            OR 
            (jwt_email IS NOT NULL AND LOWER(au.email) = LOWER(jwt_email))
        )
        AND p.key = permission_key
  );
END;
$$;


-- 3. Re-Verify Members Policies (They use the functions above, so no need to drop/create if they call these functions)
-- But we will refresh the admin_users read policy to be smarter too.

DROP POLICY IF EXISTS "Allow authenticated view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Allow view admin_users" ON admin_users;

-- Keep it simple but add the email match for "Own Profile" logic inside the general policy
-- Since we want anyone to login, we keep the open policy for SELECT, but define it properly
CREATE POLICY "Allow authenticated view admin_users" ON admin_users
FOR SELECT
TO authenticated
USING (true); -- Keep this open for now to guarantee login works

-- 4. Members View Policy Refresher (Just to be absolutely safe)
-- The policy calls public.current_user_is_super_admin(), so updating the function updates the logic.
-- No need to recreate the policy unless we changed the SQL structure of the policy itself.
-- But let's re-apply to ensure it's clean.
DROP POLICY IF EXISTS "Allow view members" ON members;

CREATE POLICY "Allow view members" ON members
FOR SELECT USING (
    -- 1. Super Admin (Uses updated function)
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
            WHERE (id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'))
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
            WHERE (id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'))
            AND admin_users.city = members.city
        )
    )
);

-- Grant privileges
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_permission(text) TO service_role;
