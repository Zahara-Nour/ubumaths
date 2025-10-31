import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateMessageSchema } from '$lib/server/validation/messages';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * GET /api/messages/[id]
 * Get a single message with full details
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		const messageId = params.id;

		// Get message details
		const { data: messages, error: fetchError } = await supabase.rpc('get_message_details', {
			p_message_id: messageId,
			p_user_id: user.id
		});

		if (fetchError) {
			console.error('Error fetching message:', fetchError);

			// Check if it's a permission error
			if (fetchError.message?.includes('do not have access')) {
				throw error(403, "Vous n'avez pas accès à ce message");
			}

			throw error(500, 'Erreur lors de la récupération du message');
		}

		if (!messages || messages.length === 0) {
			throw error(404, 'Message non trouvé');
		}

		// Mark as read if recipient
		await supabase.rpc('mark_message_as_read', {
			p_message_id: messageId,
			p_user_id: user.id
		});

		return json({ message: messages[0] });
	} catch (err) {
		console.error('Error in get message API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};

/**
 * PATCH /api/messages/[id]
 * Update message status, folder, or star
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		const messageId = params.id;

		// SECURITY: Validate request body with Zod schema
		const body = await request.json();
		const validation = updateMessageSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { action, status, folderId } = validation.data;

		switch (action) {
			case 'updateStatus': {
				// Zod schema already validated status exists and is valid
				const { error: statusError } = await supabase.rpc('update_message_status', {
					p_message_id: messageId,
					p_user_id: user.id,
					p_status: status
				});

				if (statusError) {
					console.error('Error updating status:', statusError);
					throw error(500, 'Erreur lors de la mise à jour du statut');
				}
				break;
			}

			case 'toggleRead': {
				// Toggle read/unread status
				const { data: inboxEntry } = await supabase
					.from('message_inbox')
					.select('read_at')
					.eq('message_id', messageId)
					.eq('recipient_id', user.id)
					.single();

				const newReadValue = inboxEntry?.read_at ? null : new Date().toISOString();

				const { error: readError } = await supabase
					.from('message_inbox')
					.update({ read_at: newReadValue })
					.eq('message_id', messageId)
					.eq('recipient_id', user.id);

				if (readError) {
					console.error('Error toggling read:', readError);
					throw error(500, 'Erreur lors de la mise à jour du statut de lecture');
				}

				return json({ success: true, isRead: newReadValue !== null });
			}

			case 'toggleStar': {
				const { data: newStarValue, error: starError } = await supabase.rpc('toggle_message_star', {
					p_message_id: messageId,
					p_user_id: user.id
				});

				if (starError) {
					console.error('Error toggling star:', starError);
					throw error(500, 'Erreur lors de la mise à jour du favori');
				}

				return json({ success: true, isStarred: newStarValue });
			}

			case 'moveToFolder': {
				// Zod schema already validated folderId exists
				const { error: folderError } = await supabase.rpc('move_message_to_folder', {
					p_message_id: messageId,
					p_user_id: user.id,
					p_folder_id: folderId
				});

				if (folderError) {
					console.error('Error moving to folder:', folderError);
					throw error(500, 'Erreur lors du déplacement vers le dossier');
				}
				break;
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error in update message API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};

/**
 * DELETE /api/messages/[id]
 * Delete a message (soft delete for recipients, can be used by sender or moderator)
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		const messageId = params.id;

		// Check if user is sender (can mark as deleted_by_sender)
		const { data: message, error: checkError } = await supabase
			.from('private_messages')
			.select('sender_id')
			.eq('id', messageId)
			.single();

		if (checkError) {
			throw error(404, 'Message non trouvé');
		}

		if (message.sender_id === user.id) {
			// Sender deleting their sent message
			const { error: deleteError } = await supabase
				.from('private_messages')
				.update({ deleted_by_sender: true })
				.eq('id', messageId);

			if (deleteError) {
				console.error('Error deleting message:', deleteError);
				throw error(500, 'Erreur lors de la suppression du message');
			}
		} else {
			// Recipient marking as deleted in their inbox
			const { error: deleteError } = await supabase
				.from('message_inbox')
				.update({ deleted: true })
				.eq('message_id', messageId)
				.eq('recipient_id', user.id);

			if (deleteError) {
				console.error('Error deleting inbox entry:', deleteError);
				throw error(500, 'Erreur lors de la suppression du message');
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error in delete message API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
