-- Add last_login_at to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Function to sync auth.users.last_sign_in_at to public.members.last_login_at
CREATE OR REPLACE FUNCTION public.sync_last_login_to_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if member_id exists in user metadata
  IF NEW.raw_user_meta_data->>'member_id' IS NOT NULL THEN
    UPDATE public.members
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = (NEW.raw_user_meta_data->>'member_id')::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users update
-- We need to drop if exists first to avoid errors on re-runs
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_last_login_to_member();
