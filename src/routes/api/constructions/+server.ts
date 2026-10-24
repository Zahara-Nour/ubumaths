/**
 * API Route: /api/constructions
 * GET - List constructions (toutes pour le prof, les publiées pour les autres)
 * POST - Create new construction
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
import type { TablesInsert } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';
import { syncResourceTags } from '$lib/server/resource-tags';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/constructions/+server');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Query parameters for listing constructions
 */
const listConstructionsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Request body for creating a construction
 */
const createConstructionSchema = z
	.object({
		title: z
			.string()
			.min(1, 'Le titre est requis')
			.max(200, 'Le titre ne doit pas dépasser 200 caractères'),
		description: z
			.string()
			.max(2000, 'La description ne doit pas dépasser 2000 caractères')
			.optional(),
		format: z.enum(['json', 'dsl']).default('json'),
		script: constructionScriptSchema.optional(),
		dsl_script: z.string().max(50000, 'Le script DSL est trop long').optional(),
		is_public: z.boolean().default(false),
		tags: z.array(z.string().min(1).max(50)).max(10, '10 tags au maximum').optional()
	})
	.refine(
		(data) =>
			(data.format === 'json' && data.script !== undefined) ||
			(data.format === 'dsl' && data.dsl_script !== undefined),
		{ message: 'Script requis : JSON pour le format json, DSL pour le format dsl' }
	);

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * GET /api/constructions
 * Toutes pour le prof, brouillons compris ; les publiées pour les autres
 * Authenticated users only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { profile } = await requireAuth(locals);

	// Validate query parameters
	const queryResult = listConstructionsQuerySchema.safeParse({
		page: url.searchParams.get('page') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	});

	if (!queryResult.success) {
		const errorMsg = queryResult.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Paramètres invalides : ${errorMsg}`);
	}

	const { page, limit } = queryResult.data;
	const offset = (page - 1) * limit;

	let query = locals.supabase.from('constructions').select(
		`
			id,
			title,
			description,
			format,
			is_public,
			created_at,
			updated_at
		`,
		{ count: 'exact' }
	);

	// La RLS tient la même règle ; le filtre la double.
	if (!canAuthorConstructions(profile.role)) query = query.eq('is_public', true);

	query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

	const { data, error: queryError, count } = await query;

	if (queryError) {
		logger.error('Error fetching constructions:', queryError);
		throw error(500, 'Impossible de charger les constructions');
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
 * Prof seul (la RLS tient la même règle, migration 20261024120000)
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	await requireRoles(locals, CONSTRUCTION_AUTHOR_ROLES);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = createConstructionSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	const { title, description, format, script, dsl_script, is_public, tags } = validation.data;

	// Insert construction
	const { data, error: insertError } = await locals.supabase
		.from('constructions')
		.insert({
			title,
			// Postgres exprime l'absence par `null`, Zod par `undefined`.
			description: description ?? null,
			format,
			// `script` est une colonne jsonb : conversion explicite plutôt que cast.
			script: toJson(format === 'json' ? script : {}),
			dsl_script: format === 'dsl' ? (dsl_script ?? null) : null,
			is_public
		} satisfies TablesInsert<'constructions'>)
		.select(CONSTRUCTION_COLUMNS)
		.single();

	// Les étiquettes ne sont plus une colonne : elles vont dans `resource_tags`.
	if (!insertError && data && tags && tags.length > 0) {
		await syncResourceTags(locals.supabase, 'construction', data.id, tags);
	}

	if (insertError) {
		logger.error('Error creating construction:', insertError);
		throw error(500, 'Impossible de créer la construction');
	}

	return json({ construction: data }, { status: 201 });
};
