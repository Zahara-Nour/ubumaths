-- Migration: Seed "Suite u_{n+1} = 5u_n - 8n + 6" exercise from Bac Amérique du Sud September 2023
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 2 from the Bac Amérique du
-- Sud September 2023 paper. La suite u_0 = 0, u_{n+1} = 5 u_n - 8n + 6
-- a pour forme close u_n = 5^n + 2n - 1. suite_u(n) renvoie u_n.
--
-- Strategy: V2 with ast_requirements (defines_function 'suite_u' + uses_loop)
-- + behavior.unit_test. Recurrence uses only integer arithmetic — strict
-- equality on integer return values, no float drift to worry about.
--
-- Le Bac utilise `range(1, n+1)` avec `8*(i-1)` (compteur 1..n). On
-- conserve cette forme — il faudrait sinon réécrire le starter en
-- `range(0, n)` avec `8*i` (variante mentionnée par la correction).

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Suite arithmétique récurrente — calcul du n-ième terme',
        'Suite définie par récurrence $u_{n+1} = 5 u_n - 8n + 6$ avec $u_0 = 0$ (Bac Amérique du Sud 09/2023).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 0, \quad u_{n+1} = 5 u_n - 8n + 6.$$' || E'\n\n' ||
            'On vérifie facilement que $u_1 = 6$, $u_2 = 28$, et plus généralement $u_n = 5^n + 2n - 1$ (à démontrer dans l''exercice).' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `suite_u(n)` ci-dessous pour qu''elle renvoie la valeur de $u_n$.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `u` (terme $u_0$)' || E'\n' ||
            '- la **mise à jour** de `u` dans la boucle (relation de récurrence)' || E'\n\n' ||
            '*La boucle utilise `range(1, n+1)` : la variable `i` parcourt $1, 2, \ldots, n$. Quand on calcule $u_i$ à partir de $u_{i-1}$, l''entier $n$ de la formule devient $i-1$.*',
        'def suite_u(n):' || E'\n' ||
            '    u = ...    # à compléter (valeur initiale u_0)' || E'\n' ||
            '    for i in range(1, n + 1):' || E'\n' ||
            '        u = ...    # à compléter (relation de récurrence : utiliser i-1 pour l''indice n de la formule)' || E'\n' ||
            '    return u' || E'\n',
        'def suite_u(n):' || E'\n' ||
            '    u = 0' || E'\n' ||
            '    for i in range(1, n + 1):' || E'\n' ||
            '        u = 5 * u - 8 * (i - 1) + 6' || E'\n' ||
            '    return u' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "suite_u",
                    "message": "Tu dois définir la fonction suite_u(n)."
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
                    {"args": [0], "expected": 0},
                    {"args": [1], "expected": 6},
                    {"args": [2], "expected": 28},
                    {"args": [5], "expected": 3134},
                    {"args": [10], "expected": 9765644}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Amérique du Sud 09/2023 Q2',
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
