-- Migration: Migrate tuple-returning exos from output to unit_test strategy
-- Created: 2026-05-10
--
-- Two exos return tuples (`return (u, n)` Bac convention) and were stuck on
-- behavior.output with a `print(seuil(...))` line in the starter:
--   1. "Approximation de ln(2)"   — Bac Centres étrangers 06/2024 Q4.b
--   2. "Suites entrelacées exp — termes(n)" — Bac Madagascar 05/2022
--
-- The worker now normalizes tuples to lists recursively before comparison
-- (commit 201ac2265 → see pyodide.worker.ts), so unit_test works against a
-- JSON array expected. We can drop the print + use unit_test for cleaner UX
-- (the "Tester ma fonction" panel + strict equality), without modifying the
-- Bac form (`return (u, n)` stays).

-- ============================================================================
-- 1. Approximation de ln(2)
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
            ]
        }
    }'::jsonb
WHERE title = 'Approximation de ln(2)';

-- ============================================================================
-- 2. Suites entrelacées exp — termes(n)
-- ============================================================================
--
-- For this one, expected values per (a, b) tuple at various n. Computed via
-- node (Math.exp), bit-identical to Pyodide for IEEE 754 mult/div/exp paths.

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
            ]
        }
    }'::jsonb
WHERE title = 'Suites entrelacées exp — termes(n)';
