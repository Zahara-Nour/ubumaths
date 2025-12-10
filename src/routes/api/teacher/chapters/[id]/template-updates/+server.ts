/**
 * API Route: /api/teacher/chapters/[id]/template-updates
 * GET - Check if a chapter's template has updates available
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { checkForTemplateUpdates, getMigrationPreview } from '$lib/server/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * GET /api/teacher/chapters/[id]/template-updates
 * Check if a chapter's source template has updates available
 *
 * Returns:
 * - hasUpdate: Whether updates are available
 * - currentVersion: Chapter's current template version
 * - latestVersion: Latest template version (if update available)
 * - migrationPreview: Preview of changes (if update available and requested)
 *
 * Query Parameters:
 * - preview: Include migration preview (true/false, default: false)
 *
 * Notes:
 * - Only works for chapters instantiated from templates
 * - Returns 400 if chapter is not linked to a template
 * - Only the chapter owner can check for updates
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate chapter ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid chapter ID format');
	}

	const chapterId = idValidation.data;

	// Verify chapter ownership
	const { data: chapter, error: chapterError } = await locals.supabase
		.from('class_chapters')
		.select('teacher_id')
		.eq('id', chapterId)
		.single();

	if (chapterError || !chapter) {
		throw error(404, 'Chapter not found');
	}

	if (chapter.teacher_id !== user.id) {
		throw error(403, 'Forbidden - not the chapter owner');
	}

	// Check if chapter is linked to a template
	const { data: instantiation } = await locals.supabase
		.from('chapter_template_instantiations')
		.select('id')
		.eq('chapter_id', chapterId)
		.maybeSingle();

	if (!instantiation) {
		throw error(400, 'Chapter is not linked to a template');
	}

	// Check for updates
	const result = await checkForTemplateUpdates(chapterId, locals.supabase);

	if (result.error) {
		console.error('[GET /api/teacher/chapters/[id]/template-updates] Error:', result.error);
		throw error(500, 'Failed to check for template updates');
	}

	const { hasUpdate, latestVersion } = result.data!;

	// Get current version from instantiation
	const { data: instData } = await locals.supabase
		.from('chapter_template_instantiations')
		.select('template_version, current_template_version')
		.eq('chapter_id', chapterId)
		.single();

	const currentVersion = instData?.current_template_version ?? instData?.template_version ?? null;

	// Optionally include migration preview
	const includePreview = url.searchParams.get('preview') === 'true';
	let migrationPreview = null;

	if (includePreview && hasUpdate) {
		const previewResult = await getMigrationPreview(chapterId, undefined, locals.supabase);

		if (!previewResult.error && previewResult.data) {
			migrationPreview = previewResult.data;
		}
	}

	return json({
		hasUpdate,
		currentVersion,
		latestVersion,
		migrationPreview
	});
};
