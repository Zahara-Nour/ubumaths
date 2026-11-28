import { lore } from '#lib/config/lore.ts';

/** Ce qu'il faut d'un message pour savoir à qui répondre */
export interface ReplySource {
	sender_id: string;
	sender_role?: string | null;
	recipients?: Array<{ id: string; role?: string | null }> | null;
}

/**
 * Qui peut écrire à qui, comme `validate_message_recipients` côté base :
 * l'élève au prof, le prof à un élève, l'admin à tout le monde. Un rôle
 * inconnu ne retire rien : le serveur décide.
 */
function canWriteTo(myRole: string | null | undefined, theirRole: string | null | undefined) {
	if (!myRole || !theirRole || myRole === 'admin') return true;
	if (myRole === 'student') return theirRole === 'teacher';
	if (myRole === 'teacher') return theirRole === 'student';
	return false;
}

/**
 * À qui part la réponse, depuis un message ouvert ou un fil (messages du plus
 * ancien au plus récent) : jamais à soi-même, jamais à un compte à qui l'on ne
 * peut pas écrire (l'élève ne répond pas à l'admin, écart V135).
 *
 * - le dernier message écrit par quelqu'un d'autre → son expéditeur ;
 * - tous les messages sont de moi → le destinataire de mon dernier message,
 *   s'il n'y en a qu'un ;
 * - sinon personne (message à plusieurs élèves resté sans réponse) : la page
 *   ne propose pas « Répondre ».
 */
export function replyRecipientId(
	messages: ReplySource[],
	me: string,
	myRole?: string | null
): string | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (message.sender_id !== me) {
			return canWriteTo(myRole, message.sender_role) ? message.sender_id : null;
		}
	}
	const mine = messages.at(-1);
	if (!mine) return null;
	const others = (mine.recipients ?? []).filter((recipient) => recipient.id !== me);
	if (others.length !== 1) return null;
	return canWriteTo(myRole, others[0].role) ? others[0].id : null;
}

/** Le rôle d'un compte, dans les mots du Royaume (jamais le nom technique) */
export function messageRoleLabel(role: string | null | undefined): string {
	if (role === 'teacher') return lore.entities.teacher;
	if (role === 'student') return lore.entities.student;
	if (role === 'admin') return 'Administrateur';
	return '';
}
