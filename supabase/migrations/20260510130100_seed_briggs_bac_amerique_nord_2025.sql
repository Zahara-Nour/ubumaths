-- Migration: Seed "Algorithme de Briggs" exercise from Bac Amérique du Nord May 2025
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question (Partie B Q3) of the Bac
-- Amérique du Nord May 2025 paper. Briggs' method to approximate ln(a):
-- repeatedly take sqrt until a < 1.01, then return 2^n * (a - 1) where n
-- is the number of iterations.
--
-- Uses the orthogonal validation V2: ast_requirements (defines_function +
-- uses_loop) AS A PRE-CHECK against shortcut solutions like
-- `def Briggs(a): return math.log(a)`, then unit_test behavior with three
-- test cases. The expected floats were computed via IEEE 754 sqrt
-- (correctly rounded per spec) and will match Pyodide bit-for-bit.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Algorithme de Briggs — approximation de ln(a)',
        'Méthode historique d''Henry Briggs (XVIe siècle) pour approcher ln(a) via des racines carrées itérées (Bac Amérique du Nord 05/2025).',
        '# Énoncé' || E'\n\n' ||
            'On se propose d''approcher $\ln(a)$ pour $a > 1$ avec une méthode du mathématicien anglais **Henry Briggs** (XVIᵉ siècle).' || E'\n\n' ||
            '## Principe' || E'\n\n' ||
            'Soit la suite $(u_n)$ définie par $u_0 = a$ et $u_{n+1} = \sqrt{u_n}$. Cette suite tend vers $1$.' || E'\n\n' ||
            'On admet que pour $x$ proche de $1$, $\ln(x) \approx x - 1$ (la tangente en $x=1$ à la courbe du logarithme).' || E'\n\n' ||
            'En itérant la racine carrée jusqu''à ce que $u_n < 1{,}01$, on obtient :' || E'\n\n' ||
            '$$\ln(a) = 2^n \, \ln(u_n) \approx 2^n \, (u_n - 1).$$' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `Briggs(a)` ci-dessous pour qu''elle renvoie une approximation de $\ln(a)$ en utilisant cette méthode.' || E'\n\n' ||
            'Une seule ligne est à compléter : la valeur de `L` à la sortie de la boucle.' || E'\n\n' ||
            '*Rappel : `sqrt(a)` correspond à $\sqrt{a}$ (importé depuis le module `math`).*' || E'\n\n' ||
            '## Précision attendue' || E'\n\n' ||
            '- `Briggs(2)` ≈ `0.695` (à comparer à $\ln(2) \approx 0{,}6931$)' || E'\n' ||
            '- `Briggs(10)` ≈ `2.313` (à comparer à $\ln(10) \approx 2{,}3026$)',
        'from math import *' || E'\n\n' ||
            'def Briggs(a):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while a >= 1.01:' || E'\n' ||
            '        a = sqrt(a)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    L = ...    # à compléter' || E'\n' ||
            '    return L' || E'\n',
        'from math import *' || E'\n\n' ||
            'def Briggs(a):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while a >= 1.01:' || E'\n' ||
            '        a = sqrt(a)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    L = 2 ** n * (a - 1)' || E'\n' ||
            '    return L' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "Briggs",
                    "message": "Tu dois définir la fonction Briggs(a)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while (pas de raccourci via math.log)."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "Briggs",
                "test_cases": [
                    {"args": [2], "expected": 0.695027342438749},
                    {"args": [10], "expected": 2.312971479410578},
                    {"args": [100], "expected": 4.625942958821156}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Amérique du Nord 05/2025 Q3',
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
