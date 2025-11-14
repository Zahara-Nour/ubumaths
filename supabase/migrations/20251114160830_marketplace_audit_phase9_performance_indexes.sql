-- =====================================================================
-- MARKETPLACE AUDIT PHASE 9 - PERFORMANCE INDEXES
-- =====================================================================
-- Creates 6 strategic indexes to optimize common query patterns
--
-- Expected impact:
-- - Faster daily trade limit checks (2x-3x improvement)
-- - Faster proposal lookups (composite index on multiple columns)
-- - Faster filtered listing queries (by type and status)
-- - Faster school-specific listing queries (partial index)
-- - Faster user view history queries
--
-- Generated: 2025-11-14
-- =====================================================================

-- Improve daily trade limit checks (used in execute_trade and check_daily_trade_limit)
-- Partial index only for completed trades to save space
CREATE INDEX IF NOT EXISTS idx_marketplace_trades_daily_initiator
    ON public.marketplace_trades(initiator_id, completed_at DESC)
    WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_marketplace_trades_daily_partner
    ON public.marketplace_trades(partner_id, completed_at DESC)
    WHERE status = 'completed';

-- Composite index for proposal queries (lookup by listing + status + creation time)
CREATE INDEX IF NOT EXISTS idx_marketplace_proposals_lookup
    ON public.marketplace_proposals(listing_id, status, created_at DESC);

-- Optimize filtered listing queries (by type and status)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type_status
    ON public.marketplace_listings(listing_type, status, created_at DESC);

-- Partial index for school-specific active listings (most common query)
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_school_status
    ON public.marketplace_listings(school_id, created_at DESC)
    WHERE status = 'active';

-- Optimize user view history queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listing_views_user
    ON public.marketplace_listing_views(user_id, viewed_at DESC);

-- Add comments for maintenance documentation
COMMENT ON INDEX idx_marketplace_trades_daily_initiator IS 'Optimizes daily trade limit checks for initiators (partial index for completed trades only)';
COMMENT ON INDEX idx_marketplace_trades_daily_partner IS 'Optimizes daily trade limit checks for partners (partial index for completed trades only)';
COMMENT ON INDEX idx_marketplace_proposals_lookup IS 'Composite index for efficient proposal queries by listing, status, and time';
COMMENT ON INDEX idx_marketplace_listings_type_status IS 'Optimizes filtered listing queries by type and status';
COMMENT ON INDEX idx_marketplace_listings_school_status IS 'Partial index for active school listings (most common query pattern)';
COMMENT ON INDEX idx_marketplace_listing_views_user IS 'Optimizes user view history queries';
