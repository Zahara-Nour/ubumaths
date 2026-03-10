-- ============================================================================
-- Migration: Rebalance VIP card prices v2
-- ============================================================================
-- Created: 2026-03-11
--
-- DESCRIPTION:
--   Rebalances base_price for all VIP card templates based on actual card
--   power/value rather than rarity alone.
--
-- KEY CHANGES:
--   - Price now reflects card VALUE (academic impact, power level)
--   - Draw card ratios reduced from x4-6 to ~x1.5
--   - Libre choix (legendary choose_card) repriced from 5g to 80g
--   - Academic bonus cards repriced to reflect their impact
--   - Common privilege cards reduced to 5-10g
--
-- PRICING PHILOSOPHY:
--   Common (5-10g): simple privileges, basic consumables
--   Rare (3-25g): light academic bonuses, improved consumables
--   Epic (12-40g): strong academic bonuses, powerful consumables
--   Legendary (20-120g): high-impact cards (x2 grade, +3 points, free choice)
--
-- DRAW CARD RATIOS (EV/cost):
--   Soldes (15g, 2 draws): x1.6
--   Super Soldes (25g, 3 draws): x1.4
--   Mega Soldes (30g, 4 draws): x1.6
--
-- EV of 1 random draw: 11.9g
-- ============================================================================

BEGIN;

-- ========================================================================
-- COMMON CARDS (avg 6.4g)
-- ========================================================================

-- Simple privileges: 5g
UPDATE public.vip_card_templates SET base_price = 5, updated_at = NOW()
WHERE id IN ('bougeotte', 'lalalalala', 'batman', 'fame', 'candy', 'captain');

-- minesweeper-hint already at 5g
UPDATE public.vip_card_templates SET base_price = 5, updated_at = NOW()
WHERE id = 'minesweeper-hint';

-- Better privileges: 10g
UPDATE public.vip_card_templates SET base_price = 10, updated_at = NOW()
WHERE id IN ('tranquilou', 'mathemagie');

-- ========================================================================
-- RARE CARDS (avg 11.8g)
-- ========================================================================

-- Minesweeper undo: 3g (unchanged)
UPDATE public.vip_card_templates SET base_price = 3, updated_at = NOW()
WHERE id = 'minesweeper-undo';

-- Throne: simple prestige privilege: 5g
UPDATE public.vip_card_templates SET base_price = 5, updated_at = NOW()
WHERE id = 'throne';

-- Hint tier 2: 8g
UPDATE public.vip_card_templates SET base_price = 8, updated_at = NOW()
WHERE id = 'minesweeper-hint-2';

-- Bonus (+1 grade) and Memoire (notes during eval): 10g
UPDATE public.vip_card_templates SET base_price = 10, updated_at = NOW()
WHERE id IN ('bonus', 'memoire');

-- Freeze 60s: 12g
UPDATE public.vip_card_templates SET base_price = 12, updated_at = NOW()
WHERE id = 'minesweeper-freeze';

-- Soldes (draw 2, ratio x1.6): 15g
UPDATE public.vip_card_templates SET base_price = 15, updated_at = NOW()
WHERE id = 'soldes';

-- Super Bougeotte and Help: 15g
UPDATE public.vip_card_templates SET base_price = 15, updated_at = NOW()
WHERE id IN ('super-bougeotte', 'help', 'team');

-- Ecrabouilleur (remove 1 warning): 25g (unchanged)
UPDATE public.vip_card_templates SET base_price = 25, updated_at = NOW()
WHERE id = 'ecrabouilleur';

-- ========================================================================
-- EPIC CARDS (avg 27.0g)
-- ========================================================================

-- Hint tier 3: 12g (unchanged)
UPDATE public.vip_card_templates SET base_price = 12, updated_at = NOW()
WHERE id = 'minesweeper-hint-3';

-- Super Soldes (draw 3, ratio x1.4) and Chronostase (120s freeze): 25g
UPDATE public.vip_card_templates SET base_price = 25, updated_at = NOW()
WHERE id IN ('super-soldes', 'minesweeper-chronostase');

-- Jeu and Super Bonus (+2 grade): 30g
UPDATE public.vip_card_templates SET base_price = 30, updated_at = NOW()
WHERE id IN ('jeu', 'super-bonus');

-- Alchimie (exchange 3 for 1): 40g
UPDATE public.vip_card_templates SET base_price = 40, updated_at = NOW()
WHERE id = 'alchimie';

-- ========================================================================
-- LEGENDARY CARDS (avg 62.9g)
-- ========================================================================

-- Inventeur (propose new card): 20g
UPDATE public.vip_card_templates SET base_price = 20, updated_at = NOW()
WHERE id = 'inventeur';

-- Mega Soldes (draw 4, ratio x1.6): 30g
UPDATE public.vip_card_templates SET base_price = 30, updated_at = NOW()
WHERE id = 'mega-soldes';

-- Coup Double (x2 grade): 50g
UPDATE public.vip_card_templates SET base_price = 50, updated_at = NOW()
WHERE id = 'coup-double';

-- Mega Bonus (+3 grade): 60g
UPDATE public.vip_card_templates SET base_price = 60, updated_at = NOW()
WHERE id = 'mega-bonus';

-- Libre choix (choose any card) and Fortune (exchange 5 for 5 random): 80g
UPDATE public.vip_card_templates SET base_price = 80, updated_at = NOW()
WHERE id IN ('choix', 'fortune');

-- Sheikh: 120g (unchanged, not purchasable)
UPDATE public.vip_card_templates SET base_price = 120, updated_at = NOW()
WHERE id = 'Sheikh';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '--- VIP Card Price Rebalance v2 ---';
  FOR r IN
    SELECT id, name, rarity, base_price
    FROM public.vip_card_templates
    ORDER BY
      CASE rarity
        WHEN 'common' THEN 1
        WHEN 'rare' THEN 2
        WHEN 'epic' THEN 3
        WHEN 'legendary' THEN 4
      END,
      base_price
  LOOP
    RAISE NOTICE '  [%] % (%) = %g', r.rarity, r.id, r.name, r.base_price;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
