-- Migration: Restore "Approximation de ln(2)" and "Suites entrelacées exp"
--            to unit_test (they were wrongly converted to variable_check
--            by migration 20260512234300).
-- Created: 2026-05-12
--
-- Mistake in 20260512234300_convert_bac_output_to_variable_check.sql:
-- The scope was supposed to be "Bac exercises currently using `output`
-- (stdout) validation". A grep on the original seed files (May 10)
-- returned three matches — but two of them had already been migrated to
-- `unit_test` by 20260510210004_migrate_tuple_exos_to_unit_test.sql
-- (same day, later). The original-seed grep missed that downstream
-- migration, so 20260512234300 regressed those two exos by overwriting
-- their unit_test config with variable_check and rewriting their
-- starter/solution code to introduce assignment scaffolding that
-- replaced the clean `return (u, n)` form.
--
-- The third exo touched by that migration — "Centrale solaire — seuil
-- 12000 panneaux" (Bac Centres étrangers 06/2021 Q1.c) — WAS the
-- legitimate `output`→`variable_check` candidate and stays as-is.
--
-- This migration restores the pre-bug state of the two tuple exos:
--   - starter_code / solution_code reverted to the unit_test version
--     (cf. 20260510210004) — `return (u, n)` / `return (a, b)`, no
--     trailing `result = seuil()` or `r0/r1/r5/r10 = termes(...)`.
--   - validation_config back to unit_test + tolerance values from
--     20260510214434 (eps_abs/eps_rel 1e-6 for ln(2), 1e-4 for termes).

-- ============================================================================
-- 1. Approximation de ln(2) — restore to unit_test
-- ============================================================================

UPDATE python_exercises
SET
    starter_code = 'from math import exp, log as ln' || E'\n\n' ||
        'def seuil():' || E'\n' ||
        '    n = 0' || E'\n' ||
        '    u = 0.1' || E'\n' ||
        '    while False:    # à compléter (condition sur ln(2) - u et 0.0001)' || E'\n' ||
        '        n = n + 1' || E'\n' ||
        '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
        '    return (u, n)' || E'\n',
    solution_code = 'from math import exp, log as ln' || E'\n\n' ||
        'def seuil():' || E'\n' ||
        '    n = 0' || E'\n' ||
        '    u = 0.1' || E'\n' ||
        '    while ln(2) - u > 0.0001:' || E'\n' ||
        '        n = n + 1' || E'\n' ||
        '        u = 2 * u * exp(-u)' || E'\n' ||
        '    return (u, n)' || E'\n',
    validation_config = '{
        "ast_requirements": [
            {
                "type": "defines_function",
                "name": "seuil",
                "message": "Tu dois définir la fonction seuil()."
            },
            {
                "type": "uses_loop",
                "message": "Tu dois utiliser une boucle while."
            }
        ],
        "behavior": {
            "kind": "unit_test",
            "function_name": "seuil",
            "test_cases": [
                {"args": [], "expected": [0.6931009075876846, 11]}
            ],
            "tolerance": {
                "eps_abs": 0.000001,
                "eps_rel": 0.000001
            }
        }
    }'::jsonb
WHERE title = 'Approximation de ln(2)';

-- ============================================================================
-- 2. Suites entrelacées exp — termes(n) — restore to unit_test
-- ============================================================================

UPDATE python_exercises
SET
    starter_code = 'from math import exp' || E'\n\n' ||
        'def termes(n):' || E'\n' ||
        '    a = 1 / 10' || E'\n' ||
        '    b = 1' || E'\n' ||
        '    for k in range(0, n):' || E'\n' ||
        '        c = ...    # à compléter (nouveau a, à partir de l''ancien b)' || E'\n' ||
        '        b = ...    # à compléter (mise à jour de b, à partir de l''ancien a)' || E'\n' ||
        '        a = c' || E'\n' ||
        '    return (a, b)' || E'\n',
    solution_code = 'from math import exp' || E'\n\n' ||
        'def termes(n):' || E'\n' ||
        '    a = 1 / 10' || E'\n' ||
        '    b = 1' || E'\n' ||
        '    for k in range(0, n):' || E'\n' ||
        '        c = exp(-b)' || E'\n' ||
        '        b = exp(-a)' || E'\n' ||
        '        a = c' || E'\n' ||
        '    return (a, b)' || E'\n',
    validation_config = '{
        "ast_requirements": [
            {
                "type": "defines_function",
                "name": "termes",
                "message": "Tu dois définir la fonction termes(n)."
            },
            {
                "type": "uses_loop",
                "message": "Tu dois utiliser une boucle for."
            }
        ],
        "behavior": {
            "kind": "unit_test",
            "function_name": "termes",
            "test_cases": [
                {"args": [0], "expected": [0.1, 1]},
                {"args": [1], "expected": [0.36787944117144233, 0.9048374180359595]},
                {"args": [2], "expected": [0.40460766166413187, 0.6922006275553463]},
                {"args": [5], "expected": [0.545395785975027, 0.5986228020506361]},
                {"args": [10], "expected": [0.565315835672005, 0.5684287250290607]}
            ],
            "tolerance": {
                "eps_abs": 0.0001,
                "eps_rel": 0.0001
            }
        }
    }'::jsonb
WHERE title = 'Suites entrelacées exp — termes(n)';
