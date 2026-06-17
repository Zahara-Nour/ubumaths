-- Migration: Seed "suite_u(p) — récurrence quadratique" exercise from Bac Amérique du Sud September 2022
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 1.b from the Bac Amérique
-- du Sud September 2022 paper. La suite u_0 = 4, u_{n+1} = (1/5) u_n²
-- est décroissante, minorée par 0, et converge vers 0. suite_u(p) renvoie
-- u_p.
--
-- Strategy: V2 with ast_requirements (defines_function 'suite_u' + uses_loop)
-- + behavior.unit_test. Pure IEEE 754 mult/div — bit-identical Pyodide
-- vs node, strict equality safe. Six test cases probing wide range
-- (u_0=4 down to u_10 ≈ 2.9e-99 — quadratic decay is fast).
--
-- Trois placeholders : u initial, borne sup de range, mise à jour de u.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Suite quadratique u²/5 — calcul du p-ième terme',
        'Suite définie par récurrence $u_{n+1} = \frac{1}{5} u_n^2$ avec $u_0 = 4$ (Bac Amérique du Sud 09/2022).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 4, \quad u_{n+1} = \dfrac{1}{5} u_n^2.$$' || E'\n\n' ||
            'On démontre dans l''exercice que cette suite est décroissante, minorée par 0, et converge vers 0.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `suite_u(p)` ci-dessous pour qu''elle renvoie la valeur de $u_p$.' || E'\n\n' ||
            'Trois endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `u` (= $u_0$)' || E'\n' ||
            '- la **borne supérieure** de `range` (la boucle doit s''exécuter $p$ fois)' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n\n' ||
            '## Valeurs de référence' || E'\n\n' ||
            '- `suite_u(0)` doit renvoyer `4`' || E'\n' ||
            '- `suite_u(1)` doit renvoyer `3.2` (= 16/5)' || E'\n' ||
            '- `suite_u(2)` doit renvoyer environ `2.048` (= 256/125)',
        'def suite_u(p):' || E'\n' ||
            '    u = ...    # à compléter (valeur initiale u_0)' || E'\n' ||
            '    for i in range(1, ...):    # à compléter (borne supérieure)' || E'\n' ||
            '        u = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '    return u' || E'\n',
        'def suite_u(p):' || E'\n' ||
            '    u = 4' || E'\n' ||
            '    for i in range(1, p + 1):' || E'\n' ||
            '        u = u * u / 5' || E'\n' ||
            '    return u' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "suite_u",
                    "message": "Tu dois définir la fonction suite_u(p)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle (for ou while)."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "suite_u",
                "test_cases": [
                    {"args": [0], "expected": 4},
                    {"args": [1], "expected": 3.2},
                    {"args": [2], "expected": 2.0480000000000005},
                    {"args": [3], "expected": 0.8388608000000003},
                    {"args": [5], "expected": 0.003961408125713222},
                    {"args": [10], "expected": 2.904802997685112e-99}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Amérique du Sud 09/2022 Q1.b',
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
