-- Drop old FK constraints referencing admin_users
ALTER TABLE regions DROP CONSTRAINT IF EXISTS regions_responsible_id_fkey;
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_responsible_id_fkey;

-- Add new FK constraints referencing members
ALTER TABLE regions 
    ADD CONSTRAINT regions_responsible_id_fkey 
    FOREIGN KEY (responsible_id) 
    REFERENCES members(id) 
    ON DELETE SET NULL;

ALTER TABLE branches 
    ADD CONSTRAINT branches_responsible_id_fkey 
    FOREIGN KEY (responsible_id) 
    REFERENCES members(id) 
    ON DELETE SET NULL;
