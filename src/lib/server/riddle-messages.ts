/**
 * Riddle Message Creation Utilities
 * Handles automatic message creation for manual riddle validation
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { invalidateCache, CACHE_KEYS } from './cache';

/**
 * Create a message to teacher requesting validation of a riddle answer
 */
export async function createRiddleValidationMessage(
	supabase: SupabaseClient,
	data: {
		attemptId: string;
		riddleId: string;
		riddleNumber: number;
		riddleTitle: string;
		studentId: string;
		studentName: string;
		teacherId: string;
	}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
	try {
		// Construct validation link
		const validationLink = `/dashboard/teacher/riddles/validations/${data.attemptId}`;

		// Create subject
		const subject = `Validation énigme #${data.riddleNumber} - ${data.studentName}`;

		// Create body with HTML formatting
		const body = `
			<p>L'élève <strong>${data.studentName}</strong> demande la validation de sa réponse pour l'énigme <strong>#${data.riddleNumber} "${data.riddleTitle}"</strong>.</p>
			<p>Cliquez sur le lien ci-dessous pour voir la réponse et la valider :</p>
			<p><a href="${validationLink}" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Voir et valider la réponse</a></p>
		`.trim();

		// Create message
		const { data: message, error: messageError } = await supabase
			.from('private_messages')
			.insert({
				sender_id: data.studentId,
				recipient_id: data.teacherId,
				subject,
				body,
				trigger_type: 'enigma_answer',
				trigger_metadata: {
					attempt_id: data.attemptId,
					riddle_id: data.riddleId,
					riddle_number: data.riddleNumber,
					riddle_title: data.riddleTitle
				}
			})
			.select('id')
			.single();

		if (messageError) {
			console.error('Error creating validation message:', messageError);
			return { success: false, error: messageError.message };
		}

		// Invalidate activity cache for teacher (fire-and-forget)
		invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(data.teacherId)).catch((err) => {
			console.error('[Cache] Failed to invalidate activity cache after riddle message:', err);
		});

		return { success: true, messageId: message.id };
	} catch (error) {
		console.error('Error in createRiddleValidationMessage:', error);
		return { success: false, error: String(error) };
	}
}

/**
 * Get teacher ID for a riddle (creator)
 */
export async function getRiddleTeacherId(
	supabase: SupabaseClient,
	riddleId: string
): Promise<string | null> {
	const { data: riddle, error } = await supabase
		.from('riddles')
		.select('created_by')
		.eq('id', riddleId)
		.single();

	if (error || !riddle) {
		console.error('Error fetching riddle teacher:', error);
		return null;
	}

	return riddle.created_by;
}

/**
 * Send validation notification to student after teacher validates
 */
export async function sendValidationResultMessage(
	supabase: SupabaseClient,
	data: {
		studentId: string;
		teacherId: string;
		riddleNumber: number;
		riddleTitle: string;
		isCorrect: boolean;
		gidouillesAwarded: number;
		feedback?: string;
	}
): Promise<{ success: boolean; error?: string }> {
	try {
		const subject = `Réponse ${data.isCorrect ? 'validée' : 'refusée'} - Énigme #${data.riddleNumber}`;

		let body = `
			<p>Votre professeur a évalué votre réponse pour l'énigme <strong>#${data.riddleNumber} "${data.riddleTitle}"</strong>.</p>
		`;

		if (data.isCorrect) {
			body += `
				<p style="color: #10b981; font-weight: bold;">✓ Votre réponse a été validée !</p>
				<p>Vous avez gagné <strong>${data.gidouillesAwarded} gidouilles</strong>.</p>
			`;
		} else {
			body += `
				<p style="color: #ef4444; font-weight: bold;">✗ Votre réponse n'a pas été validée.</p>
				<p>Vous pouvez réessayer avec une récompense réduite.</p>
			`;
		}

		if (data.feedback) {
			body += `
				<p><strong>Commentaire du professeur :</strong></p>
				<p style="padding: 10px; background-color: #f3f4f6; border-left: 3px solid #3b82f6;">${data.feedback}</p>
			`;
		}

		body = body.trim();

		const { error: messageError } = await supabase.from('private_messages').insert({
			sender_id: data.teacherId,
			recipient_id: data.studentId,
			subject,
			body,
			trigger_type: 'system_notification'
		});

		if (messageError) {
			console.error('Error sending validation result:', messageError);
			return { success: false, error: messageError.message };
		}

		// Invalidate activity cache for student (fire-and-forget)
		invalidateCache(CACHE_KEYS.ACTIVITY_COUNTS(data.studentId)).catch((err) => {
			console.error('[Cache] Failed to invalidate activity cache after validation result:', err);
		});

		return { success: true };
	} catch (error) {
		console.error('Error in sendValidationResultMessage:', error);
		return { success: false, error: String(error) };
	}
}
