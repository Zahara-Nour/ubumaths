import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchMessagesQuerySchema } from '$lib/server/validation/messages';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * GET /api/messages/search?q=query&searchIn=all&hasAttachments=true&senderName=...&dateFrom=...&dateTo=...
 * Search private messages with full-text search and filters
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		// SECURITY: Validate query parameters with Zod schema
		const queryParams = Object.fromEntries(url.searchParams);
		const validation = searchMessagesQuerySchema.safeParse(queryParams);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const {
			q,
			searchIn = 'all',
			hasAttachments,
			senderName,
			dateFrom,
			dateTo,
			limit,
			offset
		} = validation.data;

		// Call database function
		const { data: messages, error: searchError } = await supabase.rpc('search_private_messages', {
			p_user_id: user.id,
			p_query: q,
			p_search_in: searchIn,
			p_has_attachments: hasAttachments ?? null,
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

		return json({ messages: messages || [], query: q, total: messages?.length || 0 });
	} catch (err) {
		console.error('Error in search API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
