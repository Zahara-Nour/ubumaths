/**
 * API Route: /api/python-files/[id]/assign
 * POST - Assign Python file to classes
 * DELETE - Remove all assignments for this file
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { assignPythonFileSchema } from '$lib/server/validation/python-files';
import { validateUuidParam } from '$lib/server/validation/params';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * POST /api/python-files/[id]/assign
 * Assign Python file to one or more classes
 * Teacher only - must own the file
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = assignPythonFileSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const { class_ids, instructions, due_date } = validation.data;

	// Verify user owns the file
	const { data: file, error: fileError } = await locals.supabase
		.from('python_files')
		.select('owner_id')
		.eq('id', id)
		.single();

	if (fileError || !file) {
		if (fileError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python non trouve');
		}
		console.error('Error fetching python file:', fileError);
		throw error(500, 'Erreur lors de la verification du fichier');
	}

	if (file.owner_id !== user.id) {
		throw error(403, 'Vous ne pouvez assigner que vos propres fichiers Python');
	}

	// Verify user is teacher of all specified classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id')
		.eq('teacher_id', user.id)
		.in('id', class_ids);

	if (classesError) {
		console.error('Error fetching classes:', classesError);
		throw error(500, 'Erreur lors de la verification des classes');
	}

	if (!classes || classes.length !== class_ids.length) {
		const validClassIds = new Set(classes?.map((c) => c.id) ?? []);
		const invalidClassIds = class_ids.filter((id) => !validClassIds.has(id));
		throw error(
			403,
			`Vous n'etes pas le professeur de certaines classes: ${invalidClassIds.join(', ')}`
		);
	}

	// Create assignments (upsert to handle duplicates)
	const assignments = class_ids.map((class_id) => ({
		file_id: id,
		class_id,
		assigned_by: user.id,
		instructions: instructions ?? null,
		due_date: due_date ?? null
	}));

	const { data: created, error: insertError } = await locals.supabase
		.from('python_file_assignments')
		.upsert(assignments, {
			onConflict: 'file_id,class_id',
			ignoreDuplicates: false
		})
		.select();

	if (insertError) {
		console.error('Error creating assignments:', insertError);
		throw error(500, 'Erreur lors de la creation des assignations');
	}

	return json(
		{
			success: true,
			message: `Fichier assigne a ${created?.length ?? 0} classe(s)`,
			assignments_created: created?.length ?? 0
		},
		{ status: 201 }
	);
};

/**
 * DELETE /api/python-files/[id]/assign
 * Remove all assignments for this file
 * Teacher only - must own the file
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'teacher');

	// Verify user owns the file
	const { data: file, error: fileError } = await locals.supabase
		.from('python_files')
		.select('owner_id')
		.eq('id', id)
		.single();

	if (fileError || !file) {
		if (fileError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python non trouve');
		}
		console.error('Error fetching python file:', fileError);
		throw error(500, 'Erreur lors de la verification du fichier');
	}

	if (file.owner_id !== user.id) {
		throw error(403, 'Vous ne pouvez gerer que les assignations de vos propres fichiers');
	}

	// Delete all assignments for this file
	const { error: deleteError } = await locals.supabase
		.from('python_file_assignments')
		.delete()
		.eq('file_id', id)
		.eq('assigned_by', user.id);

	if (deleteError) {
		console.error('Error deleting assignments:', deleteError);
		throw error(500, 'Erreur lors de la suppression des assignations');
	}

	return json({ success: true });
};

/**
 * GET /api/python-files/[id]/assign
 * Get all assignments for this file
 * Teacher only - must own the file
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const id = validateUuidParam(params.id);
	const { user } = await requireRole(locals, 'teacher');

	// Verify user owns the file
	const { data: file, error: fileError } = await locals.supabase
		.from('python_files')
		.select('owner_id')
		.eq('id', id)
		.single();

	if (fileError || !file) {
		if (fileError?.code === 'PGRST116') {
			throw error(404, 'Fichier Python non trouve');
		}
		console.error('Error fetching python file:', fileError);
		throw error(500, 'Erreur lors de la verification du fichier');
	}

	if (file.owner_id !== user.id) {
		throw error(403, 'Vous ne pouvez voir que les assignations de vos propres fichiers');
	}

	// Fetch assignments with class info
	const { data: assignments, error: assignmentsError } = await locals.supabase
		.from('python_file_assignments')
		.select(
			`
			id,
			instructions,
			due_date,
			assigned_at,
			class_id,
			classes!python_file_assignments_class_id_fkey (
				id,
				name,
				grade
			)
		`
		)
		.eq('file_id', id)
		.eq('assigned_by', user.id)
		.order('assigned_at', { ascending: false });

	if (assignmentsError) {
		console.error('Error fetching assignments:', assignmentsError);
		throw error(500, 'Erreur lors de la recuperation des assignations');
	}

	return json({ assignments: assignments ?? [] });
};
