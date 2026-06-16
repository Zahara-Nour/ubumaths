-- =====================================================
-- Migration: Fix delete_all_resolved_errors function
-- Description: Delete from BOTH error_logs AND error_occurrences
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS delete_all_resolved_errors() CASCADE;

-- =====================================================
-- FUNCTION: delete_all_resolved_errors (FIXED)
-- =====================================================

CREATE OR REPLACE FUNCTION delete_all_resolved_errors()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_logs_count INTEGER;
  v_deleted_occurrences_count INTEGER;
BEGIN
  -- Delete all resolved error_logs and count them
  WITH deleted_logs AS (
    DELETE FROM error_logs
    WHERE resolved = TRUE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_logs_count FROM deleted_logs;

  -- Delete all resolved error_occurrences and count them
  WITH deleted_occurrences AS (
    DELETE FROM error_occurrences
    WHERE is_resolved = TRUE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_occurrences_count FROM deleted_occurrences;

  -- Return the count of deleted error_logs (for consistency with other functions)
  RETURN v_deleted_logs_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function documentation
COMMENT ON FUNCTION delete_all_resolved_errors IS 'Deletes all resolved errors from BOTH error_logs and error_occurrences tables (admin only, hard delete). WARNING: This is a destructive operation that permanently removes all resolved errors regardless of age.';
