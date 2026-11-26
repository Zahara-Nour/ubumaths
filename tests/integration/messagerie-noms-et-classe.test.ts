/**
 * Messagerie privée : message à une classe, noms affichés (base locale)
 * =====================================================================
 *
 * Écarts V132 et V134 du registre (`docs/ecarts/registre.md`).
 *
 * - V132 : un message envoyé à une classe échouait toujours
 *   (`get_students_in_class` lisait une colonne disparue), et une classe sans
 *   élève actif aurait fait échouer l'envoi sur un tableau vide.
 * - V134 : les fonctions de lecture rendaient `profiles.full_name` seul, vide
 *   pour presque tous les élèves de la prod : « Inconnu » partout.
 *
 * Décision d'accès (David, 2026-11-26) : le prof voit le prénom et le nom de
 * ses élèves, l'élève ceux du prof qui lui écrit ; un élève qui reçoit un
 * message envoyé à plusieurs élèves ne lit pas l'identité des autres
 * destinataires.
 *
 * Les comptes de la fabrique ont tous un nom complet : il est vidé ici, comme
 * en prod. Les appels passent par des clients connectés, jamais par le rôle de
 * service (`auth.uid()` vide y contourne les gardes).
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

type Profile = Database['public']['Tables']['profiles']['Row'];
type Client = SupabaseClient<Database>;

const CONTENT = { type: 'doc', content: [{ type: 'paragraph' }] };

describe('Messagerie privée : message à une classe et noms affichés', () => {
	const service = createServiceRoleClient();

	let teacher: Profile;
	let camille: Profile;
	let sacha: Profile;
	let ancien: Profile;
	let sansNom: Profile;
	let classId: string;
	let emptyClassId: string;
	let inactiveClassId: string;
	let teacherClient: Client;
	let camilleClient: Client;
	let sachaClient: Client;

	/** Compte de la prod : prénom et nom remplis, nom complet vide */
	async function sansNomComplet(
		role: 'student' | 'teacher',
		prenom: string | null,
		nom: string | null
	): Promise<Profile> {
		const profile = await TestData.profile().withRole(role).create();
		const { data, error } = await service
			.from('profiles')
			.update({ full_name: null, firstname: prenom, lastname: nom })
			.eq('id', profile.id)
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		return data![0];
	}

	async function classe(nom: string, eleves: Array<{ id: string; status: string }>) {
		const created = await TestData.class().withName(nom).create();
		if (eleves.length > 0) {
			const { error } = await service
				.from('class_members')
				.insert(eleves.map((e) => ({ class_id: created.id, student_id: e.id, status: e.status })));
			expect(error).toBeNull();
		}
		return created.id;
	}

	async function envoyer(
		client: Client,
		senderId: string,
		recipientIds: string[],
		subject: string,
		parentMessageId?: string
	): Promise<string> {
		const { data, error } = await client.rpc('send_private_message', {
			p_sender_id: senderId,
			p_recipient_ids: recipientIds,
			p_subject: subject,
			p_content: CONTENT,
			p_parent_message_id: parentMessageId
		});
		expect(error).toBeNull();
		expect(data).toEqual(expect.any(String));
		return data as string;
	}

	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await sansNomComplet('teacher', 'Dominique', 'Prof');
		camille = await sansNomComplet('student', 'Camille', 'Fictif');
		sacha = await sansNomComplet('student', 'Sacha', 'Exemple');
		ancien = await sansNomComplet('student', 'Alix', 'Ancien');
		sansNom = await sansNomComplet('student', null, null);

		classId = await classe('Classe fictive', [
			{ id: camille.id, status: 'active' },
			{ id: sacha.id, status: 'active' },
			{ id: ancien.id, status: 'archived' }
		]);
		emptyClassId = await classe('Classe vide', [{ id: ancien.id, status: 'archived' }]);
		inactiveClassId = await classe('Classe fermée', [{ id: camille.id, status: 'active' }]);
		const { data: closed, error } = await service
			.from('classes')
			.update({ is_active: false })
			.eq('id', inactiveClassId)
			.select('id');
		expect(error).toBeNull();
		expect(closed).toHaveLength(1);

		teacherClient = await createAuthenticatedClient(teacher.email);
		camilleClient = await createAuthenticatedClient(camille.email);
		sachaClient = await createAuthenticatedClient(sacha.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// ========================================================================
	// V132 : message à une classe
	// ========================================================================

	describe('message à une classe', () => {
		it('le prof écrit à sa classe : chaque élève actif le reçoit, pas l’ancien élève', async () => {
			const { data: messageId, error } = await teacherClient.rpc('send_private_message', {
				p_sender_id: teacher.id,
				p_recipient_ids: [],
				p_subject: 'Contrôle lundi',
				p_content: CONTENT,
				p_is_group_message: true,
				p_class_id: classId
			});
			expect(error).toBeNull();
			expect(messageId).toEqual(expect.any(String));

			const { data: lignes, error: erreurBoite } = await service
				.from('message_inbox')
				.select('recipient_id')
				.eq('message_id', messageId as string);
			expect(erreurBoite).toBeNull();
			expect((lignes ?? []).map((l) => l.recipient_id).sort()).toEqual(
				[camille.id, sacha.id].sort()
			);

			const { data: message } = await service
				.from('private_messages')
				.select('recipient_count, is_group_message, class_id')
				.eq('id', messageId as string)
				.single();
			expect(message).toEqual({ recipient_count: 2, is_group_message: true, class_id: classId });
		});

		it('classe sans élève actif : refus net, aucun message créé', async () => {
			const { data, error } = await teacherClient.rpc('send_private_message', {
				p_sender_id: teacher.id,
				p_recipient_ids: [],
				p_subject: 'Personne ne lira ceci',
				p_content: CONTENT,
				p_is_group_message: true,
				p_class_id: emptyClassId
			});
			expect(data).toBeNull();
			expect(error?.code).toBe('P0002');
			expect(error?.message).toBe('no active student in this class');

			const { data: restes, error: erreurLecture } = await service
				.from('private_messages')
				.select('id')
				.eq('subject', 'Personne ne lira ceci');
			expect(erreurLecture).toBeNull();
			expect(restes).toEqual([]);
		});

		it('classe fermée : refus, comme avant', async () => {
			const { data, error } = await teacherClient.rpc('send_private_message', {
				p_sender_id: teacher.id,
				p_recipient_ids: [],
				p_subject: 'Classe fermée',
				p_content: CONTENT,
				p_is_group_message: true,
				p_class_id: inactiveClassId
			});
			expect(data).toBeNull();
			expect(error?.message).toContain('do not have permission');
		});

		it('un élève ne peut pas écrire à une classe', async () => {
			const { data, error } = await camilleClient.rpc('send_private_message', {
				p_sender_id: camille.id,
				p_recipient_ids: [],
				p_subject: 'Élève vers classe',
				p_content: CONTENT,
				p_is_group_message: true,
				p_class_id: classId
			});
			expect(data).toBeNull();
			expect(error?.message).toContain('do not have permission');
		});
	});

	// ========================================================================
	// V134 : noms rendus par les fonctions de lecture
	// ========================================================================

	describe('noms des comptes sans nom complet', () => {
		it('page « Écrire » du prof : chaque élève par son prénom et son nom', async () => {
			const { data, error } = await teacherClient.rpc('get_allowed_recipients', {
				p_user_id: teacher.id
			});
			expect(error).toBeNull();
			const noms = new Map((data ?? []).map((r) => [r.user_id, r.full_name]));
			expect(noms.get(camille.id)).toBe('Camille Fictif');
			expect(noms.get(sacha.id)).toBe('Sacha Exemple');
			// Ni prénom ni nom : rien d'inventé, la page affiche son propre repli
			expect(noms.get(sansNom.id)).toBeNull();
			// Triés par le nom affiché, les comptes sans nom à la fin
			const affiches = (data ?? []).map((r) => r.full_name);
			const nommes = affiches.filter((n): n is string => n !== null);
			expect(nommes).toEqual([...nommes].sort((a, b) => a.localeCompare(b, 'fr')));
			expect(affiches.slice(nommes.length).every((n) => n === null)).toBe(true);
		});

		it('page « Écrire » de l’élève : le prof par son prénom et son nom', async () => {
			const { data, error } = await camilleClient.rpc('get_allowed_recipients', {
				p_user_id: camille.id
			});
			expect(error).toBeNull();
			expect(data).toEqual([expect.objectContaining({ user_id: teacher.id })]);
			expect(data![0].full_name).toBe('Dominique Prof');
		});

		it('un nom complet rempli reste affiché tel quel', async () => {
			const nomme = await TestData.profile()
				.withRole('student')
				.withFullName('Nom Complet Fictif')
				.create();
			const { data, error } = await teacherClient.rpc('get_allowed_recipients', {
				p_user_id: teacher.id
			});
			expect(error).toBeNull();
			expect((data ?? []).find((r) => r.user_id === nomme.id)?.full_name).toBe(
				'Nom Complet Fictif'
			);
		});

		it('boîte de réception, détail, fil et envoyés : expéditeur et destinataire nommés', async () => {
			const questionId = await envoyer(camilleClient, camille.id, [teacher.id], 'Question noms');
			const reponseId = await envoyer(
				teacherClient,
				teacher.id,
				[camille.id],
				'Re: Question noms',
				questionId
			);

			// Boîte du prof : l'élève qui lui écrit
			const { data: boite, error: erreurBoite } = await teacherClient.rpc('get_user_inbox', {
				p_user_id: teacher.id
			});
			expect(erreurBoite).toBeNull();
			expect((boite ?? []).find((m) => m.message_id === questionId)?.sender_name).toBe(
				'Camille Fictif'
			);

			// Boîte de l'élève : le prof qui lui répond
			const { data: boiteEleve, error: erreurBoiteEleve } = await camilleClient.rpc(
				'get_user_inbox',
				{ p_user_id: camille.id }
			);
			expect(erreurBoiteEleve).toBeNull();
			expect((boiteEleve ?? []).find((m) => m.message_id === reponseId)?.sender_name).toBe(
				'Dominique Prof'
			);

			// Détail côté prof : expéditeur et destinataire
			const { data: detail, error: erreurDetail } = await teacherClient.rpc('get_message_details', {
				p_message_id: questionId,
				p_user_id: teacher.id
			});
			expect(erreurDetail).toBeNull();
			expect(detail?.[0]?.sender_name).toBe('Camille Fictif');
			expect(detail?.[0]?.recipients).toEqual([
				expect.objectContaining({ id: teacher.id, name: 'Dominique Prof' })
			]);

			// Fil côté élève : les deux messages, chacun avec son auteur
			const { data: fil, error: erreurFil } = await camilleClient.rpc('get_message_thread', {
				p_thread_root_id: questionId,
				p_user_id: camille.id
			});
			expect(erreurFil).toBeNull();
			expect((fil ?? []).map((m) => [m.message_id, m.sender_name])).toEqual([
				[questionId, 'Camille Fictif'],
				[reponseId, 'Dominique Prof']
			]);

			// Envoyés du prof : le destinataire
			const { data: envoyes, error: erreurEnvoyes } = await teacherClient.rpc(
				'get_user_sent_messages',
				{ p_user_id: teacher.id }
			);
			expect(erreurEnvoyes).toBeNull();
			expect((envoyes ?? []).find((m) => m.message_id === reponseId)?.recipients).toEqual([
				expect.objectContaining({ id: camille.id, name: 'Camille Fictif' })
			]);
		});
	});

	// ========================================================================
	// Accès : un élève ne lit pas l'identité des autres destinataires
	// ========================================================================

	describe('destinataires d’un message envoyé à plusieurs élèves', () => {
		let groupeId: string;

		beforeAll(async () => {
			groupeId = await envoyer(
				teacherClient,
				teacher.id,
				[camille.id, sacha.id],
				'Message à deux élèves'
			);
		});

		it('l’élève destinataire ne reçoit que sa propre ligne, et le nombre de destinataires', async () => {
			const { data, error } = await camilleClient.rpc('get_message_details', {
				p_message_id: groupeId,
				p_user_id: camille.id
			});
			expect(error).toBeNull();
			expect(data?.[0]?.sender_name).toBe('Dominique Prof');
			expect(data?.[0]?.recipient_count).toBe(2);
			expect(data?.[0]?.recipients).toEqual([
				expect.objectContaining({ id: camille.id, name: 'Camille Fictif' })
			]);
			expect(JSON.stringify(data?.[0]?.recipients)).not.toContain(sacha.id);
			expect(JSON.stringify(data?.[0]?.recipients)).not.toContain('Sacha');
		});

		it('l’autre élève : pareil, dans l’autre sens', async () => {
			const { data, error } = await sachaClient.rpc('get_message_details', {
				p_message_id: groupeId,
				p_user_id: sacha.id
			});
			expect(error).toBeNull();
			expect(data?.[0]?.recipients).toEqual([expect.objectContaining({ id: sacha.id })]);
		});

		it('le prof expéditeur lit tous ses destinataires, nommés', async () => {
			const { data, error } = await teacherClient.rpc('get_message_details', {
				p_message_id: groupeId,
				p_user_id: teacher.id
			});
			expect(error).toBeNull();
			const noms = ((data?.[0]?.recipients ?? []) as Array<{ name: string }>)
				.map((r) => r.name)
				.sort();
			expect(noms).toEqual(['Camille Fictif', 'Sacha Exemple']);
		});

		it('un élève étranger au message n’y accède toujours pas', async () => {
			const etranger = await sansNomComplet('student', 'Noa', 'Dehors');
			const client = await createAuthenticatedClient(etranger.email);
			const { data, error } = await client.rpc('get_message_details', {
				p_message_id: groupeId,
				p_user_id: etranger.id
			});
			expect(data).toBeNull();
			expect(error?.message).toContain('do not have access');
		});

		it('un élève ne lit pas le détail au nom d’un autre', async () => {
			const { data, error } = await camilleClient.rpc('get_message_details', {
				p_message_id: groupeId,
				p_user_id: sacha.id
			});
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});
	});
});
