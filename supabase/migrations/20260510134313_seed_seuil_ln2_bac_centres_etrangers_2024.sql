-- Migration: Seed "Approximation de ln(2)" exercise from Bac Centres étrangers June 2024
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 4.b from the Bac Centres
-- étrangers June 2024 paper. The recurrence u_{n+1} = 2*u_n*exp(-u_n)
-- converges to ln(2). The function seuil() iterates until the difference
-- ln(2) - u falls below 1e-4 and returns the tuple (u, n) — the Bac form
-- explicitly uses a tuple, so we preserve it.
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.kind='output'. We use 'output' rather than 'unit_test' because
-- Python tuples don't survive the JS↔Python conversion as-is: a JSON array
-- in `expected` becomes a Python list, and `(u, n) == [u, n]` is False in
-- Python. Printing the tuple and using a numeric comparator with
-- non_numeric='ignore' lets us tokenize past the parens/comma/whitespace
-- and compare the two numbers with tolerance.
--
-- The eps_abs/eps_rel tolerances absorb both:
--   - the natural precision of the algorithm (1e-4 by construction)
--   - any ULP-level drift between Pyodide and node (Math.exp is not
--     mandated correctly-rounded by IEEE 754 — implementations may differ
--     by a few ULPs).
--
-- Starter uses `while False` as a runtime-safe placeholder so the unfilled
-- script outputs (0.1, 0) instead of crashing on `while ln(2) - u ...`.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Approximation de ln(2)',
        'Algorithme de seuil sur la suite $u_{n+1} = 2 u_n e^{-u_n}$ qui converge vers $\ln(2)$ (Bac Centres étrangers 06/2024).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par $u_0 = 0{,}1$ et' || E'\n\n' ||
            '$$u_{n+1} = f(u_n) \quad \text{où} \quad f(x) = 2x \, e^{-x}.$$' || E'\n\n' ||
            'On admet que $(u_n)$ est croissante et converge vers $\ln(2)$. Pour tout entier naturel $n$, $\ln(2) - u_n \ge 0$ — donc $u_n$ est une valeur approchée par défaut de $\ln(2)$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil()` ci-dessous pour qu''elle renvoie un couple `(u, n)` où :' || E'\n\n' ||
            '- `u` est une valeur approchée de $\ln(2)$ par défaut **à $10^{-4}$ près** ;' || E'\n' ||
            '- `n` est le nombre d''itérations effectuées pour atteindre cette précision.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n\n' ||
            '*Rappels : `exp(x)` correspond à $e^x$ et `ln(x)` au logarithme népérien — tous deux importés depuis le module `math`.*',
        'from math import exp, log as ln' || E'\n\n' ||
            'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 0.1' || E'\n' ||
            '    while False:    # à compléter (condition sur ln(2) - u et 0.0001)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '    return (u, n)' || E'\n\n' ||
            '# Ne pas modifier — ligne utilisée par la validation' || E'\n' ||
            'print(seuil())' || E'\n',
        'from math import exp, log as ln' || E'\n\n' ||
            'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 0.1' || E'\n' ||
            '    while ln(2) - u > 0.0001:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        u = 2 * u * exp(-u)' || E'\n' ||
            '    return (u, n)' || E'\n\n' ||
            'print(seuil())' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "seuil",
                    "message": "Tu dois définir la fonction seuil()."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while."
                }
            ],
            "behavior": {
                "kind": "output",
                "test_cases": [
                    {"input": "", "expected_output": "(0.6931009075876846, 11)\n"}
                ],
                "comparison": {
                    "kind": "numeric",
                    "shape": "flat",
                    "eps_abs": 0.001,
                    "eps_rel": 0.001,
                    "non_numeric": "ignore"
                }
            }
        }'::jsonb,
        'lycee',
        'Bac Centres étrangers 06/2024 Q4.b',
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
