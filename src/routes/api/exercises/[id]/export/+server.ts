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
import {
	exportExerciseToJSON,
	exportExerciseToMarkdown,
	generateExportFilename
} from '$lib/server/exercise-import-export';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Only teachers can export exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user.id)
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
	if (
		result.data.created_by !== session.user.id &&
		!(result.data as { is_public?: boolean }).is_public
	) {
		throw error(403, 'Forbidden - Cannot export this exercise');
	}

	// Get format from query params
	const format = url.searchParams.get('format') || 'json';
	const prettyPrint = url.searchParams.get('pretty') !== 'false';

	if (!['json', 'markdown'].includes(format)) {
		throw error(400, 'Invalid format. Must be "json" or "markdown"');
	}

	// Export exercise
	let content: string;
	let filename: string;
	let mimeType: string;

	if (format === 'json') {
		content = exportExerciseToJSON(result.data, prettyPrint);
		filename = generateExportFilename(result.data, 'json');
		mimeType = 'application/json';
	} else {
		content = exportExerciseToMarkdown(result.data);
		filename = generateExportFilename(result.data, 'md');
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
