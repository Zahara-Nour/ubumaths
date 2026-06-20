/**
 * VIP Card draw — global-flag-only — Integration Tests
 * ====================================================
 *
 * After dropping the teacher-override layer (migration 20260620140000), a VIP
 * card is drawable based ONLY on its global flag `vip_card_templates.is_enabled`.
 * The `teacher_vip_card_overrides` table no longer exists, and the draw RPC no
 * longer consults it.
 *
 * These tests assert the new contract:
 *   - the override table is gone;
 *   - a globally-disabled card never appears in draws;
 *   - globally-enabled cards do appear.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * @module tests/integration/vip-card-draw-global-flag
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('VIP Card draw - global flag only - Integration Tests', () => {
	let service: SupabaseClient<Database>;
	// These tests mutate the GLOBAL card state; snapshot + restore so sibling
	// VIP-card suites keep the seeded defaults.
	let originalCardStates: { id: string; is_enabled: boolean | null }[] = [];

	beforeAll(async () => {
		service = createServiceRoleClient();
		const { data: templates } = await service.from('vip_card_templates').select('id, is_enabled');
		originalCardStates = (templates ?? []).map((t) => ({ id: t.id, is_enabled: t.is_enabled }));
	});

	afterAll(async () => {
		for (const c of originalCardStates) {
			await service.from('vip_card_templates').update({ is_enabled: c.is_enabled }).eq('id', c.id);
		}
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
		// Enable everything, then disable only `candy` globally.
		await service.from('vip_card_templates').update({ is_enabled: true }).neq('id', 'dummy');
		await service.from('vip_card_templates').update({ is_enabled: false }).eq('id', 'candy');
	});

	async function drawAndCollect(
		studentClient: SupabaseClient<Database>,
		studentId: string,
		total: number
	): Promise<string[]> {
		// The RPC caps p_count at 10, so draw in batches of 10.
		const ids: string[] = [];
		const batch = 10;
		for (let drawn = 0; drawn < total; drawn += batch) {
			const count = Math.min(batch, total - drawn);
			const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
				p_student_id: studentId,
				p_count: count,
				p_payment_method: 'gidouilles',
				p_gidouilles_cost: count,
				p_vip_card_instance_id: undefined
			});
			expect(error).toBeNull();
			const parsed = typeof data === 'string' ? JSON.parse(data) : data;
			ids.push(...(parsed.cards as { cardId: string }[]).map((c) => c.cardId));
		}
		return ids;
	}

	it('the teacher_vip_card_overrides table no longer exists', async () => {
		const { error } = await service.from('teacher_vip_card_overrides').select('id').limit(1);
		// relation "teacher_vip_card_overrides" does not exist
		expect(error).not.toBeNull();
		expect(`${error?.message} ${error?.code}`).toMatch(
			/does not exist|42P01|PGRST205|schema cache/i
		);
	});

	it('a globally-disabled card (candy) is never drawn; globally-enabled cards are', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').withGidouilles(200).create();
		const cls = await TestData.class().withName('Class A').create();
		await service
			.from('class_members')
			.insert({ class_id: cls.id, student_id: student.id, status: 'active' });
		// keep `teacher` referenced (single-teacher invariant needs the account to exist)
		expect(teacher.id).toBeTruthy();

		const studentClient = await createAuthenticatedClient(student.email);
		const drawn = await drawAndCollect(studentClient, student.id, 100);

		expect(drawn).toHaveLength(100);
		// candy is globally disabled → never drawn
		expect(drawn.filter((id) => id === 'candy')).toHaveLength(0);
		// every drawn card is one that is globally enabled
		const { data: enabled } = await service
			.from('vip_card_templates')
			.select('id')
			.eq('is_enabled', true);
		const enabledIds = new Set((enabled ?? []).map((c) => c.id));
		expect(drawn.every((id) => enabledIds.has(id))).toBe(true);
	}, 60000);
});
