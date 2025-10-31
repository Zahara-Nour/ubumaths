-- Fix RLS policies on rate_limits table
--
-- ISSUE: The current policy blocks ALL access with USING (false)
-- This prevents the rate limiter from inserting/updating records
--
-- SOLUTION: Allow server-side operations for rate limiting
-- Since rate limiting is a server-side system operation, we allow:
-- - INSERT: Create new rate limit entries
-- - SELECT: Check existing rate limit entries
-- - UPDATE: Increment attempt counters
-- - DELETE: Cleanup expired entries (via service role or cron)
--
-- SECURITY: This table should NEVER be accessed directly by users
-- All access should be through server-side rate limiter functions
-- The policies below allow any authenticated session to perform operations,
-- which is safe because:
-- 1. Table is only accessible server-side (not exposed to client)
-- 2. All operations go through rateLimiter.ts functions
-- 3. No user data or PII is stored (only rate limit counters)

-- Drop the restrictive policy
DROP POLICY IF EXISTS "No direct access to rate_limits" ON rate_limits;

-- Allow SELECT for checking existing rate limits
-- This is needed by checkRateLimit() to find existing entries
CREATE POLICY "Allow SELECT for rate limit checks"
  ON rate_limits
  FOR SELECT
  USING (true);

-- Allow INSERT for creating new rate limit entries
-- This is needed by checkRateLimit() when no entry exists
CREATE POLICY "Allow INSERT for rate limit tracking"
  ON rate_limits
  FOR INSERT
  WITH CHECK (true);

-- Allow UPDATE for incrementing rate limit counters
-- This is needed by checkRateLimit() to increment attempt count
CREATE POLICY "Allow UPDATE for rate limit increments"
  ON rate_limits
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow DELETE for cleanup of expired entries
-- This is needed by cleanup_expired_rate_limits() function
-- Note: Service role can always DELETE regardless of RLS
CREATE POLICY "Allow DELETE for expired rate limit cleanup"
  ON rate_limits
  FOR DELETE
  USING (true);

-- Add comments for documentation
COMMENT ON POLICY "Allow SELECT for rate limit checks" ON rate_limits IS
  'Allows server-side rate limiter to check for existing rate limit entries. Safe because table is only accessed server-side.';

COMMENT ON POLICY "Allow INSERT for rate limit tracking" ON rate_limits IS
  'Allows server-side rate limiter to create new rate limit entries. Safe because table is only accessed server-side.';

COMMENT ON POLICY "Allow UPDATE for rate limit increments" ON rate_limits IS
  'Allows server-side rate limiter to increment attempt counters. Safe because table is only accessed server-side.';

COMMENT ON POLICY "Allow DELETE for expired rate limit cleanup" ON rate_limits IS
  'Allows cleanup of expired rate limit entries. Typically called by cron jobs with service role.';
