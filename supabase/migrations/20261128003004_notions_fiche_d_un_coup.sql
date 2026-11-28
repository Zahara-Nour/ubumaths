-- Notions et fiche écrites d'un coup (écart L86)
-- ===============================================
-- La route `PUT /api/worksheets/[id]` enregistrait la classification d'une
-- fiche en trois requêtes, donc trois transactions : notions retirées, fiche
-- mise à jour (type, catégorie, case « titre libre », titre composé), notions
-- écrites. Une coupure entre les deux dernières laissait une fiche sans ses
-- nouvelles notions. Cette fonction fait les trois dans UNE transaction : une
-- erreur en route annule tout.
--
-- Question d'accès (tranchée par David le 2026-11-28) : la fonction s'exécute
-- avec les droits de l'APPELANT (`security invoker`) : chaque ligne passe par
-- la RLS de `worksheets` et de `worksheet_classifications`, exactement comme
-- les trois requêtes qu'elle remplace. Personne ne lit ni n'écrit rien de plus
-- qu'avant. Appelable par les comptes connectés seulement (pas anon).
--
-- La RLS échoue en silence : chaque écriture est vérifiée (lignes touchées),
-- et un refus lève une exception, qui annule tout. Messages sans accent
-- (PostgREST).
--
-- Migration ADDITIVE.
--
-- ROLLBACK :
--   drop function if exists public.save_worksheet_classification(uuid, jsonb, uuid[]);
--   (puis revenir au code d'avant : la route appelait les trois requêtes)

create or replace function public.save_worksheet_classification(
	p_worksheet_id uuid,
	-- Colonnes de la fiche à écrire, clés présentes seulement : type, category,
	-- custom_title, title ; une autre clé est refusée
	p_fields jsonb,
	-- Notions dans l'ordre d'impression ; null (ou absent) : inchangées
	p_notions uuid[] default null
)
returns setof public.worksheets
language plpgsql
security invoker
set search_path = ''
as $$
declare
	touched integer;
begin
	if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
		raise exception 'p_fields : un objet attendu' using errcode = '22023';
	end if;
	if exists (
		select 1 from jsonb_object_keys(p_fields) as k
		where k not in ('type', 'category', 'custom_title', 'title')
	) then
		raise exception 'p_fields : seules type, category, custom_title et title s''ecrivent ici'
			using errcode = '22023';
	end if;

	-- 1. Notions retirées (avant la fiche : l'ordre des trois requêtes d'avant)
	if p_notions is not null then
		delete from public.worksheet_classifications
		where worksheet_id = p_worksheet_id
			and node_id <> all (p_notions);
		-- Refus RLS = zéro ligne, sans erreur : une notion restée en trop le trahit
		if exists (
			select 1 from public.worksheet_classifications
			where worksheet_id = p_worksheet_id
				and node_id <> all (p_notions)
		) then
			raise exception 'notions non retirees' using errcode = '42501';
		end if;
	end if;

	-- 2. La fiche (une ligne exactement, sinon refus RLS ou fiche inconnue)
	if p_fields <> '{}'::jsonb then
		update public.worksheets w
		set
			type = case when p_fields ? 'type' then p_fields ->> 'type' else w.type end,
			category = case when p_fields ? 'category' then p_fields ->> 'category' else w.category end,
			custom_title = case
				when p_fields ? 'custom_title' then (p_fields ->> 'custom_title')::boolean
				else w.custom_title
			end,
			title = case when p_fields ? 'title' then p_fields ->> 'title' else w.title end
		where w.id = p_worksheet_id;
		get diagnostics touched = row_count;
		if touched <> 1 then
			raise exception 'fiche non modifiee' using errcode = '42501';
		end if;
	end if;

	-- 3. Notions écrites, avec leur position (insert refusé par la RLS : erreur, pas silence)
	if p_notions is not null and cardinality(p_notions) > 0 then
		insert into public.worksheet_classifications (worksheet_id, node_id, position)
		select p_worksheet_id, n.node_id, (n.ord - 1)::integer
		from unnest(p_notions) with ordinality as n (node_id, ord)
		on conflict (worksheet_id, node_id) do update set position = excluded.position;
		get diagnostics touched = row_count;
		if touched <> cardinality(p_notions) then
			raise exception 'notions non ecrites' using errcode = '42501';
		end if;
	end if;

	-- La fiche telle qu'enregistrée (la route la renvoie à l'éditeur)
	return query select * from public.worksheets w where w.id = p_worksheet_id;
	if not found then
		raise exception 'fiche illisible' using errcode = '42501';
	end if;
end;
$$;

comment on function public.save_worksheet_classification(uuid, jsonb, uuid[]) is
	'Catégorie, titre et notions d''une fiche en une transaction (L86). Droits de l''appelant : RLS de worksheets et worksheet_classifications.';

revoke execute on function public.save_worksheet_classification(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_worksheet_classification(uuid, jsonb, uuid[]) to authenticated;
