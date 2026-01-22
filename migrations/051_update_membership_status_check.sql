ALTER TABLE members
  DROP CONSTRAINT IF EXISTS members_membership_status_check;

ALTER TABLE members
  ADD CONSTRAINT members_membership_status_check
  CHECK (membership_status IN ('pending', 'active', 'inactive', 'suspended', 'resigned'));
