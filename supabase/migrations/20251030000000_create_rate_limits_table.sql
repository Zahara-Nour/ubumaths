-- Create rate_limits table for tracking login/signup/chatbot attempts
-- Replaces Redis-based rate limiting with database-based solution

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups and cleanup
CREATE INDEX idx_rate_limits_key ON rate_limits(key);
CREATE INDEX idx_rate_limits_expires_at ON rate_limits(expires_at);

-- Auto-cleanup function (removes expired entries)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits WHERE expires_at < NOW();
END;
$$;

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: No direct access (only through server functions)
-- This ensures rate limits can only be checked/modified via server-side code
CREATE POLICY "No direct access to rate_limits"
  ON rate_limits
  FOR ALL
  USING (false);

-- Grant necessary permissions for service role (used by server)
GRANT ALL ON rate_limits TO service_role;

-- Comment documentation
COMMENT ON TABLE rate_limits IS 'Database-based rate limiting for authentication endpoints and chatbot';
COMMENT ON COLUMN rate_limits.key IS 'Unique identifier for rate limit (e.g., "ratelimit:login:ip:192.168.1.1")';
COMMENT ON COLUMN rate_limits.count IS 'Number of attempts made within the window';
COMMENT ON COLUMN rate_limits.expires_at IS 'Timestamp when this rate limit entry expires';
COMMENT ON FUNCTION cleanup_expired_rate_limits() IS 'Removes expired rate limit entries (can be called periodically)';
