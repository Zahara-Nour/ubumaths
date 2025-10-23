-- =====================================================
-- Migration: Error Monitoring System
-- Description: Custom error monitoring and logging system
-- =====================================================

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS admin_view_error_logs ON error_logs;
  DROP POLICY IF EXISTS admin_insert_error_logs ON error_logs;
  DROP POLICY IF EXISTS admin_update_error_logs ON error_logs;
  DROP POLICY IF EXISTS admin_delete_error_logs ON error_logs;
  DROP POLICY IF EXISTS service_insert_error_logs ON error_logs;
  DROP POLICY IF EXISTS admin_view_error_occurrences ON error_occurrences;
  DROP POLICY IF EXISTS service_manage_error_occurrences ON error_occurrences;
EXCEPTION WHEN undefined_table THEN
  -- Tables don't exist yet, that's fine
  NULL;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_error_signature ON error_logs;
DROP TRIGGER IF EXISTS trigger_update_error_occurrence ON error_logs;
DROP TRIGGER IF EXISTS trigger_error_occurrences_updated_at ON error_occurrences;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS set_error_signature() CASCADE;
DROP FUNCTION IF EXISTS update_error_occurrence() CASCADE;
DROP FUNCTION IF EXISTS generate_error_signature(TEXT, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS upsert_error_occurrence(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_errors(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_error_stats(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS resolve_error(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS resolve_error_by_signature(TEXT, UUID, TEXT) CASCADE;

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL CHECK (
    error_type IN ('client_js', 'server_api', 'server_load', 'server_action', 'validation', 'performance', 'database')
  ),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL CHECK (char_length(message) > 0),
  stack_trace TEXT,
  error_name TEXT,
  url TEXT NOT NULL,
  file_path TEXT,
  line_number INTEGER,
  column_number INTEGER,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_role TEXT CHECK (user_role IN ('student', 'teacher', 'admin')),
  session_id TEXT,
  request_method TEXT,
  status_code INTEGER,
  request_headers JSONB,
  request_body JSONB,
  response_time INTEGER,
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  device_type TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  context JSONB,
  tags TEXT[],
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  error_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((resolved = FALSE) OR (resolved = TRUE AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS error_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_signature TEXT NOT NULL UNIQUE,
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  line_number INTEGER,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  last_error_log_id UUID REFERENCES error_logs(id) ON DELETE SET NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity ON error_logs(error_type, severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(created_at DESC) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, resolved_at DESC) WHERE resolved = TRUE;
CREATE INDEX IF NOT EXISTS idx_error_logs_signature ON error_logs(error_signature) WHERE error_signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_url ON error_logs(url);
CREATE INDEX IF NOT EXISTS idx_error_logs_session ON error_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_occurrences_signature ON error_occurrences(error_signature);
CREATE INDEX IF NOT EXISTS idx_error_occurrences_last_seen ON error_occurrences(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_occurrences_count ON error_occurrences(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_error_occurrences_unresolved ON error_occurrences(last_seen DESC) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_occurrences_type_severity ON error_occurrences(error_type, severity);

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_error_signature(
  p_error_type TEXT,
  p_message TEXT,
  p_file_path TEXT,
  p_line_number INTEGER
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      COALESCE(p_error_type, '') || '||' ||
      COALESCE(p_message, '') || '||' ||
      COALESCE(p_file_path, '') || '||' ||
      COALESCE(p_line_number::TEXT, ''),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION upsert_error_occurrence(
  p_error_signature TEXT,
  p_error_log_id UUID,
  p_error_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_url TEXT,
  p_file_path TEXT,
  p_line_number INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_occurrence_count INTEGER;
BEGIN
  INSERT INTO error_occurrences (
    error_signature, error_type, severity, message, url, file_path, line_number,
    last_error_log_id, last_seen, occurrence_count
  ) VALUES (
    p_error_signature, p_error_type, p_severity, p_message, p_url, p_file_path, p_line_number,
    p_error_log_id, NOW(), 1
  )
  ON CONFLICT (error_signature) DO UPDATE SET
    last_seen = NOW(),
    occurrence_count = error_occurrences.occurrence_count + 1,
    last_error_log_id = p_error_log_id,
    updated_at = NOW()
  RETURNING occurrence_count INTO v_occurrence_count;

  RETURN v_occurrence_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_errors(p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM error_logs
    WHERE resolved = TRUE AND resolved_at < NOW() - (p_days_old || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_error_stats(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  total_errors BIGINT,
  unresolved_errors BIGINT,
  critical_errors BIGINT,
  errors_last_hour BIGINT,
  unique_errors BIGINT,
  most_common_error_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE resolved = FALSE)::BIGINT,
    COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::BIGINT,
    COUNT(DISTINCT error_signature)::BIGINT,
    MODE() WITHIN GROUP (ORDER BY error_type)
  FROM error_logs
  WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION resolve_error(
  p_error_log_id UUID,
  p_resolved_by UUID,
  p_notes TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_signature TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can resolve errors';
  END IF;

  UPDATE error_logs
  SET resolved = TRUE, resolved_by = p_resolved_by, resolved_at = NOW(), resolution_notes = p_notes
  WHERE id = p_error_log_id
  RETURNING error_signature INTO v_signature;

  IF v_signature IS NOT NULL THEN
    UPDATE error_occurrences SET is_resolved = TRUE WHERE error_signature = v_signature;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION resolve_error_by_signature(
  p_error_signature TEXT,
  p_resolved_by UUID,
  p_notes TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can resolve errors';
  END IF;

  WITH updated AS (
    UPDATE error_logs
    SET resolved = TRUE, resolved_by = p_resolved_by, resolved_at = NOW(), resolution_notes = p_notes
    WHERE error_signature = p_error_signature AND resolved = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  UPDATE error_occurrences SET is_resolved = TRUE WHERE error_signature = p_error_signature;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION set_error_signature()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.error_signature IS NULL THEN
    NEW.error_signature := generate_error_signature(
      NEW.error_type, NEW.message, NEW.file_path, NEW.line_number
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_error_signature
  BEFORE INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_error_signature();

CREATE OR REPLACE FUNCTION update_error_occurrence()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM upsert_error_occurrence(
    NEW.error_signature, NEW.id, NEW.error_type, NEW.severity,
    NEW.message, NEW.url, NEW.file_path, NEW.line_number
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_error_occurrence
  AFTER INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_occurrence();

CREATE TRIGGER trigger_error_occurrences_updated_at
  BEFORE UPDATE ON error_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_view_error_logs ON error_logs
  FOR SELECT USING (is_admin());

CREATE POLICY admin_insert_error_logs ON error_logs
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY admin_update_error_logs ON error_logs
  FOR UPDATE USING (is_admin());

CREATE POLICY admin_delete_error_logs ON error_logs
  FOR DELETE USING (is_admin());

CREATE POLICY service_insert_error_logs ON error_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY admin_view_error_occurrences ON error_occurrences
  FOR SELECT USING (is_admin());

CREATE POLICY service_manage_error_occurrences ON error_occurrences
  FOR ALL USING (true);
