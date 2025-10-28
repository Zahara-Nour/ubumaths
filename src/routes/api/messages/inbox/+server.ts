import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { inboxMessagesResponseSchema } from '$lib/server/validation/messages';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

/**
 * GET /api/messages/inbox
 * Get inbox messages for the current user
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Get query parameters
		const status = url.searchParams.get('status') || 'inbox';
		const folderId = url.searchParams.get('folderId');
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		// Validate status
		if (!['inbox', 'archived', 'trash'].includes(status)) {
			throw error(400, 'Statut invalide');
		}

		// Call database function
		const { data: messages, error: fetchError } = await supabase.rpc('get_user_inbox', {
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
