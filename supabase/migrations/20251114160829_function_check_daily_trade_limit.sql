-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - FUNCTION 4/5: check_daily_trade_limit
-- =====================================================================
-- Check if user has reached daily trade limit before allowing trade creation
-- Enforces rate limiting to prevent spam and abuse
-- Generated: 2025-11-14
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_daily_trade_limit(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trade_count INTEGER;
  v_max_trades INTEGER;
BEGIN
  -- Get max trades per day from config (default 10)
  SELECT COALESCE(MAX(max_trades_per_day), 10) INTO v_max_trades
  FROM marketplace_config mc
  JOIN classes c ON c.school_id = mc.school_id
  JOIN class_members cm ON cm.class_id = c.id
  WHERE cm.student_id = p_user_id;

  -- Count trades created or participated in today
  SELECT COUNT(*) INTO v_trade_count
  FROM marketplace_trades
  WHERE (initiator_id = p_user_id OR partner_id = p_user_id)
    AND status = 'completed'
    AND completed_at >= CURRENT_DATE
    AND completed_at < CURRENT_DATE + INTERVAL '1 day';

  RETURN json_build_object(
    'success', true,
    'can_create_trade', v_trade_count < v_max_trades,
    'trades_today', v_trade_count,
    'max_trades', v_max_trades,
    'remaining_trades', GREATEST(0, v_max_trades - v_trade_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
