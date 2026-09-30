-- Supprimer les anciennes tables d'évaluation (assessments)
-- ==========================================================
--
-- Chantier 4, étape 2 (PR 3). ⛔ DESTRUCTIVE — approuvée par David après
-- explication. Les nouvelles tables (`series`, `evaluations`,
-- `evaluation_assignments`, 20260930130000 / 20260930140000) sont en prod et le
-- code ne lit plus les anciennes (#560, #561).
--
-- Prod mesurée le 2026-09-30 : `assessments` 1 ligne (recopiée, 0 manquant),
-- `assessment_assignments` 0, `test_sessions.assignment_id` 0 non nul,
-- `evaluation_tasks.assessment_id` 0, `journal_entry_activities.assessment_id` 0,
-- `resource_tags` kind 'assessment' 0.
--
-- ── CE QUI EST PERDU ─────────────────────────────────────────────────────────
--   tables `assessments`, `assessment_assignments` (et leurs 11 policies, index,
--   trigger) ; vue `assessment_results` ; colonnes `test_sessions.assignment_id`,
--   `evaluation_tasks.assessment_id`, `journal_entry_activities.assessment_id` ;
--   fonctions get_assessment_results_for_{admin,student,teacher},
--   assessment_curriculum_points, is_assessment_owner,
--   student_has_assignment_for_assessment, link_existing_assessments_to_periods,
--   update_assessments_updated_at, copy_legacy_assessments ; contrainte
--   `test_sessions_flash_sans_assignation` (sans objet).
--   GARDÉ : `evaluations.legacy_assessment_id` (anciens liens prof, getEvaluation).
--
-- ── RECRÉÉ ───────────────────────────────────────────────────────────────────
--   · `admin_content_stats` : mêmes colonnes, même ordre, security_invoker, mêmes
--     GRANT ; `total_assessments` compte `evaluations`.
--   · `chk_evaluation_task_source`, `journal_entry_activities_kind_shape` : sans
--     `assessment_id` (la place « évaluation » n'est plus tenue que par
--     `evaluation_id`).
--
-- ── QUESTION D'ACCÈS : personne ne gagne de lecture ──────────────────────────
--   Aucune policy des tables gardées n'est touchée (aucune ne citait les
--   colonnes supprimées). `admin_content_stats` est `security_invoker` : chacun
--   y compte les évaluations que la RLS de `evaluations` lui montre déjà (admin :
--   toutes ; prof : les siennes ; élève : les publiées qui lui sont assignées) ;
--   anon reste refusé (42501). En miroir, perdu : les lectures des tables
--   supprimées, que le code n'utilise plus.
--
-- Garde-fous (§1) : la migration ÉCHOUE, sans rien supprimer, si une donnée
-- ancienne n'a pas son pendant dans les nouvelles tables au moment du push.
--
-- Tests : tests/integration/drop-assessments.test.ts (rouge sans la migration).
--
-- ── ROLLBACK (une transaction ; recrée la structure et la seule ligne de prod) ──
-- BEGIN;
--
-- -- R1. Tables, contraintes, index, RLS, droits (pg_dump du schéma local)
--
-- CREATE TABLE public.assessments (
--     id uuid DEFAULT gen_random_uuid() NOT NULL,
--     title text NOT NULL,
--     grade text NOT NULL,
--     description text,
--     created_by uuid NOT NULL,
--     categories jsonb NOT NULL,
--     settings jsonb DEFAULT '{"deadline": null, "time_limit": null, "max_attempts": null, "shuffle_questions": true}'::jsonb NOT NULL,
--     status text DEFAULT 'draft'::text NOT NULL,
--     created_at timestamp with time zone DEFAULT now() NOT NULL,
--     updated_at timestamp with time zone DEFAULT now() NOT NULL,
--     academic_period_id uuid,
--     CONSTRAINT assessments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
--     CONSTRAINT assessments_valid_grade CHECK ((grade = ANY (ARRAY['CP'::text, 'CE1'::text, 'CE2'::text, 'CM1'::text, 'CM2'::text, '6'::text, '5'::text, '4'::text, '3'::text, '2'::text, '1_GEN'::text, 'T_GEN'::text, '1_SPE'::text, 'T_SPE'::text, 'T_EXP'::text, 'T_COMP'::text, '1_STMG'::text, 'T_STMG'::text])))
-- );
--
-- COMMENT ON TABLE public.assessments IS 'Teacher-created assessments/evaluations based on question categories';
--
-- COMMENT ON COLUMN public.assessments.grade IS 'Assessment grade level using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_STMG, T_STMG';
--
-- COMMENT ON COLUMN public.assessments.categories IS 'JSONB array of CartItem objects defining question selection';
--
-- COMMENT ON COLUMN public.assessments.settings IS 'JSONB object: max_attempts (int|null), time_limit (seconds|null), deadline (ISO timestamp|null), shuffle_questions (boolean)';
--
-- COMMENT ON COLUMN public.assessments.academic_period_id IS 'Academic period this assessment belongs to (auto-assigned based on created_at date)';
--
-- CREATE TABLE public.assessment_assignments (
--     id uuid DEFAULT gen_random_uuid() NOT NULL,
--     assessment_id uuid NOT NULL,
--     class_id uuid,
--     student_id uuid,
--     assigned_by uuid NOT NULL,
--     assigned_at timestamp with time zone DEFAULT now() NOT NULL,
--     CONSTRAINT assignment_target_check CHECK ((((class_id IS NOT NULL) AND (student_id IS NULL)) OR ((class_id IS NULL) AND (student_id IS NOT NULL))))
-- );
--
-- COMMENT ON TABLE public.assessment_assignments IS 'Tracks which assessments are assigned to which classes or students';
--
-- ALTER TABLE ONLY public.assessment_assignments
--     ADD CONSTRAINT assessment_assignments_pkey PRIMARY KEY (id);
--
-- ALTER TABLE ONLY public.assessments
--     ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);
--
-- CREATE INDEX idx_assessment_assignments_assessment_class ON public.assessment_assignments USING btree (assessment_id, class_id);
--
-- COMMENT ON INDEX public.idx_assessment_assignments_assessment_class IS 'Optimizes class-based assessment assignment queries';
--
-- CREATE INDEX idx_assessment_assignments_assessment_id ON public.assessment_assignments USING btree (assessment_id);
--
-- CREATE INDEX idx_assessment_assignments_assessment_student ON public.assessment_assignments USING btree (assessment_id, student_id);
--
-- COMMENT ON INDEX public.idx_assessment_assignments_assessment_student IS 'Optimizes assessment assignment lookups by assessment and student';
--
-- CREATE INDEX idx_assessment_assignments_assigned_by ON public.assessment_assignments USING btree (assigned_by);
--
-- CREATE INDEX idx_assessment_assignments_class_id ON public.assessment_assignments USING btree (class_id) WHERE (class_id IS NOT NULL);
--
-- CREATE INDEX idx_assessment_assignments_student_id ON public.assessment_assignments USING btree (student_id) WHERE (student_id IS NOT NULL);
--
-- CREATE INDEX idx_assessments_created_at ON public.assessments USING btree (created_at DESC);
--
-- CREATE INDEX idx_assessments_created_by ON public.assessments USING btree (created_by);
--
-- CREATE INDEX idx_assessments_grade ON public.assessments USING btree (grade);
--
-- CREATE INDEX idx_assessments_period ON public.assessments USING btree (academic_period_id);
--
-- CREATE INDEX idx_assessments_status ON public.assessments USING btree (status);
--
-- ALTER TABLE ONLY public.assessment_assignments
--     ADD CONSTRAINT assessment_assignments_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;
--
-- ALTER TABLE ONLY public.assessment_assignments
--     ADD CONSTRAINT assessment_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
--
-- ALTER TABLE ONLY public.assessment_assignments
--     ADD CONSTRAINT assessment_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;
--
-- ALTER TABLE ONLY public.assessment_assignments
--     ADD CONSTRAINT assessment_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
--
-- ALTER TABLE ONLY public.assessments
--     ADD CONSTRAINT assessments_academic_period_id_fkey FOREIGN KEY (academic_period_id) REFERENCES public.academic_periods(id) ON DELETE SET NULL;
--
-- ALTER TABLE ONLY public.assessments
--     ADD CONSTRAINT assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
--
-- ALTER TABLE public.assessment_assignments ENABLE ROW LEVEL SECURITY;
--
-- ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
--
-- GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE public.assessments TO anon;
--
-- GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE public.assessments TO authenticated;
--
-- GRANT ALL ON TABLE public.assessments TO service_role;
--
-- GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE public.assessment_assignments TO anon;
--
-- GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE public.assessment_assignments TO authenticated;
--
-- GRANT ALL ON TABLE public.assessment_assignments TO service_role;
--
-- -- R2. Fonctions d'aide aux policies et au trigger (pg_get_functiondef)
--
-- CREATE OR REPLACE FUNCTION public.is_assessment_owner(p_assessment_id uuid)
--  RETURNS boolean
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   SELECT EXISTS (
--     SELECT 1
--     FROM public.assessments a
--     WHERE a.id = p_assessment_id
--       AND a.created_by = auth.uid()
--   );
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.student_has_assignment_for_assessment(p_assessment_id uuid)
--  RETURNS boolean
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- 	select exists (
-- 		select 1
-- 		from public.assessment_assignments aa
-- 		where aa.assessment_id = p_assessment_id
-- 			and (
-- 				aa.student_id = auth.uid()
-- 				or exists (
-- 					select 1
-- 					from public.class_members cm
-- 					where cm.class_id = aa.class_id
-- 						and cm.student_id = auth.uid()
-- 						and cm.status = 'active'
-- 				)
-- 			)
-- 	);
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.update_assessments_updated_at()
--  RETURNS trigger
--  LANGUAGE plpgsql
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END;
-- $function$
-- ;
--
-- -- R3. Trigger et policies
--
-- CREATE TRIGGER update_assessments_updated_at_trigger BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_assessments_updated_at();
--
-- CREATE POLICY "Admins can manage all assessments" ON public.assessments USING (public.is_admin()) WITH CHECK (public.is_admin());
--
-- CREATE POLICY "Admins can manage all assignments" ON public.assessment_assignments USING (public.is_admin()) WITH CHECK (public.is_admin());
--
-- CREATE POLICY "Students can view assigned assessments" ON public.assessments FOR SELECT USING (((status = 'published'::text) AND public.student_has_assignment_for_assessment(id)));
--
-- CREATE POLICY "Students can view own assignments" ON public.assessment_assignments FOR SELECT USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
--    FROM public.class_members cm
--   WHERE ((cm.class_id = assessment_assignments.class_id) AND (cm.student_id = auth.uid()) AND (cm.status = 'active'::text))))));
--
-- CREATE POLICY "Teachers can create assessments" ON public.assessments FOR INSERT WITH CHECK (((( SELECT profiles.role
--    FROM public.profiles
--   WHERE (profiles.id = auth.uid())) = 'teacher'::public.user_role) AND (created_by = auth.uid())));
--
-- CREATE POLICY "Teachers can create assignments for their assessments" ON public.assessment_assignments FOR INSERT WITH CHECK (((assigned_by = auth.uid()) AND public.is_assessment_owner(assessment_id) AND ((class_id IS NULL) OR (EXISTS ( SELECT 1
--    FROM public.classes c
--   WHERE ((c.id = assessment_assignments.class_id) AND public.is_teacher_or_admin())))) AND ((student_id IS NULL) OR (EXISTS ( SELECT 1
--    FROM (public.class_members cm
--      JOIN public.classes c ON ((c.id = cm.class_id)))
--   WHERE ((cm.student_id = assessment_assignments.student_id) AND public.is_teacher_or_admin()))))));
--
-- CREATE POLICY "Teachers can delete assignments for their assessments" ON public.assessment_assignments FOR DELETE USING (public.is_assessment_owner(assessment_id));
--
-- CREATE POLICY "Teachers can delete own assessments" ON public.assessments FOR DELETE USING ((created_by = auth.uid()));
--
-- CREATE POLICY "Teachers can update own assessments" ON public.assessments FOR UPDATE USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));
--
-- CREATE POLICY "Teachers can view assignments for their assessments" ON public.assessment_assignments FOR SELECT USING (public.is_assessment_owner(assessment_id));
--
-- CREATE POLICY "Teachers can view own assessments" ON public.assessments FOR SELECT USING ((created_by = auth.uid()));
--
-- -- R4. Colonnes, clés étrangères, index, contraintes (formes ÉLARGIES de 20260930130000)
-- ALTER TABLE public.test_sessions ADD COLUMN assignment_id uuid
--     REFERENCES public.assessment_assignments(id) ON DELETE SET NULL;
-- COMMENT ON COLUMN public.test_sessions.assignment_id IS 'Reference to assessment assignment if this is a graded test (null = free practice)';
-- ALTER TABLE public.evaluation_tasks ADD COLUMN assessment_id uuid
--     REFERENCES public.assessments(id) ON DELETE SET NULL;
-- ALTER TABLE public.journal_entry_activities ADD COLUMN assessment_id uuid
--     REFERENCES public.assessments(id) ON DELETE CASCADE;
-- CREATE INDEX idx_test_sessions_assignment_completed ON public.test_sessions USING btree (assignment_id, user_id) WHERE (completed_at IS NOT NULL);
-- COMMENT ON INDEX public.idx_test_sessions_assignment_completed IS 'Optimizes counting completed attempts for validation';
-- CREATE INDEX idx_test_sessions_assignment_id ON public.test_sessions USING btree (assignment_id) WHERE (assignment_id IS NOT NULL);
-- CREATE INDEX idx_test_sessions_assignment_user ON public.test_sessions USING btree (assignment_id, user_id) WHERE (assignment_id IS NOT NULL);
-- COMMENT ON INDEX public.idx_test_sessions_assignment_user IS 'Optimizes test attempt fetching for assessment results (sorted by completion date)';
-- CREATE INDEX idx_evaluation_tasks_assessment ON public.evaluation_tasks USING btree (assessment_id) WHERE (assessment_id IS NOT NULL);
-- CREATE INDEX idx_journal_entry_activities_assessment ON public.journal_entry_activities USING btree (assessment_id) WHERE (assessment_id IS NOT NULL);
-- ALTER TABLE public.test_sessions ADD CONSTRAINT test_sessions_flash_sans_assignation
--     CHECK (mode <> 'flash' OR assignment_id IS NULL);
-- ALTER TABLE public.evaluation_tasks DROP CONSTRAINT chk_evaluation_task_source;
-- ALTER TABLE public.evaluation_tasks ADD CONSTRAINT chk_evaluation_task_source CHECK (
--     (assessment_id IS NOT NULL OR evaluation_id IS NOT NULL)::int
--     + (exercise_id IS NOT NULL)::int + (worksheet_id IS NOT NULL)::int <= 1);
-- ALTER TABLE public.journal_entry_activities DROP CONSTRAINT journal_entry_activities_kind_shape;
-- ALTER TABLE public.journal_entry_activities ADD CONSTRAINT journal_entry_activities_kind_shape CHECK (
--     (kind = 'exercise' AND exercise_id IS NOT NULL)
--     OR (kind = 'course' AND (chapter_id IS NOT NULL OR label IS NOT NULL))
--     OR (kind = 'textbook' AND textbook_ref IS NOT NULL)
--     OR (kind = 'question' AND question_template_id IS NOT NULL)
--     OR (kind = 'assessment' AND (assessment_id IS NOT NULL OR evaluation_id IS NOT NULL)));
--
-- -- R5. Vues
--
-- CREATE VIEW public.assessment_results WITH (security_invoker=true) AS  SELECT aa.id AS assignment_id,
--     aa.assessment_id,
--     a.title AS assessment_title,
--     a.grade AS assessment_grade,
--     aa.class_id,
--     aa.student_id,
--     p.id AS student_user_id,
--     p.firstname AS student_firstname,
--     p.lastname AS student_lastname,
--     c.name AS class_name,
--     max(ts.score) AS best_score,
--     count(ts.id) AS attempts_count,
--     max(ts.completed_at) AS last_attempt_at,
--         CASE
--             WHEN count(ts.id) = 0 THEN 'not_started'::text
--             WHEN max(ts.completed_at) IS NULL THEN 'in_progress'::text
--             ELSE 'completed'::text
--         END AS status,
--     ( SELECT test_sessions.total_questions
--            FROM test_sessions
--           WHERE test_sessions.assignment_id = aa.id
--          LIMIT 1) AS total_questions
--    FROM assessment_assignments aa
--      JOIN assessments a ON a.id = aa.assessment_id
--      LEFT JOIN classes c ON c.id = aa.class_id
--      LEFT JOIN profiles p ON p.id = COALESCE(aa.student_id, NULL::uuid)
--      LEFT JOIN test_sessions ts ON ts.assignment_id = aa.id AND ts.user_id = p.id
--   WHERE a.status <> 'archived'::text
--   GROUP BY aa.id, aa.assessment_id, a.title, a.grade, aa.class_id, aa.student_id, p.id, p.firstname, p.lastname, c.name;;
--
-- CREATE OR REPLACE VIEW public.admin_content_stats WITH (security_invoker = true) AS
-- SELECT (SELECT count(*) FROM public.exercises) AS total_exercises,
--     (SELECT count(*) FROM public.assessments) AS total_assessments,
--     (SELECT count(*) FROM public.riddles) AS total_riddles,
--     (SELECT count(*) FROM public.srs_decks) AS total_srs_decks,
--     (SELECT count(*) FROM public.exercise_assignments
--         WHERE exercise_assignments.assigned_at > (now() - '24:00:00'::interval)) AS assignments_24h,
--     (SELECT count(*) FROM public.exercise_completions
--         WHERE exercise_completions.completed_at > (now() - '24:00:00'::interval)) AS completions_24h;
--
-- -- R6. Autres fonctions (pg_get_functiondef) et droits d'exécution d'origine
--
-- CREATE OR REPLACE FUNCTION public.assessment_curriculum_points(p_assessment_ids uuid[])
--  RETURNS TABLE(assessment_id uuid, point_id uuid)
--  LANGUAGE sql
--  STABLE
--  SET search_path TO 'public', 'pg_temp'
-- AS $function$
-- 	select distinct a.id, qtp.point_id
-- 	from public.assessments a
-- 	cross join lateral jsonb_array_elements(
-- 		case when jsonb_typeof(a.categories) = 'array' then a.categories else '[]'::jsonb end
-- 	) as c(item)
-- 	join public.question_templates t
-- 		on t.status = 'published'
-- 		and t.theme = c.item -> 'category' ->> 'theme'
-- 		and t.domain = c.item -> 'category' ->> 'domain'
-- 		and coalesce(t.subdomain, '') = coalesce(c.item -> 'category' ->> 'subdomain', '')
-- 		and t.level::text = c.item -> 'category' ->> 'level'
-- 	join public.question_template_points qtp on qtp.template_id = t.id
-- 	where a.id = any(p_assessment_ids);
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_assessment_results_for_admin(p_assessment_id uuid DEFAULT NULL::uuid)
--  RETURNS TABLE(assignment_id uuid, assessment_id uuid, assessment_title text, assessment_grade text, class_id uuid, student_id uuid, student_user_id uuid, student_firstname text, student_lastname text, class_name text, best_score integer, attempts_count bigint, last_attempt_at timestamp with time zone, status text, total_questions integer)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   SELECT
--     aa.id AS assignment_id,
--     aa.assessment_id,
--     a.title AS assessment_title,
--     a.grade AS assessment_grade,
--     aa.class_id,
--     aa.student_id,
--     p.id AS student_user_id,
--     p.firstname AS student_firstname,
--     p.lastname AS student_lastname,
--     c.name AS class_name,
--     MAX(ts.score) AS best_score,
--     COUNT(ts.id) AS attempts_count,
--     MAX(ts.completed_at) AS last_attempt_at,
--     CASE
--       WHEN COUNT(ts.id) = 0 THEN 'not_started'
--       WHEN MAX(ts.completed_at) IS NULL THEN 'in_progress'
--       ELSE 'completed'
--     END AS status,
--     (SELECT total_questions FROM test_sessions WHERE assignment_id = aa.id LIMIT 1) AS total_questions
--   FROM public.assessment_assignments aa
--   JOIN public.assessments a ON a.id = aa.assessment_id
--   LEFT JOIN public.classes c ON c.id = aa.class_id
--   LEFT JOIN profiles p ON p.id = COALESCE(aa.student_id, NULL)
--   LEFT JOIN public.test_sessions ts ON ts.assignment_id = aa.id AND ts.user_id = p.id
--   WHERE a.status != 'archived'
--     AND (p_assessment_id IS NULL OR a.id = p_assessment_id)
--     AND EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   GROUP BY aa.id, aa.assessment_id, a.title, a.grade, aa.class_id, aa.student_id,
--            p.id, p.firstname, p.lastname, c.name;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_assessment_results_for_student()
--  RETURNS TABLE(assignment_id uuid, assessment_id uuid, assessment_title text, assessment_grade text, class_id uuid, student_id uuid, student_user_id uuid, student_firstname text, student_lastname text, class_name text, best_score integer, attempts_count bigint, last_attempt_at timestamp with time zone, status text, total_questions integer)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   SELECT
--     aa.id AS assignment_id,
--     aa.assessment_id,
--     a.title AS assessment_title,
--     a.grade AS assessment_grade,
--     aa.class_id,
--     aa.student_id,
--     p.id AS student_user_id,
--     p.firstname AS student_firstname,
--     p.lastname AS student_lastname,
--     c.name AS class_name,
--     MAX(ts.score) AS best_score,
--     COUNT(ts.id) AS attempts_count,
--     MAX(ts.completed_at) AS last_attempt_at,
--     CASE
--       WHEN COUNT(ts.id) = 0 THEN 'not_started'
--       WHEN MAX(ts.completed_at) IS NULL THEN 'in_progress'
--       ELSE 'completed'
--     END AS status,
--     (SELECT total_questions FROM test_sessions WHERE assignment_id = aa.id LIMIT 1) AS total_questions
--   FROM public.assessment_assignments aa
--   JOIN public.assessments a ON a.id = aa.assessment_id
--   LEFT JOIN public.classes c ON c.id = aa.class_id
--   LEFT JOIN profiles p ON p.id = COALESCE(aa.student_id, NULL)
--   LEFT JOIN public.test_sessions ts ON ts.assignment_id = aa.id AND ts.user_id = p.id
--   WHERE a.status != 'archived'
--     AND p.id = auth.uid() -- Only show student's own results
--   GROUP BY aa.id, aa.assessment_id, a.title, a.grade, aa.class_id, aa.student_id,
--            p.id, p.firstname, p.lastname, c.name;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.get_assessment_results_for_teacher(p_assessment_id uuid DEFAULT NULL::uuid)
--  RETURNS TABLE(assignment_id uuid, assessment_id uuid, assessment_title text, assessment_grade text, class_id uuid, student_id uuid, student_user_id uuid, student_firstname text, student_lastname text, class_name text, best_score integer, attempts_count bigint, last_attempt_at timestamp with time zone, status text, total_questions integer)
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   SELECT
--     aa.id AS assignment_id,
--     aa.assessment_id,
--     a.title AS assessment_title,
--     a.grade AS assessment_grade,
--     aa.class_id,
--     aa.student_id,
--     p.id AS student_user_id,
--     p.firstname AS student_firstname,
--     p.lastname AS student_lastname,
--     c.name AS class_name,
--     MAX(ts.score) AS best_score,
--     COUNT(ts.id) AS attempts_count,
--     MAX(ts.completed_at) AS last_attempt_at,
--     CASE
--       WHEN COUNT(ts.id) = 0 THEN 'not_started'
--       WHEN MAX(ts.completed_at) IS NULL THEN 'in_progress'
--       ELSE 'completed'
--     END AS status,
--     (SELECT total_questions FROM test_sessions WHERE assignment_id = aa.id LIMIT 1) AS total_questions
--   FROM public.assessment_assignments aa
--   JOIN public.assessments a ON a.id = aa.assessment_id
--   LEFT JOIN public.classes c ON c.id = aa.class_id
--   LEFT JOIN profiles p ON p.id = COALESCE(aa.student_id, NULL)
--   LEFT JOIN public.test_sessions ts ON ts.assignment_id = aa.id AND ts.user_id = p.id
--   WHERE a.status != 'archived'
--     AND a.created_by = auth.uid() -- Only show results for teacher's own assessments
--     AND (p_assessment_id IS NULL OR a.id = p_assessment_id) -- Optional filter by assessment
--   GROUP BY aa.id, aa.assessment_id, a.title, a.grade, aa.class_id, aa.student_id,
--            p.id, p.firstname, p.lastname, c.name;
-- $function$
-- ;
--
-- CREATE OR REPLACE FUNCTION public.link_existing_assessments_to_periods(p_school_year_id uuid)
--  RETURNS integer
--  LANGUAGE plpgsql
--  SET search_path TO 'public', 'extensions', 'pg_temp'
-- AS $function$
-- DECLARE
--   updated_count INTEGER := 0;
-- BEGIN
--   UPDATE assessments a
--   SET academic_period_id = ap.id
--   FROM academic_periods ap
--   JOIN school_years sy ON sy.id = ap.school_year_id
--   JOIN classes c ON c.school_id = sy.school_id
--   WHERE c.id = a.class_id
--     AND sy.id = p_school_year_id
--     AND a.created_at::date BETWEEN ap.start_date AND ap.end_date
--     AND a.academic_period_id IS NULL;
--
--   GET DIAGNOSTICS updated_count = ROW_COUNT;
--   RETURN updated_count;
-- END;
-- $function$
-- ;
--
-- -- copy_legacy_assessments : texte identique à 20260930130000 §7
--
-- create or replace function public.copy_legacy_assessments()
-- returns jsonb
-- language plpgsql
-- security definer
-- set search_path to 'public', 'pg_temp'
-- as $$
-- declare
-- 	v_assessment record;
-- 	v_series_id uuid;
-- 	v_copied integer := 0;
-- 	v_skipped integer := 0;
-- 	v_assignments integer;
-- 	v_sessions integer;
-- 	v_tasks integer;
-- 	v_journal integer;
-- begin
-- 	for v_assessment in
-- 		select a.*
-- 		from public.assessments a
-- 		where not exists (
-- 			select 1 from public.evaluations e where e.legacy_assessment_id = a.id
-- 		)
-- 		order by a.created_at, a.id
-- 	loop
-- 		if jsonb_typeof(v_assessment.categories) is distinct from 'array'
-- 			or jsonb_array_length(v_assessment.categories) = 0
-- 		then
-- 			v_skipped := v_skipped + 1;
-- 			continue;
-- 		end if;
--
-- 		insert into public.series (title, description, grade, categories, created_by, created_at, updated_at)
-- 		values (
-- 			v_assessment.title, v_assessment.description, v_assessment.grade,
-- 			v_assessment.categories, v_assessment.created_by,
-- 			v_assessment.created_at, v_assessment.updated_at
-- 		)
-- 		returning id into v_series_id;
--
-- 		insert into public.evaluations (
-- 			series_id, form, time_limit, max_attempts, deadline, shuffle_questions,
-- 			academic_period_id, status, created_by, created_at, updated_at, legacy_assessment_id
-- 		)
-- 		values (
-- 			v_series_id,
-- 			'interactive',
-- 			null, -- Entraînement : jamais de temps limite (Q30)
-- 			nullif(v_assessment.settings ->> 'max_attempts', '')::integer,
-- 			nullif(v_assessment.settings ->> 'deadline', '')::timestamptz,
-- 			coalesce((v_assessment.settings ->> 'shuffle_questions')::boolean, true),
-- 			v_assessment.academic_period_id,
-- 			v_assessment.status,
-- 			v_assessment.created_by,
-- 			v_assessment.created_at,
-- 			v_assessment.updated_at,
-- 			v_assessment.id
-- 		);
--
-- 		v_copied := v_copied + 1;
-- 	end loop;
--
-- 	-- Assignations : même id que l'assessment_assignment d'origine
-- 	insert into public.evaluation_assignments (id, evaluation_id, class_id, student_id, assigned_by, assigned_at)
-- 	select aa.id, e.id, aa.class_id, aa.student_id, aa.assigned_by, aa.assigned_at
-- 	from public.assessment_assignments aa
-- 	join public.evaluations e on e.legacy_assessment_id = aa.assessment_id
-- 	on conflict (id) do nothing;
-- 	get diagnostics v_assignments = row_count;
--
-- 	-- ⚠️ Seulement les séances d'un DESTINATAIRE de l'assignation : la policy
-- 	-- INSERT historique ne vérifie que `user_id`, donc un élève a pu poser une
-- 	-- séance libre portant l'assignation d'un autre. La rattacher verrouillerait
-- 	-- la série. Destinataire = nommé, ou membre de la classe (tout statut :
-- 	-- l'historique compte).
-- 	update public.test_sessions ts
-- 	set evaluation_id = e.id
-- 	from public.assessment_assignments aa
-- 	join public.evaluations e on e.legacy_assessment_id = aa.assessment_id
-- 	where ts.assignment_id = aa.id
-- 		and ts.evaluation_id is null
-- 		and (
-- 			aa.student_id = ts.user_id
-- 			or exists (
-- 				select 1 from public.class_members cm
-- 				where cm.class_id = aa.class_id and cm.student_id = ts.user_id
-- 			)
-- 		);
-- 	get diagnostics v_sessions = row_count;
--
-- 	update public.evaluation_tasks t
-- 	set evaluation_id = e.id
-- 	from public.evaluations e
-- 	where e.legacy_assessment_id = t.assessment_id
-- 		and t.evaluation_id is null;
-- 	get diagnostics v_tasks = row_count;
--
-- 	update public.journal_entry_activities j
-- 	set evaluation_id = e.id
-- 	from public.evaluations e
-- 	where e.legacy_assessment_id = j.assessment_id
-- 		and j.evaluation_id is null;
-- 	get diagnostics v_journal = row_count;
--
-- 	return jsonb_build_object(
-- 		'series_and_evaluations', v_copied,
-- 		'skipped_empty_categories', v_skipped,
-- 		'assignments', v_assignments,
-- 		'test_sessions', v_sessions,
-- 		'evaluation_tasks', v_tasks,
-- 		'journal_entry_activities', v_journal
-- 	);
-- end;
-- $$;
--
-- comment on function public.copy_legacy_assessments() is
-- 	'Recopie rejouable assessments → series/evaluations (chantier 4, étape 1). service_role seulement ; supprimée à l''étape 2.';
--
-- revoke execute on function public.copy_legacy_assessments() from public, anon, authenticated;
-- grant execute on function public.copy_legacy_assessments() to service_role;
--
-- REVOKE ALL ON FUNCTION public.is_assessment_owner(uuid) FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.is_assessment_owner(uuid) TO authenticated, service_role;
-- REVOKE ALL ON FUNCTION public.student_has_assignment_for_assessment(uuid) FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.student_has_assignment_for_assessment(uuid) TO authenticated, service_role;
-- REVOKE ALL ON FUNCTION public.get_assessment_results_for_admin(uuid) FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.get_assessment_results_for_admin(uuid) TO authenticated, service_role;
-- REVOKE ALL ON FUNCTION public.get_assessment_results_for_student() FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.get_assessment_results_for_student() TO authenticated, service_role;
-- REVOKE ALL ON FUNCTION public.get_assessment_results_for_teacher(uuid) FROM PUBLIC, anon;
-- GRANT EXECUTE ON FUNCTION public.get_assessment_results_for_teacher(uuid) TO authenticated, service_role;
-- GRANT EXECUTE ON FUNCTION public.assessment_curriculum_points(uuid[]) TO authenticated, service_role;
-- GRANT EXECUTE ON FUNCTION public.link_existing_assessments_to_periods(uuid) TO anon, authenticated, service_role;
--
-- -- R7. La seule ligne de production (mesurée le 2026-09-30) ; aucune assignation.
-- INSERT INTO public.assessments (id, title, grade, description, created_by, categories, settings, status, created_at, updated_at, academic_period_id)
-- VALUES ('f3911324-c61c-4406-a08f-cae871e78a19', 'Essai évaluation', '6', NULL, '97c1d5e4-5fa0-44ce-be83-ed5467f3a424',
--     '[{"delay":20,"category":{"level":1,"theme":"Entiers","domain":"Additionner","subdomain":"Somme"},"quantity":1},{"delay":20,"category":{"level":1,"theme":"Entiers","domain":"Additionner","subdomain":"Double et moitié"},"quantity":1},{"delay":25,"category":{"level":1,"theme":"Entiers","domain":"Multiplier","subdomain":"Carrés"},"quantity":1},{"delay":20,"category":{"level":2,"theme":"Entiers","domain":"Priorités opératoires","subdomain":"Avec parenthèses"},"quantity":1}]'::jsonb,
--     '{"deadline":null,"time_limit":null,"max_attempts":null,"shuffle_questions":true}'::jsonb,
--     'published', '2026-09-29T19:39:26.258725+00:00', '2026-09-29T19:39:26.258725+00:00', NULL);
-- -- (Après un rollback, relier les lignes créées entre-temps : evaluation_tasks /
-- -- journal_entry_activities / test_sessions portent evaluation_id ; l'ancienne
-- -- colonne reste NULL, ce que les contraintes élargies acceptent.)
--
-- COMMIT;

-- ============================================================================
-- 1. Garde-fous : la migration ÉCHOUE si une donnée n'a pas son pendant
-- ============================================================================
-- Toute la migration est une transaction : une exception ici annule tout,
-- rien n'est supprimé.

do $$
declare
	v_missing integer;
begin
	-- Chaque assessment a son évaluation (legacy_assessment_id), dont la série
	-- porte le même titre et les mêmes catégories.
	select count(*) into v_missing
	from public.assessments a
	where not exists (
		select 1
		from public.evaluations e
		join public.series s on s.id = e.series_id
		where e.legacy_assessment_id = a.id
			and s.title = a.title
			and s.categories = a.categories
	);
	if v_missing > 0 then
		raise exception 'DROP refusé : % assessments sans évaluation recopiée (titre, catégories)', v_missing;
	end if;

	-- Chaque assignation a son pendant de même id.
	select count(*) into v_missing
	from public.assessment_assignments aa
	where not exists (select 1 from public.evaluation_assignments ea where ea.id = aa.id);
	if v_missing > 0 then
		raise exception 'DROP refusé : % assessment_assignments sans evaluation_assignment de même id', v_missing;
	end if;

	-- Aucune séance, tâche ni activité ne connaît SEULEMENT l'ancienne référence.
	select count(*) into v_missing
	from public.test_sessions
	where assignment_id is not null and evaluation_id is null;
	if v_missing > 0 then
		raise exception 'DROP refusé : % test_sessions avec assignment_id sans evaluation_id', v_missing;
	end if;

	select count(*) into v_missing
	from public.evaluation_tasks
	where assessment_id is not null and evaluation_id is null;
	if v_missing > 0 then
		raise exception 'DROP refusé : % evaluation_tasks avec assessment_id sans evaluation_id', v_missing;
	end if;

	select count(*) into v_missing
	from public.journal_entry_activities
	where assessment_id is not null and evaluation_id is null;
	if v_missing > 0 then
		raise exception 'DROP refusé : % journal_entry_activities avec assessment_id sans evaluation_id', v_missing;
	end if;
end
$$;

-- ============================================================================
-- 2. Vues
-- ============================================================================

drop view public.assessment_results;

-- Même nom, mêmes colonnes, même ordre, même type (bigint) : `healthStats.ts`
-- n'y voit pas de différence. `total_assessments` compte les ÉVALUATIONS.
-- CREATE OR REPLACE garde les GRANT existants ; WITH (security_invoker) est
-- répété car OR REPLACE remplace les options de la vue par celles données.
create or replace view public.admin_content_stats with (security_invoker = true) as
select
	(select count(*) from public.exercises) as total_exercises,
	(select count(*) from public.evaluations) as total_assessments,
	(select count(*) from public.riddles) as total_riddles,
	(select count(*) from public.srs_decks) as total_srs_decks,
	(select count(*) from public.exercise_assignments
		where exercise_assignments.assigned_at > (now() - '24:00:00'::interval)) as assignments_24h,
	(select count(*) from public.exercise_completions
		where exercise_completions.completed_at > (now() - '24:00:00'::interval)) as completions_24h;

-- ============================================================================
-- 3. Fonctions qui lisent les anciennes tables (sans dépendance déclarée :
--    elles ne bloqueraient pas le DROP, mais casseraient à l'exécution)
-- ============================================================================

drop function public.get_assessment_results_for_admin(uuid);
drop function public.get_assessment_results_for_student();
drop function public.get_assessment_results_for_teacher(uuid);
drop function public.assessment_curriculum_points(uuid[]);
drop function public.link_existing_assessments_to_periods(uuid);
drop function public.copy_legacy_assessments();

-- ============================================================================
-- 4. Contraintes qui citent les colonnes supprimées : recréées sans elles
-- ============================================================================
-- Aucune policy de test_sessions / evaluation_tasks / journal_entry_activities
-- ne cite ces colonnes (pg_policies + pg_depend, vérifié en local) : aucune
-- policy n'est touchée. Les garde-fous du §1 garantissent que toute ligne
-- valide avant l'est encore après (assessment_id non nul ⇒ evaluation_id non nul).

alter table public.evaluation_tasks drop constraint chk_evaluation_task_source;
alter table public.journal_entry_activities drop constraint journal_entry_activities_kind_shape;
-- Pendant de test_sessions_flash_sans_evaluation (qui reste) : sans objet.
alter table public.test_sessions drop constraint test_sessions_flash_sans_assignation;

-- ============================================================================
-- 5. Colonnes (leurs index et clés étrangères partent avec elles)
-- ============================================================================

drop index public.idx_test_sessions_assignment_completed;
drop index public.idx_test_sessions_assignment_id;
drop index public.idx_test_sessions_assignment_user;
drop index public.idx_evaluation_tasks_assessment;
drop index public.idx_journal_entry_activities_assessment;

alter table public.test_sessions drop column assignment_id;
alter table public.evaluation_tasks drop column assessment_id;
alter table public.journal_entry_activities drop column assessment_id;

alter table public.evaluation_tasks add constraint chk_evaluation_task_source check (
	(evaluation_id is not null)::int
	+ (exercise_id is not null)::int
	+ (worksheet_id is not null)::int <= 1
);

alter table public.journal_entry_activities add constraint journal_entry_activities_kind_shape check (
	(kind = 'exercise' and exercise_id is not null)
	or (kind = 'course' and (chapter_id is not null or label is not null))
	or (kind = 'textbook' and textbook_ref is not null)
	or (kind = 'question' and question_template_id is not null)
	or (kind = 'assessment' and evaluation_id is not null)
);

-- ============================================================================
-- 6. Tables (leurs policies, index et trigger partent avec elles), puis les
--    fonctions que seules leurs policies et leur trigger utilisaient
-- ============================================================================

drop trigger update_assessments_updated_at_trigger on public.assessments;
drop table public.assessment_assignments;
drop table public.assessments;

drop function public.is_assessment_owner(uuid);
drop function public.student_has_assignment_for_assessment(uuid);
drop function public.update_assessments_updated_at();

comment on column public.evaluations.legacy_assessment_id is
	'Id de l''ancien assessment (table supprimée le 2026-09-30). Gardée : les anciens liens prof /dashboard/teacher/assessments/<id> la résolvent (getEvaluation).';
