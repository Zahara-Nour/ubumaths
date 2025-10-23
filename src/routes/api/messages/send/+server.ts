import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/messages/send
 * Send a private message
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const session = await locals.safeGetSession();

	if (!session) {
		throw error(401, 'Non authentifié');
	}

	try {
		const body = await request.json();
		const { recipientIds, subject, content, isGroupMessage, classId, parentMessageId } = body;

		// Validation
		if (!subject || subject.trim().length === 0) {
			throw error(400, 'Le sujet est requis');
		}

		if (!content) {
			throw error(400, 'Le contenu est requis');
		}

		if (!isGroupMessage && (!recipientIds || recipientIds.length === 0)) {
			throw error(400, 'Au moins un destinataire est requis');
		}

		if (isGroupMessage && !classId) {
			throw error(400, "L'ID de la classe est requis pour un message de groupe");
		}

		// Call database function to send message
		const { data: messageId, error: sendError } = await supabase.rpc('send_private_message', {
			p_sender_id: session.user.id,
			p_recipient_ids: isGroupMessage ? null : recipientIds,
			p_subject: subject.trim(),
			p_content: content,
			p_is_group_message: isGroupMessage || false,
			p_class_id: classId || null,
			p_parent_message_id: parentMessageId || null
		});

		if (sendError) {
			console.error('Error sending message:', sendError);
			throw error(500, sendError.message || "Erreur lors de l'envoi du message");
		}

		return json({ success: true, messageId });
	} catch (err) {
		console.error('Error in send message API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, "Erreur serveur lors de l'envoi du message");
	}
};
