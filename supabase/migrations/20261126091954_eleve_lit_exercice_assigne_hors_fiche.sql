-- ============================================================================
-- Un élève lit l'exercice qui lui est assigné hors fiche (écart E78)
-- ============================================================================
-- Constat : `student_has_exercise_access(uuid)` garde la policy de lecture
-- d'`exercises` (« Students can view assigned exercises ») et ne regardait que
-- les fiches (`worksheet_exercises`). Un exercice assigné directement
-- (`exercise_assignments`) restait masqué : la route d'accès
-- (`student_has_exercise_access(uuid, uuid)`, l'AUTRE surcharge) répondait oui,
-- puis la page de l'élève ne trouvait pas la ligne → 404 « Exercice non trouvé ».
-- Mesuré en prod le 2026-11-26 (lecture seule) : 0 ligne dans
-- `exercise_assignments` ; aucun accès ne change pour les données existantes.
--
-- Accès (question tranchée par David le 2026-11-25 et le 2026-11-26) :
--   - assigné à UN ÉLÈVE : cet élève lit l'exercice ; son camarade de classe non ;
--   - assigné à UNE CLASSE : ses membres ACTIFS le lisent ; ni l'élève archivé,
--     ni l'élève d'une autre classe (même règle que 20260912150000) ;
--   - assignation « public » (onglet « Rendre public », que David retire) :
--     n'ouvre RIEN ici. La surcharge à deux arguments la compte encore ; sans
--     écran pour en créer, elle ne rencontre plus de ligne ;
--   - assignation désactivée (`is_active = false`) : n'ouvre rien.
-- Les versions (`exercise_versions`) et le rangement (`exercise_classifications`)
-- suivent : leurs policies de lecture passent par la RLS d'`exercises`.
--
-- Garde (security-auditor, 2026-11-26) : l'assignation ne compte que si elle a
-- été posée par l'AUTEUR de l'exercice (`exercises.created_by = assigned_by`).
-- Sans elle, la policy d'insertion `exercise_assignments_insert` (qui ne regarde
-- pas à qui est l'exercice) laissait un prof s'assigner à lui-même l'exercice
-- privé d'un autre prof, puis le lire : le partage entre profs, fermé par
-- 20260618093000, se rouvrait. L'application n'assigne que ses propres exercices
-- (`createExerciseAssignment`, `createBulkAssignments`).
--
-- Additive : une fonction remplacée, aucune donnée touchée. Le type est vérifié
-- avec la colonne (`assigned_to_type`) pour ne pas dépendre de la seule
-- contrainte `assignment_student_consistency`.
--
-- Rollback : rejouer la définition de 20260911100000 :
--   create or replace function public.student_has_exercise_access(p_exercise_id uuid)
--   returns boolean language sql stable security definer
--   set search_path to 'public', 'pg_temp'
--   as $function$
--     select exists (
--       select 1 from worksheet_exercises we
--       where we.exercise_id = p_exercise_id
--         and public.student_has_worksheet_access(we.worksheet_id)
--     );
--   $function$;
-- ============================================================================

create or replace function public.student_has_exercise_access(p_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
	select
		-- Par une fiche distribuée à l'élève (inchangé)
		exists (
			select 1
			from worksheet_exercises we
			where we.exercise_id = p_exercise_id
				and public.student_has_worksheet_access(we.worksheet_id)
		)
		-- Par une assignation hors fiche, active, à lui ou à sa classe
		or exists (
			select 1
			from exercise_assignments ea
			-- L'assignation ne compte que si elle vient de l'AUTEUR de l'exercice
			join exercises e on e.id = ea.exercise_id and e.created_by = ea.assigned_by
			where ea.exercise_id = p_exercise_id
				and ea.is_active = true
				and (
					(ea.assigned_to_type = 'student' and ea.student_id = auth.uid())
					or (
						ea.assigned_to_type = 'class'
						and ea.class_id in (
							select cm.class_id
							from class_members cm
							where cm.student_id = auth.uid()
								and cm.status = 'active'
						)
					)
				)
		);
$function$;

comment on function public.student_has_exercise_access(uuid) is
	'Un eleve a-t-il acces a cet exercice ? Par une fiche qui lui est distribuee (student_has_worksheet_access) ou par une assignation hors fiche active posee par l''auteur de l''exercice, a lui ou a une classe dont il est membre actif. Une assignation de type public n''ouvre rien.';
