/**
 * Pièces jointes de la messagerie : liens d'envoi et de lecture
 * ==============================================================
 *
 * Le bucket `message-attachments` est privé et n'a AUCUNE policy de storage : seul le
 * client service y dépose et en signe les liens. L'accès est décidé ici, avec le client
 * de l'utilisateur (sa RLS) :
 *   - envoi : l'utilisateur est l'expéditeur du message (`private_messages.sender_id`) ;
 *   - lecture : la RLS de `message_attachments_v2` lui rend la ligne (expéditeur,
 *     destinataire qui ne l'a pas supprimé, admin).
 * Décision de David (2026-10-13), migration 20261016101300.
 */
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { sanitizeForStorage } from '$lib/utils/filename';
import {
	MESSAGE_ATTACHMENT_BUCKET,
	MESSAGE_ATTACHMENT_MAX_COUNT,
	MESSAGE_ATTACHMENT_MAX_SIZE,
	MESSAGE_ATTACHMENT_TYPES
} from '$lib/utils/message-attachment-rules';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;

export type UploadUrlResult =
	| { ok: true; path: string; token: string }
	| { ok: false; status: 403 | 409 | 500; message: string };

// ============================================================================
// CONSTANTES
// ============================================================================

/** Durée de vie d'un lien de lecture (décision de David : environ une heure). */
export const DOWNLOAD_URL_TTL_SECONDS = 3600;

export const attachmentUploadRequestSchema = z.object({
	file_name: z.string().trim().min(1, 'Nom de fichier vide').max(255, 'Nom de fichier trop long'),
	file_type: z.enum(MESSAGE_ATTACHMENT_TYPES, {
		message: 'Seuls les images (JPEG, PNG, WebP, HEIC) et les PDF sont acceptés'
	}),
	file_size: z
		.number()
		.int()
		.positive('Fichier vide')
		.max(MESSAGE_ATTACHMENT_MAX_SIZE, 'Le fichier dépasse 10 Mo')
});

export type AttachmentUploadRequest = z.infer<typeof attachmentUploadRequestSchema>;

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Lien d'envoi à usage unique pour une pièce jointe d'un message de l'utilisateur.
 * Le chemin est choisi ici, rangé sous le message : c'est lui que la policy d'insertion
 * de `message_attachments_v2` exige, et que la suppression de compte retire.
 */
export async function createAttachmentUploadUrl(
	userClient: Client,
	serviceClient: Client,
	userId: string,
	messageId: string,
	request: AttachmentUploadRequest
): Promise<UploadUrlResult> {
	const { data: message, error: messageError } = await userClient
		.from('private_messages')
		.select('id')
		.eq('id', messageId)
		.eq('sender_id', userId)
		.maybeSingle();
	if (messageError) {
		return { ok: false, status: 500, message: 'Message illisible' };
	}
	if (!message) {
		return {
			ok: false,
			status: 403,
			message: 'Vous ne pouvez joindre un fichier qu’à vos messages'
		};
	}

	const { count, error: countError } = await userClient
		.from('message_attachments_v2')
		.select('id', { count: 'exact', head: true })
		.eq('message_id', messageId);
	if (countError || count === null) {
		return { ok: false, status: 500, message: 'Pièces jointes illisibles' };
	}
	if (count >= MESSAGE_ATTACHMENT_MAX_COUNT) {
		return { ok: false, status: 409, message: '3 pièces jointes au plus par message' };
	}

	const path = `messages/${messageId}/${crypto.randomUUID()}-${sanitizeForStorage(request.file_name)}`;
	const { data, error } = await serviceClient.storage
		.from(MESSAGE_ATTACHMENT_BUCKET)
		.createSignedUploadUrl(path);
	if (error || !data) {
		return { ok: false, status: 500, message: 'Envoi du fichier impossible' };
	}
	return { ok: true, path: data.path, token: data.token };
}

/**
 * Lien de lecture temporaire d'une pièce jointe, ou null si l'utilisateur ne la voit
 * pas (la RLS de `message_attachments_v2` ne lui rend pas la ligne).
 */
export async function getAttachmentDownloadUrl(
	userClient: Client,
	serviceClient: Client,
	attachmentId: string
): Promise<string | null> {
	const { data: attachment, error } = await userClient
		.from('message_attachments_v2')
		.select('storage_path, file_name')
		.eq('id', attachmentId)
		.maybeSingle();
	if (error) {
		throw new Error(`Pièce jointe illisible : ${error.message}`);
	}
	if (!attachment) return null;

	const { data, error: signError } = await serviceClient.storage
		.from(MESSAGE_ATTACHMENT_BUCKET)
		.createSignedUrl(attachment.storage_path, DOWNLOAD_URL_TTL_SECONDS, {
			download: attachment.file_name
		});
	if (signError || !data) {
		throw new Error(`Lien de lecture impossible : ${signError?.message ?? 'inconnu'}`);
	}
	return data.signedUrl;
}
