/**
 * API Route: /api/teacher/chapter-templates/[id]/instantiate
 * POST - Instantiate a template into a chapter
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getChapterTemplate, instantiateTemplate } from '$lib/server/chapter-templates';
import { instantiateTemplateSchema } from '$lib/server/validation/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * POST /api/teacher/chapter-templates/[id]/instantiate
 * Create a new chapter from a template
 *
 * Body:
 * - classId: Target class ID (required)
 * - title: Chapter title (optional, defaults to template title)
 * - isVisible: Whether chapter is visible to students (default: false)
 *
 * Access:
 * - Template must be accessible (owned or public published)
 * - User must have access to the target class
 *
 * Returns:
 * - chapterId: ID of the created chapter
 * - instantiation: Instantiation record linking template to chapter
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate template ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid template ID format');
	}

	const templateId = idValidation.data;

	// Verify template access
	const { data: template } = await getChapterTemplate(templateId, locals.supabase);
	if (!template) {
		throw error(404, 'Template not found');
	}

	const isOwner = template.createdBy === user.id;
	const isPublicPublished = template.isPublic && template.status === 'published';

	if (!isOwner && !isPublicPublished) {
		throw error(403, 'Access denied - template is private');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = instantiateTemplateSchema.safeParse({
		templateId,
		...((body as Record<string, unknown>) ?? {})
	});

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Verify teacher owns the class
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('teacher_id')
		.eq('id', data.classId)
		.single();

	if (classError || !classData) {
		throw error(404, 'Class not found');
	}

	if (classData.teacher_id !== user.id) {
		throw error(403, 'Forbidden - not your class');
	}

	// Instantiate template
	const result = await instantiateTemplate(data, user.id, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapter-templates/[id]/instantiate] Error:', result.error);
		throw error(500, 'Failed to instantiate template');
	}

	return json(
		{
			chapterId: result.data!.chapterId,
			instantiation: result.data!.instantiation
		},
		{ status: 201 }
	);
};
