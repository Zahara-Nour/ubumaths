-- Migration: Seed pyramide(n) exercise from Bac Polynésie September 2024 (Q2.b)
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 2.b in the official Bac
-- Polynésie September 2024 paper: complete the function `pyramide(n)` so that
-- it returns the total number of balls in an n-story square-based pyramid.
-- Strategy: unit_test, parametric (n) — solid against hardcoded returns since
-- multiple Bac-known values are probed (n=4 → 30, n=5 → 55, n=7 → 140).
--
-- The starter_code preserves the visual `S = ...` / `return ...` of the Bac
-- (Ellipsis is a valid Python expression — function runs without crashing,
-- returns Ellipsis, all tests fail cleanly until the student fills the gaps).
--
-- Tag schema reminder (since 20260509094828_normalize_exercise_tags) :
--   tags live in the junction table `python_exercise_tags(exercise_id, tag_id)`
--   referencing `python_tags(id, name)`. The `tags TEXT[]` column is gone.

-- ============================================================================
-- 0. ENSURE THE 'bac' TAG EXISTS
--    Other tags ('for', 'suite', 'terminale') were created earlier:
--      - 'for' & 'suite' from 20260508162152_create_python_tags.sql
--      - 'terminale' from 20260510071340_seed_terminale_seuil_exercises.sql
-- ============================================================================

INSERT INTO python_tags (name) VALUES
    ('bac')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Pyramide de boules — Bac Polynésie 09/2024 Q2.b
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, author_id, is_public
    )
    SELECT
        'Pyramide de boules',
        'Bac Polynésie septembre 2024, Q2.b — somme des carrés via boucle for.',
        '# Énoncé' || E'\n\n' ||
            'On considère une pyramide à base carrée formée de boules empilées :' || E'\n\n' ||
            '- le 1ᵉʳ étage (le plus haut) est composé de **1 boule** ;' || E'\n' ||
            '- le 2ᵉ étage est composé de **4 boules** ;' || E'\n' ||
            '- le 3ᵉ étage est composé de **9 boules** ;' || E'\n' ||
            '- plus généralement, le **n-ième étage** est composé de **$n^2$ boules**.' || E'\n\n' ||
            'Pour tout entier $n \ge 1$, on note $u_n = n^2$ et' || E'\n\n' ||
            '$$S_n = u_1 + u_2 + \cdots + u_n = \sum_{k=1}^{n} k^2$$' || E'\n\n' ||
            'le nombre total de boules d''une pyramide à $n$ étages.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction Python `pyramide(n)` ci-dessous afin que, pour tout entier naturel non nul $n$, l''instruction `pyramide(n)` renvoie le nombre total de boules composant une pyramide de $n$ étages.' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `pyramide(4)` doit renvoyer `30` (= 1 + 4 + 9 + 16)' || E'\n' ||
            '- `pyramide(5)` doit renvoyer `55`' || E'\n' ||
            '- `pyramide(7)` doit renvoyer `140`',
        'def pyramide(n):' || E'\n' ||
            '    S = 0' || E'\n' ||
            '    for i in range(1, n + 1):' || E'\n' ||
            '        S = ...   # à compléter' || E'\n' ||
            '    return ...    # à compléter' || E'\n',
        'def pyramide(n):' || E'\n' ||
            '    S = 0' || E'\n' ||
            '    for i in range(1, n + 1):' || E'\n' ||
            '        S = S + i ** 2' || E'\n' ||
            '    return S' || E'\n',
        '{
            "type": "unit_test",
            "function_name": "pyramide",
            "test_cases": [
                {"args": [1], "expected": 1},
                {"args": [4], "expected": 30},
                {"args": [5], "expected": 55},
                {"args": [7], "expected": 140},
                {"args": [10], "expected": 385},
                {"args": [0], "expected": 0}
            ]
        }'::jsonb,
        'lycee',
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
