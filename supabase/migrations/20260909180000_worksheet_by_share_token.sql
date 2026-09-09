-- ============================================================================
-- Ouvrir une fiche CITÉE, depuis le lien de consultation du cahier de texte
-- ============================================================================
-- Le lien de consultation existe parce que tous les élèves n'ont pas de compte.
-- Il leur montrait « Evaluation : Produit scalaire » sans qu'ils puissent rien
-- en faire : la moitié de l'information.
--
-- QUESTION D'ACCÈS, tranchée par David : le jeton n'ouvre PAS « les fiches ».
-- Il ouvre exactement les fiches **citées dans une séance visible de ce
-- cahier** — donc celles que le professeur a délibérément mentionnées. Le
-- contrôle éditorial reste entier : ce qui n'est pas cité reste inaccessible.
--
-- Les gardes sont RIGOUREUSEMENT celles de `get_class_journal_by_share_token`,
-- volontairement recopiées plutôt que supposées :
--   jeton actif et non expiré · classe active · séance publiée · date <= today
-- Une séance publiée à l'avance ne doit pas fuiter le programme du prochain
-- contrôle ; une classe archivée vaut révocation de son lien.
--
-- Le lien de citation est cherché dans le texte des séances, sous la forme
-- `[[worksheet:<uuid>` — la grammaire des références. L'uuid est un PARAMÈTRE
-- TYPÉ, jamais concaténé depuis une chaîne libre : aucune injection possible
-- dans le motif.
--
-- ⚠️ CE QUE CETTE FONCTION NE RENVOIE PAS : les corrections. Elle expose les
-- énoncés (`variations`), dont un consommateur pourrait extraire les
-- solutions ; c'est pourquoi l'appelant compose le PDF en mode « fiche » et que
-- la bascule « correction » est désactivée sur la page publique. Si un jour on
-- veut être strict côté base, il faudra filtrer `variations` ici.
--
-- SECURITY DEFINER : le lecteur est `anon`, qui n'a par construction aucun
-- droit sur `worksheets`. C'est le jeton, vérifié ci-dessous, qui autorise.
--
-- ROLLBACK : drop function if exists public.get_worksheet_by_share_token(text, uuid);
-- ============================================================================

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
	select exists (
		select 1
		from public.class_journal_entries e
		where e.class_id = v_class_id
			and e.is_published
			and e.entry_date <= current_date
			and (
				position('[[worksheet:' || p_worksheet_id::text in coalesce(e.lesson_content, '')) > 0
				or position('[[worksheet:' || p_worksheet_id::text in coalesce(e.homework_content, '')) > 0
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

comment on function public.get_worksheet_by_share_token(text, uuid) is
	'Renvoie une fiche d''exercices à un lecteur SANS COMPTE, uniquement si elle est CITÉE dans une séance visible du cahier désigné par le jeton. Mêmes gardes que get_class_journal_by_share_token : jeton actif et non expiré, classe active, séance publiée et non future. Ne renvoie jamais rien sur une fiche non citée — même réponse qu''un jeton invalide.';

revoke all on function public.get_worksheet_by_share_token(text, uuid) from public;
grant execute on function public.get_worksheet_by_share_token(text, uuid) to anon;
grant execute on function public.get_worksheet_by_share_token(text, uuid) to authenticated;
