-- ============================================================================
-- ⚠️ MIGRATION DESTRUCTIVE — suppression de l'ancien devoir unique
-- ============================================================================
-- Retire `class_journal_entries.homework_content` et `.homework_due_date`,
-- remplacées par la table `journal_entry_homework` (un travail par échéance,
-- migration 20260910110000).
--
-- ---------------------------------------------------------------------------
-- CE QUI EST PERDU : RIEN. Réconciliation faite sur la prod EU le 2026-09-10 :
-- ---------------------------------------------------------------------------
--   select count(*) as total_seances,
--          count(*) filter (where homework_content is not null) as avec_contenu,
--          count(*) filter (where homework_due_date is not null) as avec_echeance,
--          count(*) filter (where btrim(coalesce(homework_content,'')) <> '') as non_vide
--   from class_journal_entries;
--   → total_seances = 1, avec_contenu = 0, avec_echeance = 0, non_vide = 0
--
-- Les deux colonnes n'ont jamais porté la moindre donnée, et plus aucun code ne
-- les écrit depuis le déploiement du nouveau format. Suppression décidée par
-- David après lecture de ce constat.
--
-- ---------------------------------------------------------------------------
-- INVENTAIRE DES USAGES (l'étape que la seule réconciliation de données ne
-- remplace pas — c'est elle qui manquait le 2026-09-08, six requêtes cassées)
-- ---------------------------------------------------------------------------
-- `grep -rn "homework_content\|homework_due_date" src supabase/migrations` a
-- révélé, au-delà du code applicatif retiré dans la même PR, DEUX fonctions SQL
-- que le typecheck ne pouvait pas voir :
--
--   1. get_class_journal_by_share_token(text)  — 20260910110000:…
--      Renvoie encore les clés `homework_content` / `homework_due_date` dans son
--      JSON. Réécrite ci-dessous sans elles.
--
--   2. get_worksheet_by_share_token(text, uuid) — 20260909180000:79
--      Cherche `[[worksheet:…]]` dans `homework_content`. Réécrite ci-dessous
--      pour chercher dans `journal_entry_homework`.
--
-- Et les SCHÉMAS ZOD de `validation/journal.ts`, qui nommaient ces colonnes en
-- clés d'objet — l'angle mort exact de l'incident du 2026-09-09. Traités dans la
-- même PR.
--
-- ---------------------------------------------------------------------------
-- ⚠️ ORDRE DE DÉPLOIEMENT
-- ---------------------------------------------------------------------------
-- Cette migration se pousse APRÈS que le code qui ne lit plus ces colonnes soit
-- en production. PostgreSQL ne suit pas les dépendances de colonnes à l'intérieur
-- d'un corps de fonction : les deux fonctions ci-dessus ne cassent qu'à
-- l'exécution, donc elles sont remplacées ICI, avant le DROP.
--
-- ROLLBACK (structure seule — il n'y a aucune donnée à restaurer) :
--   alter table public.class_journal_entries
--     add column homework_content text,
--     add column homework_due_date date;
--   -- puis restaurer les deux fonctions depuis 20260909180000 et 20260910110000.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Le cahier partagé, sans les clés de l'ancien format
-- ---------------------------------------------------------------------------
create or replace function public.get_class_journal_by_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_token record;
	v_result jsonb;
begin
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;

	select t.id, t.class_id into v_token
	from public.class_journal_share_tokens t
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now());

	if not found then
		return null;
	end if;

	select jsonb_build_object(
		'class_name', c.name,
		'class_grade', c.grade,
		'entries', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', e.id,
					'entry_date', e.entry_date,
					'lesson_content', e.lesson_content,
					'homework', coalesce((
						select jsonb_agg(
							jsonb_build_object(
								'id', h.id,
								'content', h.content,
								'due_date', h.due_date
							)
							order by h.display_order, h.created_at
						)
						from public.journal_entry_homework h
						where h.entry_id = e.id
					), '[]'::jsonb)
				)
				order by e.entry_date desc
			)
			from public.class_journal_entries e
			where e.class_id = v_token.class_id
				and e.is_published
				and e.entry_date <= current_date
		), '[]'::jsonb)
	) into v_result
	from public.classes c
	where c.id = v_token.class_id
		and c.is_active;

	if v_result is null then
		return null;
	end if;

	update public.class_journal_share_tokens
	set access_count = access_count + 1,
		last_accessed_at = now()
	where id = v_token.id;

	return v_result;
end;
$$;

comment on function public.get_class_journal_by_share_token(text) is
	'Résout un token de partage en cahier de texte lisible : entrées publiées et non futures d''une classe, avec leurs travaux à faire. SECURITY DEFINER car l''appelant est anonyme par construction. Renvoie NULL sans distinguer révoqué / expiré / inexistant.';

revoke all on function public.get_class_journal_by_share_token(text) from public;
grant execute on function public.get_class_journal_by_share_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. La fiche accessible par le lien : chercher la citation au bon endroit
-- ---------------------------------------------------------------------------
-- ⚠️ CE N'EST PAS QU'UNE ADAPTATION : c'est une CORRECTION.
--
-- Cette fonction n'ouvre une fiche que si elle est CITÉE dans une séance visible
-- du cahier. Elle ne regardait que `lesson_content` et l'ancienne colonne de
-- devoir. Depuis que le travail à faire vit dans `journal_entry_homework`, une
-- fiche citée UNIQUEMENT dans un devoir n'était plus reconnue : l'élève cliquait
-- le lien depuis le cahier partagé, et la fonction répondait null — la fiche
-- restait inaccessible, sans explication.
--
-- Le reste du corps est repris à l'identique de la version déployée
-- (`pg_get_functiondef`), pour ne pas introduire de dérive au passage.
create or replace function public.get_worksheet_by_share_token(
	p_token text,
	p_worksheet_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	v_class_id uuid;
	v_cite boolean;
	v_result jsonb;
begin
	-- Garde de forme avant toute lecture.
	if p_token is null or char_length(p_token) not between 16 and 64 then
		return null;
	end if;
	if p_worksheet_id is null then
		return null;
	end if;

	select t.class_id into v_class_id
	from public.class_journal_share_tokens t
	join public.classes c on c.id = t.class_id
	where t.token = p_token
		and t.is_active
		and (t.expires_at is null or t.expires_at > now())
		and c.is_active;

	if not found then
		return null;
	end if;

	-- La fiche est-elle CITÉE dans une séance visible de ce cahier ?
	-- Dans son contenu de cours, OU dans l'un de ses travaux à faire.
	select exists (
		select 1
		from public.class_journal_entries e
		where e.class_id = v_class_id
			and e.is_published
			and e.entry_date <= current_date
			and (
				position('[[worksheet:' || p_worksheet_id::text in coalesce(e.lesson_content, '')) > 0
				or exists (
					select 1
					from public.journal_entry_homework h
					where h.entry_id = e.id
						and position('[[worksheet:' || p_worksheet_id::text in h.content) > 0
				)
			)
	) into v_cite;

	-- Même réponse qu'un jeton invalide : ne rien apprendre sur l'existence de
	-- la fiche à qui essaierait des identifiants au hasard.
	if not v_cite then
		return null;
	end if;

	select jsonb_build_object(
		'id', w.id,
		'title', w.title,
		'description', w.description,
		'type', w.type,
		'config', w.config,
		'status', w.status,
		'grades', w.grades,
		'translations', w.translations,
		'total_points', w.total_points,
		'estimated_duration_minutes', w.estimated_duration_minutes,
		'sections', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', s.id,
					'worksheet_id', s.worksheet_id,
					'title', s.title,
					'instructions', s.instructions,
					'position', s.position,
					'points_total', s.points_total,
					'translations', s.translations
				) order by s.position
			)
			from public.worksheet_sections s
			where s.worksheet_id = w.id
		), '[]'::jsonb),
		'exercises', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', we.id,
					'worksheet_id', we.worksheet_id,
					'exercise_id', we.exercise_id,
					'section_id', we.section_id,
					'position', we.position,
					'points', we.points,
					'is_essential', we.is_essential,
					'custom_instructions', we.custom_instructions,
					'variant_mode', we.variant_mode,
					'variant_config', we.variant_config,
					'variation_index', we.variation_index,
					'translations', we.translations,
					'exercise', jsonb_build_object(
						'id', e.id,
						'title', e.title,
						'variables', e.variables,
						'shared', e.shared,
						'variations', e.variations
					)
				) order by we.position
			)
			from public.worksheet_exercises we
			join public.exercises e on e.id = we.exercise_id
			where we.worksheet_id = w.id
		), '[]'::jsonb)
	) into v_result
	from public.worksheets w
	where w.id = p_worksheet_id;

	return v_result;
end;
$function$;

-- Rejoué bien que `create or replace` préserve l'ACL existante — et l'ACL en
-- production est correcte, vérifié. C'est l'ASYMÉTRIE qui est dangereuse : le
-- jour où cette migration s'exécuterait sur une base où la fonction n'existe
-- pas, `create` la doterait du `EXECUTE` à PUBLIC par défaut, sans aucun revoke
-- pour le retirer. C'est la cause racine de l'audit d'août.
revoke all on function public.get_worksheet_by_share_token(text, uuid) from public;
grant execute on function public.get_worksheet_by_share_token(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Le DROP
-- ---------------------------------------------------------------------------
-- Sans `cascade`, mais sans se raconter d'histoire sur ce que ça protège :
--
--   * une VUE ou une POLICY qui référencerait ces colonnes ferait bien ÉCHOUER
--     la migration — c'est le filet qu'on veut ;
--   * un INDEX ou une CONTRAINTE DE TABLE, en revanche, est supprimé
--     AUTOMATIQUEMENT avec sa colonne, `cascade` ou non, et sans avertissement.
--
-- La prod porte précisément le second cas : `idx_journal_entries_homework_due`,
-- index partiel sur `homework_due_date`. Il partira en silence — sans
-- conséquence, puisqu'il ne portait que sur la colonne supprimée. L'inventaire
-- `pg_depend` sur les deux colonnes ne remonte que lui : aucune vue, aucune
-- policy, aucune contrainte, aucune colonne générée. Local et prod portent le
-- même index, les deux environnements se comporteront donc à l'identique.
alter table public.class_journal_entries
	drop column homework_content,
	drop column homework_due_date;

-- ---------------------------------------------------------------------------
-- 4. Garde-fou
-- ---------------------------------------------------------------------------
do $$
declare
	v_restantes integer;
begin
	select count(*) into v_restantes
	from information_schema.columns
	where table_schema = 'public'
		and table_name = 'class_journal_entries'
		and column_name in ('homework_content', 'homework_due_date');

	if v_restantes > 0 then
		raise exception 'Les colonnes de l''ancien format subsistent (%)', v_restantes;
	end if;
end;
$$;
