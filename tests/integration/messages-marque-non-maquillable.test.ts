/**
 * Chat : la marque automatique d'un message ne se maquille pas (base locale requise)
 * ================================================================================
 *
 * Constat du `security-auditor` (2026-11-25), rendu utile par l'onglet « Messages
 * marqués » du prof (écart T21) : les policies UPDATE de `messages` n'ont pas de
 * liste de colonnes et le trigger de marquage ne jouait que sur `UPDATE OF content`.
 * Un élève pouvait donc, par l'API de la base, retirer la marque de son message,
 * changer la raison, ou remplacer le texte lu par le prof (`plain_text`) alors que
 * le chat montre toujours le vrai contenu.
 *
 * Décision de David (2026-11-25) : l'élève ne peut plus écrire `is_flagged`,
 * `flag_reason` ni `plain_text` de ses messages ; il garde la modification du
 * contenu et la suppression.
 *
 * Ce que le fichier prouve :
 *   1. l'élève ne retire pas la marque, ne change pas la raison, ne réécrit pas
 *      `plain_text` ; un élève en lecture seule non plus ;
 *   2. modifier le contenu recalcule le texte et la marque, sans jamais la retirer ;
 *   3. à l'envoi, la marque et le texte viennent du contenu, pas de ce que l'élève
 *      envoie dans ces colonnes ;
 *   4. non-régression : un message supprimé garde sa marque ; le prof peut retirer
 *      la marque d'un message de sa classe, le service aussi ;
 *   5. borne de T21 : la lecture du prof (`is_flagged = true`, comme la page de
 *      modération) rend le message marqué du chat de sa classe, pas celui d'une
 *      conversation à deux entre élèves (dans sa classe ou hors classe).
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
		.select('plain_text, is_flagged, flag_reason, deleted_at')
		.eq('id', messageId)
		.single();
	if (error || !data) throw new Error(`lecture du message impossible : ${error?.message}`);
	return data;
}

/**
 * UPDATE d'un message par un compte connecté, qui doit ATTEINDRE la ligne : sans
 * erreur et une ligne rendue. Sinon un refus de la RLS laisserait la ligne
 * intacte et le test passerait sans que le trigger ait rien prouvé.
 */
async function modifier(client: Client, messageId: string, patch: MessageUpdate): Promise<void> {
	const { data, error } = await client
		.from('messages')
		.update(patch)
		.eq('id', messageId)
		.select('id');
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
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

/** Élève en lecture seule : consentement requis, non accordé, grâce terminée. */
async function mettreEnLectureSeule(studentId: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`update profiles set consent_required = true, consent_granted_at = null,
		   consent_grace_period_ends = now() - interval '1 day' where id = $1`,
		[studentId]
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe('Chat — la marque automatique ne se maquille pas', () => {
	let teacher: Profile;
	let eleve: Profile;
	let camarade: Profile;
	let lectureSeule: Profile;
	let horsClasseA: Profile;
	let horsClasseB: Profile;
	let classeConversationId: string;
	let eleveClient: Client;
	let teacherClient: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await TestData.profile().withRole('teacher').create();
		eleve = await TestData.profile().withRole('student').create();
		camarade = await TestData.profile().withRole('student').create();
		lectureSeule = await TestData.profile().withRole('student').create();
		horsClasseA = await TestData.profile().withRole('student').create();
		horsClasseB = await TestData.profile().withRole('student').create();

		const classe = await TestData.class(teacher.id).create();
		const { error: membresError } = await service.from('class_members').insert([
			{ class_id: classe.id, student_id: eleve.id },
			{ class_id: classe.id, student_id: camarade.id },
			{ class_id: classe.id, student_id: lectureSeule.id }
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

		eleveClient = await createAuthenticatedClient(eleve.email);
		teacherClient = await createAuthenticatedClient(teacher.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe('l’élève et la marque de son message', () => {
		it('ne retire pas la marque et ne change pas la raison', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);
			expect(await enBase(id)).toMatchObject({ is_flagged: true, flag_reason: RAISON });

			await modifier(eleveClient, id, { is_flagged: false, flag_reason: null });

			expect(await enBase(id)).toMatchObject({ is_flagged: true, flag_reason: RAISON });

			await modifier(eleveClient, id, { flag_reason: 'raison inventée' });

			expect(await enBase(id)).toMatchObject({ is_flagged: true, flag_reason: RAISON });
		});

		it('ne réécrit pas le texte lu par le prof', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			await modifier(eleveClient, id, { plain_text: PROPRE });

			expect(await enBase(id)).toMatchObject({ plain_text: INSULTE, is_flagged: true });
		});

		it('ne maquille pas tout d’un coup (marque, raison et texte)', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			await modifier(eleveClient, id, { is_flagged: false, flag_reason: null, plain_text: PROPRE });

			expect(await enBase(id)).toMatchObject({
				plain_text: INSULTE,
				is_flagged: true,
				flag_reason: RAISON
			});
		});

		it('ne se marque pas lui-même avec une raison inventée', async () => {
			const id = await envoyer(classeConversationId, eleve.id, PROPRE);

			await modifier(eleveClient, id, { is_flagged: true, flag_reason: 'raison inventée' });

			expect(await enBase(id)).toMatchObject({ is_flagged: false, flag_reason: null });
		});

		it('un élève en lecture seule ne retire pas la marque non plus', async () => {
			const id = await envoyer(classeConversationId, lectureSeule.id, INSULTE);
			await mettreEnLectureSeule(lectureSeule.id);
			const client = await createAuthenticatedClient(lectureSeule.email);

			await modifier(client, id, { is_flagged: false, flag_reason: null });

			expect(await enBase(id)).toMatchObject({ is_flagged: true, flag_reason: RAISON });

			// Le texte seul : refusé plus tôt, par la garde de lecture seule
			// (`guard_read_only_actor_trg`, qui passe avant le trigger de marquage).
			const { error } = await client
				.from('messages')
				.update({ plain_text: PROPRE })
				.eq('id', id)
				.select('id');
			expect(error?.code).toBe('42501');
			expect(await enBase(id)).toMatchObject({ plain_text: INSULTE, is_flagged: true });
		});
	});

	describe('modifier le contenu', () => {
		it('un message marqué réécrit proprement garde sa marque, avec le nouveau texte', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			const { data, error } = await eleveClient
				.from('messages')
				.update({ content: doc(PROPRE), is_flagged: false, flag_reason: null })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await enBase(id)).toMatchObject({
				plain_text: PROPRE,
				is_flagged: true,
				flag_reason: RAISON
			});
		});

		it('un message propre réécrit avec une insulte est marqué, même avec un faux texte', async () => {
			const id = await envoyer(classeConversationId, eleve.id, PROPRE);

			const { data, error } = await eleveClient
				.from('messages')
				.update({ content: doc(INSULTE), plain_text: PROPRE, is_flagged: false })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await enBase(id)).toMatchObject({
				plain_text: INSULTE,
				is_flagged: true,
				flag_reason: RAISON
			});
		});
	});

	describe('à l’envoi', () => {
		it('la marque et le texte viennent du contenu, pas des colonnes envoyées', async () => {
			const { data, error } = await eleveClient
				.from('messages')
				.insert({
					conversation_id: classeConversationId,
					sender_id: eleve.id,
					content: doc(INSULTE),
					plain_text: PROPRE,
					is_flagged: false
				})
				.select('id')
				.single();

			expect(error).toBeNull();
			expect(await enBase(data!.id)).toMatchObject({
				plain_text: INSULTE,
				is_flagged: true,
				flag_reason: RAISON
			});
		});

		it('un message propre envoyé « déjà marqué » par l’élève ne porte pas de marque', async () => {
			const { data, error } = await eleveClient
				.from('messages')
				.insert({
					conversation_id: classeConversationId,
					sender_id: eleve.id,
					content: doc(PROPRE),
					is_flagged: true,
					flag_reason: 'raison inventée'
				})
				.select('id')
				.single();

			expect(error).toBeNull();
			expect(await enBase(data!.id)).toMatchObject({ is_flagged: false, flag_reason: null });
		});
	});

	describe('non-régression', () => {
		// La suppression passe par la route de modération, qui écrit `deleted_at`
		// avec le client service (avec le client d'un compte, la RLS refuse la ligne
		// supprimée : policy SELECT `deleted_at IS NULL`).
		it('un message supprimé garde sa marque et son texte', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			const { data, error } = await service
				.from('messages')
				.update({ deleted_at: new Date().toISOString() })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			const stored = await enBase(id);
			expect(stored.deleted_at).not.toBeNull();
			expect(stored).toMatchObject({ is_flagged: true, flag_reason: RAISON, plain_text: INSULTE });
		});

		it('le prof peut retirer la marque d’un message de sa classe', async () => {
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

		it('le service peut retirer une marque', async () => {
			const id = await envoyer(classeConversationId, eleve.id, INSULTE);

			const { data, error } = await service
				.from('messages')
				.update({ is_flagged: false, flag_reason: null })
				.eq('id', id)
				.select('id');

			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await enBase(id)).toMatchObject({ is_flagged: false, flag_reason: null });
		});
	});

	// Lecture directe de `messages` par le prof : c'était celle de la page de
	// modération jusqu'à la fonction `get_flagged_messages_for_teacher` (voir
	// `messages-marques-prof.test.ts`). La policy SELECT, elle, n'a pas changé :
	// ce test garde la preuve que seule la fonction ouvre les conversations à deux.
	describe('borne de l’onglet « Messages marqués » (écart T21)', () => {
		// Mesuré le 2026-11-25 : la policy SELECT de `messages` nomme les conversations
		// à deux entre élèves de classe, mais elle lit `conversation_participants` sous
		// la RLS du prof, qui n'y voit que ses propres conversations. Le prof ne lit
		// donc AUCUNE conversation à deux entre élèves par la RLS.
		it('le prof lit les messages marqués du chat de sa classe, pas ceux d’une conversation à deux entre élèves', async () => {
			const dansLaClasse = await envoyer(classeConversationId, eleve.id, INSULTE);
			const aDeuxEnClasse = await envoyer(
				await conversationPrivee(eleve.id, camarade.id),
				eleve.id,
				INSULTE
			);
			const aDeuxHorsClasse = await envoyer(
				await conversationPrivee(horsClasseA.id, horsClasseB.id),
				horsClasseA.id,
				INSULTE
			);
			// Les trois messages portent bien la marque : une absence de la liste vient
			// de la RLS, pas d'un message non marqué.
			for (const id of [dansLaClasse, aDeuxEnClasse, aDeuxHorsClasse]) {
				expect(await enBase(id)).toMatchObject({ is_flagged: true });
			}

			const { data, error } = await teacherClient
				.from('messages')
				.select('id')
				.eq('is_flagged', true)
				.in('id', [dansLaClasse, aDeuxEnClasse, aDeuxHorsClasse]);

			expect(error).toBeNull();
			expect((data ?? []).map((m) => m.id)).toEqual([dansLaClasse]);
		});
	});
});
