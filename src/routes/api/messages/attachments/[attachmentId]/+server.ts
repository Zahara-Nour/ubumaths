/**
 * GET /api/messages/attachments/[attachmentId]
 * =============================================
 * Ouvre une pièce jointe de la messagerie : redirige vers un lien signé d'une heure.
 * AUTH : la RLS de `message_attachments_v2` décide (expéditeur, destinataire qui n'a pas
 * supprimé le message, admin) ; sinon 404, sans dire si la pièce jointe existe.
 * Voir `src/lib/server/message-attachments.ts`.
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { getAttachmentDownloadUrl } from '$lib/server/message-attachments';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/messages/attachments/[attachmentId]/+server');

export const GET: RequestHandler = async ({ params, locals }) => {
	await requireAuth(locals);
	const attachmentId = validateUuidParam(params.attachmentId, 'attachmentId');

	let url: string | null;
	try {
		url = await getAttachmentDownloadUrl(locals.supabase, createServiceRoleClient(), attachmentId);
	} catch (err) {
		logger.error('[messages] Pièce jointe illisible :', err);
		throw error(500, 'Pièce jointe indisponible');
	}
	if (!url) {
		throw error(404, 'Pièce jointe introuvable');
	}
	// Le lien porte un jeton d'une heure : jamais de cache partagé ni de Referer.
	return new Response(null, {
		status: 303,
		headers: {
			location: url,
			'cache-control': 'private, no-store',
			'referrer-policy': 'no-referrer'
		}
	});
};
