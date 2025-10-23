import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/messages/thread?rootId=xxx
 * Get all messages in a thread
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const rootId = url.searchParams.get('rootId');

		if (!rootId) {
			throw error(400, 'ID du message racine requis');
		}

		// Get thread messages
		const { data: messages, error: fetchError } = await supabase.rpc('get_message_thread', {
			p_thread_root_id: rootId,
			p_user_id: session.user.id
		});

		if (fetchError) {
			console.error('Error fetching thread:', fetchError);

			if (fetchError.message?.includes('do not have access')) {
				throw error(403, "Vous n'avez pas accès à ce fil de discussion");
			}

			throw error(500, 'Erreur lors de la récupération du fil de discussion');
		}

		return json({ messages: messages || [] });
	} catch (err) {
		console.error('Error in thread API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
