-- ============================================================================
-- ⚠️ MIGRATION DESTRUCTIVE — suppression des anciennes formes de tags
-- ============================================================================
-- Étape 3/3 du nettoyage. Accord explicite de David, 2026-09-08.
--
-- CE QUI EST SUPPRIMÉ, et où la donnée se trouve désormais :
--
--   public.exercise_tags          257 associations  → resource_tags (kind='exercise')
--   public.python_exercise_tags   136 associations  → resource_tags (kind='python_exercise')
--   public.python_tags             57 noms          → tags (fusionnés sur le slug)
--   public.worksheets.tags         16 valeurs       → resource_tags (kind='worksheet')
--   public.parody_evaluations.tags  1 valeur        → resource_tags (kind='parody_evaluation')
--   public.constructions.tags       0 valeur        → (colonne restée vide depuis toujours)
--
-- RÉCONCILIATION VÉRIFIÉE EN PRODUCTION juste avant écriture, six contrôles à
-- zéro : aucune association de l'ancienne forme n'est absente de la nouvelle,
-- et aucun nom de `python_tags` ne manque au catalogue. La requête compare les
-- slugs, pas les libellés, donc elle valide aussi la fusion.
--
-- ⚠️ LA SEULE PERTE RÉELLEMENT IRRÉVERSIBLE : la fusion `python_tags` → `tags`
-- s'est faite sur le slug canonique. Deux tags Python qui ne différaient que par
-- un accent ou une majuscule sont devenus UNE seule ligne. Tant que
-- `python_tags` existait, la distinction restait consultable ; après cette
-- migration, non. C'est le prix assumé de l'unification du vocabulaire.
--
-- Aucun code ne lit ni n'écrit plus ces objets depuis les PR #176 et #177,
-- toutes deux déployées. C'est ce qui rend cette suppression sûre : elle ne
-- casse rien, elle enlève ce qui est déjà mort.
--
-- ROLLBACK : impossible au sens strict — un DROP ne se défait pas. En cas de
-- besoin, les données sont reconstructibles depuis `resource_tags` et `tags`,
-- SAUF la distinction des tags Python fusionnés. Une sauvegarde ponctuelle de
-- la base précède toute exécution.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Les jonctions
-- ---------------------------------------------------------------------------
drop table if exists public.exercise_tags;
drop table if exists public.python_exercise_tags;

-- `python_tags` après sa jonction : l'ordre importe, la FK l'exigerait de toute
-- façon.
drop table if exists public.python_tags;

-- ---------------------------------------------------------------------------
-- 2. Les colonnes libres
-- ---------------------------------------------------------------------------
alter table public.worksheets drop column if exists tags;
alter table public.parody_evaluations drop column if exists tags;
alter table public.constructions drop column if exists tags;

-- ---------------------------------------------------------------------------
-- 3. Le catalogue devient l'unique vocabulaire
-- ---------------------------------------------------------------------------
comment on table public.tags is
	'Catalogue UNIQUE des tags de contenu, tous types confondus, depuis la suppression de python_tags (20260908180000). Lecture ouverte (y compris anonyme, pour les pages publiques) ; création et suppression réservées au prof/admin. Unicité portée par le slug, pas par le libellé.';
