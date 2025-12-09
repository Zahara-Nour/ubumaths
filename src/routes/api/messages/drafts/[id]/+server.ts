import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * GET /api/messages/drafts/[id]
 * Get a specific draft
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		const { data: draft, error: fetchError } = await supabase
			.from('message_drafts')
			.select('*')
			.eq('id', id)
			.eq('author_id', user.id)
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
	const id = validateUuidParam(params.id);
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		const { error: deleteError } = await supabase
			.from('message_drafts')
			.delete()
			.eq('id', id)
			.eq('author_id', user.id);

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
