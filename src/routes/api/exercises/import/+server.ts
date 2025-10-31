/**
 * API Route: POST /api/exercises/import
 * Import exercises from JSON or Markdown format
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	importExerciseFromJSON,
	importExerciseFromMarkdown,
	importExercisesFromJSON
} from '$lib/server/exercise-import-export';
import type { ImportOptions } from '$lib/exercises/types';
import { importExercisesSchema } from '$lib/server/validation/exercises';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * POST /api/exercises/import
 * Import one or more exercises
 *
 * Request body:
 * {
 *   format: 'json' | 'markdown',
 *   content: string | object,  // JSON string/object or Markdown string
 *   options?: {
 *     on_duplicate?: 'skip' | 'replace' | 'create-copy',
 *     validate?: boolean
 *   }
 * }
 *
 * Returns:
 * - ImportResult with statistics and errors
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// SECURITY: Validate request body with Zod schema
	const body = await request.json();
	const validation = importExercisesSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { format, content, options = {} } = validation.data;

	// Build import options
	const importOptions: ImportOptions = {
		onDuplicate: options.on_duplicate || 'skip',
		validate: options.validate !== false
	};

	// Import based on format
	if (format === 'json') {
		// Parse JSON if it's a string
		let data;
		if (typeof content === 'string') {
			try {
				data = JSON.parse(content);
			} catch (_e) {
				throw error(400, 'Invalid JSON content');
			}
		} else {
			data = content;
		}

		// Check if single or multiple exercises
		if (Array.isArray(data)) {
			// Multiple exercises
			const result = await importExercisesFromJSON(locals.supabase, data, user.id, importOptions);
			return json(result);
		} else {
			// Single exercise
			const result = await importExerciseFromJSON(locals.supabase, data, user.id, importOptions);

			// Convert single import result to ImportResult format
			return json({
				success: result.success,
				imported: result.success && !result.skipped ? 1 : 0,
				skipped: result.skipped ? 1 : 0,
				failed: !result.success ? 1 : 0,
				importedIds: result.exerciseId ? [result.exerciseId] : [],
				errors: result.error ? [{ index: 0, error: result.error }] : []
			});
		}
	} else {
		// Markdown import
		if (typeof content !== 'string') {
			throw error(400, 'Markdown content must be a string');
		}

		const result = await importExerciseFromMarkdown(
			locals.supabase,
			content,
			user.id,
			importOptions
		);

		// Convert single import result to ImportResult format
		return json({
			success: result.success,
			imported: result.success && !result.skipped ? 1 : 0,
			skipped: result.skipped ? 1 : 0,
			failed: !result.success ? 1 : 0,
			importedIds: result.exerciseId ? [result.exerciseId] : [],
			errors: result.error ? [{ index: 0, error: result.error }] : []
		});
	}
};
