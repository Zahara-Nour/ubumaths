-- Migration: Seed "Panneaux solaires" exercise from Bac Centres étrangers June 2021
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 1.c (Partie A) from the
-- Bac Centres étrangers June 2021 paper. Modélisation d'une centrale
-- solaire : -2 % de panneaux/an + 250 nouveaux panneaux/an. La suite
-- u_0 = 10560, u_{n+1} = 0.98 u_n + 250 est croissante, majorée par
-- 12500, et converge vers 12500. Le script Python (module-level)
-- calcule le plus petit n tel que u_n > 12000. Réponse : n = 68.
--
-- Le Bac ne définit pas de fonction — c'est un script module-level. On
-- ajoute `print(n)` à la fin du starter pour pouvoir valider la sortie.
--
-- Strategy: V2 with ast_requirements (uses_loop seul, pas de
-- defines_function puisque module-level) + behavior.output. Pure IEEE
-- 754 mult/add → bit-identical Pyodide vs node, comparaison exact sur
-- l'entier de sortie sûre.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Centrale solaire — seuil 12000 panneaux',
        'Algorithme de seuil sur la suite arithmético-géométrique modélisant une centrale solaire (Bac Centres étrangers 06/2021).',
        '# Énoncé' || E'\n\n' ||
            'Au 1ᵉʳ janvier 2020, la centrale solaire de Big Sun possède 10 560 panneaux. Chaque année, **2 % des panneaux sont retirés** (détérioration) et **250 nouveaux panneaux sont installés**.' || E'\n\n' ||
            'On modélise le nombre de panneaux par la suite' || E'\n\n' ||
            '$$u_0 = 10\,560, \quad u_{n+1} = 0{,}98 \, u_n + 250.$$' || E'\n\n' ||
            'On démontre que $(u_n)$ est croissante, majorée par 12 500, et converge vers 12 500.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter le script Python ci-dessous pour qu''il stocke dans la variable `n` le **nombre d''années** au bout duquel le nombre de panneaux dépasse strictement 12 000.' || E'\n\n' ||
            'Trois lignes sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n' ||
            '- la **mise à jour** de `n`' || E'\n\n' ||
            '*La ligne `print(n)` à la fin n''est pas dans le sujet original — elle est ajoutée pour permettre la validation automatique. Ne pas la modifier.*',
        'u = 10560' || E'\n' ||
            'n = 0' || E'\n' ||
            'while False:    # à compléter (condition sur u et 12000)' || E'\n' ||
            '    u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '    n = ...     # à compléter' || E'\n\n' ||
            '# Validation : ne pas modifier' || E'\n' ||
            'print(n)' || E'\n',
        'u = 10560' || E'\n' ||
            'n = 0' || E'\n' ||
            'while u <= 12000:' || E'\n' ||
            '    u = 0.98 * u + 250' || E'\n' ||
            '    n = n + 1' || E'\n\n' ||
            'print(n)' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while."
                }
            ],
            "behavior": {
                "kind": "output",
                "test_cases": [
                    {"input": "", "expected_output": "68\n"}
                ],
                "comparison": {"kind": "exact"}
            }
        }'::jsonb,
        'lycee',
        'Bac Centres étrangers 06/2021 Partie A Q1.c',
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
