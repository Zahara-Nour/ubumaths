/**
 * API Route: /api/tags
 * GET - List all available tags (sorted alphabetically)
 * POST - Create a new tag
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	validateCreateTag,
	tagListResponseSchema,
	createTagResponseSchema
} from '$lib/server/validation';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { requireRoles } from '$lib/server/middleware/auth';
import { isTaggableKind } from '$lib/server/resource-tags';

/**
 * GET /api/tags
 * Get all tags sorted alphabetically.
 * Read-only access is open to anonymous visitors so public pages (e.g.
 * /presques-evaluations) can offer tag-based filtering without auth.
 * Creation, however, is teacher/admin only: a tag is free text that anyone can
 * then read without an account.
 * Tag names are generic math themes (algèbre, géométrie, etc.) and carry
 * no PII, so exposing them publicly is safe.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { data, error: fetchError } = await locals.supabase
		.from('tags')
		.select('id, name, created_by, created_at')
		.order('name', { ascending: true });

	if (fetchError) {
		console.error('Failed to fetch tags:', fetchError);
		throw error(500, 'Failed to fetch tags');
	}

	// `?kind=` ordonne les suggestions sans jamais restreindre le catalogue.
	// Le catalogue est commun à tous les types — c'est ce qui permet à `dérivée`
	// de désigner la même chose sur un exercice et sur une fiche — mais proposer
	// 140 tags dont 122 hors sujet quand on étiquette un exercice Python est du
	// bruit. On remonte donc d'abord ceux déjà employés sur ce type.
	const rawKind = url.searchParams.get('kind');
	const kind = rawKind && isTaggableKind(rawKind) ? rawKind : null;

	let tags = data ?? [];
	if (kind) {
		const { data: used, error: usedError } = await locals.supabase
			.from('resource_tags')
			.select('tag_id')
			.eq('resource_kind', kind);

		// Le classement est un confort, pas une fonctionnalité : si la lecture
		// échoue on rend la liste alphabétique plutôt que de refuser la requête.
		// Mais on laisse une trace — un tri qui disparaît sans bruit ressemble à
		// un choix de conception, pas à une panne.
		if (usedError) {
			console.error('[tags] classement par type impossible:', usedError);
		} else {
			const usedIds = new Set((used ?? []).map((row) => row.tag_id));
			tags = tags
				.map((tag) => ({ ...tag, used_on_kind: usedIds.has(tag.id) }))
				.sort((a, b) => {
					if (a.used_on_kind !== b.used_on_kind) return a.used_on_kind ? -1 : 1;
					return a.name.localeCompare(b.name, 'fr');
				});
		}
	}

	// Validate response
	const validated = validateJsonResponse(tagListResponseSchema, { tags }, 'GET /api/tags');

	return json(validated);
};

/**
 * POST /api/tags
 * Create a new tag
 * Teachers and admins only can create tags
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	// Prof/admin seulement depuis 20260908160000 : la RLS refuse déjà l'écriture
	// à un élève, mais elle le fait par un 42501 que cette route traduirait en
	// 500 — un refus d'autorisation déguisé en panne. La garde applicative rend
	// le refus franc (403) et garde la RLS comme ceinture.
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateCreateTag(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { name } = validation.data;

	// Check if tag already exists (case-insensitive)
	const { data: existing, error: existingError } = await locals.supabase
		.from('tags')
		.select('id, name')
		.ilike('name', name)
		.single();

	// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
	// panne prenait le même visage et faisait conclure « rien ici », donc créer
	// par-dessus ce qu'on n'avait simplement pas su lire.
	if (existingError && existingError.code !== 'PGRST116') {
		console.error('Lecture impossible :', existingError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}

	if (existing) {
		// Return existing tag instead of creating duplicate
		const { data: fullTag, error: fullTagError } = await locals.supabase
			.from('tags')
			.select('id, name, created_by, created_at')
			.eq('id', existing.id)
			.single();

		// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
		// laisse une trace.
		if (fullTagError) {
			console.error('Enrichissement illisible :', fullTagError);
		}

		if (fullTag) {
			const validated = validateJsonResponse(
				createTagResponseSchema,
				fullTag,
				'POST /api/tags (existing)'
			);
			return json(validated, { status: 200 });
		}
	}

	// Create new tag
	const { data: newTag, error: insertError } = await locals.supabase
		.from('tags')
		.insert({
			name: name.trim(),
			created_by: user.id
		})
		.select('id, name, created_by, created_at')
		.single();

	if (insertError) {
		// Handle unique constraint violation
		if (insertError.code === '23505') {
			throw error(409, 'Ce tag existe déjà');
		}
		console.error('Failed to create tag:', insertError);
		throw error(500, 'Failed to create tag');
	}

	// Validate response
	const validated = validateJsonResponse(createTagResponseSchema, newTag, 'POST /api/tags');

	return json(validated, { status: 201 });
};
