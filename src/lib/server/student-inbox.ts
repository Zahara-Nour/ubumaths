/**
 * Student Work Inbox — Aggregator
 * ================================
 *
 * Single entry point: `getStudentWorkInbox(supabase, userId)`.
 *
 * Fans out across the four assignment systems (assessments, exercises a l'unite,
 * worksheets, python) in parallel, dedups items reachable by multiple paths
 * (direct + class), and buckets the result into the 5 sections the UI renders.
 *
 * The caller-supplied Supabase client is assumed to already be RLS-scoped to
 * the logged-in user; we don't re-implement access control here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from '$lib/types/database';
import type { StudentWorkInbox, WorkItem, WorkSource } from '$lib/types/student-inbox';

type TypedSupabaseClient = SupabaseClient<Database>;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const LATE_ARCHIVE_MS = 30 * DAY_MS;

/**
 * Log Supabase errors without aborting the inbox build. A transient failure on
 * one source returns an empty subset for that source — visible to the user as
 * "missing items", surfaced to us via console for diagnostics. We don't throw,
 * because a single failing source shouldn't blank out the whole inbox.
 */
function logError(label: string, error: { message?: string } | null | undefined): void {
	if (error) console.error(`[student-inbox] ${label}:`, error);
}

// ============================================================================
// PUBLIC ENTRY POINT
// ============================================================================

export async function getStudentWorkInbox(
	supabase: TypedSupabaseClient,
	userId: string
): Promise<StudentWorkInbox> {
	const classIds = await fetchActiveClassIds(supabase, userId);

	const [assessmentItems, exerciseItems, worksheetItems, pythonItems] = await Promise.all([
		fetchAssessmentItems(supabase, userId, classIds),
		fetchExerciseItems(supabase, userId, classIds),
		fetchWorksheetItems(supabase, userId, classIds),
		fetchPythonItems(supabase, userId, classIds)
	]);

	const all = [...assessmentItems, ...exerciseItems, ...worksheetItems, ...pythonItems];
	const deduped = dedupItems(all);
	const now = new Date();
	return bucketize(deduped, now);
}

// ============================================================================
// SHARED HELPERS
// ============================================================================

async function fetchActiveClassIds(
	supabase: TypedSupabaseClient,
	userId: string
): Promise<string[]> {
	const { data, error } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', userId)
		.eq('status', 'active');

	logError('classMembers', error);
	return (data ?? []).map((row) => row.class_id);
}

/**
 * Dedup precedence: when the same `(source, itemId)` is reached both directly
 * and via class, prefer the direct one (lower friction / authoritative).
 * When both candidates are direct or both are class-based, the latest
 * `assignedAt` wins.
 */
function dedupItems(items: WorkItem[]): WorkItem[] {
	const map = new Map<string, WorkItem>();
	for (const item of items) {
		const key = `${item.source}:${item.itemId}`;
		const existing = map.get(key);
		if (!existing) {
			map.set(key, item);
			continue;
		}
		if (existing.classId !== null && item.classId === null) {
			map.set(key, item);
		} else if (existing.classId === item.classId && item.assignedAt > existing.assignedAt) {
			map.set(key, item);
		}
	}
	return Array.from(map.values());
}

function bucketize(items: WorkItem[], now: Date): StudentWorkInbox {
	const inbox: StudentWorkInbox = {
		late: [],
		thisWeek: [],
		later: [],
		noDeadline: [],
		doneRecently: []
	};
	const nowMs = now.getTime();

	for (const item of items) {
		if (item.status === 'done') {
			if (!item.doneAt) continue;
			const doneMs = Date.parse(item.doneAt);
			if (Number.isNaN(doneMs)) continue;
			if (nowMs - doneMs > WEEK_MS) continue;
			inbox.doneRecently.push(item);
			continue;
		}

		if (item.dueAt === null) {
			inbox.noDeadline.push(item);
			continue;
		}

		const dueMs = Date.parse(item.dueAt);
		if (Number.isNaN(dueMs)) {
			inbox.noDeadline.push(item);
			continue;
		}

		if (dueMs < nowMs) {
			if (nowMs - dueMs > LATE_ARCHIVE_MS) continue;
			inbox.late.push(item);
		} else if (dueMs <= nowMs + WEEK_MS) {
			inbox.thisWeek.push(item);
		} else {
			inbox.later.push(item);
		}
	}

	const sorter = makeBucketSorter();
	inbox.late.sort(sorter);
	inbox.thisWeek.sort(sorter);
	inbox.later.sort(sorter);
	inbox.noDeadline.sort(sorter);
	inbox.doneRecently.sort(sorter);
	return inbox;
}

function makeBucketSorter() {
	return (a: WorkItem, b: WorkItem) => {
		const aDue = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
		const bDue = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
		if (aDue !== bDue) return aDue - bDue;
		const aAssigned = Date.parse(a.assignedAt);
		const bAssigned = Date.parse(b.assignedAt);
		return bAssigned - aAssigned;
	};
}

/**
 * Build a `Map<classId, className>` for the given ids. Returns an empty map
 * when no ids are provided (avoids a `.in('id', [])` round-trip).
 */
async function fetchClassNames(
	supabase: TypedSupabaseClient,
	classIds: string[]
): Promise<Map<string, string>> {
	if (classIds.length === 0) return new Map();
	const { data, error } = await supabase.from('classes').select('id, name').in('id', classIds);
	logError('classNames', error);
	return new Map((data ?? []).map((row) => [row.id, row.name]));
}

// ============================================================================
// ASSESSMENTS
// ============================================================================

type AssessmentAssignmentJoined = Tables<'assessment_assignments'> & {
	assessment: Tables<'assessments'> | null;
};

async function fetchAssessmentItems(
	supabase: TypedSupabaseClient,
	userId: string,
	classIds: string[]
): Promise<WorkItem[]> {
	let query = supabase
		.from('assessment_assignments')
		.select('*, assessment:assessments(*)')
		.eq('assessment.status', 'published');

	if (classIds.length > 0) {
		query = query.or(`student_id.eq.${userId},class_id.in.(${classIds.join(',')})`);
	} else {
		query = query.eq('student_id', userId);
	}

	const { data: assignmentsRaw, error: assignmentsErr } = await query;
	logError('assessment.assignments', assignmentsErr);
	const assignments = (assignmentsRaw ?? []) as unknown as AssessmentAssignmentJoined[];
	const valid = assignments.filter((a) => a.assessment !== null);
	if (valid.length === 0) return [];

	const assignmentIds = valid.map((a) => a.id);
	const { data: sessionsRaw, error: sessionsErr } = await supabase
		.from('test_sessions')
		.select('assignment_id, completed_at')
		.in('assignment_id', assignmentIds)
		.eq('user_id', userId)
		.not('completed_at', 'is', null);
	logError('assessment.testSessions', sessionsErr);

	const latestCompletionByAssignment = new Map<string, string>();
	for (const session of sessionsRaw ?? []) {
		if (!session.assignment_id || !session.completed_at) continue;
		const current = latestCompletionByAssignment.get(session.assignment_id);
		if (!current || session.completed_at > current) {
			latestCompletionByAssignment.set(session.assignment_id, session.completed_at);
		}
	}

	const referencedClassIds = Array.from(
		new Set(valid.map((a) => a.class_id).filter((id): id is string => id !== null))
	);
	const classNames = await fetchClassNames(supabase, referencedClassIds);

	return valid.map<WorkItem>((assignment) => {
		const assessment = assignment.assessment as Tables<'assessments'>;
		const dueAt = extractAssessmentDeadline(assessment.settings);
		const doneAt = latestCompletionByAssignment.get(assignment.id) ?? null;
		return {
			source: 'assessment' satisfies WorkSource,
			itemId: assessment.id,
			assignmentId: assignment.id,
			title: assessment.title,
			classId: assignment.class_id,
			className: assignment.class_id ? (classNames.get(assignment.class_id) ?? null) : null,
			dueAt,
			status: doneAt ? 'done' : 'todo',
			viewed: false,
			doneAt,
			href: `/dashboard/student/assessments/${assessment.id}`,
			assignedAt: assignment.assigned_at
		};
	});
}

function extractAssessmentDeadline(settings: Json | null): string | null {
	if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
	const deadline = (settings as Record<string, unknown>).deadline;
	return typeof deadline === 'string' ? deadline : null;
}

// ============================================================================
// EXERCISES A L'UNITE
// ============================================================================

type ExerciseAssignmentRow = Tables<'exercise_assignments'>;
type ExerciseCompletionRow = Tables<'exercise_completions'>;
type ExerciseRow = Tables<'exercises'>;

async function fetchExerciseItems(
	supabase: TypedSupabaseClient,
	userId: string,
	classIds: string[]
): Promise<WorkItem[]> {
	const orClauses = [`student_id.eq.${userId}`, `assigned_to_type.eq.public`];
	if (classIds.length > 0) {
		orClauses.push(`class_id.in.(${classIds.join(',')})`);
	}

	const { data: assignmentsRaw, error: assignmentsErr } = await supabase
		.from('exercise_assignments')
		.select('*')
		.eq('is_active', true)
		.or(orClauses.join(','));
	logError('exercise.assignments', assignmentsErr);

	const assignments = (assignmentsRaw ?? []) as ExerciseAssignmentRow[];
	if (assignments.length === 0) return [];

	const exerciseIds = Array.from(new Set(assignments.map((a) => a.exercise_id)));
	const referencedClassIds = Array.from(
		new Set(assignments.map((a) => a.class_id).filter((id): id is string => id !== null))
	);

	const [exercisesRes, completionsRes, classNames] = await Promise.all([
		supabase.from('exercises').select('id, title').in('id', exerciseIds),
		supabase
			.from('exercise_completions')
			.select('exercise_id, completed_at, last_viewed_at')
			.eq('student_id', userId)
			.in('exercise_id', exerciseIds),
		fetchClassNames(supabase, referencedClassIds)
	]);
	logError('exercise.exercises', exercisesRes.error);
	logError('exercise.completions', completionsRes.error);

	const exerciseById = new Map(
		((exercisesRes.data ?? []) as Pick<ExerciseRow, 'id' | 'title'>[]).map((row) => [row.id, row])
	);
	const completionByExercise = new Map(
		(
			(completionsRes.data ?? []) as Pick<
				ExerciseCompletionRow,
				'exercise_id' | 'completed_at' | 'last_viewed_at'
			>[]
		).map((row) => [row.exercise_id, row])
	);

	return assignments.map<WorkItem>((assignment) => {
		const exercise = exerciseById.get(assignment.exercise_id);
		const completion = completionByExercise.get(assignment.exercise_id);
		const doneAt = completion?.completed_at ?? null;
		return {
			source: 'exercise' satisfies WorkSource,
			itemId: assignment.exercise_id,
			assignmentId: assignment.id,
			title: exercise?.title ?? '',
			classId: assignment.class_id,
			className: assignment.class_id ? (classNames.get(assignment.class_id) ?? null) : null,
			dueAt: assignment.optional_deadline,
			status: doneAt ? 'done' : 'todo',
			viewed: completion?.last_viewed_at != null,
			doneAt,
			href: `/dashboard/student/exercises/${assignment.exercise_id}`,
			assignedAt: assignment.assigned_at
		};
	});
}

// ============================================================================
// WORKSHEETS
// ============================================================================

type WorksheetAssignmentRow = Tables<'worksheet_assignments'>;

/**
 * Worksheets are view-only by design (migration `20251212125938_simplify_worksheet_assignments.sql`
 * dropped `submitted_at`, `accessed_at` and `due_at`). No submission, no
 * self-declared completion: each worksheet surfaces as `todo` with `closes_at`
 * as its deadline, and stays in the inbox until the class deadline passes or
 * the teacher revokes the assignment.
 */
async function fetchWorksheetItems(
	supabase: TypedSupabaseClient,
	userId: string,
	classIds: string[]
): Promise<WorkItem[]> {
	const nowIso = new Date().toISOString();
	const availabilityClause = `available_from.is.null,available_from.lte.${nowIso}`;

	const classAssignmentsRes =
		classIds.length > 0
			? await supabase
					.from('worksheet_assignments')
					.select('*')
					.eq('status', 'active')
					.or(availabilityClause)
					.in('class_id', classIds)
			: { data: [] as WorksheetAssignmentRow[], error: null };

	const { data: directLinkRaw, error: directLinkErr } = await supabase
		.from('worksheet_assignment_students')
		.select('assignment_id')
		.eq('student_id', userId);
	logError('worksheet.directLinks', directLinkErr);

	const directAssignmentIds = (directLinkRaw ?? []).map((row) => row.assignment_id);

	const directAssignmentsRes =
		directAssignmentIds.length > 0
			? await supabase
					.from('worksheet_assignments')
					.select('*')
					.eq('status', 'active')
					.or(availabilityClause)
					.in('id', directAssignmentIds)
			: { data: [] as WorksheetAssignmentRow[], error: null };

	logError('worksheet.classAssignments', classAssignmentsRes.error);
	logError('worksheet.directAssignments', directAssignmentsRes.error);

	const classAssignments = classAssignmentsRes.data ?? [];
	const directAssignments = directAssignmentsRes.data ?? [];

	const assignments: WorksheetAssignmentRow[] = [...classAssignments, ...directAssignments];
	if (assignments.length === 0) return [];

	const worksheetIds = Array.from(new Set(assignments.map((a) => a.worksheet_id)));
	const referencedClassIds = Array.from(
		new Set(assignments.map((a) => a.class_id).filter((id): id is string => id !== null))
	);

	const [worksheetsRes, classNames] = await Promise.all([
		supabase.from('worksheets').select('id, title').in('id', worksheetIds),
		fetchClassNames(supabase, referencedClassIds)
	]);
	logError('worksheet.worksheets', worksheetsRes.error);

	const worksheetById = new Map((worksheetsRes.data ?? []).map((row) => [row.id, row]));

	return assignments.map<WorkItem>((assignment) => {
		const worksheet = worksheetById.get(assignment.worksheet_id);
		return {
			source: 'worksheet' satisfies WorkSource,
			itemId: assignment.worksheet_id,
			assignmentId: assignment.id,
			title: assignment.title ?? worksheet?.title ?? '',
			classId: assignment.class_id,
			className: assignment.class_id ? (classNames.get(assignment.class_id) ?? null) : null,
			dueAt: assignment.closes_at,
			status: 'todo',
			viewed: false,
			doneAt: null,
			href: `/dashboard/student/worksheets/${assignment.id}`,
			assignedAt: assignment.assigned_at
		};
	});
}

// ============================================================================
// PYTHON EXERCISES
// ============================================================================

type PythonAssignmentRow = Tables<'python_exercise_assignments'>;

/**
 * Note (A3): `python_exercise_assignments` has no `is_active` column or
 * equivalent soft-delete. A teacher revokes by deleting the row. So no
 * status filter is applied here, and that's the canonical behaviour for
 * the python system today. If a soft-delete is ever added, mirror the
 * exercise fetcher's `.eq('is_active', true)`.
 */
async function fetchPythonItems(
	supabase: TypedSupabaseClient,
	userId: string,
	classIds: string[]
): Promise<WorkItem[]> {
	let query = supabase.from('python_exercise_assignments').select('*');
	if (classIds.length > 0) {
		query = query.or(`student_id.eq.${userId},class_id.in.(${classIds.join(',')})`);
	} else {
		query = query.eq('student_id', userId);
	}

	const { data: assignmentsRaw, error: assignmentsErr } = await query;
	logError('python.assignments', assignmentsErr);
	const assignments = (assignmentsRaw ?? []) as PythonAssignmentRow[];
	if (assignments.length === 0) return [];

	const exerciseIds = Array.from(new Set(assignments.map((a) => a.exercise_id)));
	const referencedClassIds = Array.from(
		new Set(assignments.map((a) => a.class_id).filter((id): id is string => id !== null))
	);

	const [exercisesRes, submissionsRes, classNames] = await Promise.all([
		supabase.from('python_exercises').select('id, title').in('id', exerciseIds),
		supabase
			.from('python_exercise_submissions')
			.select('exercise_id, created_at')
			.eq('student_id', userId)
			.in('exercise_id', exerciseIds),
		fetchClassNames(supabase, referencedClassIds)
	]);
	logError('python.exercises', exercisesRes.error);
	logError('python.submissions', submissionsRes.error);

	const exerciseById = new Map(
		((exercisesRes.data ?? []) as Pick<Tables<'python_exercises'>, 'id' | 'title'>[]).map((row) => [
			row.id,
			row
		])
	);
	const latestSubmissionByExercise = new Map<string, string>();
	for (const row of submissionsRes.data ?? []) {
		const current = latestSubmissionByExercise.get(row.exercise_id);
		if (!current || row.created_at > current) {
			latestSubmissionByExercise.set(row.exercise_id, row.created_at);
		}
	}

	return assignments.map<WorkItem>((assignment) => {
		const exercise = exerciseById.get(assignment.exercise_id);
		const doneAt = latestSubmissionByExercise.get(assignment.exercise_id) ?? null;
		return {
			source: 'python' satisfies WorkSource,
			itemId: assignment.exercise_id,
			assignmentId: assignment.id,
			title: exercise?.title ?? '',
			classId: assignment.class_id,
			className: assignment.class_id ? (classNames.get(assignment.class_id) ?? null) : null,
			dueAt: assignment.due_date,
			status: doneAt ? 'done' : 'todo',
			viewed: false,
			doneAt,
			href: `/python-exercises/${assignment.exercise_id}`,
			assignedAt: assignment.created_at
		};
	});
}
