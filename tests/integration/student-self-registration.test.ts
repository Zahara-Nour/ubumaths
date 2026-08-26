/**
 * Student self-registration by class code — Integration Tests
 * ===========================================================
 *
 * Exercises the self-registration branch added to `handle_new_user()` by
 * migration 20260825170000_student_self_registration.sql.
 *
 * A student signs up with email/password + a `class_id` in user metadata
 * (resolved server-side from a class join code). The trigger:
 *   - class active AND registration_open        → approved student, enrolled,
 *     school_id + grade taken FROM THE CLASS, firstname/lastname from metadata,
 *     and (if terms_version present) a terms_acceptances row.
 *   - class missing / inactive / closed         → pending student, NOT enrolled,
 *     no terms_acceptances.
 * The pre-existing pending_students and default (domain-based) branches must be
 * preserved verbatim.
 *
 * We drive the trigger via the admin API (`auth.admin.createUser` with
 * `email_confirm: true`), whose `user_metadata` feeds raw_user_meta_data. Then
 * we assert on `profiles`, `class_members` and `terms_acceptances`.
 *
 * RLS is exercised with real authenticated clients (anon key + password
 * sign-in): a student sees only their own terms_acceptances row; a teacher/admin
 * sees all.
 *
 * Run `pnpm db:start` (or `pnpm db:reset`) first, then `pnpm test:integration`.
 *
 * @module tests/integration/student-self-registration
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Password used everywhere so createAuthenticatedClient() can sign in.
const PASSWORD = 'password123';
// Email marker (@test.com) so cleanupAllTestData() removes users/profiles.
const TERMS_VERSION = 'v1.2.3';

describe('Student self-registration by class code - Integration Tests', () => {
	let service: SupabaseClient<Database>;
	const createdSchoolIds: string[] = [];
	const createdClassIds: string[] = [];

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		service = createServiceRoleClient();
		await cleanupAllTestData();
		createdSchoolIds.length = 0;
		createdClassIds.length = 0;
	});

	function testEmail(): string {
		return `${crypto.randomUUID()}@test.com`;
	}

	// A teacher must exist before creating a class: the `create_class_chat_room`
	// trigger (on classes INSERT) attributes the class chat room to the sole
	// teacher, and `conversations_check` requires created_by NOT NULL for group
	// chats. Every test that creates a class first creates the sole teacher.
	async function ensureTeacher() {
		return TestData.profile().withRole('teacher').create();
	}

	// A school with the 'Testville' sentinel city so cleanupAllTestData() purges it.
	async function createSchool(): Promise<string> {
		const { data, error } = await service
			.from('schools')
			.insert({ name: `Test School ${crypto.randomUUID()}`, city: 'Testville', country: 'FR' })
			.select('id')
			.single();
		expect(error).toBeNull();
		createdSchoolIds.push(data!.id);
		return data!.id;
	}

	// Build a class with explicit school_id / grade / is_active / registration_open.
	// (The ClassBuilder can't set those, so we insert directly.)
	async function createClass(opts: {
		schoolId?: string | null;
		grade?: string | null;
		isActive?: boolean;
		registrationOpen?: boolean;
	}): Promise<Database['public']['Tables']['classes']['Row']> {
		const { data, error } = await service
			.from('classes')
			.insert({
				name: `Test Class ${crypto.randomUUID()}`,
				join_code: `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
				school_id: opts.schoolId ?? null,
				grade: opts.grade ?? null,
				is_active: opts.isActive ?? true,
				registration_open: opts.registrationOpen ?? false
			} as Database['public']['Tables']['classes']['Insert'])
			.select('*')
			.single();
		expect(error).toBeNull();
		createdClassIds.push(data!.id);
		return data!;
	}

	// Create a user via the admin API. user_metadata feeds raw_user_meta_data,
	// which drives handle_new_user(). Returns the created user's id.
	async function signUp(metadata: Record<string, unknown>): Promise<{ id: string; email: string }> {
		const email = testEmail();
		const { data, error } = await service.auth.admin.createUser({
			email,
			password: PASSWORD,
			email_confirm: true,
			user_metadata: metadata
		});
		expect(error).toBeNull();
		expect(data.user).not.toBeNull();
		return { id: data.user!.id, email };
	}

	async function getProfile(id: string) {
		const { data } = await service
			.from('profiles')
			.select('id, email, firstname, lastname, role, status, school_id, grade')
			.eq('id', id)
			.maybeSingle();
		return data;
	}

	async function getMemberships(studentId: string) {
		const { data } = await service
			.from('class_members')
			.select('class_id, student_id, status')
			.eq('student_id', studentId);
		return data ?? [];
	}

	async function getTerms(userId: string) {
		const { data } = await service
			.from('terms_acceptances')
			.select('user_id, terms_version')
			.eq('user_id', userId);
		return data ?? [];
	}

	// ------------------------------------------------------------------
	// 1. Nominal: active class + registration_open → approved + enrolled
	// ------------------------------------------------------------------
	it('nominal: active + open class → approved student, enrolled, school/grade from class, terms recorded', async () => {
		await ensureTeacher();
		const schoolId = await createSchool();
		const cls = await createClass({
			schoolId,
			grade: '6',
			isActive: true,
			registrationOpen: true
		});

		const { id } = await signUp({
			class_id: cls.id,
			firstname: 'Alice',
			lastname: 'Martin',
			terms_version: TERMS_VERSION
		});

		const profile = await getProfile(id);
		expect(profile).not.toBeNull();
		expect(profile!.role).toBe('student');
		expect(profile!.status).toBe('approved');
		expect(profile!.school_id).toBe(schoolId); // from the class, not metadata
		expect(profile!.grade).toBe('6'); // from the class
		expect(profile!.firstname).toBe('Alice'); // from metadata
		expect(profile!.lastname).toBe('Martin');

		const members = await getMemberships(id);
		expect(members).toHaveLength(1);
		expect(members[0].class_id).toBe(cls.id);
		expect(members[0].status).toBe('active'); // default status

		const terms = await getTerms(id);
		expect(terms).toHaveLength(1);
		expect(terms[0].terms_version).toBe(TERMS_VERSION);
	});

	// ------------------------------------------------------------------
	// 2. Registration closed → pending, not enrolled, no terms
	// ------------------------------------------------------------------
	it('registration closed → pending student, no enrollment, no terms', async () => {
		await ensureTeacher();
		const schoolId = await createSchool();
		const cls = await createClass({
			schoolId,
			grade: '5',
			isActive: true,
			registrationOpen: false
		});

		const { id } = await signUp({
			class_id: cls.id,
			firstname: 'Bob',
			lastname: 'Durand',
			terms_version: TERMS_VERSION
		});

		const profile = await getProfile(id);
		expect(profile!.role).toBe('student');
		expect(profile!.status).toBe('pending');

		expect(await getMemberships(id)).toHaveLength(0);
		expect(await getTerms(id)).toHaveLength(0);
	});

	// ------------------------------------------------------------------
	// 3. Inactive class (even if registration_open) → pending, not enrolled
	// ------------------------------------------------------------------
	it('inactive class (registration_open=true) → pending student, not enrolled', async () => {
		await ensureTeacher();
		const schoolId = await createSchool();
		const cls = await createClass({
			schoolId,
			grade: '4',
			isActive: false,
			registrationOpen: true
		});

		const { id } = await signUp({
			class_id: cls.id,
			firstname: 'Chloe',
			lastname: 'Petit',
			terms_version: TERMS_VERSION
		});

		const profile = await getProfile(id);
		expect(profile!.status).toBe('pending');
		expect(await getMemberships(id)).toHaveLength(0);
		expect(await getTerms(id)).toHaveLength(0);
	});

	// ------------------------------------------------------------------
	// 4. Non-existent class_id → pending, not enrolled
	// ------------------------------------------------------------------
	it('non-existent class_id → pending student, not enrolled', async () => {
		const { id } = await signUp({
			class_id: crypto.randomUUID(),
			firstname: 'David',
			lastname: 'Roux',
			terms_version: TERMS_VERSION
		});

		const profile = await getProfile(id);
		expect(profile!.role).toBe('student');
		expect(profile!.status).toBe('pending');
		expect(await getMemberships(id)).toHaveLength(0);
		expect(await getTerms(id)).toHaveLength(0);
	});

	// ------------------------------------------------------------------
	// 5. Valid class but no terms_version → enrolled + approved, no terms row
	// ------------------------------------------------------------------
	it('valid class without terms_version → approved + enrolled but no terms row', async () => {
		await ensureTeacher();
		const schoolId = await createSchool();
		const cls = await createClass({
			schoolId,
			grade: '3',
			isActive: true,
			registrationOpen: true
		});

		const { id } = await signUp({
			class_id: cls.id,
			firstname: 'Emma',
			lastname: 'Blanc'
			// no terms_version
		});

		const profile = await getProfile(id);
		expect(profile!.status).toBe('approved');
		expect(profile!.school_id).toBe(schoolId);
		expect(profile!.grade).toBe('3');

		const members = await getMemberships(id);
		expect(members).toHaveLength(1);
		expect(members[0].class_id).toBe(cls.id);

		expect(await getTerms(id)).toHaveLength(0);
	});

	// ------------------------------------------------------------------
	// 6. Regression: pending_students branch preserved (no class_id)
	// ------------------------------------------------------------------
	//
	// The pending_students branch used to reference a `gender` column (dropped
	// 2026-01-15, RGPD minimization) → 42703 swallowed by the trigger's WHEN OTHERS
	// handler → pre-imported student activation failed silently. Migration
	// 20260825170000 removes those `gender` references, so this branch works again:
	// a teacher-added student, on first login, gets an approved profile, is enrolled
	// in the pre-assigned classes, and the pending_students row is marked activated.
	it('regression: pending_students match (no class_id) → approved, enrolled in pre-assigned classes, marked activated', async () => {
		await ensureTeacher();
		const schoolId = await createSchool();
		// Pre-assigned class the student should be enrolled into on first login.
		const cls = await createClass({
			schoolId,
			grade: '5',
			isActive: true,
			registrationOpen: false // irrelevant for this branch
		});

		const email = testEmail();
		const { data: pending, error: pErr } = await service
			.from('pending_students')
			.insert({
				email,
				firstname: 'Fanny',
				lastname: 'Noir',
				grade: '5',
				school_id: schoolId,
				class_ids: [cls.id],
				is_activated: false
			})
			.select('id')
			.single();
		expect(pErr).toBeNull();

		// Sign up WITHOUT class_id → falls through to the pending_students branch.
		const { data: created, error: cErr } = await service.auth.admin.createUser({
			email,
			password: PASSWORD,
			email_confirm: true,
			user_metadata: {}
		});
		expect(cErr).toBeNull();
		const id = created.user!.id;

		const profile = await getProfile(id);
		expect(profile!.role).toBe('student');
		expect(profile!.status).toBe('approved'); // teacher-added → approved
		expect(profile!.school_id).toBe(schoolId);
		expect(profile!.grade).toBe('5');
		expect(profile!.firstname).toBe('Fanny');
		expect(profile!.lastname).toBe('Noir');

		const members = await getMemberships(id);
		expect(members).toHaveLength(1);
		expect(members[0].class_id).toBe(cls.id);

		// pending_students marked activated.
		const { data: after } = await service
			.from('pending_students')
			.select('is_activated, activated_at')
			.eq('id', pending!.id)
			.single();
		expect(after!.is_activated).toBe(true);
		expect(after!.activated_at).not.toBeNull();

		// No terms recorded via this branch.
		expect(await getTerms(id)).toHaveLength(0);
	});

	// ------------------------------------------------------------------
	// 7. Regression: default branch (no class_id, non-voltaire, not pending)
	// ------------------------------------------------------------------
	it('regression: default branch (no class_id, non-voltaire email, not in pending_students) → approved, not enrolled', async () => {
		const { id } = await signUp({}); // @test.com email, no metadata

		const profile = await getProfile(id);
		expect(profile!.role).toBe('student');
		expect(profile!.status).toBe('approved'); // non-voltaire default → approved
		expect(await getMemberships(id)).toHaveLength(0);
		expect(await getTerms(id)).toHaveLength(0);
	});

	// ------------------------------------------------------------------
	// 8. RLS on terms_acceptances: own vs other, and teacher/admin sees all
	// ------------------------------------------------------------------
	it('RLS: a student reads only their own terms_acceptances; teacher/admin reads all', async () => {
		// Teacher created first (required by the class-chat trigger) and reused below.
		const teacher = await TestData.profile().withRole('teacher').create();
		const schoolId = await createSchool();
		const cls = await createClass({
			schoolId,
			grade: '6',
			isActive: true,
			registrationOpen: true
		});

		// Student A and B both self-register (each gets a terms row).
		const a = await signUp({
			class_id: cls.id,
			firstname: 'StudentA',
			lastname: 'Test',
			terms_version: TERMS_VERSION
		});
		const b = await signUp({
			class_id: cls.id,
			firstname: 'StudentB',
			lastname: 'Test',
			terms_version: TERMS_VERSION
		});

		// Sanity: service role sees both rows.
		const { data: allRows } = await service
			.from('terms_acceptances')
			.select('user_id')
			.in('user_id', [a.id, b.id]);
		expect(allRows).toHaveLength(2);

		// Authenticated student A: sees own row, not B's (RLS: user_id = auth.uid()).
		const aClient = await createAuthenticatedClient(a.email, PASSWORD);
		const { data: aVisible, error: aErr } = await aClient
			.from('terms_acceptances')
			.select('user_id, terms_version');
		expect(aErr).toBeNull();
		expect(aVisible).toHaveLength(1);
		expect(aVisible![0].user_id).toBe(a.id);

		// A explicitly queries B's row → blocked by RLS (empty).
		const { data: aQueriesB } = await aClient
			.from('terms_acceptances')
			.select('user_id')
			.eq('user_id', b.id);
		expect(aQueriesB).toHaveLength(0);

		// Teacher sees ALL terms rows (is_teacher_or_admin policy).
		const teacherClient = await createAuthenticatedClient(teacher.email, PASSWORD);
		const { data: teacherVisible, error: tErr } = await teacherClient
			.from('terms_acceptances')
			.select('user_id')
			.in('user_id', [a.id, b.id]);
		expect(tErr).toBeNull();
		expect(teacherVisible).toHaveLength(2);
	});

	// ------------------------------------------------------------------
	// 9. resolve_open_class_by_code() RPC — public code resolution used by
	//    the /auth/register action to validate a code before signup.
	// ------------------------------------------------------------------
	describe('resolve_open_class_by_code RPC', () => {
		it('returns the class id for an active + open class (case-insensitive, trimmed)', async () => {
			await ensureTeacher();
			const cls = await createClass({ isActive: true, registrationOpen: true });

			const { data, error } = await service.rpc('resolve_open_class_by_code', {
				p_code: cls.join_code
			});
			expect(error).toBeNull();
			expect(data).toBe(cls.id);

			// Case-insensitive + surrounding whitespace still resolves.
			const { data: data2 } = await service.rpc('resolve_open_class_by_code', {
				p_code: `  ${cls.join_code.toLowerCase()}  `
			});
			expect(data2).toBe(cls.id);
		});

		it('returns null when registration is closed', async () => {
			await ensureTeacher();
			const cls = await createClass({ isActive: true, registrationOpen: false });
			const { data } = await service.rpc('resolve_open_class_by_code', { p_code: cls.join_code });
			expect(data).toBeNull();
		});

		it('returns null when the class is inactive', async () => {
			await ensureTeacher();
			const cls = await createClass({ isActive: false, registrationOpen: true });
			const { data } = await service.rpc('resolve_open_class_by_code', { p_code: cls.join_code });
			expect(data).toBeNull();
		});

		it('returns null for an unknown code', async () => {
			const { data } = await service.rpc('resolve_open_class_by_code', { p_code: 'NOSUCHCODE' });
			expect(data).toBeNull();
		});
	});
});
