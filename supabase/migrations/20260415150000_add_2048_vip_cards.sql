-- ============================================================================
-- Migration: Add 2048 VIP cards (Undo, Bomb x3, Freeze Spawn)
-- Created: 2026-04-15
-- ============================================================================
-- 5 card templates for the 2048 game:
-- - Retour en Arriere (undo last move, rare, 5g)
-- - Bombe (1): remove tile <= 4 (common, 3g)
-- - Bombe (2): remove tile <= 16 (rare, 8g)
-- - Bombe (3): remove tile <= 64 (epic, 15g)
-- - Gel de Spawn: next move skips new tile (common, 3g)
-- No server-side RPC needed (2048 is client-side only).
-- ============================================================================

INSERT INTO public.vip_card_templates (
  id, name, description, category, rarity, image_path,
  action, is_enabled, base_price, is_purchasable,
  max_owned_per_student, uses_total, sort_order
) VALUES (
  '2048-undo',
  'Retour en Arriere',
  'Annule le dernier coup dans le 2048. Utilisable 2 fois par partie.',
  'power',
  'rare',
  '/images/vip-cards/2048-undo.webp',
  '{"type": "undo", "context": "2048"}'::JSONB,
  true,
  5,
  true,
  5,
  1,
  200
), (
  '2048-bomb',
  'Bombe (1)',
  'Supprime une tuile de valeur 2 ou 4 dans le 2048.',
  'power',
  'common',
  '/images/vip-cards/2048-bomb.webp',
  '{"type": "bomb", "context": "2048", "max_target_value": 4}'::JSONB,
  true,
  3,
  true,
  5,
  1,
  210
), (
  '2048-bomb-2',
  'Bombe (2)',
  'Supprime une tuile de valeur 16 ou moins dans le 2048.',
  'power',
  'rare',
  '/images/vip-cards/2048-bomb.webp',
  '{"type": "bomb", "context": "2048", "max_target_value": 16}'::JSONB,
  true,
  8,
  true,
  5,
  1,
  211
), (
  '2048-bomb-3',
  'Bombe (3)',
  'Supprime une tuile de valeur 64 ou moins dans le 2048.',
  'power',
  'epic',
  '/images/vip-cards/2048-bomb.webp',
  '{"type": "bomb", "context": "2048", "max_target_value": 64}'::JSONB,
  true,
  15,
  true,
  5,
  1,
  212
), (
  '2048-freeze-spawn',
  'Gel de Spawn',
  'Le prochain coup ne genere pas de nouvelle tuile dans le 2048. Utilisable 2 fois par partie.',
  'power',
  'common',
  '/images/vip-cards/2048-freeze-spawn.webp',
  '{"type": "freeze_spawn", "context": "2048"}'::JSONB,
  true,
  3,
  true,
  5,
  1,
  220
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  base_price = EXCLUDED.base_price,
  rarity = EXCLUDED.rarity,
  uses_total = EXCLUDED.uses_total;
