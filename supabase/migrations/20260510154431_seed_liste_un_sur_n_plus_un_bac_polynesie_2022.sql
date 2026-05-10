-- Migration: Seed "liste(k) — suite 1/(n+1)" exercise from Bac Polynésie May 2022
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 1.b from the Bac Polynésie
-- May 2022 paper. La suite u_0 = 1, u_{n+1} = u_n / (1 + u_n) a pour
-- forme close u_n = 1/(n+1). liste(k) renvoie [u_0, u_1, ..., u_k]
-- (longueur k+1).
--
-- Strategy: V2 with ast_requirements (defines_function 'liste'
-- + uses_loop) + behavior.unit_test. Pure IEEE 754 mult/add/div →
-- bit-identical Pyodide vs node, strict equality safe sur la version
-- récurrente.
--
-- Pédagogie : la forme close u_n = 1/(n+1) (conjecture du sujet) diverge
-- de la version récurrente par 1-3 ULP à partir de n=5 (chemins d'arrondi
-- différents). La validation accepte UNIQUEMENT la version récurrente
-- `u = u / (1 + u)` qui correspond à ce que demande la ligne 6 du Bac.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Suite 1/(n+1) — liste des termes',
        'Liste des termes de la suite $u_{n+1} = \frac{u_n}{1 + u_n}$ avec $u_0 = 1$ (Bac Polynésie 05/2022).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par' || E'\n\n' ||
            '$$u_0 = 1, \quad u_{n+1} = \dfrac{u_n}{1 + u_n}.$$' || E'\n\n' ||
            'On démontre que $(u_n)$ est strictement positive, décroissante, et converge vers 0. La forme close (à conjecturer puis démontrer dans l''exercice) est $u_n = \dfrac{1}{n+1}$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `liste(k)` ci-dessous pour qu''elle renvoie la liste $[u_0, u_1, \ldots, u_k]$ (de longueur $k+1$).' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `u`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence — ligne 6)' || E'\n\n' ||
            '*Utilise la **forme récurrente** : `u = u / (1 + u)`. La forme close $u_n = 1/(n+1)$ peut diverger de la forme récurrente par 1-3 bits (ULP) à cause des arrondis IEEE 754 — préfère la forme récurrente pour cette validation.*',
        'def liste(k):' || E'\n' ||
            '    L = []' || E'\n' ||
            '    u = ...    # à compléter (valeur initiale u_0)' || E'\n' ||
            '    for i in range(0, k + 1):' || E'\n' ||
            '        L.append(u)' || E'\n' ||
            '        u = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '    return L' || E'\n',
        'def liste(k):' || E'\n' ||
            '    L = []' || E'\n' ||
            '    u = 1' || E'\n' ||
            '    for i in range(0, k + 1):' || E'\n' ||
            '        L.append(u)' || E'\n' ||
            '        u = u / (1 + u)' || E'\n' ||
            '    return L' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "liste",
                    "message": "Tu dois définir la fonction liste(k)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle for."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "liste",
                "test_cases": [
                    {"args": [0], "expected": [1]},
                    {"args": [1], "expected": [1, 0.5]},
                    {"args": [2], "expected": [1, 0.5, 0.3333333333333333]},
                    {"args": [5], "expected": [1, 0.5, 0.3333333333333333, 0.25, 0.2, 0.16666666666666669]},
                    {"args": [10], "expected": [1, 0.5, 0.3333333333333333, 0.25, 0.2, 0.16666666666666669, 0.14285714285714288, 0.12500000000000003, 0.11111111111111113, 0.10000000000000002, 0.09090909090909093]}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Polynésie 05/2022 Q1.b',
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
