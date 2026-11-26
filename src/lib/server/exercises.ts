/**
 * Server-side functions for Exercise Bank operations
 *
 * @module server/exercises
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { Exercise, DistributionMode, InstanceGenerationResult } from '#lib/exercises/types.ts';
import type { GradeCode } from '#lib/types/grades.ts';
import type { Variable } from '#lib/ubumark/index.ts';
import {
	generateExerciseInstance,
	generateStudentSeed,
	generateGroupSeed,
	isParameterized
} from '#lib/exercises/generator/instance-generator.ts';
import { generateExerciseSlug } from '#lib/exercises/slug-generator.ts';
import {
	SearchIndexedRequiresPublicError,
	consistentSearchIndexed
} from '#lib/server/exercise-search-indexed.ts';
import {
	fetchResourceIdsByAnyTag,
	fetchResourceTagNames,
	fetchTagNamesForResources,
	syncResourceTags
} from '#lib/server/resource-tags.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import {
	createFirstVersion,
	saveExerciseWithVersion,
	splitVersionContent,
	withLatestVersion,
	withLatestVersions,
	withVersionContent
} from '#lib/server/exercise-versions.ts';

const logger = createServerLogger('server/exercises');

type _Exercise = Database['public']['Tables']['exercises']['Row'];
type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];
type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];

/**
 * Exercise category type
 */
type ExerciseCategory =
	| 'automatisme'
	| 'application'
	| 'adaptation'
	| 'recherche'
	| 'tache_complexe'
	| 'situation_probleme'
	| 'challenge'
	| 'mission'
	| 'synthese';

/**
 * Filters for listing exercises
 */
export interface ExerciseFilters {
	category?: ExerciseCategory;
	tags?: string[];
	topic?: string;
	grades?: GradeCode[];
	search?: string; // Full-text search on title and source
	parameterized?: boolean; // Filter for exercises with/without variables
}

/**
 * Pagination options
 */
export interface PaginationOptions {
	page?: number; // Default: 1
	limit?: number; // Default: 50, max: 100
	sortBy?: 'title' | 'updated_at'; // Default: 'updated_at'
	sortOrder?: 'asc' | 'desc'; // Default: 'desc' (most recent first)
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate distribution mode value
 *
 * @param mode - Value to validate
 * @returns True if valid distribution mode
 */
function isValidDistributionMode(mode: unknown): mode is DistributionMode {
	return mode === 'on_demand' || mode === 'per_student' || mode === 'per_group';
}

/**
 * Validate and serialize variables for database insert
 *
 * @param variables - Variables to validate
 * @returns Validated variables or error
 */
function validateVariables(
	variables: unknown
): { valid: true; variables: Variable[] } | { valid: false; error: string } {
	// If undefined or null, return empty array (static exercise)
	if (variables === undefined || variables === null) {
		return { valid: true, variables: [] };
	}

	// Must be an array
	if (!Array.isArray(variables)) {
		return { valid: false, error: 'Variables must be an array' };
	}

	// Validate each variable has required fields
	for (const variable of variables) {
		if (!variable || typeof variable !== 'object') {
			return { valid: false, error: 'Each variable must be an object' };
		}
		if (!variable.name || typeof variable.name !== 'string') {
			return { valid: false, error: 'Each variable must have a name (string)' };
		}
		if (!variable.expression || typeof variable.expression !== 'string') {
			return { valid: false, error: 'Each variable must have an expression (string)' };
		}
	}

	return { valid: true, variables: variables as Variable[] };
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get exercises with filters and pagination
 *
 * Aucun filtre d'auteur ici : la RLS de `exercises` rend au professeur ses
 * propres exercices et les exercices publics (`is_public`), pas ceux des autres
 * (depuis 20260618093000). Appelée par `GET /api/exercises` (sélecteur
 * d'exercices de l'éditeur de fiche).
 */
export async function getExercises(
	supabase: SupabaseClient<Database>,
	filters: ExerciseFilters = {},
	pagination: PaginationOptions = {}
) {
	const page = Math.max(1, pagination.page || 1);
	const limit = Math.min(100, Math.max(1, pagination.limit || 50));
	const offset = (page - 1) * limit;

	// Les tags sont lus séparément, en une requête groupée (voir plus bas).
	// `exercise_tags` n'existe plus, et une jointure PostgREST vers une table
	// supprimée est une CHAÎNE : ni le typecheck ni le compilateur ne peuvent la
	// valider. C'est ce qui a fait passer ce bug jusqu'en production.
	let query = supabase
		.from('exercises')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false });

	// Apply filters
	if (filters.category) {
		query = query.eq('category', filters.category);
	}

	if (filters.tags && filters.tags.length > 0) {
		// Filtrage via `resource_tags` (remplace le .contains sur l'ancienne colonne).
		const ids = await fetchResourceIdsByAnyTag(supabase, 'exercise', filters.tags);
		if (ids.length === 0) {
			return { data: [], error: null, count: 0, page, limit, totalPages: 0 };
		}
		query = query.in('id', ids);
	}

	if (filters.topic) {
		query = query.eq('topic', filters.topic);
	}

	if (filters.grades && filters.grades.length > 0) {
		query = query.overlaps('grades', filters.grades);
	}

	if (filters.search) {
		// Full-text search on title and source
		query = query.textSearch(
			"to_tsvector(coalesce(title, '') || ' ' || coalesce(source, ''))",
			filters.search,
			{
				type: 'websearch',
				config: 'french'
			}
		);
	}

	if (filters.parameterized !== undefined) {
		// Filter for parameterized exercises (have variables)
		if (filters.parameterized) {
			// Has variables (array not empty)
			query = query.not('variables', 'is', null).neq('variables', '[]');
		} else {
			// No variables (null or empty array)
			query = query.or('variables.is.null,variables.eq.[]');
		}
	}

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	const { data, error, count } = await query;

	if (error) {
		logger.error('Error fetching exercises:', error);
		return { data: null, error, count: 0 };
	}

	// Lecture groupée : une requête pour toute la page, pas une par ligne.
	const tagsByExercise = await fetchTagNamesForResources(
		supabase,
		'exercise',
		(data ?? []).map((row) => (row as { id: string }).id)
	);

	// Contenu : la DERNIÈRE version de chaque exercice (hors fiche, ADR 0044).
	const withContent = await withLatestVersions(supabase, data ?? []);
	const enriched = withContent.map((row) => ({
		...row,
		tags: tagsByExercise.get(row.id) ?? []
	}));

	return {
		data: enriched,
		error: null,
		count: count || 0,
		page,
		limit,
		totalPages: count ? Math.ceil(count / limit) : 0
	};
}

/**
 * Get a single exercise by ID.
 *
 * Tags are fetched from `resource_tags` and merged into the returned
 * object as `tags: string[]` (API contract preserved).
 */
export async function getExercise(supabase: SupabaseClient<Database>, id: string) {
	const { data, error } = await supabase.from('exercises').select('*').eq('id', id).single();

	if (error) {
		logger.error('Error fetching exercise:', error);
		return { data: null, error };
	}

	const tags = await fetchResourceTagNames(supabase, 'exercise', id).catch(() => []);
	// Contenu : la DERNIÈRE version (hors fiche, ADR 0044).
	const withContent = await withLatestVersion(supabase, data);
	return { data: { ...withContent, tags }, error: null };
}

/**
 * Get a single exercise by slug.
 *
 * Tags are fetched from `resource_tags` and merged into the returned
 * object as `tags: string[]` (API contract preserved).
 */
export async function getExerciseBySlug(supabase: SupabaseClient<Database>, slug: string) {
	const { data, error } = await supabase.from('exercises').select('*').eq('slug', slug).single();

	if (error) {
		logger.error('Error fetching exercise by slug:', error);
		return { data: null, error };
	}

	const tags = await fetchResourceTagNames(supabase, 'exercise', data.id).catch(() => []);
	// Contenu : la DERNIÈRE version (hors fiche, ADR 0044).
	const withContent = await withLatestVersion(supabase, data);
	return { data: { ...withContent, tags }, error: null };
}

/**
 * Create a new exercise
 * Only teachers can create exercises
 *
 * Supports both legacy format (statement_md, solution_md, variables) and
 * variations format (variations array with optional shared defaults).
 */
export async function createExercise(
	supabase: SupabaseClient<Database>,
	exercise: Omit<ExerciseInsert, 'created_by'>,
	userId: string
) {
	// Validate distribution_mode if provided
	const distributionMode = exercise.distribution_mode || 'on_demand';
	if (!isValidDistributionMode(distributionMode)) {
		return {
			data: null,
			error: new Error(
				`Invalid distribution_mode: ${distributionMode}. Must be one of: on_demand, per_student, per_group`
			)
		};
	}

	// « Afficher sur Google » exige un exercice public (CHECK 23514 en base) :
	// refusé ici avec un message lisible plutôt qu'à l'écriture.
	if (exercise.search_indexed === true && exercise.is_public !== true) {
		return { data: null, error: new SearchIndexedRequiresPublicError() };
	}

	// Validate legacy variables (if provided) - backward compatibility
	// Note: The legacy 'variables' field is separate from variations.variables
	const variablesValidation = validateVariables(exercise.variables);
	if (!variablesValidation.valid) {
		return {
			data: null,
			error: new Error(`Invalid variables: ${variablesValidation.error}`)
		};
	}

	// Generate slug if not provided
	const slug =
		(exercise as { slug?: string }).slug ||
		generateExerciseSlug((exercise as { topic?: string }).topic);

	// Tags are stored in `resource_tags`, not on the row.
	// Strip them from the row insert; we'll attach them via the junction below.
	const exerciseTags = (exercise as { tags?: unknown }).tags;
	const tagNames: string[] = Array.isArray(exerciseTags) ? (exerciseTags as string[]) : [];
	const { tags: _droppedTags, ...exerciseWithoutTags } = exercise as Omit<
		ExerciseInsert,
		'created_by'
	> & { tags?: string[] };

	// Le contenu (variations, shared, generic_functions) va dans la version 1 (ADR 0044) ;
	// la ligne d'`exercises` ne garde que la fiche d'identité. Contenu validé par Zod à l'API.
	const { identity, content } = splitVersionContent(exerciseWithoutTags);
	const insertData = {
		...identity,
		slug,
		variables:
			variablesValidation.variables.length > 0
				? (variablesValidation.variables as unknown as Database['public']['Tables']['exercises']['Row']['variables'])
				: undefined,
		distribution_mode: distributionMode,
		created_by: userId,
		// Jamais coché implicitement : seule une demande explicite sur un exercice public.
		search_indexed: consistentSearchIndexed(exercise.is_public, exercise.search_indexed)
	};

	const { data: created, error } = await supabase
		.from('exercises')
		.insert(insertData)
		.select()
		.single();

	if (error) {
		logger.error('Error creating exercise:', error);
		return { data: null, error };
	}

	// Version 1. En cas d'échec, l'exercice sans version est retiré : il ne se lirait pas.
	let data: typeof created;
	try {
		const v1 = await createFirstVersion(supabase, created.id, content, userId);
		data = {
			...created,
			variations: v1.variations,
			shared: v1.shared,
			generic_functions: v1.generic_functions
		};
	} catch (e) {
		logger.error('Failed to create version 1 — rolling back:', e);
		await supabase.from('exercises').delete().eq('id', created.id).select('id');
		return {
			data: null,
			error: e instanceof Error ? e : new Error('Failed to create version 1')
		};
	}

	// Attach tags via the junction (auto-creates missing catalog rows).
	// If this fails, rollback by deleting the orphan exercise — otherwise the row
	// stays in the DB without its declared tags, which is silently inconsistent.
	if (tagNames.length > 0 && data) {
		try {
			await syncResourceTags(supabase, 'exercise', data.id, tagNames);
		} catch (e) {
			logger.error('Failed to attach tags to new exercise — rolling back:', e);
			await supabase.from('exercises').delete().eq('id', data.id);
			return {
				data: null,
				error: e instanceof Error ? e : new Error('Failed to attach tags to exercise')
			};
		}
	}

	return { data: data ? { ...data, tags: tagNames } : data, error: null };
}

/**
 * Update an existing exercise
 * Only the creator can update their own exercise
 *
 * Supports updating both legacy format fields and variations/shared fields.
 */
export async function updateExercise(
	supabase: SupabaseClient<Database>,
	id: string,
	updates: Omit<ExerciseUpdate, 'id' | 'created_by' | 'created_at'>,
	userId: string,
	/** Version à modifier (une version de CET exercice) ; la dernière par défaut */
	versionId?: string
) {
	// First check if exercise exists and user owns it
	const { data: existing, error: fetchError } = await getExercise(supabase, id);

	if (fetchError || !existing) {
		return { data: null, error: new Error('Exercise not found') };
	}

	if (existing.created_by !== userId) {
		return { data: null, error: new Error('Unauthorized') };
	}

	// « Afficher sur Google » exige un exercice public (CHECK 23514 en base).
	// Visibilité finale = celle demandée, sinon celle déjà enregistrée.
	const willBePublic = updates.is_public ?? existing.is_public;
	if (!willBePublic) {
		if (updates.search_indexed === true) {
			return { data: null, error: new SearchIndexedRequiresPublicError() };
		}
		// Dépublier décoche Google dans la MÊME écriture, sinon la base refuse
		// la mise à jour dès que la case était cochée.
		updates = { ...updates, search_indexed: false };
	}

	// Validate distribution_mode if provided
	if (updates.distribution_mode !== undefined) {
		if (!isValidDistributionMode(updates.distribution_mode)) {
			return {
				data: null,
				error: new Error(
					`Invalid distribution_mode: ${updates.distribution_mode}. Must be one of: on_demand, per_student, per_group`
				)
			};
		}
	}

	// Validate legacy variables if provided
	if (updates.variables !== undefined) {
		const variablesValidation = validateVariables(updates.variables);
		if (!variablesValidation.valid) {
			return {
				data: null,
				error: new Error(`Invalid variables: ${variablesValidation.error}`)
			};
		}
		// Replace with validated variables
		updates = {
			...updates,
			variables:
				variablesValidation.variables.length > 0
					? (variablesValidation.variables as unknown as Database['public']['Tables']['exercises']['Row']['variables'])
					: undefined
		};
	}

	// Tags are stored in the junction table; strip them from the row update.
	const tagsUpdate: string[] | undefined = Array.isArray((updates as { tags?: unknown }).tags)
		? ((updates as { tags: string[] }).tags ?? undefined)
		: undefined;
	const { tags: _droppedTags, ...updatesWithoutTags } = updates as Omit<
		ExerciseUpdate,
		'id' | 'created_by' | 'created_at'
	> & { tags?: string[] };

	// Le contenu (validé par Zod à l'API) va dans la version demandée, la DERNIÈRE par défaut,
	// modifiée sur place (ADR 0044 point 3) ; la fiche d'identité reste sur `exercises`. Les deux
	// sont écrites ensemble par la base : tout ou rien.
	const { identity, content } = splitVersionContent(updatesWithoutTags);

	let data: Awaited<ReturnType<typeof getExercise>>['data'];
	try {
		const version = await saveExerciseWithVersion(supabase, id, identity, content, versionId);
		const { data: row, error: rowError } = await supabase
			.from('exercises')
			.select('*')
			.eq('id', id)
			.single();
		if (rowError) throw rowError;
		data = { ...withVersionContent(row, version), tags: existing.tags ?? [] };
	} catch (e) {
		logger.error('Error updating exercise:', e);
		// Erreur PostgREST : un objet, pas une `Error` ; son `code` est gardé (23514, P0002…)
		const err =
			e instanceof Error
				? e
				: Object.assign(new Error(String((e as { message?: unknown }).message ?? e)), e);
		return { data: null, error: err as Error & { code?: string } };
	}

	// Sync tags via the junction if the caller supplied any.
	// On failure we cannot rollback the row update cleanly, so we surface the
	// error to the caller and let them retry — better than silently storing the
	// row with stale junction state.
	if (tagsUpdate !== undefined && data) {
		try {
			await syncResourceTags(supabase, 'exercise', data.id, tagsUpdate);
		} catch (e) {
			logger.error('Failed to sync tags on update:', e);
			return {
				data: null,
				error: e instanceof Error ? e : new Error('Failed to sync tags for exercise')
			};
		}
	}

	return { data: data ? { ...data, tags: tagsUpdate ?? existing.tags ?? [] } : data, error: null };
}

/** Message d'erreur de `deleteExercise` quand la base n'a supprimé aucune ligne. */
export const EXERCISE_NOT_DELETED = 'Exercise not deleted';

/**
 * Delete an exercise
 * Only the creator can delete their own exercise
 */
export async function deleteExercise(
	supabase: SupabaseClient<Database>,
	id: string,
	userId: string
) {
	// First check if exercise exists and user owns it
	const { data: existing, error: fetchError } = await getExercise(supabase, id);

	if (fetchError || !existing) {
		return { error: new Error('Exercise not found') };
	}

	if (existing.created_by !== userId) {
		return { error: new Error('Unauthorized') };
	}

	// Suppression, avec `.select()` : un refus RLS ne rend pas d'erreur mais
	// zéro ligne (docs/pratiques/rls-echecs-silencieux.md).
	const { data: deleted, error } = await supabase
		.from('exercises')
		.delete()
		.eq('id', id)
		.eq('created_by', userId)
		.select('id');

	if (error) {
		logger.error('Error deleting exercise:', error);
		return { error };
	}

	if (!deleted || deleted.length === 0) {
		logger.error('Exercise not deleted (0 row):', id);
		return { error: new Error(EXERCISE_NOT_DELETED) };
	}

	return { error: null };
}

/**
 * Get exercises created by a specific teacher
 */
export async function getTeacherExercises(
	supabase: SupabaseClient<Database>,
	teacherId: string,
	filters: ExerciseFilters = {},
	pagination: PaginationOptions = {}
) {
	const page = Math.max(1, pagination.page || 1);
	const limit = Math.min(100, Math.max(1, pagination.limit || 50));
	const offset = (page - 1) * limit;
	const sortBy = pagination.sortBy || 'updated_at';
	const sortOrder = pagination.sortOrder || 'desc';

	// Idem : lecture groupée des tags après la requête principale.
	let query = supabase
		.from('exercises')
		.select('*', { count: 'exact' })
		.eq('created_by', teacherId)
		.order(sortBy, { ascending: sortOrder === 'asc' });

	// Apply filters (same as getExercises)
	if (filters.category) {
		query = query.eq('category', filters.category);
	}

	if (filters.tags && filters.tags.length > 0) {
		// Filtrage via `resource_tags` (remplace le .contains sur l'ancienne colonne).
		const ids = await fetchResourceIdsByAnyTag(supabase, 'exercise', filters.tags);
		if (ids.length === 0) {
			return { data: [], error: null, count: 0, page, limit, totalPages: 0 };
		}
		query = query.in('id', ids);
	}

	if (filters.topic) {
		query = query.eq('topic', filters.topic);
	}

	if (filters.grades && filters.grades.length > 0) {
		query = query.overlaps('grades', filters.grades);
	}

	if (filters.search) {
		query = query.textSearch(
			"to_tsvector(coalesce(title, '') || ' ' || coalesce(source, ''))",
			filters.search,
			{
				type: 'websearch',
				config: 'french'
			}
		);
	}

	if (filters.parameterized !== undefined) {
		// Filter for parameterized exercises (have variables)
		if (filters.parameterized) {
			// Has variables (array not empty)
			query = query.not('variables', 'is', null).neq('variables', '[]');
		} else {
			// No variables (null or empty array)
			query = query.or('variables.is.null,variables.eq.[]');
		}
	}

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	const { data, error, count } = await query;

	if (error) {
		logger.error('Error fetching teacher exercises:', error);
		return { data: null, error, count: 0 };
	}

	// Lecture groupée : une requête pour toute la page, pas une par ligne.
	const tagsByExercise = await fetchTagNamesForResources(
		supabase,
		'exercise',
		(data ?? []).map((row) => (row as { id: string }).id)
	);

	// Contenu : la DERNIÈRE version de chaque exercice (hors fiche, ADR 0044).
	const withContent = await withLatestVersions(supabase, data ?? []);
	const enriched = withContent.map((row) => ({
		...row,
		tags: tagsByExercise.get(row.id) ?? []
	}));

	return {
		data: enriched,
		error: null,
		count: count || 0,
		page,
		limit,
		totalPages: count ? Math.ceil(count / limit) : 0,
		sortBy,
		sortOrder
	};
}

// ============================================================================
// INSTANCE GENERATION
// ============================================================================

/**
 * Generate an exercise instance on the server
 *
 * Creates an instance of a parameterized exercise with resolved variables.
 * Handles different distribution modes:
 * - `on_demand`: Random seed (or use provided seed)
 * - `per_student`: Deterministic seed based on student ID
 * - `per_group`: Deterministic seed based on group ID (requires groupId in options)
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise to generate instance for
 * @param userId - User requesting the instance (for per-student seeding)
 * @param options - Generation options
 * @returns Instance generation result
 *
 * @example On-demand mode (random)
 * ```typescript
 * const result = await generateExerciseInstanceServer(
 *   supabase,
 *   'ex-123',
 *   'user-456'
 * );
 * if (result.success) {
 *   console.log(result.instance.statement_md);
 * }
 * ```
 *
 * @example Per-student mode (deterministic)
 * ```typescript
 * const result = await generateExerciseInstanceServer(
 *   supabase,
 *   'ex-123',
 *   'student-456'
 * );
 * // Same student always gets same values
 * ```
 *
 * @example Per-group mode
 * ```typescript
 * const result = await generateExerciseInstanceServer(
 *   supabase,
 *   'ex-123',
 *   'user-456',
 *   { groupId: 'assignment-789' }
 * );
 * // All students in this assignment get same values
 * ```
 *
 * @example With specific variation
 * ```typescript
 * const result = await generateExerciseInstanceServer(
 *   supabase,
 *   'ex-123',
 *   'user-456',
 *   { variationIndex: 1 } // Select variation at index 1
 * );
 * ```
 */
export async function generateExerciseInstanceServer(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	userId: string,
	options?: {
		groupId?: string; // For per-group distribution
		seed?: number; // Override seed
		parseAST?: boolean; // Parse markdown to AST
		variationIndex?: number; // Select specific variation (for exercises with variations)
	}
): Promise<InstanceGenerationResult> {
	// Fetch the exercise
	const { data: exercise, error: fetchError } = await getExercise(supabase, exerciseId);

	if (fetchError || !exercise) {
		return {
			success: false,
			errors: ['Exercise not found']
		};
	}

	// Cast to Exercise type (database row matches Exercise interface)
	const exerciseTemplate = exercise as unknown as Exercise;

	// Determine seed based on distribution mode
	let seed: number;

	if (options?.seed !== undefined) {
		// Use provided seed (override)
		seed = options.seed;
	} else {
		// Generate seed based on distribution mode
		switch (exerciseTemplate.distribution_mode) {
			case 'on_demand':
				// Random seed for each request
				seed = Math.floor(Math.random() * 1000000);
				break;

			case 'per_student':
				// Deterministic seed based on exercise + student
				seed = generateStudentSeed(exerciseId, userId);
				break;

			case 'per_group':
				// Deterministic seed based on exercise + group
				if (!options?.groupId) {
					return {
						success: false,
						errors: [
							'Group ID required for per-group distribution mode. Please provide groupId in options.'
						]
					};
				}
				seed = generateGroupSeed(exerciseId, options.groupId);
				break;

			default:
				// Fallback to random
				seed = Math.floor(Math.random() * 1000000);
		}
	}

	// Generate instance using the generator
	// The variationIndex option is passed to the generator which handles variation selection
	return generateExerciseInstance(exerciseTemplate, {
		seed,
		parseAST: options?.parseAST ?? false,
		variationIndex: options?.variationIndex
	});
}

/**
 * Check if an exercise has variables (is parameterized)
 *
 * Uses the database helper function `is_exercise_parameterized` to check
 * if an exercise has variables defined.
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise to check
 * @returns True if exercise has variables
 *
 * @example
 * ```typescript
 * const hasVariables = await isExerciseParameterized(supabase, 'ex-123');
 * if (hasVariables) {
 *   console.log('Exercise is parameterized');
 * }
 * ```
 */
export async function isExerciseParameterizedServer(
	supabase: SupabaseClient<Database>,
	exerciseId: string
): Promise<boolean> {
	// Use the client-side utility function with fetched exercise
	const { data: exercise, error } = await getExercise(supabase, exerciseId);

	if (error || !exercise) {
		return false;
	}

	// Cast to Exercise type and use utility
	const exerciseTemplate = exercise as unknown as Exercise;
	return isParameterized(exerciseTemplate);
}
