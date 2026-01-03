-- ============================================================================
-- REMOVE ITEMS SYSTEM COMPLETELY
-- ============================================================================
-- Phase 7 of VIP cards unification: Remove the entire shop/items system
-- The minesweeper hint has been migrated to VIP cards (Phase 4)
--
-- NOTE: The hints_from_items column in minesweeper_games is kept for historical data
-- ============================================================================

-- ============================================================================
-- DROP FUNCTIONS (order matters - drop dependent functions first)
-- ============================================================================

-- Item functions used by marketplace (already cleaned up in Phase 6)
DROP FUNCTION IF EXISTS lock_items_for_listing(UUID, UUID[], UUID);
DROP FUNCTION IF EXISTS lock_items_for_trade(UUID, UUID[], UUID);
DROP FUNCTION IF EXISTS unlock_items(UUID, TEXT);
DROP FUNCTION IF EXISTS transfer_items(UUID, UUID, UUID[], UUID);

-- Shop/inventory functions
DROP FUNCTION IF EXISTS purchase_shop_item(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS use_item(UUID, UUID);
DROP FUNCTION IF EXISTS get_shop_items();
DROP FUNCTION IF EXISTS try_consume_minesweeper_hint_item(UUID);

-- ============================================================================
-- DROP TABLES (order matters - drop tables with foreign keys first)
-- ============================================================================

-- Usage log depends on inventory
DROP TABLE IF EXISTS item_usage_log CASCADE;

-- Purchase history depends on both inventory and templates
DROP TABLE IF EXISTS shop_purchase_history CASCADE;

-- Inventory depends on templates
DROP TABLE IF EXISTS student_item_inventory CASCADE;

-- Base table
DROP TABLE IF EXISTS shop_item_templates CASCADE;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
-- The following has been removed:
--
-- Tables:
--   - shop_item_templates: Item definitions (display_name, base_price, etc.)
--   - student_item_inventory: Student-owned items
--   - shop_purchase_history: Purchase records
--   - item_usage_log: Item usage tracking
--
-- Functions:
--   - purchase_shop_item: Buy items from shop
--   - use_item: Consume/equip items
--   - get_shop_items: List available items
--   - try_consume_minesweeper_hint_item: Minesweeper hint consumption
--   - lock_items_for_listing/trade: Marketplace item locking
--   - unlock_items: Release locked items
--   - transfer_items: Trade item transfer
--
-- The VIP cards system now handles all purchasable/consumable content:
--   - vip_card_templates: Card definitions with base_price, uses_total
--   - profiles.vip_cards: JSONB array of owned cards
--   - vip_cards_activity: Usage and purchase audit trail
-- ============================================================================
