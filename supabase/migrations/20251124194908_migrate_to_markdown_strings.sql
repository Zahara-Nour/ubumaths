-- ============================================================================
-- Migration 090: Migrate ContentField[] to Markdown Strings
-- ============================================================================
--
-- This migration updates the storage format from ContentField[] arrays (JSONB)
-- to markdown strings (TEXT) for question and SRS card content.
--
-- Background:
-- - ContentField[] was a complex JSONB structure: [{ type: 'text', content: '...' }]
-- - Markdown strings are simpler, more maintainable, and better for content
-- - The application now uses TemplateMarkdown and ResolvedMarkdown types
--
-- Changes:
-- 1. question_templates.variations: JSONB structure updated (no schema change)
--    - Old: { statement: ContentField[], correction?: ContentField[], choices?: {...}[] }
--    - New: { statement: string, correction?: string, choices?: {...}[] }
--
-- 2. srs_cards.front_content: JSONB → TEXT
-- 3. srs_cards.back_content: JSONB → TEXT
--
-- BREAKING CHANGE: Existing test data will be cleared.
-- User confirmed: Test data can be lost during this migration.
--
-- Migration: 090
-- Created: 2025-11-24
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Clear Existing Test Data
-- ============================================================================
-- User confirmed test data can be lost. Truncate tables to start fresh.

TRUNCATE question_templates CASCADE;
TRUNCATE srs_cards CASCADE;

-- ============================================================================
-- STEP 2: Update srs_cards Schema (JSONB → TEXT)
-- ============================================================================
-- Convert front_content and back_content from JSONB to TEXT
-- Using NULL as default since existing data was already cleared

ALTER TABLE srs_cards
  ALTER COLUMN front_content TYPE TEXT USING NULL,
  ALTER COLUMN back_content TYPE TEXT USING NULL;

-- ============================================================================
-- STEP 3: Update Column Comments
-- ============================================================================
-- Update comments to reflect the new markdown string format

-- question_templates.variations
COMMENT ON COLUMN question_templates.variations IS
  'JSONB array of question variations. Each variation now contains markdown strings instead of ContentField arrays. Structure: [{ statement: string, variables?: {...}[], answer: string | string[], correction?: string, blanks?: {...}[], choices?: { content: string, isCorrect: boolean }[] }]';

-- srs_cards columns
COMMENT ON COLUMN srs_cards.front_content IS
  'For custom cards: Front content as markdown string (TEXT). For template cards, this is NULL and content comes from template_id.';

COMMENT ON COLUMN srs_cards.back_content IS
  'For custom cards: Back content as markdown string (TEXT). For template cards, this is NULL and content comes from template_id.';

-- ============================================================================
-- STEP 4: Verify RLS Policies Still Work
-- ============================================================================
-- All RLS policies reference auth.uid() and foreign key relationships.
-- Since we only changed column types (JSONB → TEXT), policies remain valid.
-- No policy updates required.

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
--
-- REQUIRED MANUAL STEPS:
-- 1. Update src/lib/types/database.ts:
--    - srs_cards.front_content: Json | null → string | null
--    - srs_cards.back_content: Json | null → string | null
--    - question_templates.variations inner structure (TypeScript comment)
--
-- 2. Update docs/architecture/database-schema.md:
--    - Document new markdown string format
--    - Update table definitions for srs_cards
--
-- 3. Test the migration:
--    - Create new question templates with markdown strings
--    - Create custom SRS cards with markdown content
--    - Verify content renders correctly in UI
--
-- BACKWARDS COMPATIBILITY:
-- - This is a BREAKING CHANGE
-- - Old ContentField[] format is no longer supported
-- - All code using ContentField[] must be updated to use markdown strings
--
-- ============================================================================
