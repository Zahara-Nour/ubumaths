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

		// Validate response
		const validated = validateJsonResponse(
			messageThreadResponseSchema,
			{ messages: messages || [] },
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
