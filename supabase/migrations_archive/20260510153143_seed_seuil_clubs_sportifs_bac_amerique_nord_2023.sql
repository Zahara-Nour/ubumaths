-- Migration: Seed "Seuil 1280 — clubs sportifs" exercise from Bac Amérique du Nord March 2023
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 7 from the Bac Amérique du
-- Nord March 2023 paper. Modélisation des effectifs de deux clubs
-- sportifs A et B avec 3000 sportifs au total, échanges 15%/10% entre
-- clubs. La suite a_0 = 1700, a_{n+1} = 0.75 a_n + 300 (membres de A)
-- converge vers 1200. seuil() renvoie le plus petit n tel que a_n < 1280.
-- Réponse : 7.
--
-- Strategy: V2 with ast_requirements (defines_function 'seuil' + uses_loop)
-- + behavior.unit_test. Le calcul utilise mult/add/compare IEEE 754
-- correctement arrondies → bit-identical Pyodide vs node, strict equality
-- safe. Single test case (la fonction est sans paramètre).

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Seuil 1280 — clubs sportifs',
        'Algorithme de seuil sur la suite arithmético-géométrique modélisant l''évolution des membres d''un club (Bac Amérique du Nord 03/2023).',
        '# Énoncé' || E'\n\n' ||
            'On étudie un groupe de 3000 sportifs répartis entre deux clubs A et B. En 2023 (rang 0), le club A compte $a_0 = 1700$ membres. Chaque année, 15 % des membres de A partent vers B, tandis que 10 % de B reviennent vers A.' || E'\n\n' ||
            'On démontre que' || E'\n\n' ||
            '$$a_{n+1} = 0{,}75 \, a_n + 300,$$' || E'\n\n' ||
            'que $(a_n)$ est décroissante, minorée par 1200, et converge vers $\ell = 1200$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil()` ci-dessous pour qu''elle renvoie la **plus petite valeur de $n$** à partir de laquelle le nombre de membres du club A est **strictement inférieur à 1280**.' || E'\n\n' ||
            'Trois endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while` (rester dans la boucle tant que $a_n \ge 1280$)' || E'\n' ||
            '- la **mise à jour** de `A` (relation de récurrence)' || E'\n' ||
            '- la **valeur de retour**',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    A = 1700' || E'\n' ||
            '    while False:    # à compléter (condition sur A et 1280)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        A = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '    return ...      # à compléter (que doit-on renvoyer ?)' || E'\n',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    A = 1700' || E'\n' ||
            '    while A >= 1280:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        A = 0.75 * A + 300' || E'\n' ||
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
                    {"args": [], "expected": 7}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Amérique du Nord 03/2023 Q7',
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
