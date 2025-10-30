/**
 * API Route: GET /api/exercises/[id]/export
 * Export a single exercise by ID
 *
 * Query params:
 * - format: 'json' | 'markdown' (default: 'json')
 * - pretty: 'true' | 'false' (default: 'true', JSON only)
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExercise } from '$lib/server/exercises';
import type { Exercise } from '$lib/exercises/types';
import {
	exportExerciseToJSON,
	exportExerciseToMarkdown,
	generateExportFilename
} from '$lib/server/exercise-import-export';
import { validateExportSingleExerciseQuery } from '$lib/server/validation';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Only teachers can export exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Get exercise
	const result = await getExercise(locals.supabase, params.id);
	if (result.error || !result.data) {
		throw error(404, 'Exercise not found');
	}

	// Verify user owns the exercise or it's public
	if (result.data.created_by !== user.id && !(result.data as { is_public?: boolean }).is_public) {
		throw error(403, 'Forbidden - Cannot export this exercise');
	}

	// Validate and parse query params
	const queryValidation = validateExportSingleExerciseQuery(url.searchParams);
	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Invalid query parameters: ${errorMsg}`);
	}

	const { format, pretty: prettyPrint } = queryValidation.data;

	// Export exercise
	let content: string;
	let filename: string;
	let mimeType: string;

	// Type assertion for exercise data
	const exerciseData = result.data as Exercise;

	if (format === 'json') {
		content = exportExerciseToJSON(exerciseData, prettyPrint);
		filename = generateExportFilename(exerciseData, 'json');
		mimeType = 'application/json';
	} else {
		content = exportExerciseToMarkdown(exerciseData);
		filename = generateExportFilename(exerciseData, 'md');
		mimeType = 'text/markdown';
	}

	// Return as downloadable file
	return new Response(content, {
		headers: {
			'Content-Type': mimeType,
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': new TextEncoder().encode(content).length.toString()
		}
	});
};
