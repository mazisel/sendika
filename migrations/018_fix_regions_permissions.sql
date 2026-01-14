-- Explicitly grant permissions to Supabase roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE regions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE regions TO service_role;
GRANT SELECT ON TABLE regions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE region_city_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE region_city_assignments TO service_role;
GRANT SELECT ON TABLE region_city_assignments TO anon;

-- Ensure RLS is enabled
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_city_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent duplicates/conflicts
DROP POLICY IF EXISTS "Public read access for regions" ON regions;
DROP POLICY IF EXISTS "Admin write access for regions" ON regions;
DROP POLICY IF EXISTS "Admin update access for regions" ON regions;
DROP POLICY IF EXISTS "Admin delete access for regions" ON regions;

DROP POLICY IF EXISTS "Public read access for region_city_assignments" ON region_city_assignments;
DROP POLICY IF EXISTS "Admin write access for region_city_assignments" ON region_city_assignments;
DROP POLICY IF EXISTS "Admin update access for region_city_assignments" ON region_city_assignments;
DROP POLICY IF EXISTS "Admin delete access for region_city_assignments" ON region_city_assignments;

-- Re-create Policies for regions
CREATE POLICY "Public read access for regions"
    ON regions FOR SELECT
    USING (true);

CREATE POLICY "Admin write access for regions"
    ON regions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin update access for regions"
    ON regions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin delete access for regions"
    ON regions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Re-create Policies for region_city_assignments
CREATE POLICY "Public read access for region_city_assignments"
    ON region_city_assignments FOR SELECT
    USING (true);

CREATE POLICY "Admin write access for region_city_assignments"
    ON region_city_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin update access for region_city_assignments"
    ON region_city_assignments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admin delete access for region_city_assignments"
    ON region_city_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );
