-- Migration: Seed "Décongélation gâteaux seuil()" exercise from Bac Métropole June 2021
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 7.c from the Bac Métropole
-- June 2021 paper. Modélisation de la décongélation de gâteaux : sortie
-- du congélateur à -19°C, température ambiante 25°C, recurrence
-- T_{n+1} = 0.94 T_n + 1.5. seuil() renvoie le plus petit n tel que
-- T_n >= 10°C (température de dégustation préférée). Réponse : 18 minutes.
--
-- Note : la correction du Bac contient une coquille (T = 25 - 0.94*T au
-- lieu de T = 0.94*T + 1.5). On corrige avec la bonne récurrence.
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.unit_test. Pure IEEE 754 mult/add → bit-identical Pyodide
-- vs node, strict equality safe sur l'entier de retour. AST defends
-- against hardcoded `return 18`.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Décongélation — seuil 10 °C',
        'Algorithme de seuil sur la suite arithmético-géométrique modélisant la décongélation de gâteaux (Bac Métropole 06/2021).',
        '# Énoncé' || E'\n\n' ||
            'Cécile sort des gâteaux du congélateur à $-19\,°C$ et les pose sur sa terrasse à 25 °C. La température $T_n$ (en °C) au bout de $n$ minutes vérifie' || E'\n\n' ||
            '$$T_0 = -19, \quad T_{n+1} = 0{,}94 \, T_n + 1{,}5.$$' || E'\n\n' ||
            'On démontre que $(T_n)$ est croissante, majorée par 25, et converge vers 25 °C (la température ambiante).' || E'\n\n' ||
            'Cécile aime déguster ses gâteaux à $10\,°C$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil()` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** (nombre de minutes) tel que $T_n \ge 10$.' || E'\n\n' ||
            'Quatre endroits sont à compléter :' || E'\n\n' ||
            '- la **valeur initiale** de `T` (température au sortir du congélateur)' || E'\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `T` (relation de récurrence)' || E'\n' ||
            '- la **valeur de retour**',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    T = ...    # à compléter (température initiale T_0)' || E'\n' ||
            '    while False:    # à compléter (condition sur T et 10)' || E'\n' ||
            '        T = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return ...    # à compléter (que doit-on renvoyer ?)' || E'\n',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    T = -19' || E'\n' ||
            '    while T < 10:' || E'\n' ||
            '        T = 0.94 * T + 1.5' || E'\n' ||
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
                    {"args": [], "expected": 18}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Métropole 06/2021 Q7.c',
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
