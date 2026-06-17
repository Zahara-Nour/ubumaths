/**
 * Game leaderboards — Integration Tests (RLS / scoping)
 * =====================================================
 *
 * Feature: docs/wip/game-leaderboards.md. Two SECURITY DEFINER RPCs, both ranked
 * by the CALLER (`auth.uid()`) and school-bounded via `my_school()`:
 *   - game_leaderboard(p_game, p_scope, p_limit)            — unified ranking
 *   - minesweeper_scoped_leaderboard(p_scope, p_limit)      — detailed (avg_top_10)
 *
 * The safeguarding-critical property is **no cross-école leakage** of minors, plus
 * the teacher appearing as an unranked (rank=NULL) reference row and dense_rank
 * being computed among students only.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * NB single-teacher lock: the `enforce_single_teacher` trigger forbids ≥ 2 teacher
 * accounts. Each test creates exactly ONE teacher; cleanupAllTestData() removes it
 * between tests, and global-setup.ts purges any seeded teacher once up front.
 *
 * @module tests/integration/game-leaderboards
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

const svc = createServiceRoleClient();

let codeCounter = 0;

// --- setup helpers (service role — bypasses RLS, mirrors real data shape) ----

async function createSchool(name: string): Promise<string> {
	// Avoid .single() (matches ClassBuilder: triggers can perturb the row count).
	const { data, error } = await svc
		.from('schools')
		.insert({ name, city: 'Testville', country: 'FR' })
		.select('id');
	if (error) throw error;
	if (!data || data.length === 0) throw new Error('school insert returned no row');
	return data[0].id;
}

async function setSchoolGrade(
	userId: string,
	schoolId: string,
	grade: string | null
): Promise<void> {
	const { error } = await svc
		.from('profiles')
		.update({ school_id: schoolId, grade })
		.eq('id', userId);
	if (error) throw error;
}

async function set2048Score(userId: string, best: number): Promise<void> {
	const { error } = await svc
		.from('game_2048_scores')
		.insert({ user_id: userId, best_score: best });
	if (error) throw error;
}

async function createClass(
	teacherId: string,
	schoolId: string,
	grade: string | null
): Promise<string> {
	const { data, error } = await svc
		.from('classes')
		.insert({
			name: 'Classe Test',
			join_code: `LBT${codeCounter++}${Math.random().toString(36).slice(2, 7)}`,
			teacher_id: teacherId,
			school_id: schoolId,
			grade
		})
		.select('id');
	if (error) throw error;
	if (!data || data.length === 0) throw new Error('class insert returned no row');
	return data[0].id;
}

async function addToClass(classId: string, studentId: string): Promise<void> {
	const { error } = await svc
		.from('class_members')
		.insert({ class_id: classId, student_id: studentId, status: 'active' });
	if (error) throw error;
}

async function addWonMinesweeperGame(studentId: string, points: number): Promise<void> {
	const { error } = await svc.from('minesweeper_games').insert({
		student_id: studentId,
		status: 'won',
		points_earned: points,
		// CHECK constraints for a finished (won) game on minesweeper_games:
		//  - completed_must_have_time          → time_seconds NOT NULL & > 0
		//  - in_progress_must_not_be_completed → completed_at NOT NULL
		//  - difficulty_check / reasonable_time_bounds → difficulty must be one of
		//    beginner/intermediate/expert (NOT 'easy'); beginner allows 1..3600s.
		time_seconds: 60,
		completed_at: new Date().toISOString(),
		difficulty: 'beginner',
		mines_count: 10,
		grid_state: {}
	});
	if (error) throw error;
}

type Row = {
	rank: number | null;
	user_id: string;
	score: number;
	is_me: boolean;
	is_teacher: boolean;
};

describe('game_leaderboard RPC — school-scoped leaderboards', () => {
	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	it('school scope: ranks my school, excludes other schools, teacher unranked, dense_rank among students', async () => {
		const schoolA = await createSchool('École A');
		const schoolB = await createSchool('École B');

		const teacher = await TestData.profile().withRole('teacher').create();
		await setSchoolGrade(teacher.id, schoolA, null);
		await set2048Score(teacher.id, 5000); // higher than every student

		const s1 = await TestData.profile().withRole('student').create();
		const s2 = await TestData.profile().withRole('student').create();
		const s3 = await TestData.profile().withRole('student').create();
		await setSchoolGrade(s1.id, schoolA, '6');
		await setSchoolGrade(s2.id, schoolA, '6');
		await setSchoolGrade(s3.id, schoolA, '5');
		await set2048Score(s1.id, 3000);
		await set2048Score(s2.id, 2000);
		await set2048Score(s3.id, 1000);

		const other = await TestData.profile().withRole('student').create();
		await setSchoolGrade(other.id, schoolB, '6');
		await set2048Score(other.id, 9999); // would top the board if it leaked

		const client = await createAuthenticatedClient(s1.email);
		const { data, error } = await client.rpc('game_leaderboard', {
			p_game: '2048',
			p_scope: 'school',
			p_limit: 50
		});
		expect(error).toBeNull();
		const rows = (data ?? []) as Row[];
		const ids = rows.map((r) => r.user_id);

		// My school's students are present…
		expect(ids).toEqual(expect.arrayContaining([s1.id, s2.id, s3.id]));
		// …the other school's student is NOT (no cross-école leak).
		expect(ids).not.toContain(other.id);

		// Teacher present as an unranked reference row.
		const teacherRow = rows.find((r) => r.user_id === teacher.id);
		expect(teacherRow?.is_teacher).toBe(true);
		expect(teacherRow?.rank).toBeNull();

		// is_me on the caller only.
		expect(rows.find((r) => r.user_id === s1.id)?.is_me).toBe(true);
		expect(rows.find((r) => r.user_id === s2.id)?.is_me).toBe(false);

		// dense_rank among students only (teacher doesn't consume a rank).
		const byId = (id: string) => rows.find((r) => r.user_id === id);
		expect(byId(s1.id)?.rank).toBe(1);
		expect(byId(s2.id)?.rank).toBe(2);
		expect(byId(s3.id)?.rank).toBe(3);
	});

	it('school scope: a student of another school sees only their own school', async () => {
		const schoolA = await createSchool('École A');
		const schoolB = await createSchool('École B');

		const teacher = await TestData.profile().withRole('teacher').create();
		await setSchoolGrade(teacher.id, schoolA, null);

		const a1 = await TestData.profile().withRole('student').create();
		await setSchoolGrade(a1.id, schoolA, '6');
		await set2048Score(a1.id, 3000);

		const b1 = await TestData.profile().withRole('student').create();
		await setSchoolGrade(b1.id, schoolB, '6');
		await set2048Score(b1.id, 1500);

		const client = await createAuthenticatedClient(b1.email);
		const { data, error } = await client.rpc('game_leaderboard', {
			p_game: '2048',
			p_scope: 'school',
			p_limit: 50
		});
		expect(error).toBeNull();
		const ids = ((data ?? []) as Row[]).map((r) => r.user_id);
		expect(ids).toContain(b1.id);
		expect(ids).not.toContain(a1.id); // school A student never leaks to school B
	});

	it('grade scope: same grade ∩ same school only', async () => {
		const schoolA = await createSchool('École A');
		const schoolB = await createSchool('École B');

		const teacher = await TestData.profile().withRole('teacher').create();
		await setSchoolGrade(teacher.id, schoolA, null);

		const g6a = await TestData.profile().withRole('student').create();
		const g6b = await TestData.profile().withRole('student').create();
		const g5 = await TestData.profile().withRole('student').create();
		const g6other = await TestData.profile().withRole('student').create();
		await setSchoolGrade(g6a.id, schoolA, '6');
		await setSchoolGrade(g6b.id, schoolA, '6');
		await setSchoolGrade(g5.id, schoolA, '5');
		await setSchoolGrade(g6other.id, schoolB, '6');
		for (const s of [g6a, g6b, g5, g6other]) await set2048Score(s.id, 1000);

		const client = await createAuthenticatedClient(g6a.email);
		const { data, error } = await client.rpc('game_leaderboard', {
			p_game: '2048',
			p_scope: 'grade',
			p_limit: 50
		});
		expect(error).toBeNull();
		const ids = ((data ?? []) as Row[]).map((r) => r.user_id);
		expect(ids).toEqual(expect.arrayContaining([g6a.id, g6b.id]));
		expect(ids).not.toContain(g5.id); // different grade
		expect(ids).not.toContain(g6other.id); // same grade, different school
	});

	it('class scope: only active classmates appear (out-of-class student excluded)', async () => {
		const schoolA = await createSchool('École A');

		const teacher = await TestData.profile().withRole('teacher').create();
		await setSchoolGrade(teacher.id, schoolA, null);
		const classX = await createClass(teacher.id, schoolA, '6');

		const inClass1 = await TestData.profile().withRole('student').create();
		const inClass2 = await TestData.profile().withRole('student').create();
		const outOfClass = await TestData.profile().withRole('student').create();
		for (const s of [inClass1, inClass2, outOfClass]) {
			await setSchoolGrade(s.id, schoolA, '6');
			await set2048Score(s.id, 1000);
		}
		await addToClass(classX, inClass1.id);
		await addToClass(classX, inClass2.id);

		const client = await createAuthenticatedClient(inClass1.email);
		const { data, error } = await client.rpc('game_leaderboard', {
			p_game: '2048',
			p_scope: 'class',
			p_limit: 50
		});
		expect(error).toBeNull();
		const ids = ((data ?? []) as Row[]).map((r) => r.user_id);
		expect(ids).toEqual(expect.arrayContaining([inClass1.id, inClass2.id]));
		expect(ids).not.toContain(outOfClass.id); // same school but not a classmate
	});
});

describe('minesweeper_scoped_leaderboard RPC — école-isolation', () => {
	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	it('school scope: returns my school with avg_top_10, excludes other schools', async () => {
		const schoolA = await createSchool('École A');
		const schoolB = await createSchool('École B');

		const teacher = await TestData.profile().withRole('teacher').create();
		await setSchoolGrade(teacher.id, schoolA, null);

		const a1 = await TestData.profile().withRole('student').create();
		await setSchoolGrade(a1.id, schoolA, '6');
		await addWonMinesweeperGame(a1.id, 120);
		await addWonMinesweeperGame(a1.id, 80);

		const b1 = await TestData.profile().withRole('student').create();
		await setSchoolGrade(b1.id, schoolB, '6');
		await addWonMinesweeperGame(b1.id, 200);

		const client = await createAuthenticatedClient(a1.email);
		const { data, error } = await client.rpc('minesweeper_scoped_leaderboard', {
			p_scope: 'school',
			p_limit: 50
		});
		expect(error).toBeNull();
		const rows = (data ?? []) as Array<{ user_id: string; avg_top_10: number; is_me: boolean }>;
		const me = rows.find((r) => r.user_id === a1.id);
		expect(me).toBeDefined();
		expect(me?.is_me).toBe(true);
		expect(me?.avg_top_10).toBeGreaterThan(0); // round(avg(120,80),1) = 100
		expect(rows.map((r) => r.user_id)).not.toContain(b1.id); // other school excluded
	});
});
