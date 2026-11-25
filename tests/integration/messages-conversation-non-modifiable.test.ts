/**
 * Chat : un message ne change pas de conversation (base locale requise)
 * ====================================================================
 *
 * Écart T31, constat du `security-auditor` sur #3132 (2026-11-25) : les policies
 * UPDATE de `messages` n'ont pas de liste de colonnes. Un élève pouvait donc, par
 * l'API de la base, changer `conversation_id` de son propre message : un message
 * marqué d'une conversation à deux entre élèves, déplacé vers une conversation
 * avec un adulte, gardait sa marque mais sortait de l'onglet « Messages marqués »
 * du prof. Il pouvait aussi glisser un message dans une conversation où il n'a
 * pas été écrit.
 *
 * Décision de David (2026-11-25) : personne ne déplace un message par l'API, ni
 * l'élève, ni le prof, ni l'admin. Aucun écran ne le propose. Le serveur
 * (service_role, tâche système) garde la main.
 *
 * Ce que le fichier prouve :
 *   1. l'élève ne déplace pas son message, marqué ou non ; le message marqué
 *      reste rendu au prof par `get_flagged_messages_for_teacher` ;
 *   2. le prof ne déplace pas un message du chat de sa classe, l'admin ne
 *      déplace pas le sien ;
 *   3. non-régression : l'élève modifie toujours le contenu de son message ;
 *      renvoyer la même conversation dans la mise à jour passe ; le service
 *      déplace un message.
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
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '#lib/types/database.ts';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;
type Profile = Database['public']['Tables']['profiles']['Row'];
type MessageUpdate = Database['public']['Tables']['messages']['Update'];

// ============================================================================
// CONSTANTES
// ============================================================================

const INSULTE = 'ta gueule';
const PROPRE = 'bonjour tout le monde';

const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

function doc(text: string) {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

/** Insère un message avec le client service ; rend son identifiant. */
async function envoyer(conversationId: string, senderId: string, text: string): Promise<string> {
	const { data, error } = await service
		.from('messages')
		.insert({ conversation_id: conversationId, sender_id: senderId, content: doc(text) })
		.select('id')
		.single();
	if (error || !data) throw new Error(`insertion du message impossible : ${error?.message}`);
	return data.id;
}

/** Le message tel qu'il est en base, lu par le client service. */
async function enBase(messageId: string) {
	const { data, error } = await service
		.from('messages')
		.select('conversation_id, plain_text, is_flagged')
		.eq('id', messageId)
		.single();
	if (error || !data) throw new Error(`lecture du message impossible : ${error?.message}`);
	return data;
}

/** Conversation privée (non groupe) entre deux comptes ; rend son identifiant. */
async function conversationPrivee(a: string, b: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into conversations (name, is_group, created_by) values ('zz-prive', false, $1)
		 returning id`,
		[a]
	);
	await pg.query(
		`insert into conversation_participants (conversation_id, user_id) values ($1, $2), ($1, $3)`,
		[rows[0].id, a, b]
	);
	return rows[0].id;
}

/** Tentative de déplacement : doit être REFUSÉE par la base, pas ignorée par la RLS. */
async function deplacementRefuse(client: Client, messageId: string, vers: string): Promise<void> {
	const avant = await enBase(messageId);
	const { data, error } = await client
		.from('messages')
		.update({ conversation_id: vers })
		.eq('id', messageId)
		.select('id');
	expect(data).toBeNull();
	expect(error?.code).toBe('42501');
	expect(error?.message).toContain('ne change pas de conversation');
	expect((await enBase(messageId)).conversation_id).toBe(avant.conversation_id);
}

/** UPDATE qui doit ATTEINDRE la ligne : sans erreur et une ligne rendue. */
async function modifier(client: Client, messageId: string, patch: MessageUpdate): Promise<void> {
	const { data, error } = await client
		.from('messages')
		.update(patch)
		.eq('id', messageId)
		.select('id');
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
}

/** Identifiants des messages marqués rendus au prof. */
async function marquesDuProf(teacherClient: Client): Promise<string[]> {
	const { data, error } = await teacherClient.rpc('get_flagged_messages_for_teacher', {
		p_limit: 200
	});
	expect(error).toBeNull();
	return (data ?? []).map((ligne) => ligne.id);
}

// ============================================================================
// TESTS
// ============================================================================

describe('Chat — un message ne change pas de conversation', () => {
	let teacher: Profile;
	let admin: Profile;
	let eleve: Profile;
	let camarade: Profile;
	let classeConversationId: string;
	let entreEleves: string;
	let avecAdmin: string;
	let eleveClient: Client;
	let teacherClient: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
		eleve = await TestData.profile().withRole('student').create();
		camarade = await TestData.profile().withRole('student').create();

		const classe = await TestData.class(teacher.id).create();
		const { error: membresError } = await service.from('class_members').insert([
			{ class_id: classe.id, student_id: eleve.id },
			{ class_id: classe.id, student_id: camarade.id }
		]);
		if (membresError) throw new Error(`inscription impossible : ${membresError.message}`);

		const { data: conversation, error } = await service
			.from('conversations')
			.select('id')
			.eq('class_id', classe.id)
			.eq('is_group', true)
			.single();
		if (error || !conversation) throw new Error(`chat de classe introuvable : ${error?.message}`);
		classeConversationId = conversation.id;

		entreEleves = await conversationPrivee(eleve.id, camarade.id);
		avecAdmin = await conversationPrivee(eleve.id, admin.id);

		eleveClient = await createAuthenticatedClient(eleve.email);
		teacherClient = await createAuthenticatedClient(teacher.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('l’élève', () => {
		it('ne sort pas son message marqué de l’onglet du prof en le déplaçant', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);
			expect(await marquesDuProf(teacherClient)).toContain(id);

			await deplacementRefuse(eleveClient, id, avecAdmin);

			expect(await marquesDuProf(teacherClient)).toContain(id);
		});

		it('ne glisse pas un message non marqué dans une autre de ses conversations', async () => {
			const id = await envoyer(entreEleves, eleve.id, PROPRE);

			await deplacementRefuse(eleveClient, id, classeConversationId);
		});

		it('ne déplace pas son message même en changeant autre chose en même temps', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			const { data, error } = await eleveClient
				.from('messages')
				.update({ conversation_id: avecAdmin, content: doc(PROPRE) })
				.eq('id', id)
				.select('id');

			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
			expect(await enBase(id)).toMatchObject({
				conversation_id: entreEleves,
				plain_text: INSULTE,
				is_flagged: true
			});
		});

		it('modifie toujours le contenu de son message', async () => {
			const id = await envoyer(entreEleves, eleve.id, PROPRE);

			await modifier(eleveClient, id, { content: doc('bonsoir') });

			expect(await enBase(id)).toMatchObject({
				conversation_id: entreEleves,
				plain_text: 'bonsoir'
			});
		});

		it('modifie son message en renvoyant la même conversation', async () => {
			const id = await envoyer(entreEleves, eleve.id, PROPRE);

			await modifier(eleveClient, id, { conversation_id: entreEleves, content: doc('bonsoir') });

			expect(await enBase(id)).toMatchObject({
				conversation_id: entreEleves,
				plain_text: 'bonsoir'
			});
		});
	});

	describe('le prof', () => {
		it('ne déplace pas un message du chat de sa classe', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			await deplacementRefuse(teacherClient, id, entreEleves);
		});
	});

	describe('l’admin', () => {
		it('ne déplace pas son propre message', async () => {
			const adminClient = await createAuthenticatedClient(admin.email);
			const id = await envoyer(avecAdmin, admin.id, PROPRE);

			await deplacementRefuse(adminClient, id, entreEleves);
		});
	});

	describe('le serveur', () => {
		it('déplace un message (tâche système, pas d’utilisateur connecté)', async () => {
			const id = await envoyer(entreEleves, eleve.id, PROPRE);

			const { data, error } = await service
				.from('messages')
				.update({ conversation_id: classeConversationId })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect((await enBase(id)).conversation_id).toBe(classeConversationId);
		});
	});
});
