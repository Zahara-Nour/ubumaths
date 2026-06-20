/**
 * log_achievements_to_events trigger — metadata fix — Integration Tests
 * ====================================================================
 *
 * Regression for migration 20260620130000. The trigger on student_achievements
 * read `NEW.metadata`, but student_achievements has no such column → every
 * INSERT failed (42703), so awarding a success (manual OR automatic) was broken
 * in prod (student_achievements empty). The fix reads the metadata from the
 * `achievements` catalog instead.
 *
 * We exercise the trigger DIRECTLY (service-role INSERT into student_achievements)
 * so the test is independent of any RPC signature.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * @module tests/integration/achievement-events-trigger
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('log_achievements_to_events trigger - Integration Tests', () => {
	let service: SupabaseClient<Database>;
	const TEST_ACH_ID = 'test-ach-trigger';

	afterAll(async () => {
		await service.from('achievements').delete().like('id', 'test-ach-%');
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		service = createServiceRoleClient();
		await cleanupAllTestData();
		await service.from('achievements').delete().like('id', 'test-ach-%');
	});

	async function classWithMember(studentId: string) {
		const cls = await TestData.class().create();
		const { error } = await service
			.from('class_members')
			.insert({ class_id: cls.id, student_id: studentId, status: 'active' });
		expect(error).toBeNull();
		return cls;
	}

	it('inserting a student_achievement succeeds and logs a reward_event from the achievement metadata', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		await classWithMember(student.id);

		const { error: achErr } = await service.from('achievements').insert({
			id: TEST_ACH_ID,
			context: 'meta',
			name: 'Trigger test',
			description: 'D',
			icon: '🏆',
			unlock_type: 'manual',
			is_active: true,
			metadata: { points: 10 }
		});
		expect(achErr).toBeNull();

		// Before the fix this INSERT failed with 42703 (record "new" has no field "metadata").
		const { data: sa, error: saErr } = await service
			.from('student_achievements')
			.insert({ student_id: student.id, achievement_id: TEST_ACH_ID, unlocked_by: teacher.id })
			.select('id')
			.single();
		expect(saErr).toBeNull();
		expect(sa).not.toBeNull();

		// The trigger logged a reward_event sourcing its metadata from `achievements`.
		const { data: events } = await service
			.from('reward_events')
			.select('metadata, reward_type, event_type, item_name')
			.eq('source_table', 'student_achievements')
			.eq('source_id', sa!.id);
		expect(events).toHaveLength(1);
		expect(events![0].reward_type).toBe('achievement');
		expect(events![0].event_type).toBe('earned');
		const meta = events![0].metadata as Record<string, unknown>;
		expect(meta.achievement_id).toBe(TEST_ACH_ID);
		expect(meta.points).toBe(10); // flowed from achievements.metadata, not NEW.metadata
	});
});
