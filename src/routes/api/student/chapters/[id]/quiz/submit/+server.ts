/**
 * POST /api/student/chapters/[id]/quiz/submit
 * =============================================
 *
 * Submit an answer to a chapter quiz question.
 *
 * CRITICAL: This endpoint triggers SRS (Spaced Repetition System) integration!
 * When a student answers a quiz question, if the question template is in their
 * SRS deck, the card's review schedule will be updated based on the result.
 *
 * AUTH: Any authenticated user (RLS handles access control)
 *
 * PARAMS:
 * - id: Chapter UUID (for context validation)
 *
 * BODY:
 * {
 *   quizQuestionId: string (UUID of the chapter_quiz_question),
 *   isCorrect: boolean,
 *   timeSpentSeconds: number (0-86400),
 *   submittedAnswer?: string (optional, for recording)
 * }
 *
 * RESPONSE:
 * {
 *   result: ChapterQuizResult
 * }
 *
 * SRS INTEGRATION:
 * - If student has the question template in their SRS deck, the card stats are updated
 * - Correct answer = Grade.GOOD (card scheduled for later review)
 * - Incorrect answer = Grade.AGAIN (card scheduled for sooner review)
 * - SRS errors are logged but don't fail the quiz submission
 *
 * SECURITY:
 * - Authenticated users only
 * - RLS ensures quiz question belongs to a visible chapter in student's class
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { submitQuizAnswer } from '$lib/server/chapters';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * Path parameters schema
 */
const paramsSchema = z.object({
	id: uuidSchema
});

/**
 * Request body schema
 */
const bodySchema = z.object({
	quizQuestionId: uuidSchema.describe('ID de la question du quiz'),
	isCorrect: z.boolean(),
	timeSpentSeconds: z
		.number()
		.int('Le temps doit etre un entier')
		.min(0, 'Le temps ne peut pas etre negatif')
		.max(86400, 'Le temps est trop eleve (max 24h)'),
	submittedAnswer: z
		.string()
		.trim()
		.max(5000, 'La reponse est trop longue (max 5000 caracteres)')
		.optional()
		.default('')
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
	// Authenticate user
	const { user, profile } = await requireAuth(locals);
	requireConsent(profile, 'submit_exercise');

	// Validate chapter ID parameter (for context, though main validation is on quizQuestionId)
	const paramsValidation = paramsSchema.safeParse(params);
	if (!paramsValidation.success) {
		throw error(400, paramsValidation.error.issues[0].message);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const bodyValidation = bodySchema.safeParse(body);
	if (!bodyValidation.success) {
		throw error(400, bodyValidation.error.issues[0].message);
	}

	const { quizQuestionId, isCorrect, timeSpentSeconds, submittedAnswer } = bodyValidation.data;

	try {
		// Submit the quiz answer (includes SRS integration)
		const result = await submitQuizAnswer(
			user.id,
			quizQuestionId,
			isCorrect,
			timeSpentSeconds,
			locals.supabase,
			submittedAnswer
		);

		if (result.error) {
			// Check for common errors
			if (result.error.message.includes('not found') || result.error.message.includes('PGRST116')) {
				throw error(404, 'Quiz question not found');
			}
			console.error('[API] Error submitting quiz answer:', result.error);
			throw error(500, 'Failed to submit quiz answer');
		}

		if (!result.data) {
			throw error(500, 'Failed to create quiz result');
		}

		return json({
			result: result.data
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in POST /api/student/chapters/[id]/quiz/submit:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
