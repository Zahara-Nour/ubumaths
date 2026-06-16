-- Migration: refactor python_exercises.validation_config to ast + behavior schema
-- Created: 2026-05-10
--
-- The validation_config column used a discriminated union on `type`:
--   { type: 'output' | 'unit_test' | 'ast', ... }
-- This shape couldn't combine `ast` requirements with a `unit_test` runtime
-- check (only with `output_tests`), which is conceptually orthogonal.
--
-- The new shape models the two layers independently:
--   {
--     ast_requirements?: ASTRequirement[],
--     behavior?: { kind: 'output' | 'unit_test', ... },
--     timeout_ms?: number
--   }
--
-- Transformations applied:
--   - type: 'output'    →  behavior: { kind: 'output', test_cases, comparison }
--   - type: 'unit_test' →  behavior: { kind: 'unit_test', function_name, test_cases }
--   - type: 'ast' (no output_tests)        →  ast_requirements: requirements
--   - type: 'ast' with non-empty output_tests
--                       →  ast_requirements: requirements,
--                          behavior: { kind: 'output', test_cases: output_tests,
--                                      comparison: output_comparison ?? { kind: 'exact' } }
--
-- `timeout_ms` is preserved at the top level when present.
--
-- The WHERE clause makes the migration idempotent: re-running it after the
-- shape has already changed is a no-op (the discriminator field `type` is
-- gone after the first run).

UPDATE python_exercises
SET validation_config = CASE
    -- Output strategy → behavior.kind = 'output'
    WHEN validation_config->>'type' = 'output' THEN
        jsonb_build_object(
            'behavior', jsonb_build_object(
                'kind', 'output',
                'test_cases', validation_config->'test_cases',
                'comparison', validation_config->'comparison'
            )
        )
        || (CASE WHEN validation_config ? 'timeout_ms'
                 THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
                 ELSE '{}'::jsonb END)

    -- Unit test strategy → behavior.kind = 'unit_test'
    WHEN validation_config->>'type' = 'unit_test' THEN
        jsonb_build_object(
            'behavior', jsonb_build_object(
                'kind', 'unit_test',
                'function_name', validation_config->'function_name',
                'test_cases', validation_config->'test_cases'
            )
        )
        || (CASE WHEN validation_config ? 'timeout_ms'
                 THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
                 ELSE '{}'::jsonb END)

    -- AST strategy with non-empty output_tests → ast_requirements + behavior
    WHEN validation_config->>'type' = 'ast'
        AND jsonb_array_length(coalesce(validation_config->'output_tests', '[]'::jsonb)) > 0 THEN
        jsonb_build_object(
            'ast_requirements', validation_config->'requirements',
            'behavior', jsonb_build_object(
                'kind', 'output',
                'test_cases', validation_config->'output_tests',
                'comparison', coalesce(
                    validation_config->'output_comparison',
                    '{"kind": "exact"}'::jsonb
                )
            )
        )
        || (CASE WHEN validation_config ? 'timeout_ms'
                 THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
                 ELSE '{}'::jsonb END)

    -- AST strategy without output_tests → ast_requirements only
    WHEN validation_config->>'type' = 'ast' THEN
        jsonb_build_object('ast_requirements', validation_config->'requirements')
        || (CASE WHEN validation_config ? 'timeout_ms'
                 THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
                 ELSE '{}'::jsonb END)

    -- Already in new shape (idempotent guard, also caught by WHERE clause)
    ELSE validation_config
END
WHERE validation_config ? 'type';

-- ============================================================================
-- Down migration (documentation only — copy/paste into a fresh migration if a
-- rollback is ever needed). The transformation is partial: a row with both
-- `ast_requirements` and a `unit_test` behavior is NOT representable in the
-- legacy shape, so this script raises an error if any such row exists.
-- ============================================================================
--
-- DO $$
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM python_exercises
--         WHERE validation_config ? 'ast_requirements'
--           AND validation_config->'behavior'->>'kind' = 'unit_test'
--     ) THEN
--         RAISE EXCEPTION 'Cannot downgrade: rows combine ast_requirements + behavior.unit_test';
--     END IF;
-- END $$;
--
-- UPDATE python_exercises
-- SET validation_config = CASE
--     -- behavior-only output → type=output
--     WHEN NOT (validation_config ? 'ast_requirements')
--          AND validation_config->'behavior'->>'kind' = 'output' THEN
--         jsonb_build_object(
--             'type', 'output',
--             'test_cases', validation_config->'behavior'->'test_cases',
--             'comparison', validation_config->'behavior'->'comparison'
--         )
--         || (CASE WHEN validation_config ? 'timeout_ms'
--                  THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
--                  ELSE '{}'::jsonb END)
--
--     -- behavior-only unit_test → type=unit_test
--     WHEN NOT (validation_config ? 'ast_requirements')
--          AND validation_config->'behavior'->>'kind' = 'unit_test' THEN
--         jsonb_build_object(
--             'type', 'unit_test',
--             'function_name', validation_config->'behavior'->'function_name',
--             'test_cases', validation_config->'behavior'->'test_cases'
--         )
--         || (CASE WHEN validation_config ? 'timeout_ms'
--                  THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
--                  ELSE '{}'::jsonb END)
--
--     -- ast_requirements + output behavior → type=ast with output_tests
--     WHEN validation_config ? 'ast_requirements'
--          AND validation_config->'behavior'->>'kind' = 'output' THEN
--         jsonb_build_object(
--             'type', 'ast',
--             'requirements', validation_config->'ast_requirements',
--             'output_tests', validation_config->'behavior'->'test_cases',
--             'output_comparison', validation_config->'behavior'->'comparison'
--         )
--         || (CASE WHEN validation_config ? 'timeout_ms'
--                  THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
--                  ELSE '{}'::jsonb END)
--
--     -- ast_requirements only → type=ast
--     WHEN validation_config ? 'ast_requirements' THEN
--         jsonb_build_object(
--             'type', 'ast',
--             'requirements', validation_config->'ast_requirements'
--         )
--         || (CASE WHEN validation_config ? 'timeout_ms'
--                  THEN jsonb_build_object('timeout_ms', validation_config->'timeout_ms')
--                  ELSE '{}'::jsonb END)
--
--     ELSE validation_config
-- END
-- WHERE NOT (validation_config ? 'type');
