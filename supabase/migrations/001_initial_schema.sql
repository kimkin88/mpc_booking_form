-- MPC Booking Form — Full schema
-- Paste into the Supabase SQL editor. Safe to re-run (idempotent).
-- Includes portal raw token + per-portal field permissions.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- ENUMS (create if missing)
-- =====================

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'draft',
    'waiting_for_client',
    'client_updating',
    'ready_for_review',
    'changes_requested',
    'approved',
    'in_production',
    'completed',
    'archived',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE portal_status AS ENUM (
    'draft',
    'active',
    'submitted',
    'locked',
    'expired',
    'disabled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE field_permission AS ENUM (
    'hidden',
    'readonly',
    'editable',
    'required'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE site_type AS ENUM ('must_shoot', 'avoid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE file_category AS ENUM (
    'campaign_artwork',
    'brand_guidelines',
    'reference_mood',
    'purchase_order_invoice',
    'other_documents',
    'media_plan',
    'site_lists',
    'creatives'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE file_status AS ENUM (
    'missing',
    'requested',
    'uploaded',
    'under_review',
    'approved',
    'rejected',
    'not_required'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE actor_role AS ENUM ('admin', 'client', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_source AS ENUM ('admin_portal', 'client_portal', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================
-- TABLES
-- =====================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sb_number TEXT NOT NULL UNIQUE,
  status booking_status NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'GBP',
  budget NUMERIC(14, 2),
  budget_required BOOLEAN NOT NULL DEFAULT FALSE,
  brand TEXT,
  campaign_name TEXT,
  city_market TEXT,
  client_company TEXT,
  client_name TEXT,
  client_email TEXT,
  jcd_contact_name TEXT,
  jcd_contact_email TEXT,
  cc_emails TEXT[] NOT NULL DEFAULT '{}',
  format_type TEXT,
  format_type_other TEXT,
  campaign_start DATE,
  campaign_end DATE,
  calculated_delivery_date DATE,
  delivery_date_override DATE,
  in_charge_reference TEXT,
  in_charge_period_start DATE,
  in_charge_period_end DATE,
  portal_lock_date DATE,
  auto_lock_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  half_day_rate NUMERIC(14, 2) NOT NULL DEFAULT 640,
  full_day_rate NUMERIC(14, 2) NOT NULL DEFAULT 1040,
  rate_card_label TEXT NOT NULL DEFAULT 'JCD Rates',
  mpc_owner_name TEXT,
  mpc_backup_owner_name TEXT,
  mpc_chooses_sites BOOLEAN NOT NULL DEFAULT TRUE,
  po_required BOOLEAN NOT NULL DEFAULT FALSE,
  po_received BOOLEAN NOT NULL DEFAULT FALSE,
  po_number TEXT,
  payment_terms TEXT,
  billing_address TEXT,
  invoice_notes TEXT,
  internal_notes TEXT,
  client_notes TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_sb_number ON bookings(sb_number);
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_name ON bookings(campaign_name);
CREATE INDEX IF NOT EXISTS idx_bookings_client_company ON bookings(client_company);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Portal access (one per booking)
CREATE TABLE IF NOT EXISTS portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  access_token TEXT,
  access_token_hash TEXT NOT NULL,
  access_token_prefix TEXT NOT NULL,
  pin_hash TEXT,
  pin TEXT,
  status portal_status NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ,
  editing_locked BOOLEAN NOT NULL DEFAULT FALSE,
  manual_unlock BOOLEAN NOT NULL DEFAULT FALSE,
  status_portal_editable JSONB NOT NULL DEFAULT '{
    "draft": true,
    "waiting_for_client": true,
    "client_updating": true,
    "ready_for_review": true,
    "changes_requested": true,
    "approved": false,
    "in_production": false,
    "completed": false,
    "archived": false,
    "cancelled": false
  }'::jsonb,
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regenerated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN portal_access.access_token IS
  'Raw unique portal token. Admin-only (service role). Used to rebuild the client URL.';

COMMENT ON COLUMN portal_access.pin IS
  'Plain portal PIN for admin view/copy. Auth still uses pin_hash. Service-role only.';

COMMENT ON COLUMN portal_access.status_portal_editable IS
  'Map of booking_status → whether the client portal remains editable in that status.';

COMMENT ON COLUMN portal_access.manual_unlock IS
  'When true, admin explicitly unlocked editing; skip auto-lock and status-map soft locks until locked again.';

-- Idempotent add for databases created before manual_unlock existed
ALTER TABLE portal_access
  ADD COLUMN IF NOT EXISTS manual_unlock BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_portal_token_prefix ON portal_access(access_token_prefix);

-- Per-portal field permissions
CREATE TABLE IF NOT EXISTS portal_field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_access_id UUID NOT NULL REFERENCES portal_access(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  permission field_permission NOT NULL DEFAULT 'hidden',
  UNIQUE (portal_access_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_portal_field_permissions_portal
  ON portal_field_permissions(portal_access_id);

COMMENT ON TABLE portal_field_permissions IS
  'Per-portal client field permissions. Each portal link has its own permission set.';

-- Legacy booking-scoped permissions (kept only so re-runs can migrate old data)
CREATE TABLE IF NOT EXISTS booking_field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  permission field_permission NOT NULL DEFAULT 'hidden',
  UNIQUE (booking_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_field_permissions_booking ON booking_field_permissions(booking_id);

-- Copy legacy booking permissions onto portals when present
INSERT INTO portal_field_permissions (portal_access_id, field_key, permission)
SELECT pa.id, bfp.field_key, bfp.permission
FROM portal_access pa
JOIN booking_field_permissions bfp ON bfp.booking_id = pa.booking_id
ON CONFLICT (portal_access_id, field_key) DO NOTHING;

-- Portal sessions (server-side session tokens after PIN)
CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_access_id UUID NOT NULL REFERENCES portal_access(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions(session_token_hash);

-- Schedule / shoot requirement entries
CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  shoot_date DATE NOT NULL,
  day_length NUMERIC(3, 1),
  city TEXT,
  applied_rate NUMERIC(14, 2),
  applied_currency TEXT,
  format TEXT DEFAULT 'Shoot',
  live_start DATE,
  live_end DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT live_end_after_start CHECK (live_end IS NULL OR live_start IS NULL OR live_end >= live_start),
  CONSTRAINT day_length_half_or_full CHECK (day_length IS NULL OR day_length IN (0.5, 1))
);

CREATE INDEX IF NOT EXISTS idx_schedule_booking ON schedule_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule_entries(shoot_date);

-- Site entries
CREATE TABLE IF NOT EXISTS site_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type site_type NOT NULL,
  site_name TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  reference_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_booking ON site_entries(booking_id);

-- Category statuses (per booking / category)
CREATE TABLE IF NOT EXISTS file_category_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  category file_category NOT NULL,
  status file_status NOT NULL DEFAULT 'missing',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, category)
);

-- File assets
CREATE TABLE IF NOT EXISTS file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  category file_category NOT NULL,
  status file_status NOT NULL DEFAULT 'uploaded',
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_by_name TEXT,
  uploaded_via activity_source NOT NULL DEFAULT 'admin_portal',
  version INTEGER NOT NULL DEFAULT 1,
  parent_file_id UUID REFERENCES file_assets(id),
  is_removed BOOLEAN NOT NULL DEFAULT FALSE,
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_booking ON file_assets(booking_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON file_assets(booking_id, category);
CREATE INDEX IF NOT EXISTS idx_files_parent ON file_assets(parent_file_id);

-- Booking versions (immutable snapshots)
CREATE TABLE IF NOT EXISTS booking_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_by_name TEXT,
  source activity_source NOT NULL DEFAULT 'admin_portal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_booking ON booking_versions(booking_id);

-- Activity log (immutable)
CREATE TABLE IF NOT EXISTS activity_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  version_number INTEGER,
  actor_id UUID,
  actor_name TEXT NOT NULL,
  actor_role actor_role NOT NULL,
  action TEXT NOT NULL,
  section TEXT,
  field_name TEXT,
  previous_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  source activity_source NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_booking ON activity_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_activity_section ON activity_entries(booking_id, section);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_entries(booking_id, action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_entries(created_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'client')),
  recipient_id UUID,
  recipient_email TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);

-- Booking reminders (missing-fields + lock notices)
CREATE TABLE IF NOT EXISTS booking_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  missing_items JSONB NOT NULL DEFAULT '[]',
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking ON booking_reminders(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_reminders_type ON booking_reminders(booking_id, reminder_type);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, event_type)
);

-- =====================
-- TRIGGERS / FUNCTIONS
-- =====================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS portal_access_updated_at ON portal_access;
CREATE TRIGGER portal_access_updated_at
  BEFORE UPDATE ON portal_access
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS schedule_entries_updated_at ON schedule_entries;
CREATE TRIGGER schedule_entries_updated_at
  BEFORE UPDATE ON schedule_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS site_entries_updated_at ON site_entries;
CREATE TRIGGER site_entries_updated_at
  BEFORE UPDATE ON site_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('booking-files', 'booking-files', false, 26214400)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_field_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_category_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Bookings
DROP POLICY IF EXISTS "Admins manage bookings" ON bookings;
CREATE POLICY "Admins manage bookings"
  ON bookings FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Legacy booking field permissions
DROP POLICY IF EXISTS "Admins manage field permissions" ON booking_field_permissions;
CREATE POLICY "Admins manage field permissions"
  ON booking_field_permissions FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Portal field permissions
DROP POLICY IF EXISTS "Admins manage portal field permissions" ON portal_field_permissions;
CREATE POLICY "Admins manage portal field permissions"
  ON portal_field_permissions FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Portal access
DROP POLICY IF EXISTS "Admins manage portal access" ON portal_access;
CREATE POLICY "Admins manage portal access"
  ON portal_access FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Portal sessions
DROP POLICY IF EXISTS "Admins read portal sessions" ON portal_sessions;
CREATE POLICY "Admins read portal sessions"
  ON portal_sessions FOR SELECT TO authenticated
  USING (is_admin());

-- Schedule
DROP POLICY IF EXISTS "Admins manage schedule" ON schedule_entries;
CREATE POLICY "Admins manage schedule"
  ON schedule_entries FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Sites
DROP POLICY IF EXISTS "Admins manage sites" ON site_entries;
CREATE POLICY "Admins manage sites"
  ON site_entries FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- File category statuses
DROP POLICY IF EXISTS "Admins manage category statuses" ON file_category_statuses;
CREATE POLICY "Admins manage category statuses"
  ON file_category_statuses FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Files
DROP POLICY IF EXISTS "Admins manage files" ON file_assets;
CREATE POLICY "Admins manage files"
  ON file_assets FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Versions
DROP POLICY IF EXISTS "Admins read versions" ON booking_versions;
CREATE POLICY "Admins read versions"
  ON booking_versions FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins insert versions" ON booking_versions;
CREATE POLICY "Admins insert versions"
  ON booking_versions FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Activity
DROP POLICY IF EXISTS "Admins read activity" ON activity_entries;
CREATE POLICY "Admins read activity"
  ON activity_entries FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins insert activity" ON activity_entries;
CREATE POLICY "Admins insert activity"
  ON activity_entries FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Notifications
DROP POLICY IF EXISTS "Admins manage notifications" ON notifications;
CREATE POLICY "Admins manage notifications"
  ON notifications FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins manage booking reminders" ON booking_reminders;
CREATE POLICY "Admins manage booking reminders"
  ON booking_reminders FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins manage notification preferences" ON notification_preferences;
CREATE POLICY "Admins manage notification preferences"
  ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- Storage policies
DROP POLICY IF EXISTS "Admins upload booking files" ON storage.objects;
CREATE POLICY "Admins upload booking files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'booking-files' AND is_admin());

DROP POLICY IF EXISTS "Admins read booking files" ON storage.objects;
CREATE POLICY "Admins read booking files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'booking-files' AND is_admin());

DROP POLICY IF EXISTS "Admins update booking files" ON storage.objects;
CREATE POLICY "Admins update booking files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'booking-files' AND is_admin());

DROP POLICY IF EXISTS "Admins delete booking files" ON storage.objects;
CREATE POLICY "Admins delete booking files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'booking-files' AND is_admin());

-- Note: Client portal access is handled exclusively via service-role
-- API routes that validate portal tokens / sessions. Clients never
-- receive a Supabase anon JWT with direct table access.
