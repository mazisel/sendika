-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    responsible_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for regions
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Create region_city_assignments table
CREATE TABLE IF NOT EXISTS region_city_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE NOT NULL,
    city_code TEXT NOT NULL UNIQUE,
    city_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for region_city_assignments
ALTER TABLE region_city_assignments ENABLE ROW LEVEL SECURITY;

-- Add region_id and responsible_id to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- Policies for regions
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

-- Policies for region_city_assignments
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
