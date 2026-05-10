-- Migration: Seed "Seuil 10^7 sur u_{n+1} = 5u_n - 4n - 3" exercise from Bac Nouvelle Calédonie August 2023
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 4 from the Bac Nouvelle
-- Calédonie August 2023 paper. La suite u_0 = 3, u_{n+1} = 5 u_n - 4n - 3
-- a pour forme close u_n = 2·5^n + n + 1 (croissante, divergente vers
-- +∞). suite() renvoie le plus petit n tel que u_n >= 10^7. Réponse : 10.
--
-- Strategy: V2 with ast_requirements (defines_function 'suite' + uses_loop)
-- + behavior.unit_test. Le calcul utilise uniquement de l'arithmétique
-- entière (mult/sub) bien dans la plage safe-int des doubles IEEE 754
-- (max u_10 ≈ 1.95e7 < 2^53), strict equality sur l'entier de retour
-- est trivialement safe.
--
-- AST defends against hardcoded `return 10`. La fonction étant sans
-- paramètre, single test case (suite()=10) est le seul test possible.
-- Closed form u_n = 2·5^n + n + 1 vérifiée par node pour n=0..10.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Seuil 10⁷ — suite 5u − 4n − 3',
        'Algorithme de seuil sur la suite divergente $u_{n+1} = 5 u_n - 4n - 3$ avec $u_0 = 3$ (Bac Nouvelle Calédonie 08/2023).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 3, \quad u_{n+1} = 5 u_n - 4n - 3.$$' || E'\n\n' ||
            'On démontre dans l''exercice que' || E'\n\n' ||
            '$$u_n = 2 \cdot 5^n + n + 1$$' || E'\n\n' ||
            'donc $(u_n)$ est strictement croissante et tend vers $+\infty$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `suite()` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** tel que $u_n \ge 10^7$.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence — attention : à l''instant où on met à jour, `n` désigne encore l''indice du terme **précédent**)' || E'\n\n' ||
            '*Indication : `10**7` représente $10^7$ en Python.*',
        'def suite():' || E'\n' ||
            '    u = 3' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while False:    # à compléter (condition sur u et 10**7)' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        'def suite():' || E'\n' ||
            '    u = 3' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while u < 10 ** 7:' || E'\n' ||
            '        u = 5 * u - 4 * n - 3' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "suite",
                    "message": "Tu dois définir la fonction suite()."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "suite",
                "test_cases": [
                    {"args": [], "expected": 10}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Nouvelle Calédonie 08/2023 Q4',
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
