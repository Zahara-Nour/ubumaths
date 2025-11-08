-- ============================================================================
-- VERIFICATION QUERIES FOR VIP CARD RARITY SYSTEM
-- ============================================================================
-- Run these queries after applying both migrations to verify correct setup
--
-- Migration 1: 20251104115149_add_vip_card_templates_tables.sql
-- Migration 2: 20251104115300_update_draw_multiple_vip_cards_weighted.sql
--
-- Usage: Copy and paste individual queries into Supabase SQL Editor

-- ============================================================================
-- 1. VERIFY CARD COUNT BY RARITY
-- ============================================================================
-- Expected results:
--   common    | 8 | 6 | 2  (disabled: candy, captain)
--   rare      | 10 | 9 | 1  (disabled: team)
--   epic      | 6 | 6 | 0
--   legendary | 2 | 2 | 0
-- Total: 26 cards (23 enabled, 3 disabled)

SELECT
  rarity,
  COUNT(*) as total_count,
  SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END) as enabled_count,
  SUM(CASE WHEN NOT is_enabled THEN 1 ELSE 0 END) as disabled_count
FROM public.vip_card_templates
GROUP BY rarity
ORDER BY CASE rarity
  WHEN 'common' THEN 1
  WHEN 'rare' THEN 2
  WHEN 'epic' THEN 3
  WHEN 'legendary' THEN 4
END;

-- ============================================================================
-- 2. VERIFY DISABLED CARDS
-- ============================================================================
-- Expected: 'candy', 'captain' (common), and 'team' (rare)

SELECT id, name, rarity, is_enabled
FROM public.vip_card_templates
WHERE is_enabled = FALSE
ORDER BY id;

-- ============================================================================
-- 3. VERIFY CONFIG PROBABILITIES SUM TO 100
-- ============================================================================
-- Expected: sum = 100 for all configs

SELECT
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  (common_probability + rare_probability + epic_probability + legendary_probability) as sum,
  is_active
FROM public.vip_card_config
ORDER BY is_active DESC, config_name;

-- ============================================================================
-- 4. VERIFY ONLY ONE ACTIVE CONFIG
-- ============================================================================
-- Expected: Exactly 1 row with is_active = TRUE

SELECT COUNT(*) as active_config_count
FROM public.vip_card_config
WHERE is_active = TRUE;

-- Expected output: active_config_count = 1

-- ============================================================================
-- 5. VIEW ACTIVE CONFIG DETAILS
-- ============================================================================

SELECT *
FROM public.vip_card_config
WHERE is_active = TRUE;

-- ============================================================================
-- 6. VERIFY CARDS WITH ACTIONS
-- ============================================================================
-- Expected: 7 cards with actions (soldes, super-soldes, mega-soldes, ecrabouilleur, alchimie, fortune, Sheikh)

SELECT id, name, rarity, action->>'type' as action_type, action
FROM public.vip_card_templates
WHERE action IS NOT NULL
ORDER BY rarity, id;

-- ============================================================================
-- 7. TEST RARITY DISTRIBUTION (SIMULATION)
-- ============================================================================
-- Simulate 1000 draws to verify rarity distribution matches probabilities
-- Expected distribution (with default config):
--   common:    ~600 (60%)
--   rare:      ~250 (25%)
--   epic:      ~120 (12%)
--   legendary: ~30  (3%)

WITH config AS (
  SELECT
    common_probability,
    rare_probability,
    epic_probability,
    legendary_probability,
    common_probability as common_max,
    (common_probability + rare_probability) as rare_max,
    (common_probability + rare_probability + epic_probability) as epic_max
  FROM vip_card_config
  WHERE is_active = TRUE
  LIMIT 1
),
simulated_draws AS (
  SELECT
    floor(random() * 100 + 1)::int as roll,
    CASE
      WHEN floor(random() * 100 + 1)::int <= (SELECT common_max FROM config) THEN 'common'
      WHEN floor(random() * 100 + 1)::int <= (SELECT rare_max FROM config) THEN 'rare'
      WHEN floor(random() * 100 + 1)::int <= (SELECT epic_max FROM config) THEN 'epic'
      ELSE 'legendary'
    END as rarity
  FROM generate_series(1, 1000)
)
SELECT
  rarity,
  COUNT(*) as count,
  ROUND((COUNT(*) * 100.0 / 1000), 2) as percentage
FROM simulated_draws
GROUP BY rarity
ORDER BY CASE rarity
  WHEN 'common' THEN 1
  WHEN 'rare' THEN 2
  WHEN 'epic' THEN 3
  WHEN 'legendary' THEN 4
END;

-- ============================================================================
-- 8. VERIFY ALL CARDS HAVE VALID IMAGE PATHS
-- ============================================================================

SELECT id, name, image_path
FROM public.vip_card_templates
WHERE image_path NOT LIKE '/images/vip-cards/%.webp'
ORDER BY id;

-- Expected: 0 rows (all cards should have valid WebP paths)

-- ============================================================================
-- 9. VERIFY FUNCTION EXISTS AND HAS CORRECT SIGNATURE
-- ============================================================================

SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'draw_multiple_vip_cards';

-- Expected: 1 row with:
--   function_name: draw_multiple_vip_cards
--   arguments: p_student_id uuid, p_count integer, p_payment_method text, p_gidouilles_cost integer DEFAULT NULL::integer, p_vip_card_instance_id uuid DEFAULT NULL::uuid
--   return_type: jsonb
--   is_security_definer: true

-- ============================================================================
-- 10. VERIFY RLS POLICIES EXIST
-- ============================================================================

-- vip_card_templates policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'vip_card_templates'
ORDER BY policyname;

-- Expected: 4 policies (select_authenticated, insert_admin, update_admin, delete_admin)

-- vip_card_config policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'vip_card_config'
ORDER BY policyname;

-- Expected: 5 policies (select_active, select_admin, insert_admin, update_admin, delete_admin)

-- ============================================================================
-- 11. MANUAL SMOKE TEST (REQUIRES TEST DATA)
-- ============================================================================
-- WARNING: Only run this if you have a test student profile in your database
-- Replace 'test-student-uuid' with an actual student UUID

-- NOTE: This is a conceptual test - you'll need to substitute real UUIDs

-- Example test (DO NOT RUN AS-IS):
/*
SELECT draw_multiple_vip_cards(
  'your-test-student-uuid'::uuid,  -- Replace with real student UUID
  5,                                -- Draw 5 cards
  'gidouilles',                     -- Payment method
  50,                               -- Cost (10 gidouilles per card)
  NULL                              -- No VIP card instance (gidouilles payment)
);
*/

-- Expected: JSONB response with 5 cards, each with cardId, instanceId, earnedAt
-- Cards should be distributed according to rarity probabilities

-- ============================================================================
-- 12. VERIFY UNIQUE ACTIVE CONFIG CONSTRAINT
-- ============================================================================
-- Try to create a second active config (should fail)

-- DO NOT RUN IN PRODUCTION - Test only
/*
INSERT INTO public.vip_card_config (
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  is_active,
  description
)
VALUES (
  'test-duplicate-active',
  50,
  30,
  15,
  5,
  TRUE,  -- This should fail (already have active config)
  'Test: Should fail due to unique constraint'
);
*/

-- Expected: ERROR - duplicate key value violates unique constraint "idx_vip_card_config_single_active"

-- ============================================================================
-- 13. VERIFY PROBABILITY SUM CONSTRAINT
-- ============================================================================
-- Try to create a config where probabilities don't sum to 100 (should fail)

-- DO NOT RUN IN PRODUCTION - Test only
/*
INSERT INTO public.vip_card_config (
  config_name,
  common_probability,
  rare_probability,
  epic_probability,
  legendary_probability,
  is_active,
  description
)
VALUES (
  'test-invalid-sum',
  50,  -- Only sums to 80
  20,
  5,
  5,
  FALSE,
  'Test: Should fail due to sum constraint'
);
*/

-- Expected: ERROR - new row violates check constraint "probabilities_sum_100"

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================
