/**
 * Chat : une participation ne change pas de conversation (base locale requise)
 * ===========================================================================
 *
 * Écart T32, prouvé le 2026-11-25 sur la pile de test : la policy « Users can
 * update their own participation » de `conversation_participants` n'a pas de
 * liste de colonnes. Un élève pouvait donc, par l'API de la base, changer
 * `conversation_id` de sa propre participation : s'il connaissait l'identifiant
 * d'une conversation entre deux autres élèves, il en devenait participant et en
 * lisait les messages.
 *
 * Décision de David (2026-11-25) : personne ne change la conversation d'une
 * participation par l'API, ni l'élève, ni le prof, ni l'admin. Aucun écran ne
 * le propose. Le serveur (service_role, tâche système) garde la main.
 *
 * Ce que le fichier prouve :
 *   1. l'élève ne déplace pas sa participation vers une conversation qui n'est
 *      pas la sienne, et n'en lit toujours pas les messages ;
 *   2. le prof et l'admin ne déplacent pas la leur ;
 *   3. non-régression : l'élève règle toujours sa participation (archive,
 *      sourdine), marque toujours sa conversation comme lue ; renvoyer la même
 *      conversation dans la mise à jour passe ; le service déplace une
 *      participation.
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
type ParticipationUpdate = Database['public']['Tables']['conversation_participants']['Update'];

// ============================================================================
// CONSTANTES
// ============================================================================

const SECRET = 'message entre deux autres';

const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

function doc(text: string) {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
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

/** La participation d'un compte à une conversation, lue par le client service. */
async function participation(conversationId: string, userId: string) {
	const { data, error } = await service
		.from('conversation_participants')
		.select('id, conversation_id, is_archived, is_muted, last_read_at')
		.eq('conversation_id', conversationId)
		.eq('user_id', userId)
		.single();
	if (error || !data) throw new Error(`participation introuvable : ${error?.message}`);
	return data;
}

/** La participation telle qu'elle est en base, lue par son identifiant. */
async function enBase(participationId: string) {
	const { data, error } = await service
		.from('conversation_participants')
		.select('conversation_id, is_archived, is_muted')
		.eq('id', participationId)
		.single();
	if (error || !data) throw new Error(`lecture de la participation impossible : ${error?.message}`);
	return data;
}

/** Tentative de déplacement : doit être REFUSÉE par la base, pas ignorée par la RLS. */
async function deplacementRefuse(
	client: Client,
	participationId: string,
	vers: string
): Promise<void> {
	const avant = await enBase(participationId);
	const { data, error } = await client
		.from('conversation_participants')
		.update({ conversation_id: vers })
		.eq('id', participationId)
		.select('id');
	expect(data).toBeNull();
	expect(error?.code).toBe('42501');
	expect(error?.message).toContain('ne change pas de conversation');
	expect((await enBase(participationId)).conversation_id).toBe(avant.conversation_id);
}

/** UPDATE qui doit ATTEINDRE la ligne : sans erreur et une ligne rendue. */
async function modifier(
	client: Client,
	participationId: string,
	patch: ParticipationUpdate
): Promise<void> {
	const { data, error } = await client
		.from('conversation_participants')
		.update(patch)
		.eq('id', participationId)
		.select('id');
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
}

/** Textes des messages d'une conversation que ce client peut lire. */
async function messagesLus(client: Client, conversationId: string): Promise<string[]> {
	const { data, error } = await client
		.from('messages')
		.select('plain_text')
		.eq('conversation_id', conversationId);
	expect(error).toBeNull();
	return (data ?? []).map((ligne) => ligne.plain_text ?? '');
}

// ============================================================================
// TESTS
// ============================================================================

describe('Chat — une participation ne change pas de conversation', () => {
	let teacher: Profile;
	let admin: Profile;
	let eleve: Profile;
	let camarade: Profile;
	let autreA: Profile;
	let autreB: Profile;
	let entreEleves: string;
	let entreAutres: string;
	let profAdmin: string;
	let eleveClient: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
		eleve = await TestData.profile().withRole('student').create();
		camarade = await TestData.profile().withRole('student').create();
		autreA = await TestData.profile().withRole('student').create();
		autreB = await TestData.profile().withRole('student').create();

		entreEleves = await conversationPrivee(eleve.id, camarade.id);
		entreAutres = await conversationPrivee(autreA.id, autreB.id);
		profAdmin = await conversationPrivee(teacher.id, admin.id);

		const { error } = await service
			.from('messages')
			.insert({ conversation_id: entreAutres, sender_id: autreA.id, content: doc(SECRET) });
		if (error) throw new Error(`insertion du message impossible : ${error.message}`);

		eleveClient = await createAuthenticatedClient(eleve.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('l’élève', () => {
		it('n’entre pas dans une conversation entre deux autres élèves en déplaçant sa participation', async () => {
			const { id } = await participation(entreEleves, eleve.id);
			expect(await messagesLus(eleveClient, entreAutres)).toEqual([]);

			await deplacementRefuse(eleveClient, id, entreAutres);

			expect(await messagesLus(eleveClient, entreAutres)).toEqual([]);
		});

		it('ne déplace pas sa participation même en changeant autre chose en même temps', async () => {
			const { id } = await participation(entreEleves, eleve.id);

			const { data, error } = await eleveClient
				.from('conversation_participants')
				.update({ conversation_id: entreAutres, is_muted: true })
				.eq('id', id)
				.select('id');

			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
			expect(await enBase(id)).toMatchObject({ conversation_id: entreEleves, is_muted: false });
		});

		it('règle toujours sa participation (archive, sourdine)', async () => {
			const { id } = await participation(entreEleves, eleve.id);

			await modifier(eleveClient, id, { is_archived: true, is_muted: true });

			expect(await enBase(id)).toMatchObject({
				conversation_id: entreEleves,
				is_archived: true,
				is_muted: true
			});
		});

		it('règle sa participation en renvoyant la même conversation', async () => {
			const { id } = await participation(entreEleves, eleve.id);

			await modifier(eleveClient, id, { conversation_id: entreEleves, is_archived: false });

			expect(await enBase(id)).toMatchObject({ conversation_id: entreEleves, is_archived: false });
		});

		it('marque toujours sa conversation comme lue', async () => {
			const { error } = await eleveClient.rpc('mark_conversation_read', {
				p_conversation_id: entreEleves,
				p_user_id: eleve.id
			});

			expect(error).toBeNull();
			expect((await participation(entreEleves, eleve.id)).last_read_at).not.toBeNull();
		});
	});

	describe('le prof', () => {
		it('ne déplace pas sa participation', async () => {
			const teacherClient = await createAuthenticatedClient(teacher.email);
			const { id } = await participation(profAdmin, teacher.id);

			await deplacementRefuse(teacherClient, id, entreAutres);
		});
	});

	describe('l’admin', () => {
		it('ne déplace pas sa participation', async () => {
			const adminClient = await createAuthenticatedClient(admin.email);
			const { id } = await participation(profAdmin, admin.id);

			await deplacementRefuse(adminClient, id, entreAutres);
		});
	});

	describe('le serveur', () => {
		it('déplace une participation (tâche système, pas d’utilisateur connecté)', async () => {
			const { id } = await participation(entreEleves, camarade.id);

			const { data, error } = await service
				.from('conversation_participants')
				.update({ conversation_id: entreAutres })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect((await enBase(id)).conversation_id).toBe(entreAutres);
		});
	});
});
