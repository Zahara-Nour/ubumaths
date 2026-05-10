-- Migration: Seed "Suite n/e^n" exercise from Bac Métropole September 2023
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 2 from the Bac Métropole
-- September 2023 paper. La suite u_1 = 1/e, u_{n+1} = (1/e)(1 + 1/n) u_n
-- a pour forme close u_n = n/e^n et converge vers 0. suite(n) renvoie u_n.
--
-- Strategy: V2 with ast_requirements (defines_function 'suite' + uses_loop)
-- + behavior.unit_test. Le calcul utilise la constante e (importée), des
-- divisions et multiplications IEEE 754 correctement arrondies → floats
-- bit-identiques Pyodide vs node, strict equality safe.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Suite n/eⁿ — calcul du n-ième terme',
        'Suite définie par récurrence $u_{n+1} = \frac{1}{e}\left(1 + \frac{1}{n}\right) u_n$ avec $u_1 = \frac{1}{e}$ (Bac Métropole 09/2023).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie pour tout entier $n \ge 1$ par' || E'\n\n' ||
            '$$u_1 = \dfrac{1}{e}, \quad u_{n+1} = \dfrac{1}{e}\left(1 + \dfrac{1}{n}\right) u_n.$$' || E'\n\n' ||
            'On démontre que $u_n = \dfrac{n}{e^n}$ et que $(u_n)$ converge vers 0.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `suite(n)` ci-dessous pour qu''elle renvoie la valeur de $u_n$.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `u` (= $u_1$)' || E'\n' ||
            '- la **mise à jour** de `u` dans la boucle (relation de récurrence)' || E'\n\n' ||
            '*Note : la constante $e$ est importée du module `math` ; la boucle `range(1, n)` parcourt $1, 2, \ldots, n-1$.*',
        'from math import e' || E'\n\n' ||
            'def suite(n):' || E'\n' ||
            '    u = ...    # à compléter (valeur initiale u_1)' || E'\n' ||
            '    for i in range(1, n):' || E'\n' ||
            '        u = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '    return u' || E'\n',
        'from math import e' || E'\n\n' ||
            'def suite(n):' || E'\n' ||
            '    u = 1 / e' || E'\n' ||
            '    for i in range(1, n):' || E'\n' ||
            '        u = 1 / e * (1 + 1 / i) * u' || E'\n' ||
            '    return u' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "suite",
                    "message": "Tu dois définir la fonction suite(n)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle (for ou while)."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "suite",
                "test_cases": [
                    {"args": [1], "expected": 0.36787944117144233},
                    {"args": [2], "expected": 0.2706705664732254},
                    {"args": [3], "expected": 0.14936120510359185},
                    {"args": [5], "expected": 0.03368973499542734},
                    {"args": [10], "expected": 0.00045399929762484866}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Métropole 09/2023 Q2',
        first_teacher.id,
        TRUE
    FROM first_teacher
    RETURNING id
)
INSERT INTO python_exercise_tags (exercise_id, tag_id)
SELECT inserted_exercise.id, python_tags.id
FROM inserted_exercise
CROSS JOIN python_tags
WHERE python_tags.name IN ('for', 'suite', 'terminale', 'bac');
