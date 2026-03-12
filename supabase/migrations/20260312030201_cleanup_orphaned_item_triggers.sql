-- ============================================================================
-- Migration: Cleanup orphaned item system trigger functions
-- Created: 2026-03-12
-- ============================================================================
-- The item system tables (shop_purchase_history, item_usage_log) were dropped
-- in 20260103120000_remove_items_system.sql with CASCADE, which removed the
-- triggers. But the trigger FUNCTIONS still exist as orphans.
-- Note: the 'item' reward_type enum value is kept for backward compatibility
-- with existing reward_events rows that may reference it.
-- ============================================================================

-- Drop orphaned trigger functions
DROP FUNCTION IF EXISTS public.log_shop_purchases_to_events();
DROP FUNCTION IF EXISTS public.log_item_usage_to_events();
