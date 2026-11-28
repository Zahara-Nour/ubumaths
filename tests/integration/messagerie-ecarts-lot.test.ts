/**
 * Messagerie privée : écarts du lot `messagerie` (base locale)
 * =============================================================
 *
 * Écarts L127 / L131, L132, L133, L134 et T37 du registre
 * (`docs/ecarts/registre.md`). L84 a sa preuve dans `ecarts-messagerie.test.ts`.
 * L135 (compte prof de test) est clos sans code : l'invariant mono-professeur
 * interdit un second compte prof, de test ou non.
 *
 * Décisions de David (2026-11-28), toutes des retraits d'accès :
 * - on ne répond qu'à un message qu'on a envoyé ou reçu (L127, L131) ;
 * - l'étiquette « message de classe » n'existe que pour un vrai envoi à une
 *   classe (L132) ;
 * - un message supprimé par son destinataire ne s'ouvre plus par son adresse,
 *   ni seul ni dans un fil (L133) ;
 * - un destinataire en double ne compte qu'une fois (L134) ;
 * - ni `anon` ni `authenticated` n'écrivent dans l'index de recherche (T37).
 *
 * Les appels passent par des clients connectés, jamais par le rôle de service
 * (`auth.uid()` vide y contourne les gardes).
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

// Types
type Profile = Database['public']['Tables']['profiles']['Row'];
type Client = SupabaseClient<Database>;

// Constantes
const CONTENT = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bonjour' }] }]
};

describe('Messagerie privée : écarts du lot messagerie', () => {
	const service = createServiceRoleClient();

	let teacher: Profile;
	let lea: Profile;
	let tom: Profile;
	let classId: string;
	let teacherClient: Client;
	let leaClient: Client;
	let tomClient: Client;

	async function profil(role: 'student' | 'teacher'): Promise<Profile> {
		return TestData.profile().withRole(role).create();
	}

	async function envoyer(
		client: Client,
		senderId: string,
		recipientIds: string[],
		extra: Partial<Database['public']['Functions']['send_private_message']['Args']> = {}
	) {
		return client.rpc('send_private_message', {
			p_sender_id: senderId,
			p_recipient_ids: recipientIds,
			p_subject: 'Sujet fictif',
			p_content: CONTENT,
			...extra
		});
	}

	async function envoye(client: Client, senderId: string, recipientIds: string[]) {
		const { data, error } = await envoyer(client, senderId, recipientIds);
		expect(error).toBeNull();
		expect(data).toEqual(expect.any(String));
		return data as string;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await profil('teacher');
		lea = await profil('student');
		tom = await profil('student');

		const created = await TestData.class().withName('Classe fictive').create();
		classId = created.id;
		const { error } = await service.from('class_members').insert([
			{ class_id: classId, student_id: lea.id, status: 'active' },
			{ class_id: classId, student_id: tom.id, status: 'active' }
		]);
		expect(error).toBeNull();

		teacherClient = await createAuthenticatedClient(teacher.email);
		leaClient = await createAuthenticatedClient(lea.email);
		tomClient = await createAuthenticatedClient(tom.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// ========================================================================
	// L127, L131 : répondre seulement à un message envoyé ou reçu
	// ========================================================================

	describe('réponse accrochée à un message', () => {
		it('témoin : Tom répond au message que le prof lui a écrit', async () => {
			const messageDuProf = await envoye(teacherClient, teacher.id, [tom.id]);
			const { error } = await envoyer(tomClient, tom.id, [teacher.id], {
				p_parent_message_id: messageDuProf
			});
			expect(error).toBeNull();
		});

		it('témoin : le prof répond dans le fil de son propre message', async () => {
			const messageDuProf = await envoye(teacherClient, teacher.id, [tom.id]);
			const { error } = await envoyer(teacherClient, teacher.id, [tom.id], {
				p_parent_message_id: messageDuProf
			});
			expect(error).toBeNull();
		});

		it('Léa ne peut pas répondre au message que le prof a écrit à Tom', async () => {
			const messageATom = await envoye(teacherClient, teacher.id, [tom.id]);
			const { data, error } = await envoyer(leaClient, lea.id, [teacher.id], {
				p_parent_message_id: messageATom
			});
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});

		it('un message parent inconnu est refusé', async () => {
			const { data, error } = await envoyer(leaClient, lea.id, [teacher.id], {
				p_parent_message_id: '00000000-0000-4000-8000-000000000001'
			});
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});
	});

	// ========================================================================
	// L132 : étiquette de classe seulement pour un envoi à une classe
	// ========================================================================

	describe('étiquette de classe', () => {
		it('message à Léa seule : ni « message de classe », ni classe enregistrée', async () => {
			const sansClasse = await envoyer(teacherClient, teacher.id, [lea.id], {
				p_is_group_message: true
			});
			const avecClasse = await envoyer(teacherClient, teacher.id, [lea.id], {
				p_class_id: classId
			});
			expect(sansClasse.error).toBeNull();
			expect(avecClasse.error).toBeNull();
			const { data, error } = await service
				.from('private_messages')
				.select('is_group_message, class_id, recipient_count')
				.in('id', [sansClasse.data as string, avecClasse.data as string]);
			expect(error).toBeNull();
			expect(data).toEqual([
				{ is_group_message: false, class_id: null, recipient_count: 1 },
				{ is_group_message: false, class_id: null, recipient_count: 1 }
			]);
		});

		it('témoin : un message à la classe garde son étiquette', async () => {
			const { data: id, error } = await envoyer(teacherClient, teacher.id, [], {
				p_is_group_message: true,
				p_class_id: classId
			});
			expect(error).toBeNull();
			const { data } = await service
				.from('private_messages')
				.select('is_group_message, class_id')
				.eq('id', id as string)
				.single();
			expect(data).toEqual({ is_group_message: true, class_id: classId });
		});
	});

	// ========================================================================
	// L133 : message supprimé par son destinataire
	// ========================================================================

	describe('message supprimé par son destinataire', () => {
		let racine: string;
		let reponse: string;

		beforeAll(async () => {
			racine = await envoye(teacherClient, teacher.id, [lea.id]);
			const { data, error } = await envoyer(teacherClient, teacher.id, [lea.id], {
				p_parent_message_id: racine
			});
			expect(error).toBeNull();
			reponse = data as string;
		});

		it('témoin : avant suppression, Léa ouvre le message et le fil', async () => {
			const details = await leaClient.rpc('get_message_details', {
				p_message_id: reponse,
				p_user_id: lea.id
			});
			expect(details.error).toBeNull();
			expect(details.data).toHaveLength(1);
			const fil = await leaClient.rpc('get_message_thread', {
				p_thread_root_id: racine,
				p_user_id: lea.id
			});
			expect(fil.error).toBeNull();
			expect((fil.data ?? []).map((m) => m.message_id)).toEqual([racine, reponse]);
		});

		it('après suppression, ni par son adresse, ni dans le fil', async () => {
			const { data: marque, error: suppression } = await leaClient
				.from('message_inbox')
				.update({ deleted: true })
				.eq('message_id', reponse)
				.eq('recipient_id', lea.id)
				.select('id');
			expect(suppression).toBeNull();
			expect(marque).toHaveLength(1);

			const details = await leaClient.rpc('get_message_details', {
				p_message_id: reponse,
				p_user_id: lea.id
			});
			expect(details.data ?? []).toHaveLength(0);
			expect(details.error?.message).toContain('do not have access');

			const fil = await leaClient.rpc('get_message_thread', {
				p_thread_root_id: racine,
				p_user_id: lea.id
			});
			expect(fil.error).toBeNull();
			expect((fil.data ?? []).map((m) => m.message_id)).toEqual([racine]);
		});

		it('l’expéditeur garde son exemplaire', async () => {
			const details = await teacherClient.rpc('get_message_details', {
				p_message_id: reponse,
				p_user_id: teacher.id
			});
			expect(details.error).toBeNull();
			expect(details.data).toHaveLength(1);
		});
	});

	// ========================================================================
	// L134 : destinataire en double
	// ========================================================================

	it('un destinataire en double reçoit le message une fois, sans erreur', async () => {
		const { data: id, error } = await envoyer(teacherClient, teacher.id, [tom.id, tom.id]);
		expect(error).toBeNull();
		const { data: lignes } = await service
			.from('message_inbox')
			.select('recipient_id')
			.eq('message_id', id as string);
		expect(lignes).toEqual([{ recipient_id: tom.id }]);
		const { data: message } = await service
			.from('private_messages')
			.select('recipient_count')
			.eq('id', id as string)
			.single();
		expect(message?.recipient_count).toBe(1);
	});

	// ========================================================================
	// T37 : index de recherche, aucune écriture des rôles clients
	// ========================================================================

	describe('index de recherche des messages', () => {
		it.each([
			['anon', 'SELECT'],
			['anon', 'INSERT'],
			['anon', 'UPDATE'],
			['anon', 'DELETE'],
			['authenticated', 'INSERT'],
			['authenticated', 'UPDATE'],
			['authenticated', 'DELETE']
		])('%s n’a pas le privilège %s', async (role, privilege) => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ granted: boolean }>(
				'select has_table_privilege($1, $2, $3) as granted',
				[role, 'public.message_search_index', privilege]
			);
			expect(rows[0].granted).toBe(false);
		});

		it('témoin : un message envoyé entre toujours dans l’index (trigger)', async () => {
			const id = await envoye(teacherClient, teacher.id, [lea.id]);
			const { data, error } = await service
				.from('message_search_index')
				.select('message_id')
				.eq('message_id', id);
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
		});
	});
});
