/**
 * API Route: /api/constructions
 * GET - List constructions (user's own + public)
 * POST - Create new construction
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
 * Query parameters for listing constructions
 */
const listConstructionsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	onlyMine: z
		.enum(['true', 'false'])
		.default('false')
		.transform((v) => v === 'true')
});

/**
 * Request body for creating a construction
 */
const createConstructionSchema = z.object({
	title: z
		.string()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre ne doit pas depasser 200 caracteres'),
	description: z
		.string()
		.max(2000, 'La description ne doit pas depasser 2000 caracteres')
		.optional(),
	script: constructionScriptSchema,
	is_public: z.boolean().default(false),
	tags: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags autorises').optional()
});

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/constructions
 * Get constructions (user's own + public)
 * Authenticated users only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await requireAuth(locals);

	// Validate query parameters
	const queryResult = listConstructionsQuerySchema.safeParse({
		page: url.searchParams.get('page') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		onlyMine: url.searchParams.get('onlyMine') ?? undefined
	});

	if (!queryResult.success) {
		const errorMsg = queryResult.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Parametres de requete invalides: ${errorMsg}`);
	}

	const { page, limit, onlyMine } = queryResult.data;
	const offset = (page - 1) * limit;

	// Build query - user's own constructions OR public constructions
	let query = locals.supabase.from('constructions').select(
		`
			id,
			title,
			description,
			is_public,
			created_at,
			updated_at,
			author_id,
			profiles!constructions_author_id_fkey (
				firstname,
				lastname
			)
		`,
		{ count: 'exact' }
	);

	if (onlyMine) {
		// Only user's constructions
		query = query.eq('author_id', user.id);
	} else {
		// User's own OR public constructions
		query = query.or(`author_id.eq.${user.id},is_public.eq.true`);
	}

	query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

	const { data, error: queryError, count } = await query;

	if (queryError) {
		console.error('Error fetching constructions:', queryError);
		throw error(500, 'Erreur lors de la recuperation des constructions');
	}

	const totalPages = count ? Math.ceil(count / limit) : 0;

	return json({
		constructions: data ?? [],
		pagination: {
			page,
			limit,
			total: count ?? 0,
			totalPages
		}
	});
};

/**
 * POST /api/constructions
 * Create a new construction
 * Authenticated users only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireAuth(locals);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const validation = createConstructionSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const { title, description, script, is_public, tags } = validation.data;

	// Insert construction
	const { data, error: insertError } = await locals.supabase
		.from('constructions')
		.insert({
			title,
			description,
			script,
			is_public,
			tags: tags ?? null,
			author_id: user.id
		})
		.select()
		.single();

	if (insertError) {
		console.error('Error creating construction:', insertError);
		throw error(500, 'Erreur lors de la creation de la construction');
	}

	return json({ construction: data }, { status: 201 });
};
