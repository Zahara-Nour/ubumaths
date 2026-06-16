-- ============================================================================
-- Migration: Fix Remaining Security Definer Views
-- Date: 2025-12-14
-- Description: Sets security_invoker = true on views missed in previous migration
-- ============================================================================

BEGIN;

-- Views that were missed in 20251214120000_fix_security_definer_views.sql

-- 1. admin_job_status
ALTER VIEW public.admin_job_status SET (security_invoker = true);
COMMENT ON VIEW public.admin_job_status IS
  'Latest execution status for each background job type. Uses security_invoker to respect RLS.';

-- 2. admin_job_failures
ALTER VIEW public.admin_job_failures SET (security_invoker = true);
COMMENT ON VIEW public.admin_job_failures IS
  'Aggregated job failures for last 24h. Uses security_invoker to respect RLS.';

-- 3. deck_stats_view
ALTER VIEW public.deck_stats_view SET (security_invoker = true);
COMMENT ON VIEW public.deck_stats_view IS
  'Pre-computed deck statistics. Uses security_invoker to respect RLS.';

-- 4. student_coursework_view
ALTER VIEW public.student_coursework_view SET (security_invoker = true);
COMMENT ON VIEW public.student_coursework_view IS
  'Student view of Google Classroom coursework. Uses security_invoker to respect RLS.';

-- 5. migration_review_tree
ALTER VIEW public.migration_review_tree SET (security_invoker = true);
COMMENT ON VIEW public.migration_review_tree IS
  'Aggregated review status for migration tracking. Uses security_invoker to respect RLS.';

-- 6. minesweeper_achievements_compat
ALTER VIEW public.minesweeper_achievements_compat SET (security_invoker = true);
COMMENT ON VIEW public.minesweeper_achievements_compat IS
  'Backwards compatibility view for legacy minesweeper achievements. Uses security_invoker to respect RLS.';

-- 7. minesweeper_student_achievements_compat
ALTER VIEW public.minesweeper_student_achievements_compat SET (security_invoker = true);
COMMENT ON VIEW public.minesweeper_student_achievements_compat IS
  'Backwards compatibility view for legacy student achievements. Uses security_invoker to respect RLS.';

-- 8. minesweeper_multiplayer_leaderboard
ALTER VIEW public.minesweeper_multiplayer_leaderboard SET (security_invoker = true);
COMMENT ON VIEW public.minesweeper_multiplayer_leaderboard IS
  'Ranked leaderboard with player stats. Uses security_invoker to respect RLS.';

-- Validation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed 8 remaining views:';
  RAISE NOTICE '  - admin_job_status';
  RAISE NOTICE '  - admin_job_failures';
  RAISE NOTICE '  - deck_stats_view';
  RAISE NOTICE '  - student_coursework_view';
  RAISE NOTICE '  - migration_review_tree';
  RAISE NOTICE '  - minesweeper_achievements_compat';
  RAISE NOTICE '  - minesweeper_student_achievements_compat';
  RAISE NOTICE '  - minesweeper_multiplayer_leaderboard';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
