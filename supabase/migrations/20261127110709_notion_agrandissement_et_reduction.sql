-- ============================================================================
-- Chantier « idees-3e-thales » : une notion NEUVE, « Géométrie > Agrandissement et réduction »
-- ============================================================================
-- Notion sans sous-notion, en fin de la branche Géométrie, avec son nom anglais (ADR 0043) :
-- « Enlargement and reduction ». Son Mathou s'appelle Maquette (src/lib/mathoux/mathou-noms.ts).
-- Elle recevra le modèle « Agrandissement
-- et réduction : aires et volumes », rangé SANS point (hors programme de cycle 4), par la
-- migration de rangement du chantier, écrite après celle-ci.
--
-- Décision de David du 2026-11-27 (Q2 de la phase 0, journal docs/wip/idees-3e-thales-progress.md,
-- § Décisions) : un nœud neuf plutôt que « Grandeurs et mesures > Volumes ».
--
-- Garde : la branche Géométrie existe (une seule, active) et n'a pas déjà une notion de ce nom
-- (casse ignorée, archivée comprise).
--
-- Données d'élèves : aucune.
--
-- Accès (question tranchée par David le 2026-11-27) : personne ne gagne ni ne perd d'accès. L'arbre
-- des notions est de lecture publique, la notion neuve aussi, comme toutes. Aucune règle (policy)
-- ne change.
--
-- Rollback (aucune donnée d'élève). Il refuse si la notion porte quelque chose (sous-notion,
-- modèle, point) : à jouer après le rollback de la migration de rangement du chantier. Un Mathou
-- d'élève ou une fiche liés à la notion (clés `on delete restrict`) font échouer le `delete` :
-- rien n'est alors supprimé, aucune donnée d'élève n'est perdue.
-- ROLLBACK:BEGIN
-- do $rollback$
-- declare v_notion uuid;
-- begin
-- 	select n.id into strict v_notion from public.classification_nodes n
-- 	  join public.classification_nodes b on b.id = n.parent_id and b.kind = 'branch'
-- 	   and b.parent_id is null and b.archived_at is null and b.name = 'Géométrie'
-- 	 where n.kind = 'notion' and n.name = 'Agrandissement et réduction';
-- 	if exists (select 1 from public.classification_nodes where parent_id = v_notion)
-- 	   or exists (select 1 from public.question_templates where classification_node_id = v_notion)
-- 	   or exists (select 1 from public.curriculum_points where node_id = v_notion) then
-- 		raise exception 'rollback : la notion « Agrandissement et réduction » porte quelque chose';
-- 	end if;
-- 	delete from public.classification_nodes where id = v_notion;
-- end
-- $rollback$;
-- ROLLBACK:END
-- ============================================================================

do $notion$
declare
	v_branche uuid;
begin
	select b.id into strict v_branche from public.classification_nodes b
	 where b.kind = 'branch' and b.parent_id is null and b.archived_at is null and b.name = 'Géométrie';
	if exists (select 1 from public.classification_nodes n
	            where n.parent_id = v_branche and lower(n.name) = lower('Agrandissement et réduction')) then
		raise exception 'la notion « Agrandissement et réduction » existe déjà';
	end if;
	insert into public.classification_nodes (kind, parent_id, name, position, translations)
	select 'notion', v_branche, 'Agrandissement et réduction',
	       coalesce(max(n.position), -1) + 1,
	       '{"en": {"name": "Enlargement and reduction"}}'::jsonb
	  from public.classification_nodes n
	 where n.parent_id = v_branche;
end
$notion$;
