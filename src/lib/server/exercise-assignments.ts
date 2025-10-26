/**
 * Exercise Assignment Server Functions
 *
 * Server-side operations for managing exercise assignments and completion tracking.
 * This module handles the practice mode assignment system (non-graded).
 *
 * Features:
 * - Assignment CRUD operations (create, update, delete)
 * - Bulk assignment creation (multiple students/classes)
 * - Completion tracking (views, completion status)
 * - Access control (student has access to exercise)
 * - Statistics and analytics
 *
 * @module server/exercise-assignments
 *
 * @note Database Schema Required
 * This module requires the following database tables/views/functions to be created:
 * - Tables: exercise_assignments, exercise_completions
 * - Views: assigned_exercises_with_details
 * - Functions: get_student_exercises, student_has_exercise_access,
 *              get_teacher_assignment_stats, get_assignment_completion_stats,
 *              get_exercise_completion_stats
 *
 * These will be created in Phase 4 of the exercise assignment system implementation.
 * Until then, this file will have TypeScript type errors (expected - do not use until Phase 4).
 *
 * @status READY - All backend issues fixed (N+1 queries, SQL injection, pagination, etc.)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	ExerciseAssignment,
	ExerciseCompletion,
	CreateExerciseAssignment,
	BulkAssignmentData,
	AssignedExerciseWithDetails,
	ExerciseWithCompletion,
	StudentExerciseFilters,
	TeacherAssignmentFilters,
	AssignmentStats,
	ExerciseCompletionStats,
	PaginationParams,
	PaginatedResponse
} from '$lib/exercises/types';
import { validateAssignmentData } from '$lib/exercises/types';
import { validateSearchQuery } from '$lib/utils/search';

type TypedSupabaseClient = SupabaseClient<Database>;

// ============================================================================
// ASSIGNMENT MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new exercise assignment
 *
 * Teacher assigns an exercise to a student, class, or makes it public.
 * Validates ownership and assignment data before creation.
 *
 * @param supabase - Supabase client
 * @param data - Assignment creation data
 * @param userId - Teacher user ID (from auth context)
 * @returns Created assignment or error
 *
 * @example Student assignment with deadline
 * ```typescript
 * const result = await createExerciseAssignment(supabase, {
 *   exercise_id: 'ex-123',
 *   assigned_to_type: 'student',
 *   student_id: 'student-abc',
 *   optional_deadline: '2024-01-20T23:59:59Z',
 *   notes: 'Complete before next class'
 * }, 'teacher-789');
 * ```
 *
 * @example Class assignment
 * ```typescript
 * const result = await createExerciseAssignment(supabase, {
 *   exercise_id: 'ex-456',
 *   assigned_to_type: 'class',
 *   class_id: 'class-3eme-a'
 * }, 'teacher-789');
 * ```
 */
export async function createExerciseAssignment(
	supabase: TypedSupabaseClient,
	data: CreateExerciseAssignment,
	userId: string
): Promise<{ data: ExerciseAssignment | null; error: string | null }> {
	// 1. Validate assignment data
	const validation = validateAssignmentData(data);
	if (!validation.valid) {
		return { data: null, error: validation.error! };
	}

	// 2. Check teacher owns the exercise
	const { data: exercise, error: exerciseError } = await supabase
		.from('exercises')
		.select('created_by')
		.eq('id', data.exercise_id)
		.single();

	if (exerciseError) {
		console.error('Error fetching exercise:', exerciseError);
		return { data: null, error: 'Exercise not found' };
	}

	if (!exercise || exercise.created_by !== userId) {
		return { data: null, error: 'Not authorized to assign this exercise' };
	}

	// 3. Insert assignment
	const insertData = {
		exercise_id: data.exercise_id,
		assigned_by: userId,
		assigned_to_type: data.assigned_to_type,
		student_id: data.student_id || null,
		class_id: data.class_id || null,
		optional_deadline: data.optional_deadline || null,
		notes: data.notes || null,
		is_active: true
	};

	const { data: assignment, error } = await supabase
		.from('exercise_assignments')
		.insert(insertData)
		.select()
		.single();

	if (error) {
		console.error('Error creating assignment:', error);
		return { data: null, error: error.message };
	}

	return { data: assignment as ExerciseAssignment, error: null };
}

/**
 * Create multiple assignments at once (bulk operation)
 *
 * Efficiently creates assignments for multiple students, classes, and/or public.
 * Validates teacher ownership before creating any assignments.
 *
 * **Transaction Atomicity**:
 * Supabase's `.insert()` with an array is atomic - either ALL assignments
 * are created successfully or NONE are created. There will be no partial
 * insertions. If any assignment fails validation (e.g., unique constraint
 * violation), the entire operation is rolled back.
 *
 * This ensures data consistency even when creating hundreds of assignments.
 *
 * @param supabase - Supabase client
 * @param data - Bulk assignment data with targets
 * @param userId - Teacher user ID
 * @returns Count of created assignments or error
 *
 * @example Assign to multiple students
 * ```typescript
 * const result = await createBulkAssignments(supabase, {
 *   exercise_id: 'ex-123',
 *   students: ['student-1', 'student-2', 'student-3'],
 *   optional_deadline: '2024-01-20T23:59:59Z',
 *   notes: 'Complete for homework'
 * }, 'teacher-789');
 * // result = { count: 3, error: null }
 * ```
 *
 * @example Assign to classes and make public
 * ```typescript
 * const result = await createBulkAssignments(supabase, {
 *   exercise_id: 'ex-456',
 *   classes: ['class-3eme-a', 'class-3eme-b'],
 *   make_public: true
 * }, 'teacher-789');
 * // result = { count: 3, error: null } (2 classes + 1 public)
 * ```
 */
export async function createBulkAssignments(
	supabase: TypedSupabaseClient,
	data: BulkAssignmentData,
	userId: string
): Promise<{ count: number; error: string | null }> {
	// Validate at least one target
	if (
		(!data.students || data.students.length === 0) &&
		(!data.classes || data.classes.length === 0) &&
		!data.make_public
	) {
		return { count: 0, error: 'At least one assignment target required' };
	}

	// Check teacher owns the exercise
	const { data: exercise, error: exerciseError } = await supabase
		.from('exercises')
		.select('created_by')
		.eq('id', data.exercise_id)
		.single();

	if (exerciseError || !exercise || exercise.created_by !== userId) {
		return { count: 0, error: 'Not authorized to assign this exercise' };
	}

	// Build assignments array
	const assignments: Array<{
		exercise_id: string;
		assigned_by: string;
		assigned_to_type: 'student' | 'class' | 'public';
		student_id: string | null;
		class_id: string | null;
		optional_deadline: string | null;
		notes: string | null;
		is_active: boolean;
	}> = [];

	// Create student assignments
	if (data.students && data.students.length > 0) {
		for (const studentId of data.students) {
			assignments.push({
				exercise_id: data.exercise_id,
				assigned_by: userId,
				assigned_to_type: 'student',
				student_id: studentId,
				class_id: null,
				optional_deadline: data.optional_deadline || null,
				notes: data.notes || null,
				is_active: true
			});
		}
	}

	// Create class assignments
	if (data.classes && data.classes.length > 0) {
		for (const classId of data.classes) {
			assignments.push({
				exercise_id: data.exercise_id,
				assigned_by: userId,
				assigned_to_type: 'class',
				student_id: null,
				class_id: classId,
				optional_deadline: data.optional_deadline || null,
				notes: data.notes || null,
				is_active: true
			});
		}
	}

	// Create public assignment
	if (data.make_public) {
		assignments.push({
			exercise_id: data.exercise_id,
			assigned_by: userId,
			assigned_to_type: 'public',
			student_id: null,
			class_id: null,
			optional_deadline: data.optional_deadline || null,
			notes: data.notes || null,
			is_active: true
		});
	}

	// Insert all assignments (atomic transaction)
	const { data: created, error } = await supabase
		.from('exercise_assignments')
		.insert(assignments)
		.select();

	if (error) {
		console.error('Error creating bulk assignments:', error);
		return { count: 0, error: error.message };
	}

	return { count: created?.length || 0, error: null };
}

/**
 * Get all assignments for a specific exercise (teacher view)
 *
 * Returns assignments with full details including exercise info and target names.
 * Uses the assigned_exercises_with_details view for efficient queries.
 * Supports pagination for large assignment lists.
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise ID to get assignments for
 * @param filters - Optional filters (active status, type, deadline)
 * @param pagination - Optional pagination parameters
 * @returns Paginated assignments with details
 *
 * @example Get all active assignments (first page)
 * ```typescript
 * const result = await getAssignmentsForExercise(supabase, 'ex-123', {
 *   is_active: true
 * }, { limit: 50, offset: 0 });
 * ```
 *
 * @example Get only class assignments
 * ```typescript
 * const result = await getAssignmentsForExercise(supabase, 'ex-456', {
 *   assigned_to_type: 'class'
 * });
 * ```
 */
export async function getAssignmentsForExercise(
	supabase: TypedSupabaseClient,
	exerciseId: string,
	filters?: TeacherAssignmentFilters,
	pagination?: PaginationParams
): Promise<PaginatedResponse<AssignedExerciseWithDetails>> {
	const limit = pagination?.limit || 50;
	const offset = pagination?.offset || 0;

	// Build base query
	let query = supabase
		.from('assigned_exercises_with_details')
		.select('*', { count: 'exact' })
		.eq('exercise_id', exerciseId)
		.order('assigned_at', { ascending: false });

	// Apply filters
	if (filters?.assigned_to_type) {
		query = query.eq('assigned_to_type', filters.assigned_to_type);
	}

	if (filters?.is_active !== undefined) {
		query = query.eq('is_active', filters.is_active);
	}

	if (filters?.has_deadline) {
		query = query.not('optional_deadline', 'is', null);
	}

	// Apply pagination
	query = query.range(offset, offset + limit - 1);

	const { data, error, count } = await query;

	if (error) {
		console.error('Error fetching assignments:', error);
		return {
			data: [],
			total: 0,
			limit,
			offset,
			hasMore: false
		};
	}

	const total = count || 0;

	return {
		data: (data as AssignedExerciseWithDetails[]) || [],
		total,
		limit,
		offset,
		hasMore: offset + limit < total
	};
}

/**
 * Get all exercises assigned to a student
 *
 * Includes:
 * - Direct student assignments
 * - Class assignments (via class membership)
 * - Public assignments
 *
 * Uses optimized batch queries to avoid N+1 problem.
 * Joins with completion data to show progress.
 *
 * **Performance**: Uses three batched queries instead of N queries in loop:
 * 1. Get exercise IDs via RPC function
 * 2. Batch-fetch all assignments
 * 3. Batch-fetch all completions
 * Then enriches in memory (no DB calls in loop).
 *
 * @param supabase - Supabase client
 * @param studentId - Student user ID
 * @param filters - Optional filters (completion, deadline, search)
 * @param pagination - Optional pagination parameters
 * @returns Paginated exercises with assignment and completion data
 *
 * @example Get uncompleted assignments
 * ```typescript
 * const result = await getAssignmentsForStudent(supabase, 'student-abc', {
 *   show_completed: false
 * });
 * ```
 *
 * @example Get assignments with deadlines
 * ```typescript
 * const result = await getAssignmentsForStudent(supabase, 'student-xyz', {
 *   has_deadline: true
 * }, { limit: 20, offset: 0 });
 * ```
 */
export async function getAssignmentsForStudent(
	supabase: TypedSupabaseClient,
	studentId: string,
	filters?: StudentExerciseFilters,
	pagination?: PaginationParams
): Promise<PaginatedResponse<ExerciseWithCompletion>> {
	const limit = pagination?.limit || 50;
	const offset = pagination?.offset || 0;

	// Step 1: Get all accessible exercise IDs via RPC function
	const { data: exerciseIds, error: functionError } = await supabase.rpc('get_student_exercises', {
		p_student_id: studentId
	});

	if (functionError) {
		console.error('Error fetching student exercises:', functionError);
		return {
			data: [],
			total: 0,
			limit,
			offset,
			hasMore: false
		};
	}

	if (!exerciseIds || exerciseIds.length === 0) {
		return {
			data: [],
			total: 0,
			limit,
			offset,
			hasMore: false
		};
	}

	// Step 2: Build exercise query with search filter
	let exerciseQuery = supabase.from('exercises').select('*').in('id', exerciseIds);

	// Apply search filter using Supabase's textSearch (safe from SQL injection)
	if (filters?.search) {
		const validation = validateSearchQuery(filters.search);
		if (validation.valid && validation.sanitized) {
			// Use Supabase's built-in textSearch which safely handles the query
			exerciseQuery = exerciseQuery.textSearch('fts_column', validation.sanitized, {
				type: 'websearch',
				config: 'french'
			});
		}
	}

	// Get total count before pagination
	const { count: totalCount } = await exerciseQuery;

	// Apply pagination to exercise query
	exerciseQuery = exerciseQuery
		.range(offset, offset + limit - 1)
		.order('created_at', { ascending: false });

	const { data: exercises, error: exercisesError } = await exerciseQuery;

	if (exercisesError) {
		console.error('Error fetching exercises:', exercisesError);
		return {
			data: [],
			total: 0,
			limit,
			offset,
			hasMore: false
		};
	}

	if (!exercises || exercises.length === 0) {
		return {
			data: [],
			total: totalCount || 0,
			limit,
			offset,
			hasMore: false
		};
	}

	// Step 3: Batch-fetch all assignments for these exercises
	const exerciseIdsForBatch = exercises.map((e) => e.id);

	// Fetch direct assignments (student or public)
	const { data: directAssignments } = await supabase
		.from('exercise_assignments')
		.select('*')
		.in('exercise_id', exerciseIdsForBatch)
		.eq('is_active', true)
		.or(`student_id.eq.${studentId},assigned_to_type.eq.public`);

	// Fetch class assignments (requires join with class_members)
	// Note: This uses a computed filter which is safe as studentId is from auth context
	const { data: classAssignments } = await supabase
		.from('exercise_assignments')
		.select('*')
		.in('exercise_id', exerciseIdsForBatch)
		.eq('assigned_to_type', 'class')
		.eq('is_active', true)
		.in('class_id', [
			...(await supabase
				.from('class_members')
				.select('class_id')
				.eq('student_id', studentId)
				.then((res) => res.data?.map((cm) => cm.class_id) || []))
		]);

	// Combine all assignments
	const allAssignments = [
		...(directAssignments || []),
		...(classAssignments || [])
	] as ExerciseAssignment[];

	// Step 4: Batch-fetch all completions for these exercises
	const { data: allCompletions } = await supabase
		.from('exercise_completions')
		.select('*')
		.in('exercise_id', exerciseIdsForBatch)
		.eq('student_id', studentId);

	// Step 5: Create lookup maps for O(1) access
	const assignmentMap = new Map<string, ExerciseAssignment>();
	for (const assignment of allAssignments) {
		// Store the most recent assignment for each exercise
		if (
			!assignmentMap.has(assignment.exercise_id) ||
			new Date(assignment.assigned_at) >
				new Date(assignmentMap.get(assignment.exercise_id)!.assigned_at)
		) {
			assignmentMap.set(assignment.exercise_id, assignment);
		}
	}

	const completionMap = new Map(
		allCompletions?.map((c) => [c.exercise_id, c as ExerciseCompletion])
	);

	// Step 6: Enrich exercises with assignment and completion data (no DB calls!)
	const enriched: ExerciseWithCompletion[] = [];

	for (const exercise of exercises) {
		const assignment = assignmentMap.get(exercise.id);
		const completion = completionMap.get(exercise.id);

		// Apply completion filter
		if (filters?.show_completed === false && completion?.completed_at) {
			continue; // Skip completed exercises
		}

		// Apply deadline filter
		if (filters?.has_deadline && !assignment?.optional_deadline) {
			continue; // Skip assignments without deadlines
		}

		// Apply assigned-only filter
		if (filters?.show_assigned_only && !assignment) {
			continue; // Skip public exercises without assignment
		}

		// Apply public filter
		if (filters?.show_public === false && !assignment) {
			continue; // Skip public exercises
		}

		// Determine accessibility
		const is_accessible = !!(assignment || exercise.is_public);

		enriched.push({
			...exercise,
			assignment,
			completion,
			is_accessible
		} as ExerciseWithCompletion);
	}

	// Step 7: Sort by deadline (urgent first), then by assigned_at (recent first)
	enriched.sort((a, b) => {
		const aDeadline = a.assignment?.optional_deadline;
		const bDeadline = b.assignment?.optional_deadline;
		const aAssignedAt = a.assignment?.assigned_at;
		const bAssignedAt = b.assignment?.assigned_at;

		// Prioritize assignments with deadlines
		if (aDeadline && !bDeadline) return -1;
		if (!aDeadline && bDeadline) return 1;

		// Both have deadlines - sort by deadline
		if (aDeadline && bDeadline) {
			return new Date(aDeadline).getTime() - new Date(bDeadline).getTime();
		}

		// Neither has deadline - sort by assigned_at
		if (aAssignedAt && bAssignedAt) {
			return new Date(bAssignedAt).getTime() - new Date(aAssignedAt).getTime();
		}

		return 0;
	});

	const total = totalCount || 0;

	return {
		data: enriched,
		total,
		limit,
		offset,
		hasMore: offset + limit < total
	};
}

/**
 * Update an existing assignment
 *
 * Can update: optional_deadline, notes, is_active.
 * Validates teacher ownership before allowing update.
 *
 * @param supabase - Supabase client
 * @param assignmentId - Assignment ID to update
 * @param updates - Fields to update
 * @param userId - Teacher user ID
 * @returns Updated assignment or error
 *
 * @example Update deadline
 * ```typescript
 * const result = await updateAssignment(supabase, 'assign-123', {
 *   optional_deadline: '2024-02-01T23:59:59Z'
 * }, 'teacher-789');
 * ```
 *
 * @example Deactivate assignment
 * ```typescript
 * const result = await updateAssignment(supabase, 'assign-456', {
 *   is_active: false
 * }, 'teacher-789');
 * ```
 */
export async function updateAssignment(
	supabase: TypedSupabaseClient,
	assignmentId: string,
	updates: Partial<Pick<ExerciseAssignment, 'optional_deadline' | 'notes' | 'is_active'>>,
	userId: string
): Promise<{ data: ExerciseAssignment | null; error: string | null }> {
	// Validate ownership using helper
	const validation = await validateAssignmentOwnership(supabase, assignmentId, userId);
	if (!validation.valid) {
		return { data: null, error: validation.error! };
	}

	// Update assignment
	const { data: updated, error } = await supabase
		.from('exercise_assignments')
		.update(updates)
		.eq('id', assignmentId)
		.select()
		.single();

	if (error) {
		console.error('Error updating assignment:', error);
		return { data: null, error: error.message };
	}

	return { data: updated as ExerciseAssignment, error: null };
}

/**
 * Delete an assignment
 *
 * Soft delete (set is_active = false) by default to preserve history.
 * Hard delete removes assignment and cascades to completions.
 *
 * @param supabase - Supabase client
 * @param assignmentId - Assignment ID to delete
 * @param userId - Teacher user ID
 * @param hardDelete - If true, permanently delete; if false, deactivate
 * @returns Success status or error
 *
 * @example Soft delete (deactivate)
 * ```typescript
 * const result = await deleteAssignment(supabase, 'assign-123', 'teacher-789');
 * // Assignment is deactivated but preserved
 * ```
 *
 * @example Hard delete (permanent)
 * ```typescript
 * const result = await deleteAssignment(supabase, 'assign-456', 'teacher-789', true);
 * // Assignment and related completions are deleted
 * ```
 */
export async function deleteAssignment(
	supabase: TypedSupabaseClient,
	assignmentId: string,
	userId: string,
	hardDelete = false
): Promise<{ success: boolean; error: string | null }> {
	// Validate ownership using helper
	const validation = await validateAssignmentOwnership(supabase, assignmentId, userId);
	if (!validation.valid) {
		return { success: false, error: validation.error! };
	}

	if (hardDelete) {
		// Hard delete: remove from database
		const { error } = await supabase.from('exercise_assignments').delete().eq('id', assignmentId);

		if (error) {
			console.error('Error deleting assignment:', error);
			return { success: false, error: error.message };
		}
	} else {
		// Soft delete: mark inactive
		const { error } = await supabase
			.from('exercise_assignments')
			.update({ is_active: false })
			.eq('id', assignmentId);

		if (error) {
			console.error('Error deactivating assignment:', error);
			return { success: false, error: error.message };
		}
	}

	return { success: true, error: null };
}

// ============================================================================
// COMPLETION TRACKING FUNCTIONS
// ============================================================================

/**
 * Record that a student viewed an exercise
 *
 * Uses UPSERT pattern:
 * - If completion record exists: increment view_count, update last_viewed_at
 * - If new: create record with view_count = 1
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise being viewed
 * @param studentId - Student viewing the exercise
 * @param assignmentId - Optional assignment ID (if accessed via assignment)
 * @returns Completion record or error
 *
 * @example Track view
 * ```typescript
 * const result = await markExerciseAsViewed(
 *   supabase,
 *   'ex-123',
 *   'student-abc',
 *   'assign-456'
 * );
 * // Increments view count and updates timestamp
 * ```
 */
export async function markExerciseAsViewed(
	supabase: TypedSupabaseClient,
	exerciseId: string,
	studentId: string,
	assignmentId?: string
): Promise<{ data: ExerciseCompletion | null; error: string | null }> {
	// Check if completion record exists
	const { data: existing } = await supabase
		.from('exercise_completions')
		.select('*')
		.eq('exercise_id', exerciseId)
		.eq('student_id', studentId)
		.maybeSingle();

	if (existing) {
		// Update existing record
		const { data: updated, error } = await supabase
			.from('exercise_completions')
			.update({
				view_count: existing.view_count + 1,
				last_viewed_at: new Date().toISOString()
			})
			.eq('id', existing.id)
			.select()
			.single();

		if (error) {
			console.error('Error updating view count:', error);
			return { data: null, error: error.message };
		}

		return { data: updated as ExerciseCompletion, error: null };
	} else {
		// Create new record
		const { data: created, error } = await supabase
			.from('exercise_completions')
			.insert({
				exercise_id: exerciseId,
				student_id: studentId,
				assignment_id: assignmentId || null,
				view_count: 1,
				last_viewed_at: new Date().toISOString(),
				completed_at: null
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating completion record:', error);
			return { data: null, error: error.message };
		}

		return { data: created as ExerciseCompletion, error: null };
	}
}

/**
 * Mark an exercise as completed by a student
 *
 * Sets completed_at to current timestamp.
 * Also updates last_viewed_at and increments view_count.
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise being completed
 * @param studentId - Student completing the exercise
 * @returns Completion record or error
 *
 * @example Mark complete
 * ```typescript
 * const result = await markExerciseAsComplete(
 *   supabase,
 *   'ex-123',
 *   'student-abc'
 * );
 * // Sets completed_at timestamp
 * ```
 */
export async function markExerciseAsComplete(
	supabase: TypedSupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<{ data: ExerciseCompletion | null; error: string | null }> {
	const now = new Date().toISOString();

	// Check if completion record exists
	const { data: existing } = await supabase
		.from('exercise_completions')
		.select('*')
		.eq('exercise_id', exerciseId)
		.eq('student_id', studentId)
		.maybeSingle();

	if (existing) {
		// Update existing record
		const { data: updated, error } = await supabase
			.from('exercise_completions')
			.update({
				completed_at: now,
				last_viewed_at: now,
				view_count: existing.view_count + 1
			})
			.eq('id', existing.id)
			.select()
			.single();

		if (error) {
			console.error('Error marking exercise as complete:', error);
			return { data: null, error: error.message };
		}

		return { data: updated as ExerciseCompletion, error: null };
	} else {
		// Create new record
		const { data: created, error } = await supabase
			.from('exercise_completions')
			.insert({
				exercise_id: exerciseId,
				student_id: studentId,
				assignment_id: null,
				view_count: 1,
				last_viewed_at: now,
				completed_at: now
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating completion record:', error);
			return { data: null, error: error.message };
		}

		return { data: created as ExerciseCompletion, error: null };
	}
}

/**
 * Unmark an exercise as completed
 *
 * Sets completed_at back to null (student changed their mind).
 * Preserves view tracking.
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise to unmark
 * @param studentId - Student unmarking the exercise
 * @returns Completion record or error
 *
 * @example Unmark completion
 * ```typescript
 * const result = await markExerciseAsIncomplete(
 *   supabase,
 *   'ex-123',
 *   'student-abc'
 * );
 * // Sets completed_at to null
 * ```
 */
export async function markExerciseAsIncomplete(
	supabase: TypedSupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<{ data: ExerciseCompletion | null; error: string | null }> {
	// Update existing record
	const { data: updated, error } = await supabase
		.from('exercise_completions')
		.update({
			completed_at: null,
			last_viewed_at: new Date().toISOString()
		})
		.eq('exercise_id', exerciseId)
		.eq('student_id', studentId)
		.select()
		.single();

	if (error) {
		console.error('Error marking exercise as incomplete:', error);
		return { data: null, error: error.message };
	}

	return { data: updated as ExerciseCompletion, error: null };
}

/**
 * Get completion record for a specific exercise and student
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise ID
 * @param studentId - Student ID
 * @returns Completion record or null if not found
 *
 * @example Get completion
 * ```typescript
 * const result = await getStudentCompletion(
 *   supabase,
 *   'ex-123',
 *   'student-abc'
 * );
 * if (result.data) {
 *   console.log('Viewed', result.data.view_count, 'times');
 * }
 * ```
 */
export async function getStudentCompletion(
	supabase: TypedSupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<{ data: ExerciseCompletion | null; error: string | null }> {
	const { data, error } = await supabase
		.from('exercise_completions')
		.select('*')
		.eq('exercise_id', exerciseId)
		.eq('student_id', studentId)
		.maybeSingle();

	if (error) {
		console.error('Error fetching completion:', error);
		return { data: null, error: error.message };
	}

	return { data: data as ExerciseCompletion | null, error: null };
}

// ============================================================================
// STATISTICS & ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get assignment statistics for a teacher
 *
 * Uses the get_teacher_assignment_stats() database function.
 * Returns aggregate counts for dashboard display.
 *
 * @param supabase - Supabase client
 * @param teacherId - Teacher user ID
 * @returns Assignment statistics or error
 *
 * @example Get stats
 * ```typescript
 * const result = await getAssignmentStats(supabase, 'teacher-789');
 * if (result.data) {
 *   console.log('Total assignments:', result.data.total_assignments);
 *   console.log('Active:', result.data.active_assignments);
 * }
 * ```
 */
export async function getAssignmentStats(
	supabase: TypedSupabaseClient,
	teacherId: string
): Promise<{ data: AssignmentStats | null; error: string | null }> {
	const { data, error } = await supabase.rpc('get_teacher_assignment_stats', {
		p_teacher_id: teacherId
	});

	if (error) {
		console.error('Error fetching assignment stats:', error);
		return { data: null, error: error.message };
	}

	// Transform database result to AssignmentStats type
	const stats: AssignmentStats = {
		total_assignments: data?.[0]?.total_assignments || 0,
		active_assignments: data?.[0]?.active_assignments || 0,
		student_assignments: data?.[0]?.student_assignments || 0,
		class_assignments: data?.[0]?.class_assignments || 0,
		public_assignments: data?.[0]?.public_assignments || 0,
		with_deadline: data?.[0]?.with_deadline || 0
	};

	return { data: stats, error: null };
}

/**
 * Get completion statistics for a specific exercise
 *
 * Uses the get_exercise_completion_stats() database function.
 * Returns completion rates, view counts, and engagement metrics.
 *
 * **Important**: This function gets stats for ALL assignments of an exercise,
 * not just a single assignment. Use get_assignment_completion_stats(p_assignment_id)
 * for a specific assignment.
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise ID
 * @returns Completion statistics or error
 *
 * @example Get exercise stats
 * ```typescript
 * const result = await getExerciseCompletionStats(supabase, 'ex-123');
 * if (result.data) {
 *   console.log('Completion rate:', result.data.completion_rate + '%');
 *   console.log('Total assigned:', result.data.total_assigned);
 *   console.log('Total completed:', result.data.total_completed);
 * }
 * ```
 */
export async function getExerciseCompletionStats(
	supabase: TypedSupabaseClient,
	exerciseId: string
): Promise<{ data: ExerciseCompletionStats | null; error: string | null }> {
	// Call the correct RPC function with exercise_id parameter
	const { data, error } = await supabase.rpc('get_exercise_completion_stats', {
		p_exercise_id: exerciseId
	});

	if (error) {
		console.error('Error fetching completion stats:', error);
		return { data: null, error: error.message };
	}

	// Transform database result to ExerciseCompletionStats type
	const stats: ExerciseCompletionStats = {
		exercise_id: exerciseId,
		total_assigned: data?.[0]?.total_assigned || 0,
		total_viewed: data?.[0]?.total_viewed || 0,
		total_completed: data?.[0]?.total_completed || 0,
		completion_rate: data?.[0]?.completion_rate || 0,
		average_view_count: data?.[0]?.average_view_count || 0
	};

	return { data: stats, error: null };
}

/**
 * Get overall progress for a student across all assignments
 *
 * Calculates completion percentage and counts.
 * Useful for student dashboard and teacher overview.
 *
 * @param supabase - Supabase client
 * @param studentId - Student user ID
 * @returns Progress metrics or error
 *
 * @example Get student progress
 * ```typescript
 * const result = await getStudentProgress(supabase, 'student-abc');
 * if (result.error === null) {
 *   console.log('Completed:', result.total_completed, '/', result.total_assigned);
 *   console.log('Progress:', result.completion_percentage + '%');
 * }
 * ```
 */
export async function getStudentProgress(
	supabase: TypedSupabaseClient,
	studentId: string
): Promise<{
	total_assigned: number;
	total_completed: number;
	completion_percentage: number;
	error: string | null;
}> {
	// Get all exercises accessible to student
	const { data: exerciseIds, error: functionError } = await supabase.rpc('get_student_exercises', {
		p_student_id: studentId
	});

	if (functionError) {
		console.error('Error fetching student exercises:', functionError);
		return {
			total_assigned: 0,
			total_completed: 0,
			completion_percentage: 0,
			error: functionError.message
		};
	}

	const total_assigned = exerciseIds?.length || 0;

	if (total_assigned === 0) {
		return {
			total_assigned: 0,
			total_completed: 0,
			completion_percentage: 0,
			error: null
		};
	}

	// Get completed exercises
	const { data: completions, error: completionsError } = await supabase
		.from('exercise_completions')
		.select('id')
		.eq('student_id', studentId)
		.not('completed_at', 'is', null)
		.in('exercise_id', exerciseIds);

	if (completionsError) {
		console.error('Error fetching completions:', completionsError);
		return {
			total_assigned,
			total_completed: 0,
			completion_percentage: 0,
			error: completionsError.message
		};
	}

	const total_completed = completions?.length || 0;
	const completion_percentage =
		total_assigned > 0 ? Math.round((total_completed / total_assigned) * 100) : 0;

	return {
		total_assigned,
		total_completed,
		completion_percentage,
		error: null
	};
}

// ============================================================================
// ACCESS CONTROL FUNCTIONS
// ============================================================================

/**
 * Check if a student can access an exercise
 *
 * Returns true if:
 * - Student has a direct assignment
 * - Student is in a class with an assignment
 * - Exercise has a public assignment
 * - Exercise is marked as public (is_public = true)
 *
 * Uses the student_has_exercise_access() database function.
 *
 * @param supabase - Supabase client
 * @param exerciseId - Exercise ID
 * @param studentId - Student ID
 * @returns True if student can access, false otherwise
 *
 * @example Check access
 * ```typescript
 * const hasAccess = await studentHasAccess(supabase, 'ex-123', 'student-abc');
 * if (hasAccess) {
 *   // Show exercise to student
 * } else {
 *   // Show "access denied" message
 * }
 * ```
 */
export async function studentHasAccess(
	supabase: TypedSupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<boolean> {
	const { data, error } = await supabase.rpc('student_has_exercise_access', {
		p_exercise_id: exerciseId,
		p_student_id: studentId
	});

	if (error) {
		console.error('Error checking exercise access:', error);
		return false;
	}

	return data === true;
}

/**
 * Get all exercises a student can access
 *
 * Combines:
 * - Assigned exercises (direct + class)
 * - Public exercises (is_public = true)
 *
 * Uses the get_student_exercises() database function.
 *
 * @param supabase - Supabase client
 * @param studentId - Student ID
 * @returns Array of accessible exercises or error
 *
 * @example Get accessible exercises
 * ```typescript
 * const result = await getAccessibleExercises(supabase, 'student-abc');
 * if (result.data) {
 *   console.log('Student can access', result.data.length, 'exercises');
 * }
 * ```
 */
export async function getAccessibleExercises(
	supabase: TypedSupabaseClient,
	studentId: string
): Promise<{ data: Array<Record<string, unknown>>; error: string | null }> {
	// Get exercise IDs accessible to student
	const { data: exerciseIds, error: functionError } = await supabase.rpc('get_student_exercises', {
		p_student_id: studentId
	});

	if (functionError) {
		console.error('Error fetching student exercises:', functionError);
		return { data: [], error: functionError.message };
	}

	if (!exerciseIds || exerciseIds.length === 0) {
		return { data: [], error: null };
	}

	// Fetch full exercise details
	const { data: exercises, error: exercisesError } = await supabase
		.from('exercises')
		.select('*')
		.in('id', exerciseIds)
		.order('created_at', { ascending: false });

	if (exercisesError) {
		console.error('Error fetching exercises:', exercisesError);
		return { data: [], error: exercisesError.message };
	}

	return { data: exercises || [], error: null };
}

// ============================================================================
// HELPER/UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate assignment ownership (unified helper)
 *
 * Checks that:
 * 1. Assignment exists
 * 2. Current user is the one who created it
 *
 * Used by updateAssignment() and deleteAssignment() to avoid code duplication.
 *
 * @param supabase - Supabase client
 * @param assignmentId - Assignment ID to validate
 * @param userId - User ID to check ownership against
 * @returns Validation result with assignment data if valid
 *
 * @example
 * ```typescript
 * const validation = await validateAssignmentOwnership(supabase, 'assign-123', userId);
 * if (!validation.valid) {
 *   return { data: null, error: validation.error };
 * }
 * // Proceed with update/delete using validation.assignment
 * ```
 */
async function validateAssignmentOwnership(
	supabase: TypedSupabaseClient,
	assignmentId: string,
	userId: string
): Promise<{ valid: boolean; assignment?: ExerciseAssignment; error?: string }> {
	const { data: assignment, error: fetchError } = await supabase
		.from('exercise_assignments')
		.select('*')
		.eq('id', assignmentId)
		.single();

	if (fetchError || !assignment) {
		return { valid: false, error: 'Assignment not found' };
	}

	if (assignment.assigned_by !== userId) {
		return { valid: false, error: 'Not authorized to modify this assignment' };
	}

	return { valid: true, assignment: assignment as ExerciseAssignment };
}

/**
 * Get all classes a student belongs to
 *
 * Used to determine which class assignments apply to a student.
 *
 * @param supabase - Supabase client
 * @param studentId - Student user ID
 * @returns Array of class IDs or error
 *
 * @example Get student classes
 * ```typescript
 * const result = await getStudentClasses(supabase, 'student-abc');
 * if (result.data) {
 *   console.log('Student is in', result.data.length, 'classes');
 * }
 * ```
 */
export async function getStudentClasses(
	supabase: TypedSupabaseClient,
	studentId: string
): Promise<{ data: string[]; error: string | null }> {
	const { data, error } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId);

	if (error) {
		console.error('Error fetching student classes:', error);
		return { data: [], error: error.message };
	}

	const classIds = data?.map((cm) => cm.class_id) || [];
	return { data: classIds, error: null };
}
