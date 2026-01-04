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
import type {
	Exercise,
	ExerciseExport,
	ExerciseExportV1,
	ExerciseExportV2,
	ImportResult,
	ImportOptions
} from '$lib/exercises/types';
import { getExerciseContentSafe } from '$lib/exercises/types';
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
 * Convert an Exercise database record to clean export format (legacy v1.0)
 *
 * @deprecated Use exerciseToExportV2 for new exports with variations support
 * @param exercise - Exercise from database
 * @returns Clean export format without id, timestamps, created_by (v1.0 format)
 */
export function exerciseToExport(exercise: Exercise): ExerciseExportV1 {
	// Get content from variations (single source of truth)
	const content = getExerciseContentSafe(exercise);
	return {
		version: '1.0',
		title: exercise.title,
		source: exercise.source,
		difficulty: exercise.difficulty,
		tags: exercise.tags,
		statement_md: content.statement_md,
		solution_md: content.solution_md,
		grade_levels: exercise.grade_levels,
		topic: exercise.topic
	};
}

/**
 * Convert an Exercise database record to v2.0 export format with variations
 *
 * @param exercise - Exercise from database
 * @returns Export format v2.0 with variations and shared defaults
 */
export function exerciseToExportV2(exercise: Exercise): ExerciseExportV2 {
	// Cast variations and shared from database JSONB to TypeScript types
	const variations = exercise.variations as Exercise['variations'];
	const shared = exercise.shared as Exercise['shared'];

	// Get content from variations (single source of truth) for legacy fields
	const content = getExerciseContentSafe(exercise);

	return {
		version: '2.0',
		title: exercise.title,
		source: exercise.source,
		difficulty: exercise.difficulty,
		tags: exercise.tags,
		// Legacy fields populated from variations for backward compatibility
		statement_md: content.statement_md,
		solution_md: content.solution_md,
		grade_levels: exercise.grade_levels,
		topic: exercise.topic,
		variations: variations,
		shared: shared
	};
}

/**
 * Export exercise to JSON string (v2.0 format with variations)
 *
 * @param exercise - Exercise to export
 * @param prettyPrint - Whether to pretty-print JSON
 * @returns JSON string in v2.0 format
 */
export function exportExerciseToJSON(exercise: Exercise, prettyPrint = true): string {
	const exportData = exerciseToExportV2(exercise);
	return prettyPrint ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * Export multiple exercises to JSON string (v2.0 format with variations)
 *
 * @param exercises - Exercises to export
 * @param prettyPrint - Whether to pretty-print JSON
 * @returns JSON string with array of exercises in v2.0 format
 */
export function exportExercisesToJSON(exercises: Exercise[], prettyPrint = true): string {
	const exportData = exercises.map(exerciseToExportV2);
	return prettyPrint ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * Export exercise to Markdown with frontmatter (v2.0 format with variations)
 *
 * @param exercise - Exercise to export
 * @returns Markdown string with YAML frontmatter in v2.0 format
 */
export function exportExerciseToMarkdown(exercise: Exercise): string {
	const exportData = exerciseToExportV2(exercise);
	return serializeToMarkdown(exportData);
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Migrate legacy v1.0 format (without variations) to v2.0 format
 *
 * Converts a legacy exercise export to the new variations format by:
 * - Creating a single variation with label "Default"
 * - Moving statement_md and solution_md into the variation
 * - Preserving all other fields
 *
 * @param legacyData - Exercise in v1.0 or v2.0 format
 * @returns Exercise in v2.0 format with variations
 */
function migrateLegacyToVariations(legacyData: ExerciseExport): ExerciseExportV2 {
	// If already v2.0 with variations, return as-is
	if (legacyData.version === '2.0') {
		return legacyData;
	}

	// Create v2.0 format with single "Default" variation
	return {
		...legacyData,
		version: '2.0',
		variations: [
			{
				label: 'Default',
				statement_md: legacyData.statement_md,
				solution_md: legacyData.solution_md
			}
		],
		shared: undefined // No shared defaults for migrated exercises
	};
}

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
 * @param exercise - Exercise data to check (can be v1.0 or v2.0 format)
 * @param userId - User ID performing the check
 * @returns Exercise ID if duplicate exists, null otherwise
 */
async function findDuplicateExercise(
	supabase: SupabaseClient<Database>,
	exercise: ValidatedExerciseExport,
	userId: string
): Promise<string | null> {
	const hash = computeExerciseHash(exercise.statement_md, exercise.title);

	// Query exercises by user with matching title or content hash
	// Include variations and shared for content extraction
	const { data } = await supabase
		.from('exercises')
		.select('id, title, shared, variations')
		.eq('created_by', userId)
		.limit(100);

	if (!data) return null;

	// Check for duplicates by content hash
	for (const existing of data) {
		// Get content from variations (single source of truth)
		const existingContent = getExerciseContentSafe(existing as unknown as Exercise);
		const existingHash = computeExerciseHash(
			existingContent.statement_md,
			existing.title ?? undefined
		);
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
 * Supports both v1.0 (legacy) and v2.0 (with variations) formats.
 * Legacy exercises are automatically migrated to variations format.
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

	let exerciseData = data as ValidatedExerciseExport;

	// Detect version and migrate if legacy format
	const version = exerciseData.version || '1.0';
	if (version === '1.0') {
		// Migrate legacy format to v2.0 with variations
		// The migrateLegacyToVariations function handles the conversion
		const v1Data = exerciseData as ExerciseExportV1;
		const v2Data = migrateLegacyToVariations(v1Data);
		exerciseData = v2Data as ValidatedExerciseExport;
	}

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
