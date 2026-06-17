-- Migration: Seed "Seuil — probabilité de gagner" exercise from Bac Asie June 2024
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 9 from the Bac Asie June 2024
-- paper. Léa joue à un jeu vidéo : la probabilité g_n de gagner la n-ième
-- partie suit la récurrence g_{n+1} = 0.5 * g_n + 0.2 avec g_1 = 0.5,
-- converge vers 0.4. seuil(e) renvoie le plus petit rang n à partir
-- duquel g_n ≤ 0.4 + e.
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.unit_test. Pure IEEE 754 arithmetic (mult/add/compare) →
-- bit-identical floats Pyodide vs node, strict equality safe. Five test
-- cases probe a wide range of e to defeat hardcoded `return 8`.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Seuil — probabilité de gagner',
        'Algorithme de seuil sur la suite arithmético-géométrique $g_{n+1} = 0{,}5 g_n + 0{,}2$ modélisant la probabilité de gagner au jeu vidéo (Bac Asie 06/2024).',
        '# Énoncé' || E'\n\n' ||
            'Léa joue à un jeu vidéo. On note $g_n$ la probabilité qu''elle gagne la $n$-ième partie de la journée. On admet (cf. arbre de probabilités) que' || E'\n\n' ||
            '$$g_1 = 0{,}5, \quad g_{n+1} = 0{,}5 \, g_n + 0{,}2.$$' || E'\n\n' ||
            'Cette suite converge vers $\ell = 0{,}4$ : sur le long terme, Léa gagnera environ 40 % de ses parties.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil(e)` ci-dessous pour qu''elle renvoie **le plus petit rang $n$** à partir duquel $g_n \le 0{,}4 + e$, où `e` est un réel strictement positif.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `n`' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `seuil(0.001)` doit renvoyer `8` (réponse de référence du Bac)' || E'\n' ||
            '- `seuil(0.01)` doit renvoyer `5`' || E'\n' ||
            '- `seuil(0.0001)` doit renvoyer `11`',
        'def seuil(e):' || E'\n' ||
            '    g = 0.5' || E'\n' ||
            '    n = 1' || E'\n' ||
            '    while False:    # à compléter (condition sur g et 0.4 + e)' || E'\n' ||
            '        g = 0.5 * g + 0.2' || E'\n' ||
            '        n = ...     # à compléter' || E'\n' ||
            '    return n' || E'\n',
        'def seuil(e):' || E'\n' ||
            '    g = 0.5' || E'\n' ||
            '    n = 1' || E'\n' ||
            '    while g > 0.4 + e:' || E'\n' ||
            '        g = 0.5 * g + 0.2' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "seuil",
                    "message": "Tu dois définir la fonction seuil(e)."
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
                    {"args": [0.001], "expected": 8},
                    {"args": [0.01], "expected": 5},
                    {"args": [0.05], "expected": 2},
                    {"args": [0.0001], "expected": 11},
                    {"args": [0.1], "expected": 1}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Asie 06/2024 Q9',
        first_teacher.id,
        TRUE
    FROM first_teacher
    RETURNING id
)
INSERT INTO python_exercise_tags (exercise_id, tag_id)
SELECT inserted_exercise.id, python_tags.id
FROM inserted_exercise
CROSS JOIN python_tags
WHERE python_tags.name IN ('while', 'suite', 'terminale', 'bac');
