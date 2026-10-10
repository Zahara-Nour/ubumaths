import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	messageThreadResponseSchema,
	threadMessagesQuerySchema
} from '$lib/server/validation/messages';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * GET /api/messages/thread?rootId=xxx
 * Get all messages in a thread
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		// ✅ SECURITY: Validate query parameters with Zod
		const validation = threadMessagesQuerySchema.safeParse({
			rootId: url.searchParams.get('rootId')
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { rootId } = validation.data;

		// Get thread messages
		const { data: messages, error: fetchError } = await supabase.rpc('get_message_thread', {
			p_thread_root_id: rootId,
			p_user_id: user.id
		});

		if (fetchError) {
			console.error('Error fetching thread:', fetchError);

			if (fetchError.message?.includes('do not have access')) {
				throw error(403, "Vous n'avez pas accès à ce fil de discussion");
			}

			throw error(500, 'Erreur lors de la récupération du fil de discussion');
		}

		// get_message_thread donne l'ordre et le niveau mais ni le rôle de
		// l'expéditeur ni les pièces jointes : get_message_details les complète,
		// message par message (mêmes droits : l'appelant a envoyé ou reçu chacun).
		const threadRows = messages ?? [];
		const detailed = await Promise.all(
			threadRows.map(async (row) => {
				const { data: details, error: detailsError } = await supabase.rpc('get_message_details', {
					p_message_id: row.message_id,
					p_user_id: user.id
				});
				// Seul l'admin reçoit de get_message_thread des messages qu'il n'a ni
				// envoyés ni reçus, que get_message_details lui refuse : ils sont
				// écartés, la règle « envoyé ou reçu » vaut ainsi pour tous.
				if (detailsError?.message?.includes('do not have access')) return null;
				// Toute autre erreur : jamais un fil partiel
				if (detailsError || !details?.[0]) {
					console.error('Error fetching thread message details:', detailsError);
					throw error(500, 'Erreur lors de la récupération du fil de discussion');
				}
				const detail = details[0];
				return {
					id: row.message_id,
					sender_id: row.sender_id,
					sender_name: row.sender_name,
					sender_avatar_url: row.sender_avatar_url,
					sender_role: detail.sender_role,
					subject: row.subject,
					content: row.content,
					sent_at: row.sent_at,
					edited_at: row.edited_at,
					parent_message_id: row.parent_message_id,
					level: row.level,
					attachments: detail.attachments
				};
			})
		);

		// Validate response
		const validated = validateJsonResponse(
			messageThreadResponseSchema,
			{ messages: detailed.filter((message) => message !== null) },
			'GET /api/messages/thread'
		);

		return json(validated);
	} catch (err) {
		console.error('Error in thread API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
