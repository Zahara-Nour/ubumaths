/**
 * Server-side Exercise Import/Export Functions
 *
 * Handles exporting and importing exercises in various formats (JSON, Markdown).
 * Includes validation and duplicate detection.
 *
 * @module server/exercise-import-export
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { Exercise, ExerciseExport, ImportResult, ImportOptions } from '$lib/exercises/types';
import {
	validateExerciseExport,
	sanitizeExerciseForInsert,
	type ValidatedExerciseExport
} from '$lib/exercises/validation';
import {
	serializeToMarkdown,
	parseMarkdownWithFrontmatter
} from '$lib/exercises/markdown-frontmatter';
import { createExercise } from './exercises';
import { createHash } from 'crypto';

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Convert an Exercise database record to clean export format
 *
 * @param exercise - Exercise from database
 * @returns Clean export format without id, timestamps, created_by
 */
export function exerciseToExport(exercise: Exercise): ExerciseExport {
	return {
		version: '1.0',
		title: exercise.title,
		source: exercise.source,
		difficulty: exercise.difficulty,
		tags: exercise.tags,
		statement_md: exercise.statement_md,
		solution_md: exercise.solution_md,
		grade_levels: exercise.grade_levels,
		topic: exercise.topic
	};
}

/**
 * Export exercise to JSON string
 *
 * @param exercise - Exercise to export
 * @param prettyPrint - Whether to pretty-print JSON
 * @returns JSON string
 */
export function exportExerciseToJSON(exercise: Exercise, prettyPrint = true): string {
	const exportData = exerciseToExport(exercise);
	return prettyPrint ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * Export multiple exercises to JSON string
 *
 * @param exercises - Exercises to export
 * @param prettyPrint - Whether to pretty-print JSON
 * @returns JSON string with array of exercises
 */
export function exportExercisesToJSON(exercises: Exercise[], prettyPrint = true): string {
	const exportData = exercises.map(exerciseToExport);
	return prettyPrint ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * Export exercise to Markdown with frontmatter
 *
 * @param exercise - Exercise to export
 * @returns Markdown string with YAML frontmatter
 */
export function exportExerciseToMarkdown(exercise: Exercise): string {
	const exportData = exerciseToExport(exercise);
	return serializeToMarkdown(exportData);
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Compute hash of exercise content for duplicate detection
 *
 * @param statement - Exercise statement
 * @param title - Exercise title (optional)
 * @returns SHA-256 hash
 */
function computeExerciseHash(statement: string, title?: string): string {
	const content = title ? `${title}:${statement}` : statement;
	return createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * Check if exercise already exists (duplicate detection)
 *
 * @param supabase - Supabase client
 * @param exercise - Exercise data to check
 * @param userId - User ID performing the check
 * @returns Exercise ID if duplicate exists, null otherwise
 */
async function findDuplicateExercise(
	supabase: SupabaseClient<Database>,
	exercise: ExerciseExport,
	userId: string
): Promise<string | null> {
	const hash = computeExerciseHash(exercise.statement_md, exercise.title);

	// Query exercises by user with matching title or content hash
	const { data } = await supabase
		.from('exercises')
		.select('id, statement_md, title')
		.eq('created_by', userId)
		.limit(100);

	if (!data) return null;

	// Check for duplicates by content hash
	for (const existing of data) {
		const existingHash = computeExerciseHash(existing.statement_md, existing.title ?? undefined);
		if (existingHash === hash) {
			return existing.id;
		}
	}

	return null;
}

/**
 * Generate a unique title with " (copie)" suffix for creating copies
 *
 * @param supabase - Supabase client
 * @param baseTitle - Base title to append suffix to
 * @param userId - User ID (to check for existing titles)
 * @returns Unique title with suffix
 */
async function generateUniqueCopyTitle(
	supabase: SupabaseClient<Database>,
	baseTitle: string,
	userId: string
): Promise<string> {
	// Start with " (copie)" suffix
	let suffix = ' (copie)';
	let copyNumber = 2;
	let candidateTitle = baseTitle + suffix;

	// Query user's existing exercise titles
	const { data: exercises } = await supabase
		.from('exercises')
		.select('title')
		.eq('created_by', userId);

	const existingTitles = new Set(
		(exercises || []).map((ex) => ex.title).filter((title): title is string => title !== null)
	);

	// Keep incrementing until we find a unique title
	while (existingTitles.has(candidateTitle)) {
		suffix = ` (copie ${copyNumber})`;
		candidateTitle = baseTitle + suffix;
		copyNumber++;
	}

	return candidateTitle;
}

/**
 * Import a single exercise from JSON data
 *
 * @param supabase - Supabase client
 * @param data - Exercise data (unknown type, will be validated)
 * @param userId - User ID performing the import
 * @param options - Import options
 * @returns Import result with success status and exercise ID
 */
export async function importExerciseFromJSON(
	supabase: SupabaseClient<Database>,
	data: unknown,
	userId: string,
	options: ImportOptions = { onDuplicate: 'skip', validate: true }
): Promise<{ success: boolean; exerciseId?: string; error?: string; skipped?: boolean }> {
	// Validate data
	if (options.validate !== false) {
		const validation = validateExerciseExport(data);
		if (!validation.success) {
			return { success: false, error: validation.error };
		}
		data = validation.data;
	}

	const exerciseData = data as ValidatedExerciseExport;

	// Check for duplicates
	const duplicateId = await findDuplicateExercise(supabase, exerciseData, userId);

	if (duplicateId) {
		if (options.onDuplicate === 'skip') {
			return { success: true, skipped: true, exerciseId: duplicateId };
		} else if (options.onDuplicate === 'replace') {
			// Replace existing exercise with new data
			const cleanData = sanitizeExerciseForInsert(exerciseData);
			const { data: existing, error: fetchError } = await supabase
				.from('exercises')
				.select('created_by')
				.eq('id', duplicateId)
				.single();

			if (fetchError || !existing) {
				return { success: false, error: 'Duplicate exercise not found' };
			}

			// Only allow replacing if user owns the exercise (or bypass for admins if needed)
			if (existing.created_by !== userId) {
				return { success: false, error: 'Cannot replace exercise owned by another user' };
			}

			const { data, error } = await supabase
				.from('exercises')
				.update({
					...cleanData,
					updated_at: new Date().toISOString()
				})
				.eq('id', duplicateId)
				.eq('created_by', userId)
				.select()
				.single();

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true, exerciseId: data!.id };
		} else if (options.onDuplicate === 'create-copy') {
			// Create a new exercise with modified title
			const cleanData = sanitizeExerciseForInsert(exerciseData);

			// Generate unique title with " (copie)" suffix
			const newTitle = await generateUniqueCopyTitle(
				supabase,
				exerciseData.title || 'Exercice',
				userId
			);

			// Create new exercise with the unique title
			const result = await createExercise(
				supabase,
				{
					...cleanData,
					title: newTitle
				},
				userId
			);

			if (result.error) {
				return { success: false, error: result.error.message };
			}

			return { success: true, exerciseId: result.data!.id };
		}
	}

	// Sanitize and create exercise
	const cleanData = sanitizeExerciseForInsert(exerciseData);
	const result = await createExercise(supabase, cleanData, userId);

	if (result.error) {
		return { success: false, error: result.error.message };
	}

	return { success: true, exerciseId: result.data!.id };
}

/**
 * Import a single exercise from Markdown content
 *
 * @param supabase - Supabase client
 * @param content - Markdown content with frontmatter
 * @param userId - User ID performing the import
 * @param options - Import options
 * @returns Import result with success status and exercise ID
 */
export async function importExerciseFromMarkdown(
	supabase: SupabaseClient<Database>,
	content: string,
	userId: string,
	options: ImportOptions = { onDuplicate: 'skip', validate: true }
): Promise<{ success: boolean; exerciseId?: string; error?: string; skipped?: boolean }> {
	// Parse markdown
	const parseResult = parseMarkdownWithFrontmatter(content);
	if (!parseResult.success) {
		return { success: false, error: parseResult.error };
	}

	// Import parsed data
	return importExerciseFromJSON(supabase, parseResult.data, userId, options);
}

/**
 * Import multiple exercises from JSON array
 *
 * @param supabase - Supabase client
 * @param data - Array of exercise data (unknown type, will be validated)
 * @param userId - User ID performing the import
 * @param options - Import options
 * @returns Import result with statistics
 */
export async function importExercisesFromJSON(
	supabase: SupabaseClient<Database>,
	data: unknown,
	userId: string,
	options: ImportOptions = { onDuplicate: 'skip', validate: true }
): Promise<ImportResult> {
	const result: ImportResult = {
		success: true,
		imported: 0,
		skipped: 0,
		failed: 0,
		importedIds: [],
		errors: []
	};

	// Validate that data is an array
	if (!Array.isArray(data)) {
		result.success = false;
		result.failed = 1;
		result.errors.push({ index: 0, error: 'Data must be an array of exercises' });
		return result;
	}

	// Import each exercise
	for (let i = 0; i < data.length; i++) {
		const exerciseData = data[i];
		const importResult = await importExerciseFromJSON(supabase, exerciseData, userId, options);

		if (!importResult.success) {
			result.failed++;
			result.errors.push({
				index: i,
				title: (exerciseData as ExerciseExport | undefined)?.title,
				error: importResult.error || 'Unknown error'
			});
		} else if (importResult.skipped) {
			result.skipped++;
		} else {
			result.imported++;
			if (importResult.exerciseId) {
				result.importedIds.push(importResult.exerciseId);
			}
		}
	}

	// Set overall success status
	result.success = result.failed === 0;

	return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate filename for exercise export
 *
 * @param exercise - Exercise to generate filename for
 * @param format - Export format (json or md)
 * @returns Sanitized filename
 */
export function generateExportFilename(exercise: Exercise, format: 'json' | 'md'): string {
	const title = exercise.title || `exercise-${exercise.id.substring(0, 8)}`;
	const sanitized = title
		.toLowerCase()
		.replace(/[àáâäã]/g, 'a')
		.replace(/[èéêë]/g, 'e')
		.replace(/[ìíîï]/g, 'i')
		.replace(/[òóôöõ]/g, 'o')
		.replace(/[ùúûü]/g, 'u')
		.replace(/[ç]/g, 'c')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 50);

	return `${sanitized}.${format}`;
}
