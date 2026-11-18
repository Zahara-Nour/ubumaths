-- ============================================================================
-- Chantier « mots-cliquables » (R5) : verbes de consigne « jamais souligné »
-- ============================================================================
-- Un verbe de consigne (« Calcule », « Compare »…) dit ce qu'il faut faire : ce n'est pas une notion à
-- découvrir, le souligner n'a d'intérêt à aucun niveau (David, 2026-11-16). La case « jamais
-- souligné » (`auto_link = false`) ne valait que pour les noms (calcul, nombre…) : l'entrée
-- `calculer` (formes calcule, calculez) restait soulignée dans 437 modèles publiés.
-- 10 entrées passent à `auto_link = false` : calculer, comparer, vérifier, déterminer, ordonner
-- (formes range, rangez), représenter, tracer, décomposer, convertir, justifier. Elles restent
-- dans le glossaire et peuvent toujours être forcées par l'auteur (`[mot]{.def}`).
-- Restent soulignables (ce sont des notions) : résoudre, développer, factoriser, simplifier,
-- réduire, démontrer, encadrer, arrondir.
--
-- Garde : exactement 10 entrées visées (terme sans étiquette de sens, non masquées), sinon la
-- migration échoue sans rien changer. Le trigger `dictionary_entries_keep_version` garde la
-- version précédente de chaque entrée (auteur vide : migration) et pose `updated_at` : les 10 pages
-- du glossaire changent de `lastmod` dans le sitemap, accepté (couper le trigger perdrait
-- l'historique).
--
-- Données d'élèves : aucune.
--
-- Accès : personne ne gagne ni ne perd d'accès (question posée à David avant le SQL, tranchée par
-- lui le 2026-11-16 : personne). Aucune règle (policy) ne change. Effet visible : ces 10 verbes ne
-- sont plus soulignés dans les énoncés.
--
-- Rollback (aucune donnée d'élève). Il rend les 10 entrées soulignables. Bloc éprouvé par le test
-- d'intégration, à jouer dans UNE transaction (`psql -1 -v ON_ERROR_STOP=1 -f`, ou l'éditeur SQL
-- en un seul envoi) :
-- ROLLBACK:BEGIN
-- update public.dictionary_entries set auto_link = true
--  where sense is null and not hidden
--    and term in ('calculer', 'comparer', 'vérifier', 'déterminer', 'ordonner',
--                 'représenter', 'tracer', 'décomposer', 'convertir', 'justifier')
--    and not auto_link;
-- ROLLBACK:END
-- ============================================================================

do $$
declare
	visees integer;
begin
	select count(*) into visees
	  from public.dictionary_entries
	 where sense is null and not hidden
	   and term in ('calculer', 'comparer', 'vérifier', 'déterminer', 'ordonner',
	                'représenter', 'tracer', 'décomposer', 'convertir', 'justifier');
	if visees <> 10 then
		raise exception 'verbes de consigne : 10 entrées attendues, % trouvées', visees;
	end if;
end;
$$;

update public.dictionary_entries set auto_link = false
 where sense is null and not hidden
   and term in ('calculer', 'comparer', 'vérifier', 'déterminer', 'ordonner',
                'représenter', 'tracer', 'décomposer', 'convertir', 'justifier')
   and auto_link;
