-- Migration: Atomic Check-And-Increment Rate Limit Function
-- Purpose: Replace the application-level SELECT/UPDATE/INSERT/retry pattern in
--          rateLimiter.ts with a single atomic RPC.
--
-- The previous pattern caused regular `duplicate key value violates unique
-- constraint "rate_limits_key_key"` errors in Postgres logs whenever a user
-- triggered a rate-limited endpoint after their previous window had expired
-- (the expired entry still occupied the unique key, blocking the INSERT until
-- the application retried-then-deleted-then-inserted). The new RPC handles all
-- four cases (no entry / expired / under max / at max) inside one statement.
--
-- Coexists with `increment_rate_limit` (used by tutor-rate-limiter.ts) which
-- has different semantics (always increments, caller enforces caps in JS).

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
    p_key TEXT,
    p_max_count INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_new_expires TIMESTAMPTZ := v_now + make_interval(secs => p_window_seconds);
    v_result_count INTEGER;
    v_result_expires TIMESTAMPTZ;
BEGIN
    -- Atomic upsert.
    --
    -- - No conflict: insert (1, v_new_expires), allowed.
    -- - Conflict + expired: reset to (1, v_new_expires), allowed.
    -- - Conflict + valid + count < max: increment, allowed.
    -- - Conflict + valid + count >= max: WHERE clause filters → 0 rows
    --   returned → caller maps to allowed=false.
    --
    -- The WHERE clause on the DO UPDATE means PostgreSQL evaluates it under
    -- the conflicting row's exclusive lock, so concurrent calls serialize on
    -- the unique key — no TOCTOU race.
    --
    -- Off-by-one note: `rl.count < p_max_count` is strict, so when count is
    -- max-1 the increment lifts it to exactly p_max_count and is allowed.
    -- The next call sees count = p_max_count, fails the filter, is blocked.
    -- Effective allowance is exactly p_max_count calls per window.
    INSERT INTO public.rate_limits AS rl (key, count, expires_at)
    VALUES (p_key, 1, v_new_expires)
    ON CONFLICT (key) DO UPDATE
    SET
        count = CASE
            WHEN rl.expires_at < v_now THEN 1
            ELSE rl.count + 1
        END,
        expires_at = CASE
            WHEN rl.expires_at < v_now THEN EXCLUDED.expires_at
            ELSE rl.expires_at
        END
    WHERE rl.expires_at < v_now OR rl.count < p_max_count
    RETURNING rl.count, rl.expires_at
    INTO v_result_count, v_result_expires;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, v_result_count, v_result_expires;
    ELSE
        -- Blocked: re-fetch so the caller can compute retryAfter from
        -- current expires_at. This SELECT is not under a lock, so values
        -- are advisory — a concurrent expiry-and-reset (or cleanup-cron
        -- delete) could yield a fresher count/expires_at, or NULLs. That's
        -- acceptable: retryAfter erring on the long side is safe, and the
        -- TS caller handles NULL expires_at.
        SELECT rl.count, rl.expires_at
        INTO v_result_count, v_result_expires
        FROM public.rate_limits rl
        WHERE rl.key = p_key;

        RETURN QUERY SELECT FALSE, v_result_count, v_result_expires;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER)
    TO service_role;

COMMENT ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) IS
'Atomically checks a rate limit and increments its counter in a single round-trip.

Returns (allowed, current_count, expires_at):
- allowed=TRUE  → request is within the limit, counter was incremented (or entry created/reset).
- allowed=FALSE → request blocked (counter already at p_max_count within the active window).

Replaces the SELECT/UPDATE/INSERT/retry pattern in rateLimiter.ts which produced
spurious unique-constraint violations in the Postgres logs whenever an expired
entry collided with a new INSERT for the same key.';
