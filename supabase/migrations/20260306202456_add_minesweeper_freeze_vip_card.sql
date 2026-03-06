-- ============================================================================
-- Migration: Add Minesweeper Freeze Timer VIP Card ("Gel Temporaire")
-- Created: 2026-03-06
-- ============================================================================
--
-- CONTEXT:
-- Adds a new VIP card that freezes the minesweeper timer for 60 seconds.
-- Uses the same pattern as minesweeper-undo: consumable card, context = minesweeper,
-- consumed via the unified use_vip_card RPC.
--
-- The freeze effect is entirely client-side (timer skip in the store).
-- No dedicated RPC needed — the card is consumed via /api/vip-cards/use-card.
--
-- NOTE: activation_context was dropped in 20260302204831. Context is now
-- stored inside the action JSONB field (action.context = 'minesweeper').
--
-- DESIGN DECISIONS:
-- - Rarity: rare (same tier as minesweeper-undo)
-- - Category: consumable (game power-up)
-- - base_price: 50 gidouilles (rare card standard price)
-- - uses_total: 1 (single use per card instance)
-- - max_owned_per_student: 5
-- - action.context: minesweeper (validated by use_vip_card RPC)
-- ============================================================================

INSERT INTO public.vip_card_templates (
  id, name, description, category, rarity, image_path, action,
  is_enabled, base_price, is_purchasable, max_owned_per_student,
  uses_total, sort_order
) VALUES (
  'minesweeper-freeze',
  'Gel Temporaire',
  'Gele le timer du Demineur pendant 60 secondes. Utilisable une seule fois par partie.',
  'power', 'rare', '/images/vip-cards/minesweeper-freeze.webp',
  '{"type": "freeze_timer", "context": "minesweeper", "duration": 60}'::JSONB,
  true, 50, true, 5, 1, 21
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  base_price = EXCLUDED.base_price;
