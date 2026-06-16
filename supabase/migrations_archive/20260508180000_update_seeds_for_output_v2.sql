-- Migration: Update seeded python exercises for output validation V2
-- Created: 2026-05-08
--
-- The output validation API was redesigned in this PR. The seeded exercises
-- from migration 20260508163407 use the legacy `ignore_whitespace: false`
-- field which no longer exists. This migration rewrites the relevant
-- `validation_config` rows to the new shape:
--
--   - `output` strategy: drop `ignore_whitespace`, add `comparison: {kind:'exact'}`
--   - `ast` strategy with `output_tests`: add `output_comparison: {kind:'exact'}`
--
-- Operations are idempotent via `validation_config->'comparison' IS NULL` and
-- equivalent guards, so running the migration on a database that already has
-- the new shape is a no-op.

-- ============================================================================
-- Output strategy: replace ignore_whitespace with comparison
-- ============================================================================

UPDATE python_exercises
SET validation_config =
    (validation_config - 'ignore_whitespace')
    || jsonb_build_object('comparison', jsonb_build_object('kind', 'exact'))
WHERE validation_config->>'type' = 'output'
  AND validation_config->'comparison' IS NULL;

-- ============================================================================
-- AST strategy with output_tests: add default output_comparison
-- ============================================================================

UPDATE python_exercises
SET validation_config =
    validation_config
    || jsonb_build_object('output_comparison', jsonb_build_object('kind', 'exact'))
WHERE validation_config->>'type' = 'ast'
  AND validation_config->'output_tests' IS NOT NULL
  AND validation_config->'output_comparison' IS NULL;
