-- ============================================================================
-- Migration: Allow authenticated users to create system notifications
-- ============================================================================
-- Description: Bug reports and other features need to create system notifications
--              for admins. Currently only teachers (their classes) and admins can
--              insert notifications. This adds a policy for system notifications.
-- ============================================================================

-- Allow authenticated users to create system notifications
-- System notifications have is_system = true and created_by = null
CREATE POLICY "Users can create system notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    is_system = true
    AND created_by IS NULL
    AND system_event_type IS NOT NULL
  );

-- ============================================================================
-- Validation
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'notifications' AND schemaname = 'public' AND cmd = 'INSERT';

  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration: System notifications RLS';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'INSERT policies count: % (expected: 3)', policy_count;
  RAISE NOTICE '  - Teachers can create for their classes';
  RAISE NOTICE '  - Admins can create any notification';
  RAISE NOTICE '  - Users can create system notifications (NEW)';
  RAISE NOTICE '===============================================';
END $$;
