/**
 * Public exercise page - load exercise by slug or ID
 *
 * Supports:
 * - Public exercises (is_public=true)
 * - Private exercises via share token (?token=...)
 * - URL params for variation and seed (?variation=...&seed=...)
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExerciseBySlug, getExercise } from '$lib/server/exercises';
import { getExerciseByShareToken, recordTokenAccess } from '$lib/server/exercise-share-tokens';
import type { Exercise } from '$lib/exercises/types';

/**
 * Check if string is a valid UUID v4
 */
function isUUID(str: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(str);
}

/**
 * Convert database row to Exercise type
 */
function dbRowToExercise(
	dbExercise: NonNullable<Awaited<ReturnType<typeof getExerciseBySlug>>['data']>
): Exercise {
	return {
		id: dbExercise.id,
		slug: dbExercise.slug ?? undefined,
		title: dbExercise.title ?? undefined,
		source: dbExercise.source ?? undefined,
		difficulty: dbExercise.difficulty as 1 | 2 | 3,
		tags: (dbExercise.tags as string[]) || [],
		statement_md: dbExercise.statement_md,
		solution_md: dbExercise.solution_md,
		variables: dbExercise.variables as unknown as Exercise['variables'],
		distribution_mode: dbExercise.distribution_mode as Exercise['distribution_mode'],
		is_public: dbExercise.is_public,
		grade_levels: dbExercise.grade_levels ?? undefined,
		topic: dbExercise.topic ?? undefined,
		resources: dbExercise.resources as unknown as Exercise['resources'],
		created_at: dbExercise.created_at,
		updated_at: dbExercise.updated_at,
		created_by: dbExercise.created_by,
		// Variations support
		shared: dbExercise.shared as unknown as Exercise['shared'],
		variations: dbExercise.variations as unknown as Exercise['variations'],
		generic_functions: dbExercise.generic_functions ?? undefined
	};
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { slug } = params;
	const token = url.searchParams.get('token');
	const variationParam = url.searchParams.get('variation');
	const seedParam = url.searchParams.get('seed');

	let dbExercise: Awaited<ReturnType<typeof getExerciseBySlug>>['data'] = null;
	let accessViaToken = false;

	// Strategy 1: If token is provided, use it to get exercise directly
	if (token) {
		const tokenResult = await getExerciseByShareToken(locals.supabase, token);
		if (tokenResult.error) {
			// Token-specific error (invalid, expired, revoked)
			throw error(403, tokenResult.error);
		}
		if (tokenResult.data) {
			// Cast Exercise back to DB row format for consistency
			// (getExerciseByShareToken returns Exercise type directly)
			dbExercise = tokenResult.data as unknown as typeof dbExercise;
			accessViaToken = true;
			// Record access (fire-and-forget)
			recordTokenAccess(locals.supabase, token);
		}
	}

	// Strategy 2: Try to fetch by slug
	if (!dbExercise) {
		const result = await getExerciseBySlug(locals.supabase, slug);
		if (result.data) {
			dbExercise = result.data;
		}
	}

	// Strategy 3: Fallback to fetch by ID if slug looks like UUID
	if (!dbExercise && isUUID(slug)) {
		const result = await getExercise(locals.supabase, slug);
		if (result.data) {
			dbExercise = result.data;
		}
	}

	// No exercise found
	if (!dbExercise) {
		throw error(404, 'Exercice introuvable');
	}

	// Access control: public OR valid token
	// Note: if token was provided and valid for ANY exercise, accessViaToken is already true
	// If token was provided but invalid/expired, error was already thrown above
	if (!dbExercise.is_public && !accessViaToken) {
		throw error(403, "Cet exercice n'est pas public. Un lien de partage est requis.");
	}

	// Convert to Exercise type
	const exercise = dbRowToExercise(dbExercise);

	// Parse URL params
	const initialSeed = seedParam ? parseInt(seedParam, 10) : undefined;
	const initialVariation = variationParam || undefined;

	return {
		exercise,
		initialVariation,
		initialSeed: Number.isNaN(initialSeed) ? undefined : initialSeed,
		hasToken: !!token
	};
};
