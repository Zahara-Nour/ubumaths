-- =============================================================================
-- Lien de consultation du cahier : renvoyer les fonctions déclarées des exercices
-- =============================================================================
--
-- Un exercice déclare les lettres qui sont des fonctions (`exercises.generic_functions`,
-- ex. {C,u,v}) ; sans elles, le PDF imprime `C'(x)` en erreur. L'écran et les PDF
-- des fiches les lisent déjà (PR #417) ; seule la fonction du lien public de cahier
-- ne les renvoyait pas.
--
-- QUESTION D'ACCÈS (posée à David, tranchée le 2026-09-24 : OUI)
--   Qui pourra lire quoi qu'il ne pouvait pas lire avant ? Le porteur du lien public
--   d'un cahier lira, en plus de ce qu'il lit déjà (énoncés, variations…), la liste
--   des lettres que chaque exercice CITÉ déclare comme fonctions. Aucune donnée
--   d'élève. Rien d'autre ne change : mêmes gardes (jeton, classe active, fiche citée
--   dans une séance publiée et passée), mêmes droits (anon, authenticated).
--
-- ADDITIVE : `create or replace` d'une fonction qui renvoie du jsonb ; une seule
-- clé ajoutée au sous-objet `exercise`. Base = définition en production, vérifiée
-- identique à 20260910180000_drop_legacy_homework_columns.sql le 2026-09-24.
--
-- ROLLBACK : rejouer la définition de 20260910180000_drop_legacy_homework_columns.sql
-- (lignes 151-278), c'est-à-dire la même fonction sans la ligne `'generic_functions'`.
-- =============================================================================

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
						'variations', e.variations,
						-- Lettres déclarées comme fonctions (C'(x) dans le PDF)
						'generic_functions', e.generic_functions
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
