import { lore } from '#lib/config/lore.ts';

/** Ce qu'il faut d'un message pour savoir à qui répondre */
export interface ReplySource {
	sender_id: string;
	recipients?: Array<{ id: string }> | null;
}

/**
 * À qui part la réponse, depuis un message ouvert ou un fil (messages du plus
 * ancien au plus récent) : jamais à soi-même.
 *
 * - le dernier message écrit par quelqu'un d'autre → son expéditeur ;
 * - tous les messages sont de moi → le destinataire de mon dernier message,
 *   s'il n'y en a qu'un ;
 * - sinon personne (message à plusieurs élèves resté sans réponse) : la page
 *   ne propose pas « Répondre ».
 */
export function replyRecipientId(messages: ReplySource[], me: string): string | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].sender_id !== me) return messages[i].sender_id;
	}
	const mine = messages.at(-1);
	if (!mine) return null;
	const others = (mine.recipients ?? []).filter((recipient) => recipient.id !== me);
	return others.length === 1 ? others[0].id : null;
}

/** Le rôle d'un compte, dans les mots du Royaume (jamais le nom technique) */
export function messageRoleLabel(role: string | null | undefined): string {
	if (role === 'teacher') return lore.entities.teacher;
	if (role === 'student') return lore.entities.student;
	if (role === 'admin') return 'Administrateur';
	return '';
}
