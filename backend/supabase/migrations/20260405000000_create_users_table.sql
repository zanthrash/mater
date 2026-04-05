-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add user_id to assets
ALTER TABLE assets ADD COLUMN user_id uuid REFERENCES users(id);
CREATE INDEX IF NOT EXISTS assets_user_id_idx ON assets (user_id);
