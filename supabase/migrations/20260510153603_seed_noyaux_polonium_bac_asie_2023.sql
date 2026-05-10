-- Migration: Seed "noyaux(n) — désintégration polonium" exercise from Bac Asie March 2023
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 5 from the Bac Asie March
-- 2023 paper. La suite v_0 = 6·10²¹, v_{n+1} = 0.995 v_n + 1.5·10¹⁹
-- modélise le nombre de noyaux dans un échantillon de polonium qui se
-- désintègre (compensé par ajout quotidien). noyaux(n) renvoie la liste
-- [v_0, v_1, ..., v_n] (longueur n+1).
--
-- Strategy: V2 with ast_requirements (defines_function 'noyaux' + uses_loop)
-- + behavior.unit_test. Le calcul utilise mult/add IEEE 754 correctement
-- arrondies → bit-identical Pyodide vs node. Strict equality sur les
-- listes (élément par élément) safe.
--
-- Pédagogie : la Bac correction propose deux solutions (récurrente OU
-- forme close V = 3·10²¹·(0.995^(k+1) + 1)). Cette validation accepte
-- UNIQUEMENT la version récurrente — la forme close diverge par 1 ULP
-- à cause des chemins d'arrondi différents. C'est documenté dans
-- l'énoncé.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Désintégration du polonium — liste des termes',
        'Liste des termes de la suite $v_{n+1} = 0{,}995 \, v_n + 1{,}5 \cdot 10^{19}$ avec $v_0 = 6 \cdot 10^{21}$ (Bac Asie 03/2023).',
        '# Énoncé' || E'\n\n' ||
            'On étudie la désintégration radioactive du polonium. Au début, on a 2 g de polonium contenant $v_0 = 6 \cdot 10^{21}$ noyaux. Chaque jour, $0{,}5\,\%$ des noyaux se désintègrent ; pour compenser, on ajoute 0,005 g de polonium (soit $1{,}5 \cdot 10^{19}$ noyaux).' || E'\n\n' ||
            'On obtient la récurrence' || E'\n\n' ||
            '$$v_0 = 6 \cdot 10^{21}, \quad v_{n+1} = 0{,}995 \, v_n + 1{,}5 \cdot 10^{19}.$$' || E'\n\n' ||
            'On démontre que $(v_n)$ converge vers $3 \cdot 10^{21}$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la **ligne 5** de la fonction `noyaux(n)` ci-dessous pour qu''elle renvoie la liste $[v_0, v_1, \ldots, v_n]$ (de longueur $n+1$).' || E'\n\n' ||
            '*Utilise la **forme récurrente** : `V = 0.995 * V + 1.5 * 10**19`. Le sujet du Bac mentionne aussi la forme close $V = 3 \cdot 10^{21} \cdot (0{,}995^{k+1} + 1)$ comme alternative valide ; cependant, à cause des arrondis IEEE 754, elle peut diverger par 1 bit (ULP) de la forme récurrente — préfère la forme récurrente pour cette validation.*' || E'\n\n' ||
            '*Rappel : `L.append(x)` ajoute `x` à la fin de la liste `L`.*',
        'def noyaux(n):' || E'\n' ||
            '    V = 6 * 10 ** 21' || E'\n' ||
            '    L = [V]' || E'\n' ||
            '    for k in range(n):' || E'\n' ||
            '        V = ...    # à compléter (relation de récurrence)' || E'\n' ||
            '        L.append(V)' || E'\n' ||
            '    return L' || E'\n',
        'def noyaux(n):' || E'\n' ||
            '    V = 6 * 10 ** 21' || E'\n' ||
            '    L = [V]' || E'\n' ||
            '    for k in range(n):' || E'\n' ||
            '        V = 0.995 * V + 1.5 * 10 ** 19' || E'\n' ||
            '        L.append(V)' || E'\n' ||
            '    return L' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "noyaux",
                    "message": "Tu dois définir la fonction noyaux(n)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle for."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "noyaux",
                "test_cases": [
                    {"args": [0], "expected": [6e21]},
                    {"args": [1], "expected": [6e21, 5.985e21]},
                    {"args": [2], "expected": [6e21, 5.985e21, 5.970075e21]},
                    {"args": [3], "expected": [6e21, 5.985e21, 5.970075e21, 5.955224625e21]},
                    {"args": [7], "expected": [6e21, 5.985e21, 5.970075e21, 5.955224625e21, 5.940448501875e21, 5.925746259365626e21, 5.911117528068798e21, 5.896561940428454e21]}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Asie 03/2023 Q5',
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
