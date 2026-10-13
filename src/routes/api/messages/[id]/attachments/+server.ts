/**
 * POST /api/messages/[id]/attachments
 * ====================================
 * Lien d'envoi à usage unique pour une pièce jointe d'un message de la messagerie.
 * AUTH : l'expéditeur du message (vérifié avec sa RLS). Le navigateur dépose ensuite le
 * fichier directement dans le storage (Vercel refuse les corps de plus de 4,5 Mo), puis
 * enregistre la ligne `message_attachments_v2` sous le chemin rendu ici.
 * Voir `src/lib/server/message-attachments.ts`.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import {
	attachmentUploadRequestSchema,
	createAttachmentUploadUrl
} from '$lib/server/message-attachments';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireAuth(locals);
	const messageId = validateUuidParam(params.id, 'messageId');

	const body = await request.json().catch(() => null);
	const validation = attachmentUploadRequestSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const result = await createAttachmentUploadUrl(
		locals.supabase,
		createServiceRoleClient(),
		user.id,
		messageId,
		validation.data
	);
	if (!result.ok) {
		throw error(result.status, result.message);
	}
	return json({ path: result.path, token: result.token });
};
