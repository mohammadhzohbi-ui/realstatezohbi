
/*
# Land Survey Office Application — Full Schema

## Purpose
Complete database schema for a mobile land surveying engineer office application.

## New Tables

### clients
Stores client contact information.
- id, name, phone, email, address, notes, created_at

### survey_works
Individual land survey jobs.
- id, client_id (FK→clients), governorate, district, area_name, property_number, notes, status (active|completed), created_at, completed_at

### survey_work_required_items
Checklist items (required stages) for a survey work.
- id, survey_work_id (FK→survey_works), name, completed, order_index, created_at

### survey_work_files
Files attached to a survey work.
- id, survey_work_id (FK→survey_works), name, file_url, file_size, mime_type, created_at

### transaction_types
User-defined types of legal/administrative transactions.
- id, name, description, created_at

### transaction_type_stages
Ordered stages within a transaction type.
- id, transaction_type_id (FK→transaction_types), name, description, image_url, notes, order_index, created_at

### transactions
Individual transaction instances linked to a type and a client.
- id, transaction_type_id (FK→transaction_types), client_id (FK→clients), governorate, district, area_name, property_number, notes, status (active|completed), created_at, completed_at

### transaction_stage_status
Per-stage completion tracking for each transaction.
- id, transaction_id (FK→transactions), stage_id (FK→transaction_type_stages), completed, notes, created_at

### transaction_files
Files attached to a transaction stage status.
- id, transaction_stage_status_id (FK→transaction_stage_status), name, file_url, file_size, mime_type, created_at

### appointments
Calendar appointments.
- id, client_id (FK→clients), title, work_type (survey|transaction), date, time, notes, property_ref, file_url, created_at

## Security
- RLS enabled on all tables with anon+authenticated permissive policies (single-tenant, no auth required).
*/

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_clients" ON clients;
CREATE POLICY "anon_select_clients" ON clients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clients" ON clients;
CREATE POLICY "anon_insert_clients" ON clients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clients" ON clients;
CREATE POLICY "anon_update_clients" ON clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clients" ON clients;
CREATE POLICY "anon_delete_clients" ON clients FOR DELETE TO anon, authenticated USING (true);

-- SURVEY WORKS
CREATE TABLE IF NOT EXISTS survey_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  governorate text NOT NULL,
  district text NOT NULL,
  area_name text NOT NULL,
  property_number text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE survey_works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_survey_works" ON survey_works;
CREATE POLICY "anon_select_survey_works" ON survey_works FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_survey_works" ON survey_works;
CREATE POLICY "anon_insert_survey_works" ON survey_works FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_survey_works" ON survey_works;
CREATE POLICY "anon_update_survey_works" ON survey_works FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_survey_works" ON survey_works;
CREATE POLICY "anon_delete_survey_works" ON survey_works FOR DELETE TO anon, authenticated USING (true);

-- SURVEY WORK REQUIRED ITEMS
CREATE TABLE IF NOT EXISTS survey_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_work_id uuid NOT NULL REFERENCES survey_works(id) ON DELETE CASCADE,
  name text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE survey_work_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_survey_work_items" ON survey_work_items;
CREATE POLICY "anon_select_survey_work_items" ON survey_work_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_survey_work_items" ON survey_work_items;
CREATE POLICY "anon_insert_survey_work_items" ON survey_work_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_survey_work_items" ON survey_work_items;
CREATE POLICY "anon_update_survey_work_items" ON survey_work_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_survey_work_items" ON survey_work_items;
CREATE POLICY "anon_delete_survey_work_items" ON survey_work_items FOR DELETE TO anon, authenticated USING (true);

-- SURVEY WORK FILES
CREATE TABLE IF NOT EXISTS survey_work_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_work_id uuid NOT NULL REFERENCES survey_works(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text,
  file_size bigint,
  mime_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE survey_work_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_survey_work_files" ON survey_work_files;
CREATE POLICY "anon_select_survey_work_files" ON survey_work_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_survey_work_files" ON survey_work_files;
CREATE POLICY "anon_insert_survey_work_files" ON survey_work_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_survey_work_files" ON survey_work_files;
CREATE POLICY "anon_update_survey_work_files" ON survey_work_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_survey_work_files" ON survey_work_files;
CREATE POLICY "anon_delete_survey_work_files" ON survey_work_files FOR DELETE TO anon, authenticated USING (true);

-- TRANSACTION TYPES
CREATE TABLE IF NOT EXISTS transaction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transaction_types" ON transaction_types;
CREATE POLICY "anon_select_transaction_types" ON transaction_types FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transaction_types" ON transaction_types;
CREATE POLICY "anon_insert_transaction_types" ON transaction_types FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transaction_types" ON transaction_types;
CREATE POLICY "anon_update_transaction_types" ON transaction_types FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transaction_types" ON transaction_types;
CREATE POLICY "anon_delete_transaction_types" ON transaction_types FOR DELETE TO anon, authenticated USING (true);

-- TRANSACTION TYPE STAGES
CREATE TABLE IF NOT EXISTS transaction_type_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type_id uuid NOT NULL REFERENCES transaction_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  notes text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transaction_type_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tts" ON transaction_type_stages;
CREATE POLICY "anon_select_tts" ON transaction_type_stages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tts" ON transaction_type_stages;
CREATE POLICY "anon_insert_tts" ON transaction_type_stages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tts" ON transaction_type_stages;
CREATE POLICY "anon_update_tts" ON transaction_type_stages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tts" ON transaction_type_stages;
CREATE POLICY "anon_delete_tts" ON transaction_type_stages FOR DELETE TO anon, authenticated USING (true);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type_id uuid REFERENCES transaction_types(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  governorate text,
  district text,
  area_name text,
  property_number text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE TO anon, authenticated USING (true);

-- TRANSACTION STAGE STATUS
CREATE TABLE IF NOT EXISTS transaction_stage_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES transaction_type_stages(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transaction_stage_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tss" ON transaction_stage_status;
CREATE POLICY "anon_select_tss" ON transaction_stage_status FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tss" ON transaction_stage_status;
CREATE POLICY "anon_insert_tss" ON transaction_stage_status FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tss" ON transaction_stage_status;
CREATE POLICY "anon_update_tss" ON transaction_stage_status FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tss" ON transaction_stage_status;
CREATE POLICY "anon_delete_tss" ON transaction_stage_status FOR DELETE TO anon, authenticated USING (true);

-- TRANSACTION FILES
CREATE TABLE IF NOT EXISTS transaction_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_stage_status_id uuid NOT NULL REFERENCES transaction_stage_status(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text,
  file_size bigint,
  mime_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transaction_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_transaction_files" ON transaction_files;
CREATE POLICY "anon_select_transaction_files" ON transaction_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transaction_files" ON transaction_files;
CREATE POLICY "anon_insert_transaction_files" ON transaction_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transaction_files" ON transaction_files;
CREATE POLICY "anon_update_transaction_files" ON transaction_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transaction_files" ON transaction_files;
CREATE POLICY "anon_delete_transaction_files" ON transaction_files FOR DELETE TO anon, authenticated USING (true);

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  work_type text NOT NULL DEFAULT 'survey' CHECK (work_type IN ('survey','transaction')),
  date date NOT NULL,
  time time,
  notes text,
  property_ref text,
  file_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_works_client ON survey_works(client_id);
CREATE INDEX IF NOT EXISTS idx_survey_works_status ON survey_works(status);
CREATE INDEX IF NOT EXISTS idx_survey_works_governorate ON survey_works(governorate);
CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
