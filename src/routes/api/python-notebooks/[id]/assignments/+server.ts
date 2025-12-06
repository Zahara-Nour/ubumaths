/**
 * API Route: /api/python-notebooks/[id]/assignments
 * GET - Fetch assignments for a notebook (which classes it's shared with)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Schema for validating assignment response from Supabase
 * Validates the nested structure from the join query
 */
const assignmentResponseSchema = z.object({
	id: z.string().uuid(),
	class_id: z.string().uuid(),
	readonly: z.boolean(),
	created_at: z.string(),
	classes: z
		.array(
			z.object({
				id: z.string().uuid(),
				name: z.string(),
				student_count: z.array(z.object({ count: z.number().int().nonnegative() }))
			})
		)
		.nullable()
		.optional()
});

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/python-notebooks/[id]/assignments
 * Fetch all class assignments for a notebook
 * Teachers only - must be the notebook author
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate notebook ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de notebook invalide');
	}

	const notebookId = idValidation.data;

	// Check if notebook exists and user is the author
	const { data: notebook, error: fetchError } = await locals.supabase
		.from('python_notebooks')
		.select('id, author_id')
		.eq('id', notebookId)
		.single();

	if (fetchError || !notebook) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Notebook introuvable');
		}
		console.error('Error fetching notebook:', fetchError);
		throw error(500, 'Erreur lors de la verification du notebook');
	}

	if (notebook.author_id !== user.id) {
		throw error(403, "Seul l'auteur peut voir les partages de ce notebook");
	}

	// Fetch all assignments for this notebook
	const { data: assignments, error: assignmentsError } = await locals.supabase
		.from('python_notebook_assignments')
		.select(
			`
			id,
			class_id,
			readonly,
			created_at,
			classes (
				id,
				name,
				student_count:class_members(count)
			)
		`
		)
		.eq('notebook_id', notebookId)
		.order('created_at', { ascending: false });

	if (assignmentsError) {
		console.error('Error fetching notebook assignments:', assignmentsError);
		throw error(500, 'Erreur lors du chargement des partages');
	}

	// Validate and transform the response to include class info directly
	const transformedAssignments = (assignments || []).map((assignment) => {
		// Validate assignment structure
		const validation = assignmentResponseSchema.safeParse(assignment);
		if (!validation.success) {
			console.error('Invalid assignment structure:', validation.error);
			throw error(500, 'Structure de données invalide');
		}

		const validatedAssignment = validation.data;

		// Safely access nested data
		const classData =
			validatedAssignment.classes && validatedAssignment.classes.length > 0
				? validatedAssignment.classes[0]
				: null;

		return {
			id: validatedAssignment.id,
			class_id: validatedAssignment.class_id,
			readonly: validatedAssignment.readonly,
			created_at: validatedAssignment.created_at,
			class_name: classData?.name ?? null,
			student_count:
				classData && classData.student_count.length > 0 ? classData.student_count[0].count : 0
		};
	});

	return json({
		assignments: transformedAssignments
	});
};
