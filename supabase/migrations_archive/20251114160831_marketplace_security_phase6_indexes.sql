-- =====================================================================
-- MARKETPLACE SECURITY PHASE 6 - PERFORMANCE INDEXES
-- =====================================================================
-- Creates indexes to optimize query performance for security functions
-- Generated: 2025-11-14
-- =====================================================================

-- Optimize trade queries for daily limit checks
CREATE INDEX IF NOT EXISTS idx_marketplace_trades_created_at
    ON public.marketplace_trades(created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_trades_initiator_partner
    ON public.marketplace_trades(initiator_id, partner_id);

-- Optimize composite queries on marketplace_trades
CREATE INDEX IF NOT EXISTS idx_marketplace_trades_status_completed
    ON public.marketplace_trades(status, completed_at)
    WHERE status = 'completed';

COMMENT ON INDEX idx_marketplace_trades_created_at IS 'Optimize daily trade limit queries';
COMMENT ON INDEX idx_marketplace_trades_initiator_partner IS 'Optimize participant lookups in trades';
COMMENT ON INDEX idx_marketplace_trades_status_completed IS 'Partial index for completed trades with timestamp';
