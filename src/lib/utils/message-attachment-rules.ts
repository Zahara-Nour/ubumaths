/**
 * Pièces jointes de la messagerie : règles communes au navigateur et au serveur
 * =============================================================================
 *
 * Décision de David (2026-10-13) : images (JPEG, PNG, WebP, HEIC) et PDF, 10 Mo, 3 par
 * message. Le bucket `message-attachments` (migration 20261016101300) applique les mêmes
 * limites : ces constantes doivent rester d'accord avec lui.
 */

export const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments';

export const MESSAGE_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

export const MESSAGE_ATTACHMENT_MAX_COUNT = 3;

export const MESSAGE_ATTACHMENT_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'application/pdf'
] as const;

export type MessageAttachmentType = (typeof MESSAGE_ATTACHMENT_TYPES)[number];

/** Valeur de l'attribut `accept` du sélecteur de fichiers. */
export const MESSAGE_ATTACHMENT_ACCEPT = MESSAGE_ATTACHMENT_TYPES.join(',');

export function isMessageAttachmentType(type: string): type is MessageAttachmentType {
	return (MESSAGE_ATTACHMENT_TYPES as readonly string[]).includes(type);
}

/** Raison du refus d'un fichier, en français ; null s'il est accepté. */
export function messageAttachmentRefusal(file: { name: string; type: string; size: number }) {
	if (!isMessageAttachmentType(file.type)) {
		return `« ${file.name} » : seuls les images (JPEG, PNG, WebP, HEIC) et les PDF sont acceptés`;
	}
	if (file.size > MESSAGE_ATTACHMENT_MAX_SIZE) {
		return `« ${file.name} » dépasse 10 Mo`;
	}
	if (file.size <= 0) {
		return `« ${file.name} » est vide`;
	}
	return null;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * Forme EXACTE du chemin que le serveur choisit pour une pièce jointe :
 * `messages/<message>/<uuid>-<nom nettoyé par sanitizeForStorage>`. Seul un chemin de
 * cette forme est signé : la ligne `message_attachments_v2` est écrite par le navigateur,
 * et `%2e%2e` ou `\` dans un chemin signé sortaient du message, voire du bucket (audit de
 * #1256). La policy d'insertion exige la même forme (migration 20261016101400).
 */
export function isServerAttachmentPath(path: string, messageId: string): boolean {
	return new RegExp(`^messages/${messageId}/${UUID}-[A-Za-z0-9._-]{1,200}$`).test(path);
}
