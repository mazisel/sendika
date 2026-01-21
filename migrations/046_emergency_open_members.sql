-- EMERGENCY OPEN: Members and Dashboard
-- We are bypassing all RLS checks for viewing members to unblock the user and verify data existence.

-- 1. Open Members Table for Reading (Authenticated Only)
DROP POLICY IF EXISTS "Allow view members" ON members;
DROP POLICY IF EXISTS "Emergency view members" ON members;

CREATE POLICY "Emergency view members" ON members
FOR SELECT
TO authenticated
USING (true); -- UNCONDITIONAL TRUE for anyone logged in

-- 2. Fix Dashboard Stats Function (get_city_stats)
-- We change it to SECURITY DEFINER to ignore RLS rules on valid tables
CREATE OR REPLACE FUNCTION get_city_stats()
RETURNS TABLE (
  city_name text,
  active_count bigint,
  resigned_count bigint,
  registered_count bigint,
  online_applications_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.city::text as city_name,
    COUNT(*) FILTER (WHERE m.membership_status = 'active') as active_count,
    COUNT(*) FILTER (WHERE m.membership_status IN ('inactive', 'suspended', 'resigned')) as resigned_count,
    COUNT(*) as registered_count,
    COUNT(*) FILTER (WHERE m.membership_status = 'pending') as online_applications_count
  FROM members m
  WHERE m.city IS NOT NULL
  GROUP BY m.city;
END;
$$;

-- 3. Ensure Grants are correct
GRANT SELECT ON members TO authenticated;
GRANT EXECUTE ON FUNCTION get_city_stats() TO authenticated;
