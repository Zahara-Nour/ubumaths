-- Migration: Seed "suite(n) — bactérie" exercise from Bac Asie May 2022 (sujet 2)
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 4 from the Bac Asie May
-- 2022 paper (sujet 2). Modélisation de la descendance d'une bactérie :
-- p_n = probabilité d'au plus n descendances.
-- p_0 = 0.3, p_{n+1} = 0.3 + 0.7 p_n². Converge vers L = 3/7 ≈ 0.4286.
-- suite(n) renvoie les n premiers termes [p_0, p_1, ..., p_{n-1}]
-- (longueur n).
--
-- Strategy: V2 with ast_requirements (defines_function 'suite'
-- + uses_loop) + behavior.unit_test. Pure IEEE 754 mult/add → bit-
-- identical Pyodide vs node, strict equality safe sur les listes.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Bactérie — liste des n premiers termes',
        'Modélisation de la descendance d''une bactérie via la suite $p_{n+1} = 0{,}3 + 0{,}7 p_n^2$ avec $p_0 = 0{,}3$ (Bac Asie 05/2022 sujet 2).',
        '# Énoncé' || E'\n\n' ||
            'Une bactérie a une probabilité $0{,}3$ de mourir sans descendance et $0{,}7$ de se diviser en deux bactéries filles. On note $p_n$ la probabilité d''obtenir **au plus $n$ descendances** à partir d''une bactérie.' || E'\n\n' ||
            'On admet que' || E'\n\n' ||
            '$$p_0 = 0{,}3, \quad p_{n+1} = 0{,}3 + 0{,}7 \, p_n^2.$$' || E'\n\n' ||
            'On démontre que $(p_n)$ est croissante, majorée par $0{,}5$, et converge vers $L = \dfrac{3}{7} \approx 0{,}4286$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `suite(n)` ci-dessous pour qu''elle renvoie la liste des **$n$ premiers termes** $[p_0, p_1, \ldots, p_{n-1}]$ (longueur $n$).' || E'\n\n' ||
            'Trois endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `p` (= $p_0$)' || E'\n' ||
            '- l''**argument** de `range` (pour obtenir $n$ éléments au total — le 1ᵉʳ est déjà dans `s = [p]`)' || E'\n' ||
            '- la **mise à jour** de `p` (relation de récurrence)',
        'def suite(n):' || E'\n' ||
            '    p = ...    # à compléter (valeur initiale p_0)' || E'\n' ||
            '    s = [p]' || E'\n' ||
            '    for i in range(...):    # à compléter' || E'\n' ||
            '        p = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '        s.append(p)' || E'\n' ||
            '    return s' || E'\n',
        'def suite(n):' || E'\n' ||
            '    p = 0.3' || E'\n' ||
            '    s = [p]' || E'\n' ||
            '    for i in range(n - 1):' || E'\n' ||
            '        p = 0.3 + 0.7 * p ** 2' || E'\n' ||
            '        s.append(p)' || E'\n' ||
            '    return s' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "suite",
                    "message": "Tu dois définir la fonction suite(n)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle for."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "suite",
                "test_cases": [
                    {"args": [1], "expected": [0.3]},
                    {"args": [2], "expected": [0.3, 0.363]},
                    {"args": [3], "expected": [0.3, 0.363, 0.3922383]},
                    {"args": [5], "expected": [0.3, 0.363, 0.3922383, 0.407695618790823, 0.41635100230686245]},
                    {"args": [10], "expected": [0.3, 0.363, 0.3922383, 0.407695618790823, 0.41635100230686245, 0.42134370998535026, 0.4242713653609532, 0.42600433402567317, 0.4270357848260601, 0.42765169306540635]}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Asie 05/2022 sujet 2 Q4',
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
