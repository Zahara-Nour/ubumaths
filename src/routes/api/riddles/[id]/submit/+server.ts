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

	// Submit attempt using RPC function (now returns table with reward info)
	const { data: rpcResult, error: submitError } = await locals.supabase.rpc(
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

	// RPC now returns array with one row containing all reward info
	const rewardInfo = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
	const attemptId = rewardInfo?.attempt_id;

	if (!attemptId) {
		throw error(500, 'Erreur lors de la création de la tentative');
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

	// Build response with reward info
	const response: {
		success: boolean;
		attempt: typeof attempt;
		isCorrect: boolean | null;
		message: string;
		rewards?: {
			theoretical_reward: number;
			actual_reward: number;
			is_first_win: boolean;
			week_best_reward: number;
		};
	} = {
		success: true,
		attempt,
		isCorrect,
		message:
			isCorrect === true
				? 'Bravo ! Réponse correcte !'
				: isCorrect === false
					? 'Réponse incorrecte'
					: 'Réponse envoyée au professeur pour validation'
	};

	// Add reward info if correct answer
	if (isCorrect === true && rewardInfo) {
		response.rewards = {
			theoretical_reward: Number(rewardInfo.theoretical_reward) || 0,
			actual_reward: Number(rewardInfo.actual_reward) || 0,
			is_first_win: Boolean(rewardInfo.is_first_win),
			week_best_reward: Number(rewardInfo.week_best_reward) || 0
		};
	}

	return json(response);
};
