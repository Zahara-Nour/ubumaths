/**
 * Modération : ce que le prof lit dans l'onglet « Messages marqués » (base locale requise)
 * =====================================================================================
 *
 * Écart T21. Avant la fonction `get_flagged_messages_for_teacher`, la page lisait
 * `messages` avec le client du prof : la RLS ne lui rendait aucun message d'une
 * conversation à deux entre élèves (tous les messages de la prod), ni aucun message
 * supprimé.
 *
 * Décisions de David (2026-11-25) :
 *   a. le prof lit les messages MARQUÉS des conversations à deux entre élèves, ce
 *      message-là et son auteur, pas le reste de la conversation ;
 *   b. l'onglet montre aussi les messages marqués supprimés, texte compris ;
 *   c. élèves hors-classe compris ;
 *   d. rien ne change pour l'admin ni pour les élèves.
 *
 * Ce que le fichier prouve :
 *   1. le prof reçoit le message marqué d'une conversation à deux entre élèves, en
 *      classe comme hors-classe, avec le nom de l'auteur ;
 *   2. il ne reçoit PAS le message non marqué de la même conversation ;
 *   3. il reçoit les messages marqués supprimés, texte compris, et la fonction dit
 *      si la suppression vient de la modération ;
 *   4. il garde les messages marqués du chat de sa classe ;
 *   5. il ne reçoit pas le message marqué d'une conversation à deux où l'un des
 *      deux n'est pas un élève (admin et élève) ;
 *   6. un élève, l'admin et un visiteur non connecté sont refusés ;
 *   7. la lecture directe de `messages` par le prof n'a pas changé (la RLS n'est
 *      pas ouverte : seule la fonction rend ces messages).
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
		.select('id, is_flagged')
		.single();
	if (error || !data) throw new Error(`insertion du message impossible : ${error?.message}`);
	// Le décor doit être celui annoncé : marqué si insulte, non marqué sinon.
	expect(data.is_flagged).toBe(text === INSULTE);
	return data.id;
}

/** Suppression (datée) d'un message, comme le fait la route de modération. */
async function supprimer(messageId: string): Promise<void> {
	const { data, error } = await service
		.from('messages')
		.update({ deleted_at: new Date().toISOString() })
		.eq('id', messageId)
		.select('id');
	if (error || data?.length !== 1) throw new Error(`suppression impossible : ${error?.message}`);
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

/** Les messages marqués rendus au compte, par la fonction de l'onglet. */
async function marquesPour(client: Client) {
	const { data, error } = await client.rpc('get_flagged_messages_for_teacher', { p_limit: 200 });
	expect(error).toBeNull();
	return data ?? [];
}

// ============================================================================
// TESTS
// ============================================================================

describe('Modération — messages marqués lus par le prof (écart T21)', () => {
	let teacher: Profile;
	let admin: Profile;
	let eleve: Profile;
	let camarade: Profile;
	let horsClasseA: Profile;
	let horsClasseB: Profile;
	let classeConversationId: string;
	let priveEnClasse: string;
	let priveHorsClasse: string;
	let teacherClient: Client;
	let adminClient: Client;
	let eleveClient: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
		eleve = await TestData.profile().withRole('student').create();
		camarade = await TestData.profile().withRole('student').create();
		horsClasseA = await TestData.profile().withRole('student').create();
		horsClasseB = await TestData.profile().withRole('student').create();

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

		priveEnClasse = await conversationPrivee(eleve.id, camarade.id);
		priveHorsClasse = await conversationPrivee(horsClasseA.id, horsClasseB.id);

		teacherClient = await createAuthenticatedClient(teacher.email);
		adminClient = await createAuthenticatedClient(admin.email);
		eleveClient = await createAuthenticatedClient(eleve.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('conversations à deux entre élèves', () => {
		it('rend le message marqué, en classe comme hors-classe, avec son auteur', async () => {
			const enClasse = await envoyer(priveEnClasse, eleve.id, INSULTE);
			const horsClasse = await envoyer(priveHorsClasse, horsClasseA.id, INSULTE);

			const lignes = await marquesPour(teacherClient);

			const ligneEnClasse = lignes.find((l) => l.id === enClasse);
			expect(ligneEnClasse).toMatchObject({
				plain_text: INSULTE,
				is_group: false,
				deleted_at: null,
				deleted_by_moderation: false,
				sender_firstname: eleve.firstname,
				sender_lastname: eleve.lastname
			});
			const ligneHorsClasse = lignes.find((l) => l.id === horsClasse);
			expect(ligneHorsClasse).toMatchObject({
				plain_text: INSULTE,
				sender_firstname: horsClasseA.firstname,
				sender_lastname: horsClasseA.lastname
			});
		});

		it('ne rend pas le reste de la conversation (message non marqué)', async () => {
			const marque = await envoyer(priveEnClasse, eleve.id, INSULTE);
			const reponse = await envoyer(priveEnClasse, camarade.id, PROPRE);

			const ids = (await marquesPour(teacherClient)).map((l) => l.id);

			expect(ids).toContain(marque);
			expect(ids).not.toContain(reponse);
		});

		it('ne rend pas le message marqué quand l’un des deux n’est pas un élève', async () => {
			const avecAdmin = await envoyer(
				await conversationPrivee(admin.id, eleve.id),
				eleve.id,
				INSULTE
			);

			const ids = (await marquesPour(teacherClient)).map((l) => l.id);

			expect(ids).not.toContain(avecAdmin);
		});
	});

	describe('messages marqués supprimés', () => {
		it('rend le message supprimé d’une conversation à deux, texte compris', async () => {
			const id = await envoyer(priveEnClasse, eleve.id, INSULTE);
			await supprimer(id);

			const ligne = (await marquesPour(teacherClient)).find((l) => l.id === id);

			expect(ligne).toMatchObject({ plain_text: INSULTE, deleted_by_moderation: false });
			expect(ligne?.deleted_at).not.toBeNull();
		});

		it('rend le message supprimé du chat de classe', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);
			await supprimer(id);

			const ligne = (await marquesPour(teacherClient)).find((l) => l.id === id);

			expect(ligne).toMatchObject({ plain_text: INSULTE, is_group: true });
			expect(ligne?.deleted_at).not.toBeNull();
		});

		it('dit quand la suppression vient de la modération', async () => {
			const id = await envoyer(priveEnClasse, eleve.id, INSULTE);
			await supprimer(id);
			const { error } = await teacherClient.rpc('log_moderation_action', {
				p_action: 'delete_message',
				p_target_type: 'message',
				p_target_id: id,
				p_reason: 'insulte entre élèves'
			});
			expect(error).toBeNull();

			const ligne = (await marquesPour(teacherClient)).find((l) => l.id === id);

			expect(ligne).toMatchObject({ deleted_by_moderation: true });
		});
	});

	describe('ce qui ne change pas', () => {
		it('le prof garde le message marqué du chat de sa classe', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			const ligne = (await marquesPour(teacherClient)).find((l) => l.id === id);

			expect(ligne).toMatchObject({ plain_text: INSULTE, is_group: true, deleted_at: null });
		});

		it('les plus récents d’abord, dans la limite demandée', async () => {
			await envoyer(priveEnClasse, eleve.id, INSULTE);
			const dernier = await envoyer(priveEnClasse, eleve.id, INSULTE);

			const { data, error } = await teacherClient.rpc('get_flagged_messages_for_teacher', {
				p_limit: 1
			});

			expect(error).toBeNull();
			expect((data ?? []).map((l) => l.id)).toEqual([dernier]);
		});

		it('la lecture directe de `messages` par le prof reste fermée', async () => {
			const prive = await envoyer(priveEnClasse, eleve.id, INSULTE);
			const supprime = await envoyer(classeConversationId, eleve.id, INSULTE);
			await supprimer(supprime);

			const { data, error } = await teacherClient
				.from('messages')
				.select('id')
				.in('id', [prive, supprime]);

			expect(error).toBeNull();
			expect(data).toEqual([]);
		});
	});

	describe('qui est refusé', () => {
		it('un élève, même auteur d’un message marqué', async () => {
			await envoyer(priveEnClasse, eleve.id, INSULTE);

			const { data, error } = await eleveClient.rpc('get_flagged_messages_for_teacher', {
				p_limit: 200
			});

			expect(error?.code).toBe('42501');
			expect(data).toBeNull();
		});

		it('l’admin (ses accès ne changent pas : il garde la lecture par la RLS)', async () => {
			const { data, error } = await adminClient.rpc('get_flagged_messages_for_teacher', {
				p_limit: 200
			});

			expect(error?.code).toBe('42501');
			expect(data).toBeNull();
		});

		it('un visiteur non connecté (rôle anon : pas le droit d’exécuter)', async () => {
			const pg = await getPostgresClient();
			await pg.query('begin');
			try {
				await pg.query('set local role anon');
				await expect(
					pg.query('select * from public.get_flagged_messages_for_teacher(10)')
				).rejects.toMatchObject({ code: '42501' });
			} finally {
				await pg.query('rollback');
			}
		});
	});
});
