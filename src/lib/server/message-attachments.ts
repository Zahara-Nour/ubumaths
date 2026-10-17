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
	isServerAttachmentPath,
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
			message: 'Pièce jointe réservée aux messages de leur auteur'
		};
	}

	const { count, error: countError } = await userClient
		.from('message_attachments_v2')
		.select('id', { count: 'exact', head: true })
		.eq('message_id', messageId);
	if (countError || count === null) {
		return { ok: false, status: 500, message: 'Pièces jointes illisibles' };
	}
	// Les lignes ne s'enregistrent qu'APRÈS le dépôt : compter aussi les fichiers déjà
	// présents, sinon on demanderait des liens et déposerait sans fin (audit de #1256).
	const { data: stored, error: listError } = await serviceClient.storage
		.from(MESSAGE_ATTACHMENT_BUCKET)
		.list(`messages/${messageId}`, { limit: MESSAGE_ATTACHMENT_MAX_COUNT + 1 });
	if (listError) {
		return { ok: false, status: 500, message: 'Pièces jointes illisibles' };
	}
	if (Math.max(count, stored?.length ?? 0) >= MESSAGE_ATTACHMENT_MAX_COUNT) {
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
		.select('storage_path, file_name, message_id')
		.eq('id', attachmentId)
		.maybeSingle();
	if (error) {
		throw new Error(`Pièce jointe illisible : ${error.message}`);
	}
	if (!attachment) return null;
	// Le chemin vient de la ligne, écrite par le navigateur : seule la forme que le
	// serveur produit est signée (sinon `%2e%2e` sortirait du message, voire du bucket).
	if (!isServerAttachmentPath(attachment.storage_path, attachment.message_id)) return null;

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

/** Fichiers retirés par passage : borne la durée du cron. */
const ORPHAN_SWEEP_LIMIT = 500;

/**
 * Retire du storage les fichiers de pièces jointes restés sans ligne en base depuis plus
 * d'un jour : message purgé (3 ans), pièce jointe retirée par l'expéditeur, envoi dont
 * l'enregistrement a échoué. Le SQL ne peut pas toucher au storage ; la liste vient de
 * `list_orphan_message_attachment_files` (service_role seul). Appelée par le cron du
 * dimanche (`src/routes/api/cron/deleted-account-files/+server.ts`).
 */
export async function sweepOrphanMessageAttachments(
	serviceClient: Client
): Promise<{ listed: number; removed: number; failed: boolean }> {
	const { data, error } = await serviceClient.rpc('list_orphan_message_attachment_files', {
		p_limit: ORPHAN_SWEEP_LIMIT
	});
	// Une lecture en panne ne doit pas passer pour « rien à retirer ».
	if (error) {
		throw new Error(`Fichiers orphelins illisibles : ${error.message}`);
	}
	const names = (data ?? []).map((row) => row.name);
	if (names.length === 0) return { listed: 0, removed: 0, failed: false };

	const { data: removed, error: removeError } = await serviceClient.storage
		.from(MESSAGE_ATTACHMENT_BUCKET)
		.remove(names);
	if (removeError) {
		return { listed: names.length, removed: 0, failed: true };
	}
	return { listed: names.length, removed: removed?.length ?? 0, failed: false };
}
