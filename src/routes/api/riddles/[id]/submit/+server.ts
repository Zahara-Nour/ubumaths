import type { RequestHandler } from './$types';
import type { AnswerConfig } from '$lib/types/riddle';
import { error, json } from '@sveltejs/kit';
import { validateRiddleAnswer } from '$lib/utils/riddle-validator';
import { createRiddleValidationMessage, getRiddleTeacherId } from '$lib/server/riddle-messages';
import { riddleAnswerSchema } from '$lib/server/validation/riddles';
import { requireAuth } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * Submit riddle attempt
 * POST /api/riddles/[id]/submit
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireAuth(locals);
	const riddleId = validateUuidParam(params.id, 'riddleId');

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = riddleAnswerSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { answer } = validation.data;

	// Fetch riddle
	const { data: riddle, error: riddleError } = await locals.supabase
		.from('riddles')
		.select('*')
		.eq('id', riddleId)
		.single();

	if (riddleError || !riddle) {
		throw error(404, 'Énigme non trouvée');
	}

	// Validate answer (automatic or manual)
	const answerConfig = riddle.answer as AnswerConfig | null;
	let isCorrect: boolean | null = null;

	if (answerConfig) {
		// Automatic validation
		const validationResult = validateRiddleAnswer(answer, answerConfig);
		isCorrect = validationResult.isCorrect;
	} else {
		// Manual validation (teacher will validate later)
		isCorrect = null;
	}

	// Submit attempt using RPC function
	const { data: attemptId, error: submitError } = await locals.supabase.rpc(
		'submit_riddle_attempt',
		{
			p_riddle_id: riddleId,
			p_student_id: user.id,
			p_submitted_answer: { value: answer }, // Store as JSONB
			p_is_correct: isCorrect
		}
	);

	if (submitError) {
		console.error('Error submitting attempt:', submitError);
		throw error(500, 'Erreur lors de la soumission de la tentative');
	}

	// Fetch the created attempt to return full details
	const { data: attempt, error: attemptError } = await locals.supabase
		.from('riddle_attempts')
		.select('*')
		.eq('id', attemptId)
		.single();

	if (attemptError || !attempt) {
		throw error(500, 'Erreur lors de la récupération de la tentative');
	}

	// If manual validation, create a message to teacher
	if (isCorrect === null) {
		// Get student profile for name
		const { data: student } = await locals.supabase
			.from('profiles')
			.select('firstname, lastname')
			.eq('id', user.id)
			.single();

		// Get teacher ID
		const teacherId = await getRiddleTeacherId(locals.supabase, riddleId);

		if (teacherId && student) {
			const studentName = `${student.firstname || ''} ${student.lastname || ''}`.trim();

			// Create validation message
			await createRiddleValidationMessage(locals.supabase, {
				attemptId,
				riddleId,
				riddleNumber: riddle.riddle_number,
				riddleTitle: riddle.title,
				studentId: user.id,
				studentName,
				teacherId
			});
		}
	}

	return json({
		success: true,
		attempt,
		isCorrect,
		message:
			isCorrect === true
				? 'Bravo ! Réponse correcte !'
				: isCorrect === false
					? 'Réponse incorrecte'
					: 'Réponse envoyée au professeur pour validation'
	});
};
