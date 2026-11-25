-- Titre d'un exercice en anglais : colonne de traductions sur `exercises`
-- ======================================================================
--
-- Le titre d'un exercice est une colonne (`exercises.title`) : il échappe aux
-- traductions rangées dans `variations` (énoncé, corrigé, réponses, indices).
-- Une fiche anglaise l'imprimait donc en français.
--
-- Même forme que `worksheets.translations` (20260906140000) : le français reste
-- dans la colonne (source de vérité), la traduction ne porte que ce qu'elle
-- surcharge.
--
--   {"en": {"title": "Using formulas"}}
--
-- NULL = exercice français uniquement, soit tout l'existant. Purement additif :
-- aucune ligne modifiée, aucune contrainte ajoutée, aucune policy touchée (les
-- policies de `exercises` portent sur la ligne : qui lit l'exercice lit son
-- titre anglais, personne d'autre).
--
-- Rollback :
--   ALTER TABLE public.exercises DROP COLUMN IF EXISTS translations;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS translations jsonb;

COMMENT ON COLUMN public.exercises.translations IS
  'Traductions du titre par locale ({"en": {"title": ...}}). NULL = français uniquement. Le français reste dans la colonne title.';
