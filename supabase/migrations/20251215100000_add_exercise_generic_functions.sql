-- Migration: Add generic_functions field to exercises table
-- Purpose: Allow exercises to specify custom function identifiers for math parsing
--
-- This field enables proper parsing of derivative notation (f'(x), P''(x))
-- and inverse functions (f^{-1}(x)) for custom function names.
--
-- Examples:
--   - ['f', 'g', 'h']: Default function names
--   - ['P', 'Q', 'R']: Custom probability/polynomial functions
--   - []: Disable generic function parsing

-- Add the generic_functions column
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS generic_functions TEXT[] DEFAULT NULL;

-- Add comment documenting the field
COMMENT ON COLUMN exercises.generic_functions IS
'Custom function identifiers to recognize in math expressions.
When set, these identifiers will be parsed as function calls (e.g., P(x), Q''(x))
instead of implicit multiplication.
- NULL/undefined: Use parser defaults (f, g, h, u, v, w, F, G, H)
- []: Disable generic function parsing entirely
- [''f'', ''P'', ''Q'']: Recognize only these identifiers as functions';
