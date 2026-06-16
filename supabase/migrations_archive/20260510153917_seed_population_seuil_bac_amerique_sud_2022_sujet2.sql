-- Migration: Seed "population(S) — espèce en voie de disparition" exercise from Bac Amérique du Sud September 2022 (sujet 2)
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 6.b from the Bac Amérique
-- du Sud September 2022 paper (sujet 2). Modélisation d'une espèce en
-- voie de disparition : -10 % de population/an + 100 individus
-- réintroduits/an. La suite u_0 = 2000, u_{n+1} = 0.9 u_n + 100 est
-- décroissante, minorée par 1000, et converge vers 1000.
-- population(S) renvoie le nombre d'années nécessaires pour que
-- l'effectif passe en dessous du seuil S (avec S > 1000).
--
-- Strategy: V2 with ast_requirements (defines_function 'population'
-- + uses_loop) + behavior.unit_test. Pure IEEE 754 mult/add/compare
-- → bit-identical Pyodide vs node, strict equality safe.
--
-- Note importante : pour S ≤ 1000 (la limite de la suite), la boucle
-- ne terminerait pas. Aucun test case n'utilise une telle valeur ;
-- tous les S testés sont >= 1020. Documenté dans l'énoncé.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Population — années avant un seuil',
        'Algorithme de seuil sur la suite arithmético-géométrique modélisant une population en voie de disparition (Bac Amérique du Sud 09/2022 sujet 2).',
        '# Énoncé' || E'\n\n' ||
            'On modélise la population d''une espèce en voie de disparition. Chaque année, la population diminue de 10 % à cause du climat et du braconnage ; pour compenser, on réintroduit 100 individus à la fin de chaque année. En 2020, la population compte 2000 individus.' || E'\n\n' ||
            'On obtient la récurrence' || E'\n\n' ||
            '$$u_0 = 2000, \quad u_{n+1} = 0{,}9 \, u_n + 100.$$' || E'\n\n' ||
            'On démontre que $(u_n)$ est décroissante, minorée par 1000, et converge vers $\ell = 1000$ — donc à long terme la population se stabilise autour de 1000 individus.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `population(S)` ci-dessous pour qu''elle renvoie le **nombre d''années nécessaires** pour que l''effectif passe **strictement en dessous du seuil $S$**, où $S > 1000$.' || E'\n\n' ||
            'Quatre endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n' ||
            '- la **mise à jour** de `n`' || E'\n' ||
            '- la **valeur de retour**' || E'\n\n' ||
            '*Attention : pour $S \le 1000$ la suite ne descend jamais en dessous de $S$ — la boucle ne terminerait pas. On suppose $S > 1000$.*' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `population(1020)` doit renvoyer `38` (réponse de référence du Bac)' || E'\n' ||
            '- `population(1100)` doit renvoyer `22`' || E'\n' ||
            '- `population(1900)` doit renvoyer `1`',
        'def population(S):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 2000' || E'\n' ||
            '    while False:    # à compléter (condition sur u et S)' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '        n = ...     # à compléter' || E'\n' ||
            '    return ...      # à compléter (que doit-on renvoyer ?)' || E'\n',
        'def population(S):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 2000' || E'\n' ||
            '    while u > S:' || E'\n' ||
            '        u = 0.9 * u + 100' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "population",
                    "message": "Tu dois définir la fonction population(S)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "population",
                "test_cases": [
                    {"args": [1020], "expected": 38},
                    {"args": [1050], "expected": 29},
                    {"args": [1100], "expected": 22},
                    {"args": [1500], "expected": 7},
                    {"args": [1900], "expected": 1}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Amérique du Sud 09/2022 sujet 2 Q6.b',
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
