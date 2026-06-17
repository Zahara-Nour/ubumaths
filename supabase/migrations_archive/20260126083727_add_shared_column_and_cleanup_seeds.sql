-- Migration: Add shared column and cleanup legacy seeds
-- =====================================================
--
-- This migration:
-- 1. Adds the `shared` JSONB column for SharedVariationDefaults
-- 2. Deletes all existing seed templates (they use legacy syntax)
--
-- The shared column stores fields that apply to ALL variations:
-- - statement: Shared statement template
-- - solution: Shared solution
-- - variables: Shared variables (merged with per-variation)
-- - correction: Shared correction feedback/steps
-- - choices: Shared choices for QCM
-- - validationRules: Shared validation rules

-- ============================================================================
-- STEP 1: Delete legacy seed templates
-- ============================================================================
-- These seeds use unsupported syntax ({@:var}, {#:1-10}, {eval:...})
-- instead of the current syntax ({{var}}, {{1..10}}, {{eval:...}})

DELETE FROM question_templates;

-- ============================================================================
-- STEP 2: Add shared column
-- ============================================================================

ALTER TABLE question_templates
ADD COLUMN shared JSONB;

COMMENT ON COLUMN question_templates.shared IS
  'Shared defaults applied to all variations. Contains: statement, solution, variables, correction, choices, validationRules. Per-variation values override shared values (except variables which are merged).';

-- ============================================================================
-- STEP 3: Update table comment
-- ============================================================================

COMMENT ON TABLE question_templates IS
  'Question templates with variations support and random generation. Each template has one or more variations, with optional shared defaults. Uses {{var}}, {{random:...}}, {{eval:...}} syntax.';
