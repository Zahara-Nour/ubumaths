-- Migration: Fix the "Somme de deux nombres" sample exercise.
-- Created: 2026-05-08
-- Description:
--   The first run of scripts/seed-python-exercise-sample.sql via Studio's SQL
--   editor introduced spurious newlines + indentation INSIDE list items
--   (e.g. `\n  retourner` mid-item) due to soft-wrap on the long E'...'
--   string when copy-pasted. The ubumark parser then created multi-paragraph
--   list items, which renders as wide gaps between wrapped fragments.
--
--   This migration replaces the instructions / starter / solution with the
--   same content but built via string concatenation (||) — each segment is
--   strictly one line, so no rogue newlines can sneak in regardless of how
--   this file is delivered to Postgres.
--
--   The match is on title = 'Somme de deux nombres' so it only touches the
--   sample exo (no risk on real teacher-created exos). If the exo doesn't
--   exist in this database, the UPDATE simply affects 0 rows (no-op).

UPDATE python_exercises
SET
    instructions =
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
    starter_code =
        'def add(a, b):' || E'\n' ||
        '    # ton code ici' || E'\n' ||
        '    pass' || E'\n',
    solution_code =
        'def add(a, b):' || E'\n' ||
        '    return a + b' || E'\n'
WHERE title = 'Somme de deux nombres';
