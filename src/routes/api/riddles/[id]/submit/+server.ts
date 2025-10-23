import type { RequestHandler } from './$types';
import type { AnswerConfig } from '$lib/types/riddle';
import { error, json } from '@sveltejs/kit';
import { validateRiddleAnswer } from '$lib/utils/riddle-validator';
import {
	createRiddleValidationMessage,
	getRiddleTeacherId
} from '$lib/server/riddle-messages';

/**
 * Submit riddle attempt
 * POST /api/riddles/[id]/submit
 */
export const POST: RequestHandler = async ({
	params,
	request,
	locals: { supabase, safeGetSession }
}) => {
	const { session } = await safeGetSession();
	if (!session) {
		throw error(401, 'Non authentifié');
	}

	const { answer } = await request.json();

	if (!answer) {
		throw error(400, 'Réponse manquante');
	}

	// Fetch riddle
	const { data: riddle, error: riddleError } = await supabase
		.from('riddles')
		.select('*')
		.eq('id', params.id)
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
	const { data: attemptId, error: submitError } = await supabase.rpc('submit_riddle_attempt', {
		p_riddle_id: params.id,
		p_student_id: session.user.id,
		p_submitted_answer: { value: answer }, // Store as JSONB
		p_is_correct: isCorrect
	});

	if (submitError) {
		console.error('Error submitting attempt:', submitError);
		throw error(500, 'Erreur lors de la soumission de la tentative');
	}

	// Fetch the created attempt to return full details
	const { data: attempt, error: attemptError } = await supabase
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
		const { data: student } = await supabase
			.from('profiles')
			.select('firstname, lastname')
			.eq('id', session.user.id)
			.single();

		// Get teacher ID
		const teacherId = await getRiddleTeacherId(supabase, params.id);

		if (teacherId && student) {
			const studentName = `${student.firstname || ''} ${student.lastname || ''}`.trim();

			// Create validation message
			await createRiddleValidationMessage(supabase, {
				attemptId,
				riddleId: params.id,
				riddleNumber: riddle.riddle_number,
				riddleTitle: riddle.title,
				studentId: session.user.id,
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
