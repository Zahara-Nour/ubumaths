/**
 * API Route: /api/teacher/chapter-templates/[id]
 * GET - Get a single chapter template
 * PATCH - Update a chapter template (metadata or content)
 * DELETE - Delete (archive) a chapter template
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	getChapterTemplate,
	updateChapterTemplate,
	deleteChapterTemplate
} from '$lib/server/chapter-templates';
import {
	updateChapterTemplateSchema,
	type UpdateChapterTemplateInput
} from '$lib/server/validation/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/teacher/chapter-templates/[id]
 * Retrieve a single chapter template by ID
 *
 * Access:
 * - Owner can view any of their templates
 * - Any teacher can view public published templates
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');

	// Validate template ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid template ID format');
	}

	const templateId = idValidation.data;

	// Fetch template
	const result = await getChapterTemplate(templateId, locals.supabase);

	if (result.error) {
		console.error('[GET /api/teacher/chapter-templates/[id]] Error:', result.error);
		throw error(500, 'Failed to fetch chapter template');
	}

	if (!result.data) {
		throw error(404, 'Template not found');
	}

	// Access control: owner or public published
	const template = result.data;
	const isOwner = template.createdBy === user.id;
	const isPublicPublished = template.isPublic && template.status === 'published';

	if (!isOwner && !isPublicPublished) {
		throw error(403, 'Access denied - template is private');
	}

	return json({ template });
};

/**
 * PATCH /api/teacher/chapter-templates/[id]
 * Update a chapter template
 *
 * Body (all optional):
 * - title: Template title
 * - description: Template description
 * - grades: Target grade levels
 * - color: Template color
 * - icon: Template icon
 * - contentSnapshot: New content (creates new version if changed)
 *
 * Notes:
 * - Only drafts can have content updated directly
 * - Published templates require version creation instead
 * - Only the owner can update
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
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

	const validation = updateChapterTemplateSchema.safeParse(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data: UpdateChapterTemplateInput = validation.data;

	// Update template
	const result = await updateChapterTemplate(templateId, data, user.id, locals.supabase);

	if (result.error) {
		console.error('[PATCH /api/teacher/chapter-templates/[id]] Error:', result.error);

		// Handle specific error messages
		if (result.error.message.includes('Cannot update content of published')) {
			throw error(400, result.error.message);
		}

		throw error(500, 'Failed to update chapter template');
	}

	return json({ template: result.data });
};

/**
 * DELETE /api/teacher/chapter-templates/[id]
 * Delete (archive) a chapter template
 *
 * Notes:
 * - Templates are soft-deleted (archived) to preserve instantiation history
 * - Only the owner can delete
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
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

	// Delete (archive) template
	const result = await deleteChapterTemplate(templateId, locals.supabase);

	if (result.error) {
		console.error('[DELETE /api/teacher/chapter-templates/[id]] Error:', result.error);
		throw error(500, 'Failed to delete chapter template');
	}

	return json({ success: true }, { status: 200 });
};
