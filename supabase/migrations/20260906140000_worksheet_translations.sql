-- Fiches en anglais : colonne de traductions sur les textes hors variations
-- ===========================================================================
--
-- Le contenu d'un exercice (énoncé, solution, indices) vit dans
-- `exercises.variations` (JSONB) et porte déjà ses traductions sans migration.
-- Trois textes lui échappent, parce qu'ils sont des colonnes :
--
--   worksheets.title / description
--   worksheet_sections.title / instructions
--   worksheet_exercises.custom_instructions
--
-- Ils reçoivent la même forme que les variations : le français reste dans la
-- colonne (source de vérité), la traduction ne porte que ce qu'elle surcharge.
--
--   {"en": {"title": "Quadratic functions", "instructions": "Show your working."}}
--
-- NULL = fiche française uniquement, soit tout l'existant. Purement additif :
-- aucune ligne modifiée, aucune contrainte ajoutée, aucun impact sur les RLS
-- (les policies portent sur la ligne, pas sur les colonnes).
--
-- La langue de rendu, elle, vit dans `worksheets.config->>'language'` — le
-- JSONB de configuration existe déjà, rien à migrer pour elle.

ALTER TABLE public.worksheets
  ADD COLUMN IF NOT EXISTS translations jsonb;

ALTER TABLE public.worksheet_sections
  ADD COLUMN IF NOT EXISTS translations jsonb;

ALTER TABLE public.worksheet_exercises
  ADD COLUMN IF NOT EXISTS translations jsonb;

COMMENT ON COLUMN public.worksheets.translations IS
  'Traductions de title/description par locale ({"en": {...}}). NULL = français uniquement. Le français reste dans les colonnes.';

COMMENT ON COLUMN public.worksheet_sections.translations IS
  'Traductions de title/instructions par locale ({"en": {...}}). NULL = français uniquement.';

COMMENT ON COLUMN public.worksheet_exercises.translations IS
  'Traductions de custom_instructions par locale ({"en": {...}}). NULL = français uniquement.';
