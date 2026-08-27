/**
 * Integration Tests: Python submission server-side verification (Phase 1b)
 * ========================================================================
 *
 * Validates migration 20260827120000_python_submission_server_verification.sql,
 * which stores the trusted-server re-check verdict in a DEDICATED SIDE TABLE
 * (public.python_submission_server_verdicts), leaving python_exercise_submissions
 * completely untouched. This replaces an earlier column-REVOKE masking that broke
 * PostgREST (`select('*')` by a role without table SELECT → 42501 permission
 * denied for table), which the submit endpoint triggers on EVERY submission.
 *
 *   (regression) A student can STILL `select('*')` on python_exercise_submissions
 *       (must never 42501 again).
 *   (a) A student cannot read python_submission_server_verdicts (RLS → 0 rows, no
 *       error that leaks existence); a teacher/admin CAN read it directly (RLS).
 *   (b) A student cannot INSERT/UPDATE/DELETE the verdict table (no write policy).
 *   (c) service_role can INSERT (pending) and UPDATE (terminal verdict).
 *   (d) The status CHECK rejects an out-of-enum value.
 *   (e) run_flag_stale_python_rechecks() logs a job run whose metadata carries the
 *       correct count of stale 'pending' verdicts.
 *
 * Project rule: NEVER validate a policy/guard with an auth.uid()-NULL smoke test
 * (the guard returns early → false positive). Every teacher/admin/student path
 * here uses a REAL authenticated client (createAuthenticatedClient).
 *
 * Requires local Supabase (`pnpm db:start` + `pnpm db:reset`) then
 * `pnpm test:integration`. The PARENT runs the suite — do not run here.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import { createServiceRoleClient, generateTestId } from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { deleteTestAuthUsers, closePostgresClient } from '../helpers/database/postgres-client';

// New table is not yet in the generated Database types (database.ts is not
// touched here). Access it through an untyped alias to keep the suite `any`-free.
const VERDICTS = 'python_submission_server_verdicts' as never;
const SUBMISSIONS = 'python_exercise_submissions' as never;

// ---------------------------------------------------------------------------
// Shared service client + fixtures
// ---------------------------------------------------------------------------

let service: SupabaseClient<Database>;

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanup();
	await closePostgresClient();
});

beforeEach(async () => {
	await cleanup();
});

/**
 * Purge everything this suite creates. Verdicts + submissions + mastery FIRST
 * (FK children), then exercises, then auth users via deleteTestAuthUsers()
 * (which deletes with cascades OFF and so does NOT clean the python rows itself).
 * Teachers MUST be removed between tests: the enforce_single_teacher trigger
 * allows only one teacher account.
 */
async function cleanup() {
	await service.from(VERDICTS).delete().not('submission_id', 'is', null);
	await service.from(SUBMISSIONS).delete().not('id', 'is', null);
	await service.from('python_exercise_mastery').delete().not('id', 'is', null);
	await service.from('python_exercises').delete().not('id', 'is', null);

	// Background job runs from the sweep test.
	await service.from('background_job_runs').delete().eq('job_name', 'flag_stale_python_rechecks');

	// Auth users + profiles (@test.com). Resets the single-teacher invariant.
	await deleteTestAuthUsers();
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

interface SeededExercise {
	id: string;
}

/** Minimal valid python_exercises row (service role, bypasses RLS). */
async function createPythonExercise(authorId: string): Promise<SeededExercise> {
	const { data, error } = await service
		.from('python_exercises')
		.insert({
			id: generateTestId('pyex'),
			title: `Exo ${crypto.randomUUID().slice(0, 8)}`,
			solution_code: 'print(42)',
			validation_config: { type: 'output', expected_output: '42' },
			author_id: authorId,
			is_public: false,
			level: 'college'
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(`createPythonExercise failed: ${error.message}`);
	return data as SeededExercise;
}

interface SeededSubmission {
	id: string;
}

/**
 * Seed a practice submission (assignment_id NULL → no max-attempts gate).
 * attempt_number is overwritten by set_submission_attempt_number trigger; we
 * pass 1 to satisfy the NOT NULL/CHECK before the trigger runs. NOTE: the submit
 * endpoint no longer writes any verification_* onto this row — the verdict lives
 * in the side table only.
 */
async function createSubmission(params: {
	exerciseId: string;
	studentId: string;
	isCorrect: boolean;
}): Promise<SeededSubmission> {
	const { data, error } = await service
		.from(SUBMISSIONS)
		.insert({
			id: generateTestId('pysub'),
			exercise_id: params.exerciseId,
			assignment_id: null,
			student_id: params.studentId,
			code: 'print(42)',
			validation_result: { valid: params.isCorrect },
			is_correct: params.isCorrect,
			attempt_number: 1
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(`createSubmission failed: ${error.message}`);
	return data as SeededSubmission;
}

/** Seed a verdict row (service role). Mirrors the recheck.ts upsert. */
async function createVerdict(params: {
	submissionId: string;
	status?: string;
	serverIsCorrect?: boolean | null;
	serverValidationResult?: unknown;
	verifiedAt?: string | null;
	createdAt?: string;
}): Promise<void> {
	const row: Record<string, unknown> = {
		submission_id: params.submissionId,
		verification_status: params.status ?? 'pending'
	};
	if (params.serverIsCorrect !== undefined) row.server_is_correct = params.serverIsCorrect;
	if (params.serverValidationResult !== undefined)
		row.server_validation_result = params.serverValidationResult;
	if (params.verifiedAt !== undefined) row.verified_at = params.verifiedAt;
	if (params.createdAt) row.created_at = params.createdAt;

	const { error } = await service.from(VERDICTS).insert(row as never);
	if (error) throw new Error(`createVerdict failed: ${error.message}`);
}

// ============================================================================
// Regression — the submissions table is untouched (no more 42501)
// ============================================================================

describe('python_exercise_submissions is untouched', () => {
	it('lets a student `select(*)` their own submission WITHOUT 42501', async () => {
		expect.assertions(3);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		await createSubmission({ exerciseId: exercise.id, studentId: student.id, isCorrect: true });

		const studentClient = await createAuthenticatedClient(student.email!);
		// This is what the submit endpoint does on EVERY submission.
		const { data, error } = await studentClient
			.from(SUBMISSIONS)
			.select('*')
			.eq('student_id', student.id);

		expect(error).toBeNull();
		expect((data as unknown[]) ?? []).toHaveLength(1);
		expect((data as Array<Record<string, unknown>>)[0].is_correct).toBe(true);
	});

	it('lets a student run the exact count query from the submit endpoint (head+count)', async () => {
		expect.assertions(2);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		await createSubmission({ exerciseId: exercise.id, studentId: student.id, isCorrect: false });

		const studentClient = await createAuthenticatedClient(student.email!);
		const { count, error } = await studentClient
			.from(SUBMISSIONS)
			.select('*', { count: 'exact', head: true })
			.eq('exercise_id', exercise.id)
			.eq('student_id', student.id);

		expect(error).toBeNull();
		expect(count).toBe(1);
	});
});

// ============================================================================
// (a) Students cannot read the verdict table; teachers/admins can
// ============================================================================

describe('Verdict table visibility', () => {
	it('returns zero rows (no error) when a student reads the verdict table', async () => {
		expect.assertions(2);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});
		await createVerdict({
			submissionId: sub.id,
			status: 'mismatch',
			serverIsCorrect: false,
			verifiedAt: new Date().toISOString()
		});

		const studentClient = await createAuthenticatedClient(student.email!);
		// A student querying the table is filtered to empty by RLS (no leak).
		const { data, error } = await studentClient
			.from(VERDICTS)
			.select('*')
			.eq('submission_id', sub.id);

		expect(error).toBeNull();
		expect((data as unknown[]) ?? []).toHaveLength(0);
	});

	it('lets a teacher read the verdict directly (RLS is_teacher_or_admin)', async () => {
		expect.assertions(3);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});
		await createVerdict({
			submissionId: sub.id,
			status: 'mismatch',
			serverIsCorrect: false,
			serverValidationResult: { valid: false, reason: 'forged' },
			verifiedAt: new Date().toISOString()
		});

		const teacherClient = await createAuthenticatedClient(teacher.email!);
		const { data, error } = await teacherClient
			.from(VERDICTS)
			.select('submission_id, verification_status, server_is_correct')
			.eq('submission_id', sub.id);

		expect(error).toBeNull();
		const rows = (data as Array<Record<string, unknown>>) ?? [];
		expect(rows).toHaveLength(1);
		expect(rows[0].verification_status).toBe('mismatch');
	});

	it('lets an admin read the verdict too (is_admin ⊂ is_teacher_or_admin)', async () => {
		expect.assertions(2);
		const student = await TestData.profile().withRole('student').create();
		const admin = await TestData.profile().withRole('admin').create();
		const exercise = await createPythonExercise(admin.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});
		await createVerdict({ submissionId: sub.id, status: 'match', serverIsCorrect: true });

		const adminClient = await createAuthenticatedClient(admin.email!);
		const { data, error } = await adminClient
			.from(VERDICTS)
			.select('verification_status')
			.eq('submission_id', sub.id);

		expect(error).toBeNull();
		expect((data as Array<Record<string, unknown>>)?.[0]?.verification_status).toBe('match');
	});

	it('supports the Phase 1c teacher query: join verdicts to submissions for an exercise', async () => {
		expect.assertions(3);
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const subA = await createSubmission({
			exerciseId: exercise.id,
			studentId: studentA.id,
			isCorrect: true
		});
		const subB = await createSubmission({
			exerciseId: exercise.id,
			studentId: studentB.id,
			isCorrect: true
		});
		await createVerdict({ submissionId: subA.id, status: 'mismatch', serverIsCorrect: false });
		await createVerdict({ submissionId: subB.id, status: 'match', serverIsCorrect: true });

		const teacherClient = await createAuthenticatedClient(teacher.email!);
		// The teacher already reads submissions by exercise_id under their own RLS;
		// here we fetch the matching verdicts by submission_id (the 1c read path).
		const { data, error } = await teacherClient
			.from(VERDICTS)
			.select('submission_id, verification_status')
			.in('submission_id', [subA.id, subB.id]);

		expect(error).toBeNull();
		const byId = new Map(
			((data as Array<Record<string, unknown>>) ?? []).map((r) => [
				r.submission_id as string,
				r.verification_status as string
			])
		);
		expect(byId.get(subA.id)).toBe('mismatch');
		expect(byId.get(subB.id)).toBe('match');
	});
});

// ============================================================================
// (b) Students cannot WRITE the verdict table (no write policy → 42501)
// ============================================================================

describe('Verdict table is not student-writable', () => {
	it('forbids a student INSERT (RLS 42501)', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});

		const studentClient = await createAuthenticatedClient(student.email!);
		const { error } = await studentClient
			.from(VERDICTS)
			.insert({ submission_id: sub.id, verification_status: 'match' } as never);
		expect(error?.code).toBe('42501');
	});

	it('forbids a teacher INSERT too (verdicts are server-only; no write policy)', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});

		const teacherClient = await createAuthenticatedClient(teacher.email!);
		const { error } = await teacherClient
			.from(VERDICTS)
			.insert({ submission_id: sub.id, verification_status: 'match' } as never);
		expect(error?.code).toBe('42501');
	});

	it('a student UPDATE affects zero rows (RLS filters them out; verdict unchanged)', async () => {
		expect.assertions(2);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});
		await createVerdict({ submissionId: sub.id, status: 'mismatch', serverIsCorrect: false });

		const studentClient = await createAuthenticatedClient(student.email!);
		// No student SELECT/UPDATE policy → the UPDATE matches no visible row.
		const { data: updated } = await studentClient
			.from(VERDICTS)
			.update({ verification_status: 'match' } as never)
			.eq('submission_id', sub.id)
			.select('submission_id');
		expect((updated as unknown[]) ?? []).toHaveLength(0);

		// Confirm the stored verdict is still 'mismatch' (read back via service).
		const { data: after } = await service
			.from(VERDICTS)
			.select('verification_status')
			.eq('submission_id', sub.id)
			.single();
		expect((after as Record<string, unknown>).verification_status).toBe('mismatch');
	});
});

// ============================================================================
// (c) service_role can INSERT (pending) then UPDATE (terminal verdict)
// ============================================================================

describe('service_role writes the verdict (recheck.ts flow)', () => {
	it('INSERTs a pending row then UPDATEs it to a terminal verdict', async () => {
		expect.assertions(7);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});

		// 1. Queue: INSERT pending (defaults verification_status='pending').
		const { error: insErr } = await service
			.from(VERDICTS)
			.insert({ submission_id: sub.id } as never);
		expect(insErr).toBeNull();

		const { data: pending } = await service
			.from(VERDICTS)
			.select('verification_status, server_is_correct, verified_at')
			.eq('submission_id', sub.id)
			.single();
		const p = pending as Record<string, unknown>;
		expect(p.verification_status).toBe('pending');
		expect(p.server_is_correct).toBeNull();
		expect(p.verified_at).toBeNull();

		// 2. Terminal: UPDATE with the replayed verdict.
		const verifiedAt = new Date().toISOString();
		const { error: updErr } = await service
			.from(VERDICTS)
			.update({
				verification_status: 'mismatch',
				server_is_correct: false,
				server_validation_result: { valid: false, reason: 'forged' },
				verified_at: verifiedAt
			} as never)
			.eq('submission_id', sub.id);
		expect(updErr).toBeNull();

		const { data: terminal } = await service
			.from(VERDICTS)
			.select('verification_status, server_is_correct')
			.eq('submission_id', sub.id)
			.single();
		const t = terminal as Record<string, unknown>;
		expect(t.verification_status).toBe('mismatch');
		expect(t.server_is_correct).toBe(false);
	});

	it('cascades the verdict away when its submission is deleted', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});
		await createVerdict({ submissionId: sub.id, status: 'match', serverIsCorrect: true });

		await service.from(SUBMISSIONS).delete().eq('id', sub.id);

		const { data } = await service
			.from(VERDICTS)
			.select('submission_id')
			.eq('submission_id', sub.id);
		expect((data as unknown[]) ?? []).toHaveLength(0);
	});
});

// ============================================================================
// (d) CHECK enum on verification_status
// ============================================================================

describe('verification_status CHECK', () => {
	it('rejects an out-of-enum status (23514) — no "skipped"', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const sub = await createSubmission({
			exerciseId: exercise.id,
			studentId: student.id,
			isCorrect: true
		});

		const { error } = await service
			.from(VERDICTS)
			.insert({ submission_id: sub.id, verification_status: 'skipped' } as never);
		expect(error?.code).toBe('23514');
	});

	it('accepts each valid status', async () => {
		expect.assertions(1);
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);
		const statuses = ['pending', 'match', 'mismatch', 'indeterminate', 'error'];
		let ok = true;
		for (const status of statuses) {
			const student = await TestData.profile().withRole('student').create();
			const sub = await createSubmission({
				exerciseId: exercise.id,
				studentId: student.id,
				isCorrect: true
			});
			const { error } = await service
				.from(VERDICTS)
				.insert({ submission_id: sub.id, verification_status: status } as never);
			if (error) ok = false;
		}
		expect(ok).toBe(true);
	});
});

// ============================================================================
// (e) run_flag_stale_python_rechecks() logs a job run with the right count
// ============================================================================

describe('run_flag_stale_python_rechecks sweep', () => {
	it('logs a success job run whose metadata counts stale pending verdicts', async () => {
		expect.assertions(4);
		const student = await TestData.profile().withRole('student').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const exercise = await createPythonExercise(teacher.id);

		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
		const now = new Date().toISOString();

		async function subFor(): Promise<string> {
			const s = await createSubmission({
				exerciseId: exercise.id,
				studentId: student.id,
				isCorrect: true
			});
			return s.id;
		}

		// Two STALE pending (created > 1h ago, still pending) → counted.
		await createVerdict({
			submissionId: await subFor(),
			status: 'pending',
			createdAt: twoHoursAgo
		});
		await createVerdict({
			submissionId: await subFor(),
			status: 'pending',
			createdAt: twoHoursAgo
		});
		// A RECENT pending (< 1h) → NOT stale, excluded.
		await createVerdict({ submissionId: await subFor(), status: 'pending', createdAt: now });
		// An old but already-resolved one (match) → excluded.
		await createVerdict({
			submissionId: await subFor(),
			status: 'match',
			serverIsCorrect: true,
			createdAt: twoHoursAgo
		});

		// Run the sweep (service_role may EXECUTE it).
		const { error: rpcErr } = await service.rpc('run_flag_stale_python_rechecks' as never);
		expect(rpcErr).toBeNull();

		// The sweep logged exactly one run for this job name.
		const { data: runs, error: runsErr } = await service
			.from('background_job_runs')
			.select('status, metadata')
			.eq('job_name', 'flag_stale_python_rechecks')
			.order('started_at', { ascending: false })
			.limit(1);
		expect(runsErr).toBeNull();

		const run = (runs ?? [])[0] as
			| { status: string; metadata: Record<string, unknown> }
			| undefined;
		expect(run?.status).toBe('success');
		// Only the two stale pending verdicts are counted.
		expect(run?.metadata?.stale_pending_rechecks).toBe(2);
	});

	it('counts zero when there is no stale pending verdict', async () => {
		expect.assertions(2);
		const { error: rpcErr } = await service.rpc('run_flag_stale_python_rechecks' as never);
		expect(rpcErr).toBeNull();

		const { data: runs } = await service
			.from('background_job_runs')
			.select('metadata')
			.eq('job_name', 'flag_stale_python_rechecks')
			.order('started_at', { ascending: false })
			.limit(1);
		const run = (runs ?? [])[0] as { metadata: Record<string, unknown> } | undefined;
		expect(run?.metadata?.stale_pending_rechecks).toBe(0);
	});
});
