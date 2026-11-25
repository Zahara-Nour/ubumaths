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
 *      est recalculée ;
 *   5. à l'envoi (constat du `security-auditor` sur cette PR, reste de l'écart
 *      T30) : un compte connecté ne choisit pas la date de son message. Envoyé
 *      daté d'il y a quatre ans (sous la purge de conservation) ou de 2099 (en
 *      tête de l'onglet du prof pour toujours), il part quand même, daté de
 *      maintenant, ni « modifié » ni « supprimé ». Le serveur garde la main ;
 *   6. non-régression sur la date de suppression (question du même rapport) :
 *      l'élève n'en choisit pas la valeur par l'API (refus de la RLS), et un
 *      message supprimé ne se restaure pas.
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
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// ============================================================================
// CONSTANTES
// ============================================================================

const RAISON = 'Profanité détectée automatiquement';
const INSULTE = 'ta gueule';
const PROPRE = 'bonjour tout le monde';
const IL_Y_A_QUATRE_ANS = '2022-11-25T10:00:00.000Z';
const EN_2099 = '2099-01-01T10:00:00.000Z';
/** Écart toléré entre l'horloge du test et celle de la base. */
const TOLERANCE_MS = 60_000;

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

/**
 * Envoi par un compte connecté, avec les colonnes en trop qu'il choisit. Le
 * message doit PARTIR (pas de refus) ; rend la ligne telle qu'elle est en base.
 */
async function envoyerPar(
	client: Client,
	conversationId: string,
	senderId: string,
	enTrop: Pick<MessageInsert, 'created_at' | 'edited_at' | 'deleted_at'>
) {
	const id = crypto.randomUUID();
	const { error } = await client.from('messages').insert({
		id,
		conversation_id: conversationId,
		sender_id: senderId,
		content: doc(PROPRE),
		plain_text: PROPRE,
		...enTrop
	});
	expect(error).toBeNull();
	return enBase(id);
}

/** La date est celle de l'envoi, à la tolérance d'horloge près. */
function expectDateDeMaintenant(date: string | null): void {
	const ecart = Math.abs(new Date(date ?? '').getTime() - Date.now());
	expect(ecart).toBeLessThan(TOLERANCE_MS);
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

	describe('la date de suppression', () => {
		// Non-régression : la suppression passe par `soft_delete_message`, qui date
		// elle-même. Écrire `deleted_at` par l'API est refusé par la RLS (la ligne
		// nouvelle ne serait plus lisible par son auteur), donc aucune date choisie.
		it('l’élève ne choisit pas la date de suppression de son message', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);
			const avant = await enBase(id);

			const { error } = await eleveClient
				.from('messages')
				.update({ deleted_at: IL_Y_A_QUATRE_ANS })
				.eq('id', id);

			expect(error?.code).toBe('42501');
			expect(await enBase(id)).toEqual(avant);
		});

		it('la suppression par l’application est datée de maintenant', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);

			const { error } = await eleveClient.rpc('soft_delete_message', { p_message_id: id });

			expect(error).toBeNull();
			expectDateDeMaintenant((await enBase(id)).deleted_at);
		});

		it('l’élève ne restaure pas son message supprimé', async () => {
			const id = await envoyer(entreEleves, eleve.id, INSULTE);
			const { error: suppression } = await eleveClient.rpc('soft_delete_message', {
				p_message_id: id
			});
			expect(suppression).toBeNull();
			const avant = await enBase(id);
			expect(avant.deleted_at).not.toBeNull();

			// Pas de `.select()` : la ligne supprimée n'est plus lisible par l'élève.
			const { error } = await eleveClient
				.from('messages')
				.update({ deleted_at: null })
				.eq('id', id);

			// Refus en silence (la RLS ne montre pas la ligne) ou erreur : dans les deux
			// cas le message reste supprimé, à la même date.
			if (error) expect(error.code).toBe('42501');
			expect(await enBase(id)).toEqual(avant);
		});
	});

	describe('à l’envoi, un compte connecté ne choisit pas la date', () => {
		it('l’élève n’antidate pas son message à l’envoi (écart T30)', async () => {
			const stored = await envoyerPar(eleveClient, entreEleves, eleve.id, {
				created_at: IL_Y_A_QUATRE_ANS
			});

			expectDateDeMaintenant(stored.created_at);
		});

		it('l’élève ne postdate pas son message à l’envoi', async () => {
			const stored = await envoyerPar(eleveClient, entreEleves, eleve.id, {
				created_at: EN_2099
			});

			expectDateDeMaintenant(stored.created_at);
		});

		it('l’élève n’envoie pas un message déjà « modifié » ni déjà « supprimé »', async () => {
			const stored = await envoyerPar(eleveClient, entreEleves, eleve.id, {
				edited_at: IL_Y_A_QUATRE_ANS,
				deleted_at: IL_Y_A_QUATRE_ANS
			});

			expect(stored).toMatchObject({ edited_at: null, deleted_at: null, plain_text: PROPRE });
		});

		it('le prof non plus, dans le chat de sa classe', async () => {
			const stored = await envoyerPar(teacherClient, classeConversationId, teacher.id, {
				created_at: IL_Y_A_QUATRE_ANS,
				edited_at: IL_Y_A_QUATRE_ANS,
				deleted_at: IL_Y_A_QUATRE_ANS
			});

			expectDateDeMaintenant(stored.created_at);
			expect(stored).toMatchObject({ edited_at: null, deleted_at: null });
		});

		it('l’envoi de l’application (sans date) passe, daté de maintenant', async () => {
			const stored = await envoyerPar(eleveClient, entreEleves, eleve.id, {});

			expectDateDeMaintenant(stored.created_at);
			expect(stored).toMatchObject({ sender_id: eleve.id, edited_at: null, deleted_at: null });
		});

		it('le serveur garde la date qu’il envoie', async () => {
			const { data, error } = await service
				.from('messages')
				.insert({
					conversation_id: entreEleves,
					sender_id: eleve.id,
					content: doc(PROPRE),
					created_at: IL_Y_A_QUATRE_ANS
				})
				.select('created_at')
				.single();

			expect(error).toBeNull();
			expect(new Date(data?.created_at ?? '').toISOString()).toBe(IL_Y_A_QUATRE_ANS);
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
