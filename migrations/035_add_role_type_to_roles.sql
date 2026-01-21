-- Add role_type to roles table
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS role_type TEXT CHECK (
  role_type IS NULL OR 
  role_type IN ('general_manager', 'regional_manager', 'branch_manager')
);

-- Init existing roles (optional - can be done manually or via UI)
-- Example: UPDATE roles SET role_type = 'general_manager' WHERE is_system_role = true;
