/**
 * Student Work Inbox — Unit Tests
 * ================================
 *
 * Tests cover the aggregation across the four assignment systems, the
 * dedup precedence (direct over class), the "done" derivation rules, and the
 * bucketing/archival rules from the spec (sections A/S/T/E).
 *
 * Mocks Supabase per-table: each `.from(tableName)` returns its own queued
 * chain. This keeps the parallel `Promise.all` fan-out in
 * `getStudentWorkInbox` reproducible regardless of resolution order.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { getStudentWorkInbox } from './student-inbox';

// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================

interface QueuedResult {
	data: unknown;
	error: null;
}

/**
 * One chainable per `.from(table)` call. All chain methods return `this`;
 * the chain itself is thenable so it resolves when awaited at the end of a
 * query (e.g. `await supabase.from(t).select().eq(...).in(...)`).
 *
 * Pre-queue the result by calling `enqueue` on the table's chain factory.
 */
function makeTableChain(queue: QueuedResult[]) {
	const chain: Record<string, unknown> = {};
	const passthrough = [
		'select',
		'insert',
		'update',
		'delete',
		'eq',
		'neq',
		'in',
		'not',
		'or',
		'order',
		'limit',
		'range'
	];
	for (const m of passthrough) {
		chain[m] = vi.fn(() => chain);
	}
	chain.single = vi.fn(() => Promise.resolve(queue.shift() ?? { data: null, error: null }));
	chain.maybeSingle = vi.fn(() => Promise.resolve(queue.shift() ?? { data: null, error: null }));
	chain.then = (
		resolve: (value: QueuedResult) => unknown,
		reject?: (reason: unknown) => unknown
	) => {
		const result = queue.shift() ?? { data: null, error: null };
		try {
			return Promise.resolve(resolve(result));
		} catch (err) {
			return reject ? Promise.resolve(reject(err)) : Promise.reject(err);
		}
	};
	return chain;
}

interface MockSupabase {
	client: SupabaseClient<Database>;
	enqueue(table: string, data: unknown): void;
	calls(table: string): number;
}

function createMockSupabase(): MockSupabase {
	const queues = new Map<string, QueuedResult[]>();
	const callCounts = new Map<string, number>();

	const from = vi.fn((table: string) => {
		callCounts.set(table, (callCounts.get(table) ?? 0) + 1);
		const queue = queues.get(table) ?? [];
		queues.set(table, queue);
		return makeTableChain(queue);
	});

	return {
		client: { from } as unknown as SupabaseClient<Database>,
		enqueue(table, data) {
			const queue = queues.get(table) ?? [];
			queue.push({ data, error: null });
			queues.set(table, queue);
		},
		calls(table) {
			return callCounts.get(table) ?? 0;
		}
	};
}

// ============================================================================
// FIXTURES
// ============================================================================

const STUDENT = 'student-1';
const CLASS_A = 'class-a';

const FIXED_NOW = new Date('2026-05-11T12:00:00Z');
const ISO = {
	now: FIXED_NOW.toISOString(),
	yesterday: new Date(FIXED_NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
	twoDaysAgo: new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
	threeDaysFromNow: new Date(FIXED_NOW.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
	twoWeeksFromNow: new Date(FIXED_NOW.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
	tenDaysAgo: new Date(FIXED_NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
	fortyDaysAgo: new Date(FIXED_NOW.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
	twoMonthsAgo: new Date(FIXED_NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
	vi.useRealTimers();
});

// ============================================================================
// EMPTY-INBOX BASELINE PRESET
// ============================================================================

/**
 * Queue empty responses for every table read by the aggregator's happy path.
 * Use this as the baseline, then override per-test by enqueueing different
 * data on specific tables.
 *
 * The aggregator calls these tables in this order on every run:
 *   - class_members (1x: active classes)
 *   - assessment_assignments (1x)
 *   - test_sessions (1x, only when assessment rows exist)
 *   - exercise_assignments (1x)
 *   - exercises (1x, only when exercise rows exist)
 *   - exercise_completions (1x, only when exercise rows exist)
 *   - worksheet_assignments (up to 2x: class + direct)
 *   - worksheet_assignment_students (1x)
 *   - worksheets (1x, only when worksheet rows exist)
 *   - python_exercise_assignments (1x)
 *   - python_exercises (1x, only when python rows exist)
 *   - python_exercise_submissions (1x, only when python rows exist)
 *   - classes (variable, only when class_ids referenced)
 */
function queueEmptyBaseline(mock: MockSupabase, classIds: string[] = []) {
	mock.enqueue(
		'class_members',
		classIds.map((id) => ({ class_id: id }))
	);
	mock.enqueue('assessment_assignments', []);
	mock.enqueue('exercise_assignments', []);
	mock.enqueue('worksheet_assignments', []); // class-scoped
	mock.enqueue('worksheet_assignment_students', []);
	mock.enqueue('python_exercise_assignments', []);
}

// ============================================================================
// TESTS
// ============================================================================

describe('getStudentWorkInbox — E1 (empty)', () => {
	it('returns empty inbox when no assignments at all', async () => {
		const mock = createMockSupabase();
		queueEmptyBaseline(mock);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);

		expect(inbox.late).toEqual([]);
		expect(inbox.thisWeek).toEqual([]);
		expect(inbox.later).toEqual([]);
		expect(inbox.noDeadline).toEqual([]);
		expect(inbox.doneRecently).toEqual([]);
	});
});

describe('getStudentWorkInbox — A1 (direct + class fan-out)', () => {
	it('fetches both direct and class assignments per source', async () => {
		const mock = createMockSupabase();
		// Student is in CLASS_A
		mock.enqueue('class_members', [{ class_id: CLASS_A }]);

		// Assessment via class (1 item)
		mock.enqueue('assessment_assignments', [
			{
				id: 'aa-1',
				assessment_id: 'a-1',
				class_id: CLASS_A,
				student_id: null,
				assigned_at: ISO.twoDaysAgo,
				assigned_by: 'teacher-1',
				assessment: {
					id: 'a-1',
					title: 'Eval Algebre',
					status: 'published',
					settings: { deadline: ISO.threeDaysFromNow }
				}
			}
		]);
		mock.enqueue('test_sessions', []);
		mock.enqueue('classes', [{ id: CLASS_A, name: '3eme A' }]);

		// Exercise direct (1 item)
		mock.enqueue('exercise_assignments', [
			{
				id: 'ea-1',
				exercise_id: 'ex-1',
				student_id: STUDENT,
				class_id: null,
				is_active: true,
				assigned_to_type: 'student',
				assigned_by: 'teacher-1',
				assigned_at: ISO.twoDaysAgo,
				optional_deadline: ISO.threeDaysFromNow,
				notes: null
			}
		]);
		mock.enqueue('exercises', [{ id: 'ex-1', title: 'Exo direct' }]);
		mock.enqueue('exercise_completions', []);

		// Worksheet via class + direct (one of each, different ids)
		mock.enqueue('worksheet_assignments', [
			{
				id: 'wa-class',
				worksheet_id: 'w-1',
				class_id: CLASS_A,
				assigned_at: ISO.twoDaysAgo,
				closes_at: null,
				status: 'active',
				title: null,
				created_by: 'teacher-1',
				created_at: ISO.twoDaysAgo
			}
		]);
		mock.enqueue('worksheet_assignment_students', [{ assignment_id: 'wa-direct' }]);
		mock.enqueue('worksheet_assignments', [
			{
				id: 'wa-direct',
				worksheet_id: 'w-2',
				class_id: null,
				assigned_at: ISO.twoDaysAgo,
				closes_at: null,
				status: 'active',
				title: 'Fiche directe',
				created_by: 'teacher-1',
				created_at: ISO.twoDaysAgo
			}
		]);
		mock.enqueue('worksheets', [
			{ id: 'w-1', title: 'Fiche classe' },
			{ id: 'w-2', title: 'Fiche directe' }
		]);

		// Python direct (1 item)
		mock.enqueue('python_exercise_assignments', [
			{
				id: 'pa-1',
				exercise_id: 'py-1',
				student_id: STUDENT,
				class_id: null,
				due_date: ISO.threeDaysFromNow,
				assigned_by: 'teacher-1',
				created_at: ISO.twoDaysAgo,
				max_attempts: null
			}
		]);
		mock.enqueue('python_exercises', [{ id: 'py-1', title: 'Hello world' }]);
		mock.enqueue('python_exercise_submissions', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);

		const allItems = [
			...inbox.late,
			...inbox.thisWeek,
			...inbox.later,
			...inbox.noDeadline,
			...inbox.doneRecently
		];
		const ids = allItems.map((i) => `${i.source}:${i.itemId}`).sort();
		expect(ids).toEqual([
			'assessment:a-1',
			'exercise:ex-1',
			'python:py-1',
			'worksheet:w-1',
			'worksheet:w-2'
		]);

		// Each source was queried
		expect(mock.calls('assessment_assignments')).toBe(1);
		expect(mock.calls('exercise_assignments')).toBe(1);
		// Worksheet path always queries class-scoped + direct-by-id (when student has direct links)
		expect(mock.calls('worksheet_assignments')).toBe(2);
		expect(mock.calls('python_exercise_assignments')).toBe(1);
	});
});

describe('getStudentWorkInbox — A2 (dedup precedence)', () => {
	it('dedups item assigned both directly and via class, preferring the direct one', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', [{ class_id: CLASS_A }]);
		mock.enqueue('assessment_assignments', []);

		// Same exercise assigned via class AND directly to the student.
		mock.enqueue('exercise_assignments', [
			{
				id: 'class-link',
				exercise_id: 'ex-shared',
				student_id: null,
				class_id: CLASS_A,
				is_active: true,
				assigned_to_type: 'class',
				assigned_by: 'teacher-1',
				assigned_at: ISO.twoDaysAgo,
				optional_deadline: ISO.threeDaysFromNow,
				notes: null
			},
			{
				id: 'direct-link',
				exercise_id: 'ex-shared',
				student_id: STUDENT,
				class_id: null,
				is_active: true,
				assigned_to_type: 'student',
				assigned_by: 'teacher-1',
				assigned_at: ISO.tenDaysAgo,
				optional_deadline: ISO.threeDaysFromNow,
				notes: null
			}
		]);
		mock.enqueue('exercises', [{ id: 'ex-shared', title: 'Exo partage' }]);
		mock.enqueue('exercise_completions', []);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);
		mock.enqueue('classes', [{ id: CLASS_A, name: '3eme A' }]);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		const items = [...inbox.thisWeek];
		expect(items).toHaveLength(1);
		expect(items[0].assignmentId).toBe('direct-link');
		expect(items[0].classId).toBeNull();
	});
});

describe('getStudentWorkInbox — A3 (exclude inactive)', () => {
	it('excludes assessments whose embedded status is not published', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		// The DB-side filter `.eq('assessment.status', 'published')` is what RLS+filter does;
		// the aggregator's downstream filter still rejects rows whose joined assessment is null,
		// which is what an unmatched join produces.
		mock.enqueue('assessment_assignments', [
			{
				id: 'aa-1',
				assessment_id: 'a-1',
				class_id: null,
				student_id: STUDENT,
				assigned_at: ISO.twoDaysAgo,
				assigned_by: 'teacher-1',
				assessment: null
			}
		]);
		mock.enqueue('exercise_assignments', []);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		const total =
			inbox.late.length +
			inbox.thisWeek.length +
			inbox.later.length +
			inbox.noDeadline.length +
			inbox.doneRecently.length;
		expect(total).toBe(0);
	});
});

describe('getStudentWorkInbox — S1 (assessment done)', () => {
	it('marks assessment as done when at least one test_sessions row has completed_at', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		mock.enqueue('assessment_assignments', [
			{
				id: 'aa-1',
				assessment_id: 'a-1',
				class_id: null,
				student_id: STUDENT,
				assigned_at: ISO.twoDaysAgo,
				assigned_by: 'teacher-1',
				assessment: {
					id: 'a-1',
					title: 'Eval',
					status: 'published',
					settings: { deadline: null }
				}
			}
		]);
		mock.enqueue('test_sessions', [{ assignment_id: 'aa-1', completed_at: ISO.yesterday }]);
		mock.enqueue('exercise_assignments', []);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.doneRecently).toHaveLength(1);
		expect(inbox.doneRecently[0].status).toBe('done');
		expect(inbox.doneRecently[0].doneAt).toBe(ISO.yesterday);
	});
});

describe('getStudentWorkInbox — S2 (python done)', () => {
	it('marks python as done when at least one submission exists, regardless of is_correct', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		mock.enqueue('assessment_assignments', []);
		mock.enqueue('exercise_assignments', []);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', [
			{
				id: 'pa-1',
				exercise_id: 'py-1',
				student_id: STUDENT,
				class_id: null,
				due_date: null,
				assigned_by: 'teacher-1',
				created_at: ISO.twoDaysAgo,
				max_attempts: null
			}
		]);
		mock.enqueue('python_exercises', [{ id: 'py-1', title: 'Exo Python' }]);
		mock.enqueue('python_exercise_submissions', [
			{ exercise_id: 'py-1', created_at: ISO.yesterday }
		]);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.doneRecently).toHaveLength(1);
		expect(inbox.doneRecently[0].status).toBe('done');
		expect(inbox.doneRecently[0].source).toBe('python');
	});
});

describe('getStudentWorkInbox — S3 (exercise done)', () => {
	it('marks exercise as done when completed_at is non null', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		mock.enqueue('assessment_assignments', []);
		mock.enqueue('exercise_assignments', [
			{
				id: 'ea-1',
				exercise_id: 'ex-1',
				student_id: STUDENT,
				class_id: null,
				is_active: true,
				assigned_to_type: 'student',
				assigned_by: 'teacher-1',
				assigned_at: ISO.twoDaysAgo,
				optional_deadline: null,
				notes: null
			}
		]);
		mock.enqueue('exercises', [{ id: 'ex-1', title: 'Exo' }]);
		mock.enqueue('exercise_completions', [
			{
				exercise_id: 'ex-1',
				completed_at: ISO.yesterday,
				last_viewed_at: ISO.yesterday
			}
		]);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.doneRecently).toHaveLength(1);
		expect(inbox.doneRecently[0].status).toBe('done');
		expect(inbox.doneRecently[0].viewed).toBe(true);
	});
});

// S4 removed: worksheets are view-only by project design (migration
// `20251212125938_simplify_worksheet_assignments.sql`). They never reach
// `status: 'done'` — they stay as `todo` until the class deadline passes
// or the teacher revokes the assignment. The aggregator returns the same
// shape regardless of student activity on the worksheet.

describe('getStudentWorkInbox — T1 (5-bucket bucketing)', () => {
	it('places one item in each of the 5 sections given the right inputs', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		mock.enqueue('assessment_assignments', []);
		// Build 5 exercises, one per section, all direct.
		mock.enqueue('exercise_assignments', [
			row('ex-late', ISO.twoDaysAgo, ISO.yesterday),
			row('ex-week', ISO.twoDaysAgo, ISO.threeDaysFromNow),
			row('ex-later', ISO.twoDaysAgo, ISO.twoWeeksFromNow),
			row('ex-noddl', ISO.twoDaysAgo, null),
			row('ex-done', ISO.twoDaysAgo, ISO.yesterday)
		]);
		mock.enqueue('exercises', [
			{ id: 'ex-late', title: 'Late' },
			{ id: 'ex-week', title: 'Week' },
			{ id: 'ex-later', title: 'Later' },
			{ id: 'ex-noddl', title: 'No deadline' },
			{ id: 'ex-done', title: 'Done' }
		]);
		mock.enqueue('exercise_completions', [
			{ exercise_id: 'ex-done', completed_at: ISO.yesterday, last_viewed_at: ISO.yesterday }
		]);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.late.map((i) => i.itemId)).toEqual(['ex-late']);
		expect(inbox.thisWeek.map((i) => i.itemId)).toEqual(['ex-week']);
		expect(inbox.later.map((i) => i.itemId)).toEqual(['ex-later']);
		expect(inbox.noDeadline.map((i) => i.itemId)).toEqual(['ex-noddl']);
		expect(inbox.doneRecently.map((i) => i.itemId)).toEqual(['ex-done']);
	});

	function row(exerciseId: string, assignedAt: string, deadline: string | null) {
		return {
			id: `ea-${exerciseId}`,
			exercise_id: exerciseId,
			student_id: STUDENT,
			class_id: null,
			is_active: true,
			assigned_to_type: 'student',
			assigned_by: 'teacher-1',
			assigned_at: assignedAt,
			optional_deadline: deadline,
			notes: null
		};
	}
});

describe('getStudentWorkInbox — T2 (done archived after 7 days)', () => {
	it('drops a "done" item whose doneAt is older than 7 days', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		mock.enqueue('assessment_assignments', []);
		mock.enqueue('exercise_assignments', [
			{
				id: 'ea-old',
				exercise_id: 'ex-old',
				student_id: STUDENT,
				class_id: null,
				is_active: true,
				assigned_to_type: 'student',
				assigned_by: 'teacher-1',
				assigned_at: ISO.tenDaysAgo,
				optional_deadline: null,
				notes: null
			}
		]);
		mock.enqueue('exercises', [{ id: 'ex-old', title: 'Old done' }]);
		mock.enqueue('exercise_completions', [
			{
				exercise_id: 'ex-old',
				completed_at: ISO.tenDaysAgo,
				last_viewed_at: ISO.tenDaysAgo
			}
		]);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.doneRecently).toHaveLength(0);
		expect(inbox.late).toHaveLength(0);
		expect(inbox.thisWeek).toHaveLength(0);
		expect(inbox.later).toHaveLength(0);
		expect(inbox.noDeadline).toHaveLength(0);
	});
});

describe('getStudentWorkInbox — T3 (late archived after 30 days)', () => {
	it('drops a "todo" item whose deadline passed more than 30 days ago', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		mock.enqueue('assessment_assignments', []);
		mock.enqueue('exercise_assignments', [
			{
				id: 'ea-ancient',
				exercise_id: 'ex-ancient',
				student_id: STUDENT,
				class_id: null,
				is_active: true,
				assigned_to_type: 'student',
				assigned_by: 'teacher-1',
				assigned_at: ISO.twoMonthsAgo,
				optional_deadline: ISO.fortyDaysAgo,
				notes: null
			}
		]);
		mock.enqueue('exercises', [{ id: 'ex-ancient', title: 'Ancient' }]);
		mock.enqueue('exercise_completions', []);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.late).toHaveLength(0);
		expect(inbox.thisWeek).toHaveLength(0);
		expect(inbox.later).toHaveLength(0);
		expect(inbox.noDeadline).toHaveLength(0);
		expect(inbox.doneRecently).toHaveLength(0);
	});
});

describe('getStudentWorkInbox — T4 (assessment closes_at)', () => {
	it.skip('keeps a closed assessment visible with a "closed" flag (deferred — closes_at not modeled in WorkItem v1)', () => {
		// `closes_at` lives in `assessment_assignments` settings (or a future column).
		// The v1 WorkItem shape does not expose a "closed" flag — deferred per the spec
		// until UI surfaces require it. See progress doc.
	});
});

describe('getStudentWorkInbox — E3 (done yesterday, originally late)', () => {
	it('moves a recently-done item out of late and into doneRecently', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', []);
		mock.enqueue('assessment_assignments', []);
		mock.enqueue('exercise_assignments', [
			{
				id: 'ea-1',
				exercise_id: 'ex-1',
				student_id: STUDENT,
				class_id: null,
				is_active: true,
				assigned_to_type: 'student',
				assigned_by: 'teacher-1',
				assigned_at: ISO.tenDaysAgo,
				// Deadline passed (2 days ago) — would have been "late" if not done.
				optional_deadline: ISO.twoDaysAgo,
				notes: null
			}
		]);
		mock.enqueue('exercises', [{ id: 'ex-1', title: 'Was late, now done' }]);
		mock.enqueue('exercise_completions', [
			{ exercise_id: 'ex-1', completed_at: ISO.yesterday, last_viewed_at: ISO.yesterday }
		]);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.late).toHaveLength(0);
		expect(inbox.doneRecently).toHaveLength(1);
		expect(inbox.doneRecently[0].itemId).toBe('ex-1');
	});
});

describe('getStudentWorkInbox — dedup precedence (direct over class)', () => {
	it('keeps the direct assignment when the same python exercise is also reachable via class', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', [{ class_id: CLASS_A }]);
		mock.enqueue('assessment_assignments', []);
		mock.enqueue('exercise_assignments', []);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', [
			{
				id: 'pa-class',
				exercise_id: 'py-shared',
				student_id: null,
				class_id: CLASS_A,
				due_date: ISO.threeDaysFromNow,
				assigned_by: 'teacher-1',
				created_at: ISO.twoDaysAgo,
				max_attempts: null
			},
			{
				id: 'pa-direct',
				exercise_id: 'py-shared',
				student_id: STUDENT,
				class_id: null,
				due_date: ISO.threeDaysFromNow,
				assigned_by: 'teacher-1',
				created_at: ISO.tenDaysAgo,
				max_attempts: null
			}
		]);
		mock.enqueue('python_exercises', [{ id: 'py-shared', title: 'Partage' }]);
		mock.enqueue('python_exercise_submissions', []);
		mock.enqueue('classes', [{ id: CLASS_A, name: '3eme A' }]);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.thisWeek).toHaveLength(1);
		expect(inbox.thisWeek[0].assignmentId).toBe('pa-direct');
		expect(inbox.thisWeek[0].classId).toBeNull();
	});

	it('keeps the direct assignment when the same assessment is also reachable via class', async () => {
		const mock = createMockSupabase();
		mock.enqueue('class_members', [{ class_id: CLASS_A }]);
		mock.enqueue('assessment_assignments', [
			{
				id: 'aa-class',
				assessment_id: 'a-shared',
				class_id: CLASS_A,
				student_id: null,
				assigned_at: ISO.twoDaysAgo,
				assigned_by: 'teacher-1',
				assessment: {
					id: 'a-shared',
					title: 'Eval partagee',
					status: 'published',
					settings: { deadline: ISO.threeDaysFromNow }
				}
			},
			{
				id: 'aa-direct',
				assessment_id: 'a-shared',
				class_id: null,
				student_id: STUDENT,
				assigned_at: ISO.tenDaysAgo,
				assigned_by: 'teacher-1',
				assessment: {
					id: 'a-shared',
					title: 'Eval partagee',
					status: 'published',
					settings: { deadline: ISO.threeDaysFromNow }
				}
			}
		]);
		mock.enqueue('test_sessions', []);
		mock.enqueue('classes', [{ id: CLASS_A, name: '3eme A' }]);
		mock.enqueue('exercise_assignments', []);
		mock.enqueue('worksheet_assignments', []);
		mock.enqueue('worksheet_assignment_students', []);
		mock.enqueue('python_exercise_assignments', []);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.thisWeek).toHaveLength(1);
		expect(inbox.thisWeek[0].source).toBe('assessment');
		expect(inbox.thisWeek[0].assignmentId).toBe('aa-direct');
		expect(inbox.thisWeek[0].classId).toBeNull();
	});

	it('keeps the direct assignment when the same worksheet is reachable via class AND a direct link', async () => {
		// Two distinct worksheet_assignments rows for the same worksheet:
		// one class-scoped (matched by class membership), one direct (matched by
		// worksheet_assignment_students). Dedup keys on (source, worksheet_id),
		// the direct one (classId === null) must win.
		const mock = createMockSupabase();
		mock.enqueue('class_members', [{ class_id: CLASS_A }]);
		mock.enqueue('assessment_assignments', []);
		mock.enqueue('exercise_assignments', []);
		mock.enqueue('worksheet_assignments', [
			{
				id: 'wa-class',
				worksheet_id: 'w-shared',
				class_id: CLASS_A,
				assigned_at: ISO.tenDaysAgo,
				closes_at: ISO.threeDaysFromNow,
				available_from: null,
				status: 'active',
				title: null,
				created_by: 'teacher-1',
				created_at: ISO.tenDaysAgo
			}
		]);
		mock.enqueue('worksheet_assignment_students', [{ assignment_id: 'wa-direct' }]);
		mock.enqueue('worksheet_assignments', [
			{
				id: 'wa-direct',
				worksheet_id: 'w-shared',
				class_id: null,
				assigned_at: ISO.twoDaysAgo,
				closes_at: ISO.threeDaysFromNow,
				available_from: null,
				status: 'active',
				title: 'Fiche directe',
				created_by: 'teacher-1',
				created_at: ISO.twoDaysAgo
			}
		]);
		mock.enqueue('worksheets', [{ id: 'w-shared', title: 'Fiche partagee' }]);
		mock.enqueue('python_exercise_assignments', []);
		mock.enqueue('classes', [{ id: CLASS_A, name: '3eme A' }]);

		const inbox = await getStudentWorkInbox(mock.client, STUDENT);
		expect(inbox.thisWeek).toHaveLength(1);
		expect(inbox.thisWeek[0].source).toBe('worksheet');
		expect(inbox.thisWeek[0].itemId).toBe('w-shared');
		expect(inbox.thisWeek[0].assignmentId).toBe('wa-direct');
		expect(inbox.thisWeek[0].classId).toBeNull();
	});
});
