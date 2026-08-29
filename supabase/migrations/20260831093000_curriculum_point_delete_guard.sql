-- ============================================================================
-- Référentiel — savoir ce qu'un point emporterait avec lui
-- ============================================================================
-- Six tables référencent `curriculum_points`, et cinq le font en CASCADE :
--
--   exercise_curriculum_points     tags d'exercices          CASCADE
--   journal_entry_points           couverture cahier de texte CASCADE
--   student_point_state            acquisition des élèves     CASCADE
--   curriculum_point_automatismes  listes d'automatismes      CASCADE
--   srs_anti_fraud_flags           flags SRS                  CASCADE
--   question_template_points       tags de questions          RESTRICT
--
-- Autrement dit : un clic sur « Supprimer » dans la page Programme efface
-- aujourd'hui, sans un mot, la couverture du cahier de texte et l'historique
-- d'acquisition des élèves attachés au point. Seul le tag de questions
-- protesterait — et avec un message Postgres illisible.
--
-- Ces deux fonctions donnent à l'app de quoi proposer « Archiver » quand c'est
-- la bonne action, et refuser la suppression avec une phrase compréhensible.
-- Elles ne remplacent pas la décision : c'est l'API qui tranche.
--
-- SECURITY DEFINER : le comptage doit voir TOUTES les lignes. Compter à travers
-- les politiques RLS de l'appelant renverrait zéro là où un élève a de
-- l'historique invisible pour le prof, et autoriserait la suppression.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ce qui retient un point donné, par nature
-- ---------------------------------------------------------------------------
-- Renvoie `{}` si rien ne le retient, sinon les compteurs non nuls — de quoi
-- écrire « 3 exercices et 12 élèves » plutôt que « violation de contrainte ».

create or replace function public.curriculum_point_reference_counts(p_point_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	SELECT jsonb_strip_nulls(jsonb_build_object(
		'question_templates', nullif((SELECT count(*) FROM public.question_template_points      WHERE point_id = p_point_id), 0),
		'exercises',          nullif((SELECT count(*) FROM public.exercise_curriculum_points    WHERE point_id = p_point_id), 0),
		'journal_entries',    nullif((SELECT count(*) FROM public.journal_entry_points          WHERE point_id = p_point_id), 0),
		'student_states',     nullif((SELECT count(*) FROM public.student_point_state           WHERE point_id = p_point_id), 0),
		'automatisme_lists',  nullif((SELECT count(*) FROM public.curriculum_point_automatismes WHERE point_id = p_point_id), 0),
		'srs_flags',          nullif((SELECT count(*) FROM public.srs_anti_fraud_flags          WHERE capacity_point_id = p_point_id), 0)
	));
$function$;

comment on function public.curriculum_point_reference_counts(uuid) is
	'Ce qu''une suppression du point emporterait, par nature. `{}` = point libre, supprimable sans perte.';

-- ---------------------------------------------------------------------------
-- 2. Les points retenus d'un niveau, en une requête
-- ---------------------------------------------------------------------------
-- La page Programme affiche l'arbre entier : interroger la fonction ci-dessus
-- point par point ferait 153 allers-retours. Celle-ci répond pour tout le
-- niveau, et l'UI sait alors quel bouton montrer sur chaque ligne.

create or replace function public.curriculum_referenced_points(p_grade text)
returns table (point_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	SELECT p.id
	  FROM public.curriculum_points p
	  JOIN public.curriculum_objectives o ON o.id = p.objective_id
	  JOIN public.curriculum_themes t     ON t.id = o.theme_id
	 WHERE t.grade = p_grade
	   AND (
	        EXISTS (SELECT 1 FROM public.question_template_points      x WHERE x.point_id = p.id)
	     OR EXISTS (SELECT 1 FROM public.exercise_curriculum_points    x WHERE x.point_id = p.id)
	     OR EXISTS (SELECT 1 FROM public.journal_entry_points          x WHERE x.point_id = p.id)
	     OR EXISTS (SELECT 1 FROM public.student_point_state           x WHERE x.point_id = p.id)
	     OR EXISTS (SELECT 1 FROM public.curriculum_point_automatismes x WHERE x.point_id = p.id)
	     OR EXISTS (SELECT 1 FROM public.srs_anti_fraud_flags          x WHERE x.capacity_point_id = p.id)
	   );
$function$;

comment on function public.curriculum_referenced_points(text) is
	'Les points d''un niveau qu''on ne peut plus supprimer sans perte — à archiver plutôt.';

-- Lecture seule et sans effet de bord : ouvrir aux authentifiés suffit, l'API
-- vérifie déjà le rôle avant d'appeler.
grant execute on function public.curriculum_point_reference_counts(uuid) to authenticated;
grant execute on function public.curriculum_referenced_points(text) to authenticated;
