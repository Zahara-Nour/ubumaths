-- Migration: Seed "Suite d'intégrales I_n" exercise from Bac Amérique du Nord May 2024
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 5 from the Bac Amérique du
-- Nord May 2024 paper. La suite d'intégrales I_n = ∫₀^π e^{-nx} sin(x) dx
-- vérifie I_n = (1 + e^{-nπ}) / (n² + 1) (démontré dans l'exercice).
-- seuil() renvoie le plus petit n tel que I_n < 0.1.
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.unit_test. No-arg function, single test case (seuil()=4).
-- AST defends against hardcoded `return 4`.
--
-- Note: math.exp is not mandated correctly-rounded by IEEE 754 — a 1-ULP
-- drift between Pyodide and node is theoretically possible. Here the
-- closest I_n to the threshold 0.1 is I_3 = 0.10000806... (gap ≈ 8e-6),
-- way larger than any plausible ULP drift. Strict equality on the
-- integer return is safe.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Suite d''intégrales — seuil de 0,1',
        'Algorithme de seuil sur la suite $I_n = \int_0^{\pi} e^{-nx} \sin(x) \, dx$ (Bac Amérique du Nord 05/2024).',
        '# Énoncé' || E'\n\n' ||
            'On considère, pour tout entier naturel $n$, l''intégrale' || E'\n\n' ||
            '$$I_n = \int_0^{\pi} e^{-nx} \sin(x) \, dx.$$' || E'\n\n' ||
            'On a montré dans l''exercice que' || E'\n\n' ||
            '$$I_0 = 2 \quad \text{et, pour tout } n \ge 1, \quad I_n = \dfrac{1 + e^{-n\pi}}{n^2 + 1}.$$' || E'\n\n' ||
            'On a aussi démontré que la suite $(I_n)$ est décroissante et converge vers 0.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la **ligne 5** de la fonction `seuil()` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** à partir duquel $I_n < 0{,}1$.' || E'\n\n' ||
            'Une seule ligne est à compléter : la **condition** de la boucle `while`.' || E'\n\n' ||
            '*Rappel : `from math import *` importe `pi` (valeur de $\pi$) et `exp` (fonction exponentielle).*',
        'from math import *' || E'\n\n' ||
            'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    I = 2' || E'\n' ||
            '    while False:    # à compléter (condition sur I et 0.1)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        I = (1 + exp(-n * pi)) / (n * n + 1)' || E'\n' ||
            '    return n' || E'\n',
        'from math import *' || E'\n\n' ||
            'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    I = 2' || E'\n' ||
            '    while I >= 0.1:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        I = (1 + exp(-n * pi)) / (n * n + 1)' || E'\n' ||
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
        'Bac Amérique du Nord 05/2024 Q5',
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
