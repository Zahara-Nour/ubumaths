import type { PageServerLoad, Actions } from './$types';
import type { AttemptWithDetails } from '$lib/types/riddle';
import { error, redirect, fail } from '@sveltejs/kit';
import { sendValidationResultMessage } from '$lib/server/riddle-messages';

/**
 * Load validation details
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Fetch attempt with details
	const { data: attempt, error: attemptError } = await supabase
		.from('riddle_attempts')
		.select(
			`
			*,
			riddle:riddles!inner(
				id,
				riddle_number,
				title,
				genre,
				difficulty,
				statement,
				correction,
				image_url,
				created_by
			),
			student:profiles!riddle_attempts_student_id_fkey(
				id,
				firstname,
				lastname,
				avatar_url
			)
		`
		)
		.eq('id', params.id)
		.is('is_correct', null) // Must be pending
		.single();

	if (attemptError || !attempt) {
		console.error('Error fetching attempt:', attemptError);
		throw error(404, 'Tentative non trouvée ou déjà validée');
	}

	// Verify teacher owns this riddle
	if (attempt.riddle.created_by !== user.id) {
		throw error(403, 'Vous ne pouvez valider que vos propres énigmes');
	}

	const attemptWithDetails: AttemptWithDetails = {
		...attempt,
		riddle: attempt.riddle,
		student: {
			id: attempt.student.id,
			firstname: attempt.student.firstname,
			lastname: attempt.student.lastname,
			avatar_url: attempt.student.avatar_url
		}
	};

	return {
		attempt: attemptWithDetails
	};
};

/**
 * Validate riddle attempt
 */
export const actions: Actions = {
	validate: async ({ params, request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifié' });
		}

		const formData = await request.formData();
		const isCorrect = formData.get('is_correct') === 'true';
		const feedback = formData.get('feedback')?.toString();

		// Validate using RPC function
		const { error: validateError } = await supabase.rpc('validate_riddle_attempt', {
			p_attempt_id: params.id,
			p_teacher_id: user.id,
			p_is_correct: isCorrect
		});

		if (validateError) {
			console.error('Error validating attempt:', validateError);
			return fail(500, { message: 'Erreur lors de la validation' });
		}

		// Fetch updated attempt for notification
		const { data: attempt } = await supabase
			.from('riddle_attempts')
			.select(
				`
				*,
				riddle:riddles!inner(riddle_number, title)
			`
			)
			.eq('id', params.id)
			.single();

		// Send notification to student
		if (attempt) {
			await sendValidationResultMessage(supabase, {
				studentId: attempt.student_id,
				teacherId: user.id,
				riddleNumber: attempt.riddle.riddle_number,
				riddleTitle: attempt.riddle.title,
				isCorrect,
				gidouillesAwarded: attempt.gidouilles_awarded,
				feedback
			});
		}

		// Redirect back to validations list
		throw redirect(303, '/dashboard/teacher/riddles/validations');
	}
};
