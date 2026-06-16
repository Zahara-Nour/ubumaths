-- =====================================================
-- Migration: Add delete_all_resolved_errors function
-- Description: Admin function to delete all resolved errors (hard delete)
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_all_resolved_errors() CASCADE;

-- =====================================================
-- FUNCTION: delete_all_resolved_errors
-- =====================================================

CREATE OR REPLACE FUNCTION delete_all_resolved_errors()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all resolved errors and count them
  WITH deleted AS (
    DELETE FROM error_logs
    WHERE resolved = TRUE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function documentation
COMMENT ON FUNCTION delete_all_resolved_errors IS 'Deletes all resolved errors from the database (admin only, hard delete). WARNING: This is a destructive operation that permanently removes all resolved errors regardless of age.';
