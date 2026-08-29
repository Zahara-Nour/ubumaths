/**
 * Database Helper Types
 * =====================
 *
 * This file contains convenience type aliases derived from the auto-generated database.ts.
 * These types are NOT auto-generated and will persist across database type regenerations.
 *
 * IMPORTANT: Do NOT add these types to database.ts as that file is auto-generated
 * by `pnpm db:types` (supabase gen types typescript) and will be overwritten.
 *
 * ## Why This File Exists
 *
 * `database.ts` is auto-generated from the PostgreSQL schema. Any manual additions
 * are lost on regeneration. This file provides a stable location for:
 *
 * 1. **Convenience aliases** - Shorter, more readable type names
 * 2. **Composite types** - Structures combining data from multiple sources
 * 3. **Union types** - Constrained string values for type safety
 *
 * ## Types of Definitions
 *
 * | Type                          | Origin              | Where to define        |
 * |-------------------------------|---------------------|------------------------|
 * | `Database`, `Tables<>`, `Json`| Auto-generated      | database.ts (don't touch) |
 * | `type X = Tables<'table'>`    | Derived (alias)     | HERE (database-helpers.ts) |
 * | `interface X { ... }`         | Composite/custom    | HERE (database-helpers.ts) |
 * | `type X = 'a' \| 'b'`         | Union (constrained) | HERE (database-helpers.ts) |
 *
 * ## Examples
 *
 * ### 1. Convenience Alias (reduces verbosity)
 * ```typescript
 * // BEFORE (verbose)
 * const user: Database['public']['Tables']['profiles']['Row'] = ...
 *
 * // AFTER (readable)
 * export type Profile = Tables<'profiles'>;
 * const user: Profile = ...
 * ```
 *
 * ### 2. Composite Type (data enriched in code, not from DB directly)
 * ```typescript
 * // Combines friendship row + joined profile + presence data
 * export interface FriendshipWithProfile {
 *   id: string;
 *   status: FriendshipStatus;
 *   friend_profile: FriendProfile;  // Manually joined data
 * }
 * ```
 *
 * ### 3. Union Type (constrains string values)
 * ```typescript
 * // In DB it's just "string", but we know the valid values
 * export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';
 * ```
 *
 * ## When to Add Types Here
 *
 * Add a type here if:
 * - You need a shorter alias for `Tables<'table_name'>`
 * - You're building a composite structure from multiple DB queries
 * - You want type-safe constraints on string enum values
 * - The type would otherwise be lost on `pnpm db:types` regeneration
 */

import type { Database, Tables } from './database';
import type { QuestionTemplate } from '$lib/questions/types';
import type { GradeCode } from '$lib/types/grades';

// ============================================================================
// Table Row Type Aliases
// ============================================================================

/** Class table row type alias */
export type Class = Tables<'classes'>;

/** Migration edit row type alias */
export type MigrationEdit = Tables<'migration_edits'>;

/** Class schedule table row type alias */
export type ClassSchedule = Tables<'class_schedules'>;

/** Profile table row type alias */
export type Profile = Tables<'profiles'>;

/** Student buddy table row type alias */
export type StudentBuddy = Tables<'student_buddies'>;

/** Buddy skin table row type alias */
export type BuddySkin = Tables<'buddy_skins'>;

/** Parody evaluation table row type alias */
export type ParodyEvaluation = Tables<'parody_evaluations'>;

/**
 * Notebook checkpoint run table row type alias.
 *
 * One row per (notebook_id, user_id, cell_id) — the API upserts the latest
 * run so only the most recent verdict per checkpoint cell × student is kept.
 * `status` is a TEXT column constrained server-side by Zod
 * (`checkpointStatusSchema = z.enum(['passed', 'failed'])`) and DB-side by a
 * CHECK; use the `CheckpointRunStatus` union below to narrow it on read.
 */
export type CheckpointRun = Tables<'python_notebook_checkpoint_runs'>;

/** Narrowed status union for `CheckpointRun.status` (DB CHECK-constrained). */
export type CheckpointRunStatus = 'passed' | 'failed';

/**
 * Presentation-shape of a checkpoint run for the teacher dashboard.
 *
 * Composite type (column subset + camelCase rename) used by
 * `/python-notebook/[id]/results`. Lives here rather than next to the
 * page so the type can be imported by client code without crossing the
 * `.server.ts` boundary.
 *
 * - `attemptCount` mirrors the sticky DB counter (incremented every run).
 * - `attemptCount === 0` is a special case: the student revealed the hint
 *   before ever pressing Vérifier (rare; the UI normally requires 2 failed
 *   attempts to surface the hint button). The dashboard renders this as
 *   "not yet attempted" rather than "failed" even though `status='failed'`
 *   on the placeholder row.
 */
export interface CheckpointDetail {
	status: CheckpointRunStatus;
	attemptCount: number;
	firstAttemptedAt: string | null;
	succeededAt: string | null;
	hintRevealed: boolean;
}

// ============================================================================
// VIP Card Types
// ============================================================================

/** Activation context for self-activatable VIP cards */
export type ActivationContext = 'any' | 'minesweeper';

// ============================================================================
// Friendship Types
// ============================================================================

/** Friendship status: pending, accepted, or rejected */
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

/**
 * Friendship relation type — collapsed to a single value 'friend' (RGPD: 'mentor' and
 * 'classmate' were removed). Enforced by the DB CHECK constraint (see migration
 * 20260613_friendships_single_relation_type.sql).
 */
export type FriendshipRelationType = 'friend';

/** Friend profile information for display */
export interface FriendProfile {
	id: string;
	full_name: string | null;
	firstname: string | null;
	lastname: string | null;
	avatar_url: string | null;
	role: 'student' | 'teacher' | 'admin';
	presence?: {
		is_online: boolean;
		last_seen: string;
	};
}

/** Friendship with enriched friend profile data */
export interface FriendshipWithProfile {
	id: string;
	status: FriendshipStatus;
	friendship_type: FriendshipRelationType;
	created_at: string;
	updated_at: string;
	requester_id: string;
	addressee_id: string;
	friend_profile: FriendProfile;
}

// ============================================================================
// Migration Edit Types
// ============================================================================

/**
 * Migration edit with properly typed edited_json field.
 *
 * The database stores edited_json as JSONB, but we know it's a QuestionTemplate.
 */
export interface MigrationEditWithTemplate {
	id: string;
	migration_tracking_id: string;
	old_question_hash: string;
	edited_json: Partial<QuestionTemplate>;
	editor_id: string;
	edit_notes: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Input type for creating/updating a migration edit
 */
export interface MigrationEditInput {
	editedTransformed: Partial<QuestionTemplate>;
	notes?: string;
}

// ============================================================================
// Kanban Types
// ============================================================================
//
// Row aliases come from the auto-generated database.ts; the Insert/Update
// helpers + composite types live here per CLAUDE.md rule 6.
// ============================================================================

/** Kanban board row. class_id NULL = personal board; NOT NULL = class board. */
export type KanbanBoard = Tables<'kanban_boards'>;

/** Kanban column row (lives inside a board). */
export type KanbanColumn = Tables<'kanban_columns'>;

/** Kanban card row (lives inside a column). */
export type KanbanCard = Tables<'kanban_cards'>;

/** Kanban tag row (board-scoped colored label). */
export type KanbanTag = Tables<'kanban_tags'>;

/** Allowed tag colors (must match the kanban_tag_color enum). */
export type KanbanTagColor = KanbanTag['color'];

/**
 * Lightweight profile slice exposed alongside a board so the assignee picker
 * and avatar chips can render a name/avatar without re-fetching profiles
 * client-side. Sourced from `profiles`.
 *
 * `firstname` / `lastname` / `role` are carried so we can reuse the project's
 * canonical UserAvatar component, which needs them for the role-based
 * fallback image and initials.
 */
export interface KanbanBoardMember {
	id: string;
	full_name: string | null;
	firstname: string | null;
	lastname: string | null;
	avatar_url: string | null;
	role: 'student' | 'teacher' | 'admin' | null;
}

/** Insert payload for kanban_boards (id + timestamps optional, defaulted by DB). */
export type KanbanBoardInsert = Omit<KanbanBoard, 'id' | 'created_at' | 'updated_at'> & {
	id?: string;
	created_at?: string;
	updated_at?: string;
};

/**
 * Update payload for kanban_boards. `class_id` is intentionally immutable
 * post-creation: changing it would silently grant/revoke board access to class
 * members, which is a confusing UX. Convert via a dedicated endpoint if needed.
 */
export type KanbanBoardUpdate = Partial<
	Omit<KanbanBoard, 'id' | 'owner_id' | 'class_id' | 'created_at'>
>;

/** Insert payload for kanban_columns. */
export type KanbanColumnInsert = Omit<KanbanColumn, 'id' | 'created_at'> & {
	id?: string;
	created_at?: string;
};

/** Update payload for kanban_columns. */
export type KanbanColumnUpdate = Partial<Omit<KanbanColumn, 'id' | 'board_id' | 'created_at'>>;

/** Insert payload for kanban_cards. */
export type KanbanCardInsert = Omit<KanbanCard, 'id' | 'created_at' | 'updated_at'> & {
	id?: string;
	created_at?: string;
	updated_at?: string;
};

/** Update payload for kanban_cards. */
export type KanbanCardUpdate = Partial<Omit<KanbanCard, 'id' | 'column_id' | 'created_at'>>;

/**
 * Composite type used by the board list endpoint: a board enriched with the
 * number of columns and cards it contains (counted server-side). NOT a DB row.
 */
export interface KanbanBoardWithCounts extends KanbanBoard {
	column_count: number;
	card_count: number;
}

/** Insert payload for kanban_tags (id + created_at optional, defaulted by DB). */
export type KanbanTagInsert = Omit<KanbanTag, 'id' | 'created_at'> & {
	id?: string;
	created_at?: string;
};

/** Update payload for kanban_tags (board_id immutable; only name/color mutate). */
export type KanbanTagUpdate = Partial<Pick<KanbanTag, 'name' | 'color'>>;

// ============================================================================
// Skills System — Phase 1 référentiel de compétences (2026-06-09)
// ============================================================================
// Spec      : docs/wip/skills-referentiel-design.md (décisions 57-72)
// Migrations: supabase/migrations/20260609120000..02_competence_referentiel_*.sql
// Business types stables (KnowledgeType, MathCompetenceLevel, ...) : src/lib/types/skills.ts
// ============================================================================

import type {
	KnowledgeType,
	MathCompetenceCode,
	MathCompetenceLevel,
	SkillAttemptCode,
	SkillSource,
	SubdimensionLetter,
	MissingForNext,
	ValidatedObservables,
	PhaseBlocage
} from './skills';

// --- Contenus disciplinaires ----------------------------------------------
// Depuis la refonte 2026-08-29, ils vivent dans l'arbre `curriculum_*`
// (voir plus bas). `skill_themes` / `skill_objectives` ont été supprimées.

// --- Compétences mathématiques transversales ------------------------------

/** One of the 6 transversal math competences (Chercher, Calculer, ...). */
export type MathCompetence = Tables<'math_competences'>;

/** Structural subdimension (A/B/C/D) under a math competence. No state of its own (décision 50). */
export type MathCompetenceSubdimension = Tables<'math_competence_subdimensions'>;

// --- Observable (unité de saisie famille B) --------------------------------

/**
 * An observable of a math competence (ex-`skills` famille B).
 *
 * Refonte 2026-08-29 : la table ne contient plus que des observables — la
 * discrimination `family` et les capacités disciplinaires ont disparu (ces
 * dernières sont devenues des `curriculum_points`).
 */
export type Observable = Tables<'observables'>;

// --- Tagging junction (template ↔ point de programme) ----------------------

/** Junction question_template → curriculum point (décision 59 — tagging at template level). */
export type QuestionTemplatePoint = Tables<'question_template_points'>;

// --- Tâches d'évaluation (compétences math) --------------------------------

/** A teacher-declared evaluation context for family-B observation. */
export type EvaluationTask = Tables<'evaluation_tasks'>;

/** Perimeter row: list of observables a task allows observing (décision 46). */
export type EvaluationTaskPerimeter = Tables<'evaluation_task_perimeter'>;

// --- Attempts (dual regime) ------------------------------------------------

/**
 * Raw skill_attempts row. The actual shape splits in two regimes via CHECK
 * constraint chk_attempt_regime:
 * - Contenus:    `success` boolean + `template_id` non-null, `observable_id`/`code`/`task_id` null
 * - Compétences: `observable_id` + `code` 'plus'|'minus' + `task_id` non-null, `success` null
 *
 * Le régime contenus ne porte pas de FK vers le point : l'état de chaque point
 * est dérivé via `question_template_points` (refonte per-template 2026-06-10,
 * 1 ligne par réponse). Use the discriminated `SkillAttempt` for safer narrowing.
 */
type SkillAttemptRaw = Tables<'skill_attempts'>;

/**
 * Discriminated skill attempt. Use this when reading attempts from DB —
 * the dual regime is enforced at the type level.
 */
export type SkillAttempt =
	| (Omit<
			SkillAttemptRaw,
			'success' | 'code' | 'task_id' | 'template_id' | 'observable_id' | 'source' | 'phase_blocage'
	  > & {
			success: boolean;
			code: null;
			task_id: null;
			template_id: string;
			observable_id: null;
			source: SkillSource;
			phase_blocage: PhaseBlocage | null;
	  })
	| (Omit<
			SkillAttemptRaw,
			'success' | 'code' | 'task_id' | 'template_id' | 'observable_id' | 'source' | 'phase_blocage'
	  > & {
			success: null;
			code: SkillAttemptCode;
			task_id: string;
			template_id: null;
			observable_id: string;
			source: SkillSource;
			phase_blocage: PhaseBlocage | null;
	  });

// --- Caches (recomputed by trigger) ----------------------------------------

/**
 * Cache row per (student, curriculum point). Recomputed by trigger on INSERT
 * skill_attempts (cf. décision 70 — `to_review` lives in the VIEW).
 */
export type StudentPointState = Tables<'student_point_state'>;

/**
 * VIEW exposing student_point_state + computed `to_review` flag (décision 70).
 * Use this from the client; never read directly from `student_point_state`.
 */
export type StudentPointStateV = Tables<'student_point_state_v'>;

/** Cache row for math competences per (student, observable). */
export type StudentObservableState = Tables<'student_observable_state'>;

/**
 * Cache row for family competence per (student, math_competence). The
 * `niveau` is computed by `compute_competence_level()` PL/pgSQL function
 * (décision 69). `validated_observables` and `missing_for_next` carry the
 * transparency-of-verdict payload (décision 48 + §6.1ter).
 *
 * The `missing_for_next` JSONB is typed as `MissingForNext` (discriminated
 * union from skills.ts) — cast it when consuming:
 *   `const missing = row.missing_for_next as MissingForNext;`
 */
export type StudentCompetenceLevel = Omit<
	Tables<'student_competence_level'>,
	'niveau' | 'missing_for_next' | 'validated_observables'
> & {
	niveau: MathCompetenceLevel;
	missing_for_next: MissingForNext;
	validated_observables: ValidatedObservables;
};

// --- Composite/enriched types (joined) ------------------------------------

/** Math competence with its full subdimensions (≈ 22 across the 6 competences). */
export interface MathCompetenceWithSubdimensions extends MathCompetence {
	subdimensions: MathCompetenceSubdimension[];
}

/** Observable joined with its subdimension and parent math competence. */
export interface ObservableWithContext {
	observable: Observable;
	subdimension: MathCompetenceSubdimension;
	competence: MathCompetence;
}

/** Evaluation task joined with its declared perimeter (list of observable IDs). */
export interface EvaluationTaskWithPerimeter extends EvaluationTask {
	perimeter_skill_ids: string[];
}

// ============================================================================
// Anti-fraud SRS — chantier 2026-06-10 (B+C)
// ============================================================================

/** Raw row from srs_anti_fraud_flags. Available after `pnpm db:types` regen. */
export type AntiFraudFlag = Tables<'srs_anti_fraud_flags'>;

/** Type discriminé pour la colonne flag_type (cf. CHECK contrainte SQL). */
export type AntiFraudFlagType =
	| 'high_easy_ratio'
	| 'no_again'
	| 'fast_timeSpent'
	| 'burst'
	| 'srs_vs_quiz_gap'
	| 'composite';

/** Severity 1..5 (1=info ; 5=critical). */
export type AntiFraudSeverity = 1 | 2 | 3 | 4 | 5;

/** Flag enrichi avec données élève + capacité (endpoint GET prof). */
export interface AntiFraudFlagWithStudent extends AntiFraudFlag {
	student: {
		id: string;
		first_name: string | null;
		last_name: string | null;
	};
	capacity: {
		id: string;
		name: string;
	} | null;
}

/** Raw row from app_config. */
export type AppConfig = Tables<'app_config'>;

// --- Game leaderboards ------------------------------------------------------

/**
 * One row of the unified game leaderboard (RPC `game_leaderboard`).
 * The generated type declares `rank: number`, but the teacher reference row is
 * returned with `rank = NULL` (hors-classement) — so we widen it to `number | null`.
 */
export type GameLeaderboardRow = Omit<
	Database['public']['Functions']['game_leaderboard']['Returns'][number],
	'rank'
> & { rank: number | null };

/**
 * One row of the school-scoped minesweeper detailed leaderboard
 * (RPC `minesweeper_scoped_leaderboard`). `rank` is NULL for provisional players
 * (< 10 qualifying games) and the teacher reference row.
 */
export type MinesweeperLeaderboardRow = Omit<
	Database['public']['Functions']['minesweeper_scoped_leaderboard']['Returns'][number],
	'rank'
> & { rank: number | null };

// --- Re-export business types for convenience -------------------------------
// (so consumers can import everything from database-helpers without two paths)

export type {
	KnowledgeType,
	MathCompetenceCode,
	MathCompetenceLevel,
	SkillAttemptCode,
	SkillSource,
	SubdimensionLetter,
	MissingForNext,
	ValidatedObservables,
	PhaseBlocage
};

// ============================================================================
// CURRICULUM TRACKING (suivi du programme — Phase 1)
// ============================================================================
//
// Référentiel de programme (Thème → Item → Point), DISTINCT du référentiel
// d'évaluation (skills/objectives). Couverture alimentée par le cahier de texte.
//
// Rows dérivées du `database.ts` généré ; on resserre seulement les colonnes
// contraintes que le générateur expose en `string`/`Json` (grade, kind, source,
// textbook_ref) vers leurs unions/formes réelles.

/**
 * Nature of a curriculum point — mirrors the three BO rubrics
 * (Contenus / Capacités attendues / Démonstrations).
 */
export type CurriculumPointKind = 'connaissance' | 'savoir_faire' | 'demonstration';

/** Whether a point is part of the expected programme or goes beyond it. */
export type CurriculumExigence = 'attendu' | 'approfondissement';

/** How a journal entry came to cover a point. */
export type CoverageSource = 'auto' | 'manual';

/** The kind of activity attached to a cahier de texte entry. */
export type JournalActivityKind = 'exercise' | 'textbook' | 'course';

/** Free-form textbook reference (manuel scolaire). `label` is required. */
export interface TextbookRef {
	label: string;
	manuel?: string;
	page?: string;
	numero?: string;
}

/** Level 1 — Thème (per grade). e.g. "Calcul". */
export type CurriculumTheme = Omit<Tables<'curriculum_themes'>, 'grade'> & { grade: GradeCode };

/** Level 2 — Objectif (under a Thème). e.g. "Fractions". What the student sees. */
export type CurriculumObjective = Tables<'curriculum_objectives'>;

/**
 * Level 3 — Point: the single grain for programme coverage, resource tagging
 * and student acquisition (refonte 2026-08-29 — absorbed family A capacities).
 *
 * `rang` is optional: 1-4 renders the objective as a descriptive scale
 * (référentiel 2016 style), NULL renders it as a plain checklist.
 */
export type CurriculumPoint = Omit<
	Tables<'curriculum_points'>,
	'kind' | 'knowledge_type' | 'exigence'
> & {
	kind: CurriculumPointKind;
	knowledge_type: KnowledgeType;
	exigence: CurriculumExigence;
};

/** Tags a system exercise with a curriculum point it covers. */
export type ExerciseCurriculumPoint = Tables<'exercise_curriculum_points'>;

/** An activity attached to a journal entry (system exercise / textbook / course point). */
export type JournalEntryActivity = Omit<
	Tables<'journal_entry_activities'>,
	'kind' | 'textbook_ref'
> & { kind: JournalActivityKind; textbook_ref: TextbookRef | null };

/** Coverage signal: a curriculum point worked on in a journal entry. */
export type JournalEntryPoint = Omit<Tables<'journal_entry_points'>, 'source'> & {
	source: CoverageSource;
};
