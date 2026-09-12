/**
 * Quitter une classe, c'est aussi quitter son salon et ses cartes
 * ==============================================================
 *
 * `trigger_add_student_to_class_chat` était AFTER **INSERT** seulement, et
 * `trg_cleanup_kanban_assignees_on_class_leave` AFTER **DELETE** seulement.
 * Aucun des deux ne connaissait l'archivage — et aucun code applicatif ne
 * touche `conversation_participants`.
 *
 * Deux conséquences :
 *   - un élève ARCHIVÉ restait dans le salon de groupe de la classe quittée ;
 *   - un élève RETIRÉ de la classe (DELETE) y restait aussi, ce second trou
 *     n'ayant simplement jamais mordu faute de retrait en production.
 *
 * Le salon d'une classe est du contenu de classe, et l'école est la frontière
 * safeguarding : y laisser quelqu'un qui n'en est plus est le défaut le plus
 * lourd de cette série.
 *
 * ⚠️ CONSÉQUENCE ASSUMÉE : retiré du salon, l'élève perd l'accès à
 * l'historique du groupe, y compris à ses propres messages, qui restent en
 * base attribués à lui. Un message de groupe n'est pas une donnée personnelle
 * au même titre qu'un signalement d'erreur : il appartient à la conversation.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

const service = createServiceRoleClient();

describe('effets de bord d’une adhésion de classe', () => {
	let classId: string;
	let teacherId: string;
	let studentId: string;
	let salonId: string;
	let cardId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		// Le professeur AVANT la classe : le trigger qui monte le salon lui donne
		// un `created_by`, que `conversations_check` exige non nul.
		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
		classId = (await TestData.class().withName('2nde effets ZZ').create()).id;

		const { data: salon, error: salonError } = await service
			.from('conversations')
			.select('id')
			.eq('class_id', classId)
			.eq('is_group', true)
			.single();
		expect(salonError).toBeNull();
		salonId = (salon as { id: string }).id;

		const student = await TestData.profile().withRole('student').create();
		studentId = student.id;

		// Un tableau kanban de la classe, avec une carte assignée à l'élève.
		const { data: board, error: boardError } = await service
			.from('kanban_boards')
			.insert({ title: 'Tableau ZZ', class_id: classId, owner_id: teacherId })
			.select('id')
			.single();
		expect(boardError).toBeNull();

		const { data: column, error: columnError } = await service
			.from('kanban_columns')
			.insert({ board_id: (board as { id: string }).id, title: 'À faire', position: 1 })
			.select('id')
			.single();
		expect(columnError).toBeNull();

		const { data: card, error: cardError } = await service
			.from('kanban_cards')
			.insert({ column_id: (column as { id: string }).id, title: 'Carte ZZ', position: 1 })
			.select('id')
			.single();
		expect(cardError).toBeNull();
		cardId = (card as { id: string }).id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function dansLeSalon(userId: string): Promise<boolean> {
		const { data, error } = await service
			.from('conversation_participants')
			.select('id')
			.eq('conversation_id', salonId)
			.eq('user_id', userId);
		expect(error).toBeNull();
		return (data ?? []).length > 0;
	}

	async function assigneALaCarte(userId: string): Promise<boolean> {
		const { data, error } = await service
			.from('kanban_card_assignees')
			.select('card_id')
			.eq('card_id', cardId)
			.eq('user_id', userId);
		expect(error).toBeNull();
		return (data ?? []).length > 0;
	}

	async function adherer(status: string) {
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: studentId, status });
		expect(error).toBeNull();
	}

	async function changerStatut(status: string) {
		const { error } = await service
			.from('class_members')
			.update({ status })
			.eq('class_id', classId)
			.eq('student_id', studentId);
		expect(error).toBeNull();
	}

	it('rejoindre une classe fait entrer dans son salon', async () => {
		await adherer('active');
		expect(await dansLeSalon(studentId)).toBe(true);
	});

	it('ARCHIVER l’adhésion fait sortir du salon', async () => {
		await changerStatut('archived');
		expect(await dansLeSalon(studentId)).toBe(false);
	});

	it('réactiver l’adhésion y fait rentrer de nouveau', async () => {
		// On le sort à la main d'abord : sans cela, le test serait vert même sans
		// la migration — l'élève n'en serait jamais sorti, et l'assertion
		// passerait pour la mauvaise raison.
		const { error } = await service
			.from('conversation_participants')
			.delete()
			.eq('conversation_id', salonId)
			.eq('user_id', studentId);
		expect(error).toBeNull();
		expect(await dansLeSalon(studentId)).toBe(false);

		await changerStatut('active');
		expect(await dansLeSalon(studentId)).toBe(true);
	});

	it('une adhésion NÉE archivée ne fait pas entrer', async () => {
		const autre = await TestData.profile().withRole('student').create();
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: autre.id, status: 'archived' });
		expect(error).toBeNull();
		expect(await dansLeSalon(autre.id)).toBe(false);
	});

	it('archiver retire aussi les assignations kanban de la classe', async () => {
		const { error: assignError } = await service
			.from('kanban_card_assignees')
			.insert({ card_id: cardId, user_id: studentId });
		expect(assignError).toBeNull();
		expect(await assigneALaCarte(studentId)).toBe(true);

		await changerStatut('archived');
		expect(await assigneALaCarte(studentId)).toBe(false);
	});

	it('être RETIRÉ de la classe fait sortir du salon', async () => {
		// Ce second trou n'avait jamais mordu : rien ne retire d'une classe en
		// production. Il n'en était pas moins ouvert.
		await changerStatut('active');
		expect(await dansLeSalon(studentId)).toBe(true);

		const { error } = await service
			.from('class_members')
			.delete()
			.eq('class_id', classId)
			.eq('student_id', studentId);
		expect(error).toBeNull();
		expect(await dansLeSalon(studentId)).toBe(false);
	});

	it('le professeur reste dans le salon MÊME inscrit par erreur comme membre', async () => {
		// `class_members` n'a aucun contrôle de rôle, et l'API d'ajout n'en fait
		// pas : un clic dans l'administration peut y inscrire le professeur. Sans
		// le garde `created_by`, l'archivage l'éjecterait alors de sa propre
		// conversation — et aucune policy ne permet de l'y remettre
		// automatiquement.
		//
		// Affirmer « il n'est pas membre, donc rien ne le menace » ne prouvait
		// rien : ce test-là joue le danger réel.
		const { error: inscription } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: teacherId, status: 'active' });
		expect(inscription).toBeNull();
		expect(await dansLeSalon(teacherId)).toBe(true);

		const { error: archivage } = await service
			.from('class_members')
			.update({ status: 'archived' })
			.eq('class_id', classId)
			.eq('student_id', teacherId);
		expect(archivage).toBeNull();

		expect(await dansLeSalon(teacherId)).toBe(true);
	});

	it('changer un élève de classe retire ses cartes du tableau de l’ANCIENNE', async () => {
		// Ce cas seul distingue OLD de NEW : sur un archivage simple les deux sont
		// identiques, et une fonction qui viserait `new` passerait le test. Ici la
		// classe change, donc viser `new.class_id` chercherait les cartes du
		// tableau d'ARRIVÉE et laisserait intactes celles du départ.
		const arrivee = (await TestData.class().withName('2nde kanban arrivee ZZ').create()).id;
		const eleve = await TestData.profile().withRole('student').create();

		const { error: adhesion } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: eleve.id, status: 'active' });
		expect(adhesion).toBeNull();

		const { error: assignError } = await service
			.from('kanban_card_assignees')
			.insert({ card_id: cardId, user_id: eleve.id });
		expect(assignError).toBeNull();
		expect(await assigneALaCarte(eleve.id)).toBe(true);

		const { error: demenagement } = await service
			.from('class_members')
			.update({ class_id: arrivee })
			.eq('class_id', classId)
			.eq('student_id', eleve.id);
		expect(demenagement).toBeNull();

		expect(await assigneALaCarte(eleve.id)).toBe(false);
	});

	it('changer un élève de classe le sort du salon de l’ANCIENNE', async () => {
		// `coalesce(new, old)` ne rend que la NOUVELLE classe : sans sortie
		// explicite sur `old.class_id`, l'élève entrait dans le salon d'arrivée
		// sans jamais quitter celui de départ.
		const autreClasse = (await TestData.class().withName('2nde arrivee ZZ').create()).id;
		const { data: autreSalon, error: salonErr } = await service
			.from('conversations')
			.select('id')
			.eq('class_id', autreClasse)
			.eq('is_group', true)
			.single();
		expect(salonErr).toBeNull();

		const eleve = await TestData.profile().withRole('student').create();
		const { error: adhesion } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: eleve.id, status: 'active' });
		expect(adhesion).toBeNull();
		expect(await dansLeSalon(eleve.id)).toBe(true);

		const { error: demenagement } = await service
			.from('class_members')
			.update({ class_id: autreClasse })
			.eq('class_id', classId)
			.eq('student_id', eleve.id);
		expect(demenagement).toBeNull();

		expect(await dansLeSalon(eleve.id)).toBe(false);
		const { data: arrivee, error: arriveeErr } = await service
			.from('conversation_participants')
			.select('id')
			.eq('conversation_id', (autreSalon as { id: string }).id)
			.eq('user_id', eleve.id);
		expect(arriveeErr).toBeNull();
		expect(arrivee ?? []).toHaveLength(1);
	});

	it('archiver dans une classe ne sort pas du salon d’une AUTRE', async () => {
		// Un élève peut appartenir à deux classes : la sortie doit être ciblée.
		const secondeClasse = (await TestData.class().withName('2nde double ZZ').create()).id;
		const { data: secondSalon, error: salonErr } = await service
			.from('conversations')
			.select('id')
			.eq('class_id', secondeClasse)
			.eq('is_group', true)
			.single();
		expect(salonErr).toBeNull();
		const secondSalonId = (secondSalon as { id: string }).id;

		const eleve = await TestData.profile().withRole('student').create();
		const { error: adhesions } = await service.from('class_members').insert([
			{ class_id: classId, student_id: eleve.id, status: 'active' },
			{ class_id: secondeClasse, student_id: eleve.id, status: 'active' }
		]);
		expect(adhesions).toBeNull();

		const { error: archivage } = await service
			.from('class_members')
			.update({ status: 'archived' })
			.eq('class_id', classId)
			.eq('student_id', eleve.id);
		expect(archivage).toBeNull();

		expect(await dansLeSalon(eleve.id)).toBe(false);
		const { data: encore, error: encoreErr } = await service
			.from('conversation_participants')
			.select('id')
			.eq('conversation_id', secondSalonId)
			.eq('user_id', eleve.id);
		expect(encoreErr).toBeNull();
		expect(encore ?? []).toHaveLength(1);
	});
});
