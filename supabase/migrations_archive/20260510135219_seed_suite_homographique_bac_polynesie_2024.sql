-- Migration: Seed "Suite homographique 4/(5-u)" exercise from Bac Polynésie June 2024
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 1 (Partie A) from the Bac
-- Polynésie June 2024 paper. The recurrence
--   u_0 = 3,  u_{n+1} = 4 / (5 - u_n)
-- converges to 1; suite(n) returns u_n. The official Bac displays the
-- exact reference values for suite(2), suite(5), suite(10), suite(20)
-- which we replicate as test cases below.
--
-- Strategy: V2 with ast_requirements (defines_function 'suite' + uses_loop)
-- + behavior.kind='unit_test'. Strict float equality is safe here: the
-- recurrence only uses IEEE 754 mult/div which are mandated correctly-
-- rounded — Pyodide and node produce bit-identical floats.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Suite homographique — calcul du n-ième terme',
        'Suite définie par récurrence $u_{n+1} = \frac{4}{5 - u_n}$ avec $u_0 = 3$ (Bac Polynésie 06/2024).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 3, \quad u_{n+1} = \dfrac{4}{5 - u_n}.$$' || E'\n\n' ||
            'On admet que cette suite converge vers $\ell = 1$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `suite(n)` ci-dessous pour qu''elle prenne en paramètre le rang $n$ et renvoie la valeur du terme $u_n$.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `u`' || E'\n' ||
            '- la **mise à jour** de `u` dans la boucle (relation de récurrence)' || E'\n\n' ||
            '## Valeurs de référence' || E'\n\n' ||
            '- `suite(2)` doit renvoyer `1.3333333333333333`' || E'\n' ||
            '- `suite(5)` doit renvoyer `1.0058479532163742`' || E'\n' ||
            '- `suite(10)` doit renvoyer `1.0000057220349845`',
        'def suite(n):' || E'\n' ||
            '    u = ...    # à compléter (valeur initiale u_0)' || E'\n' ||
            '    for i in range(n):' || E'\n' ||
            '        ...    # à compléter (relation de récurrence)' || E'\n' ||
            '    return u' || E'\n',
        'def suite(n):' || E'\n' ||
            '    u = 3' || E'\n' ||
            '    for i in range(n):' || E'\n' ||
            '        u = 4 / (5 - u)' || E'\n' ||
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
                    {"args": [0], "expected": 3},
                    {"args": [1], "expected": 2},
                    {"args": [2], "expected": 1.3333333333333333},
                    {"args": [5], "expected": 1.0058479532163742},
                    {"args": [10], "expected": 1.0000057220349845}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Polynésie 06/2024 Partie A Q1',
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
