-- Migration: Deprecate top-level precision, add default_display_options column
-- Phase 1: precision is now in shared.blankDefaults.precision
-- Phase 2: default_display_options stores display options for math expressions

-- Deprecate precision column (keep data, add comment)
COMMENT ON COLUMN question_templates.precision IS 'DEPRECATED - precision is now in shared.blankDefaults.precision';

-- Add default_display_options column
ALTER TABLE question_templates
ADD COLUMN IF NOT EXISTS default_display_options JSONB;

COMMENT ON COLUMN question_templates.default_display_options IS
  'Display options for math expressions (shuffleTerms, removeNullTerms, etc.). Cascade: GLOBAL < TEMPLATE < VARIABLE';
