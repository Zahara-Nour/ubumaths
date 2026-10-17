-- Numéro de version d'une instanciation : une valeur par défaut (ADR 0029, étape 5)
-- ==============================================================================
--
-- L'ancien système de versions disparaît (accord de David du 2026-10-14, journal
-- docs/wip/refonte-modeles-chapitre-progress.md § Étape 5). `template_version` est
-- encore NOT NULL sans défaut : le code doit l'écrire. Avec un défaut, le code peut
-- cesser de l'écrire AVANT la migration qui supprimera la colonne — sinon « Faire
-- un modèle » casserait en prod entre la suppression et le déploiement.
--
-- QUI POURRA LIRE QUOI, QU'IL NE POUVAIT PAS LIRE AVANT : personne (valeur par
-- défaut d'une colonne, aucune policy touchée).
--
-- Additive : un défaut ; aucune ligne modifiée.
--
-- ROLLBACK:BEGIN
-- alter table public.chapter_template_instantiations alter column template_version drop default;
-- ROLLBACK:END

alter table public.chapter_template_instantiations
	alter column template_version set default 1;
