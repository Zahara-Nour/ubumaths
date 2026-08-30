/**
 * Security — chat attachment signed URLs (needs a running DB + storage)
 * =====================================================================
 * Finding M1: chat-attachments is now a PRIVATE bucket. Access is via a signed
 * URL, gated by the storage.objects policy "Users can view chat attachments in
 * their conversations" (path prefix = conversation_id → participant check).
 * A participant can mint a signed URL; a non-participant cannot.
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
import { getPostgresClient } from '../helpers/database/postgres-client';

const BUCKET = 'chat-attachments';
const TEST_POLICY = 'test_chat_attach_select_m1';

describe('Security — chat attachment signing (M1)', () => {
	let studentAEmail: string;
	let studentBEmail: string;
	let convId: string;
	let objectPath: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const svc = createServiceRoleClient();
		// Buckets AND their storage.objects policies are dashboard state (not in the
		// schema dump), so we recreate both locally to mirror prod: a private bucket +
		// the "participants can read" SELECT policy that gates the signed URL.
		await svc.storage.createBucket(BUCKET, { public: false }).catch(() => {});
		const pg = await getPostgresClient();
		await pg.query(`DROP POLICY IF EXISTS "${TEST_POLICY}" ON storage.objects`);
		await pg.query(
			`CREATE POLICY "${TEST_POLICY}" ON storage.objects FOR SELECT TO authenticated
			 USING (bucket_id = '${BUCKET}' AND EXISTS (
			   SELECT 1 FROM public.conversation_participants cp
			   WHERE cp.user_id = auth.uid()
			     AND cp.conversation_id = ((string_to_array(name, '/'))[1])::uuid))`
		);
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		studentAEmail = studentA.email;
		studentBEmail = studentB.email;

		const { data: conv } = await svc
			.from('conversations')
			.insert({ is_group: false })
			.select('id')
			.single();
		convId = conv!.id;
		await svc
			.from('conversation_participants')
			.insert({ conversation_id: convId, user_id: studentA.id });

		objectPath = `${convId}/msg1/test.txt`;
		const up = await svc.storage
			.from(BUCKET)
			.upload(objectPath, new Uint8Array([116, 101, 115, 116]), {
				upsert: true,
				contentType: 'text/plain'
			});
		if (up.error) throw new Error(`upload failed: ${up.error.message}`);
		// Sanity: service role (RLS-bypass) must be able to sign — proves the object exists.
		const svcSign = await svc.storage.from(BUCKET).createSignedUrl(objectPath, 60);
		if (svcSign.error)
			throw new Error(`svc sign failed (object missing?): ${svcSign.error.message}`);
	});

	afterAll(async () => {
		const svc = createServiceRoleClient();
		await svc.storage.from(BUCKET).remove([objectPath]);
		await svc.from('conversation_participants').delete().eq('conversation_id', convId);
		await svc.from('conversations').delete().eq('id', convId);
		const pg = await getPostgresClient();
		await pg.query(`DROP POLICY IF EXISTS "${TEST_POLICY}" ON storage.objects`);
		await cleanupAllTestData();
	});

	it('a participant can mint a signed URL, a non-participant cannot', async () => {
		expect.assertions(3);

		const clientA = await createAuthenticatedClient(studentAEmail);
		const a = await clientA.storage.from(BUCKET).createSignedUrl(objectPath, 60);
		expect(a.error).toBeNull();
		expect(a.data?.signedUrl).toBeTruthy();

		const clientB = await createAuthenticatedClient(studentBEmail);
		const b = await clientB.storage.from(BUCKET).createSignedUrl(objectPath, 60);
		expect(b.data?.signedUrl).toBeFalsy(); // non-participant: no signed URL
	});
});
