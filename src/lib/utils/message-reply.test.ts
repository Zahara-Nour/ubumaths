/**
 * « Répondre » ne s'écrit jamais à soi-même (écart V133).
 *
 * Avant : depuis un fil, la réponse partait à l'auteur du premier message, et
 * depuis un message ouvert à son expéditeur, même quand c'était soi : l'élève
 * qui avait ouvert le fil s'écrivait à lui-même et l'envoi était refusé.
 */
import { describe, it, expect } from 'vitest';
import { lore } from '#lib/config/lore.ts';
import { messageRoleLabel, replyRecipientId } from './message-reply.ts';

const ELEVE = 'eleve';
const PROF = 'prof';
const AUTRE = 'autre-eleve';

describe('replyRecipientId', () => {
	it('message reçu : la réponse part à son expéditeur', () => {
		expect(replyRecipientId([{ sender_id: PROF, recipients: [{ id: ELEVE }] }], ELEVE)).toBe(PROF);
	});

	it('fil ouvert par l’élève, le prof a répondu : l’élève répond au prof, pas à lui-même', () => {
		const fil = [
			{ sender_id: ELEVE, recipients: [{ id: PROF }] },
			{ sender_id: PROF, recipients: [{ id: ELEVE }] }
		];
		expect(replyRecipientId(fil, ELEVE)).toBe(PROF);
		expect(replyRecipientId(fil, PROF)).toBe(ELEVE);
	});

	it('fil dont le dernier message est de moi : au dernier qui m’a écrit', () => {
		const fil = [
			{ sender_id: ELEVE, recipients: [{ id: PROF }] },
			{ sender_id: PROF, recipients: [{ id: ELEVE }] },
			{ sender_id: ELEVE, recipients: [{ id: PROF }] }
		];
		expect(replyRecipientId(fil, ELEVE)).toBe(PROF);
	});

	it('mon message resté sans réponse : à son unique destinataire', () => {
		expect(replyRecipientId([{ sender_id: ELEVE, recipients: [{ id: PROF }] }], ELEVE)).toBe(PROF);
	});

	it('mon message à plusieurs élèves, sans réponse : personne', () => {
		const message = { sender_id: PROF, recipients: [{ id: ELEVE }, { id: AUTRE }] };
		expect(replyRecipientId([message], PROF)).toBeNull();
	});

	it('mon message sans destinataire connu, ou fil vide : personne', () => {
		expect(replyRecipientId([{ sender_id: ELEVE, recipients: null }], ELEVE)).toBeNull();
		expect(replyRecipientId([{ sender_id: ELEVE }], ELEVE)).toBeNull();
		expect(replyRecipientId([], ELEVE)).toBeNull();
	});
});

describe('messageRoleLabel', () => {
	it('le rôle dans les mots du Royaume, jamais le nom technique', () => {
		expect(messageRoleLabel('teacher')).toBe(lore.entities.teacher);
		expect(messageRoleLabel('student')).toBe(lore.entities.student);
		expect(messageRoleLabel('admin')).toBe('Administrateur');
		expect(messageRoleLabel(null)).toBe('');
		expect(messageRoleLabel('inconnu')).toBe('');
	});
});
