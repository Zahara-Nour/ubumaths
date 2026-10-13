/**
 * API Route: /api/python-notebooks/[id]/share
 * POST - Share notebook with a class
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { z } from 'zod';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/python-notebooks/[id]/share/+server');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const shareNotebookSchema = z.object({
	class_id: z.string().uuid(),
	readonly: z.boolean().default(true)
});

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * POST /api/python-notebooks/[id]/share
 * Share notebook with a class
 * Teachers only
 * Must be the notebook author; teacher/admin role required (mono-teacher)
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

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

	const validation = shareNotebookSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	const { class_id, readonly } = validation.data;

	// Check if notebook exists and user is the author
	const { data: notebook, error: fetchError } = await locals.supabase
		.from('python_notebooks')
		.select('id, author_id, title, is_template')
		.eq('id', notebookId)
		.single();

	if (fetchError || !notebook) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Carnet introuvable');
		}
		logger.error('Error fetching notebook for sharing:', fetchError);
		throw error(500, 'Impossible de vérifier le carnet');
	}

	if (notebook.author_id !== user.id) {
		throw error(403, 'Seul l’auteur peut partager ce carnet');
	}

	// Refuse to assign a template to a class — templates are author-side
	// artefacts meant to be cloned, not consumed directly by students. The
	// teacher should clone the template first, then share the clone.
	if (notebook.is_template) {
		throw error(
			400,
			'Un modèle de carnet ne se partage pas directement : il faut d’abord le dupliquer'
		);
	}

	// Verify the class exists
	const { data: teacherClass, error: classError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', class_id)
		.single();

	if (classError || !teacherClass) {
		if (classError?.code === 'PGRST116') {
			throw error(404, 'Classe introuvable');
		}
		logger.error('Error fetching class for sharing:', classError);
		throw error(500, 'Impossible de vérifier la classe');
	}

	// Check if already shared with this class
	const { data: existing, error: existingError } = await locals.supabase
		.from('python_notebook_assignments')
		.select('id')
		.eq('notebook_id', notebookId)
		.eq('class_id', class_id)
		.maybeSingle();

	if (existingError) {
		logger.error('Error checking existing assignment:', existingError);
		throw error(500, 'Impossible de vérifier les partages existants');
	}

	if (existing) {
		throw error(400, 'Ce carnet est déjà partagé avec cette classe');
	}

	// Create assignment
	const { data: assignment, error: insertError } = await locals.supabase
		.from('python_notebook_assignments')
		.insert({
			notebook_id: notebookId,
			class_id,
			shared_by: user.id,
			readonly
		})
		.select()
		.single();

	if (insertError) {
		logger.error('Error creating notebook assignment:', insertError);
		if (insertError.code === '23505') {
			// Unique constraint violation
			throw error(400, 'Ce carnet est déjà partagé avec cette classe');
		}
		throw error(500, 'Impossible de partager le carnet');
	}

	return json(
		{
			assignment,
			message: `Carnet « ${notebook.title} » partagé avec la classe « ${teacherClass.name} »`
		},
		{ status: 201 }
	);
};
