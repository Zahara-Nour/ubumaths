-- Migration: Seed "Posidonie — seuil de 14 hectares" exercise from Bac Métropole June 2025
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 3.b from the Bac Métropole
-- June 2025 paper (algue marine posidonie en baie de l'Alycastre). The
-- recurrence is u_{n+1} = -0.02*u_n^2 + 1.3*u_n with u_0 = 1; the function
-- seuil() must return the smallest n such that u_n > 14 (answer: 18).
--
-- Strategy: unit_test (matches the Bac form: a no-arg function returning n).
-- Single test case — the no-arg function is technically vulnerable to a
-- hardcoded `return 18`, but Bac fidelity outweighs this defensive concern.
-- The "Tester ma fonction" panel works on this exo so students can probe
-- the function interactively.
--
-- Starter uses `while False` as a runtime-safe placeholder so seuil()
-- returns 0 until filled (test fails cleanly: expected 18, got 0).

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Posidonie — seuil de 14 hectares',
        'Algorithme de seuil sur la croissance de la posidonie en baie de l''Alycastre (Bac Métropole 06/2025).',
        '# Énoncé' || E'\n\n' ||
            'Une équipe de biologistes étudie la superficie recouverte par la **posidonie** (algue marine) dans la baie de l''Alycastre, près de l''île de Porquerolles. La zone totale fait **20 hectares** ; au 1ᵉʳ juillet 2024, la posidonie en couvre **1 ha**.' || E'\n\n' ||
            'Pour tout entier $n \ge 0$, on note $u_n$ la superficie recouverte au 1ᵉʳ juillet de l''année $2024+n$ :' || E'\n\n' ||
            '$$u_0 = 1, \quad u_{n+1} = -0{,}02 \, u_n^2 + 1{,}3 \, u_n.$$' || E'\n\n' ||
            'On admet que $(u_n)$ est croissante, majorée par 20, et converge vers $L = 15$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil()` pour qu''elle renvoie le **plus petit entier $n$** tel que $u_n > 14$ — c''est-à-dire le nombre d''années (à partir de 2024) au bout desquelles la posidonie recouvrira plus de 14 hectares.' || E'\n\n' ||
            'Trois lignes sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la mise à jour de `n`' || E'\n' ||
            '- la mise à jour de `u`',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 1' || E'\n' ||
            '    while False:    # à compléter (condition d''arrêt sur u)' || E'\n' ||
            '        n = ...     # à compléter' || E'\n' ||
            '        u = ...     # à compléter' || E'\n' ||
            '    return n' || E'\n',
        'def seuil():' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    u = 1' || E'\n' ||
            '    while u <= 14:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        u = -0.02 * u ** 2 + 1.3 * u' || E'\n' ||
            '    return n' || E'\n',
        '{
            "type": "unit_test",
            "function_name": "seuil",
            "test_cases": [
                {"args": [], "expected": 18}
            ]
        }'::jsonb,
        'lycee',
        'Bac Métropole 06/2025 Q3.b',
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
