/**
 * Student Work Inbox — Types
 * ===========================
 *
 * Unified surface aggregating all work assigned to a student across the four
 * delivery systems (assessments, exercises a l'unite, worksheets, python).
 *
 * The aggregator (`src/lib/server/student-inbox.ts`) is the single source of
 * truth for the structure populated here. The corresponding UI surfaces
 * (page + home widget) consume `StudentWorkInbox` directly.
 */

export type WorkSource =
	| 'assessment'
	| 'exercise'
	| 'worksheet'
	| 'python'
	| 'python_notebook'
	| 'python_file';

export type WorkStatus = 'todo' | 'done';

/**
 * A single piece of work surfaced to the student, normalized across the four
 * source systems. Identity is `(source, itemId)` (used for dedup when the
 * same item is reachable both directly and via a class assignment).
 */
export interface WorkItem {
	source: WorkSource;
	/** Source item id (evaluation.id, exercise.id, worksheet.id, python_exercise.id, python_notebook.id, python_file.id). */
	itemId: string;
	/** Row id in the corresponding *_assignments table. */
	assignmentId: string;
	title: string;
	/**
	 * Forme d'une évaluation (« Entraînement », « Course aux nombres ») ; absente
	 * pour les autres sources.
	 */
	formLabel?: string;
	/**
	 * Évaluation : meilleure note sur 20 parmi les tentatives envoyées (Q36) ;
	 * absente (ou null) sans note et pour les autres sources.
	 */
	bestGrade?: number | null;
	/**
	 * Évaluation : une tentative est ouverte (commencée, pas envoyée). Le lien
	 * mène alors à sa reprise, même si une tentative précédente est terminée.
	 */
	resumable?: boolean;
	/**
	 * The class this item reaches the student through, when there is one — used
	 * for display. `null` for a purely individual assignment.
	 *
	 * ⚠️ Do NOT infer the distribution path from this field: an assignment can
	 * target the student's class AND name them individually, in which case both
	 * are set. Read {@link WorkItem.via} instead.
	 */
	classId: string | null;
	className: string | null;
	/**
	 * How the item reaches the student. Dedup precedence keys on this — never on
	 * `classId`, which is display-only.
	 */
	via: 'class' | 'direct';
	/** ISO timestamp. null means "no deadline". */
	dueAt: string | null;
	status: WorkStatus;
	/** true when the student has opened the item at least once. Today only tracked for exercises (via `exercise_completions.last_viewed_at`); the 3 other sources hard-code `false`. */
	viewed: boolean;
	/** ISO timestamp of completion. Drives the "Fait recemment" bucket. */
	doneAt: string | null;
	/** Route to the student-facing surface for this item. */
	href: string;
	/** ISO timestamp; used as secondary sort key. */
	assignedAt: string;
}

/**
 * Inbox grouped into the five sections defined in the spec. Each section is
 * sorted asc by `dueAt`, then desc by `assignedAt` as a tiebreaker.
 */
export interface StudentWorkInbox {
	late: WorkItem[];
	thisWeek: WorkItem[];
	later: WorkItem[];
	noDeadline: WorkItem[];
	doneRecently: WorkItem[];
}
