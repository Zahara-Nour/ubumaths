import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/messages/drafts/[id]
 * Get a specific draft
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const { data: draft, error: fetchError } = await supabase
			.from('message_drafts')
			.select('*')
			.eq('id', params.id)
			.eq('author_id', session.user.id)
			.single();

		if (fetchError) {
			console.error('Error fetching draft:', fetchError);
			throw error(404, 'Brouillon non trouvé');
		}

		return json({ draft });
	} catch (err) {
		console.error('Error in get draft API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};

/**
 * DELETE /api/messages/drafts/[id]
 * Delete a draft
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const { error: deleteError } = await supabase
			.from('message_drafts')
			.delete()
			.eq('id', params.id)
			.eq('author_id', session.user.id);

		if (deleteError) {
			console.error('Error deleting draft:', deleteError);
			throw error(500, 'Erreur lors de la suppression du brouillon');
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error in delete draft API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
