/**
 * Tutor Conversations API
 *
 * GET: Find existing conversation for exercise + assignment + student
 * POST: Create new conversation
 */

import { WORKSHEET_LINE_VERSION, withLineVersion } from '#lib/server/exercise-versions.ts';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getTutorConversationQuerySchema,
	createTutorConversationSchema
} from '#lib/server/validation/chat.ts';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { getExerciseContentSafe, type Exercise } from '#lib/exercises/types.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/tutor/conversations/+server');

/**
 * GET /api/tutor/conversations?exerciseId=X&assignmentId=Y
 *
 * Returns the existing conversation for the current student + exercise + assignment,
 * or null if no conversation exists.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication with proper session validation
	const { user } = await requireAuth(locals);

	// Parse and validate query parameters
	const exerciseId = url.searchParams.get('exerciseId');
	const assignmentId = url.searchParams.get('assignmentId');

	const validation = getTutorConversationQuerySchema.safeParse({
		exerciseId,
		assignmentId
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { exerciseId: validExerciseId, assignmentId: validAssignmentId } = validation.data;

	// Query for existing conversation
	const { data: conversation, error: dbError } = await locals.supabase
		.from('tutor_conversations')
		.select(
			'id, exercise_id, assignment_id, started_at, message_count, max_help_level_reached, is_active'
		)
		.eq('student_id', user.id)
		.eq('exercise_id', validExerciseId)
		.eq('assignment_id', validAssignmentId)
		.maybeSingle();

	if (dbError) {
		logger.error('Tutor conversations DB error:', dbError);
		throw error(500, 'Erreur lors de la recherche de la conversation');
	}

	return Response.json({ conversation });
};

/**
 * POST /api/tutor/conversations
 *
 * Creates a new tutor conversation for the current student + exercise + assignment.
 * Fetches the exercise correction server-side (never from client).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication with proper session validation
	const { user } = await requireAuth(locals);

	// Parse and validate body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}

	const validation = createTutorConversationSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { exerciseId, assignmentId, statement, topic, classId } = validation.data;

	// Check if conversation already exists
	const { data: existing, error: existingError } = await locals.supabase
		.from('tutor_conversations')
		.select('id')
		.eq('student_id', user.id)
		.eq('exercise_id', exerciseId)
		.eq('assignment_id', assignmentId)
		.maybeSingle();

	// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
	// panne prenait le même visage et faisait conclure « rien ici », donc créer
	// par-dessus ce qu'on n'avait simplement pas su lire.
	if (existingError && existingError.code !== 'PGRST116') {
		logger.error('Lecture impossible :', existingError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}

	if (existing) {
		throw error(409, 'Une conversation existe déjà pour cet exercice');
	}

	// Le corrigé, lu côté serveur dans la VERSION que la fiche de l'affectation utilise (ADR 0044) :
	// celle que l'élève a sous les yeux, pas la dernière.
	const { data: assignment, error: assignmentError } = await locals.supabase
		.from('worksheet_assignments')
		.select('worksheet_id')
		.eq('id', assignmentId)
		.maybeSingle();
	if (assignmentError) {
		logger.error('Lecture impossible :', assignmentError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}
	if (!assignment) throw error(404, 'Devoir introuvable');

	const { data: lines, error: exerciseError } = await locals.supabase
		.from('worksheet_exercises')
		.select(`exercise:exercises (id), ${WORKSHEET_LINE_VERSION}`)
		.eq('worksheet_id', assignment.worksheet_id)
		.eq('exercise_id', exerciseId)
		.order('position')
		.limit(1);
	const exerciseLine = lines?.[0];

	if (exerciseError) {
		logger.error('Lecture impossible :', exerciseError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}
	if (!exerciseLine) throw error(404, 'Exercice absent de ce devoir');
	const exercise = withLineVersion(exerciseLine).exercise;
	const content = exercise
		? getExerciseContentSafe(exercise as unknown as Exercise)
		: { statement_md: '', solution_md: '' };
	const correction = content.solution_md || null;

	// Create the conversation
	const { data: conversation, error: createError } = await locals.supabase
		.from('tutor_conversations')
		.insert({
			student_id: user.id,
			exercise_id: exerciseId,
			assignment_id: assignmentId,
			class_id: classId || null,
			exercise_statement: statement,
			exercise_topic: topic || null,
			exercise_correction: correction,
			is_active: true,
			message_count: 0,
			max_help_level_reached: 0
		})
		.select('id, exercise_id, assignment_id, started_at, is_active')
		.single();

	if (createError) {
		logger.error('Tutor conversation creation error:', createError);
		throw error(500, 'Erreur lors de la création de la conversation');
	}

	return Response.json({ conversation }, { status: 201 });
};
