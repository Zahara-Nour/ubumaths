/**
 * Server-side functions for Exercise Bank operations
 *
 * @module server/exercises
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Exercise, DistributionMode, InstanceGenerationResult } from '$lib/exercises/types';
import type { Variable } from '$lib/shared/parameterization';
import {
	generateExerciseInstance,
	generateStudentSeed,
	generateGroupSeed,
	isParameterized
} from '$lib/exercises/generator/instance-generator';

type _Exercise = Database['public']['Tables']['exercises']['Row'];
type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];
type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];

/**
 * Filters for listing exercises
 */
export interface ExerciseFilters {
	difficulty?: 1 | 2 | 3;
	tags?: string[];
	topic?: string;
	grade_levels?: string[];
	search?: string; // Full-text search on title and source
	parameterized?: boolean; // Filter for exercises with/without variables
}

/**
 * Pagination options
 */
export interface PaginationOptions {
	page?: number; // Default: 1
	limit?: number; // Default: 50, max: 100
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
 * Teachers can see all exercises
 */
export async function getExercises(
	supabase: SupabaseClient<Database>,
	filters: ExerciseFilters = {},
	pagination: PaginationOptions = {}
) {
	const page = Math.max(1, pagination.page || 1);
	const limit = Math.min(100, Math.max(1, pagination.limit || 50));
	const offset = (page - 1) * limit;

	let query = supabase
		.from('exercises')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false });

	// Apply filters
	if (filters.difficulty) {
		query = query.eq('difficulty', filters.difficulty);
	}

	if (filters.tags && filters.tags.length > 0) {
		query = query.contains('tags', filters.tags);
	}

	if (filters.topic) {
		query = query.eq('topic', filters.topic);
	}

	if (filters.grade_levels && filters.grade_levels.length > 0) {
		query = query.overlaps('grade_levels', filters.grade_levels);
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
		console.error('Error fetching exercises:', error);
		return { data: null, error, count: 0 };
	}

	return {
		data,
		error: null,
		count: count || 0,
		page,
		limit,
		totalPages: count ? Math.ceil(count / limit) : 0
	};
}

/**
 * Get a single exercise by ID
 */
export async function getExercise(supabase: SupabaseClient<Database>, id: string) {
	const { data, error } = await supabase.from('exercises').select('*').eq('id', id).single();

	if (error) {
		console.error('Error fetching exercise:', error);
		return { data: null, error };
	}

	return { data, error: null };
}

/**
 * Create a new exercise
 * Only teachers can create exercises
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

	// Validate and serialize variables
	const variablesValidation = validateVariables(exercise.variables);
	if (!variablesValidation.valid) {
		return {
			data: null,
			error: new Error(`Invalid variables: ${variablesValidation.error}`)
		};
	}

	const { data, error } = await supabase
		.from('exercises')
		.insert({
			...exercise,
			variables:
				variablesValidation.variables.length > 0 ? variablesValidation.variables : undefined,
			distribution_mode: distributionMode,
			created_by: userId
		})
		.select()
		.single();

	if (error) {
		console.error('Error creating exercise:', error);
		return { data: null, error };
	}

	return { data, error: null };
}

/**
 * Update an existing exercise
 * Only the creator can update their own exercise
 */
export async function updateExercise(
	supabase: SupabaseClient<Database>,
	id: string,
	updates: Omit<ExerciseUpdate, 'id' | 'created_by' | 'created_at'>,
	userId: string
) {
	// First check if exercise exists and user owns it
	const { data: existing, error: fetchError } = await getExercise(supabase, id);

	if (fetchError || !existing) {
		return { data: null, error: new Error('Exercise not found') };
	}

	if (existing.created_by !== userId) {
		return { data: null, error: new Error('Unauthorized') };
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

	// Validate variables if provided
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
				variablesValidation.variables.length > 0 ? variablesValidation.variables : undefined
		};
	}

	// Update the exercise
	const { data, error } = await supabase
		.from('exercises')
		.update(updates)
		.eq('id', id)
		.eq('created_by', userId) // Double-check ownership via RLS
		.select()
		.single();

	if (error) {
		console.error('Error updating exercise:', error);
		return { data: null, error };
	}

	return { data, error: null };
}

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

	// Delete the exercise
	const { error } = await supabase.from('exercises').delete().eq('id', id).eq('created_by', userId); // Double-check ownership via RLS

	if (error) {
		console.error('Error deleting exercise:', error);
		return { error };
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

	let query = supabase
		.from('exercises')
		.select('*', { count: 'exact' })
		.eq('created_by', teacherId)
		.order('created_at', { ascending: false });

	// Apply filters (same as getExercises)
	if (filters.difficulty) {
		query = query.eq('difficulty', filters.difficulty);
	}

	if (filters.tags && filters.tags.length > 0) {
		query = query.contains('tags', filters.tags);
	}

	if (filters.topic) {
		query = query.eq('topic', filters.topic);
	}

	if (filters.grade_levels && filters.grade_levels.length > 0) {
		query = query.overlaps('grade_levels', filters.grade_levels);
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
		console.error('Error fetching teacher exercises:', error);
		return { data: null, error, count: 0 };
	}

	return {
		data,
		error: null,
		count: count || 0,
		page,
		limit,
		totalPages: count ? Math.ceil(count / limit) : 0
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
 */
export async function generateExerciseInstanceServer(
	supabase: SupabaseClient<Database>,
	exerciseId: string,
	userId: string,
	options?: {
		groupId?: string; // For per-group distribution
		seed?: number; // Override seed
		parseAST?: boolean; // Parse markdown to AST
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
	return generateExerciseInstance(exerciseTemplate, {
		seed,
		parseAST: options?.parseAST ?? false
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
