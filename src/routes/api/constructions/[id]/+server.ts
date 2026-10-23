/**
 * API Route: /api/constructions/[id]
 * GET - Get construction by ID
 * PUT - Update construction
 * DELETE - Delete construction
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth, requireRoles } from '$lib/server/middleware/auth';
import { CONSTRUCTION_AUTHOR_ROLES } from '$lib/server/constructions-access';
import { constructionScriptSchema } from '$lib/constructions';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/constructions/[id]/+server');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid('Identifiant invalide');

/**
 * Request body for updating a construction
 */
const updateConstructionSchema = z.object({
	title: z
		.string()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre ne doit pas dépasser 200 caractères')
		.optional(),
	description: z
		.string()
		.max(2000, 'La description ne doit pas dépasser 2000 caractères')
		.optional(),
	script: constructionScriptSchema.optional(),
	dsl_script: z.string().max(50000, 'Le script DSL est trop long').optional(),
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
		throw error(400, 'Identifiant de construction invalide');
	}

	// Fetch construction
	const { data, error: queryError } = await locals.supabase
		.from('constructions')
		.select('*')
		.eq('id', params.id)
		.single();

	if (queryError || !data) {
		if (queryError?.code === 'PGRST116') {
			throw error(404, 'Construction introuvable');
		}
		logger.error('Error fetching construction:', queryError);
		throw error(500, 'Impossible de charger la construction');
	}

	// Check access: user must be owner OR construction must be public
	if (data.author_id !== user.id && !data.is_public) {
		throw error(403, 'Accès refusé à cette construction');
	}

	return json({ construction: data });
};

/**
 * PUT /api/constructions/[id]
 * Update construction
 * Only the owner can update, and only if teacher or admin (RLS enforces the same rule)
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRoles(locals, CONSTRUCTION_AUTHOR_ROLES);

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de construction invalide');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = updateConstructionSchema.safeParse(body);

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

	// First check if user owns this construction
	const { data: existing, error: fetchError } = await locals.supabase
		.from('constructions')
		.select('author_id')
		.eq('id', params.id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Construction introuvable');
		}
		logger.error('Error fetching construction:', fetchError);
		throw error(500, 'Impossible de charger la construction');
	}

	if (existing.author_id !== user.id) {
		throw error(403, 'Seul l’auteur peut modifier cette construction');
	}

	// Update construction
	const { data, error: updateError } = await locals.supabase
		.from('constructions')
		.update(updateData)
		.eq('id', params.id)
		.select()
		.single();

	// Un refus RLS rend zéro ligne : `.single()` répond PGRST116
	if (updateError?.code === 'PGRST116') {
		throw error(404, 'Construction introuvable');
	}
	if (updateError) {
		logger.error('Error updating construction:', updateError);
		throw error(500, 'Impossible de modifier la construction');
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
		throw error(400, 'Identifiant de construction invalide');
	}

	// First check if user owns this construction
	const { data: existing, error: fetchError } = await locals.supabase
		.from('constructions')
		.select('author_id')
		.eq('id', params.id)
		.single();

	if (fetchError || !existing) {
		if (fetchError?.code === 'PGRST116') {
			throw error(404, 'Construction introuvable');
		}
		logger.error('Error fetching construction:', fetchError);
		throw error(500, 'Impossible de charger la construction');
	}

	if (existing.author_id !== user.id) {
		throw error(403, 'Seul l’auteur peut supprimer cette construction');
	}

	// Delete construction (un refus RLS rend zéro ligne, sans erreur)
	const { data: deleted, error: deleteError } = await locals.supabase
		.from('constructions')
		.delete()
		.eq('id', params.id)
		.select('id');

	if (deleteError) {
		logger.error('Error deleting construction:', deleteError);
		throw error(500, 'Impossible de supprimer la construction');
	}
	if (!deleted || deleted.length === 0) {
		throw error(404, 'Construction introuvable');
	}

	return json({ success: true });
};
