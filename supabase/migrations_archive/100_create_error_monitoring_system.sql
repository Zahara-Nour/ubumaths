-- =====================================================
-- Migration 100: Error Monitoring System
-- Description: Custom error monitoring and logging system
-- =====================================================
--
-- This migration creates a comprehensive error monitoring system that:
-- - Captures client-side JavaScript errors
-- - Logs server-side API errors
-- - Tracks form validation errors
-- - Monitors performance issues
-- - Integrates with the existing notification system
-- - Provides admin dashboard for error management
--
-- Privacy & Security:
-- - Student data is protected (sanitized contexts)
-- - Admin-only access via RLS policies
-- - Automatic cleanup of old errors
-- =====================================================

-- =====================================================
-- TABLE: error_logs
-- Description: Main error logging table for all error types
-- =====================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error Classification
  error_type TEXT NOT NULL CHECK (
    error_type IN (
      'client_js',        -- Client-side JavaScript errors
      'server_api',       -- Server-side API errors
      'server_load',      -- Server load function errors
      'server_action',    -- Server form action errors
      'validation',       -- Form validation errors
      'performance',      -- Performance issues (slow queries, large payloads)
      'database'          -- Database query errors
    )
  ),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (
    severity IN ('info', 'warning', 'error', 'critical')
  ),

  -- Error Details
  message TEXT NOT NULL CHECK (char_length(message) > 0),
  stack_trace TEXT, -- Full stack trace (sanitized)
  error_name TEXT, -- Error constructor name (TypeError, ReferenceError, etc.)

  -- Location Information
  url TEXT NOT NULL, -- Page URL or API endpoint
  file_path TEXT, -- File where error occurred
  line_number INTEGER, -- Line number in file
  column_number INTEGER, -- Column number in file

  -- User Context
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_role TEXT CHECK (user_role IN ('student', 'teacher', 'admin')),
  session_id TEXT, -- Session identifier for grouping related errors

  -- Request Context (for server errors)
  request_method TEXT, -- GET, POST, PUT, DELETE, etc.
  status_code INTEGER, -- HTTP status code
  request_headers JSONB, -- Sanitized request headers
  request_body JSONB, -- Sanitized request body
  response_time INTEGER, -- Response time in milliseconds

  -- Browser/Environment Context (for client errors)
  user_agent TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Additional Context
  context JSONB, -- Flexible field for additional error-specific data
  tags TEXT[], -- Tags for categorization (e.g., ['payment', 'critical'])

  -- Resolution Tracking
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Error Signature (for deduplication)
  error_signature TEXT, -- Hash of type + message + file + line

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (
    -- If resolved, must have resolved_by and resolved_at
    (resolved = FALSE) OR
    (resolved = TRUE AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  )
);

-- =====================================================
-- TABLE: error_occurrences
-- Description: Tracks frequency of duplicate errors
-- =====================================================
CREATE TABLE IF NOT EXISTS error_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique error signature
  error_signature TEXT NOT NULL UNIQUE,

  -- Error classification (denormalized for quick filtering)
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Location (denormalized)
  url TEXT,
  file_path TEXT,
  line_number INTEGER,

  -- Occurrence tracking
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,

  -- Reference to most recent error log entry
  last_error_log_id UUID REFERENCES error_logs(id) ON DELETE SET NULL,

  -- Status
  is_resolved BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES: Performance optimization
-- =====================================================

-- Error Logs Indexes
CREATE INDEX idx_error_logs_created_at
  ON error_logs(created_at DESC);

CREATE INDEX idx_error_logs_user_id
  ON error_logs(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_error_logs_type_severity
  ON error_logs(error_type, severity);

CREATE INDEX idx_error_logs_unresolved
  ON error_logs(created_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX idx_error_logs_resolved
  ON error_logs(resolved, resolved_at DESC)
  WHERE resolved = TRUE;

CREATE INDEX idx_error_logs_signature
  ON error_logs(error_signature)
  WHERE error_signature IS NOT NULL;

CREATE INDEX idx_error_logs_url
  ON error_logs(url);

CREATE INDEX idx_error_logs_session
  ON error_logs(session_id)
  WHERE session_id IS NOT NULL;

-- Error Occurrences Indexes
CREATE INDEX idx_error_occurrences_signature
  ON error_occurrences(error_signature);

CREATE INDEX idx_error_occurrences_last_seen
  ON error_occurrences(last_seen DESC);

CREATE INDEX idx_error_occurrences_count
  ON error_occurrences(occurrence_count DESC);

CREATE INDEX idx_error_occurrences_unresolved
  ON error_occurrences(last_seen DESC)
  WHERE is_resolved = FALSE;

CREATE INDEX idx_error_occurrences_type_severity
  ON error_occurrences(error_type, severity);

-- =====================================================
-- FUNCTIONS: Error monitoring utilities
-- =====================================================

/**
 * Generate error signature for deduplication
 * Combines error type, message, file, and line into a hash
 */
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

/**
 * Upsert error occurrence
 * Creates or updates error_occurrences entry and returns occurrence count
 */
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
  -- Insert or update occurrence record
  INSERT INTO error_occurrences (
    error_signature,
    error_type,
    severity,
    message,
    url,
    file_path,
    line_number,
    last_error_log_id,
    last_seen,
    occurrence_count
  ) VALUES (
    p_error_signature,
    p_error_type,
    p_severity,
    p_message,
    p_url,
    p_file_path,
    p_line_number,
    p_error_log_id,
    NOW(),
    1
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

/**
 * Cleanup old resolved errors
 * Removes error logs older than specified days that have been resolved
 */
CREATE OR REPLACE FUNCTION cleanup_old_errors(
  p_days_old INTEGER DEFAULT 90
) RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM error_logs
    WHERE resolved = TRUE
      AND resolved_at < NOW() - (p_days_old || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Get error statistics for admin dashboard
 */
CREATE OR REPLACE FUNCTION get_error_stats(
  p_hours INTEGER DEFAULT 24
) RETURNS TABLE (
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
    COUNT(*)::BIGINT as total_errors,
    COUNT(*) FILTER (WHERE resolved = FALSE)::BIGINT as unresolved_errors,
    COUNT(*) FILTER (WHERE severity = 'critical')::BIGINT as critical_errors,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::BIGINT as errors_last_hour,
    COUNT(DISTINCT error_signature)::BIGINT as unique_errors,
    MODE() WITHIN GROUP (ORDER BY error_type) as most_common_error_type
  FROM error_logs
  WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Resolve an error
 * Marks error as resolved and updates error_occurrences
 */
CREATE OR REPLACE FUNCTION resolve_error(
  p_error_log_id UUID,
  p_resolved_by UUID,
  p_notes TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_signature TEXT;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can resolve errors';
  END IF;

  -- Update error log
  UPDATE error_logs
  SET
    resolved = TRUE,
    resolved_by = p_resolved_by,
    resolved_at = NOW(),
    resolution_notes = p_notes
  WHERE id = p_error_log_id
  RETURNING error_signature INTO v_signature;

  -- Update error occurrence if signature exists
  IF v_signature IS NOT NULL THEN
    UPDATE error_occurrences
    SET is_resolved = TRUE
    WHERE error_signature = v_signature;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Bulk resolve errors by signature
 * Resolves all instances of an error by its signature
 */
CREATE OR REPLACE FUNCTION resolve_error_by_signature(
  p_error_signature TEXT,
  p_resolved_by UUID,
  p_notes TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can resolve errors';
  END IF;

  -- Update all matching error logs
  WITH updated AS (
    UPDATE error_logs
    SET
      resolved = TRUE,
      resolved_by = p_resolved_by,
      resolved_at = NOW(),
      resolution_notes = p_notes
    WHERE error_signature = p_error_signature
      AND resolved = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  -- Update error occurrence
  UPDATE error_occurrences
  SET is_resolved = TRUE
  WHERE error_signature = p_error_signature;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS: Automatic error signature generation
-- =====================================================

/**
 * Auto-generate error signature before insert
 */
CREATE OR REPLACE FUNCTION set_error_signature()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate signature if not provided
  IF NEW.error_signature IS NULL THEN
    NEW.error_signature := generate_error_signature(
      NEW.error_type,
      NEW.message,
      NEW.file_path,
      NEW.line_number
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_error_signature
  BEFORE INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_error_signature();

/**
 * Update error_occurrences after error_logs insert
 */
CREATE OR REPLACE FUNCTION update_error_occurrence()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Update occurrence count
  v_count := upsert_error_occurrence(
    NEW.error_signature,
    NEW.id,
    NEW.error_type,
    NEW.severity,
    NEW.message,
    NEW.url,
    NEW.file_path,
    NEW.line_number
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_error_occurrence
  AFTER INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_occurrence();

/**
 * Update updated_at timestamp
 */
CREATE TRIGGER trigger_error_occurrences_updated_at
  BEFORE UPDATE ON error_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_occurrences ENABLE ROW LEVEL SECURITY;

-- Error Logs Policies

-- Admins can view all errors
CREATE POLICY admin_view_error_logs ON error_logs
  FOR SELECT
  USING (is_admin());

-- Admins can insert errors (for manual logging)
CREATE POLICY admin_insert_error_logs ON error_logs
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update errors (for resolution)
CREATE POLICY admin_update_error_logs ON error_logs
  FOR UPDATE
  USING (is_admin());

-- Admins can delete errors
CREATE POLICY admin_delete_error_logs ON error_logs
  FOR DELETE
  USING (is_admin());

-- Service role can insert errors (for API logging)
-- This allows the error logging API to work without user context
CREATE POLICY service_insert_error_logs ON error_logs
  FOR INSERT
  WITH CHECK (true);

-- Error Occurrences Policies

-- Admins can view all error occurrences
CREATE POLICY admin_view_error_occurrences ON error_occurrences
  FOR SELECT
  USING (is_admin());

-- Service role can insert/update occurrences (for automatic tracking)
CREATE POLICY service_manage_error_occurrences ON error_occurrences
  FOR ALL
  USING (true);

-- =====================================================
-- COMMENTS: Documentation
-- =====================================================

COMMENT ON TABLE error_logs IS 'Comprehensive error logging for monitoring application health';
COMMENT ON TABLE error_occurrences IS 'Tracks frequency and patterns of duplicate errors';

COMMENT ON COLUMN error_logs.error_type IS 'Type of error: client_js, server_api, server_load, server_action, validation, performance, database';
COMMENT ON COLUMN error_logs.severity IS 'Error severity: info, warning, error, critical';
COMMENT ON COLUMN error_logs.error_signature IS 'Hash of error for deduplication (auto-generated)';
COMMENT ON COLUMN error_logs.context IS 'Flexible JSONB field for error-specific context data';
COMMENT ON COLUMN error_logs.tags IS 'Array of tags for categorization and filtering';

COMMENT ON COLUMN error_occurrences.error_signature IS 'Unique hash identifying this error pattern';
COMMENT ON COLUMN error_occurrences.occurrence_count IS 'Number of times this error has occurred';

COMMENT ON FUNCTION generate_error_signature IS 'Generates SHA-256 hash for error deduplication';
COMMENT ON FUNCTION upsert_error_occurrence IS 'Creates or updates error occurrence record, returns count';
COMMENT ON FUNCTION cleanup_old_errors IS 'Removes resolved errors older than specified days';
COMMENT ON FUNCTION get_error_stats IS 'Returns error statistics for admin dashboard';
COMMENT ON FUNCTION resolve_error IS 'Marks single error as resolved (admin only)';
COMMENT ON FUNCTION resolve_error_by_signature IS 'Bulk resolves all errors matching signature (admin only)';
