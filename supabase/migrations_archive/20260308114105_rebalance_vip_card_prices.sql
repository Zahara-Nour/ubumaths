-- ============================================================================
-- Migration: Rebalance VIP card base prices
-- ============================================================================
-- Created: 2026-03-08
--
-- DESCRIPTION:
--   Adjusts base_price for all VIP card templates to be coherent with
--   the actual gidouille economy (~8g/week for an active student).
--
--   Previous prices (20/50/150/500 uniform per rarity) were set before
--   the daily limit system (1g/day + weekly bonus). With ~8g/week income,
--   old prices made cards nearly unattainable via purchase.
--
-- NEW PRICING PHILOSOPHY:
--   - Passive cards: base price by rarity (5 / 15 / 40)
--   - Action cards: premium based on action power (8-10 / 20-25 / 50 / 80-120)
--   - Common: ~1 week to buy | Rare: ~2-3 weeks | Epic: ~5-6 weeks | Legendary: ~10-15 weeks
--
-- RARITY RATIOS (passive): 1 : 3 : 8 : ~20
-- ============================================================================

BEGIN;

-- ========================================================================
-- COMMON CARDS
-- ========================================================================

-- Passive privileges: 5g (~0.6 weeks)
UPDATE public.vip_card_templates SET base_price = 5, updated_at = NOW()
WHERE id IN ('bonus', 'choix', 'bougeotte', 'jeu', 'candy', 'captain');

-- Soldes (draw 2 cards): 8g (~1 week)
UPDATE public.vip_card_templates SET base_price = 8, updated_at = NOW()
WHERE id = 'soldes';

-- Super Soldes (draw 3 cards): 10g (~1.3 weeks)
UPDATE public.vip_card_templates SET base_price = 10, updated_at = NOW()
WHERE id = 'super-soldes';

-- ========================================================================
-- RARE CARDS
-- ========================================================================

-- Passive privileges: 15g (~2 weeks)
UPDATE public.vip_card_templates SET base_price = 15, updated_at = NOW()
WHERE id IN ('super-bonus', 'coup-double', 'super-bougeotte', 'tranquilou',
             'lalalalala', 'help', 'mathemagie', 'inventeur', 'team');

-- Mega Soldes (draw 4 cards): 20g (~2.5 weeks)
UPDATE public.vip_card_templates SET base_price = 20, updated_at = NOW()
WHERE id = 'mega-soldes';

-- Ecrabouilleur (remove 1 warning): 25g (~3 weeks)
UPDATE public.vip_card_templates SET base_price = 25, updated_at = NOW()
WHERE id = 'ecrabouilleur';

-- Minesweeper freeze (60s): 15g - same as rare passive (single-use in-game)
UPDATE public.vip_card_templates SET base_price = 15, updated_at = NOW()
WHERE id = 'minesweeper-freeze';

-- ========================================================================
-- EPIC CARDS
-- ========================================================================

-- Passive privileges: 40g (~5 weeks)
UPDATE public.vip_card_templates SET base_price = 40, updated_at = NOW()
WHERE id IN ('mega-bonus', 'throne', 'fame', 'memoire', 'batman');

-- Alchimie (exchange 3 for 1): 50g (~6 weeks)
UPDATE public.vip_card_templates SET base_price = 50, updated_at = NOW()
WHERE id = 'alchimie';

-- Minesweeper chronostase (120s): 30g - between rare and epic (single-use in-game)
UPDATE public.vip_card_templates SET base_price = 30, updated_at = NOW()
WHERE id = 'minesweeper-chronostase';

-- ========================================================================
-- LEGENDARY CARDS
-- ========================================================================

-- Fortune (exchange 5 for 5 random): 80g (~10 weeks)
UPDATE public.vip_card_templates SET base_price = 80, updated_at = NOW()
WHERE id = 'fortune';

-- Sheikh (add 50 gidouilles): 120g (~15 weeks, net cost 70g)
UPDATE public.vip_card_templates SET base_price = 120, updated_at = NOW()
WHERE id = 'Sheikh';

COMMIT;

-- ============================================================================
-- NOTE: minesweeper-hint, minesweeper-hint-2, minesweeper-hint-3 (1g each)
-- and minesweeper-undo (3g) are NOT changed — their low prices are intentional
-- as single-use in-game consumables.
-- ============================================================================

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '--- VIP Card Price Summary ---';
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
$$;
