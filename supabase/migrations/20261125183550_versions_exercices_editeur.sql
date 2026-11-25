-- Versions d'un exercice : l'éditeur (ADR 0044, chantier versions-exercices, PR 2)
-- ============================================================================
--
-- Additive : trois fonctions et un déclencheur, tous avec les droits de l'APPELANT (security
-- invoker). Question d'accès (tranchée par David le 2026-11-25) : personne ne lit ni n'écrit rien
-- de plus qu'avant ; chaque fonction passe par les policies d'`exercises` et d'`exercise_versions`.
--
-- 1. `latest_exercise_versions(ids)` : la dernière version (plus grand numéro) de chaque exercice
--    demandé, calculée par la base. Remplace la lecture de TOUTES les versions triées, que la
--    limite de 1 000 lignes de PostgREST aurait tronquée dès les premières v2.
-- 2. `create_exercise_version(exercice, note)` : « Nouvelle version » = recopie de la dernière
--    (ADR 0044 point 2), numéro suivant, en une instruction. Deux appels simultanés : le second
--    bute sur l'unicité (exercice, numéro) au lieu de créer un doublon.
-- 3. `save_exercise_with_version(exercice, identité, contenu, version)` : fiche d'identité et
--    contenu d'une version écrits ENSEMBLE (tout ou rien). Les clés de l'identité sont des
--    colonnes d'`exercises` ; une clé inconnue est refusée (rien n'est ignoré en silence).
-- 4. Déclencheur : toute écriture d'une version remet à jour `exercises.updated_at` (plan du site,
--    tri « modifié le »), correction après signalement comprise.
--
-- Messages d'erreur sans accent : PostgREST rend 500 sans code sur un message accentué.
--
-- ROLLBACK:BEGIN
-- drop trigger exercise_versions_touch_exercise on public.exercise_versions;
-- drop function public.touch_exercise_from_version();
-- drop function public.save_exercise_with_version(uuid, jsonb, jsonb, uuid);
-- drop function public.create_exercise_version(uuid, text);
-- drop function public.latest_exercise_versions(uuid[]);
-- ROLLBACK:END

-- ============================================================================
-- 1. Dernière version de chaque exercice
-- ============================================================================

create function public.latest_exercise_versions(p_exercise_ids uuid[])
returns setof public.exercise_versions
language sql
stable
security invoker
set search_path = ''
as $$
	select distinct on (v.exercise_id) v.*
	from public.exercise_versions v
	where v.exercise_id = any (p_exercise_ids)
	order by v.exercise_id, v.number desc;
$$;

comment on function public.latest_exercise_versions(uuid[]) is
	'Derniere version (plus grand numero) de chaque exercice demande, lisible par l''appelant (RLS d''exercise_versions). ADR 0044.';

revoke all on function public.latest_exercise_versions(uuid[]) from public;
grant execute on function public.latest_exercise_versions(uuid[]) to anon, authenticated, service_role;

-- ============================================================================
-- 2. Nouvelle version = recopie de la dernière
-- ============================================================================

create function public.create_exercise_version(p_exercise_id uuid, p_note text default null)
returns public.exercise_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_created public.exercise_versions;
begin
	insert into public.exercise_versions (
		exercise_id, number, note, variations, shared, generic_functions, created_by
	)
	select
		v.exercise_id,
		v.number + 1,
		nullif(btrim(p_note), ''),
		v.variations,
		v.shared,
		v.generic_functions,
		-- Sans compte connecté (client service : scripts, sauvegarde) : l'auteur de la version
		-- recopiée. Un compte connecté reste tenu par la policy (created_by = lui).
		coalesce((select auth.uid()), v.created_by)
	from public.exercise_versions v
	where v.exercise_id = p_exercise_id
	order by v.number desc
	limit 1
	returning * into v_created;

	-- Aucune version lisible : exercice absent ou illisible pour l'appelant
	if v_created.id is null then
		raise exception 'exercise not found' using errcode = 'P0002';
	end if;
	return v_created;
end;
$$;

comment on function public.create_exercise_version(uuid, text) is
	'Nouvelle version d''un exercice : recopie de la derniere, numero suivant (ADR 0044 point 2). Droits de l''appelant : la policy d''insertion d''exercise_versions decide.';

revoke all on function public.create_exercise_version(uuid, text) from public;
grant execute on function public.create_exercise_version(uuid, text) to authenticated, service_role;

-- ============================================================================
-- 3. Fiche d'identité + contenu d'une version, ensemble
-- ============================================================================

create function public.save_exercise_with_version(
	p_exercise_id uuid,
	p_identity jsonb,
	p_content jsonb,
	p_version_id uuid default null
)
returns public.exercise_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_key text;
	v_assignments text;
	v_rows integer;
	v_target uuid;
	v_saved public.exercise_versions;
begin
	if jsonb_typeof(coalesce(p_identity, '{}'::jsonb)) <> 'object'
		or jsonb_typeof(coalesce(p_content, '{}'::jsonb)) <> 'object' then
		raise exception 'identity and content must be objects' using errcode = '22023';
	end if;

	-- Fiche d'identité : chaque clé doit être une colonne d'`exercises` qu'on a le droit d'écrire
	-- ici. `updated_at` est toujours écrit (la ligne n'est jamais mise à jour à vide).
	v_assignments := 'updated_at = now()';
	for v_key in select jsonb_object_keys(coalesce(p_identity, '{}'::jsonb)) loop
		if v_key in ('id', 'created_by', 'created_at', 'updated_at', 'variations', 'shared', 'generic_functions')
			or not exists (
				select 1 from pg_catalog.pg_attribute a
				where a.attrelid = 'public.exercises'::regclass
					and a.attname = v_key and a.attnum > 0 and not a.attisdropped
			) then
			raise exception 'exercise column not writable: %', v_key using errcode = '22023';
		end if;
		v_assignments := v_assignments || format(', %I = r.%I', v_key, v_key);
	end loop;

	execute format(
		'update public.exercises e set %s from jsonb_populate_record(null::public.exercises, $1) r where e.id = $2',
		v_assignments
	) using coalesce(p_identity, '{}'::jsonb), p_exercise_id;
	get diagnostics v_rows = row_count;
	-- Refus RLS ou exercice absent : zéro ligne, sans erreur → on la lève
	if v_rows <> 1 then
		raise exception 'exercise not updated' using errcode = 'P0002';
	end if;

	-- Contenu : la version demandée (de CET exercice), sinon la dernière. Seules les clés données
	-- changent ; `null` les vide.
	v_target := coalesce(
		p_version_id,
		(select v.id from public.exercise_versions v
		 where v.exercise_id = p_exercise_id order by v.number desc limit 1)
	);

	-- Rien à changer dans le contenu : la version est seulement lue (son `updated_at` ne bouge pas)
	if coalesce(p_content, '{}'::jsonb) = '{}'::jsonb then
		select * into v_saved from public.exercise_versions v
		where v.id = v_target and v.exercise_id = p_exercise_id;
		if v_saved.id is null then
			raise exception 'version not found' using errcode = 'P0002';
		end if;
		return v_saved;
	end if;

	update public.exercise_versions v set
		variations = case when p_content ? 'variations'
			then nullif(p_content -> 'variations', 'null'::jsonb) else v.variations end,
		shared = case when p_content ? 'shared'
			then nullif(p_content -> 'shared', 'null'::jsonb) else v.shared end,
		generic_functions = case when p_content ? 'generic_functions'
			then (case when jsonb_typeof(p_content -> 'generic_functions') = 'array'
				then array(select jsonb_array_elements_text(p_content -> 'generic_functions'))
				else null end)
			else v.generic_functions end
	where v.id = v_target and v.exercise_id = p_exercise_id
	returning * into v_saved;

	if v_saved.id is null then
		raise exception 'version not found' using errcode = 'P0002';
	end if;
	return v_saved;
end;
$$;

comment on function public.save_exercise_with_version(uuid, jsonb, jsonb, uuid) is
	'Ecrit ensemble la fiche d''identite d''un exercice et le contenu d''une de ses versions (la derniere par defaut). Droits de l''appelant (RLS). ADR 0044.';

revoke all on function public.save_exercise_with_version(uuid, jsonb, jsonb, uuid) from public;
grant execute on function public.save_exercise_with_version(uuid, jsonb, jsonb, uuid)
	to authenticated, service_role;

-- ============================================================================
-- 4. Une version écrite → l'exercice est « modifié »
-- ============================================================================

create function public.touch_exercise_from_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
	-- Le déclencheur `exercises_updated_at` met l'heure ; un exercice en cours de suppression
	-- (cascade) n'a plus de ligne : zéro ligne, sans erreur.
	update public.exercises
	set updated_at = now()
	where id = coalesce(new.exercise_id, old.exercise_id);
	return null;
end;
$$;

comment on function public.touch_exercise_from_version() is
	'Toute ecriture d''une version remet a jour exercises.updated_at (plan du site, tri « modifie le »). ADR 0044.';

revoke all on function public.touch_exercise_from_version() from public;

create trigger exercise_versions_touch_exercise
	after insert or update or delete on public.exercise_versions
	for each row execute function public.touch_exercise_from_version();
