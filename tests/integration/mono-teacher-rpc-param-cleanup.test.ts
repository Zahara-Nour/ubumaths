/**
 * Mono-teacher — drop redundant p_teacher_id params — Integration Tests
 * ====================================================================
 *
 * Migration 20260620120000 : les RPC `award_achievement_manual` /
 * `validate_riddle_attempt` ne prennent plus `p_teacher_id` (estampillent
 * `unlocked_by` / `validated_by` via `auth.uid()`), et `teacher_owns_riddle`
 * passe de `(p_teacher_id, p_riddle_id)` à `(p_riddle_id)` (→ `created_by =
 * auth.uid()`), avec les 3 policies `riddle_assignments` réécrites.
 *
 * On vérifie le comportement avec de vrais clients authentifiés (RLS appliqué) :
 *   - award/validate estampillent bien l'appelant (auth.uid()) ;
 *   - la RLS riddle_assignments reste correcte (le prof gère SES énigmes, pas
 *     celles créées par un autre).
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * @module tests/integration/mono-teacher-rpc-param-cleanup
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Mono-teacher RPC param cleanup - Integration Tests', () => {
	let service: SupabaseClient<Database>;
	const TEST_ACH_ID = 'test-ach-manual';

	afterAll(async () => {
		await service.from('achievements').delete().like('id', 'test-ach-%');
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		service = createServiceRoleClient();
		await cleanupAllTestData();
		await service.from('achievements').delete().like('id', 'test-ach-%');
	});

	/** Create a class and enrol `studentId` as an active member. */
	async function classWithMember(studentId: string) {
		const cls = await TestData.class().create();
		const { error } = await service
			.from('class_members')
			.insert({ class_id: cls.id, student_id: studentId, status: 'active' });
		expect(error).toBeNull();
		return cls;
	}

	// SKIP: blocked by a PRE-EXISTING, unrelated prod bug — the trigger
	// `log_achievements_to_events` on student_achievements references `NEW.metadata`,
	// a column student_achievements doesn't have (it should read the achievement's
	// metadata from the `achievements` table). Every student_achievements INSERT
	// therefore fails (42703). Un-skip once that trigger is fixed.
	it.skip('award_achievement_manual stamps unlocked_by = the calling teacher (auth.uid())', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		await classWithMember(student.id);

		const { error: achErr } = await service.from('achievements').insert({
			id: TEST_ACH_ID,
			context: 'meta',
			name: 'Test manual',
			description: 'Test',
			icon: '🏆',
			unlock_type: 'manual',
			is_active: true
		});
		expect(achErr).toBeNull();

		const tc = await createAuthenticatedClient(teacher.email);
		const { data, error } = await tc.rpc('award_achievement_manual', {
			p_student_id: student.id,
			p_achievement_id: TEST_ACH_ID,
			p_reason: 'Bravo'
		});
		expect(error).toBeNull();
		expect(data).toBe(true);

		const { data: row } = await service
			.from('student_achievements')
			.select('unlocked_by')
			.eq('student_id', student.id)
			.eq('achievement_id', TEST_ACH_ID)
			.single();
		expect(row?.unlocked_by).toBe(teacher.id);
	});

	it('validate_riddle_attempt stamps validated_by = the calling teacher (auth.uid())', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		await classWithMember(student.id);

		const { data: riddle } = await service
			.from('riddles')
			.insert({
				title: 'R',
				difficulty: 1,
				statement: 's',
				correction: 'c',
				created_by: teacher.id
			})
			.select('id')
			.single();
		const { data: attempt } = await service
			.from('riddle_attempts')
			.insert({
				riddle_id: riddle!.id,
				student_id: student.id,
				attempt_number: 1,
				submitted_answer: {},
				is_correct: null
			})
			.select('id')
			.single();

		const tc = await createAuthenticatedClient(teacher.email);
		const { error } = await tc.rpc('validate_riddle_attempt', {
			p_attempt_id: attempt!.id,
			p_is_correct: false
		});
		expect(error).toBeNull();

		const { data: validated } = await service
			.from('riddle_attempts')
			.select('validated_by, is_correct')
			.eq('id', attempt!.id)
			.single();
		expect(validated?.validated_by).toBe(teacher.id);
		expect(validated?.is_correct).toBe(false);
	});

	it('riddle_assignments RLS: a teacher assigns their OWN riddle but not another creator’s', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const cls = await classWithMember(student.id);

		// Riddle created by the teacher → teacher_owns_riddle(riddle_id) is true.
		const { data: ownRiddle } = await service
			.from('riddles')
			.insert({
				title: 'Own',
				difficulty: 1,
				statement: 's',
				correction: 'c',
				created_by: teacher.id
			})
			.select('id')
			.single();
		// Riddle created by someone else (the student) → ownership is false.
		const { data: otherRiddle } = await service
			.from('riddles')
			.insert({
				title: 'Other',
				difficulty: 1,
				statement: 's',
				correction: 'c',
				created_by: student.id
			})
			.select('id')
			.single();

		const tc = await createAuthenticatedClient(teacher.email);

		const { data: ok, error: okErr } = await tc
			.from('riddle_assignments')
			.insert({ riddle_id: ownRiddle!.id, assigned_by: teacher.id, class_id: cls.id })
			.select('id');
		expect(okErr).toBeNull();
		expect(ok).toHaveLength(1);

		const { error: denied } = await tc
			.from('riddle_assignments')
			.insert({ riddle_id: otherRiddle!.id, assigned_by: teacher.id, class_id: cls.id })
			.select('id');
		expect(denied).not.toBeNull();
	});
});
