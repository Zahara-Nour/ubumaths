import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/messages/drafts
 * Get all drafts for the current user
 */
export const GET: RequestHandler = async ({ locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const { data: drafts, error: fetchError } = await supabase
			.from('message_drafts')
			.select('*')
			.eq('author_id', session.user.id)
			.order('updated_at', { ascending: false });

		if (fetchError) {
			console.error('Error fetching drafts:', fetchError);
			throw error(500, 'Erreur lors de la récupération des brouillons');
		}

		return json({ drafts: drafts || [] });
	} catch (err) {
		console.error('Error in drafts API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};

/**
 * POST /api/messages/drafts
 * Create or update a draft
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const body = await request.json();
		const { id, subject, content, recipientIds, isGroupMessage, classId, replyingToMessageId } =
			body;

		if (id) {
			// Update existing draft
			const { data: draft, error: updateError } = await supabase
				.from('message_drafts')
				.update({
					subject,
					content,
					recipient_ids: recipientIds,
					is_group_message: isGroupMessage || false,
					class_id: classId || null,
					replying_to_message_id: replyingToMessageId || null
				})
				.eq('id', id)
				.eq('author_id', session.user.id)
				.select()
				.single();

			if (updateError) {
				console.error('Error updating draft:', updateError);
				throw error(500, 'Erreur lors de la mise à jour du brouillon');
			}

			return json({ draft });
		} else {
			// Create new draft
			const { data: draft, error: createError } = await supabase
				.from('message_drafts')
				.insert({
					author_id: session.user.id,
					subject,
					content,
					recipient_ids: recipientIds,
					is_group_message: isGroupMessage || false,
					class_id: classId || null,
					replying_to_message_id: replyingToMessageId || null
				})
				.select()
				.single();

			if (createError) {
				console.error('Error creating draft:', createError);
				throw error(500, 'Erreur lors de la création du brouillon');
			}

			return json({ draft });
		}
	} catch (err) {
		console.error('Error in save draft API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
