import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/messages/unread-count
 * Get count of unread private messages for the current user
 */
export const GET: RequestHandler = async ({ locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const { data: count, error: fetchError } = await supabase.rpc(
			'get_private_messages_unread_count',
			{
				p_user_id: session.user.id
			}
		);

		if (fetchError) {
			console.error('Error fetching unread count:', fetchError);
			throw error(500, 'Erreur lors de la récupération du compteur de messages non lus');
		}

		return json({ unreadCount: count || 0 });
	} catch (err) {
		console.error('Error in unread count API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
