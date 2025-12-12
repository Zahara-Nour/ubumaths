/**
 * Correction Visibility Logic
 * ============================
 *
 * Determines whether corrections should be shown to students for worksheet exercises.
 * Implements a hierarchical override system:
 *
 * 1. Assignment-level global toggle (show_corrections)
 * 2. Per-exercise override at assignment level (worksheet_assignment_exercise_settings)
 * 3. Default visibility from worksheet template (worksheet_exercises.correction_visible)
 * 4. Correction release mode timing checks (via correction-release.ts)
 *
 * SECURITY NOTE:
 * These utility functions do NOT verify user authorization directly.
 * Authorization MUST be verified by the caller before invoking these functions.
 * The API endpoints calling these functions use:
 * - `can_access_assignment()` RPC to verify access
 * - RLS policies as defense-in-depth
 *
 * @module server/worksheets/correction-visibility
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorksheetAssignmentRow } from '$lib/types/worksheets';
import { canAccessCorrections } from './correction-release';

// ============================================================================
// TYPES
// ============================================================================

export interface CorrectionVisibilityContext {
	assignmentId: string;
	showCorrections: boolean;
	releaseAllowed: boolean;
}

// ============================================================================
// SINGLE EXERCISE VISIBILITY
// ============================================================================

/**
 * Determines if a correction should be shown for a specific exercise.
 *
 * Logic (in order):
 * 1. If show_corrections is false on assignment -> no correction
 * 2. Check correction_release_mode timing (immediate, scheduled, after_due, manual)
 * 3. Check exercise-level override in worksheet_assignment_exercise_settings
 * 4. If no override, use worksheet_exercises.correction_visible default
 *
 * @param supabase - Supabase client
 * @param assignmentId - The assignment ID
 * @param worksheetExerciseId - The worksheet_exercise ID
 * @returns Whether the correction should be visible
 */
export async function isCorrectionVisible(
	supabase: SupabaseClient,
	assignmentId: string,
	worksheetExerciseId: string
): Promise<boolean> {
	// Fetch assignment settings
	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select('*')
		.eq('id', assignmentId)
		.single();

	if (assignmentError || !assignment) {
		// Cannot determine visibility, default to hidden
		return false;
	}

	// Step 1: Check global toggle
	if (!assignment.show_corrections) {
		return false;
	}

	// Step 2: Check correction release timing
	const releaseAccess = canAccessCorrections(
		assignment as WorksheetAssignmentRow,
		'visibility-check'
	);
	if (!releaseAccess.canAccess) {
		return false;
	}

	// Step 3: Check exercise-level override
	const { data: exerciseSetting } = await supabase
		.from('worksheet_assignment_exercise_settings')
		.select('show_correction')
		.eq('assignment_id', assignmentId)
		.eq('worksheet_exercise_id', worksheetExerciseId)
		.maybeSingle();

	if (exerciseSetting !== null) {
		// Override exists - use it
		return exerciseSetting.show_correction;
	}

	// Step 4: Use worksheet exercise default
	const { data: worksheetExercise } = await supabase
		.from('worksheet_exercises')
		.select('correction_visible')
		.eq('id', worksheetExerciseId)
		.single();

	// Default to true if no setting found (original behavior)
	return worksheetExercise?.correction_visible ?? true;
}

// ============================================================================
// BATCH VISIBILITY (OPTIMIZED)
// ============================================================================

/**
 * Gets correction visibility for multiple exercises at once.
 * Optimized to minimize database queries when checking many exercises.
 *
 * @param supabase - Supabase client
 * @param assignmentId - The assignment ID
 * @param worksheetExerciseIds - Array of worksheet_exercise IDs to check
 * @returns Map of worksheet_exercise_id -> visibility boolean
 */
export async function getCorrectionVisibilityMap(
	supabase: SupabaseClient,
	assignmentId: string,
	worksheetExerciseIds: string[]
): Promise<Map<string, boolean>> {
	const visibilityMap = new Map<string, boolean>();

	// Initialize all to false
	for (const id of worksheetExerciseIds) {
		visibilityMap.set(id, false);
	}

	if (worksheetExerciseIds.length === 0) {
		return visibilityMap;
	}

	// Fetch assignment settings
	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select('*')
		.eq('id', assignmentId)
		.single();

	if (assignmentError || !assignment) {
		// Cannot determine visibility, all remain false
		return visibilityMap;
	}

	// Step 1: Check global toggle
	if (!assignment.show_corrections) {
		// All corrections hidden
		return visibilityMap;
	}

	// Step 2: Check correction release timing
	const releaseAccess = canAccessCorrections(
		assignment as WorksheetAssignmentRow,
		'visibility-check'
	);
	if (!releaseAccess.canAccess) {
		// Release conditions not met
		return visibilityMap;
	}

	// Step 3: Fetch all exercise-level overrides for this assignment
	const { data: exerciseSettings } = await supabase
		.from('worksheet_assignment_exercise_settings')
		.select('worksheet_exercise_id, show_correction')
		.eq('assignment_id', assignmentId)
		.in('worksheet_exercise_id', worksheetExerciseIds);

	// Create a map of overrides
	const overrideMap = new Map<string, boolean>();
	if (exerciseSettings) {
		for (const setting of exerciseSettings) {
			overrideMap.set(setting.worksheet_exercise_id, setting.show_correction);
		}
	}

	// Step 4: Fetch default visibility for all exercises
	const { data: worksheetExercises } = await supabase
		.from('worksheet_exercises')
		.select('id, correction_visible')
		.in('id', worksheetExerciseIds);

	// Create a map of defaults
	const defaultMap = new Map<string, boolean>();
	if (worksheetExercises) {
		for (const exercise of worksheetExercises) {
			defaultMap.set(exercise.id, exercise.correction_visible ?? true);
		}
	}

	// Combine: override takes precedence over default
	for (const id of worksheetExerciseIds) {
		if (overrideMap.has(id)) {
			// Use override
			visibilityMap.set(id, overrideMap.get(id)!);
		} else {
			// Use default (true if not specified)
			visibilityMap.set(id, defaultMap.get(id) ?? true);
		}
	}

	return visibilityMap;
}

/**
 * Checks if corrections are globally enabled for an assignment.
 * This is a quick check without per-exercise resolution.
 *
 * @param supabase - Supabase client
 * @param assignmentId - The assignment ID
 * @returns Context with global settings and release status
 */
export async function getCorrectionContext(
	supabase: SupabaseClient,
	assignmentId: string
): Promise<CorrectionVisibilityContext | null> {
	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select('*')
		.eq('id', assignmentId)
		.single();

	if (assignmentError || !assignment) {
		return null;
	}

	const releaseAccess = canAccessCorrections(assignment as WorksheetAssignmentRow, 'context-check');

	return {
		assignmentId,
		showCorrections: assignment.show_corrections ?? false,
		releaseAllowed: releaseAccess.canAccess
	};
}
