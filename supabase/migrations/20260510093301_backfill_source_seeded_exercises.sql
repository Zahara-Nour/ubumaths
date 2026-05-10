-- Migration: Backfill `source` for the four seeded terminale spé exercises
-- Created: 2026-05-10
-- Description:
--   Sets the `source` column on the four exercises previously seeded by:
--     - 20260510071340_seed_terminale_seuil_exercises.sql (3 seuil exos)
--     - 20260510073029_seed_pyramide_bac_polynesie_2024_exercise.sql (1 pyramide)
--   We match by exact title rather than id since uuids are generated at insert
--   time. Idempotent: rerunning leaves source unchanged for the same titles.

UPDATE python_exercises
SET source = 'Bac Polynésie 09/2024 Q2.b'
WHERE title = 'Pyramide de boules';

UPDATE python_exercises
SET source = 'Type Bac terminale spé maths'
WHERE title IN (
    'Seuil — suite arithmético-géométrique',
    'Seuil — population croissante',
    'Seuil — somme partielle d''une série'
);
