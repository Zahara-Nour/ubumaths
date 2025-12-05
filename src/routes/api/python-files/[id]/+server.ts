/**
 * API Route: /api/python-files/[id]
 * GET - Get Python file by ID
 * PUT - Update Python file
 * DELETE - Delete Python file
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { updatePythonFileSchema, uuidParamSchema } from '$lib/server/validation/python-files';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/python-files/[id]
 * Get Python file by ID
 * Access: owner OR teacher of student owner OR public OR assigned to student's class
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireAuth(locals);

	// Validate UUID
	const idValidation = uuidParamSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de fichier Python invalide');
	}

	// Fetch file with owner info
	const { data, error: queryError } = await locals.supabase
		.from('python_files')
		.select(
			`
			*,
			profiles!python_files_owner_id_fkey (
				firstname,
				lastname
			)
		`
		)
		.eq('id', params.id)
		.single();

	if (queryError || !data) {
		if (queryError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python non trouve');
		}
		console.error('Error fetching python file:', queryError);
		throw error(500, 'Erreur lors de la recuperation du fichier Python');
	}

	// Access check is handled by RLS, but let's add explicit checks for better error messages
	const isOwner = data.owner_id === user.id;
	const isPublic = data.is_public;

	// For non-owners of non-public files, check additional access
	if (!isOwner && !isPublic) {
		// Check if teacher of the file owner
		if (profile.role === 'teacher') {
			const { data: isTeacher } = await locals.supabase.rpc('is_teacher_of_student', {
				p_student_id: data.owner_id
			});

			if (!isTeacher) {
				// Check if assigned to one of teacher's classes
				const { data: assignment } = await locals.supabase
					.from('python_file_assignments')
					.select('id')
					.eq('file_id', params.id)
					.eq('assigned_by', user.id)
					.limit(1)
					.maybeSingle();

				if (!assignment) {
					throw error(403, 'Acces refuse a ce fichier Python');
				}
			}
		} else if (profile.role === 'student') {
			// Check if file is assigned to student's class
			const { data: isAssigned } = await locals.supabase.rpc('is_file_assigned_to_student', {
				p_file_id: params.id
			});

			if (!isAssigned) {
				throw error(403, 'Acces refuse a ce fichier Python');
			}
		} else if (profile.role !== 'admin') {
			throw error(403, 'Acces refuse a ce fichier Python');
		}
	}

	// Fetch assignment info if student
	let assignment = null;
	if (profile.role === 'student') {
		const { data: assignmentData } = await locals.supabase
			.from('python_file_assignments')
			.select(
				`
				id,
				instructions,
				due_date,
				assigned_at,
				class_id,
				classes!python_file_assignments_class_id_fkey (
					name
				)
			`
			)
			.eq('file_id', params.id)
			.limit(1)
			.maybeSingle();

		if (assignmentData) {
			const classData = assignmentData.classes as unknown as { name: string } | null;
			assignment = {
				id: assignmentData.id,
				instructions: assignmentData.instructions,
				due_date: assignmentData.due_date,
				assigned_at: assignmentData.assigned_at,
				class_name: classData?.name ?? null
			};
		}
	}

	return json({
		file: data,
		assignment,
		isOwner
	});
};

/**
 * PUT /api/python-files/[id]
 * Update Python file
 * Only the owner can update
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);

	// Validate UUID
	const idValidation = uuidParamSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de fichier Python invalide');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = updatePythonFileSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const updateData = validation.data;

	// Check if there's anything to update
	if (Object.keys(updateData).length === 0) {
		throw error(400, 'Aucune donnee a mettre a jour');
	}

	// First check if user owns this file
	const { data: existing, error: fetchError } = await locals.supabase
		.from('python_files')
		.select('owner_id')
		.eq('id', params.id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python non trouve');
		}
		console.error('Error fetching python file:', fetchError);
		throw error(500, 'Erreur lors de la recuperation du fichier Python');
	}

	if (existing.owner_id !== user.id) {
		throw error(403, 'Vous ne pouvez modifier que vos propres fichiers Python');
	}

	// Update file
	const { data, error: updateError } = await locals.supabase
		.from('python_files')
		.update(updateData)
		.eq('id', params.id)
		.select()
		.single();

	if (updateError) {
		console.error('Error updating python file:', updateError);
		throw error(500, 'Erreur lors de la mise a jour du fichier Python');
	}

	return json({ file: data });
};

/**
 * DELETE /api/python-files/[id]
 * Delete Python file
 * Only the owner can delete
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);

	// Validate UUID
	const idValidation = uuidParamSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de fichier Python invalide');
	}

	// First check if user owns this file
	const { data: existing, error: fetchError } = await locals.supabase
		.from('python_files')
		.select('owner_id')
		.eq('id', params.id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python non trouve');
		}
		console.error('Error fetching python file:', fetchError);
		throw error(500, 'Erreur lors de la recuperation du fichier Python');
	}

	if (existing.owner_id !== user.id) {
		throw error(403, 'Vous ne pouvez supprimer que vos propres fichiers Python');
	}

	// Delete file (assignments will be cascade deleted)
	const { error: deleteError } = await locals.supabase
		.from('python_files')
		.delete()
		.eq('id', params.id);

	if (deleteError) {
		console.error('Error deleting python file:', deleteError);
		throw error(500, 'Erreur lors de la suppression du fichier Python');
	}

	return json({ success: true });
};
