-- Modèle système « Evaluation » renommé « Contrôle »
-- ===========================================================================
--
-- Vocabulaire tranché le 2026-10-11 (CONTEXT.md) : la série notée s'appelle un
-- contrôle, « évaluation » seule est bannie. Les écrans le disent depuis #1140,
-- mais le nom et la description du modèle sont lus en base : la liste des
-- modèles affichait encore « Evaluation ».
--
-- Données seulement : une ligne, deux colonnes ; aucun droit d'accès changé.
-- Le contenu Typst du modèle n'est pas touché.
--
-- Source de vérité : src/lib/typst/templates/default-templates.ts
--
-- Rollback :
--   UPDATE public.worksheet_templates
--   SET name = 'Evaluation',
--       description = 'Mise en page formelle pour evaluation avec section notation'
--   WHERE id = '00000000-0000-4000-8000-000000000002';

UPDATE public.worksheet_templates
SET name = 'Contrôle',
    description = 'Mise en page formelle pour contrôle avec section notation'
WHERE id = '00000000-0000-4000-8000-000000000002';
