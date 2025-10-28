import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessageSchema } from '$lib/server/validation/messages';
import { invalidateCache, CACHE_KEYS } from '$lib/server/cache';

/**
 * POST /api/messages/send
 * Send a private message
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// ✅ SECURITY: Validate input with Zod
		const body = await request.json();
		const validation = sendMessageSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { recipientIds, subject, content, isGroupMessage, classId, parentMessageId } =
			validation.data;

		// Additional business logic validation
		if (!isGroupMessage && (!recipientIds || recipientIds.length === 0)) {
			throw error(400, 'Au moins un destinataire est requis');
		}

		if (isGroupMessage && !classId) {
			throw error(400, "L'ID de la classe est requis pour un message de groupe");
		}

		// Call database function to send message
		const { data: messageId, error: sendError } = await supabase.rpc('send_private_message', {
			p_sender_id: user.id,
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

		// Invalidate activity cache for recipients (fire-and-forget)
		// Note: recipientIds contains actual recipients even for group messages (expanded by RPC)
		if (recipientIds && recipientIds.length > 0) {
			Promise.all(
				recipientIds.map((recipientId) => invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(recipientId)))
			).catch((err) => {
				console.error('[Cache] Failed to invalidate activity cache after message send:', err);
			});
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
