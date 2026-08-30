/**
 * Security — message thread visibility (needs a running DB)
 * =========================================================
 * Vague-1 finding H12 (docs/wip/security-audit-2026-08.md).
 *
 * A group message root goes to A and B; A replies privately to the sender O.
 * B (a recipient of the root) must NOT see A's private reply — get_message_thread
 * now filters returned rows to messages the caller sent or received.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const CONTENT = { type: 'doc', content: [] };

describe('Security — message thread visibility (H12)', () => {
	let owner: Database['public']['Tables']['profiles']['Row'];
	let studentA: Database['public']['Tables']['profiles']['Row'];
	let studentB: Database['public']['Tables']['profiles']['Row'];
	let rootId: string;
	let replyId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const svc = createServiceRoleClient();
		owner = await TestData.profile().withRole('student').create();
		studentA = await TestData.profile().withRole('student').create();
		studentB = await TestData.profile().withRole('student').create();

		// Root group message from owner → A, B.
		const { data: root } = await svc
			.from('private_messages')
			.insert({
				sender_id: owner.id,
				subject: 'Group',
				content: CONTENT,
				plain_text: 'group',
				is_group_message: true,
				recipient_count: 2
			})
			.select('id')
			.single();
		rootId = root!.id;
		await svc.from('message_inbox').insert([
			{ message_id: rootId, recipient_id: studentA.id },
			{ message_id: rootId, recipient_id: studentB.id }
		]);

		// A replies privately to owner only (B is NOT a recipient).
		const { data: reply } = await svc
			.from('private_messages')
			.insert({
				sender_id: studentA.id,
				subject: 'Re: Group',
				content: CONTENT,
				plain_text: 'private reply',
				parent_message_id: rootId,
				thread_root_id: rootId,
				recipient_count: 1
			})
			.select('id')
			.single();
		replyId = reply!.id;
		await svc.from('message_inbox').insert({ message_id: replyId, recipient_id: owner.id });
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('B (root recipient) does NOT see A private reply', async () => {
		expect.assertions(2);
		const clientB = await createAuthenticatedClient(studentB.email);
		const { data } = await clientB.rpc('get_message_thread', {
			p_thread_root_id: rootId,
			p_user_id: studentB.id
		});
		const ids = (data ?? []).map((r: { message_id: string }) => r.message_id);
		expect(ids).toContain(rootId);
		expect(ids).not.toContain(replyId);
	});

	it('owner (sender of root, recipient of reply) sees the whole thread', async () => {
		expect.assertions(2);
		const clientO = await createAuthenticatedClient(owner.email);
		const { data } = await clientO.rpc('get_message_thread', {
			p_thread_root_id: rootId,
			p_user_id: owner.id
		});
		const ids = (data ?? []).map((r: { message_id: string }) => r.message_id);
		expect(ids).toContain(rootId);
		expect(ids).toContain(replyId);
	});
});
