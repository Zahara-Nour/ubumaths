import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/messages/search?q=query&searchIn=all&hasAttachments=true&senderName=...&dateFrom=...&dateTo=...
 * Search private messages with full-text search and filters
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Get query parameters
		const query = url.searchParams.get('q');
		const searchIn = url.searchParams.get('searchIn') || 'all';
		const hasAttachments = url.searchParams.get('hasAttachments');
		const senderName = url.searchParams.get('senderName');
		const dateFrom = url.searchParams.get('dateFrom');
		const dateTo = url.searchParams.get('dateTo');
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);

		if (!query || query.trim().length === 0) {
			throw error(400, 'Requête de recherche vide');
		}

		// Validate searchIn parameter
		if (!['inbox', 'sent', 'all'].includes(searchIn)) {
			throw error(400, 'Paramètre searchIn invalide');
		}

		// Call database function
		const { data: messages, error: searchError } = await supabase.rpc('search_private_messages', {
			p_user_id: user.id,
			p_query: query.trim(),
			p_search_in: searchIn,
			p_has_attachments:
				hasAttachments === 'true' ? true : hasAttachments === 'false' ? false : null,
			p_sender_name: senderName || null,
			p_date_from: dateFrom || null,
			p_date_to: dateTo || null,
			p_limit: limit,
			p_offset: offset
		});

		if (searchError) {
			console.error('Error searching messages:', searchError);
			throw error(500, 'Erreur lors de la recherche de messages');
		}

		return json({ messages: messages || [], query, total: messages?.length || 0 });
	} catch (err) {
		console.error('Error in search API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
