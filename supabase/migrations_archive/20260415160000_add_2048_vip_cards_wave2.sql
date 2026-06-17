-- ============================================================================
-- Migration: Add 2048 VIP cards wave 2 (Fusion, Joker, Vision, Multiplier)
-- Created: 2026-04-15
-- ============================================================================
-- 5 card templates for the 2048 game (wave 2):
-- - Fusion Forcee (merge 2 adjacent identical tiles, epic, 15g)
-- - Joker (change tile to match highest neighbor, rare, 10g)
-- - Vision (preview next spawn for 3 moves, common, 3g)
-- - Multiplicateur x1.5 (score x1.5 for rest of game, epic, 20g)
-- - Multiplicateur x2 (score x2 for rest of game, legendary, 40g)
-- ============================================================================

INSERT INTO public.vip_card_templates (
  id, name, description, category, rarity, image_path,
  action, is_enabled, base_price, is_purchasable,
  max_owned_per_student, uses_total, sort_order
) VALUES (
  '2048-merge',
  'Fusion Forcee',
  'Fusionne 2 tuiles identiques adjacentes sans mouvement global dans le 2048.',
  'power',
  'epic',
  '/images/vip-cards/2048-merge.webp',
  '{"type": "fusion", "context": "2048"}'::JSONB,
  true,
  15,
  true,
  3,
  1,
  230
), (
  '2048-joker',
  'Joker',
  'Change la valeur d''une tuile pour matcher son plus grand voisin dans le 2048.',
  'power',
  'rare',
  '/images/vip-cards/2048-joker.webp',
  '{"type": "joker", "context": "2048"}'::JSONB,
  true,
  10,
  true,
  3,
  1,
  240
), (
  '2048-vision',
  'Vision',
  'Affiche la position et valeur du prochain spawn pendant 3 coups dans le 2048.',
  'power',
  'common',
  '/images/vip-cards/2048-vision.webp',
  '{"type": "vision", "context": "2048", "duration": 3}'::JSONB,
  true,
  3,
  true,
  5,
  1,
  250
), (
  '2048-multiplier',
  'Multiplicateur x1.5',
  'Chaque fusion rapporte x1.5 points pour le reste de la partie dans le 2048.',
  'power',
  'epic',
  '/images/vip-cards/2048-multiplier.webp',
  '{"type": "multiplier", "context": "2048", "factor": 1.5}'::JSONB,
  true,
  20,
  true,
  3,
  1,
  260
), (
  '2048-multiplier-2',
  'Multiplicateur x2',
  'Chaque fusion rapporte x2 points pour le reste de la partie dans le 2048.',
  'power',
  'legendary',
  '/images/vip-cards/2048-multiplier.webp',
  '{"type": "multiplier", "context": "2048", "factor": 2}'::JSONB,
  true,
  40,
  true,
  3,
  1,
  261
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  base_price = EXCLUDED.base_price,
  rarity = EXCLUDED.rarity,
  uses_total = EXCLUDED.uses_total;
