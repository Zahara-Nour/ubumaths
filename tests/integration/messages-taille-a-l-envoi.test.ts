/**
 * Chat : un message trop lourd ne part pas, même par l'API de la base (écart L124)
 * ===============================================================================
 *
 * Le chat écrit directement dans `messages` (src/lib/stores/chat.svelte.ts), sans
 * borne côté site, et la policy INSERT ne bornait rien : un message énorme
 * ralentissait le marquage (`process_message_content`) à l'envoi.
 *
 *   1. un message de plus de 200 000 caractères (JSON écrit par la base) envoyé
 *      par un élève est refusé, avec une erreur lisible ;
 *   2. un long message ordinaire (10 000 caractères mis en forme) part ;
 *   3. non-régression : un ancien message plus lourd, déjà en base (images
 *      rangées dans le message avant le stockage des pièces jointes), se supprime
 *      toujours ; le serveur garde la main.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '#lib/types/database.ts';

// Types
type Client = SupabaseClient<Database>;

// Constantes
const BORNE = 200_000;
const service = createServiceRoleClient();

// Helpers
/** Un document d'un paragraphe dont le JSON écrit par la base dépasse `longueur`. */
function docDePlusDe(longueur: number) {
	return {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a'.repeat(longueur) }] }]
	};
}

/** Un long message ordinaire : 10 000 caractères en gras, en 100 paragraphes. */
function longDocOrdinaire() {
	return {
		type: 'doc',
		content: Array.from({ length: 100 }, () => ({
			type: 'paragraph',
			content: [{ type: 'text', text: 'b'.repeat(100), marks: [{ type: 'bold' }] }]
		}))
	};
}

describe('Chat — taille d’un message à l’envoi', () => {
	let conversationId: string;
	let eleveId: string;
	let eleveClient: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		const eleve = await TestData.profile().withRole('student').create();
		eleveId = eleve.id;
		const classe = await TestData.class(teacher.id).create();
		const { error: membreError } = await service
			.from('class_members')
			.insert({ class_id: classe.id, student_id: eleve.id });
		if (membreError) throw new Error(`inscription impossible : ${membreError.message}`);
		const { data: conversation, error } = await service
			.from('conversations')
			.select('id')
			.eq('class_id', classe.id)
			.eq('is_group', true)
			.single();
		if (error || !conversation) throw new Error(`chat de classe introuvable : ${error?.message}`);
		conversationId = conversation.id;
		eleveClient = await createAuthenticatedClient(eleve.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('un message de plus de 200 000 caractères envoyé par l’élève est refusé', async () => {
		const id = crypto.randomUUID();
		const { error } = await eleveClient.from('messages').insert({
			id,
			conversation_id: conversationId,
			sender_id: eleveId,
			content: docDePlusDe(BORNE)
		});

		expect(error?.code).toBe('22001');
		expect(error?.message).toContain('message trop long');
		const { data } = await service.from('messages').select('id').eq('id', id);
		expect(data).toEqual([]);
	});

	it('un long message ordinaire part', async () => {
		const { error } = await eleveClient.from('messages').insert({
			conversation_id: conversationId,
			sender_id: eleveId,
			content: longDocOrdinaire()
		});

		expect(error).toBeNull();
	});

	it('un ancien message plus lourd, déjà en base, se supprime toujours', async () => {
		// Le serveur (service_role) garde la main : c'est ainsi que l'ancien message existe.
		const { data: ancien, error } = await service
			.from('messages')
			.insert({ conversation_id: conversationId, sender_id: eleveId, content: docDePlusDe(BORNE) })
			.select('id')
			.single();
		if (error || !ancien) throw new Error(`insertion impossible : ${error?.message}`);

		const { error: suppressionError } = await eleveClient.rpc('soft_delete_message', {
			p_message_id: ancien.id
		});

		expect(suppressionError).toBeNull();
		const { data } = await service
			.from('messages')
			.select('deleted_at')
			.eq('id', ancien.id)
			.single();
		expect(data?.deleted_at).not.toBeNull();
	});
});
