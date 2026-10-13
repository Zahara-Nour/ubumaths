import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateMessageSchema } from '$lib/server/validation/messages';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/messages/[id]/+server');

/**
 * GET /api/messages/[id]
 * Get a single message with full details
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;
	const messageId = validateUuidParam(params.id, 'messageId');

	try {
		// Get message details
		const { data: messages, error: fetchError } = await supabase.rpc('get_message_details', {
			p_message_id: messageId,
			p_user_id: user.id
		});

		if (fetchError) {
			logger.error('Error fetching message:', fetchError);

			// Check if it's a permission error
			if (fetchError.message?.includes('do not have access')) {
				throw error(403, 'Accès refusé à ce message');
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
		logger.error('Error in get message API:', err);
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
	const messageId = validateUuidParam(params.id, 'messageId');

	try {
		// SECURITY: Validate request body with Zod schema
		const body = await request.json();
		const validation = updateMessageSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		// Union discriminée : `validation.data` porte `status` ou `folderId` selon
		// l'action, et chaque branche du switch les voit réellement.
		const donnees = validation.data;

		switch (donnees.action) {
			case 'updateStatus': {
				// Zod schema already validated status exists and is valid
				const { error: statusError } = await supabase.rpc('update_message_status', {
					p_message_id: messageId,
					p_user_id: user.id,
					p_status: donnees.status
				});

				if (statusError) {
					logger.error('Error updating status:', statusError);
					throw error(500, 'Erreur lors de la mise à jour du statut');
				}
				break;
			}

			case 'toggleRead': {
				// Toggle read/unread status
				const { data: inboxEntry, error: inboxEntryError } = await supabase
					.from('message_inbox')
					.select('read_at')
					.eq('message_id', messageId)
					.eq('recipient_id', user.id)
					.single();

				// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
				// panne prenait le même visage et faisait conclure « rien ici », donc créer
				// par-dessus ce qu'on n'avait simplement pas su lire.
				if (inboxEntryError && inboxEntryError.code !== 'PGRST116') {
					logger.error('Lecture impossible :', inboxEntryError);
					throw error(500, 'Impossible de vérifier l’état actuel');
				}

				const newReadValue = inboxEntry?.read_at ? null : new Date().toISOString();

				// ⚠️ Une mise à jour refusée par la RLS ne lève aucune erreur : elle
				// touche zéro ligne. Sans les lignes rendues, on annonçait « lu » ou
				// « non lu » sans rien avoir changé (cf. docs/pratiques/rls-echecs-silencieux.md).
				const { data: updatedEntries, error: readError } = await supabase
					.from('message_inbox')
					.update({ read_at: newReadValue })
					.eq('message_id', messageId)
					.eq('recipient_id', user.id)
					.select('id');

				if (readError) {
					logger.error('Error toggling read:', readError);
					throw error(500, 'Erreur lors de la mise à jour du statut de lecture');
				}

				if (!updatedEntries || updatedEntries.length === 0) {
					// Pas d'entrée lue plus haut : le message n'est pas dans cette boîte.
					if (!inboxEntry) {
						throw error(404, 'Message absent de la boîte de réception');
					}
					logger.error('[toggleRead] Aucune ligne modifiée pour', messageId);
					throw error(403, 'Statut de lecture non modifié : droits insuffisants');
				}

				return json({ success: true, isRead: newReadValue !== null });
			}

			case 'toggleStar': {
				const { data: newStarValue, error: starError } = await supabase.rpc('toggle_message_star', {
					p_message_id: messageId,
					p_user_id: user.id
				});

				if (starError) {
					logger.error('Error toggling star:', starError);
					throw error(500, 'Erreur lors de la mise à jour du favori');
				}

				return json({ success: true, isStarred: newStarValue });
			}

			case 'moveToFolder': {
				// Zod schema already validated folderId exists
				const { error: folderError } = await supabase.rpc('move_message_to_folder', {
					p_message_id: messageId,
					p_user_id: user.id,
					p_folder_id: donnees.folderId
				});

				if (folderError) {
					logger.error('Error moving to folder:', folderError);
					throw error(500, 'Erreur lors du déplacement vers le dossier');
				}
				break;
			}
		}

		return json({ success: true });
	} catch (err) {
		logger.error('Error in update message API:', err);
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
	const messageId = validateUuidParam(params.id, 'messageId');

	try {
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
			// ⚠️ Un refus de la RLS touche zéro ligne sans erreur : on vérifie les
			// lignes rendues avant d'annoncer la suppression.
			const { data: updatedMessages, error: deleteError } = await supabase
				.from('private_messages')
				.update({ deleted_by_sender: true })
				.eq('id', messageId)
				.select('id');

			if (deleteError) {
				logger.error('Error deleting message:', deleteError);
				throw error(500, 'Erreur lors de la suppression du message');
			}

			// Le message a été lu juste au-dessus : zéro ligne = refus, pas absence.
			if (!updatedMessages || updatedMessages.length === 0) {
				logger.error('[DELETE message] Aucune ligne modifiée pour', messageId);
				throw error(403, 'Message non supprimé : droits insuffisants');
			}
		} else {
			// Recipient marking as deleted in their inbox
			const { data: updatedEntries, error: deleteError } = await supabase
				.from('message_inbox')
				.update({ deleted: true })
				.eq('message_id', messageId)
				.eq('recipient_id', user.id)
				.select('id');

			if (deleteError) {
				logger.error('Error deleting inbox entry:', deleteError);
				throw error(500, 'Erreur lors de la suppression du message');
			}

			// Zéro ligne : pas d'entrée de boîte de réception pour cet utilisateur
			// (ou entrée masquée par la RLS) — rien n'a été supprimé.
			if (!updatedEntries || updatedEntries.length === 0) {
				throw error(404, 'Message absent de la boîte de réception');
			}
		}

		return json({ success: true });
	} catch (err) {
		logger.error('Error in delete message API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
