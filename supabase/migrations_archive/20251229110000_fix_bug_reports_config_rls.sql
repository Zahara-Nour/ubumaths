-- ============================================================================
-- Migration: Fix bug_reports_config RLS for authenticated users
-- ============================================================================
-- Description: Allow all authenticated users to read config (not just admins)
--              This is needed so the FAB and freeze detection can check if enabled
-- ============================================================================

-- Drop the admin-only SELECT policy
DROP POLICY IF EXISTS "Admins can view bug_reports_config" ON public.bug_reports_config;

-- Create new policy allowing all authenticated users to read
CREATE POLICY "Authenticated users can view bug_reports_config" ON public.bug_reports_config
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================================
-- Validation
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'bug_reports_config' AND schemaname = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration: bug_reports_config RLS fix';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Policies count: % (expected: 2)', policy_count;
  RAISE NOTICE '  - SELECT: all authenticated users';
  RAISE NOTICE '  - UPDATE: admins only';
  RAISE NOTICE '===============================================';
END $$;
