/**
 * Tutor Conversations API
 *
 * GET: Find existing conversation for exercise + assignment + student
 * POST: Create new conversation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getTutorConversationQuerySchema,
	createTutorConversationSchema
} from '$lib/server/validation/chat';
import { requireAuth } from '$lib/server/middleware/auth';
import { getExerciseContentSafe, type Exercise } from '$lib/exercises/types';

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
		console.error('Tutor conversations DB error:', dbError);
		throw error(500, 'Erreur lors de la recherche de la conversation');
	}

	return json({ conversation });
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
	const { data: existing } = await locals.supabase
		.from('tutor_conversations')
		.select('id')
		.eq('student_id', user.id)
		.eq('exercise_id', exerciseId)
		.eq('assignment_id', assignmentId)
		.maybeSingle();

	if (existing) {
		throw error(409, 'Une conversation existe déjà pour cet exercice');
	}

	// Fetch the exercise correction server-side (from variations)
	const { data: exercise } = await locals.supabase
		.from('exercises')
		.select('id, shared, variations')
		.eq('id', exerciseId)
		.single();

	// Use variations as single source of truth
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
		console.error('Tutor conversation creation error:', createError);
		throw error(500, 'Erreur lors de la création de la conversation');
	}

	return json({ conversation }, { status: 201 });
};
