/**
 * Messages privés : un message envoyé ne se réécrit plus (needs a running DB)
 * ==========================================================================
 * La policy UPDATE « Senders can edit their messages » n'avait pas de liste de
 * colonnes : l'expéditeur pouvait réécrire le sujet ou le texte d'un message déjà
 * lu par son destinataire. Décision de David (2026-10-13) : personne ne modifie un
 * message envoyé. Seul reste le geste « supprimer de mes envoyés »
 * (`deleted_by_sender`), utilisé par `DELETE /api/messages/[id]`.
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

type Profile = Database['public']['Tables']['profiles']['Row'];

const CONTENT = { type: 'doc', content: [] };

describe('Messages privés — un message envoyé ne se réécrit plus', () => {
	let sender: Profile;
	let recipient: Profile;
	let messageId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const svc = createServiceRoleClient();
		sender = await TestData.profile().withRole('student').create();
		recipient = await TestData.profile().withRole('student').create();

		const { data: message } = await svc
			.from('private_messages')
			.insert({
				sender_id: sender.id,
				subject: 'Sujet d’origine',
				content: CONTENT,
				plain_text: 'texte d’origine',
				recipient_count: 1
			})
			.select('id')
			.single();
		messageId = message!.id;
		await svc.from('message_inbox').insert({ message_id: messageId, recipient_id: recipient.id });
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	/** Le message tel qu'il est en base, lu par le client service. */
	async function storedMessage() {
		const { data } = await createServiceRoleClient()
			.from('private_messages')
			.select('subject, plain_text, deleted_by_sender')
			.eq('id', messageId)
			.single();
		return data;
	}

	it('l’expéditeur ne peut pas réécrire le sujet ni le texte', async () => {
		const client = await createAuthenticatedClient(sender.email);
		const { error } = await client
			.from('private_messages')
			.update({ subject: 'Sujet réécrit', plain_text: 'texte réécrit' })
			.eq('id', messageId)
			.select('id');

		expect(error?.code).toBe('42501');
		expect(await storedMessage()).toMatchObject({
			subject: 'Sujet d’origine',
			plain_text: 'texte d’origine'
		});
	});

	it('le destinataire ne peut pas réécrire le message', async () => {
		const client = await createAuthenticatedClient(recipient.email);
		const { error } = await client
			.from('private_messages')
			.update({ subject: 'Sujet réécrit' })
			.eq('id', messageId)
			.select('id');

		expect(error?.code).toBe('42501');
		expect(await storedMessage()).toMatchObject({ subject: 'Sujet d’origine' });
	});

	it('l’expéditeur peut encore retirer le message de ses envoyés', async () => {
		const client = await createAuthenticatedClient(sender.email);
		const { data, error } = await client
			.from('private_messages')
			.update({ deleted_by_sender: true })
			.eq('id', messageId)
			.select('id');

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await storedMessage()).toMatchObject({ deleted_by_sender: true });
	});
});
