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
import { toJson } from '$lib/types/database-helpers';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/python-notebooks/[id]/+server');

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
		throw error(400, 'Identifiant de carnet invalide');
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
			throw error(404, 'Carnet introuvable');
		}
		logger.error('Error fetching python notebook:', queryError);
		throw error(500, 'Impossible de charger le carnet');
	}

	if (!notebook) {
		throw error(404, 'Carnet introuvable');
	}

	// Check access permissions
	const isOwner = notebook.author_id === user.id;
	const isPublicAndTeacher = notebook.is_public && profile.role === 'teacher';

	// Check if student has it assigned
	let isAssigned = false;
	if (profile.role === 'student') {
		const { data: assignment, error: assignmentError } = await locals.supabase
			.from('python_notebook_assignments')
			.select('id, readonly')
			.eq('notebook_id', notebookId)
			.limit(1)
			.maybeSingle();

		// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
		// panne doit se distinguer d'un refus mérité.
		if (assignmentError && assignmentError.code !== 'PGRST116') {
			logger.error('Contrôle d’accès impossible :', assignmentError);
			throw error(500, 'Impossible de vérifier les droits d’accès');
		}

		isAssigned = !!assignment;
	}

	if (!isOwner && !isPublicAndTeacher && !isAssigned) {
		throw error(403, 'Accès refusé à ce carnet');
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
		throw error(400, 'Identifiant de carnet invalide');
	}

	const notebookId = idValidation.data;

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = updateNotebookSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
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
			throw error(404, 'Carnet introuvable');
		}
		logger.error('Error fetching notebook for update:', fetchError);
		throw error(500, 'Impossible de vérifier le carnet');
	}

	if (existing.author_id !== user.id) {
		throw error(403, 'Seul l’auteur peut modifier ce carnet');
	}

	// Update notebook
	const { content, ...reste } = updateData;

	const { data, error: updateError } = await locals.supabase
		.from('python_notebooks')
		// `content` part dans une colonne jsonb : conversion explicite, sans
		// toucher aux champs absents d'une mise à jour partielle.
		.update({
			// Le champ jsonb est retiré du spread puis réinjecté converti : le
			// laisser passer garderait son type métier dans l'union.
			...reste,
			...(content !== undefined ? { content: toJson(content) } : {})
		})
		.eq('id', notebookId)
		.select()
		.single();

	if (updateError) {
		logger.error('Error updating python notebook:', updateError);
		throw error(500, 'Impossible de modifier le carnet');
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
		throw error(400, 'Identifiant de carnet invalide');
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
			throw error(404, 'Carnet introuvable');
		}
		logger.error('Error fetching notebook for deletion:', fetchError);
		throw error(500, 'Impossible de vérifier le carnet');
	}

	if (existing.author_id !== user.id) {
		throw error(403, 'Seul l’auteur peut supprimer ce carnet');
	}

	// Delete notebook (cascade will delete assignments)
	const { error: deleteError } = await locals.supabase
		.from('python_notebooks')
		.delete()
		.eq('id', notebookId);

	if (deleteError) {
		logger.error('Error deleting python notebook:', deleteError);
		throw error(500, 'Impossible de supprimer le carnet');
	}

	return json({ success: true, message: 'Carnet supprimé' });
};
