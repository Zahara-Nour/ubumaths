-- Migration: Seed "terme(n) — suite homographique" exercise from Bac Nouvelle Calédonie August 2023 (sujet 2)
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 2 from the Bac Nouvelle
-- Calédonie August 2023 paper (sujet 2). La suite u_0 = 0,
-- u_{n+1} = (-u_n - 4) / (u_n + 3) converge vers -2. terme(n) renvoie u_n.
--
-- Strategy: V2 with ast_requirements (defines_function 'terme' + uses_loop)
-- + behavior.unit_test. Le calcul utilise des additions, soustractions et
-- divisions IEEE 754 correctement arrondies → floats bit-identiques
-- Pyodide vs node, strict equality safe sur les valeurs RÉCURRENTES (à
-- ne pas confondre avec la forme close u_n = 1/(n+0.5) - 2 qui peut
-- différer de 1 ULP des valeurs récurrentes — on attend ce que le student
-- calcule, pas la forme close).

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
        'Suite définie par récurrence $u_{n+1} = \frac{-u_n - 4}{u_n + 3}$ avec $u_0 = 0$ (Bac Nouvelle Calédonie 08/2023 sujet 2).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 0, \quad u_{n+1} = \dfrac{-u_n - 4}{u_n + 3}.$$' || E'\n\n' ||
            'On démontre dans l''exercice que $(u_n)$ est décroissante, minorée par $-2$, et converge vers $\ell = -2$.' || E'\n\n' ||
            'On a $u_1 = -\dfrac{4}{3}$ et $u_2 = -\dfrac{8}{5}$ (à vérifier en exécutant ta fonction).' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `terme(n)` ci-dessous pour qu''elle renvoie la valeur de $u_n$.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `u` (= $u_0$)' || E'\n' ||
            '- la **mise à jour** de `u` dans la boucle (relation de récurrence)' || E'\n\n' ||
            '*Rappel : `for i in range(n)` parcourt $0, 1, \ldots, n-1$ — donc le corps de la boucle est exécuté exactement $n$ fois.*',
        'def terme(n):' || E'\n' ||
            '    u = ...    # à compléter (valeur initiale u_0)' || E'\n' ||
            '    for i in range(n):' || E'\n' ||
            '        u = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '    return u' || E'\n',
        'def terme(n):' || E'\n' ||
            '    u = 0' || E'\n' ||
            '    for i in range(n):' || E'\n' ||
            '        u = (-u - 4) / (u + 3)' || E'\n' ||
            '    return u' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "terme",
                    "message": "Tu dois définir la fonction terme(n)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle (for ou while)."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "terme",
                "test_cases": [
                    {"args": [0], "expected": 0},
                    {"args": [1], "expected": -1.3333333333333333},
                    {"args": [2], "expected": -1.6},
                    {"args": [3], "expected": -1.7142857142857144},
                    {"args": [5], "expected": -1.8181818181818183},
                    {"args": [10], "expected": -1.9047619047619049}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Nouvelle Calédonie 08/2023 sujet 2 Q2',
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
