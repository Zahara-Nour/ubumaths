-- Migration: Unlock 10 spells for student
-- Description: Unlock 10 random spells across different elements for testing student UUID
-- Student UUID: acba65ca-5738-4bda-b309-5b1d838a4424
-- Author: Claude Code
-- Date: 2025-10-15
-- Note: This migration only runs if the student exists (production only)

-- Insert 10 spells for the student (spread across different elements)
-- Spell number ranges by element: Fire (1-7), Water (8-14), Wind (15-21), Earth (22-28)
-- Only insert if the user exists in profiles table
DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_spell_count INTEGER;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = 'acba65ca-5738-4bda-b309-5b1d838a4424'
  ) INTO v_user_exists;

  IF v_user_exists THEN
    -- User exists, insert spells
    INSERT INTO game_spells (user_id, spell_num, level, element, power, type)
    VALUES
      -- Fire spells (3 spells: #1-3)
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 1, 1, 'fire', 25, 'attack'),
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 2, 1, 'fire', 30, 'attack'),
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 3, 1, 'fire', 28, 'attack'),

      -- Water spells (3 spells: #8-10)
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 8, 1, 'water', 22, 'heal'),
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 9, 1, 'water', 26, 'attack'),
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 10, 1, 'water', 20, 'buff'),

      -- Wind spells (2 spells: #15-16)
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 15, 1, 'wind', 24, 'attack'),
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 16, 1, 'wind', 20, 'heal'),

      -- Earth spells (2 spells: #22-23)
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 22, 1, 'earth', 35, 'attack'),
      ('acba65ca-5738-4bda-b309-5b1d838a4424', 23, 1, 'earth', 25, 'buff')
    ON CONFLICT (user_id, spell_num) DO NOTHING;

    -- Verify the insert
    SELECT COUNT(*) INTO v_spell_count
    FROM game_spells
    WHERE user_id = 'acba65ca-5738-4bda-b309-5b1d838a4424';

    RAISE NOTICE 'Student now has % spell(s) unlocked', v_spell_count;
  ELSE
    RAISE NOTICE 'Student acba65ca-5738-4bda-b309-5b1d838a4424 not found - skipping spell unlock (this is normal for local development)';
  END IF;
END $$;
