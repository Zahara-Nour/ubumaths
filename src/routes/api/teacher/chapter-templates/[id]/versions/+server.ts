/**
 * API Route: /api/teacher/chapter-templates/[id]/versions
 * GET - List all versions of a template
 * POST - Create a new version of a template
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	getChapterTemplate,
	getTemplateVersions,
	createTemplateVersion
} from '$lib/server/chapter-templates';
import { updateTemplateContentSchema } from '$lib/server/validation/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/teacher/chapter-templates/[id]/versions
 * List all versions of a template
 *
 * Access:
 * - Owner can view all versions
 * - Any teacher can view versions of public published templates
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate template ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid template ID format');
	}

	const templateId = idValidation.data;

	// Verify access
	const { data: template } = await getChapterTemplate(templateId, locals.supabase);
	if (!template) {
		throw error(404, 'Template not found');
	}

	const isOwner = template.createdBy === user.id;
	const isPublicPublished = template.isPublic && template.status === 'published';

	if (!isOwner && !isPublicPublished) {
		throw error(403, 'Access denied - template is private');
	}

	// Fetch versions
	const result = await getTemplateVersions(templateId, locals.supabase);

	if (result.error) {
		console.error('[GET /api/teacher/chapter-templates/[id]/versions] Error:', result.error);
		throw error(500, 'Failed to fetch template versions');
	}

	return json({
		versions: result.data,
		count: result.count
	});
};

/**
 * POST /api/teacher/chapter-templates/[id]/versions
 * Create a new version of a template
 *
 * Body:
 * - contentSnapshot: New content snapshot (required)
 * - changeSummary: Optional summary of changes (optional)
 *
 * Notes:
 * - Creates a new version and updates the template's current_version
 * - Automatically computes diff from previous version
 * - Only the owner can create versions
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate template ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid template ID format');
	}

	const templateId = idValidation.data;

	// Verify ownership
	const { data: existing } = await getChapterTemplate(templateId, locals.supabase);
	if (!existing) {
		throw error(404, 'Template not found');
	}

	if (existing.createdBy !== user.id) {
		throw error(403, 'Forbidden - not the template owner');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = updateTemplateContentSchema.safeParse({
		templateId,
		...((body as Record<string, unknown>) ?? {})
	});

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const { contentSnapshot, changeSummary } = validation.data;

	// Create new version
	const result = await createTemplateVersion(
		templateId,
		contentSnapshot,
		changeSummary ?? null,
		user.id,
		locals.supabase
	);

	if (result.error) {
		console.error('[POST /api/teacher/chapter-templates/[id]/versions] Error:', result.error);
		throw error(500, 'Failed to create template version');
	}

	return json({ version: result.data }, { status: 201 });
};
