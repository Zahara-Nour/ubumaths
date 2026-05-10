-- Migration: Seed "efficace() — perfusion médicament" exercise from Bac Asie May 2022
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 4.a (Partie A) from the
-- Bac Asie May 2022 paper. Modélisation discrète d'une perfusion
-- médicamenteuse : 10 % d'élimination + 0,25 mg ajouté toutes les 30 min.
-- u_0 = 1, u_{n+1} = 0.9 u_n + 0.25 → converge vers 2.5. efficace()
-- renvoie le plus petit n tel que u_n >= 1.8 (seuil d'efficacité).
-- Réponse : 8 (soit 4 heures).
--
-- Strategy: V2 with ast_requirements (defines_function 'efficace'
-- + uses_loop) + behavior.unit_test. Pure IEEE 754 mult/add/compare
-- → bit-identical Pyodide vs node, strict equality safe.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Médicament — seuil d''efficacité',
        'Algorithme de seuil sur la suite arithmético-géométrique modélisant la quantité de médicament dans le sang d''un patient sous perfusion (Bac Asie 05/2022).',
        '# Énoncé' || E'\n\n' ||
            'Un médicament est administré par perfusion. Toutes les 30 minutes, l''organisme élimine 10 % de la quantité présente, et 0,25 mg de médicament sont ajoutés. La première injection apporte 1 mg.' || E'\n\n' ||
            'On note $u_n$ la quantité (en mg) au bout de $n$ périodes de 30 minutes :' || E'\n\n' ||
            '$$u_0 = 1, \quad u_{n+1} = 0{,}9 \, u_n + 0{,}25.$$' || E'\n\n' ||
            'On démontre que $(u_n)$ est croissante, majorée par 5, et converge vers 2,5.' || E'\n\n' ||
            'Le médicament est **réellement efficace** lorsque $u_n \ge 1{,}8$ mg.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `efficace()` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** (nombre de périodes de 30 min) à partir duquel le médicament devient réellement efficace.' || E'\n\n' ||
            'Deux endroits sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u` (relation de récurrence)',
        'def efficace():' || E'\n' ||
            '    u = 1' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while False:    # à compléter (condition sur u et 1.8)' || E'\n' ||
            '        u = ...     # à compléter (relation de récurrence)' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        'def efficace():' || E'\n' ||
            '    u = 1' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while u < 1.8:' || E'\n' ||
            '        u = 0.9 * u + 0.25' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "efficace",
                    "message": "Tu dois définir la fonction efficace()."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while."
                }
            ],
            "behavior": {
                "kind": "unit_test",
                "function_name": "efficace",
                "test_cases": [
                    {"args": [], "expected": 8}
                ]
            }
        }'::jsonb,
        'lycee',
        'Bac Asie 05/2022 Partie A Q4.a',
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
