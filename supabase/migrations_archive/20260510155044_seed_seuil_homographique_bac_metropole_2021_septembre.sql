-- Migration: Seed "seuil(E) — homographique 4u/(1+3u)" exercise from Bac Métropole September 2021
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 3 from the Bac Métropole
-- September 2021 paper. La suite u_0 = 0.5, u_{n+1} = 4 u_n / (1 + 3 u_n)
-- est croissante, majorée par 2, et converge vers 1. seuil(E) renvoie
-- le plus petit n tel que 1 - u_n < E (E > 0).
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.unit_test. Pure IEEE 754 mult/add/div → bit-identical
-- Pyodide vs node, strict equality safe.
--
-- AST defends against hardcoded `return 7`. Quatre test cases probent
-- une plage large de E.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Seuil — suite homographique 4u/(1+3u)',
        'Algorithme de seuil sur la suite homographique $u_{n+1} = \frac{4 u_n}{1 + 3 u_n}$ avec $u_0 = 0{,}5$ (Bac Métropole 09/2021).',
        '# Énoncé' || E'\n\n' ||
            'On considère la fonction $f$ définie par $f(x) = \dfrac{4x}{1 + 3x}$, et la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = \dfrac{1}{2}, \quad u_{n+1} = f(u_n) = \dfrac{4 u_n}{1 + 3 u_n}.$$' || E'\n\n' ||
            'On démontre que $(u_n)$ est croissante, majorée par 2, et converge vers $\ell = 1$. La forme close est $u_n = \dfrac{1}{1 + 0{,}25^n}$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil(E)` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** tel que $1 - u_n < E$, où `E` est un réel strictement positif.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while` (rester dans la boucle tant que $1 - u_n \ge E$)' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `seuil(0.0001)` doit renvoyer `7` (réponse de référence du Bac)' || E'\n' ||
            '- `seuil(0.01)` doit renvoyer `4`' || E'\n' ||
            '- `seuil(0.000001)` doit renvoyer `10`',
        'def seuil(E):' || E'\n' ||
            '    u = 0.5' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while False:    # à compléter (condition sur 1 - u et E)' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        'def seuil(E):' || E'\n' ||
            '    u = 0.5' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while 1 - u >= E:' || E'\n' ||
            '        u = 4 * u / (1 + 3 * u)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "seuil",
                    "message": "Tu dois définir la fonction seuil(E)."
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
                    {"args": [0.0001], "expected": 7},
                    {"args": [0.01], "expected": 4},
                    {"args": [0.000001], "expected": 10},
                    {"args": [0.1], "expected": 2}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Métropole 09/2021 Q3',
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
