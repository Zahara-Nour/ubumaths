import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/messages/sent
 * Get sent messages for the current user
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Get query parameters
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		// Call database function
		const { data: messages, error: fetchError } = await supabase.rpc('get_user_sent_messages', {
			p_user_id: session.user.id,
			p_limit: limit,
			p_offset: offset
		});

		if (fetchError) {
			console.error('Error fetching sent messages:', fetchError);
			throw error(500, 'Erreur lors de la récupération des messages envoyés');
		}

		return json({ messages: messages || [] });
	} catch (err) {
		console.error('Error in sent messages API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
