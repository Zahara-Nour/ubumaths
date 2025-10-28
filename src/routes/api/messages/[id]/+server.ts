import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateCache, CACHE_KEYS } from '$lib/server/cache';

/**
 * GET /api/messages/[id]
 * Get a single message with full details
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const messageId = params.id;

		// Get message details
		const { data: messages, error: fetchError } = await supabase.rpc('get_message_details', {
			p_message_id: messageId,
			p_user_id: session.user.id
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
		const { data: wasMarked } = await supabase.rpc('mark_message_as_read', {
			p_message_id: messageId,
			p_user_id: session.user.id
		});

		// Invalidate activity cache if message was newly marked as read (fire-and-forget)
		if (wasMarked) {
			invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(session.user.id)).catch((err) => {
				console.error(
					'[Cache] Failed to invalidate activity cache after marking message read:',
					err
				);
			});
		}

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
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const messageId = params.id;
		const body = await request.json();
		const { action, status, folderId } = body;

		if (!action) {
			throw error(400, 'Action requise');
		}

		switch (action) {
			case 'updateStatus': {
				if (!status || !['inbox', 'archived', 'trash'].includes(status)) {
					throw error(400, 'Statut invalide');
				}

				const { error: statusError } = await supabase.rpc('update_message_status', {
					p_message_id: messageId,
					p_user_id: session.user.id,
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
					.eq('recipient_id', session.user.id)
					.single();

				const newReadValue = inboxEntry?.read_at ? null : new Date().toISOString();

				const { error: readError } = await supabase
					.from('message_inbox')
					.update({ read_at: newReadValue })
					.eq('message_id', messageId)
					.eq('recipient_id', session.user.id);

				if (readError) {
					console.error('Error toggling read:', readError);
					throw error(500, 'Erreur lors de la mise à jour du statut de lecture');
				}

				// Invalidate activity cache when toggling read status (fire-and-forget)
				invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(session.user.id)).catch((err) => {
					console.error('[Cache] Failed to invalidate activity cache after toggling read:', err);
				});

				return json({ success: true, isRead: newReadValue !== null });
			}

			case 'toggleStar': {
				const { data: newStarValue, error: starError } = await supabase.rpc('toggle_message_star', {
					p_message_id: messageId,
					p_user_id: session.user.id
				});

				if (starError) {
					console.error('Error toggling star:', starError);
					throw error(500, 'Erreur lors de la mise à jour du favori');
				}

				return json({ success: true, isStarred: newStarValue });
			}

			case 'moveToFolder': {
				if (!folderId) {
					throw error(400, 'ID du dossier requis');
				}

				const { error: folderError } = await supabase.rpc('move_message_to_folder', {
					p_message_id: messageId,
					p_user_id: session.user.id,
					p_folder_id: folderId
				});

				if (folderError) {
					console.error('Error moving to folder:', folderError);
					throw error(500, 'Erreur lors du déplacement vers le dossier');
				}
				break;
			}

			default:
				throw error(400, 'Action invalide');
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
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

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

		if (message.sender_id === session.user.id) {
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
				.eq('recipient_id', session.user.id);

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
