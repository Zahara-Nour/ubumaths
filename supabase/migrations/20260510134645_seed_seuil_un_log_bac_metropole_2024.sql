-- Migration: Seed "Seuil — suite u_{n+1} = u_n - ln(u_n²+1)" exercise from Bac Métropole June 2024
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 5.a from the Bac Métropole
-- June 2024 paper (sujet 1, dévoilé). The recurrence
--   u_0 = 7,  u_{n+1} = u_n - ln(u_n² + 1)
-- decreases monotonically towards 0; seuil(h) returns the smallest n such
-- that u_n ≤ h.
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.kind='unit_test'. The function takes a parameter h and returns
-- an integer, so unit_test with strict equality is the natural fit. Three
-- test cases (besides the Bac's seuil(0.01)=97) probe a wide range of h
-- to defeat hardcoded `return 97`.
--
-- Risk note: math.log is not mandated correctly-rounded by IEEE 754 — a
-- 1-ULP drift between Pyodide and node is theoretically possible. In
-- practice the cumulative drift over 994 iterations is ~1e-15, well below
-- the smallest gap between u_n and any threshold tested. If a test fails
-- in production, switch this exo to ast+output with numeric comparison.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Seuil — suite avec ln(u²+1)',
        'Algorithme de seuil sur la suite $u_{n+1} = u_n - \ln(u_n^2 + 1)$ qui converge vers 0 (Bac Métropole 06/2024).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 7, \quad u_{n+1} = u_n - \ln(u_n^2 + 1).$$' || E'\n\n' ||
            'On admet que $(u_n)$ est positive, décroissante, et converge vers $\ell = 0$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil(h)` ci-dessous pour qu''elle renvoie la **plus petite valeur de $n$** telle que $u_n \le h$, où `h` est un réel strictement positif.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `seuil(0.01)` doit renvoyer `97` (réponse de référence du Bac)' || E'\n' ||
            '- `seuil(0.1)` doit renvoyer `9`' || E'\n' ||
            '- `seuil(0.001)` doit renvoyer `994`' || E'\n\n' ||
            '*Rappel : `ln(x)` est le logarithme népérien, importé depuis le module `math`.*',
        'from math import log as ln' || E'\n\n' ||
            'def seuil(h):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 7' || E'\n' ||
            '    while False:    # à compléter (condition sur u et h)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '    return n' || E'\n',
        'from math import log as ln' || E'\n\n' ||
            'def seuil(h):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 7' || E'\n' ||
            '    while u > h:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        u = u - ln(u ** 2 + 1)' || E'\n' ||
            '    return n' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "seuil",
                    "message": "Tu dois définir la fonction seuil(h)."
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
                    {"args": [0.01], "expected": 97},
                    {"args": [0.1], "expected": 9},
                    {"args": [1], "expected": 2},
                    {"args": [0.001], "expected": 994}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Métropole 06/2024 Q5.a',
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
