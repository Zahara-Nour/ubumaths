/**
 * API Route: /api/python-exercises
 * GET - List exercises with filters and pagination
 * POST - Create new exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	createExerciseSchema,
	listExercisesQuerySchema,
	type CreateExerciseInput
} from '$lib/server/validation/python-exercises';
import type { PythonExercise, PythonExerciseStudentView } from '$lib/types/python-exercises';
import type { Database } from '$lib/types/database';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/python-exercises
 * List exercises with filters and pagination
 *
 * Teachers: See their own exercises + public exercises
 * Students: See exercises assigned to them (without solution_code)
 *
 * Query params:
 * - difficulty: 'easy' | 'medium' | 'hard'
 * - tags: comma-separated string
 * - is_public: 'true' | 'false'
 * - author_id: UUID (filter by author)
 * - limit: number (1-100, default 20)
 * - offset: number (default 0)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Get user role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		throw error(403, 'Profil utilisateur introuvable');
	}

	// Validate query parameters
	const queryValidation = listExercisesQuerySchema.safeParse({
		difficulty: url.searchParams.get('difficulty'),
		tags: url.searchParams.get('tags'),
		is_public: url.searchParams.get('is_public'),
		author_id: url.searchParams.get('author_id'),
		limit: url.searchParams.get('limit'),
		offset: url.searchParams.get('offset')
	});

	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Paramètres de requête invalides: ${errorMsg}`);
	}

	const { difficulty, tags, is_public, author_id, limit, offset } = queryValidation.data;

	// Build query based on role
	let query = supabase.from('python_exercises').select('*', { count: 'exact' });

	if (profile.role === 'teacher') {
		// Teachers see their exercises + public exercises
		if (author_id) {
			// Filter by specific author
			query = query.eq('author_id', author_id);
		} else {
			// Own exercises OR public exercises
			query = query.or(`author_id.eq.${user.id},is_public.eq.true`);
		}

		// Apply additional filters
		if (difficulty) {
			query = query.eq('difficulty', difficulty);
		}
		if (tags && tags.length > 0) {
			query = query.overlaps('tags', tags);
		}
		if (is_public !== undefined) {
			query = query.eq('is_public', is_public);
		}
	} else if (profile.role === 'student') {
		// Students see only assigned exercises
		// This is more complex - need to check assignments
		const { data: assignments, error: assignmentsError } = await supabase
			.from('python_exercise_assignments')
			.select('exercise_id')
			.or(`student_id.eq.${user.id},class_id.in.(${await getStudentClassIds(supabase, user.id)})`);

		if (assignmentsError) {
			console.error('Failed to fetch student assignments:', assignmentsError);
			throw error(500, 'Erreur lors de la récupération des devoirs');
		}

		const exerciseIds = assignments.map((a) => a.exercise_id);

		if (exerciseIds.length === 0) {
			// Student has no assignments
			return json({
				exercises: [],
				pagination: {
					limit,
					offset,
					total: 0
				}
			});
		}

		query = query.in('id', exerciseIds);

		// Apply filters
		if (difficulty) {
			query = query.eq('difficulty', difficulty);
		}
		if (tags && tags.length > 0) {
			query = query.overlaps('tags', tags);
		}
	} else {
		throw error(403, 'Rôle utilisateur non autorisé');
	}

	// Apply pagination
	query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

	// Execute query
	const { data: exercises, error: exercisesError, count } = await query;

	if (exercisesError) {
		console.error('Failed to fetch exercises:', exercisesError);
		throw error(500, 'Erreur lors de la récupération des exercices');
	}

	// For students, exclude solution_code
	let responseData: (PythonExercise | PythonExerciseStudentView)[] = exercises || [];
	if (profile.role === 'student') {
		responseData = (exercises || []).map((ex) => {
			const { solution_code: _solution_code, ...rest } = ex;
			return rest as PythonExerciseStudentView;
		});
	}

	return json({
		exercises: responseData,
		pagination: {
			limit,
			offset,
			total: count || 0
		}
	});
};

/**
 * POST /api/python-exercises
 * Create a new exercise
 * Teachers only
 *
 * @body CreateExerciseInput
 * @returns Created exercise
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Verify teacher role
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile || profile.role !== 'teacher') {
		throw error(403, 'Seuls les enseignants peuvent créer des exercices');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = createExerciseSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation échouée: ${errorMsg}`);
	}

	const data = validation.data as CreateExerciseInput;

	// Insert exercise
	const { data: exercise, error: insertError } = await supabase
		.from('python_exercises')
		.insert({
			title: data.title,
			description: data.description || null,
			instructions: data.instructions || null,
			starter_code: data.starter_code || null,
			solution_code: data.solution_code,
			validation_config: data.validation_config,
			difficulty: data.difficulty,
			tags: data.tags,
			author_id: user.id,
			is_public: data.is_public
		})
		.select()
		.single();

	if (insertError) {
		console.error('Failed to create exercise:', insertError);
		throw error(500, "Erreur lors de la création de l'exercice");
	}

	return json({ exercise }, { status: 201 });
};

/**
 * Helper function to get student's class IDs
 */
async function getStudentClassIds(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<string> {
	const { data: classes } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId);

	if (!classes || classes.length === 0) {
		return '';
	}

	return classes.map((c: { class_id: string }) => c.class_id).join(',');
}
