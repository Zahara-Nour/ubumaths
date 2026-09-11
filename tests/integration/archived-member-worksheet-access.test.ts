/**
 * Archived class members lose access to that class's worksheets (needs a local DB)
 * ================================================================================
 *
 * `class_members.status` is either `active` or `archived`, the latter meaning
 * "left the class (keeps history)". Every other access helper in the schema
 * checks it — the worksheet chain did not:
 *
 *   - `is_in_assigned_class(uuid)`            → policy on worksheet_assignments
 *   - `student_has_worksheet_access(uuid)`    → policies on worksheets/exercises
 *   - `can_access_assignment(uuid)`           → corrections and previews
 *   - policy "Students can view their assignment classes" on the junction
 *
 * So a student who had left a class kept receiving its worksheets, while the
 * teacher's progress page — which does filter on `active` — no longer listed
 * them. Nobody was in a position to notice.
 *
 * The individual path is deliberately left alone: naming a student explicitly
 * does not depend on any class, and is precisely how an out-of-class student is
 * reached.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Service client: seeding only. Never for assertions about access. */
const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
	return client;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('archived class members and worksheet access', () => {
	let teacherId: string;
	let worksheetId: string;
	let exerciseId: string;
	let assignmentId: string;
	let classA: string;
	let classB: string;

	/** Active in class A — the control: nothing about them may change. */
	let activeStudent: SupabaseClient<Database>;
	/** Archived from class A, member of nothing else. */
	let archivedStudent: SupabaseClient<Database>;
	let archivedStudentId: string;
	/** Archived from class A, but named individually on the assignment. */
	let archivedButNamed: SupabaseClient<Database>;
	/** Archived from class A, still active in class B — also targeted. */
	let archivedElsewhereActive: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;

		const a = await TestData.class().withName('1re A archived ZZ').create();
		const b = await TestData.class().withName('1re B archived ZZ').create();
		classA = a.id;
		classB = b.id;

		const mkStudent = async (memberships: { class_id: string; status: string }[]) => {
			const profile = await TestData.profile().withRole('student').create();
			if (memberships.length > 0) {
				const { error } = await service
					.from('class_members')
					.insert(memberships.map((m) => ({ ...m, student_id: profile.id })));
				expect(error).toBeNull();
			}
			return { id: profile.id, client: await clientFor(profile.email) };
		};

		const active = await mkStudent([{ class_id: classA, status: 'active' }]);
		activeStudent = active.client;

		const archived = await mkStudent([{ class_id: classA, status: 'archived' }]);
		archivedStudentId = archived.id;
		archivedStudent = archived.client;

		const named = await mkStudent([{ class_id: classA, status: 'archived' }]);
		archivedButNamed = named.client;

		const elsewhere = await mkStudent([
			{ class_id: classA, status: 'archived' },
			{ class_id: classB, status: 'active' }
		]);
		archivedElsewhereActive = elsewhere.client;

		const exercise = (await TestData.exercise(teacherId).create()) as { id: string };
		exerciseId = exercise.id;

		worksheetId = await insert('worksheets', {
			title: 'Worksheet for archived members',
			type: 'worksheet',
			status: 'published',
			created_by: teacherId
		});
		await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exerciseId,
			position: 1
		});

		assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: teacherId
		});

		// The assignment targets BOTH classes, and names one student explicitly.
		const { error: junctionError } = await service.from('worksheet_assignment_classes').insert([
			{ assignment_id: assignmentId, class_id: classA },
			{ assignment_id: assignmentId, class_id: classB }
		]);
		expect(junctionError).toBeNull();

		const { error: namedError } = await service
			.from('worksheet_assignment_students')
			.insert({ assignment_id: assignmentId, student_id: named.id });
		expect(namedError).toBeNull();
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function hasWorksheetAccess(client: SupabaseClient<Database>): Promise<boolean> {
		const { data, error } = await client.rpc('student_has_worksheet_access', {
			p_worksheet_id: worksheetId
		});
		expect(error).toBeNull();
		return data === true;
	}

	async function canAccessAssignment(client: SupabaseClient<Database>): Promise<boolean> {
		const { data, error } = await client.rpc('can_access_assignment', {
			p_assignment_id: assignmentId
		});
		expect(error).toBeNull();
		return data === true;
	}

	/** What the student's own RLS lets them read of the assignment row. */
	async function visibleAssignments(client: SupabaseClient<Database>): Promise<string[]> {
		const { data, error } = await client
			.from('worksheet_assignments')
			.select('id')
			.eq('id', assignmentId);
		expect(error).toBeNull();
		return (data ?? []).map((row) => row.id);
	}

	describe('the control: an active member', () => {
		it('still reaches the worksheet', async () => {
			expect(await hasWorksheetAccess(activeStudent)).toBe(true);
			expect(await canAccessAssignment(activeStudent)).toBe(true);
			expect(await visibleAssignments(activeStudent)).toContain(assignmentId);
		});
	});

	describe('an archived member of the only class reaching them', () => {
		it('no longer reaches the worksheet', async () => {
			expect(await hasWorksheetAccess(archivedStudent)).toBe(false);
		});

		it('no longer reaches the assignment, so neither corrections nor previews', async () => {
			expect(await canAccessAssignment(archivedStudent)).toBe(false);
		});

		it('no longer sees the assignment row at all', async () => {
			expect(await visibleAssignments(archivedStudent)).toHaveLength(0);
		});

		it('no longer sees the junction row naming that class', async () => {
			// This row is what tells the student "this worksheet reaches you through
			// class A". Leaving it visible would keep naming a class they have left.
			const { data, error } = await archivedStudent
				.from('worksheet_assignment_classes')
				.select('class_id')
				.eq('assignment_id', assignmentId);
			expect(error).toBeNull();
			expect(data ?? []).toHaveLength(0);
		});

		it('no longer reaches the worksheet exercises', async () => {
			// `student_has_exercise_access` delegates to the worksheet check, so a
			// stale grant here would render the worksheet's content anyway.
			const { data, error } = await archivedStudent.rpc('student_has_exercise_access', {
				p_exercise_id: exerciseId
			});
			expect(error).toBeNull();
			expect(data).toBe(false);
		});
	});

	describe('archived, but reached another way', () => {
		it('an individually named student keeps access', async () => {
			// Naming a student does not go through any class: this is exactly how an
			// out-of-class student is reached, and archiving must not break it.
			expect(await hasWorksheetAccess(archivedButNamed)).toBe(true);
			expect(await canAccessAssignment(archivedButNamed)).toBe(true);
		});

		it('a student still active in another targeted class keeps access', async () => {
			expect(await hasWorksheetAccess(archivedElsewhereActive)).toBe(true);
			expect(await canAccessAssignment(archivedElsewhereActive)).toBe(true);
		});
	});

	describe('archiving takes effect without touching the assignment', () => {
		it('access is lost as soon as the membership is archived', async () => {
			// Archiving is the teacher's gesture; nothing is expected to be replayed
			// on the assignment itself for it to take effect.
			const { error: reactivateError } = await service
				.from('class_members')
				.update({ status: 'active' })
				.eq('student_id', archivedStudentId)
				.eq('class_id', classA);
			expect(reactivateError).toBeNull();
			expect(await hasWorksheetAccess(archivedStudent)).toBe(true);

			const { error: archiveError } = await service
				.from('class_members')
				.update({ status: 'archived' })
				.eq('student_id', archivedStudentId)
				.eq('class_id', classA);
			expect(archiveError).toBeNull();
			expect(await hasWorksheetAccess(archivedStudent)).toBe(false);
		});
	});
});
