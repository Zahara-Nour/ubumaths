/**
 * Option B — Messaging & Moderation unification — Integration Tests
 * =================================================================
 *
 * Mono-teacher (Option B): the sole teacher can message / moderate ANY
 * student, including students enrolled in NO class (hors-classe). The legacy
 * messaging RPCs scoped recipients & moderation by class membership
 * (`get_student_teachers` / `get_teacher_students`), which left hors-classe
 * students unreachable. These tests pin the Option B behaviour on the three
 * RPCs and MUST fail against the pre-migration (class-scoped) schema.
 *
 * Run `pnpm db:start` first, then `pnpm test:integration`.
 *
 * @module tests/integration/option-b-messaging
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Option B - Messaging & Moderation - Integration Tests', () => {
	let service: SupabaseClient<Database>;

	const setup = async () => {
		service = createServiceRoleClient();
		const teacher = await TestData.profile().withRole('teacher').create();
		// Student attached to NO class: invisible to the teacher under the old model.
		const outOfClassStudent = await TestData.profile().withRole('student').create();
		return { teacher, outOfClassStudent };
	};

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	// ========================================================================
	// get_allowed_recipients
	// ========================================================================

	it('get_allowed_recipients: a hors-classe student may message the sole teacher', async () => {
		const { teacher, outOfClassStudent } = await setup();

		const { data, error } = await service.rpc('get_allowed_recipients', {
			p_user_id: outOfClassStudent.id
		});

		expect(error).toBeNull();
		const ids = (data ?? []).map((r) => r.user_id);
		expect(ids).toContain(teacher.id);
	});

	it('get_allowed_recipients: the teacher sees a hors-classe student as recipient', async () => {
		const { teacher, outOfClassStudent } = await setup();

		const { data, error } = await service.rpc('get_allowed_recipients', {
			p_user_id: teacher.id
		});

		expect(error).toBeNull();
		const ids = (data ?? []).map((r) => r.user_id);
		expect(ids).toContain(outOfClassStudent.id);
	});

	// ========================================================================
	// validate_message_recipients
	// ========================================================================

	it('validate_message_recipients: hors-classe student -> teacher is allowed', async () => {
		const { teacher, outOfClassStudent } = await setup();

		const { data, error } = await service.rpc('validate_message_recipients', {
			sender_uuid: outOfClassStudent.id,
			recipient_uuids: [teacher.id]
		});

		expect(error).toBeNull();
		expect(data).toBe(true);
	});

	it('validate_message_recipients: teacher -> hors-classe student is allowed', async () => {
		const { teacher, outOfClassStudent } = await setup();

		const { data, error } = await service.rpc('validate_message_recipients', {
			sender_uuid: teacher.id,
			recipient_uuids: [outOfClassStudent.id]
		});

		expect(error).toBeNull();
		expect(data).toBe(true);
	});

	it('validate_message_recipients: student -> another student stays forbidden', async () => {
		await setup();
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();

		const { data, error } = await service.rpc('validate_message_recipients', {
			sender_uuid: studentA.id,
			recipient_uuids: [studentB.id]
		});

		expect(error).toBeNull();
		expect(data).toBe(false);
	});

	// ========================================================================
	// can_moderate_message
	// ========================================================================

	it('can_moderate_message: teacher can moderate a hors-classe student message', async () => {
		const { teacher, outOfClassStudent } = await setup();
		const message = await TestData.privateMessage(outOfClassStudent.id).create();

		const { data, error } = await service.rpc('can_moderate_message', {
			moderator_uuid: teacher.id,
			message_uuid: message.id
		});

		expect(error).toBeNull();
		expect(data).toBe(true);
	});

	it('can_moderate_message: a student cannot moderate', async () => {
		const { outOfClassStudent } = await setup();
		const otherStudent = await TestData.profile().withRole('student').create();
		const message = await TestData.privateMessage(otherStudent.id).create();

		const { data, error } = await service.rpc('can_moderate_message', {
			moderator_uuid: outOfClassStudent.id,
			message_uuid: message.id
		});

		expect(error).toBeNull();
		expect(data).toBe(false);
	});
});
