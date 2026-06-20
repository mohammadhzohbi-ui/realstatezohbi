
/*
# New Features Schema

## New Tables

### user_profiles
Stores authenticated user profiles with roles and permissions.
- id, user_id (FK to auth.users), name, email, role, permissions (jsonb), avatar_url, created_at

### notes
Sticky notes per user (Google Notes replacement).
- id, user_id, content, color, pinned, created_at, updated_at

### field_files
Cloud file storage for field use (upload from any device, download from any).
- id, name, file_url, file_size, mime_type, folder, description, uploaded_by, created_at

### payments
Financial records — income and expenses per client/work.
- id, client_id, work_type, survey_work_id, transaction_id, amount, currency, type, status, description, payment_date, notes, created_at

### cad_files
AutoCAD and drawing files organized by project.
- id, name, file_url, file_size, mime_type, survey_work_id, project_name, description, created_at

## Security
RLS enabled on all tables. Open access (anon + authenticated) for single-tenant usage except user_profiles which is auth-scoped.
*/

-- USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','employee','accountant','surveyor')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_profiles" ON user_profiles;
CREATE POLICY "users_read_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
CREATE POLICY "users_insert_own_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
CREATE POLICY "users_update_own_profile" ON user_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "users_delete_profile" ON user_profiles;
CREATE POLICY "users_delete_profile" ON user_profiles FOR DELETE TO authenticated USING (true);
-- Also allow anon to read (for initial setup check)
DROP POLICY IF EXISTS "anon_read_profiles" ON user_profiles;
CREATE POLICY "anon_read_profiles" ON user_profiles FOR SELECT TO anon USING (true);

-- NOTES
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#f97316',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE TO anon, authenticated USING (true);

-- FIELD FILES
CREATE TABLE IF NOT EXISTS field_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text,
  file_size bigint,
  mime_type text,
  folder text NOT NULL DEFAULT 'عام',
  description text,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE field_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_field_files" ON field_files;
CREATE POLICY "anon_select_field_files" ON field_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_field_files" ON field_files;
CREATE POLICY "anon_insert_field_files" ON field_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_field_files" ON field_files;
CREATE POLICY "anon_update_field_files" ON field_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_field_files" ON field_files;
CREATE POLICY "anon_delete_field_files" ON field_files FOR DELETE TO anon, authenticated USING (true);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  work_type text NOT NULL DEFAULT 'other' CHECK (work_type IN ('survey','transaction','consultation','daily','other')),
  survey_work_id uuid REFERENCES survey_works(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','LBP','EUR')),
  type text NOT NULL DEFAULT 'income' CHECK (type IN ('income','expense')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','cancelled')),
  description text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "anon_update_payments" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE TO anon, authenticated USING (true);

-- CAD FILES
CREATE TABLE IF NOT EXISTS cad_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text,
  file_size bigint,
  mime_type text,
  survey_work_id uuid REFERENCES survey_works(id) ON DELETE SET NULL,
  project_name text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cad_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_cad_files" ON cad_files;
CREATE POLICY "anon_select_cad_files" ON cad_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cad_files" ON cad_files;
CREATE POLICY "anon_insert_cad_files" ON cad_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cad_files" ON cad_files;
CREATE POLICY "anon_update_cad_files" ON cad_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cad_files" ON cad_files;
CREATE POLICY "anon_delete_cad_files" ON cad_files FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_field_files_folder ON field_files(folder);
