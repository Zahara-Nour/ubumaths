-- Migration: Seed "Seuil — suite divergente 3u²/4 - 2u + 3" exercise from Bac Polynésie September 2023
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 5 from the Bac Polynésie
-- September 2023 paper. Avec u_0 = 3 (cas où la suite diverge), seuil()
-- renvoie le plus petit n tel que u_n >= 100. Réponse : 4
-- (u_3 ≈ 18.33 < 100, u_4 ≈ 218.33 > 100).
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.unit_test. Pure IEEE 754 arithmetic, strict equality safe.
-- AST defends against hardcoded `return 4`.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Seuil — suite divergente 3u²/4 − 2u + 3',
        'Algorithme de seuil sur la suite $u_{n+1} = \frac{3}{4} u_n^2 - 2 u_n + 3$ avec $u_0 = 3$ (Bac Polynésie 09/2023).',
        '# Énoncé' || E'\n\n' ||
            'On considère la fonction $f$ définie sur $\R$ par $f(x) = \dfrac{3}{4} x^2 - 2x + 3$, et la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 3, \quad u_{n+1} = f(u_n) = \dfrac{3}{4} u_n^2 - 2 u_n + 3.$$' || E'\n\n' ||
            'On admet que dans ce cas (où $u_0 > 2$) la suite $(u_n)$ **tend vers $+\infty$**.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil()` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** tel que $u_n \ge 100$.' || E'\n\n' ||
            'Trois endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n' ||
            '- la **mise à jour** de `n`',
        'def seuil():' || E'\n' ||
            '    u = 3' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while False:    # à compléter (condition sur u et 100)' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '        n = ...     # à compléter' || E'\n' ||
            '    return n' || E'\n',
        'def seuil():' || E'\n' ||
            '    u = 3' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while u < 100:' || E'\n' ||
            '        u = 3 * u * u / 4 - 2 * u + 3' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
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
                "kind": "unit_test",
                "function_name": "seuil",
                "test_cases": [
                    {"args": [], "expected": 4}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Polynésie 09/2023 Q5',
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
