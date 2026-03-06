-- ============================================================================
-- Migration: Add Minesweeper Chronostase VIP Card (epic freeze timer)
-- Created: 2026-03-06
-- ============================================================================
--
-- Same as Gel Temporaire but epic rarity and 120 seconds duration.
-- ============================================================================

INSERT INTO public.vip_card_templates (
  id, name, description, category, rarity, image_path, action,
  is_enabled, base_price, is_purchasable, max_owned_per_student,
  uses_total, sort_order
) VALUES (
  'minesweeper-chronostase',
  'Chronostase',
  'Gele le timer du Demineur pendant 2 minutes. Utilisable une seule fois par partie.',
  'power', 'epic', '/images/vip-cards/minesweeper-chronostase.webp',
  '{"type": "freeze_timer", "context": "minesweeper", "duration": 120}'::JSONB,
  true, 150, true, 5, 1, 22
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  base_price = EXCLUDED.base_price;
