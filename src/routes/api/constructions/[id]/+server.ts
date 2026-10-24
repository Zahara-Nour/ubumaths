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
import {
	CONSTRUCTION_AUTHOR_ROLES,
	CONSTRUCTION_COLUMNS,
	canAuthorConstructions
} from '$lib/server/constructions-access';
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
 * Connecté ; un brouillon n'est rendu qu'au prof
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { profile } = await requireAuth(locals);

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de construction invalide');
	}

	// Fetch construction
	const { data, error: queryError } = await locals.supabase
		.from('constructions')
		.select(CONSTRUCTION_COLUMNS)
		.eq('id', params.id)
		.single();

	if (queryError || !data) {
		if (queryError?.code === 'PGRST116') {
			throw error(404, 'Construction introuvable');
		}
		logger.error('Error fetching construction:', queryError);
		throw error(500, 'Impossible de charger la construction');
	}

	// La RLS masque déjà les brouillons : 404 plutôt que 403, pour ne pas confirmer
	// qu'il existe.
	if (!data.is_public && !canAuthorConstructions(profile.role)) {
		throw error(404, 'Construction introuvable');
	}

	return json({ construction: data });
};

/**
 * PUT /api/constructions/[id]
 * Update construction
 * Prof seul (la RLS tient la même règle, migration 20261024120100)
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	await requireRoles(locals, CONSTRUCTION_AUTHOR_ROLES);

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

	// Update construction
	const { data, error: updateError } = await locals.supabase
		.from('constructions')
		.update(updateData)
		.eq('id', params.id)
		.select(CONSTRUCTION_COLUMNS)
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
 * Prof seul (la RLS tient la même règle, migration 20261024120100)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	await requireRoles(locals, CONSTRUCTION_AUTHOR_ROLES);

	// Validate UUID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de construction invalide');
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
