/**
 * API Route: /api/constructions/[id]
 * GET - Get construction by ID
 * PUT - Update construction
 * DELETE - Delete construction
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { constructionScriptSchema } from '$lib/constructions';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid('ID invalide');

/**
 * Request body for updating a construction
 */
const updateConstructionSchema = z.object({
	title: z
		.string()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre ne doit pas depasser 200 caracteres')
		.optional(),
	description: z
		.string()
		.max(2000, 'La description ne doit pas depasser 2000 caracteres')
		.optional(),
	script: constructionScriptSchema.optional(),
	is_public: z.boolean().optional()
});

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/constructions/[id]
 * Get construction by ID
 * Authenticated users only (must be owner or construction must be public)
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de construction invalide');
	}

	// Fetch construction
	const { data, error: queryError } = await locals.supabase
		.from('constructions')
		.select(
			`
			*,
			profiles!constructions_author_id_fkey (
				firstname,
				lastname
			)
		`
		)
		.eq('id', params.id)
		.single();

	if (queryError || !data) {
		if (queryError?.code === 'PGRST116') {
			throw error(404, 'Construction non trouvee');
		}
		console.error('Error fetching construction:', queryError);
		throw error(500, 'Erreur lors de la recuperation de la construction');
	}

	// Check access: user must be owner OR construction must be public
	if (data.author_id !== user.id && !data.is_public) {
		throw error(403, 'Acces refuse a cette construction');
	}

	return json({ construction: data });
};

/**
 * PUT /api/constructions/[id]
 * Update construction
 * Only the owner can update
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de construction invalide');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = updateConstructionSchema.safeParse(body);

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

	// First check if user owns this construction
	const { data: existing, error: fetchError } = await locals.supabase
		.from('constructions')
		.select('author_id')
		.eq('id', params.id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Construction non trouvee');
		}
		console.error('Error fetching construction:', fetchError);
		throw error(500, 'Erreur lors de la recuperation de la construction');
	}

	if (existing.author_id !== user.id) {
		throw error(403, 'Vous ne pouvez modifier que vos propres constructions');
	}

	// Update construction
	const { data, error: updateError } = await locals.supabase
		.from('constructions')
		.update(updateData)
		.eq('id', params.id)
		.select()
		.single();

	if (updateError) {
		console.error('Error updating construction:', updateError);
		throw error(500, 'Erreur lors de la mise a jour de la construction');
	}

	return json({ construction: data });
};

/**
 * DELETE /api/constructions/[id]
 * Delete construction
 * Only the owner can delete
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de construction invalide');
	}

	// First check if user owns this construction
	const { data: existing, error: fetchError } = await locals.supabase
		.from('constructions')
		.select('author_id')
		.eq('id', params.id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Construction non trouvee');
		}
		console.error('Error fetching construction:', fetchError);
		throw error(500, 'Erreur lors de la recuperation de la construction');
	}

	if (existing.author_id !== user.id) {
		throw error(403, 'Vous ne pouvez supprimer que vos propres constructions');
	}

	// Delete construction
	const { error: deleteError } = await locals.supabase
		.from('constructions')
		.delete()
		.eq('id', params.id);

	if (deleteError) {
		console.error('Error deleting construction:', deleteError);
		throw error(500, 'Erreur lors de la suppression de la construction');
	}

	return json({ success: true });
};
