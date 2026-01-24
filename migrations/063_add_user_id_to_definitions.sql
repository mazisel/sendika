ALTER TABLE general_definitions ADD COLUMN user_id UUID REFERENCES admin_users(id);
