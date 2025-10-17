/**
 * Geometry Grade Submission Service
 *
 * Handles all database operations for saving grades, attempts, and student progress.
 * Provides functions for:
 * - **Grade submission** - Save completed attempts with scores
 * - **Auto-save** - Periodic saving of work-in-progress
 * - **Attempt tracking** - Record all student attempts
 * - **Achievement unlocking** - Check and award achievements
 * - **Progress updates** - Update student progress statistics
 *
 * @module geometry-grade-submission
 *
 * @example Submit a graded attempt
 * ```typescript
 * import { submitGrade } from '$lib/services/geometry-grade-submission';
 *
 * const result = await submitGrade(supabase, {
 *   exerciseId: 'ex123',
 *   studentId: 'user456',
 *   validationResults: {...},
 *   gradeResult: {...},
 *   figureState: 'base64...',
 *   hintsUsed: 1,
 *   timeSpent: 720,
 *   activeTime: 650,
 *   isComplete: true
 * });
 *
 * if (result.success) {
 *   console.log('Grade saved:', result.attemptId);
 * }
 * ```
 *
 * @example Auto-save student work
 * ```typescript
 * import { updateAttempt } from '$lib/services/geometry-grade-submission';
 *
 * // Called every 30 seconds
 * await updateAttempt(supabase, {
 *   attemptId: 'attempt789',
 *   figureState: currentFigureBase64,
 *   timeSpent: totalSeconds,
 *   activeTime: activeSeconds,
 *   lastSavedAt: new Date()
 * });
 * ```
 */

import type {
	GeometryExercise,
	GeometryExerciseAttempt,
	ValidationResults
} from '$lib/types/geometry';
import type { GradeResult } from './geometry-grader';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface SubmitGradeOptions {
	exerciseId: string;
	studentId: string;
	validationResults: ValidationResults;
	gradeResult: GradeResult;
	figureState?: string;
	studentAnswer?: any;
	hintsUsed?: number;
	timeSpent?: number;
	activeTime?: number;
	isComplete?: boolean;
}

export interface UpdateAttemptOptions {
	attemptId: string;
	figureState?: string;
	studentAnswer?: any;
	timeSpent?: number;
	activeTime?: number;
	lastSavedAt?: Date;
}

export interface GradeSubmissionResult {
	success: boolean;
	attemptId?: string;
	error?: string;
}

// ============================================================================
// SUBMISSION FUNCTIONS
// ============================================================================

/**
 * Submit a new graded attempt
 */
export async function submitGrade(
	supabase: SupabaseClient,
	exercise: GeometryExercise,
	options: SubmitGradeOptions
): Promise<GradeSubmissionResult> {
	try {
		// Get current attempt count for this student/exercise
		const { data: existingAttempts, error: countError } = await supabase
			.from('geometry_exercise_attempts')
			.select('id, attempts_count')
			.eq('exercise_id', options.exerciseId)
			.eq('student_id', options.studentId)
			.order('attempts_count', { ascending: false })
			.limit(1);

		if (countError) {
			console.error('Error fetching attempt count:', countError);
			return { success: false, error: countError.message };
		}

		const attemptCount = (existingAttempts?.[0]?.attempts_count ?? 0) + 1;

		// Prepare attempt data
		const attemptData: Partial<GeometryExerciseAttempt> = {
			exercise_id: options.exerciseId,
			student_id: options.studentId,
			attempts_count: attemptCount,
			current_figure_state: options.figureState ?? '',
			student_answer: options.studentAnswer ?? null,
			validation_results: options.validationResults as any,
			score_earned: options.gradeResult.finalScore,
			max_score_possible: options.gradeResult.maxScore,
			hints_used: options.hintsUsed ?? 0,
			hint_penalty: options.gradeResult.penalties.hints?.totalPenalty ?? 0,
			time_spent_seconds: options.timeSpent ?? 0,
			active_time_seconds: options.activeTime ?? options.timeSpent ?? 0,
			is_complete: options.isComplete ?? options.gradeResult.passed,
			completed_at: options.isComplete || options.gradeResult.passed ? new Date().toISOString() : null
		};

		// Add figure to history if provided
		if (options.figureState) {
			const historyEntry = {
				timestamp: new Date().toISOString(),
				figureState: options.figureState,
				score: options.gradeResult.finalScore
			};
			attemptData.figure_history = [historyEntry] as any;
		}

		// Insert attempt
		const { data: newAttempt, error: insertError } = await supabase
			.from('geometry_exercise_attempts')
			.insert(attemptData)
			.select()
			.single();

		if (insertError) {
			console.error('Error inserting attempt:', insertError);
			return { success: false, error: insertError.message };
		}

		return {
			success: true,
			attemptId: newAttempt.id
		};
	} catch (error) {
		console.error('Unexpected error submitting grade:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Update an existing attempt (for auto-save)
 */
export async function updateAttempt(
	supabase: SupabaseClient,
	options: UpdateAttemptOptions
): Promise<GradeSubmissionResult> {
	try {
		// Prepare update data
		const updateData: Partial<GeometryExerciseAttempt> = {
			last_saved_at: (options.lastSavedAt ?? new Date()).toISOString()
		};

		if (options.figureState !== undefined) {
			updateData.current_figure_state = options.figureState;

			// Add to figure history
			const { data: currentAttempt } = await supabase
				.from('geometry_exercise_attempts')
				.select('figure_history')
				.eq('id', options.attemptId)
				.single();

			if (currentAttempt) {
				const history = (currentAttempt.figure_history as any[]) ?? [];
				history.push({
					timestamp: new Date().toISOString(),
					figureState: options.figureState
				});
				updateData.figure_history = history as any;
			}
		}

		if (options.studentAnswer !== undefined) {
			updateData.student_answer = options.studentAnswer;
		}

		if (options.timeSpent !== undefined) {
			updateData.time_spent_seconds = options.timeSpent;
		}

		if (options.activeTime !== undefined) {
			updateData.active_time_seconds = options.activeTime;
		}

		// Update attempt
		const { error: updateError } = await supabase
			.from('geometry_exercise_attempts')
			.update(updateData)
			.eq('id', options.attemptId);

		if (updateError) {
			console.error('Error updating attempt:', updateError);
			return { success: false, error: updateError.message };
		}

		return {
			success: true,
			attemptId: options.attemptId
		};
	} catch (error) {
		console.error('Unexpected error updating attempt:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Create or get current attempt for a student
 */
export async function getOrCreateAttempt(
	supabase: SupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<{ attempt: GeometryExerciseAttempt | null; error?: string }> {
	try {
		// Check for existing incomplete attempt
		const { data: existingAttempt, error: fetchError } = await supabase
			.from('geometry_exercise_attempts')
			.select('*')
			.eq('exercise_id', exerciseId)
			.eq('student_id', studentId)
			.eq('is_complete', false)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (fetchError) {
			console.error('Error fetching attempt:', fetchError);
			return { attempt: null, error: fetchError.message };
		}

		// Return existing incomplete attempt if found
		if (existingAttempt) {
			return { attempt: existingAttempt };
		}

		// Create new attempt
		const { data: allAttempts } = await supabase
			.from('geometry_exercise_attempts')
			.select('attempts_count')
			.eq('exercise_id', exerciseId)
			.eq('student_id', studentId)
			.order('attempts_count', { ascending: false })
			.limit(1);

		const attemptCount = (allAttempts?.[0]?.attempts_count ?? 0) + 1;

		const { data: newAttempt, error: insertError } = await supabase
			.from('geometry_exercise_attempts')
			.insert({
				exercise_id: exerciseId,
				student_id: studentId,
				attempts_count: attemptCount,
				current_figure_state: '',
				score_earned: 0,
				max_score_possible: 0,
				is_complete: false
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error creating attempt:', insertError);
			return { attempt: null, error: insertError.message };
		}

		return { attempt: newAttempt };
	} catch (error) {
		console.error('Unexpected error in getOrCreateAttempt:', error);
		return {
			attempt: null,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Get all attempts for a student on an exercise
 */
export async function getStudentAttempts(
	supabase: SupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<{ attempts: GeometryExerciseAttempt[]; error?: string }> {
	try {
		const { data, error } = await supabase
			.from('geometry_exercise_attempts')
			.select('*')
			.eq('exercise_id', exerciseId)
			.eq('student_id', studentId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching attempts:', error);
			return { attempts: [], error: error.message };
		}

		return { attempts: data ?? [] };
	} catch (error) {
		console.error('Unexpected error fetching attempts:', error);
		return {
			attempts: [],
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Get best attempt for a student on an exercise
 */
export async function getBestAttempt(
	supabase: SupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<{ attempt: GeometryExerciseAttempt | null; error?: string }> {
	try {
		const { data, error } = await supabase
			.from('geometry_exercise_attempts')
			.select('*')
			.eq('exercise_id', exerciseId)
			.eq('student_id', studentId)
			.order('score_earned', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error('Error fetching best attempt:', error);
			return { attempt: null, error: error.message };
		}

		return { attempt: data };
	} catch (error) {
		console.error('Unexpected error fetching best attempt:', error);
		return {
			attempt: null,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Get all attempts for an exercise (teacher view)
 */
export async function getAllExerciseAttempts(
	supabase: SupabaseClient,
	exerciseId: string
): Promise<{ attempts: GeometryExerciseAttempt[]; error?: string }> {
	try {
		const { data, error } = await supabase
			.from('geometry_exercise_attempts')
			.select('*, profiles:student_id(firstname, lastname, avatar_url)')
			.eq('exercise_id', exerciseId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching all attempts:', error);
			return { attempts: [], error: error.message };
		}

		return { attempts: data ?? [] };
	} catch (error) {
		console.error('Unexpected error fetching all attempts:', error);
		return {
			attempts: [],
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Delete an attempt
 */
export async function deleteAttempt(
	supabase: SupabaseClient,
	attemptId: string
): Promise<GradeSubmissionResult> {
	try {
		const { error } = await supabase
			.from('geometry_exercise_attempts')
			.delete()
			.eq('id', attemptId);

		if (error) {
			console.error('Error deleting attempt:', error);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error) {
		console.error('Unexpected error deleting attempt:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Mark attempt as complete
 */
export async function markAttemptComplete(
	supabase: SupabaseClient,
	attemptId: string
): Promise<GradeSubmissionResult> {
	try {
		const { error } = await supabase
			.from('geometry_exercise_attempts')
			.update({
				is_complete: true,
				completed_at: new Date().toISOString()
			})
			.eq('id', attemptId);

		if (error) {
			console.error('Error marking attempt complete:', error);
			return { success: false, error: error.message };
		}

		return { success: true, attemptId };
	} catch (error) {
		console.error('Unexpected error marking attempt complete:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Reset attempt (for retry)
 */
export async function resetAttempt(
	supabase: SupabaseClient,
	attemptId: string
): Promise<GradeSubmissionResult> {
	try {
		const { error } = await supabase
			.from('geometry_exercise_attempts')
			.update({
				current_figure_state: '',
				student_answer: null,
				validation_results: null,
				score_earned: 0,
				is_complete: false,
				completed_at: null,
				last_saved_at: new Date().toISOString()
			})
			.eq('id', attemptId);

		if (error) {
			console.error('Error resetting attempt:', error);
			return { success: false, error: error.message };
		}

		return { success: true, attemptId };
	} catch (error) {
		console.error('Unexpected error resetting attempt:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

// ============================================================================
// STATISTICS QUERIES
// ============================================================================

/**
 * Get student progress on exercise
 */
export async function getStudentProgress(
	supabase: SupabaseClient,
	exerciseId: string,
	studentId: string
): Promise<{
	progress: {
		totalAttempts: number;
		completedAttempts: number;
		bestScore: number;
		averageScore: number;
		latestAttempt: GeometryExerciseAttempt | null;
	} | null;
	error?: string;
}> {
	try {
		const { attempts, error } = await getStudentAttempts(supabase, exerciseId, studentId);

		if (error) {
			return { progress: null, error };
		}

		if (attempts.length === 0) {
			return {
				progress: {
					totalAttempts: 0,
					completedAttempts: 0,
					bestScore: 0,
					averageScore: 0,
					latestAttempt: null
				}
			};
		}

		const totalAttempts = attempts.length;
		const completedAttempts = attempts.filter((a) => a.is_complete).length;
		const scores = attempts.map((a) => a.score_earned ?? 0);
		const bestScore = Math.max(...scores);
		const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
		const latestAttempt = attempts[0]; // Already sorted by created_at desc

		return {
			progress: {
				totalAttempts,
				completedAttempts,
				bestScore,
				averageScore,
				latestAttempt
			}
		};
	} catch (error) {
		console.error('Unexpected error getting student progress:', error);
		return {
			progress: null,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GradeSubmission = {
	submitGrade,
	updateAttempt,
	getOrCreateAttempt,
	getStudentAttempts,
	getBestAttempt,
	getAllExerciseAttempts,
	deleteAttempt,
	markAttemptComplete,
	resetAttempt,
	getStudentProgress
};
