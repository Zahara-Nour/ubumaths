-- Migration: Atomic Rate Limit Increment Function
-- Purpose: Fix race condition in rate limit upserts (TOCTOU vulnerability)
--
-- This function atomically increments a rate limit counter,
-- preventing race conditions where concurrent requests could
-- bypass rate limits.

/**
 * Atomically increment or create a rate limit entry
 *
 * Uses INSERT ... ON CONFLICT to atomically:
 * 1. Create a new entry with count=1 if key doesn't exist
 * 2. Increment count and update expires_at if key exists
 *
 * @param p_key - Rate limit key (e.g., 'tutor:hour:user-uuid')
 * @param p_expires_at - Expiration timestamp for this entry
 * @returns The new count after increment
 */
CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_key TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Atomic upsert with increment
    INSERT INTO rate_limits (key, count, expires_at)
    VALUES (p_key, 1, p_expires_at)
    ON CONFLICT (key) DO UPDATE
    SET
        count = rate_limits.count + 1,
        -- Update expiration if new one is later (extends window on activity)
        expires_at = GREATEST(rate_limits.expires_at, EXCLUDED.expires_at)
    RETURNING count INTO v_new_count;

    RETURN v_new_count;
END;
$$;

-- Grant execute permission to authenticated users (via service role)
GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION increment_rate_limit IS
'Atomically increments a rate limit counter, preventing TOCTOU race conditions.
Used by tutor rate limiter to ensure accurate rate limiting under concurrent load.';
