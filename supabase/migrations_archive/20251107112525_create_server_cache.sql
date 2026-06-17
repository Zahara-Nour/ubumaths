-- Migration: Server-side cache for expensive queries
-- Purpose: Enable server-side caching on Vercel serverless functions
-- Date: 2025-11-07

-- ============================================================================
-- SERVER CACHE TABLE
-- ============================================================================
-- Stores cached query results with automatic expiration
-- Used by API endpoints to reduce expensive repeated queries
CREATE TABLE IF NOT EXISTS public.server_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for efficient expiration cleanup and cache validation
-- Full index (not partial) because now() is not IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_server_cache_expires
  ON public.server_cache(expires_at);

-- Efficient key lookup (already covered by PRIMARY KEY, but explicit for clarity)
-- Primary key automatically creates unique index on 'key' column

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Only admins should interact with cache (prevents unauthorized cache poisoning)
ALTER TABLE public.server_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all cache operations
DROP POLICY IF EXISTS "Admins can manage cache" ON public.server_cache;
CREATE POLICY "Admins can manage cache"
  ON public.server_cache
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- CACHE CLEANUP FUNCTION
-- ============================================================================
-- Removes expired cache entries
-- Should be called by cron job or background worker
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS TABLE(deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  -- Delete expired entries
  DELETE FROM public.server_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$;

-- Grant execute to service role for background cleanup
GRANT EXECUTE ON FUNCTION public.cleanup_expired_cache() TO service_role;

-- Comment for documentation
COMMENT ON TABLE public.server_cache IS
  'Server-side cache for expensive queries. Entries auto-expire based on expires_at timestamp.';
COMMENT ON FUNCTION public.cleanup_expired_cache() IS
  'Removes expired cache entries. Should be called by cron job (e.g., every 5 minutes).';
