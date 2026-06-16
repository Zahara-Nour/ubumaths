-- ============================================================================
-- Migration: Create bug_reports_config table (singleton configuration)
-- Description: Global configuration for bug reporting feature toggles
-- Date: 2025-12-29
-- ============================================================================
--
-- This migration creates a singleton configuration table that controls:
-- - FAB (Floating Action Button) visibility
-- - Freeze detection feature
-- - Freeze prompt feature
-- - Auto-report feature for detected issues
--
-- Security:
-- - Only admins can view and update the configuration
-- - Singleton pattern enforced via unique constraint on singleton_key
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE: bug_reports_config
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bug_reports_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Singleton enforcement: only one row allowed with key 'global'
  singleton_key TEXT NOT NULL UNIQUE DEFAULT 'global',

  -- Feature toggles
  fab_enabled BOOLEAN NOT NULL DEFAULT true,
  freeze_detection_enabled BOOLEAN NOT NULL DEFAULT true,
  freeze_prompt_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_report_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Audit trail
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Singleton constraint: ensures only 'global' value is allowed
  CONSTRAINT bug_reports_config_singleton CHECK (singleton_key = 'global')
);

-- ============================================================================
-- 2. INSERT: Initial global configuration row
-- ============================================================================

INSERT INTO public.bug_reports_config (singleton_key)
VALUES ('global')
ON CONFLICT (singleton_key) DO NOTHING;

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE public.bug_reports_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES (Admin-only access)
-- ============================================================================

-- 4.1 Admins can view the configuration
CREATE POLICY "Admins can view bug reports config"
  ON public.bug_reports_config
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 4.2 Admins can update the configuration
CREATE POLICY "Admins can update bug reports config"
  ON public.bug_reports_config
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Note: No INSERT or DELETE policies - singleton pattern means:
-- - Row is created by migration
-- - Row should never be deleted
-- - Additional rows cannot be inserted

-- ============================================================================
-- 5. TRIGGER: Auto-update updated_at on UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS update_bug_reports_config_updated_at
  ON public.bug_reports_config;

CREATE TRIGGER update_bug_reports_config_updated_at
  BEFORE UPDATE ON public.bug_reports_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Only SELECT and UPDATE needed (no INSERT/DELETE for singleton)
GRANT SELECT, UPDATE ON public.bug_reports_config TO authenticated;

-- ============================================================================
-- 7. COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE public.bug_reports_config IS
  'Singleton configuration table for bug reporting feature toggles. Contains exactly one row with singleton_key = ''global''.';

COMMENT ON COLUMN public.bug_reports_config.singleton_key IS
  'Enforces singleton pattern - must always be ''global''';

COMMENT ON COLUMN public.bug_reports_config.fab_enabled IS
  'Whether the Floating Action Button for bug reports is visible';

COMMENT ON COLUMN public.bug_reports_config.freeze_detection_enabled IS
  'Whether automatic freeze/hang detection is active';

COMMENT ON COLUMN public.bug_reports_config.freeze_prompt_enabled IS
  'Whether to prompt users when a freeze is detected';

COMMENT ON COLUMN public.bug_reports_config.auto_report_enabled IS
  'Whether to automatically create reports for detected issues';

COMMENT ON COLUMN public.bug_reports_config.updated_at IS
  'Last modification timestamp (auto-updated by trigger)';

COMMENT ON COLUMN public.bug_reports_config.updated_by IS
  'Admin who last modified the configuration';

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
  v_row_exists BOOLEAN;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'bug_reports_config'
  ) INTO v_table_exists;

  -- Check RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'bug_reports_config'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  -- Count table policies (expect 2: SELECT and UPDATE for admins)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'bug_reports_config';

  -- Check initial row exists
  SELECT EXISTS (
    SELECT 1 FROM public.bug_reports_config
    WHERE singleton_key = 'global'
  ) INTO v_row_exists;

  -- Output verification results
  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration: bug_reports_config';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Table created: %', v_table_exists;
  RAISE NOTICE 'RLS enabled: %', v_rls_enabled;
  RAISE NOTICE 'Policies created: % (expected: 2)', v_policy_count;
  RAISE NOTICE 'Initial row inserted: %', v_row_exists;
  RAISE NOTICE '';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run: pnpm db:migrate';
  RAISE NOTICE '  2. Update: src/lib/types/database.ts';
  RAISE NOTICE '  3. Update: docs/architecture/database-schema.md';
  RAISE NOTICE '===============================================';

  -- Validate critical items
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'Table bug_reports_config was not created!';
  END IF;

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'RLS is not enabled on bug_reports_config!';
  END IF;

  IF v_policy_count < 2 THEN
    RAISE EXCEPTION 'Not all policies were created! Expected 2, got %', v_policy_count;
  END IF;

  IF NOT v_row_exists THEN
    RAISE EXCEPTION 'Initial configuration row was not inserted!';
  END IF;
END $$;
