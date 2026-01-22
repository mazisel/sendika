-- SMS OTP Codes Table
-- Stores temporary OTP codes for SMS sending verification

CREATE TABLE IF NOT EXISTS sms_otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_sms_otp_admin_user ON sms_otp_codes(admin_user_id, used);
CREATE INDEX IF NOT EXISTS idx_sms_otp_expires ON sms_otp_codes(expires_at);

-- Grant permissions to service_role (for API access)
GRANT ALL ON sms_otp_codes TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON sms_otp_codes TO authenticated;

-- Disable RLS since this table is only accessed from server-side
ALTER TABLE sms_otp_codes DISABLE ROW LEVEL SECURITY;
