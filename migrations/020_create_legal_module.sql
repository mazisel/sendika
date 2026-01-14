-- Create legal_requests table
CREATE TABLE IF NOT EXISTS legal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    member_id UUID REFERENCES members(id), -- If the requester is a member (linked)
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('disciplinary', 'compensation', 'consultation', 'other')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_review', 'lawyer_assigned', 'completed', 'cancelled')) DEFAULT 'pending',
    assigned_to UUID REFERENCES admin_users(id), -- Admin/Lawyer handling the request
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE legal_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins and Legal Managers can do everything
CREATE POLICY "Admins and Legal Managers can do all" ON legal_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND (role_type IN ('super_admin', 'admin', 'legal_manager'))
        )
    );

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON legal_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create requests
CREATE POLICY "Users can create requests" ON legal_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update status to 'cancelled' (maybe) - Let's allow update for now if it is their own
CREATE POLICY "Users can update own requests" ON legal_requests
    FOR UPDATE
    USING (auth.uid() = user_id);
