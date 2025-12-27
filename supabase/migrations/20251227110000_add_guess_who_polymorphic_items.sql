-- Migration: Add polymorphic grid items support
-- Description: Adds JSONB columns for polymorphic grid items (fractions, shapes, expressions, functions, polyhedra)
-- Author: Claude Code
-- Date: 2025-12-27

-- ============================================================================
-- Add grid_items JSONB column for polymorphic items
-- ============================================================================

-- Add grid_items column (JSONB array for polymorphic items)
-- This replaces grid_numbers for non-number packs
ALTER TABLE guess_who_games
ADD COLUMN grid_items JSONB;

-- Add player secret items for polymorphic types
ALTER TABLE guess_who_games
ADD COLUMN player1_secret_item JSONB,
ADD COLUMN player2_secret_item JSONB;

-- ============================================================================
-- Update pack_id constraint for new pack types
-- ============================================================================

-- Drop old constraint
ALTER TABLE guess_who_games
DROP CONSTRAINT IF EXISTS valid_pack_id;

-- Add new constraint with all pack types
ALTER TABLE guess_who_games
ADD CONSTRAINT valid_pack_id CHECK (
    pack_id IN (
        -- Number packs (existing)
        'naturals_easy', 'naturals_medium', 'naturals_hard', 'times_tables', 'primes_focus',
        -- Fraction packs
        'fractions_6eme', 'fractions_5eme', 'fractions_4eme',
        -- 2D Shape packs
        'shapes2d_cm1', 'shapes2d_cm2', 'shapes2d_6eme', 'shapes2d_5eme',
        -- Algebraic expression packs
        'expressions_4eme', 'expressions_3eme', 'expressions_2nde',
        -- Function graph packs
        'functions_3eme', 'functions_2nde', 'functions_1ere',
        -- 3D Polyhedra packs
        'polyhedra_5eme', 'polyhedra_4eme', 'polyhedra_3eme'
    )
);

-- ============================================================================
-- Add item_type column to track what type of items are in the grid
-- ============================================================================

-- Add item_type column
ALTER TABLE guess_who_games
ADD COLUMN item_type TEXT NOT NULL DEFAULT 'number' CHECK (
    item_type IN ('number', 'fraction', 'shape2d', 'expression', 'function', 'polyhedron')
);

-- ============================================================================
-- Update constraints for grid data
-- ============================================================================

-- Drop old grid constraints that only work with numbers
ALTER TABLE guess_who_games
DROP CONSTRAINT IF EXISTS grid_numbers_length,
DROP CONSTRAINT IF EXISTS player1_secret_in_grid,
DROP CONSTRAINT IF EXISTS player2_secret_in_grid,
DROP CONSTRAINT IF EXISTS different_secrets;

-- Add new constraint: grid must have exactly 24 items
-- For number types, grid_numbers must have 24 elements
-- For other types, grid_items must have 24 elements
ALTER TABLE guess_who_games
ADD CONSTRAINT grid_has_24_items CHECK (
    (item_type = 'number' AND array_length(grid_numbers, 1) = 24) OR
    (item_type != 'number' AND jsonb_array_length(grid_items) = 24)
);

-- Add constraint: secrets must be set according to item type
ALTER TABLE guess_who_games
ADD CONSTRAINT secrets_match_item_type CHECK (
    (item_type = 'number' AND player1_secret IS NOT NULL) OR
    (item_type != 'number' AND player1_secret_item IS NOT NULL)
);

-- Add constraint: player2 secret must match item type when set
ALTER TABLE guess_who_games
ADD CONSTRAINT player2_secret_matches_type CHECK (
    (player2_id IS NULL) OR
    (item_type = 'number' AND player2_secret IS NOT NULL) OR
    (item_type != 'number' AND player2_secret_item IS NOT NULL)
);

-- ============================================================================
-- Update eliminated table for polymorphic items
-- ============================================================================

-- Add eliminated_items JSONB for non-number types
ALTER TABLE guess_who_eliminated
ADD COLUMN eliminated_items JSONB;

-- ============================================================================
-- Update moves table for polymorphic questions
-- ============================================================================

-- Add question types for non-number items
-- First drop the old constraint
ALTER TABLE guess_who_moves
DROP CONSTRAINT IF EXISTS guess_who_moves_question_type_check;

-- Add new constraint with all question types
ALTER TABLE guess_who_moves
ADD CONSTRAINT guess_who_moves_question_type_check CHECK (
    question_type IS NULL OR question_type IN (
        -- Number questions (existing)
        'is_even', 'is_odd', 'is_prime', 'is_multiple_of', 'is_divisible_by',
        'greater_than', 'less_than', 'units_digit', 'tens_digit',
        'is_perfect_square', 'sum_digits',

        -- Fraction questions
        'is_irreducible', 'has_even_numerator', 'has_odd_numerator',
        'has_prime_denominator', 'greater_than_one', 'less_than_one',
        'equal_to_half', 'numerator_greater_than', 'denominator_less_than',

        -- 2D Shape questions
        'side_count_equals', 'side_count_greater_than', 'is_regular_polygon',
        'is_convex', 'has_right_angle', 'has_parallel_sides', 'has_equal_sides',
        'symmetry_axes_greater_than',

        -- Expression questions
        'degree_equals', 'degree_greater_than', 'is_monomial', 'is_polynomial',
        'has_x_squared', 'has_x_cubed', 'coefficient_of_x_positive',
        'coefficient_of_x_negative', 'constant_term_positive', 'has_fraction',
        'has_square_root', 'has_trig_function', 'has_exp_function', 'has_log_function',

        -- Function questions
        'passes_origin', 'increasing_at_zero', 'decreasing_at_zero',
        'has_maximum', 'has_minimum', 'has_root', 'root_count',
        'has_horizontal_asymptote', 'has_vertical_asymptote',
        'is_even', 'is_odd', 'y_intercept_positive', 'y_intercept_negative',

        -- Polyhedron questions
        'face_count_equals', 'face_count_greater_than', 'vertex_count_equals',
        'edge_count_equals', 'is_regular_polyhedron', 'is_prism', 'is_pyramid',
        'has_square_faces', 'has_triangular_faces', 'is_platonic_solid'
    )
);

-- Add question_param_text for questions that need string parameters
ALTER TABLE guess_who_moves
ADD COLUMN question_param_text TEXT;

-- ============================================================================
-- Add guessed_item for polymorphic guesses
-- ============================================================================

ALTER TABLE guess_who_moves
ADD COLUMN guessed_item JSONB;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN guess_who_games.grid_items IS 'JSONB array of 24 polymorphic items for non-number packs';
COMMENT ON COLUMN guess_who_games.player1_secret_item IS 'JSONB secret item for player 1 (for non-number packs)';
COMMENT ON COLUMN guess_who_games.player2_secret_item IS 'JSONB secret item for player 2 (for non-number packs)';
COMMENT ON COLUMN guess_who_games.item_type IS 'Type of items in the grid: number, fraction, shape2d, expression, function, polyhedron';
COMMENT ON COLUMN guess_who_eliminated.eliminated_items IS 'JSONB array of eliminated items (for non-number packs)';
COMMENT ON COLUMN guess_who_moves.question_param_text IS 'Text parameter for questions that need string values';
COMMENT ON COLUMN guess_who_moves.guessed_item IS 'JSONB item that was guessed (for non-number packs)';
