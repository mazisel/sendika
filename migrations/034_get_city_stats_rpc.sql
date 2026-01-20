CREATE OR REPLACE FUNCTION get_city_stats()
RETURNS TABLE (
  city_name text,
  active_count bigint,
  resigned_count bigint,
  registered_count bigint,
  online_applications_count bigint
) AS $$
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
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_city_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_city_stats() TO service_role;
