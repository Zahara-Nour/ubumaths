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
	/** Source item id (assessment.id, exercise.id, worksheet.id, python_exercise.id, python_notebook.id, python_file.id). */
	itemId: string;
	/** Row id in the corresponding *_assignments table. */
	assignmentId: string;
	title: string;
	/** null when the item is assigned directly to the student or is `public`. */
	classId: string | null;
	className: string | null;
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
