-- ============================================================================
-- Lecture anonyme des tags des presques-évaluations + resynchronisation
-- ============================================================================
-- Étape 2/3 du nettoyage des tags. Le code va cesser d'utiliser les colonnes
-- `tags text[]` de `parody_evaluations`, `worksheets` et `constructions` au
-- profit de `resource_tags`. Un obstacle : la page publique des
-- presques-évaluations est ANONYME, alors que `resource_tags` n'est lisible que
-- par les comptes connectés. Sans cette policy, le filtrage par tag y casserait.
--
-- QUESTION D'ACCÈS : **rien de nouveau n'est exposé.** La policy est restreinte
-- au seul type `parody_evaluation`, et ces documents sont DÉJÀ entièrement
-- publics — la page `(public)/presques-evaluations` les liste sans compte, le
-- bucket de stockage est public, et leurs tags sont aujourd'hui lisibles dans la
-- colonne `parody_evaluations.tags` par la même requête anonyme.
--
-- Ce que la policy ne fait PAS, et c'est délibéré : ouvrir `resource_tags` à
-- `anon` en général. Ça révélerait les associations de types que l'anonyme ne
-- peut pas voir — exercices privés, chapitres, et un jour les évaluations, dont
-- les tags trahiraient le thème d'un contrôle à venir.
--
-- ROLLBACK :
--   drop policy "Anyone can read parody evaluation tags" on public.resource_tags;
--   -- (la resynchronisation ci-dessous est idempotente, rien à défaire)
-- ============================================================================

drop policy if exists "Anyone can read parody evaluation tags" on public.resource_tags;
create policy "Anyone can read parody evaluation tags"
	on public.resource_tags for select
	to anon
	using (resource_kind = 'parody_evaluation');

grant select on public.resource_tags to anon;

-- ---------------------------------------------------------------------------
-- Resynchronisation des trois types encore portés par des colonnes `text[]`
-- ---------------------------------------------------------------------------
-- La reprise initiale (20260908130000) a copié l'état d'alors. Depuis, ces trois
-- types n'ont PAS été suivis par la double écriture — elle ne couvrait que les
-- exercices et les exercices Python. Toute modification faite entre-temps n'est
-- donc pas dans `resource_tags`, et le code va cesser de lire les colonnes.
--
-- On recopie donc une dernière fois, juste avant la bascule. Idempotent
-- (`on conflict do nothing`), mais volontairement PAS destructif : on n'efface
-- pas les associations existantes, on complète.
--
-- ⚠️ Limite assumée : une association SUPPRIMÉE d'une colonne `text[]` depuis la
-- reprise reste dans `resource_tags`. Le volume concerné est de 17 associations
-- au total, dont zéro pour les constructions — le risque est théorique, et le
-- corriger demanderait un effacement dont le coût dépasse l'enjeu.
do $$
declare
	src record;
begin
	for src in
		select * from (values
			('constructions', 'construction'),
			('worksheets', 'worksheet'),
			('parody_evaluations', 'parody_evaluation')
		) as t(table_name, kind)
	loop
		execute format($fmt$
			insert into public.tags (name)
			select distinct on (public.tag_slug(tag_name)) tag_name
			from (
				select unnest(tags) as tag_name from public.%I where tags is not null
			) raw
			where public.tag_slug(tag_name) is not null
				and not exists (select 1 from public.tags t where t.slug = public.tag_slug(tag_name))
			order by public.tag_slug(tag_name), tag_name;
		$fmt$, src.table_name);

		execute format($fmt$
			insert into public.resource_tags (resource_kind, resource_id, tag_id)
			select %L, r.id, t.id
			from public.%I r
			cross join lateral unnest(r.tags) as tag_name
			join public.tags t on t.slug = public.tag_slug(tag_name)
			where r.tags is not null
			on conflict do nothing;
		$fmt$, src.kind, src.table_name);
	end loop;
end;
$$;
