-- Migration: Seed "Alerte chlore" exercise from Bac Métropole June 2024 (sujet 2)
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 4 (Partie A) from the Bac
-- Métropole June 2024 paper (sujet 2). Alain ajoute du chlore dans sa
-- piscine — la suite v_{n+1} = 0.92*v_n + 0.3 (v_0 = 0.7) modélise le
-- taux de chlore et converge vers 3.75 mg/L. alerte_chlore(s) renvoie
-- le plus petit n tel que v_n > s.
--
-- Strategy: V2 with ast_requirements (defines_function 'alerte_chlore'
-- + uses_loop) + behavior.unit_test. Pure IEEE 754 arithmetic
-- (mult/add/compare) → bit-identical floats Pyodide vs node, strict
-- equality safe.
--
-- Note: pour s >= 3.75 (la limite), la boucle ne termine pas. Aucun
-- test case ne franchit cette frontière (max testé : s=3.5 qui donne
-- n=30, sûr).

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Alerte chlore',
        'Algorithme de seuil sur la suite arithmético-géométrique modélisant le taux de chlore dans une piscine (Bac Métropole 06/2024 sujet 2).',
        '# Énoncé' || E'\n\n' ||
            'Alain entretient une piscine de **50 m³**. Le mercredi 19 juin, le taux de chlore mesuré est $0{,}70 \,\text{mg} \cdot \text{L}^{-1}$. À partir du jeudi, il ajoute chaque jour 15 g de chlore dans la piscine.' || E'\n\n' ||
            'On note $v_n$ le taux de chlore (en mg·L⁻¹) au jour $n$ après le mercredi. La modélisation donne :' || E'\n\n' ||
            '$$v_0 = 0{,}7, \quad v_{n+1} = 0{,}92 \, v_n + 0{,}3.$$' || E'\n\n' ||
            'On admet que $(v_n)$ est croissante, majorée par 4, et converge vers $\ell = 3{,}75$.' || E'\n\n' ||
            'Les piscinistes préconisent un taux entre 1 et 3 mg·L⁻¹ : à long terme, le taux dépassera donc le seuil de 3 et il faudra alerter Alain.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `alerte_chlore(s)` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** tel que $v_n > s$, où `s` est un seuil en mg·L⁻¹.' || E'\n\n' ||
            'Trois lignes sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `n`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `alerte_chlore(3)` doit renvoyer `17` (réponse de référence du Bac)' || E'\n' ||
            '- `alerte_chlore(2)` doit renvoyer `7`' || E'\n' ||
            '- `alerte_chlore(0.5)` doit renvoyer `0` (le taux initial 0.7 dépasse déjà 0.5)' || E'\n\n' ||
            '*Attention : pour $s \ge 3{,}75$ la suite ne dépasse jamais $s$ — la boucle ne terminerait pas. On suppose $s < 3{,}75$.*',
        'def alerte_chlore(s):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 0.7' || E'\n' ||
            '    while False:    # à compléter (condition sur u et s)' || E'\n' ||
            '        n = ...     # à compléter' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '    return n' || E'\n',
        'def alerte_chlore(s):' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 0.7' || E'\n' ||
            '    while u <= s:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        u = 0.92 * u + 0.3' || E'\n' ||
            '    return n' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "alerte_chlore",
                    "message": "Tu dois définir la fonction alerte_chlore(s)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "alerte_chlore",
                "test_cases": [
                    {"args": [3], "expected": 17},
                    {"args": [2], "expected": 7},
                    {"args": [1], "expected": 2},
                    {"args": [3.5], "expected": 30},
                    {"args": [0.5], "expected": 0}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Métropole 06/2024 sujet 2 Partie A Q4',
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
