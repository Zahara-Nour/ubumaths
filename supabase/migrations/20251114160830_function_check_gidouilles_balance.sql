-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - FUNCTION 5/5: check_gidouilles_balance
-- =====================================================================
-- Atomically check if user has sufficient gidouilles balance with row-level locking
-- Prevents race conditions in concurrent balance checks
-- Generated: 2025-11-14
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_gidouilles_balance(
  p_user_id UUID,
  p_required_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Get current balance with lock to prevent race conditions
  SELECT gidouilles INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Utilisateur introuvable'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'has_sufficient_balance', v_balance >= p_required_amount,
    'current_balance', v_balance,
    'required_amount', p_required_amount,
    'deficit', GREATEST(0, p_required_amount - v_balance)
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Une autre transaction est en cours'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.check_gidouilles_balance IS 'Atomically check if user has sufficient gidouilles balance with row-level locking';

GRANT EXECUTE ON FUNCTION public.check_gidouilles_balance(UUID, INTEGER) TO authenticated;
