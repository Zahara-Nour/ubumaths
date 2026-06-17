-- =====================================================================
-- ADD CONFIRMATION TRACKING COLUMNS TO MARKETPLACE_TRADES
-- =====================================================================
-- Adds columns to track individual confirmations during the final
-- confirmation phase. Trade only executes when BOTH parties confirm.
-- =====================================================================

-- Add confirmation columns
ALTER TABLE public.marketplace_trades
ADD COLUMN IF NOT EXISTS confirmed_by_initiator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_by_partner BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN public.marketplace_trades.confirmed_by_initiator IS 'Whether initiator has confirmed during final confirmation phase';
COMMENT ON COLUMN public.marketplace_trades.confirmed_by_partner IS 'Whether partner has confirmed during final confirmation phase';
