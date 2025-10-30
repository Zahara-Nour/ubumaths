import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	sentMessagesResponseSchema,
	sentMessagesQuerySchema
} from '$lib/server/validation/messages';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

/**
 * GET /api/messages/sent
 * Get sent messages for the current user
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// ✅ SECURITY: Validate query parameters with Zod
		const validation = sentMessagesQuerySchema.safeParse({
			limit: url.searchParams.get('limit'),
			offset: url.searchParams.get('offset')
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { limit, offset } = validation.data;

		// Call database function
		const { data: messages, error: fetchError } = await supabase.rpc('get_user_sent_messages', {
			p_user_id: user.id,
			p_limit: limit,
			p_offset: offset
		});

		if (fetchError) {
			console.error('Error fetching sent messages:', fetchError);
			throw error(500, 'Erreur lors de la récupération des messages envoyés');
		}

		// Validate response
		const validated = validateJsonResponse(
			sentMessagesResponseSchema,
			{ messages: messages || [] },
			'GET /api/messages/sent'
		);

		return json(validated);
	} catch (err) {
		console.error('Error in sent messages API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
