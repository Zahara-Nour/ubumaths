import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMessageSchema } from '#lib/server/validation/messages.ts';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { requireConsent } from '#lib/server/middleware/consent.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { lore } from '#lib/config/lore.ts';

const logger = createServerLogger('api/messages/send/+server');

/**
 * POST /api/messages/send
 * Send a private message
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	requireConsent(profile, 'send_message');

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
		const { data: messageId, error: sendError } = await locals.supabase.rpc(
			'send_private_message',
			{
				p_sender_id: user.id,
				// `p_recipient_ids` est obligatoire (aucun DEFAULT côté SQL). Pour un
				// message de groupe la fonction l'ÉCRASE avec les élèves de la classe
				// (`SELECT array_agg(student_id) INTO p_recipient_ids`) : un tableau
				// vide y est donc strictement équivalent au NULL passé auparavant.
				// Le garde plus haut rejette déjà un envoi individuel sans destinataire :
				// `?? []` ne peut donc s'appliquer qu'au cas groupe, où la fonction
				// écrase de toute façon le paramètre.
				p_recipient_ids: isGroupMessage ? [] : (recipientIds ?? []),
				// Les suivants sont `DEFAULT NULL` côté SQL, donc optionnels dans les
				// types générés : les omettre applique le même défaut que NULL.
				p_subject: subject.trim(),
				p_content: content,
				p_is_group_message: isGroupMessage || false,
				p_class_id: classId || undefined,
				p_parent_message_id: parentMessageId || undefined
			}
		);

		if (sendError) {
			logger.error('Error sending message:', sendError);
			// Les refus de la base sont en anglais : jamais rendus tels quels
			if (sendError.code === 'P0002') {
				throw error(
					400,
					`Ce ${lore.entities.class} n'a aucun ${lore.entities.student} actif : personne à qui écrire.`
				);
			}
			if (sendError.code === '42501' || sendError.message?.includes('do not have permission')) {
				throw error(
					403,
					isGroupMessage
						? `Vous ne pouvez pas écrire à ce ${lore.entities.class}.`
						: 'Vous ne pouvez pas écrire à ce destinataire.'
				);
			}
			throw error(500, "Erreur lors de l'envoi du message");
		}

		return Response.json({ success: true, messageId });
	} catch (err) {
		logger.error('Error in send message API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, "Erreur serveur lors de l'envoi du message");
	}
};
