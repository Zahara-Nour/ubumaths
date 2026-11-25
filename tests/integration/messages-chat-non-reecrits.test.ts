/**
 * Chat : un message envoyé ne se réécrit pas (base locale requise)
 * ===============================================================
 *
 * Écart T33, constat du `security-auditor` sur #3140 (2026-11-25) : les policies
 * UPDATE de `messages` n'ont pas de liste de colonnes. Un élève pouvait, par
 * l'API de la base, remplacer par un texte propre le contenu de son message
 * marqué : la marque restait, mais l'onglet « Messages marqués » du prof montrait
 * le texte propre, et l'ancien texte n'était gardé nulle part.
 *
 * Décision de David (2026-11-25) : un message de chat envoyé ne se réécrit plus,
 * comme un message privé. Aucun compte connecté (élève, prof, admin) ne change
 * son texte, sa date ni son auteur. L'application n'a jamais eu de bouton
 * « modifier ». Restent possibles : supprimer, signaler, et pour le prof ou
 * l'admin poser ou retirer la marque. Le serveur garde la main.
 *
 * Ce que le fichier prouve :
 *   1. l'élève ne réécrit ni le contenu, ni le texte lu par le prof, ni la date
 *      d'envoi (écart T30), ni la date de modification de son message ; le refus
 *      est une erreur, pas un silence, et l'onglet du prof garde le texte d'origine ;
 *   2. le prof ne réécrit pas le message d'un élève du chat de sa classe et n'en
 *      change pas l'auteur ; l'admin ne réécrit pas son propre message ;
 *   3. non-régression : supprimer (`soft_delete_message`), signaler
 *      (`report_message`), retirer la marque (prof) passent toujours ; renvoyer le
 *      même contenu n'est pas une réécriture ; un signalement posé ne se retire
 *      pas (reste de l'écart T30) ;
 *   4. le serveur (pas d'utilisateur connecté) réécrit un message, et la marque
 *      est recalculée.
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

const RAISON = 'Profanité détectée automatiquement';
const INSULTE = 'ta gueule';
const PROPRE = 'bonjour tout le monde';
const IL_Y_A_QUATRE_ANS = '2022-11-25T10:00:00.000Z';

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

/** Le message entier tel qu'il est en base, lu par le client service. */
async function enBase(messageId: string) {
	const { data, error } = await service.from('messages').select('*').eq('id', messageId).single();
	if (error || !data) throw new Error(`lecture du message impossible : ${error?.message}`);
	return data;
}

/**
 * Tentative de réécriture : doit être REFUSÉE par la base (erreur lisible), pas
 * ignorée par la RLS, et laisser la ligne entière intacte.
 */
async function reecritureRefusee(
	client: Client,
	messageId: string,
	patch: MessageUpdate
): Promise<void> {
	const avant = await enBase(messageId);
	const { data, error } = await client
		.from('messages')
		.update(patch)
		.eq('id', messageId)
		.select('id');
	expect(data).toBeNull();
	expect(error?.code).toBe('42501');
	expect(error?.message).toContain('ne se reecrit pas');
	expect(await enBase(messageId)).toEqual(avant);
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

// ============================================================================
// TESTS
// ============================================================================

describe('Chat — un message envoyé ne se réécrit pas', () => {
	let teacher: Profile;
	let admin: Profile;
	let eleve: Profile;
	let camarade: Profile;
	let classeConversationId: string;
	let entreEleves: string;
	let avecAdmin: string;
	let eleveClient: Client;
	let camaradeClient: Client;
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
		camaradeClient = await createAuthenticatedClient(camarade.email);
		teacherClient = await createAuthenticatedClient(teacher.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('l’élève', () => {
		it('ne remplace pas l’insulte de son message marqué par un texte propre', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			await reecritureRefusee(eleveClient, id, { content: doc(PROPRE) });

			expect(await enBase(id)).toMatchObject({
				plain_text: INSULTE,
				is_flagged: true,
				flag_reason: RAISON
			});
		});

		it('l’onglet du prof montre toujours le texte d’origine', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			await reecritureRefusee(eleveClient, id, { content: doc(PROPRE) });

			const { data, error } = await teacherClient.rpc('get_flagged_messages_for_teacher', {
				p_limit: 200
			});
			expect(error).toBeNull();
			expect((data ?? []).find((ligne) => ligne.id === id)?.plain_text).toBe(INSULTE);
		});

		it('ne réécrit pas non plus un message propre', async () => {
			const id = await envoyer(classeConversationId, eleve.id, PROPRE);

			await reecritureRefusee(eleveClient, id, { content: doc(INSULTE) });
		});

		it('ne réécrit pas le texte lu par le prof', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			await reecritureRefusee(eleveClient, id, { plain_text: PROPRE });
		});

		it('n’antidate pas son message (écart T30)', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			await reecritureRefusee(eleveClient, id, { created_at: IL_Y_A_QUATRE_ANS });
		});

		it('ne change pas la date de modification', async () => {
			const id = await envoyer(entreEleves, eleve.id, PROPRE);

			await reecritureRefusee(eleveClient, id, { edited_at: new Date().toISOString() });
		});

		it('ne glisse pas une réécriture derrière une colonne permise', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			await reecritureRefusee(eleveClient, id, { is_reported: true, content: doc(PROPRE) });
		});

		it('renvoyer le même contenu n’est pas une réécriture', async () => {
			const id = await envoyer(entreEleves, eleve.id, PROPRE);
			const avant = await enBase(id);

			const { data, error } = await eleveClient
				.from('messages')
				.update({ content: doc(PROPRE) })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await enBase(id)).toEqual(avant);
		});
	});

	describe('le prof', () => {
		it('ne réécrit pas le message d’un élève du chat de sa classe', async () => {
			const id = await envoyer(classeConversationId, eleve.id, PROPRE);

			await reecritureRefusee(teacherClient, id, { content: doc(INSULTE) });
		});

		it('ne change pas l’auteur d’un message du chat de sa classe', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			await reecritureRefusee(teacherClient, id, { sender_id: camarade.id });
		});

		it('retire toujours la marque d’un message de sa classe', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			const { data, error } = await teacherClient
				.from('messages')
				.update({ is_flagged: false, flag_reason: null })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await enBase(id)).toMatchObject({
				is_flagged: false,
				flag_reason: null,
				plain_text: INSULTE
			});
		});
	});

	describe('l’admin', () => {
		it('ne réécrit pas son propre message', async () => {
			const adminClient = await createAuthenticatedClient(admin.email);
			const id = await envoyer(avecAdmin, admin.id, PROPRE);

			await reecritureRefusee(adminClient, id, { content: doc('bonsoir') });
		});
	});

	describe('supprimer et signaler restent possibles', () => {
		it('l’élève supprime son message, qui garde son texte et sa marque', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			const { error } = await eleveClient.rpc('soft_delete_message', { p_message_id: id });

			expect(error).toBeNull();
			const stored = await enBase(id);
			expect(stored.deleted_at).not.toBeNull();
			expect(stored).toMatchObject({ plain_text: INSULTE, is_flagged: true });
		});

		it('un camarade signale le message', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			const { error } = await camaradeClient.rpc('report_message', {
				p_message_id: id,
				p_reason: 'harassment'
			});

			expect(error).toBeNull();
			expect(await enBase(id)).toMatchObject({ is_reported: true, plain_text: INSULTE });
		});

		it('l’auteur ne retire pas le signalement de son message (écart T30)', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);
			const { error: signalement } = await camaradeClient.rpc('report_message', {
				p_message_id: id,
				p_reason: 'harassment'
			});
			expect(signalement).toBeNull();

			const { data, error } = await eleveClient
				.from('messages')
				.update({ is_reported: false })
				.eq('id', id)
				.select('id');

			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
			expect(error?.message).toContain('ne se retire pas');
			expect(await enBase(id)).toMatchObject({ is_reported: true });
		});
	});

	describe('le serveur', () => {
		it('réécrit un message (pas d’utilisateur connecté), la marque est recalculée', async () => {
			const id = await envoyer(entreEleves, eleve.id, PROPRE);

			const { data, error } = await service
				.from('messages')
				.update({ content: doc(INSULTE), created_at: IL_Y_A_QUATRE_ANS })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			const stored = await enBase(id);
			expect(stored).toMatchObject({ plain_text: INSULTE, is_flagged: true, flag_reason: RAISON });
			expect(new Date(stored.created_at ?? '').toISOString()).toBe(IL_Y_A_QUATRE_ANS);
		});
	});
});
