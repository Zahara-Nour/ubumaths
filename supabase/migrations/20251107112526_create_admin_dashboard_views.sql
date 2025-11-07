-- Migration: Admin dashboard materialized views
-- Purpose: Pre-aggregate expensive statistics for admin health dashboard
-- Date: 2025-11-07

-- ============================================================================
-- ERROR STATISTICS VIEW (Last 24h)
-- ============================================================================
-- Aggregates error counts by severity and time windows
-- Used by: /api/admin/health endpoint
CREATE OR REPLACE VIEW public.admin_error_stats_24h AS
SELECT
  -- Critical errors by time window
  COUNT(*) FILTER (
    WHERE severity = 'critical'
    AND created_at > now() - interval '24 hours'
  ) as critical_errors_24h,

  COUNT(*) FILTER (
    WHERE severity = 'critical'
    AND created_at > now() - interval '1 hour'
  ) as critical_errors_1h,

  -- Unresolved errors
  COUNT(*) FILTER (WHERE resolved = false) as unresolved_errors,

  -- Total errors by time window
  COUNT(*) FILTER (
    WHERE created_at > now() - interval '24 hours'
  ) as total_errors_24h,

  COUNT(*) FILTER (
    WHERE created_at > now() - interval '1 hour'
  ) as total_errors_1h,

  -- Additional metrics
  COUNT(*) FILTER (
    WHERE severity = 'error'
    AND created_at > now() - interval '24 hours'
  ) as error_level_24h,

  COUNT(*) FILTER (
    WHERE severity = 'warning'
    AND created_at > now() - interval '24 hours'
  ) as warning_level_24h
FROM public.error_logs;

-- Grant select to authenticated (RLS enforced at function level)
GRANT SELECT ON public.admin_error_stats_24h TO authenticated;

COMMENT ON VIEW public.admin_error_stats_24h IS
  'Pre-aggregated error statistics for admin dashboard. Refreshed on each query.';

-- ============================================================================
-- USER ACTIVITY STATISTICS VIEW
-- ============================================================================
-- Aggregates user counts by role and registration time windows
CREATE OR REPLACE VIEW public.admin_user_activity AS
SELECT
  -- New users by time window
  COUNT(*) FILTER (
    WHERE created_at > now() - interval '24 hours'
  ) as new_users_24h,

  COUNT(*) FILTER (
    WHERE created_at > now() - interval '7 days'
  ) as new_users_7d,

  COUNT(*) FILTER (
    WHERE created_at > now() - interval '30 days'
  ) as new_users_30d,

  -- Users by role
  COUNT(*) FILTER (WHERE role = 'student') as total_students,
  COUNT(*) FILTER (WHERE role = 'teacher') as total_teachers,
  COUNT(*) FILTER (WHERE role = 'admin') as total_admins,

  -- Total count
  COUNT(*) as total_users,

  -- Active users (users with activity in last 7 days)
  COUNT(*) FILTER (
    WHERE updated_at > now() - interval '7 days'
  ) as active_users_7d
FROM public.profiles;

GRANT SELECT ON public.admin_user_activity TO authenticated;

COMMENT ON VIEW public.admin_user_activity IS
  'Pre-aggregated user statistics by role and registration date.';

-- ============================================================================
-- ONLINE USERS VIEW
-- ============================================================================
-- Counts currently online users based on user_presence table
-- Considers user online if heartbeat within last 5 minutes
CREATE OR REPLACE VIEW public.admin_online_users AS
SELECT
  COUNT(*) as online_users,
  COUNT(*) FILTER (
    WHERE last_heartbeat > now() - interval '1 minute'
  ) as online_users_1m,
  COUNT(*) FILTER (
    WHERE last_heartbeat > now() - interval '5 minutes'
  ) as online_users_5m
FROM public.user_presence
WHERE last_heartbeat > now() - interval '5 minutes';

GRANT SELECT ON public.admin_online_users TO authenticated;

COMMENT ON VIEW public.admin_online_users IS
  'Real-time online user count from user_presence table.';

-- ============================================================================
-- CONTENT STATISTICS VIEW
-- ============================================================================
-- Aggregates content counts across all content types
CREATE OR REPLACE VIEW public.admin_content_stats AS
SELECT
  -- Content totals
  (SELECT COUNT(*) FROM public.exercises) as total_exercises,
  (SELECT COUNT(*) FROM public.assessments) as total_assessments,
  (SELECT COUNT(*) FROM public.riddles) as total_riddles,
  (SELECT COUNT(*) FROM public.srs_decks) as total_srs_decks,

  -- Recent activity (last 24h)
  (SELECT COUNT(*)
   FROM public.exercise_assignments
   WHERE assigned_at > now() - interval '24 hours'
  ) as assignments_24h,

  (SELECT COUNT(*)
   FROM public.exercise_completions
   WHERE completed_at > now() - interval '24 hours'
  ) as completions_24h;

GRANT SELECT ON public.admin_content_stats TO authenticated;

COMMENT ON VIEW public.admin_content_stats IS
  'Pre-aggregated content statistics for admin dashboard.';

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================
-- These views are NOT materialized to ensure real-time accuracy
-- For better performance, consider:
-- 1. Using server_cache table to cache view results (TTL: 60 seconds)
-- 2. Converting to materialized views with scheduled refresh
-- 3. Adding specific indexes on created_at columns if queries are slow
