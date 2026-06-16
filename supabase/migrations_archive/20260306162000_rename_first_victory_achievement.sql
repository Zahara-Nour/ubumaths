-- Rename "Premier pas" → "Première victoire" for clarity
UPDATE public.minesweeper_achievements
SET name = 'Première victoire'
WHERE id = 'first_victory';
