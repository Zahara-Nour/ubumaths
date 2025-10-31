/**
 * API Route: POST /api/exercises/export
 * Export exercises to JSON or Markdown format
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExercise } from '$lib/server/exercises';
import type { Exercise } from '$lib/exercises/types';
import type { ZodIssue } from 'zod';
import {
	exportExerciseToJSON,
	exportExerciseToMarkdown,
	generateExportFilename
} from '$lib/server/exercise-import-export';
import { validateExportExercises } from '$lib/server/validation';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * POST /api/exercises/export
 * Export one or more exercises
 *
 * Request body:
 * {
 *   exercise_ids: string[],  // Array of exercise IDs to export
 *   format: 'json' | 'markdown',
 *   pretty_print?: boolean  // For JSON only
 * }
 *
 * Returns:
 * - Single exercise: { filename, content, mime_type }
 * - Multiple exercises: { filename, content, mime_type } (JSON array or ZIP)
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Parse and validate request body
	const body = await request.json();
	const validation = validateExportExercises(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const { exercise_ids, format, pretty_print = true } = validation.data;

	// Fetch exercises
	const exercises: Exercise[] = [];
	for (const id of exercise_ids) {
		const result = await getExercise(locals.supabase, id);
		if (result.error || !result.data) {
			throw error(404, `Exercise not found: ${id}`);
		}

		// Verify user owns the exercise or it's public
		if (result.data.created_by !== user.id && !(result.data as { is_public?: boolean }).is_public) {
			throw error(403, `Forbidden - Cannot export exercise: ${id}`);
		}

		exercises.push(result.data as unknown as Exercise);
	}

	// Export based on format
	if (format === 'json') {
		// Export as JSON
		let content: string;
		let filename: string;

		if (exercises.length === 1) {
			content = exportExerciseToJSON(exercises[0], pretty_print);
			filename = generateExportFilename(exercises[0], 'json');
		} else {
			// Multiple exercises - export as array
			const exportData = exercises.map((ex) => JSON.parse(exportExerciseToJSON(ex, false)));
			content = pretty_print ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
			filename = `exercises-export-${new Date().toISOString().split('T')[0]}.json`;
		}

		return json({
			filename,
			content,
			mime_type: 'application/json'
		});
	} else {
		// Export as Markdown
		if (exercises.length === 1) {
			const content = exportExerciseToMarkdown(exercises[0]);
			const filename = generateExportFilename(exercises[0], 'md');

			return json({
				filename,
				content,
				mime_type: 'text/markdown'
			});
		} else {
			// Multiple exercises - return array of files
			const files = exercises.map((ex) => ({
				filename: generateExportFilename(ex, 'md'),
				content: exportExerciseToMarkdown(ex)
			}));

			return json({
				files,
				mime_type: 'text/markdown',
				message: 'Multiple markdown files. Download as ZIP or individually.'
			});
		}
	}
};
