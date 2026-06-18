/**
 * API Route: /api/teacher/chapter-templates/[id]/publish
 * POST - Publish a chapter template
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getChapterTemplate, publishTemplate } from '$lib/server/chapter-templates';
import { uuidSchema } from '$lib/server/validation/common';

/**
 * POST /api/teacher/chapter-templates/[id]/publish
 * Publish a draft template
 *
 * Notes:
 * - Only drafts can be published
 * - Template must have content (at least one document, quiz, checklist, or exercise)
 * - Published templates cannot be edited directly (use versions instead)
 * - Only the owner can publish
 */
export const POST: RequestHandler = async ({ locals, params }) => {
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

	// Check if already published or archived
	if (existing.status === 'published') {
		throw error(400, 'Template is already published');
	}

	if (existing.status === 'archived') {
		throw error(400, 'Cannot publish archived template');
	}

	// Publish template
	const result = await publishTemplate(templateId, locals.supabase);

	if (result.error) {
		console.error('[POST /api/teacher/chapter-templates/[id]/publish] Error:', result.error);

		// Handle specific error messages
		if (result.error.message.includes('Cannot publish empty template')) {
			throw error(400, result.error.message);
		}

		throw error(500, 'Failed to publish template');
	}

	return json({ template: result.data }, { status: 200 });
};
