/**
 * Boîte de réception : une ligne ne se détourne pas vers un autre message (needs a running DB)
 * ===========================================================================================
 * La policy UPDATE « Users can update their inbox entries » n'avait pas de liste de
 * colonnes : un élève pouvait remplacer `message_id` de sa propre ligne par
 * l'identifiant du message privé d'un autre, et la policy SELECT de
 * `private_messages` (qui passe par `message_inbox`) lui en ouvrait la lecture.
 * Décision de David (2026-10-13) : le destinataire ne change que ses marques
 * (lu, étoile, dossier, statut, supprimé). En direct : « lu » et « supprimé » ; le
 * reste passe par des fonctions qui vérifient le propriétaire du dossier.
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

describe('Boîte de réception — une ligne ne se détourne pas', () => {
	let curious: Profile;
	let otherSender: Profile;
	let otherRecipient: Profile;
	let ownMessageId: string;
	let foreignMessageId: string;

	/** Message de `sender` déposé dans la boîte de `recipient`. */
	async function sendMessage(sender: Profile, recipient: Profile, text: string) {
		const svc = createServiceRoleClient();
		const { data } = await svc
			.from('private_messages')
			.insert({
				sender_id: sender.id,
				subject: text,
				content: CONTENT,
				plain_text: text,
				recipient_count: 1
			})
			.select('id')
			.single();
		await svc.from('message_inbox').insert({ message_id: data!.id, recipient_id: recipient.id });
		return data!.id;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		curious = await TestData.profile().withRole('student').create();
		otherSender = await TestData.profile().withRole('student').create();
		otherRecipient = await TestData.profile().withRole('student').create();
		ownMessageId = await sendMessage(otherSender, curious, 'pour toi');
		foreignMessageId = await sendMessage(otherSender, otherRecipient, 'conversation privée');
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('le destinataire ne peut pas faire pointer sa ligne vers le message d’un autre', async () => {
		const client = await createAuthenticatedClient(curious.email);
		const { error } = await client
			.from('message_inbox')
			.update({ message_id: foreignMessageId })
			.eq('message_id', ownMessageId)
			.eq('recipient_id', curious.id)
			.select('id');

		expect(error?.code).toBe('42501');
		const { data: leaked } = await client
			.from('private_messages')
			.select('id')
			.eq('id', foreignMessageId);
		expect(leaked).toEqual([]);
	});

	it('le destinataire peut encore poser ses marques sur sa ligne', async () => {
		const client = await createAuthenticatedClient(curious.email);
		const { data, error } = await client
			.from('message_inbox')
			.update({ read_at: new Date().toISOString(), deleted: true })
			.eq('message_id', ownMessageId)
			.eq('recipient_id', curious.id)
			.select('id');

		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});
});
