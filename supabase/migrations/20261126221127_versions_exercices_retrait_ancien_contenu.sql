-- Versions d'un exercice : retrait de l'ancien contenu d'`exercises` (ADR 0044, chantier
-- versions-exercices, PR 4)
-- ============================================================================
--
-- ⛔ DESTRUCTIVE : supprime les colonnes `variations`, `shared` et `generic_functions`
-- d'`exercises`. À jouer seulement APRÈS le `deploy:prod` du code qui ne les lit plus (#3194) et
-- avec le go de David.
--
-- Ce qui est perdu : rien. Réconciliation sur la prod (lecture seule, 2026-11-26) : 428 exercices,
-- tous avec une version 1 dont le contenu est IDENTIQUE à ces trois colonnes (0 exercice dont le
-- contenu n'existerait que là). Depuis la PR 1, plus aucun code ne les lit ni ne les écrit ; le
-- contenu vit dans `exercise_versions`.
--
-- Question d'accès : personne ne gagne ni ne perd de lecture. Le lien de partage d'un exercice rend
-- la même forme qu'avant (fiche d'identité + contenu de la dernière version), au même public.
--
-- 1. Cinq fonctions qui lisaient encore ces colonnes et que plus rien n'appelle (grep de `src/` le
--    2026-11-26) : `get_my_exercise_assignments`, `get_teacher_exercise_assignments`,
--    `get_all_exercise_assignments`, `exercise_has_multiple_variations`, `exercise_variation_count`.
-- 2. `get_exercise_by_share_token` rendait une ligne d'`exercises` dont les colonnes de contenu
--    portaient la dernière version : elle rend désormais une table explicite, mêmes champs.
-- 3. Les index et règles de contrôle de ces colonnes, puis les colonnes.
--
-- La colonne `variables` (ancien format des exercices à valeurs tirées, 0 exercice en prod) reste :
-- encore écrite à la création d'un exercice et lue par d'autres fonctions (chantier à part).
--
-- Rollback : recrée les colonnes, les remplit avec la DERNIÈRE version de chaque exercice,
-- recrée index, règles et l'ancienne forme du lien de partage. Les cinq fonctions mortes ne sont
-- pas recréées (aucun appelant, ni dans ce code ni dans celui d'avant).
--
-- ROLLBACK:BEGIN
-- alter table public.exercises add column variations jsonb, add column shared jsonb,
--   add column generic_functions text[];
-- update public.exercises e set variations = v.variations, shared = v.shared,
--   generic_functions = v.generic_functions
--   from (select distinct on (exercise_id) exercise_id, variations, shared, generic_functions
--         from public.exercise_versions order by exercise_id, number desc) v
--   where v.exercise_id = e.id;
-- alter table public.exercises
--   add constraint exercises_variations_is_array
--     check ((variations is null) or (jsonb_typeof(variations) = 'array')),
--   add constraint exercises_shared_is_object
--     check ((shared is null) or (jsonb_typeof(shared) = 'object'));
-- create index idx_exercises_has_variations on public.exercises
--   using btree (jsonb_array_length(variations))
--   where ((variations is not null) and (jsonb_array_length(variations) > 1));
-- create index idx_exercises_variation_count on public.exercises
--   using btree (jsonb_array_length(coalesce(variations, '[]'::jsonb)))
--   where (variations is not null);
-- drop function public.get_exercise_by_share_token(text);
-- create function public.get_exercise_by_share_token(p_token text)
--   returns setof public.exercises
--   language plpgsql security definer set search_path = public, pg_temp
-- as $fn$
-- declare
--   v_exercise_id uuid;
-- begin
--   select exercise_id into v_exercise_id from public.exercise_share_tokens
--   where token = p_token and is_active = true and (expires_at is null or expires_at > now());
--   if v_exercise_id is null then
--     return;
--   end if;
--   update public.exercise_share_tokens
--   set last_accessed_at = now(), access_count = coalesce(access_count, 0) + 1
--   where token = p_token;
--   return query
--   select (jsonb_populate_record(e, jsonb_build_object(
--     'variations', dv.variations, 'shared', dv.shared,
--     'generic_functions', to_jsonb(dv.generic_functions)))).*
--   from public.exercises e
--   left join lateral (
--     select v.variations, v.shared, v.generic_functions from public.exercise_versions v
--     where v.exercise_id = e.id order by v.number desc limit 1
--   ) dv on true
--   where e.id = v_exercise_id;
-- end $fn$;
-- revoke all on function public.get_exercise_by_share_token(text) from public;
-- grant execute on function public.get_exercise_by_share_token(text)
--   to anon, authenticated, service_role;
-- ROLLBACK:END

-- ============================================================================
-- 1. Fonctions mortes
-- ============================================================================

drop function public.get_my_exercise_assignments();
drop function public.get_teacher_exercise_assignments();
drop function public.get_all_exercise_assignments();
drop function public.exercise_has_multiple_variations(uuid);
drop function public.exercise_variation_count(uuid);

-- ============================================================================
-- 2. Lien de partage d'un exercice : fiche d'identité + contenu de la dernière version
-- ============================================================================

-- Le type rendu change (plus une ligne d'`exercises`) : drop + create, droits remis à l'identique.
drop function public.get_exercise_by_share_token(text);

create function public.get_exercise_by_share_token(p_token text)
returns table (
	id uuid,
	title text,
	source text,
	grades text[],
	topic text,
	created_at timestamptz,
	updated_at timestamptz,
	created_by uuid,
	is_public boolean,
	variables jsonb,
	distribution_mode text,
	slug text,
	resources jsonb,
	category text,
	source_type_id uuid,
	search_indexed boolean,
	translations jsonb,
	variations jsonb,
	shared jsonb,
	generic_functions text[]
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
	v_exercise_id uuid;
begin
	-- Le jeton exact, actif et non expiré, sinon rien.
	select t.exercise_id into v_exercise_id
	from public.exercise_share_tokens t
	where t.token = p_token
		and t.is_active = true
		and (t.expires_at is null or t.expires_at > now());

	if v_exercise_id is null then
		return; -- aucune ligne : jeton inconnu, révoqué ou expiré
	end if;

	-- Comptage des accès (incrément atomique dans l'UPDATE).
	update public.exercise_share_tokens t
	set last_accessed_at = now(),
		access_count = coalesce(t.access_count, 0) + 1
	where t.token = p_token;

	-- Hors fiche : le contenu de la DERNIÈRE version (ADR 0044).
	return query
	select
		e.id, e.title, e.source, e.grades, e.topic, e.created_at, e.updated_at, e.created_by,
		e.is_public, e.variables, e.distribution_mode, e.slug, e.resources, e.category,
		e.source_type_id, e.search_indexed, e.translations,
		dv.variations, dv.shared, dv.generic_functions
	from public.exercises e
	left join lateral (
		select v.variations, v.shared, v.generic_functions
		from public.exercise_versions v
		where v.exercise_id = e.id
		order by v.number desc
		limit 1
	) dv on true
	where e.id = v_exercise_id;
end;
$$;

revoke all on function public.get_exercise_by_share_token(text) from public;
grant execute on function public.get_exercise_by_share_token(text)
	to anon, authenticated, service_role;

-- ============================================================================
-- 3. Index, règles de contrôle, colonnes
-- ============================================================================

drop index public.idx_exercises_has_variations;
drop index public.idx_exercises_variation_count;

alter table public.exercises
	drop constraint exercises_variations_is_array,
	drop constraint exercises_shared_is_object;

alter table public.exercises
	drop column variations,
	drop column shared,
	drop column generic_functions;
