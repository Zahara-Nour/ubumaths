/**
 * API Route: /api/python-notebooks/[id]
 * GET - Get single Python notebook
 * PUT - Update Python notebook
 * DELETE - Delete Python notebook
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { updateNotebookSchema } from '$lib/server/validation/notebooks';
import { uuidSchema } from '$lib/server/validation/common';

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/python-notebooks/[id]
 * Get a single Python notebook with full content
 * Authenticated users only
 * Access: Owner, public notebooks (teachers), assigned notebooks (students)
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireAuth(locals);

	// Validate notebook ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de notebook invalide');
	}

	const notebookId = idValidation.data;

	// Fetch notebook with author info
	const { data: notebook, error: queryError } = await locals.supabase
		.from('python_notebooks')
		.select(
			`
			id,
			title,
			description,
			content,
			author_id,
			is_public,
			created_at,
			updated_at,
			profiles!python_notebooks_author_id_fkey (
				firstname,
				lastname
			)
		`
		)
		.eq('id', notebookId)
		.single();

	if (queryError) {
		if (queryError.code === 'PGRST116') {
			throw error(404, 'Notebook introuvable');
		}
		console.error('Error fetching python notebook:', queryError);
		throw error(500, 'Erreur lors de la recuperation du notebook Python');
	}

	if (!notebook) {
		throw error(404, 'Notebook introuvable');
	}

	// Check access permissions
	const isOwner = notebook.author_id === user.id;
	const isPublicAndTeacher = notebook.is_public && profile.role === 'teacher';

	// Check if student has it assigned
	let isAssigned = false;
	if (profile.role === 'student') {
		const { data: assignment } = await locals.supabase
			.from('python_notebook_assignments')
			.select('id, readonly')
			.eq('notebook_id', notebookId)
			.limit(1)
			.maybeSingle();

		isAssigned = !!assignment;
	}

	if (!isOwner && !isPublicAndTeacher && !isAssigned) {
		throw error(403, 'Acces interdit a ce notebook');
	}

	return json({ notebook });
};

/**
 * PUT /api/python-notebooks/[id]
 * Update a Python notebook (title, description, content, is_public)
 * Author only
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);

	// Validate notebook ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de notebook invalide');
	}

	const notebookId = idValidation.data;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = updateNotebookSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const updateData = validation.data;

	// Check if notebook exists and user is the author
	const { data: existing, error: fetchError } = await locals.supabase
		.from('python_notebooks')
		.select('id, author_id')
		.eq('id', notebookId)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Notebook introuvable');
		}
		console.error('Error fetching notebook for update:', fetchError);
		throw error(500, 'Erreur lors de la verification du notebook');
	}

	if (existing.author_id !== user.id) {
		throw error(403, "Seul l'auteur peut modifier ce notebook");
	}

	// Update notebook
	const { data, error: updateError } = await locals.supabase
		.from('python_notebooks')
		.update(updateData)
		.eq('id', notebookId)
		.select()
		.single();

	if (updateError) {
		console.error('Error updating python notebook:', updateError);
		throw error(500, 'Erreur lors de la mise a jour du notebook Python');
	}

	return json({ notebook: data });
};

/**
 * DELETE /api/python-notebooks/[id]
 * Delete a Python notebook
 * Author only
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);

	// Validate notebook ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de notebook invalide');
	}

	const notebookId = idValidation.data;

	// Check if notebook exists and user is the author
	const { data: existing, error: fetchError } = await locals.supabase
		.from('python_notebooks')
		.select('id, author_id')
		.eq('id', notebookId)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Notebook introuvable');
		}
		console.error('Error fetching notebook for deletion:', fetchError);
		throw error(500, 'Erreur lors de la verification du notebook');
	}

	if (existing.author_id !== user.id) {
		throw error(403, "Seul l'auteur peut supprimer ce notebook");
	}

	// Delete notebook (cascade will delete assignments)
	const { error: deleteError } = await locals.supabase
		.from('python_notebooks')
		.delete()
		.eq('id', notebookId);

	if (deleteError) {
		console.error('Error deleting python notebook:', deleteError);
		throw error(500, 'Erreur lors de la suppression du notebook Python');
	}

	return json({ success: true, message: 'Notebook supprime avec succes' });
};
