-- Migration: Seed "Seuil — suite g(x) = 2x - x²" exercise from Bac Amérique du Nord May 2024 (sujet 2)
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 9 from the Bac Amérique du
-- Nord May 2024 paper (sujet 2). La suite u_{n+1} = g(u_n) = 2 u_n - u_n²
-- avec u_0 = 0.5 converge vers 1. seuil() renvoie le plus petit n tel
-- que u_n >= 0.95.
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.unit_test. Pure IEEE 754 arithmetic (mult/sub/compare) →
-- bit-identical floats Pyodide vs node, strict equality safe.
--
-- AST defends against hardcoded `return 3`. Single test case (the function
-- is no-arg).

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Seuil — suite quadratique 2u − u²',
        'Algorithme de seuil sur la suite $u_{n+1} = 2 u_n - u_n^2$ avec $u_0 = 0{,}5$ (Bac Amérique du Nord 05/2024 sujet 2).',
        '# Énoncé' || E'\n\n' ||
            'On considère la fonction $g$ définie sur $[0~;~1]$ par $g(x) = 2x - x^2$, et la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = \dfrac{1}{2}, \quad u_{n+1} = g(u_n) = 2 u_n - u_n^2.$$' || E'\n\n' ||
            'On admet que $(u_n)$ est croissante, majorée par 1, et converge vers $\ell = 1$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil()` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** à partir duquel $u_n \ge 0{,}95$.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la mise à jour de `n`' || E'\n' ||
            '- la mise à jour de `u` (relation de récurrence)' || E'\n\n' ||
            '*La condition `while u < 0.95` est déjà donnée — c''est la condition d''arrêt naturelle pour cet algorithme de seuil.*',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 0.5' || E'\n' ||
            '    while u < 0.95:' || E'\n' ||
            '        n = ...    # à compléter' || E'\n' ||
            '        u = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '    return n' || E'\n',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 0.5' || E'\n' ||
            '    while u < 0.95:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        u = 2 * u - u ** 2' || E'\n' ||
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
                    {"args": [], "expected": 3}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Amérique du Nord 05/2024 sujet 2 Q9',
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
