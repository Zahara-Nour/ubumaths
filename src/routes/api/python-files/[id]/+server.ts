/**
 * API Route: /api/python-files/[id]
 * GET - Get Python file by ID
 * PUT - Update Python file
 * DELETE - Delete Python file
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { updatePythonFileSchema } from '$lib/server/validation/python-files';
import { validateUuidParam } from '$lib/server/validation/params';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/python-files/[id]/+server');

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/python-files/[id]
 * Get Python file by ID
 * Access: owner OR teacher of student owner OR public OR assigned to student's class
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const id = validateUuidParam(params.id);
	const { user, profile } = await requireAuth(locals);

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
		.eq('id', id)
		.single();

	if (queryError || !data) {
		if (queryError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python introuvable');
		}
		logger.error('Error fetching python file:', queryError);
		throw error(500, 'Impossible de charger le fichier Python');
	}

	// Access check is handled by RLS, but let's add explicit checks for better error messages
	const isOwner = data.owner_id === user.id;
	const isPublic = data.is_public;

	// For non-owners of non-public files, check additional access
	if (!isOwner && !isPublic) {
		// Check if teacher of the file owner
		if (profile.role === 'teacher') {
			const { data: isTeacher, error: isTeacherError } = await locals.supabase.rpc(
				'is_teacher_of_student',
				{
					p_student_id: data.owner_id
				}
			);

			// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
			// panne doit se distinguer d'un refus mérité.
			if (isTeacherError && isTeacherError.code !== 'PGRST116') {
				logger.error('Contrôle d’accès impossible :', isTeacherError);
				throw error(500, 'Impossible de vérifier les droits d’accès');
			}

			if (!isTeacher) {
				// Check if assigned to one of teacher's classes
				const { data: assignment, error: assignmentError } = await locals.supabase
					.from('python_file_assignments')
					.select('id')
					.eq('file_id', id)
					.eq('assigned_by', user.id)
					.limit(1)
					.maybeSingle();

				// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
				// panne doit se distinguer d'un refus mérité.
				if (assignmentError && assignmentError.code !== 'PGRST116') {
					logger.error('Contrôle d’accès impossible :', assignmentError);
					throw error(500, 'Impossible de vérifier les droits d’accès');
				}

				if (!assignment) {
					throw error(403, 'Accès refusé à ce fichier Python');
				}
			}
		} else if (profile.role === 'student') {
			// Check if file is assigned to student's class
			const { data: isAssigned, error: isAssignedError } = await locals.supabase.rpc(
				'is_file_assigned_to_student',
				{
					p_file_id: id
				}
			);

			// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
			// panne doit se distinguer d'un refus mérité.
			if (isAssignedError && isAssignedError.code !== 'PGRST116') {
				logger.error('Contrôle d’accès impossible :', isAssignedError);
				throw error(500, 'Impossible de vérifier les droits d’accès');
			}

			if (!isAssigned) {
				throw error(403, 'Accès refusé à ce fichier Python');
			}
		} else if (profile.role !== 'admin') {
			throw error(403, 'Accès refusé à ce fichier Python');
		}
	}

	// Fetch assignment info if student
	let assignment = null;
	if (profile.role === 'student') {
		const { data: assignmentData, error: assignmentDataError } = await locals.supabase
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
			.eq('file_id', id)
			.limit(1)
			.maybeSingle();

		// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
		// laisse une trace.
		if (assignmentDataError) {
			logger.error('Enrichissement illisible :', assignmentDataError);
		}

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
	const id = validateUuidParam(params.id);
	const { user } = await requireAuth(locals);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = updatePythonFileSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	const updateData = validation.data;

	// Check if there's anything to update
	if (Object.keys(updateData).length === 0) {
		throw error(400, 'Aucune modification demandée');
	}

	// First check if user owns this file
	const { data: existing, error: fetchError } = await locals.supabase
		.from('python_files')
		.select('owner_id')
		.eq('id', id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python introuvable');
		}
		logger.error('Error fetching python file:', fetchError);
		throw error(500, 'Impossible de charger le fichier Python');
	}

	if (existing.owner_id !== user.id) {
		throw error(403, 'Seul l’auteur peut modifier ce fichier Python');
	}

	// Update file
	const { data, error: updateError } = await locals.supabase
		.from('python_files')
		.update(updateData)
		.eq('id', id)
		.select()
		.single();

	if (updateError) {
		logger.error('Error updating python file:', updateError);
		throw error(500, 'Impossible de modifier le fichier Python');
	}

	return json({ file: data });
};

/**
 * DELETE /api/python-files/[id]
 * Delete Python file
 * Only the owner can delete
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireAuth(locals);

	// First check if user owns this file
	const { data: existing, error: fetchError } = await locals.supabase
		.from('python_files')
		.select('owner_id')
		.eq('id', id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python introuvable');
		}
		logger.error('Error fetching python file:', fetchError);
		throw error(500, 'Impossible de charger le fichier Python');
	}

	if (existing.owner_id !== user.id) {
		throw error(403, 'Seul l’auteur peut supprimer ce fichier Python');
	}

	// Delete file (assignments will be cascade deleted)
	const { error: deleteError } = await locals.supabase.from('python_files').delete().eq('id', id);

	if (deleteError) {
		logger.error('Error deleting python file:', deleteError);
		throw error(500, 'Impossible de supprimer le fichier Python');
	}

	return json({ success: true });
};
