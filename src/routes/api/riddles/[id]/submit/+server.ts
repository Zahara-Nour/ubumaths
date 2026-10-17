import type { RequestHandler } from './$types';
import { toDbRiddle, RIDDLE_COLUMNS } from '$lib/types/riddle';
import { error, json } from '@sveltejs/kit';
import { validateRiddleAnswer } from '$lib/utils/riddle-validator';
import { createRiddleValidationMessage, getRiddleTeacherId } from '$lib/server/riddle-messages';
import { riddleAnswerSchema } from '$lib/server/validation/riddles';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { validateUuidParam } from '$lib/server/validation/params';
import { addBuddyXpFromExercise } from '$lib/server/buddy-xp-service';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { fetchRiddleSolutions } from '$lib/server/riddle-solutions';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/riddles/[id]/submit/+server');

/**
 * Submit riddle attempt
 * POST /api/riddles/[id]/submit
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	requireConsent(profile, 'submit_exercise');
	const riddleId = validateUuidParam(params.id, 'riddleId');

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = riddleAnswerSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { answer } = validation.data;

	// Fetch riddle — client de l'élève : sa RLS ne lui rend que l'énigme du jour ou une
	// énigme qui lui est assignée. C'est ce contrôle d'accès qui autorise la suite.
	const { data: riddle, error: riddleError } = await locals.supabase
		.from('riddles')
		.select(RIDDLE_COLUMNS)
		.eq('id', riddleId)
		.single();

	if (riddleError || !riddle) {
		throw error(404, 'Énigme non trouvée');
	}

	// La réponse attendue vit dans `riddle_solutions`, que l'élève ne lit pas : le client
	// service la lit, pour CETTE énigme, que la RLS de l'élève vient de lui rendre.
	const serviceClient = createServiceRoleClient();
	const { solutions, error: solutionError } = await fetchRiddleSolutions(serviceClient, [
		riddle.id
	]);

	if (solutionError) {
		logger.error('Error fetching riddle solution:', solutionError);
		throw error(500, 'Erreur lors de la correction de la réponse');
	}

	// Validate answer (automatic or manual). Sans réponse attendue : validation manuelle.
	const answerConfig = toDbRiddle(riddle, solutions.get(riddle.id) ?? null).answer;
	let isCorrect: boolean | null = null;

	if (answerConfig) {
		// Automatic validation
		const validationResult = validateRiddleAnswer(answer, answerConfig);
		isCorrect = validationResult.isCorrect;
	} else {
		// Manual validation (teacher will validate later)
		isCorrect = null;
	}

	// Soumission par le client SERVICE : la justesse vient de la correction ci-dessus, jamais
	// du navigateur. Un élève qui appelait la RPC lui-même pouvait se déclarer juste et
	// toucher les gidouilles (audit de #1077) ; EXECUTE lui est retiré par la migration
	// qui suit le `deploy:prod`. `p_student_id` vient de la session.
	const { data: rpcResult, error: submitError } = await serviceClient.rpc('submit_riddle_attempt', {
		p_riddle_id: riddleId,
		p_student_id: user.id,
		p_submitted_answer: { value: answer }, // Store as JSONB
		// Paramètre `DEFAULT NULL` : `null` signifie « en attente de validation
		// manuelle », et l'omettre applique exactement ce défaut.
		p_is_correct: isCorrect ?? undefined
	});

	if (submitError) {
		logger.error('Error submitting attempt:', submitError);
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
		const { data: student, error: studentError } = await locals.supabase
			.from('profiles')
			.select('firstname, lastname')
			.eq('id', user.id)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
		// panne prenait le même visage et faisait conclure « rien ici », donc créer
		// par-dessus ce qu'on n'avait simplement pas su lire.
		if (studentError && studentError.code !== 'PGRST116') {
			logger.error('Lecture impossible :', studentError);
			throw error(500, 'Impossible de vérifier l’état actuel');
		}

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

	// Award buddy XP (only for automatic validation with definitive result)
	if (isCorrect !== null) {
		try {
			const buddyXp = await addBuddyXpFromExercise(locals.supabase, user.id, {
				isCorrect,
				theme: 'enigmes'
			});
			if (buddyXp) {
				(response as Record<string, unknown>).buddy_xp = buddyXp;
			}
		} catch (buddyError) {
			logger.error('⚠️ [API] Error awarding buddy XP for riddle:', buddyError);
		}
	}

	return json(response);
};
