-- Migration: Seed "Croisement de populations" exercise from Bac Centres étrangers June 2025
-- Created: 2026-05-10
--
-- Faithful adaptation of the official Python question (Partie C, Q4) of the
-- Bac Centres étrangers June 2025 paper. Two populations evolve in parallel:
--   - Milieu A: u_{n+1} = 0.93 * u_n   (geometric decay, u_0 = 6)
--   - Milieu B: v_{n+1} = -0.05*v_n^2 + 1.1*v_n   (logistic-like, v_0 = 6)
-- The student fills in the while condition and the two updates so that the
-- script prints the year when population in B exceeds population in A (= 2038).
--
-- Strategy: AST (uses_loop) + a single output_test on stdout. We need both:
-- a single `print(2038)` would pass the output check alone, and the script
-- runs at module level so we can't use unit_test (no function to call).
--
-- Starter uses `while False` as a runtime-safe placeholder so the unfilled
-- script outputs "2025" (loop doesn't run) instead of timing out on
-- `while ...:` (Ellipsis is truthy → infinite loop).

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Croisement de populations',
        'Année où la population du milieu B dépasse celle du milieu A (Bac Centres étrangers 06/2025).',
        '# Énoncé' || E'\n\n' ||
            'On compare l''évolution de deux populations animales introduites le 1ᵉʳ janvier 2025, chacune avec **6000 individus** (soit 6 milliers).' || E'\n\n' ||
            '## Modélisations' || E'\n\n' ||
            '**Milieu A** — suite géométrique de raison $0{,}93$ :' || E'\n\n' ||
            '$$u_0 = 6, \quad u_{n+1} = 0{,}93 \, u_n$$' || E'\n\n' ||
            '**Milieu B** — récurrence non linéaire :' || E'\n\n' ||
            '$$v_0 = 6, \quad v_{n+1} = -0{,}05 \, v_n^2 + 1{,}1 \, v_n$$' || E'\n\n' ||
            'On admet que $(u_n)$ converge vers $0$ et $(v_n)$ converge vers $2$. Comme les deux suites partent du même point et décroissent à vitesses différentes, il existe un rang $N$ à partir duquel $v_N > u_N$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter le programme Python ci-dessous pour qu''il affiche **l''année à partir de laquelle la population du milieu B est strictement supérieure à celle du milieu A**.' || E'\n\n' ||
            'Trois lignes sont à compléter :' || E'\n\n' ||
            '- la **condition** de la boucle `while`' || E'\n' ||
            '- la **mise à jour** de `u`' || E'\n' ||
            '- la **mise à jour** de `v`',
        'n = 0' || E'\n' ||
            'u = 6' || E'\n' ||
            'v = 6' || E'\n' ||
            'while False:    # à compléter (condition d''arrêt sur u et v)' || E'\n' ||
            '    u = ...     # à compléter (mise à jour de u)' || E'\n' ||
            '    v = ...     # à compléter (mise à jour de v)' || E'\n' ||
            '    n = n + 1' || E'\n' ||
            'print(2025 + n)' || E'\n',
        'n = 0' || E'\n' ||
            'u = 6' || E'\n' ||
            'v = 6' || E'\n' ||
            'while u >= v:' || E'\n' ||
            '    u = 0.93 * u' || E'\n' ||
            '    v = -0.05 * v ** 2 + 1.1 * v' || E'\n' ||
            '    n = n + 1' || E'\n' ||
            'print(2025 + n)' || E'\n',
        '{
            "type": "ast",
            "requirements": [
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle while pour itérer jusqu''au croisement."
                }
            ],
            "output_tests": [
                {"input": "", "expected_output": "2038\n"}
            ],
            "output_comparison": {"kind": "exact"}
        }'::jsonb,
        'lycee',
        'Bac Centres étrangers 06/2025 Q4',
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
