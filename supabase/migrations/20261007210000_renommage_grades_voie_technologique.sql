-- Renommage des grades de la voie technologique : 1_STMG → 1_TECHNO, T_STMG → T_TECHNO.
--
-- Le programme de mathématiques du tronc commun est COMMUN à toutes les séries
-- technologiques (ST2S, STL, STD2A, STI2D, STMG, STHR — BO spécial n° 1 du 22-01-2019) :
-- un code par série n'a pas de sens, le grade désigne l'enseignement de maths suivi.
-- Décidé par David le 2026-10-07 (question P8, docs/wip/arbre-notions/programmes-ecarts-cycle2.md
-- sur la branche feat/arbre-notions).
--
-- Accès : aucun changement — seules des listes de valeurs autorisées et des libellés changent.
-- Données : aucune ligne n'utilise les anciens codes (mesuré en prod le 2026-10-07 ;
-- le garde-fou ci-dessous fait échouer la migration si une ligne est apparue entre-temps).
--
-- ROLLBACK :
--   Rejouer les mêmes ALTER TABLE / CREATE OR REPLACE FUNCTION en remettant
--   '1_STMG'/'T_STMG' à la place de '1_TECHNO'/'T_TECHNO'. Définitions précédentes :
--   20260616220000_baseline_schema.sql (contraintes + is_valid_grade_array +
--   normalize_grade_value + get_cycle_for_grade), 20260621100000_curriculum_tracking.sql,
--   20260830080000_regime_acquisition_et_listes_automatismes.sql,
--   20260930130000_series_evaluations.sql, 20261001190000_consentement_par_niveau.sql
--   (apply_consent_rule_by_grade).

-- ============================================================================
-- 0. Garde-fou : aucune donnée ne doit utiliser les anciens codes.
-- ============================================================================

do $$
declare
	v_count integer;
begin
	select (select count(*) from public.profiles where grade in ('1_STMG', 'T_STMG'))
		+ (select count(*) from public.pending_students where grade in ('1_STMG', 'T_STMG'))
		+ (select count(*) from public.classes where grade in ('1_STMG', 'T_STMG'))
		+ (select count(*) from public.series where grade in ('1_STMG', 'T_STMG'))
		+ (select count(*) from public.curriculum_themes where grade in ('1_STMG', 'T_STMG'))
		+ (select count(*) from public.curriculum_point_automatismes where grade in ('1_STMG', 'T_STMG'))
		+ (select count(*) from public.exercises where grades && array['1_STMG', 'T_STMG'])
		+ (select count(*) from public.question_templates where grades && array['1_STMG', 'T_STMG'])
		+ (select count(*) from public.worksheets where grades && array['1_STMG', 'T_STMG'])
		+ (select count(*) from public.rag_documents where grades && array['1_STMG', 'T_STMG'])
		+ (select count(*) from public.chapter_templates where grades && array['1_STMG', 'T_STMG'])
		+ (select count(*) from public.parody_evaluations where grade_levels && array['1_STMG', 'T_STMG'])
	into v_count;

	if v_count > 0 then
		raise exception 'Renommage impossible : % ligne(s) utilisent encore 1_STMG / T_STMG — les convertir d''abord.',
			v_count;
	end if;
end $$;

-- ============================================================================
-- 1. Contraintes CHECK énumérant les grades (mêmes noms, nouvelle liste).
-- ============================================================================

alter table public.classes
	drop constraint classes_grade_check,
	add constraint classes_grade_check check (
		grade is null or grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	);

alter table public.profiles
	drop constraint profiles_valid_grade,
	add constraint profiles_valid_grade check (
		grade is null or grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	);

alter table public.pending_students
	drop constraint pending_students_valid_grade,
	add constraint pending_students_valid_grade check (
		grade is null or grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	);

alter table public.series
	drop constraint series_valid_grade,
	add constraint series_valid_grade check (
		grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	);

alter table public.curriculum_themes
	drop constraint curriculum_themes_valid_grade,
	add constraint curriculum_themes_valid_grade check (
		grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	);

alter table public.curriculum_point_automatismes
	drop constraint curriculum_point_automatismes_valid_grade,
	add constraint curriculum_point_automatismes_valid_grade check (
		grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])
	);

-- ============================================================================
-- 2. Fonctions dont le corps énumère les grades.
-- ============================================================================

-- Les tableaux de grades d'exercises, question_templates, worksheets et rag_documents
-- sont validés par cette fonction : la nouvelle liste les couvre tous.
-- (chapter_templates et parody_evaluations n'ont pas de CHECK de valeurs — couverts
-- par le garde-fou ci-dessus seulement.)
CREATE OR REPLACE FUNCTION public.is_valid_grade_array(grades text[])
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    grade TEXT;
    valid_grades TEXT[] := ARRAY[
        'CP', 'CE1', 'CE2', 'CM1', 'CM2',
        '6', '5', '4', '3',
        '2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
    ];
BEGIN
    -- NULL array is valid
    IF grades IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Empty array is valid
    IF array_length(grades, 1) IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check each element
    FOREACH grade IN ARRAY grades
    LOOP
        IF NOT (grade = ANY(valid_grades)) THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_cycle_for_grade(p_grade text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN p_grade IN ('CP', 'CE1', 'CE2') THEN 'cycle_2'
    WHEN p_grade IN ('CM1', 'CM2', '6') THEN 'cycle_3'
    WHEN p_grade IN ('5', '4', '3') THEN 'cycle_4'
    WHEN p_grade = '2' THEN 'seconde'
    WHEN p_grade IN ('1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO') THEN 'cycle_terminal'
    ELSE NULL
  END
$function$;

-- Règle du consentement parental : la liste des niveaux lycée change de codes,
-- le comportement est identique (1re et terminale dispensées).
CREATE OR REPLACE FUNCTION public.apply_consent_rule_by_grade()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
	v_lycee text[] := array['1_GEN', '1_SPE', '1_TECHNO', 'T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_TECHNO'];
	v_requires boolean;
	v_required_before boolean;
	v_dispense_par_age boolean;
begin
	-- Création directe de son propre profil par un compte de l'API : un consentement
	-- ou une réponse d'âge ne se fabriquent pas (seconde barrière, cf. 20261001200000).
	if tg_op = 'INSERT'
		and current_user in ('authenticated', 'anon')
		and not public.is_teacher_or_admin() then
		new.consent_granted_at := null;
		new.age_declaration := null;
		new.age_declared_at := null;
	end if;

	-- Professeur / admin : jamais soumis.
	if new.role is distinct from 'student'::public.user_role then
		if tg_op = 'INSERT' or old.role is distinct from new.role then
			new.consent_required := false;
			new.consent_grace_period_ends := null;
		end if;
		return new;
	end if;

	-- Par défaut prudent : tout niveau est soumis SAUF 1re et terminale.
	v_requires := new.grade is null or not (new.grade = any (v_lycee));

	-- Création, ou retour au rôle élève : la règle s'applique entièrement.
	if tg_op = 'INSERT' or old.role is distinct from new.role then
		if tg_op = 'UPDATE' then
			-- Retour au rôle élève : une ancienne réponse d'âge ne vaut plus.
			new.age_declaration := null;
			new.age_declared_at := null;
		end if;
		new.consent_required := v_requires;
		if v_requires and new.consent_granted_at is null then
			new.consent_grace_period_ends := now() + interval '30 days';
		end if;
		return new;
	end if;

	-- Toute autre modification qu'un changement de niveau : rien.
	if new.grade is not distinct from old.grade then
		return new;
	end if;

	-- Changement de niveau : la réponse d'âge ne vaut plus.
	v_dispense_par_age := old.age_declaration = '15_plus';
	new.age_declaration := null;
	new.age_declared_at := null;

	v_required_before := old.grade is null or not (old.grade = any (v_lycee));

	if v_requires and (not v_required_before or v_dispense_par_age) then
		-- Entrée dans la catégorie « soumis », ou dispense par l'âge qui tombe.
		new.consent_required := true;
		if new.consent_granted_at is null then
			new.consent_grace_period_ends := now() + interval '30 days';
		end if;
	elsif not v_requires and v_required_before then
		new.consent_required := false;
	end if;
	-- Même catégorie, sans dispense par l'âge : consentement, délai et dispense inchangés.

	return new;
end;
$function$;

-- Normalisation d'une saisie libre : les alias « stmg » restent acceptés en entrée
-- et renvoient désormais les nouveaux codes ; les alias « techno » sont ajoutés.
CREATE OR REPLACE FUNCTION public.normalize_grade_value(input_grade text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
    -- Return NULL for NULL input
    IF input_grade IS NULL THEN
        RETURN NULL;
    END IF;

    -- Normalize to lowercase for comparison
    CASE lower(trim(input_grade))
        -- Already canonical (return as-is to preserve case)
        WHEN 'cp' THEN RETURN 'CP';
        WHEN 'ce1' THEN RETURN 'CE1';
        WHEN 'ce2' THEN RETURN 'CE2';
        WHEN 'cm1' THEN RETURN 'CM1';
        WHEN 'cm2' THEN RETURN 'CM2';
        WHEN '6' THEN RETURN '6';
        WHEN '5' THEN RETURN '5';
        WHEN '4' THEN RETURN '4';
        WHEN '3' THEN RETURN '3';
        WHEN '2' THEN RETURN '2';
        WHEN '1_gen' THEN RETURN '1_GEN';
        WHEN 't_gen' THEN RETURN 'T_GEN';
        WHEN '1_spe' THEN RETURN '1_SPE';
        WHEN 't_spe' THEN RETURN 'T_SPE';
        WHEN 't_exp' THEN RETURN 'T_EXP';
        WHEN 't_comp' THEN RETURN 'T_COMP';
        WHEN '1_techno' THEN RETURN '1_TECHNO';
        WHEN 't_techno' THEN RETURN 'T_TECHNO';
        WHEN '1_stmg' THEN RETURN '1_TECHNO';
        WHEN 't_stmg' THEN RETURN 'T_TECHNO';

        -- Middle school variations (6ème, 6eme, 6e, etc.)
        WHEN '6ème' THEN RETURN '6';
        WHEN '6eme' THEN RETURN '6';
        WHEN '6e' THEN RETURN '6';
        WHEN 'sixième' THEN RETURN '6';
        WHEN 'sixieme' THEN RETURN '6';
        WHEN '5ème' THEN RETURN '5';
        WHEN '5eme' THEN RETURN '5';
        WHEN '5e' THEN RETURN '5';
        WHEN 'cinquième' THEN RETURN '5';
        WHEN 'cinquieme' THEN RETURN '5';
        WHEN '4ème' THEN RETURN '4';
        WHEN '4eme' THEN RETURN '4';
        WHEN '4e' THEN RETURN '4';
        WHEN 'quatrième' THEN RETURN '4';
        WHEN 'quatrieme' THEN RETURN '4';
        WHEN '3ème' THEN RETURN '3';
        WHEN '3eme' THEN RETURN '3';
        WHEN '3e' THEN RETURN '3';
        WHEN 'troisième' THEN RETURN '3';
        WHEN 'troisieme' THEN RETURN '3';

        -- High school variations
        -- Seconde
        WHEN '2nde' THEN RETURN '2';
        WHEN '2de' THEN RETURN '2';
        WHEN 'seconde' THEN RETURN '2';

        -- 1ère générale
        WHEN '1ère' THEN RETURN '1_GEN';
        WHEN '1ere' THEN RETURN '1_GEN';
        WHEN '1gen' THEN RETURN '1_GEN';
        WHEN '1ère générale' THEN RETURN '1_GEN';
        WHEN '1ere generale' THEN RETURN '1_GEN';
        WHEN '1ère g' THEN RETURN '1_GEN';
        WHEN 'première générale' THEN RETURN '1_GEN';
        WHEN 'premiere generale' THEN RETURN '1_GEN';
        WHEN 'première' THEN RETURN '1_GEN';
        WHEN 'premiere' THEN RETURN '1_GEN';

        -- 1ère spécialité maths
        WHEN 'spe_1' THEN RETURN '1_SPE';
        WHEN '1spe' THEN RETURN '1_SPE';
        WHEN '1ère spé' THEN RETURN '1_SPE';
        WHEN '1ere spe' THEN RETURN '1_SPE';
        WHEN '1ère spécialité' THEN RETURN '1_SPE';
        WHEN '1ere specialite' THEN RETURN '1_SPE';
        WHEN 'première spécialité maths' THEN RETURN '1_SPE';
        WHEN 'premiere specialite maths' THEN RETURN '1_SPE';

        -- 1ère technologique (alias « stmg » hérités compris)
        WHEN '1techno' THEN RETURN '1_TECHNO';
        WHEN '1ère techno' THEN RETURN '1_TECHNO';
        WHEN '1ere techno' THEN RETURN '1_TECHNO';
        WHEN 'première techno' THEN RETURN '1_TECHNO';
        WHEN 'premiere techno' THEN RETURN '1_TECHNO';
        WHEN '1ère technologique' THEN RETURN '1_TECHNO';
        WHEN '1ere technologique' THEN RETURN '1_TECHNO';
        WHEN 'première technologique' THEN RETURN '1_TECHNO';
        WHEN 'premiere technologique' THEN RETURN '1_TECHNO';
        WHEN '1stmg' THEN RETURN '1_TECHNO';
        WHEN '1ère stmg' THEN RETURN '1_TECHNO';
        WHEN '1ere stmg' THEN RETURN '1_TECHNO';
        WHEN 'première stmg' THEN RETURN '1_TECHNO';
        WHEN 'premiere stmg' THEN RETURN '1_TECHNO';

        -- Terminale générale
        WHEN 'terminale' THEN RETURN 'T_GEN';
        WHEN 'tgen' THEN RETURN 'T_GEN';
        WHEN 'terminale générale' THEN RETURN 'T_GEN';
        WHEN 'terminale generale' THEN RETURN 'T_GEN';
        WHEN 'term g' THEN RETURN 'T_GEN';
        WHEN 'tle générale' THEN RETURN 'T_GEN';
        WHEN 'tle generale' THEN RETURN 'T_GEN';
        WHEN 'tle' THEN RETURN 'T_GEN';
        WHEN 'term' THEN RETURN 'T_GEN';
        WHEN 'tale' THEN RETURN 'T_GEN';

        -- Terminale spécialité maths
        WHEN 'spe_t' THEN RETURN 'T_SPE';
        WHEN 'tspe' THEN RETURN 'T_SPE';
        WHEN 'terminale spé' THEN RETURN 'T_SPE';
        WHEN 'terminale spe' THEN RETURN 'T_SPE';
        WHEN 'terminale spécialité' THEN RETURN 'T_SPE';
        WHEN 'terminale specialite' THEN RETURN 'T_SPE';
        WHEN 'term spé' THEN RETURN 'T_SPE';
        WHEN 'term spe' THEN RETURN 'T_SPE';

        -- Terminale expertes
        WHEN 'texp' THEN RETURN 'T_EXP';
        WHEN 'terminale expertes' THEN RETURN 'T_EXP';
        WHEN 'terminale maths expertes' THEN RETURN 'T_EXP';
        WHEN 'term exp' THEN RETURN 'T_EXP';

        -- Terminale complémentaires
        WHEN 'tcomp' THEN RETURN 'T_COMP';
        WHEN 'terminale comp' THEN RETURN 'T_COMP';
        WHEN 'terminale complémentaires' THEN RETURN 'T_COMP';
        WHEN 'terminale complementaires' THEN RETURN 'T_COMP';
        WHEN 'terminale maths complémentaires' THEN RETURN 'T_COMP';
        WHEN 'terminale maths complementaires' THEN RETURN 'T_COMP';
        WHEN 'term comp' THEN RETURN 'T_COMP';

        -- Terminale technologique (alias « stmg » hérités compris)
        WHEN 'ttechno' THEN RETURN 'T_TECHNO';
        WHEN 'terminale techno' THEN RETURN 'T_TECHNO';
        WHEN 'terminale technologique' THEN RETURN 'T_TECHNO';
        WHEN 'term techno' THEN RETURN 'T_TECHNO';
        WHEN 'tle techno' THEN RETURN 'T_TECHNO';
        WHEN 'tle technologique' THEN RETURN 'T_TECHNO';
        WHEN 'stmg' THEN RETURN 'T_TECHNO';
        WHEN 'tstmg' THEN RETURN 'T_TECHNO';
        WHEN 'terminale stmg' THEN RETURN 'T_TECHNO';
        WHEN 'term stmg' THEN RETURN 'T_TECHNO';
        WHEN 'tle stmg' THEN RETURN 'T_TECHNO';

        -- Unknown value - return as-is (will fail constraint check if invalid)
        ELSE RETURN input_grade;
    END CASE;
END;
$function$;

-- ============================================================================
-- 3. Commentaires de colonnes : la liste canonique change avec les codes.
-- ============================================================================

comment on column public.profiles.grade is
	'Student grade level using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO';
comment on column public.pending_students.grade is
	'Student grade level using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO';
comment on column public.exercises.grades is
	'Applicable grade levels using canonical GradeCode values: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO';
comment on column public.question_templates.grades is
	'Applicable grade levels using canonical codes: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO';
comment on column public.rag_documents.grades is
	'Applicable grade levels using canonical GradeCode values: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO';
comment on column public.worksheets.grades is
	'Applicable grade levels using canonical GradeCode values: CP, CE1, CE2, CM1, CM2, 6, 5, 4, 3, 2, 1_GEN, T_GEN, 1_SPE, T_SPE, T_EXP, T_COMP, 1_TECHNO, T_TECHNO';
