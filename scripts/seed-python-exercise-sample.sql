-- Sample Python exercise for manually testing the share-by-link flow.
--
-- Inserts ONE public exercise authored by the first teacher found in profiles.
-- Returns the new exercise id + title — copy the id and visit
--   http://localhost:5175/python-exercises/<id>
-- in any browser (signed in or not) to consult the exercise.
--
-- Usage (pick one):
--   supabase db execute --file scripts/seed-python-exercise-sample.sql
--   psql "$DATABASE_URL" -f scripts/seed-python-exercise-sample.sql
--   (or paste into the Supabase Studio SQL editor — http://127.0.0.1:54323)
--
-- IMPORTANT: instructions and starter/solution_code are built via string
-- concatenation (||) instead of E'long\nstring\nwith\nnewlines' to avoid
-- accidental wrap-on-paste hazards. When a long E'...' literal is pasted
-- through a UI that soft-wraps text (Studio's SQL editor, copying from a
-- rendered markdown block, etc.), real newlines can sneak inside the string
-- and end up stored in the database verbatim — which then confuses the
-- markdown parser into creating multi-paragraph list items.
--
-- Run as many times as you want — each call creates a new exercise. To clean
-- up afterwards, delete from python_exercises where title like 'Somme%';

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
)
INSERT INTO python_exercises (
    title,
    description,
    instructions,
    starter_code,
    solution_code,
    validation_config,
    level,
    tags,
    author_id,
    is_public
)
SELECT
    'Somme de deux nombres',
    'Premier exercice : écris une fonction qui additionne deux entiers.',
    -- instructions: each line on its own concat segment; no E'...\n...' literals
    '# Énoncé' || E'\n\n' ||
        'Écris une fonction `add(a, b)` qui retourne la somme de `a` et `b`.' || E'\n\n' ||
        '## Exemples' || E'\n\n' ||
        '- `add(1, 2)` doit retourner `3`' || E'\n' ||
        '- `add(10, 5)` doit retourner `15`' || E'\n' ||
        '- `add(-3, 3)` doit retourner `0`' || E'\n' ||
        '- `add(0, 0)` doit retourner `0`' || E'\n\n' ||
        '## Conseils' || E'\n\n' ||
        '- Tu peux utiliser l''opérateur `+` directement.' || E'\n' ||
        '- Pas besoin de `print` : la fonction doit **retourner** (avec `return`) et non afficher.',
    'def add(a, b):' || E'\n' ||
        '    # ton code ici' || E'\n' ||
        '    pass' || E'\n',
    'def add(a, b):' || E'\n' ||
        '    return a + b' || E'\n',
    '{
        "type": "unit_test",
        "function_name": "add",
        "test_cases": [
            {"args": [1, 2], "expected": 3},
            {"args": [10, 5], "expected": 15},
            {"args": [-3, 3], "expected": 0},
            {"args": [0, 0], "expected": 0},
            {"args": [100, 200], "expected": 300}
        ]
    }'::jsonb,
    'lycee',
    ARRAY['arithmétique', 'débutant', 'fonctions'],
    first_teacher.id,
    TRUE
FROM first_teacher
RETURNING id, title;
