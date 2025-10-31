import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	inboxMessagesResponseSchema,
	inboxMessagesQuerySchema
} from '$lib/server/validation/messages';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * GET /api/messages/inbox
 * Get inbox messages for the current user
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);

	try {
		// ✅ SECURITY: Validate query parameters with Zod
		const validation = inboxMessagesQuerySchema.safeParse({
			status: url.searchParams.get('status'),
			folderId: url.searchParams.get('folderId'),
			limit: url.searchParams.get('limit'),
			offset: url.searchParams.get('offset')
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { status, folderId, limit, offset } = validation.data;

		// Call database function
		const { data: messages, error: fetchError } = await locals.supabase.rpc('get_user_inbox', {
			p_user_id: user.id,
			p_status: status,
			p_folder_id: folderId || null,
			p_limit: limit,
			p_offset: offset
		});

		if (fetchError) {
			console.error('Error fetching inbox:', fetchError);
			throw error(500, 'Erreur lors de la récupération de la boîte de réception');
		}

		// Validate response
		const validated = validateJsonResponse(
			inboxMessagesResponseSchema,
			{ messages: messages || [] },
			'GET /api/messages/inbox'
		);

		return json(validated);
	} catch (err) {
		console.error('Error in inbox API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
