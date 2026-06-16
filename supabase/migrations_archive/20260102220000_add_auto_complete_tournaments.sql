-- ============================================================================
-- Migration: Add auto_complete_ended_tournaments function
-- ============================================================================
-- Adds a function to automatically mark tournaments as 'completed' when their
-- end_date has passed. Similar to auto_activate_scheduled_tournaments.

-- Function: auto_complete_ended_tournaments()
-- ============================================================================
-- Completes active tournaments that have passed their end_date.
-- Should be called periodically (e.g., via cron or on-demand).

CREATE OR REPLACE FUNCTION public.auto_complete_ended_tournaments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_count INTEGER;
BEGIN
  UPDATE public.minesweeper_tournaments
  SET status = 'completed'
  WHERE status = 'active'
    AND end_date <= NOW();

  GET DIAGNOSTICS v_completed_count = ROW_COUNT;

  RETURN v_completed_count;
END;
$$;

COMMENT ON FUNCTION public.auto_complete_ended_tournaments IS
  'Completes active tournaments that have passed their end_date. Call via cron or trigger. Returns count of completed tournaments.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.auto_complete_ended_tournaments TO authenticated;
