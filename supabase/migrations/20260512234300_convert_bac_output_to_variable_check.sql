-- Migration: Convert 3 Bac exercises from output-stdout validation to
--            variable_check, removing the `print(...)` boilerplate from
--            their starter & solution code.
-- Created: 2026-05-12
--
-- Affected exercises (matched on `source`):
--   1. Bac Centres étrangers 06/2024 Q4.b — "Approximation de ln(2)"
--   2. Bac Madagascar 05/2022 Partie B Q1.b — "Suites entrelacées exp"
--   3. Bac Centres étrangers 06/2021 Partie A Q1.c — "Centrale solaire"
--
-- Rationale: variable_check reads variables directly from the namespace
-- after the student's code runs, so we no longer need `print(...)` lines
-- whose sole purpose was to make the value observable to a stdout
-- comparator. The exercises become closer to the original Bac script
-- (the prints were always called out as "ne pas modifier — ligne
-- utilisée par la validation").
--
-- Tolerances preserved from the previous `numeric` comparison so an
-- algorithm that passed before still passes. The exo with an integer
-- answer (panneaux, n=68) uses no tolerance.
--
-- Tuple ≡ list at the JSON boundary: variable_check treats Python tuples
-- and lists as equivalent (Pyodide `toJs` collapses tuples to Array),
-- matching the existing unit_test behaviour.

-- =============================================================================
-- 1. Approximation de ln(2) — Bac Centres étrangers 06/2024 Q4.b
-- =============================================================================
-- Student now writes `result = seuil()` instead of `print(seuil())`.
-- variable_check verifies `result == (≈ln(2), 11)`. The note in the
-- starter mentions `result` as the binding the validator inspects.

UPDATE python_exercises
SET
    starter_code = 'from math import exp, log as ln' || E'\n\n' ||
        'def seuil():' || E'\n' ||
        '    n = 0' || E'\n' ||
        '    u = 0.1' || E'\n' ||
        '    while False:    # à compléter (condition sur ln(2) - u et 0.0001)' || E'\n' ||
        '        n = n + 1' || E'\n' ||
        '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
        '    return (u, n)' || E'\n\n' ||
        '# Ne pas modifier — variable inspectée par la validation' || E'\n' ||
        'result = seuil()' || E'\n',
    solution_code = 'from math import exp, log as ln' || E'\n\n' ||
        'def seuil():' || E'\n' ||
        '    n = 0' || E'\n' ||
        '    u = 0.1' || E'\n' ||
        '    while ln(2) - u > 0.0001:' || E'\n' ||
        '        n = n + 1' || E'\n' ||
        '        u = 2 * u * exp(-u)' || E'\n' ||
        '    return (u, n)' || E'\n\n' ||
        'result = seuil()' || E'\n',
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
            "kind": "variable_check",
            "expected_vars": {
                "result": [0.6931009075876846, 11]
            },
            "tolerance": {
                "eps_abs": 0.001,
                "eps_rel": 0.001
            }
        }
    }'::jsonb
WHERE source = 'Bac Centres étrangers 06/2024 Q4.b';

-- =============================================================================
-- 2. Suites entrelacées exp — Bac Madagascar 05/2022 Partie B Q1.b
-- =============================================================================
-- 4 prints → 4 named bindings (r0, r1, r5, r10). One row per checked
-- variable in the result panel; the student sees per-case verdicts.

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
        '    return (a, b)' || E'\n\n' ||
        '# Validation : ne pas modifier (variables inspectées par la validation)' || E'\n' ||
        'r0 = termes(0)' || E'\n' ||
        'r1 = termes(1)' || E'\n' ||
        'r5 = termes(5)' || E'\n' ||
        'r10 = termes(10)' || E'\n',
    solution_code = 'from math import exp' || E'\n\n' ||
        'def termes(n):' || E'\n' ||
        '    a = 1 / 10' || E'\n' ||
        '    b = 1' || E'\n' ||
        '    for k in range(0, n):' || E'\n' ||
        '        c = exp(-b)' || E'\n' ||
        '        b = exp(-a)' || E'\n' ||
        '        a = c' || E'\n' ||
        '    return (a, b)' || E'\n\n' ||
        'r0 = termes(0)' || E'\n' ||
        'r1 = termes(1)' || E'\n' ||
        'r5 = termes(5)' || E'\n' ||
        'r10 = termes(10)' || E'\n',
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
            "kind": "variable_check",
            "expected_vars": {
                "r0":  [0.1, 1],
                "r1":  [0.36787944117144233, 0.9048374180359595],
                "r5":  [0.545395785975027, 0.5986228020506361],
                "r10": [0.565315835672005, 0.5684287250290607]
            },
            "tolerance": {
                "eps_abs": 0.0001,
                "eps_rel": 0.0000000001
            }
        }
    }'::jsonb
WHERE source = 'Bac Madagascar 05/2022 Partie B Q1.b';

-- =============================================================================
-- 3. Centrale solaire — Bac Centres étrangers 06/2021 Partie A Q1.c
-- =============================================================================
-- Script module-level — `print(n)` removed entirely. The exercise is now
-- byte-identical to the original Bac script (no validation boilerplate).

UPDATE python_exercises
SET
    starter_code = 'u = 10560' || E'\n' ||
        'n = 0' || E'\n' ||
        'while False:    # à compléter (condition sur u et 12000)' || E'\n' ||
        '    u = ...     # à compléter (relation de récurrence)' || E'\n' ||
        '    n = ...     # à compléter' || E'\n',
    solution_code = 'u = 10560' || E'\n' ||
        'n = 0' || E'\n' ||
        'while u <= 12000:' || E'\n' ||
        '    u = 0.98 * u + 250' || E'\n' ||
        '    n = n + 1' || E'\n',
    instructions = '# Énoncé' || E'\n\n' ||
        'Au 1ᵉʳ janvier 2020, la centrale solaire de Big Sun possède 10 560 panneaux. Chaque année, **2 % des panneaux sont retirés** (détérioration) et **250 nouveaux panneaux sont installés**.' || E'\n\n' ||
        'On modélise le nombre de panneaux par la suite' || E'\n\n' ||
        '$$u_0 = 10\,560, \quad u_{n+1} = 0{,}98 \, u_n + 250.$$' || E'\n\n' ||
        'On démontre que $(u_n)$ est croissante, majorée par 12 500, et converge vers 12 500.' || E'\n\n' ||
        '## Travail demandé' || E'\n\n' ||
        'Compléter le script Python ci-dessous pour qu''il stocke dans la variable `n` le **nombre d''années** au bout duquel le nombre de panneaux dépasse strictement 12 000.' || E'\n\n' ||
        'Trois lignes sont à compléter :' || E'\n\n' ||
        '- la **condition** de la boucle `while`' || E'\n' ||
        '- la **mise à jour** de `u` (relation de récurrence)' || E'\n' ||
        '- la **mise à jour** de `n`',
    validation_config = '{
        "ast_requirements": [
            {
                "type": "uses_loop",
                "message": "Tu dois utiliser une boucle while."
            }
        ],
        "behavior": {
            "kind": "variable_check",
            "expected_vars": {
                "n": 68
            }
        }
    }'::jsonb
WHERE source = 'Bac Centres étrangers 06/2021 Partie A Q1.c';
