-- ============================================================================
-- Migration: Rebalance VIP card economy
-- Created: 2026-04-03
-- ============================================================================
-- PROBLEMS FIXED:
--   1. Soldes always EV-positive (dominant strategy, no risk)
--   2. Rare/epic cards cheaper than commons (undo 3g, throne 5g, hint-3 6g)
--   3. Alchimie (40g) and Fortune (80g) are traps (massively EV-negative)
--   4. Inventeur (legendary) cheaper than most epics
--   5. Ecrabouilleur (25g) disproportionate for removing 1 warning
--
-- PRINCIPLES:
--   - Soldes should be a gamble (roughly break-even), not guaranteed profit
--   - Rare/epic/legendary cards must respect rarity price floors
--   - Consumable game cards (hints, freeze) can stay cheap (situational value)
--   - Exchange cards (Alchimie, Fortune) should be attractive duplicate recyclers
--
-- NEW EV of random draw (after changes): ~13g
--   Soldes (25g for 2 draws ~26g): roughly neutral
--   Super Soldes (40g for 3 draws ~39g): roughly neutral
--   Mega Soldes (50g for 4 draws ~52g): roughly neutral
-- ============================================================================

-- A. Fix rarity/price coherence
UPDATE public.vip_card_templates SET base_price = 8, updated_at = NOW()
WHERE id = 'minesweeper-undo';  -- rare, was 3g (cheaper than most commons)

UPDATE public.vip_card_templates SET base_price = 12, updated_at = NOW()
WHERE id = 'throne';  -- rare privilege, was 5g (same as commons)

UPDATE public.vip_card_templates SET base_price = 40, updated_at = NOW()
WHERE id = 'inventeur';  -- legendary, was 20g (cheaper than epics)

-- B. Soldes: break guaranteed profit (price ≈ EV of draws)
UPDATE public.vip_card_templates SET base_price = 25, updated_at = NOW()
WHERE id = 'soldes';  -- 2 draws, was 15g

UPDATE public.vip_card_templates SET base_price = 40, updated_at = NOW()
WHERE id = 'super-soldes';  -- 3 draws, was 25g

UPDATE public.vip_card_templates SET base_price = 50, updated_at = NOW()
WHERE id = 'mega-soldes';  -- 4 draws, was 30g

-- C. Make exchange cards attractive (duplicate recyclers)
UPDATE public.vip_card_templates SET base_price = 10, updated_at = NOW()
WHERE id = 'alchimie';  -- sacrifice 3 cards for 1 Bonus, was 40g

UPDATE public.vip_card_templates SET base_price = 20, updated_at = NOW()
WHERE id = 'fortune';  -- sacrifice 5 cards for 5 draws, was 80g

-- D. Ecrabouilleur: more accessible
UPDATE public.vip_card_templates SET base_price = 15, updated_at = NOW()
WHERE id = 'ecrabouilleur';  -- remove 1 warning, was 25g
