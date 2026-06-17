-- Migration: Remove item support from marketplace
-- Description: Removes item-related columns from marketplace tables as part of VIP cards unification
-- Created: 2026-01-03

-- Remove item columns from marketplace_listings table
ALTER TABLE marketplace_listings
  DROP COLUMN IF EXISTS offered_item_ids,
  DROP COLUMN IF EXISTS wanted_item_template_ids;

-- Remove item columns from marketplace_proposals table
ALTER TABLE marketplace_proposals
  DROP COLUMN IF EXISTS offered_item_ids;

-- Remove item columns from marketplace_trade_offers table
ALTER TABLE marketplace_trade_offers
  DROP COLUMN IF EXISTS initiator_items,
  DROP COLUMN IF EXISTS partner_items;

-- Note: The current_offer JSONB column in marketplace_trades may still contain
-- item references, but these will be ignored by the application code.
-- We don't modify JSONB structure to avoid potential data loss.

-- Add comment to marketplace tables to reflect VIP-only support
COMMENT ON TABLE marketplace_listings IS 'Marketplace listings for trading VIP cards and gidouilles between students';
COMMENT ON TABLE marketplace_proposals IS 'Proposals on marketplace listings offering VIP cards and/or gidouilles';
COMMENT ON TABLE marketplace_trades IS 'Friend-to-friend trades of VIP cards and gidouilles';
COMMENT ON TABLE marketplace_trade_offers IS 'Counter-offers within trades containing VIP cards and gidouilles';
