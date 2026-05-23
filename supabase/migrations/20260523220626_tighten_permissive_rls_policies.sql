-- ============================================================================
-- Migration: Tighten RLS policies flagged as overly permissive
-- ============================================================================
-- Supabase Security Advisor (lint 0024_permissive_rls_policy) flagged 13
-- policies with `USING (true)` or `WITH CHECK (true)`. Of those:
--
--   * 11 are server-side / trigger / cron policies whose intent was always
--     "service_role only", but the role was left as PUBLIC. They allowed
--     anon and authenticated callers to slip through.
--   * 1 (`Allow profile creation` on profiles) is a real bug: any
--     authenticated user could insert a profile row for *another* user.
--   * 2 (`tags_insert_authenticated`, `python_tags_insert_authenticated`)
--     are intentional free-tagging policies and are NOT modified here.
--
-- All triggers that write to these tables are SECURITY DEFINER and run
-- as postgres, which bypasses RLS — restricting policies to service_role
-- does not break trigger writes. Server-side code (errorMonitoring,
-- rateLimiter, cron jobs) already uses the service_role client.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. achievement_events — written by process_achievement_event (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can manage achievement events" ON public.achievement_events;
CREATE POLICY "System can manage achievement events"
    ON public.achievement_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. conversation_participants — populated by chat triggers / RPC
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert participants" ON public.conversation_participants;
CREATE POLICY "System can insert participants"
    ON public.conversation_participants
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. conversations — last_message fields updated by trigger update_conversation_last_message
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can update last_message fields" ON public.conversations;
CREATE POLICY "System can update last_message fields"
    ON public.conversations
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. error_logs — inserts come from src/lib/server/errorMonitoring.ts (admin client)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS service_insert_error_logs ON public.error_logs;
CREATE POLICY service_insert_error_logs
    ON public.error_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. error_occurrences — same source as error_logs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS service_manage_error_occurrences ON public.error_occurrences;
CREATE POLICY service_manage_error_occurrences
    ON public.error_occurrences
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. messages — flag updates come from moderation triggers / RPC (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can update message flags" ON public.messages;
CREATE POLICY "System can update message flags"
    ON public.messages
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 7. profiles — tighten WITH CHECK so authenticated users can only create
--    their own profile row. auth/callback/+server.ts inserts with id: user.id
--    so this check passes there. Signup trigger handle_new_user is SECURITY
--    DEFINER and bypasses RLS, so it is unaffected.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
CREATE POLICY "Allow profile creation"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 8. rate_limits — INSERT/UPDATE/DELETE used by src/lib/server/rateLimiter.ts
--    which creates a service_role client (see SUPABASE_SERVICE_ROLE_KEY in
--    that file). The prior USING (true) let anon wipe its own rate limits.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow INSERT for rate limit tracking" ON public.rate_limits;
CREATE POLICY "Allow INSERT for rate limit tracking"
    ON public.rate_limits
    FOR INSERT
    TO service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow UPDATE for rate limit increments" ON public.rate_limits;
CREATE POLICY "Allow UPDATE for rate limit increments"
    ON public.rate_limits
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow DELETE for expired rate limit cleanup" ON public.rate_limits;
CREATE POLICY "Allow DELETE for expired rate limit cleanup"
    ON public.rate_limits
    FOR DELETE
    TO service_role
    USING (true);

-- ---------------------------------------------------------------------------
-- 9. weekly_best_rewards — name said "Service role" but role was PUBLIC,
--    so anon could SELECT every student's rewards and DELETE any row.
--    Writes happen in cron / award_weekly_best_bonuses (SECURITY DEFINER).
--    Students read their own rewards via a separate SELECT policy that
--    enforces student_id = auth.uid().
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can manage weekly best" ON public.weekly_best_rewards;
CREATE POLICY "Service role can manage weekly best"
    ON public.weekly_best_rewards
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
