/**
 * Server-side functions for Exercise Bank operations
 *
 * @module server/exercises
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

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
}

/**
 * Pagination options
 */
export interface PaginationOptions {
	page?: number; // Default: 1
	limit?: number; // Default: 50, max: 100
}

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
	const { data, error } = await supabase
		.from('exercises')
		.insert({
			...exercise,
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
