-- Migration: Add VIP Card Templates and Configuration System
-- Created: 2025-11-04
--
-- This migration implements a rarity-weighted VIP card drawing system
-- by creating tables to store card templates and configurable rarity probabilities.
--
-- TABLES:
-- -------
-- 1. vip_card_templates: Stores all 26 VIP card definitions with rarity metadata
-- 2. vip_card_config: Stores configurable probability distributions for rarities
--
-- FEATURES:
-- ---------
-- - 26 cards total: 8 common (1 disabled), 10 rare (1 disabled), 6 epic, 2 legendary
-- - Active cards: 6 common, 9 rare, 6 epic, 2 legendary (23 total)
-- - Disabled cards: candy, captain (common), team (rare)
-- - Default probabilities: 60% common, 25% rare, 12% epic, 3% legendary
-- - Event configuration support (e.g., special holiday distributions)
-- - Enable/disable cards without deletion
--
-- CONSTRAINTS:
-- ------------
-- - Probabilities must sum to exactly 100
-- - Only one active config at a time (UNIQUE INDEX on is_active WHERE true)
-- - Rarity must be one of: common, rare, epic, legendary
--
-- RLS:
-- ----
-- - Authenticated users: SELECT enabled cards and active config
-- - Admins: Full CRUD on both tables

-- ============================================================================
-- TABLE: vip_card_templates
-- ============================================================================
-- Stores the master list of all VIP cards with rarity and metadata

CREATE TABLE IF NOT EXISTS public.vip_card_templates (
  id TEXT PRIMARY KEY,                          -- Card identifier (matches TypeScript enum)
  name TEXT NOT NULL,                           -- French display name
  description TEXT NOT NULL,                    -- French description of privilege
  image_path TEXT NOT NULL,                     -- Path to WebP image
  category TEXT CHECK (category IN ('bonus', 'privilege', 'social', 'power')), -- Optional category
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')), -- Required rarity
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,     -- Can temporarily disable cards
  action JSONB,                                 -- Optional action (draw_cards, remove_warnings, etc.)
  sort_order INTEGER DEFAULT 0,                 -- Display order in UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment for documentation
COMMENT ON TABLE public.vip_card_templates IS
'Master list of all VIP card definitions with rarity metadata. Cards can be temporarily disabled without deletion. The ''action'' column stores JSONB for cards with special abilities (e.g., draw_cards, remove_warnings, exchange_cards, add_gidouilles).';

-- ============================================================================
-- TABLE: vip_card_config
-- ============================================================================
-- Stores configurable probability distributions for rarity-weighted drawing

CREATE TABLE IF NOT EXISTS public.vip_card_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL UNIQUE,             -- e.g., 'default', 'halloween', 'christmas'
  common_probability INTEGER NOT NULL CHECK (common_probability >= 0 AND common_probability <= 100),
  rare_probability INTEGER NOT NULL CHECK (rare_probability >= 0 AND rare_probability <= 100),
  epic_probability INTEGER NOT NULL CHECK (epic_probability >= 0 AND epic_probability <= 100),
  legendary_probability INTEGER NOT NULL CHECK (legendary_probability >= 0 AND legendary_probability <= 100),
  -- CRITICAL: Probabilities must sum to exactly 100
  CONSTRAINT probabilities_sum_100 CHECK (
    common_probability + rare_probability + epic_probability + legendary_probability = 100
  ),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,     -- Only one config can be active at a time
  description TEXT,                             -- Optional description of this config
  valid_from TIMESTAMPTZ,                       -- Optional: when this config should become active
  valid_until TIMESTAMPTZ,                      -- Optional: when this config should expire
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment for documentation
COMMENT ON TABLE public.vip_card_config IS
'Configurable probability distributions for VIP card rarity-weighted drawing. Only one config can be active at a time (enforced by unique index). Probabilities must sum to exactly 100.';

-- Create unique partial index: only one active config at a time
CREATE UNIQUE INDEX idx_vip_card_config_single_active
  ON public.vip_card_config (is_active)
  WHERE is_active = TRUE;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- vip_card_templates indexes
CREATE INDEX idx_vip_card_templates_rarity ON public.vip_card_templates (rarity);
CREATE INDEX idx_vip_card_templates_enabled ON public.vip_card_templates (is_enabled);
CREATE INDEX idx_vip_card_templates_category ON public.vip_card_templates (category);

-- vip_card_config indexes
CREATE INDEX idx_vip_card_config_active ON public.vip_card_config (is_active);
CREATE INDEX idx_vip_card_config_valid_dates ON public.vip_card_config (valid_from, valid_until);

-- ============================================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================================

-- Trigger for vip_card_templates
CREATE TRIGGER set_updated_at_vip_card_templates
  BEFORE UPDATE ON public.vip_card_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for vip_card_config
CREATE TRIGGER set_updated_at_vip_card_config
  BEFORE UPDATE ON public.vip_card_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default Configuration
-- ============================================================================

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
  'default',
  60,  -- 60% common
  25,  -- 25% rare
  12,  -- 12% epic
  3,   -- 3% legendary (sums to 100)
  TRUE,
  'Default rarity distribution for normal gameplay'
);

-- ============================================================================
-- SEED DATA: All 26 VIP Cards
-- ============================================================================
-- Data extracted from src/lib/types/vip-card.ts (lines 139-367)

-- COMMON CARDS (7 cards)
INSERT INTO public.vip_card_templates (id, name, description, image_path, category, rarity, is_enabled, action, sort_order) VALUES
  ('bonus', 'Bonus', '+1 sur un devoir au choix', '/images/vip-cards/bonus1@0.5x.webp', 'bonus', 'common', TRUE, NULL, 10),
  ('choix', 'Choix de Place', 'Choisis ta place en classe pour une semaine', '/images/vip-cards/choix1@0.5x.webp', 'privilege', 'common', TRUE, NULL, 20),
  ('bougeotte', 'Bougeotte', 'Choisis ta place pour un cours', '/images/vip-cards/bougeotte1@0.5x.webp', 'privilege', 'common', TRUE, NULL, 30),
  ('jeu', 'Jeu', 'Choisis le jeu mathématique (avec des avantages !)', '/images/vip-cards/jeu1@0.5x.webp', 'privilege', 'common', TRUE, NULL, 40),
  ('soldes', 'Soldes', 'Pioche 2 nouvelles cartes VIP', '/images/vip-cards/soldes1@0.5x.webp', 'bonus', 'common', TRUE, '{"type": "draw_cards", "count": 2}', 50),
  ('super-soldes', 'Super Soldes', 'Pioche 3 nouvelles cartes VIP', '/images/vip-cards/soldes1@0.5x.webp', 'bonus', 'common', TRUE, '{"type": "draw_cards", "count": 3}', 60),
  ('candy', 'Candy', '', '/images/vip-cards/candy1@0.5x.webp', 'privilege', 'common', FALSE, NULL, 70);

-- RARE CARDS (9 cards)
INSERT INTO public.vip_card_templates (id, name, description, image_path, category, rarity, is_enabled, action, sort_order) VALUES
  ('super-bonus', 'Super Bonus', '+2 sur un devoir au choix', '/images/vip-cards/super-bonus1@0.5x.webp', 'bonus', 'rare', TRUE, NULL, 110),
  ('coup-double', 'Coup Double', 'Choisis une évaluation qui comptera 2 fois dans ta moyenne ce trimestre.', '/images/vip-cards/coup-double1@0.5x.webp', 'bonus', 'rare', TRUE, NULL, 120),
  ('super-bougeotte', 'Super Bougeotte', 'Choisis ta place pendant une semaine', '/images/vip-cards/super-bougeotte1@0.5x.webp', 'privilege', 'rare', TRUE, NULL, 130),
  ('tranquilou', 'Tranquilou', 'Tu es excusé d''avoir "oublié" de faire tes devoirs', '/images/vip-cards/tranquilou1@0.5x.webp', 'privilege', 'rare', TRUE, NULL, 140),
  ('lalalalala', 'Lalalalala', 'Choisis une chanson pour l''entrée ou la sortie en classe', '/images/vip-cards/lalala1@0.5x.webp', 'privilege', 'rare', TRUE, NULL, 150),
  ('help', 'Help !', 'Fais toi aider par ton professeur pendant l''évaluation', '/images/vip-cards/help1@0.5x.webp', 'power', 'rare', TRUE, NULL, 160),
  ('mathemagie', 'Mathémagie', 'Deviens l''assistant de Daoudini', '/images/vip-cards/mathemagie1@0.5x.webp', 'power', 'rare', TRUE, NULL, 170),
  ('ecrabouilleur', 'Écrabouilleur', 'Enlève un avertissement', '/images/vip-cards/ecrabouilleur1@0.5x.webp', 'power', 'rare', TRUE, '{"type": "remove_warnings", "count": 1}', 180),
  ('inventeur', 'Inventeur', 'Propose une nouvelle carte VIP', '/images/vip-cards/inventeur1@0.5x.webp', 'power', 'rare', TRUE, NULL, 190),
  ('mega-soldes', 'Méga Soldes', 'Pioche 4 nouvelles cartes VIP', '/images/vip-cards/mega-soldes1@0.5x.webp', 'bonus', 'rare', TRUE, '{"type": "draw_cards", "count": 4}', 200);

-- EPIC CARDS (6 cards)
INSERT INTO public.vip_card_templates (id, name, description, image_path, category, rarity, is_enabled, action, sort_order) VALUES
  ('mega-bonus', 'Méga Bonus', '+3 points bonus sur un devoir au choix', '/images/vip-cards/mega-bonus1@0.5x.webp', 'bonus', 'epic', TRUE, NULL, 210),
  ('throne', 'Game of throne', 'Prends le fauteuil du prof', '/images/vip-cards/throne1@0.5x.webp', 'privilege', 'epic', TRUE, NULL, 220),
  ('fame', 'Voltaire''s got talent', 'C''est ton heure de gloire', '/images/vip-cards/fame1@0.5x.webp', 'social', 'epic', TRUE, NULL, 230),
  ('memoire', 'Trou de mémoire', 'Utilise tes cahiers pendant l''évaluation', '/images/vip-cards/memoire1@0.5x.webp', 'power', 'epic', TRUE, NULL, 240),
  ('alchimie', 'Alchimie', 'Transforme 3 cartes VIP en une carte Bonus', '/images/vip-cards/alchimie1@0.5x.webp', 'power', 'epic', TRUE, '{"type": "exchange_cards", "exchange": {"mode": "discard_for_specific", "discardCount": 3, "targetCardId": "bonus"}}', 250),
  ('batman', 'Batman and Robin', 'Deviens le super-assistant du prof', '/images/vip-cards/batman1@0.5x.webp', 'power', 'epic', TRUE, NULL, 260);

-- LEGENDARY CARDS (2 cards)
INSERT INTO public.vip_card_templates (id, name, description, image_path, category, rarity, is_enabled, action, sort_order) VALUES
  ('fortune', 'Roue de la Fortune', 'Remplace tes cartes VIP par des nouvelles', '/images/vip-cards/fortune1@0.5x.webp', 'power', 'legendary', TRUE, '{"type": "exchange_cards", "exchange": {"mode": "replace_random", "count": 5}}', 310),
  ('Sheikh', 'Sheikh - Sheikha', 'Prends le fauteuil du professeur, bois un karak, et fais toi appeler Sheikh ou Sheikha par ton professeur', '/images/vip-cards/Sheikh1@0.5x.webp', 'power', 'legendary', TRUE, '{"type": "add_gidouilles", "amount": 50}', 320);

-- DISABLED CARDS (3 cards) - Include candy, captain (common), and team (rare) as disabled
INSERT INTO public.vip_card_templates (id, name, description, image_path, category, rarity, is_enabled, action, sort_order) VALUES
  ('captain', 'Capitaine', 'Devient capitaine d''équipe pour un projet', '/images/vip-cards/captain1@0.5x.webp', 'social', 'common', FALSE, NULL, 80),
  ('team', 'My team', 'Choisis ton groupe pour un travail de groupe', '/images/vip-cards/team1@0.5x.webp', 'social', 'rare', FALSE, NULL, 210);

-- ============================================================================
-- HELPER FUNCTION: is_admin() (Create if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'teacher')
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS
'Returns TRUE if the authenticated user is an admin or teacher. Used for RLS policies.';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.vip_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_card_config ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- vip_card_templates policies
-- -------------------------

-- SELECT: Authenticated users can view all cards (enabled and disabled)
CREATE POLICY "vip_card_templates_select_authenticated"
  ON public.vip_card_templates
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- INSERT: Only admins can create new cards
CREATE POLICY "vip_card_templates_insert_admin"
  ON public.vip_card_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Only admins can modify cards
CREATE POLICY "vip_card_templates_update_admin"
  ON public.vip_card_templates
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- DELETE: Only admins can delete cards
CREATE POLICY "vip_card_templates_delete_admin"
  ON public.vip_card_templates
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- -------------------------
-- vip_card_config policies
-- -------------------------

-- SELECT: Authenticated users can view ONLY the active config
CREATE POLICY "vip_card_config_select_active"
  ON public.vip_card_config
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- SELECT: Admins can view ALL configs
CREATE POLICY "vip_card_config_select_admin"
  ON public.vip_card_config
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- INSERT: Only admins can create new configs
CREATE POLICY "vip_card_config_insert_admin"
  ON public.vip_card_config
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Only admins can modify configs
CREATE POLICY "vip_card_config_update_admin"
  ON public.vip_card_config
  FOR UPDATE
  TO authenticated
  USING (is_admin());

-- DELETE: Only admins can delete configs
CREATE POLICY "vip_card_config_delete_admin"
  ON public.vip_card_config
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify setup)
-- ============================================================================

-- Verify card count by rarity (should be: common=8 (6 enabled), rare=10 (9 enabled), epic=6, legendary=2)
-- SELECT rarity, COUNT(*) as count, SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END) as enabled_count
-- FROM public.vip_card_templates
-- GROUP BY rarity
-- ORDER BY CASE rarity
--   WHEN 'common' THEN 1
--   WHEN 'rare' THEN 2
--   WHEN 'epic' THEN 3
--   WHEN 'legendary' THEN 4
-- END;

-- Verify config probabilities sum to 100
-- SELECT
--   config_name,
--   common_probability + rare_probability + epic_probability + legendary_probability as sum,
--   is_active
-- FROM public.vip_card_config;

-- Verify only enabled cards are drawable
-- SELECT id, name, rarity, is_enabled
-- FROM public.vip_card_templates
-- WHERE is_enabled = FALSE;
