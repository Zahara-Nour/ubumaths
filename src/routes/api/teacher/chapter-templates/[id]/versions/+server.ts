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
 * - Owner only (no inter-teacher sharing)
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
	const { data: template, error: templateError } = await getChapterTemplate(
		templateId,
		locals.supabase
	);

	// Le helper rend `{ data, error }` : sans cette garde, une panne de lecture
	// se présentait comme un modèle inexistant (404).
	if (templateError) {
		console.error('Modèle illisible :', templateError);
		throw error(500, 'Impossible de vérifier le modèle');
	}
	if (!template) {
		throw error(404, 'Template not found');
	}

	if (template.createdBy !== user.id) {
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
	const { data: existing, error: existingError } = await getChapterTemplate(
		templateId,
		locals.supabase
	);

	// Le helper rend `{ data, error }` : sans cette garde, une panne de lecture
	// se présentait comme un modèle inexistant (404).
	if (existingError) {
		console.error('Modèle illisible :', existingError);
		throw error(500, 'Impossible de vérifier le modèle');
	}
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
