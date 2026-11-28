-- ============================================================================
-- Suppressions refusées au lieu d'effacer en silence (écarts L112, L113)
-- ============================================================================
-- L112 : supprimer un point du programme effaçait sans prévenir l'acquisition
-- des élèves sur ce point (`student_point_state`) et la couverture du cahier de
-- texte (`journal_entry_points`), toutes deux en ON DELETE CASCADE. Désormais
-- la suppression est REFUSÉE tant qu'un élève a travaillé le point ou qu'une
-- séance le couvre : rattacher d'abord ce travail à un autre point (décision
-- de David, 2026-11-28). Les points ne se suppriment que par des migrations.
--
-- L113 : supprimer un exercice cité par une séance échouait sur le CHECK
-- `journal_entry_activities_kind_shape` (ON DELETE SET NULL est un UPDATE que
-- le CHECK réévalue). Le refus devient voulu : ON DELETE NO ACTION, code 23503,
-- et l'appli dit au prof combien de séances citent l'exercice (choix (b) de
-- David, 2026-11-28 : le cahier de texte garde la trace de ce qui a été fait).
--
-- NO ACTION et non RESTRICT : même refus (23503), mais vérifié en fin
-- d'instruction, donc une cascade qui efface aussi la ligne qui cite (compte
-- supprimé, par exemple) passe (audit de sécurité de la PR).
--
-- Accès : aucun. Personne ne gagne de lecture ni d'écriture ; seules des
-- suppressions qui effaçaient des données deviennent impossibles.
--
-- Rollback :
--   alter table public.student_point_state
--     drop constraint student_point_state_point_id_fkey,
--     add constraint student_point_state_point_id_fkey
--       foreign key (point_id) references public.curriculum_points (id) on delete cascade;
--   alter table public.journal_entry_points
--     drop constraint journal_entry_points_point_id_fkey,
--     add constraint journal_entry_points_point_id_fkey
--       foreign key (point_id) references public.curriculum_points (id) on delete cascade;
--   alter table public.journal_entry_activities
--     drop constraint journal_entry_activities_exercise_id_fkey,
--     add constraint journal_entry_activities_exercise_id_fkey
--       foreign key (exercise_id) references public.exercises (id) on delete set null;
-- ============================================================================

alter table public.student_point_state
	drop constraint student_point_state_point_id_fkey,
	add constraint student_point_state_point_id_fkey
		foreign key (point_id) references public.curriculum_points (id) on delete no action;

alter table public.journal_entry_points
	drop constraint journal_entry_points_point_id_fkey,
	add constraint journal_entry_points_point_id_fkey
		foreign key (point_id) references public.curriculum_points (id) on delete no action;

alter table public.journal_entry_activities
	drop constraint journal_entry_activities_exercise_id_fkey,
	add constraint journal_entry_activities_exercise_id_fkey
		foreign key (exercise_id) references public.exercises (id) on delete no action;
