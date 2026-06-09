-- ============================================================================
-- Migration: Competence Referentiel — Schema (Phase 1 step 1.1)
-- Date:      2026-06-09
-- Spec:      docs/wip/skills-referentiel-design.md (decisions 57-72)
-- Progress:  docs/wip/competence-referentiel-phase1-progress.md
-- ============================================================================
-- Creates the skills referentiel infrastructure: themes / objectives / skills
-- for Family A (knowledge & savoir-faire) and math competences / subdimensions
-- for Family B (transversal math competences), plus evaluation_tasks (Family B
-- contexts), the junction template -> skill, the skill_attempts dual-regime
-- table, the recomputed caches, and the student_skill_state_a_v VIEW carrying
-- the lazily-computed to_review flag.
--
-- Out of scope (covered by sibling migrations 1.2 / 1.3):
--   - PL/pgSQL functions (compute_*_level, update_student_*)
--   - Triggers on skill_attempts
--   - Seeds (themes, objectives, math_competences, subdimensions, skills)
-- ============================================================================


-- ============================================================================
-- FAMILY A — Connaissances et savoir-faire
-- ============================================================================

-- Themes are the top-level discipline groupings (Nombres et calcul,
-- Geometrie, ...). One row per (niveau_scolaire, theme).
CREATE TABLE IF NOT EXISTS public.skill_themes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    niveau_scolaire TEXT NOT NULL,             -- '6e', '5e', ..., 'terminale-spe'
    name            TEXT NOT NULL,
    description     TEXT,
    display_order   INTEGER NOT NULL,
    bo_reference    TEXT,                      -- ex: "BO cycle 3, theme Nombres et calculs"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_skill_themes_niveau_name UNIQUE (niveau_scolaire, name)
);

COMMENT ON TABLE  public.skill_themes IS
    'Family A (knowledge) - top-level BO themes per school level.';
COMMENT ON COLUMN public.skill_themes.niveau_scolaire IS
    'School level code (6e, 5e, ..., terminale-spe).';
COMMENT ON COLUMN public.skill_themes.bo_reference IS
    'Free-form BO citation for traceability (ex: "BO cycle 3, theme Nombres").';

-- Objectives are what the student sees in the dashboard ("attendus de fin
-- d'annee"). Approximately 18 per school level. Each carries 4 capacities
-- ordered by rang (1..4) via skills.objective_id + skills.display_order.
CREATE TABLE IF NOT EXISTS public.skill_objectives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_id        UUID NOT NULL REFERENCES public.skill_themes(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    display_order   INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_skill_objectives_theme_name UNIQUE (theme_id, name)
);

COMMENT ON TABLE  public.skill_objectives IS
    'Family A (knowledge) - student-visible BO objective (= "attendu BO"). '
    'Each objective owns exactly 4 ranked capacities (skills rows).';


-- ============================================================================
-- FAMILY B — Compétences mathématiques (6 transversal competences)
-- ============================================================================

-- The 6 transversal math competences, stable across all school levels (no
-- niveau_scolaire). Seeded once.
CREATE TABLE IF NOT EXISTS public.math_competences (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              TEXT NOT NULL,            -- 'chercher' | 'modeliser' | 'representer' | 'raisonner' | 'calculer' | 'communiquer'
    name              TEXT NOT NULL,            -- 'Chercher', 'Modeliser', ...
    description       TEXT,                     -- BO / IGESR wording
    gloss_for_student TEXT NOT NULL,            -- pedagogical gloss shown to students
    display_order     INTEGER NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_math_competences_code UNIQUE (code),
    CONSTRAINT chk_math_competences_code CHECK (
        code IN ('chercher', 'modeliser', 'representer', 'raisonner', 'calculer', 'communiquer')
    )
);

COMMENT ON TABLE public.math_competences IS
    'Family B - the 6 transversal math competences (Chercher, Modeliser, ...). '
    'Stable across all school levels; no niveau_scolaire column.';

-- Sub-dimensions of each math competence (A / B / C / D), stable for college
-- (V1 referentiel partage). 22 rows total (3 or 4 per competence).
-- IMPORTANT: subdimensions have NO state of their own; they only group
-- observables for structural coherence and rule naming.
CREATE TABLE IF NOT EXISTS public.math_competence_subdimensions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    math_competence_id  UUID NOT NULL REFERENCES public.math_competences(id) ON DELETE CASCADE,
    letter              CHAR(1) NOT NULL,       -- 'A' | 'B' | 'C' | 'D'
    name                TEXT NOT NULL,
    description         TEXT,
    display_order       INTEGER NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_math_subdim_competence_letter UNIQUE (math_competence_id, letter),
    CONSTRAINT chk_math_subdim_letter CHECK (letter IN ('A', 'B', 'C', 'D'))
);

COMMENT ON TABLE public.math_competence_subdimensions IS
    'Family B - 22 sub-dimensions (A/B/C/D per competence). Structural grouping '
    'only - no aggregated state at this level.';


-- ============================================================================
-- COMMON UNIT — `skills` (capacity OR observable, asymmetric design)
-- ============================================================================
-- A single `skills` table backs both families. The family is determined by an
-- XOR on the two FKs (objective_id vs subdimension_id) and exposed as a
-- GENERATED column for SQL readability (decision 67). Impossible to desync.

CREATE TABLE IF NOT EXISTS public.skills (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Exactly ONE of these two FKs is non-null (XOR enforced below).
    objective_id       UUID REFERENCES public.skill_objectives(id) ON DELETE CASCADE,
    subdimension_id    UUID REFERENCES public.math_competence_subdimensions(id) ON DELETE CASCADE,

    -- Family derived from the FKs (decision 67) - Postgres GENERATED.
    family             TEXT GENERATED ALWAYS AS (
                           CASE WHEN objective_id IS NOT NULL
                                THEN 'knowledge'   -- Family A
                                ELSE 'competence'  -- Family B
                           END
                       ) STORED,

    niveau_scolaire    TEXT,                    -- knowledge: nullable (inherited via theme) ; competence: 'college' in V1
    observable_code    TEXT,                    -- competence only: 'A1', 'B3', 'C2', ...
    name               TEXT NOT NULL,           -- knowledge: short capacity name ; competence: student-facing wording
    teacher_grid_text  TEXT,                    -- competence only: teacher-side reformulation (grille de codage)

    -- Knowledge-only: rubric BO 2026 cycle 3, drives the acquisition rule (cf. section 6.1).
    knowledge_type     TEXT,                    -- 'automatisme' | 'capacite_attendue' | NULL (for competence)
    display_order      INTEGER NOT NULL,        -- knowledge: rang 1..4 under objective ; competence: display order

    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ---------- CHECK constraints ----------

    -- Exactly one family per skill (XOR on FKs - decision 65)
    CONSTRAINT chk_skill_family CHECK (
        (objective_id IS NOT NULL) <> (subdimension_id IS NOT NULL)
    ),

    -- knowledge_type allowed values
    CONSTRAINT chk_skill_knowledge_type_values CHECK (
        knowledge_type IS NULL
        OR knowledge_type IN ('automatisme', 'capacite_attendue')
    ),

    -- Family knowledge: rang in [1,4] AND knowledge_type required
    CONSTRAINT chk_skill_knowledge_rang CHECK (
        objective_id IS NULL                                                     -- Family competence: abstain
        OR (display_order BETWEEN 1 AND 4 AND knowledge_type IS NOT NULL)        -- Family knowledge: rang ok + type ok
    ),

    -- Family competence: observable_code required, knowledge_type must be NULL
    CONSTRAINT chk_skill_competence_code CHECK (
        subdimension_id IS NULL                                                  -- Family knowledge: abstain
        OR (observable_code IS NOT NULL AND knowledge_type IS NULL)              -- Family competence: code required, no knowledge_type
    )
);

-- Uniqueness of rang under one objective (knowledge family). NULL parents
-- (competence rows) are not constrained: NULLS NOT DISTINCT would forbid
-- multiple competence rows with the same display_order, which is wrong.
-- We use a partial unique index instead.
CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_knowledge_rang_under_objective
    ON public.skills (objective_id, display_order)
    WHERE objective_id IS NOT NULL;

-- Uniqueness of observable_code (cadre canonique uses A1..D4 across the 6
-- competences but a code is unique within its competence; collision across
-- competences possible). Enforce uniqueness within (math_competence) via
-- subdimension JOIN: we approximate with (subdimension_id, observable_code).
CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_competence_observable_code
    ON public.skills (subdimension_id, observable_code)
    WHERE subdimension_id IS NOT NULL;

COMMENT ON TABLE public.skills IS
    'Unit of attempt - "capacite" for family knowledge, "observable" for family '
    'competence. Family is a GENERATED column derived from the XOR FK pair '
    '(objective_id, subdimension_id). See docs/wip/skills-referentiel-design.md §7.';

COMMENT ON COLUMN public.skills.family IS
    'Generated column (cannot be set manually). "knowledge" = Family A capacity, '
    '"competence" = Family B observable. Cf. decision 67.';
COMMENT ON COLUMN public.skills.knowledge_type IS
    'Family knowledge only: rubric BO 2026 cycle 3. Drives the acquisition rule: '
    '"automatisme" (5 successes total, 3 of last 5) vs "capacite_attendue" '
    '(>= 1 success on >= 2 distinct templates, no failure in last 3). '
    'NULL for family competence. Cf. decisions 66 + 68.';
COMMENT ON COLUMN public.skills.observable_code IS
    'Family competence only: code from the cadre canonique (A1, B3, C2, ...). '
    'Used by the conjunctive rules.';
COMMENT ON COLUMN public.skills.display_order IS
    'Family knowledge: rang 1..4 under the objective (ordered by difficulty). '
    'Family competence: display order under the sub-dimension.';

-- Indexes for FK and family filtering
CREATE INDEX IF NOT EXISTS idx_skills_objective_id     ON public.skills(objective_id)    WHERE objective_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skills_subdimension_id  ON public.skills(subdimension_id) WHERE subdimension_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skills_family           ON public.skills(family);


-- ============================================================================
-- EVALUATION TASKS (Family B only)
-- ============================================================================
-- An "evaluation task" is any context of competence observation: open
-- problem, group work, DM, etc. Optionally linked to an assessment /
-- exercise / worksheet (decision 71 - 3 distinct nullable FKs, at most 1
-- non-null - replaces the polymorphic source_type+source_ref pattern).

CREATE TABLE IF NOT EXISTS public.evaluation_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id        UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    niveau_scolaire TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,

    -- Optional link to one (and only one) existing entity:
    assessment_id   UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
    exercise_id     UUID REFERENCES public.exercises(id)   ON DELETE SET NULL,
    worksheet_id    UUID REFERENCES public.worksheets(id)  ON DELETE SET NULL,

    task_date       DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- At most one source FK is non-null
    CONSTRAINT chk_evaluation_task_source CHECK (
        (CASE WHEN assessment_id IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN exercise_id   IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN worksheet_id  IS NOT NULL THEN 1 ELSE 0 END)
        <= 1
    )
);

COMMENT ON TABLE public.evaluation_tasks IS
    'Family B context for competence observation: problems, DM, group work, etc. '
    'Optionally linked to ONE of (assessment, exercise, worksheet) via decision 71''s '
    '3-distinct-nullable-FKs pattern. All-null = ad-hoc task.';

CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_teacher_id   ON public.evaluation_tasks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_class_id     ON public.evaluation_tasks(class_id)    WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_task_date    ON public.evaluation_tasks(task_date DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_assessment   ON public.evaluation_tasks(assessment_id) WHERE assessment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_exercise     ON public.evaluation_tasks(exercise_id)   WHERE exercise_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evaluation_tasks_worksheet    ON public.evaluation_tasks(worksheet_id)  WHERE worksheet_id  IS NOT NULL;


-- ============================================================================
-- PERIMETER per task (Family B)
-- ============================================================================
-- Declares which observables the teacher considers "in scope" for this task.
-- Out-of-scope observables are implicitly '∅' (no row in skill_attempts).
-- The constraint "skill must be family 'competence'" is enforced at the
-- application layer (cannot be expressed as a CHECK referencing other tables
-- without a trigger).

CREATE TABLE IF NOT EXISTS public.evaluation_task_perimeter (
    task_id  UUID NOT NULL REFERENCES public.evaluation_tasks(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
    PRIMARY KEY (task_id, skill_id)
);

COMMENT ON TABLE public.evaluation_task_perimeter IS
    'Family B - which observables this task can observe. skill_id MUST point to '
    'a skill with family = ''competence'' (enforced at DB layer via the '
    'check_perimeter_skill_is_competence trigger below).';

CREATE INDEX IF NOT EXISTS idx_evaluation_task_perimeter_skill ON public.evaluation_task_perimeter(skill_id);

-- =============================
-- Patched 2026-06-09 — security audit M2 : valider family = 'competence' au niveau DB
-- (le commentaire « enforced at application layer » était fragile : un prof
--  pouvait insérer un skill family='knowledge' dans le périmètre Famille B
--  et faire planter compute_*_level ou polluer la consolidation)
-- =============================
CREATE OR REPLACE FUNCTION public.check_perimeter_skill_is_competence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_family text;
BEGIN
    SELECT family INTO v_family
      FROM public.skills
     WHERE id = NEW.skill_id;

    IF v_family IS DISTINCT FROM 'competence' THEN
        RAISE EXCEPTION
            'evaluation_task_perimeter.skill_id must reference a competence skill (got family=%)',
            v_family;
    END IF;

    RETURN NEW;
END $$;

COMMENT ON FUNCTION public.check_perimeter_skill_is_competence() IS
    'Trigger guard: rejects evaluation_task_perimeter rows whose skill_id does '
    'not belong to family ''competence''. Replaces the fragile « enforced at '
    'application layer » convention.';

DROP TRIGGER IF EXISTS trg_perimeter_skill_family ON public.evaluation_task_perimeter;
CREATE TRIGGER trg_perimeter_skill_family
    BEFORE INSERT OR UPDATE ON public.evaluation_task_perimeter
    FOR EACH ROW
    EXECUTE FUNCTION public.check_perimeter_skill_is_competence();


-- ============================================================================
-- TEMPLATE <-> SKILL junction (decision 59: tag at template level, not instance)
-- ============================================================================
-- Source of truth for progression computation (cf. §5 + §6.1).
-- M2M: a template may tag multiple skills; one skill may be tagged on N
-- templates (typically N = number of canonical variations - decision 60).

CREATE TABLE IF NOT EXISTS public.question_template_skills (
    template_id UUID NOT NULL REFERENCES public.question_templates(id) ON DELETE CASCADE,
    skill_id    UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
    PRIMARY KEY (template_id, skill_id)
);

COMMENT ON TABLE public.question_template_skills IS
    'Junction tagging a question_template with one or more skills (decision 59). '
    'Family knowledge: tagging drives auto-progression. Family competence: '
    'documentation only (competence attempts go through evaluation_tasks).';

CREATE INDEX IF NOT EXISTS idx_question_template_skills_skill ON public.question_template_skills(skill_id);


-- ============================================================================
-- skill_attempts - DUAL-REGIME (Family A success-boolean / Family B code-ternary)
-- ============================================================================
-- One attempt per (student, skill, occasion). The two regimes are mutually
-- exclusive at the row level (decision 54):
--   - Family knowledge: success != NULL, code & task_id NULL, template_id != NULL
--   - Family competence: success NULL, code != NULL, task_id != NULL
-- Attempts are IMMUTABLE: no UPDATE / DELETE policies (decision 72).

CREATE TABLE IF NOT EXISTS public.skill_attempts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id      UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,

    -- Family knowledge:
    success       BOOLEAN,
    template_id   UUID REFERENCES public.question_templates(id) ON DELETE SET NULL,

    -- Family competence (ternary code; '∅' is implicit - no row stored):
    code          TEXT,                          -- 'plus' | 'minus'
    task_id       UUID REFERENCES public.evaluation_tasks(id) ON DELETE CASCADE,

    -- Common metadata:
    source        TEXT NOT NULL,                 -- 'auto' | 'teacher' | 'student_self'
    source_ref    UUID,
    with_help     BOOLEAN NOT NULL DEFAULT FALSE,
    phase_blocage TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ---------- CHECK constraints ----------

    CONSTRAINT chk_attempt_code_values CHECK (
        code IS NULL OR code IN ('plus', 'minus')
    ),

    CONSTRAINT chk_attempt_source_values CHECK (
        source IN ('auto', 'teacher', 'student_self')
    ),

    -- Dual-regime XOR (decision 54):
    --   knowledge:  success != NULL AND code IS NULL AND task_id IS NULL
    --              (template_id should also be non-null for the
    --               distinct_template_successes rule, enforced below)
    --   competence: success IS NULL AND code != NULL AND task_id != NULL
    CONSTRAINT chk_attempt_family_regime CHECK (
        (success IS NOT NULL AND code IS NULL AND task_id IS NULL)
        OR
        (success IS NULL AND code IS NOT NULL AND task_id IS NOT NULL)
    ),

    -- Family knowledge requires template_id (needed for the
    -- distinct_template_successes coverage rule on capacite_attendue).
    CONSTRAINT chk_attempt_knowledge_template CHECK (
        success IS NULL                          -- Family competence row: abstain
        OR template_id IS NOT NULL               -- Family knowledge row: template_id mandatory
    )
);

COMMENT ON TABLE public.skill_attempts IS
    'Dual-regime attempts table (decision 54). Family knowledge rows carry '
    '(success, template_id), family competence rows carry (code, task_id). '
    'Attempts are IMMUTABLE: no UPDATE/DELETE allowed via RLS.';

COMMENT ON COLUMN public.skill_attempts.code IS
    'Family competence only: ''plus'' (+) or ''minus'' (-). The ''∅'' code is '
    'implicit (no row stored = out of perimeter).';
COMMENT ON COLUMN public.skill_attempts.with_help IS
    'Marker for analytics / error-book. Does NOT affect the acquisition rule '
    '(decision 58 - tutor help is a marker, not a penalty).';

-- Indexes - common patterns: per-student recent, per-skill recent, per-task
CREATE INDEX IF NOT EXISTS idx_skill_attempts_student_skill_time
    ON public.skill_attempts(student_id, skill_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_attempts_student_time
    ON public.skill_attempts(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_attempts_skill_time
    ON public.skill_attempts(skill_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_attempts_task
    ON public.skill_attempts(task_id) WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skill_attempts_template
    ON public.skill_attempts(template_id) WHERE template_id IS NOT NULL;


-- ============================================================================
-- CACHES (recomputed by triggers - functions in migration 1.2)
-- ============================================================================

-- Family A - binary state per capacity (decision 62: needs_remediation only,
-- no needs_reinforcement which would be redundant with to_review computed in
-- the view below).
CREATE TABLE IF NOT EXISTS public.student_skill_state_a (
    student_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id                    UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    is_acquired                 BOOLEAN NOT NULL DEFAULT FALSE,
    total_successes             INTEGER NOT NULL DEFAULT 0,
    distinct_template_successes INTEGER NOT NULL DEFAULT 0,
    last_success_at             TIMESTAMPTZ,
    last_attempt_at             TIMESTAMPTZ,
    needs_remediation           BOOLEAN NOT NULL DEFAULT FALSE,  -- 🆘 : >= 2 failures in recent window
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (student_id, skill_id)
);

COMMENT ON TABLE public.student_skill_state_a IS
    'Family A cache - binary acquisition state per capacity. Recomputed by '
    'trigger on INSERT skill_attempts (family knowledge). Decision 70: '
    'to_review is NOT stored here, it is computed in student_skill_state_a_v '
    'from last_success_at to avoid stale-cache issues (depends on NOW()).';

-- Helps the to_review computation (last_success_at < NOW() - 30d) over
-- a full student snapshot.
CREATE INDEX IF NOT EXISTS idx_student_skill_state_a_student_last_success
    ON public.student_skill_state_a(student_id, last_success_at)
    WHERE is_acquired = TRUE;

CREATE INDEX IF NOT EXISTS idx_student_skill_state_a_needs_remediation
    ON public.student_skill_state_a(student_id)
    WHERE needs_remediation = TRUE;


-- =============================
-- Patched 2026-06-09 — security audit C1 : VIEW security_invoker
-- (sans security_invoker, la vue s'exécute avec les privilèges du créateur
--  superuser et bypasse RLS de student_skill_state_a — n'importe quel élève
--  authentifié pouvait lire le cache de tous via la vue)
-- =============================
-- VIEW exposing the to_review flag (decision 70 - computed at read time)
CREATE OR REPLACE VIEW public.student_skill_state_a_v AS
SELECT
    s.student_id,
    s.skill_id,
    s.is_acquired,
    s.total_successes,
    s.distinct_template_successes,
    s.last_success_at,
    s.last_attempt_at,
    s.needs_remediation,
    s.updated_at,
    (s.is_acquired AND s.last_success_at < NOW() - INTERVAL '30 days') AS to_review
FROM public.student_skill_state_a s;

-- Force the view to run with the caller's privileges so the underlying
-- student_skill_state_a RLS policies are enforced (cf. minesweeper_leaderboard).
ALTER VIEW public.student_skill_state_a_v SET (security_invoker = on);

COMMENT ON VIEW public.student_skill_state_a_v IS
    'Read-time view adding to_review (acquired but last success > 30 days ago). '
    'Decision 70 - avoids the stale-cache problem of a stored flag depending on NOW(). '
    'security_invoker = on so RLS of student_skill_state_a is enforced for callers.';


-- Family B - consolidated state per observable
CREATE TABLE IF NOT EXISTS public.student_observable_state (
    student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,  -- must be family 'competence'
    count_plus      INTEGER NOT NULL DEFAULT 0,
    count_minus     INTEGER NOT NULL DEFAULT 0,
    is_acquis       BOOLEAN NOT NULL DEFAULT FALSE,  -- (count_plus >= 2) AND (count_plus > count_minus)
    last_attempt_at TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (student_id, skill_id)
);

COMMENT ON TABLE public.student_observable_state IS
    'Family B cache - consolidated state per observable. Recomputed by trigger '
    'on INSERT skill_attempts (family competence). Rule: is_acquis ssi '
    '(count_plus >= 2) AND (count_plus > count_minus). Cf. §6.1bis.';

CREATE INDEX IF NOT EXISTS idx_student_observable_state_student_acquis
    ON public.student_observable_state(student_id, is_acquis);


-- Family B - competence-level state (Insuffisante / Fragile / Satisfaisante / Très bonne)
CREATE TABLE IF NOT EXISTS public.student_competence_level (
    student_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    math_competence_id    UUID NOT NULL REFERENCES public.math_competences(id) ON DELETE CASCADE,
    niveau                TEXT NOT NULL,
    validated_observables JSONB,                 -- list of observable_codes acquired
    missing_for_next      JSONB,                 -- list of observable_codes missing for next level (transparency)
    task_count            INTEGER,               -- number of in-perimeter tasks (minimum-tasks guard)
    last_recalc_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (student_id, math_competence_id),

    CONSTRAINT chk_student_competence_level_niveau CHECK (
        niveau IN ('insuffisante', 'fragile', 'satisfaisante', 'tres_bonne')
    )
);

COMMENT ON TABLE public.student_competence_level IS
    'Family B cache - competence-level verdict (4 levels of the socle commun). '
    'Recomputed by trigger after student_observable_state update, via the '
    '6 conjunctive rules implemented in compute_<competence>_level functions '
    '(migration 1.2). missing_for_next supports the transparency principle.';

CREATE INDEX IF NOT EXISTS idx_student_competence_level_student
    ON public.student_competence_level(student_id);


-- ============================================================================
-- ROW LEVEL SECURITY (decision 72)
-- ============================================================================

-- ---------- Referentiel tables: public read for authenticated users ----------

ALTER TABLE public.skill_themes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_objectives                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.math_competences                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.math_competence_subdimensions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_template_skills        ENABLE ROW LEVEL SECURITY;

-- SELECT TO authenticated USING (true) on all referentiel tables.
-- INSERT / UPDATE / DELETE: service role only (no policy = denied).

CREATE POLICY "skill_themes_read_authenticated"
    ON public.skill_themes
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "skill_objectives_read_authenticated"
    ON public.skill_objectives
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "skills_read_authenticated"
    ON public.skills
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "math_competences_read_authenticated"
    ON public.math_competences
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "math_competence_subdimensions_read_authenticated"
    ON public.math_competence_subdimensions
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "question_template_skills_read_authenticated"
    ON public.question_template_skills
    FOR SELECT
    TO authenticated
    USING (TRUE);


-- ---------- skill_attempts ----------

ALTER TABLE public.skill_attempts ENABLE ROW LEVEL SECURITY;

-- SELECT: student sees own attempts
CREATE POLICY "skill_attempts_select_own"
    ON public.skill_attempts
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

-- SELECT: teacher sees attempts of their students
CREATE POLICY "skill_attempts_select_teacher"
    ON public.skill_attempts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.classes c
            JOIN public.class_members cm ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
              AND cm.student_id = skill_attempts.student_id
        )
    );

-- =============================
-- Patched 2026-06-09 — security audit C2 fix 2 : interdire la famille B en self-insert élève
-- (sans ce verrou, un élève pouvait s'auto-déclarer plus/minus famille B en
--  référençant une evaluation_task fabriquée et gonfler son verdict de compétences math)
-- =============================
-- INSERT: student inserts own attempts via auto / student_self
-- Family B (code IS NOT NULL) is forbidden here: competence attempts must
-- always go through a teacher (skill_attempts_insert_teacher).
CREATE POLICY "skill_attempts_insert_own_student"
    ON public.skill_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND source IN ('auto', 'student_self')
        AND code IS NULL          -- famille B interdite en auto-déclaration élève
        AND task_id IS NULL       -- redondant avec code IS NULL mais explicite
    );

-- =============================
-- Patched 2026-06-09 — security audit M1 : vérifier l'ownership de task_id
-- (sans cette vérification, un prof A pouvait insérer un skill_attempt famille B
--  en référençant une evaluation_task appartenant au prof B)
-- =============================
-- INSERT: teacher inserts attempts for their students with source = 'teacher'
CREATE POLICY "skill_attempts_insert_teacher"
    ON public.skill_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        source = 'teacher'
        AND EXISTS (
            SELECT 1
            FROM public.classes c
            JOIN public.class_members cm ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
              AND cm.student_id = skill_attempts.student_id
        )
        AND (
            task_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.evaluation_tasks t
                WHERE t.id = task_id
                  AND t.teacher_id = auth.uid()
            )
        )
    );

-- NO UPDATE / DELETE policy: attempts are immutable evaluation data.

-- Note: aucun filtre sur classes.is_active dans les policies SELECT prof
-- (skill_attempts_select_teacher, student_*_select_teacher, etc.). Décision
-- 2026-06-09 : un prof garde l'accès en lecture aux skill_attempts de ses
-- ex-élèves même après archivage de la classe (historique consultable).


-- ---------- Caches: SELECT scoped to student/teacher; no INSERT/UPDATE policy ----------

ALTER TABLE public.student_skill_state_a     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_observable_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_competence_level  ENABLE ROW LEVEL SECURITY;

-- student_skill_state_a
CREATE POLICY "student_skill_state_a_select_own"
    ON public.student_skill_state_a
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "student_skill_state_a_select_teacher"
    ON public.student_skill_state_a
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.classes c
            JOIN public.class_members cm ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
              AND cm.student_id = student_skill_state_a.student_id
        )
    );

-- student_observable_state
CREATE POLICY "student_observable_state_select_own"
    ON public.student_observable_state
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "student_observable_state_select_teacher"
    ON public.student_observable_state
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.classes c
            JOIN public.class_members cm ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
              AND cm.student_id = student_observable_state.student_id
        )
    );

-- student_competence_level
CREATE POLICY "student_competence_level_select_own"
    ON public.student_competence_level
    FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "student_competence_level_select_teacher"
    ON public.student_competence_level
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.classes c
            JOIN public.class_members cm ON cm.class_id = c.id
            WHERE c.teacher_id = auth.uid()
              AND cm.student_id = student_competence_level.student_id
        )
    );

-- NO INSERT/UPDATE/DELETE policy on caches: trigger uses SECURITY DEFINER
-- (defined in migration 1.2). Users cannot write directly.


-- ---------- evaluation_tasks ----------

ALTER TABLE public.evaluation_tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: teacher who created the task
CREATE POLICY "evaluation_tasks_select_teacher"
    ON public.evaluation_tasks
    FOR SELECT
    TO authenticated
    USING (teacher_id = auth.uid());

-- SELECT: students of the target class (only if class_id is set)
CREATE POLICY "evaluation_tasks_select_student"
    ON public.evaluation_tasks
    FOR SELECT
    TO authenticated
    USING (
        class_id IS NOT NULL
        AND class_id IN (
            SELECT cm.class_id
            FROM public.class_members cm
            WHERE cm.student_id = auth.uid()
        )
    );

-- =============================
-- Patched 2026-06-09 — security audit C2 fix 1 : restreindre aux profs/admins
-- (sans is_teacher_or_admin(), un élève authentifié pouvait s'auto-déclarer
--  teacher_id = auth.uid() et créer une fake evaluation_task, base de l'attaque
--  d'auto-attribution de compétences math décrite dans le rapport d'audit)
-- =============================
-- INSERT: teacher (or admin) creates tasks they own
CREATE POLICY "evaluation_tasks_insert_teacher"
    ON public.evaluation_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        teacher_id = auth.uid()
        AND public.is_teacher_or_admin()
    );

-- UPDATE: teacher (or admin) updates own tasks
CREATE POLICY "evaluation_tasks_update_teacher"
    ON public.evaluation_tasks
    FOR UPDATE
    TO authenticated
    USING (
        teacher_id = auth.uid()
        AND public.is_teacher_or_admin()
    )
    WITH CHECK (
        teacher_id = auth.uid()
        AND public.is_teacher_or_admin()
    );

-- DELETE: teacher (or admin) deletes own tasks
CREATE POLICY "evaluation_tasks_delete_teacher"
    ON public.evaluation_tasks
    FOR DELETE
    TO authenticated
    USING (
        teacher_id = auth.uid()
        AND public.is_teacher_or_admin()
    );


-- ---------- evaluation_task_perimeter (inherits from evaluation_tasks) ----------

ALTER TABLE public.evaluation_task_perimeter ENABLE ROW LEVEL SECURITY;

-- SELECT: teacher who owns the task, OR student of the target class
CREATE POLICY "evaluation_task_perimeter_select_teacher"
    ON public.evaluation_task_perimeter
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluation_tasks t
            WHERE t.id = evaluation_task_perimeter.task_id
              AND t.teacher_id = auth.uid()
        )
    );

CREATE POLICY "evaluation_task_perimeter_select_student"
    ON public.evaluation_task_perimeter
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluation_tasks t
            WHERE t.id = evaluation_task_perimeter.task_id
              AND t.class_id IS NOT NULL
              AND t.class_id IN (
                  SELECT cm.class_id
                  FROM public.class_members cm
                  WHERE cm.student_id = auth.uid()
              )
        )
    );

-- INSERT / UPDATE / DELETE: teacher who owns the parent task
CREATE POLICY "evaluation_task_perimeter_insert_teacher"
    ON public.evaluation_task_perimeter
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluation_tasks t
            WHERE t.id = evaluation_task_perimeter.task_id
              AND t.teacher_id = auth.uid()
        )
    );

CREATE POLICY "evaluation_task_perimeter_update_teacher"
    ON public.evaluation_task_perimeter
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluation_tasks t
            WHERE t.id = evaluation_task_perimeter.task_id
              AND t.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluation_tasks t
            WHERE t.id = evaluation_task_perimeter.task_id
              AND t.teacher_id = auth.uid()
        )
    );

CREATE POLICY "evaluation_task_perimeter_delete_teacher"
    ON public.evaluation_task_perimeter
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluation_tasks t
            WHERE t.id = evaluation_task_perimeter.task_id
              AND t.teacher_id = auth.uid()
        )
    );


-- ============================================================================
-- ADMIN OVERRIDE POLICIES
-- ============================================================================
-- Admins bypass the role-scoped policies above on every table created by this
-- migration. Uses the existing public.is_admin() security-definer helper
-- (migration 012_fix_rls_recursion.sql, re-defined in 017_fix_rls_with_bypass.sql)
-- which reads profiles.role without triggering RLS recursion.
--
-- Pattern follows 082_create_assessment_system.sql:
--   FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())
--
-- These policies are additive (PostgreSQL OR-combines policies of the same
-- command), so they only grant access; they never restrict the existing
-- read/write policies for students and teachers.

-- ---------- Referentiel tables (Family A + Family B) ----------

CREATE POLICY "Admins can manage all skill_themes"
    ON public.skill_themes
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all skill_objectives"
    ON public.skill_objectives
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all skills"
    ON public.skills
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all math_competences"
    ON public.math_competences
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all math_competence_subdimensions"
    ON public.math_competence_subdimensions
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all question_template_skills"
    ON public.question_template_skills
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ---------- Evaluation tasks + perimeter ----------

CREATE POLICY "Admins can manage all evaluation_tasks"
    ON public.evaluation_tasks
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all evaluation_task_perimeter"
    ON public.evaluation_task_perimeter
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ---------- skill_attempts ----------
-- NOTE: this admin policy overrides the immutability invariant (decision 72).
-- Admins are allowed to UPDATE/DELETE attempts for forensic / data-repair
-- purposes; the non-admin paths still cannot UPDATE/DELETE because the
-- corresponding policies are absent for them.

CREATE POLICY "Admins can manage all skill_attempts"
    ON public.skill_attempts
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ---------- Caches ----------
-- Admins can read every cache row; INSERT/UPDATE/DELETE remain effectively
-- handled by the SECURITY DEFINER trigger (migration 1.2), but the FOR ALL
-- clause is kept for consistency and to allow admin-driven manual recompute.

CREATE POLICY "Admins can manage all student_skill_state_a"
    ON public.student_skill_state_a
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all student_observable_state"
    ON public.student_observable_state
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage all student_competence_level"
    ON public.student_competence_level
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.skill_themes                  TO authenticated;
GRANT SELECT ON public.skill_objectives              TO authenticated;
GRANT SELECT ON public.skills                        TO authenticated;
GRANT SELECT ON public.math_competences              TO authenticated;
GRANT SELECT ON public.math_competence_subdimensions TO authenticated;
GRANT SELECT ON public.question_template_skills      TO authenticated;

GRANT SELECT, INSERT                  ON public.skill_attempts             TO authenticated;
GRANT SELECT                          ON public.student_skill_state_a      TO authenticated;
GRANT SELECT                          ON public.student_skill_state_a_v    TO authenticated;
GRANT SELECT                          ON public.student_observable_state   TO authenticated;
GRANT SELECT                          ON public.student_competence_level   TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_tasks            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_task_perimeter   TO authenticated;
