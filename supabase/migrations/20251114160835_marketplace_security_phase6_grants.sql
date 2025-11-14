-- Grant execute permissions on all Phase 6 security functions

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.accept_proposal_atomic(UUID, UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.unlock_specific_cards(UUID, TEXT[]) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.check_daily_trade_limit(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.check_gidouilles_balance(UUID, INTEGER) TO authenticated;
END $$;
