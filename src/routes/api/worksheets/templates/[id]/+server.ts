/**
 * API Route: /api/worksheets/templates/[id]
 * GET - Get template details
 * PUT - Update template
 * DELETE - Delete template
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateUpdateTemplate,
	templateResponseSchema,
	deleteTemplateResponseSchema
} from '$lib/server/validation/worksheets';
import { uuidSchema } from '$lib/server/validation/common';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/worksheets/templates/[id]
 * Get template details
 * Teachers and admins only (can view public templates or their own)
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate ID parameter
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid template ID');
	}

	// Fetch template
	const { data: template, error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError) {
		if (dbError.code === 'PGRST116') {
			throw error(404, 'Template not found');
		}
		console.error('Failed to fetch template:', dbError);
		throw error(500, 'Failed to fetch template');
	}

	// Check access: must be public or owned by user
	if (!template.is_public && template.created_by !== user.id) {
		throw error(403, 'Access denied to this template');
	}

	// Validate response
	const validated = validateJsonResponse(
		templateResponseSchema,
		template,
		'GET /api/worksheets/templates/[id]'
	);

	return json(validated);
};

/**
 * PUT /api/worksheets/templates/[id]
 * Update template
 * Teachers and admins only (can only update their own templates)
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate ID parameter
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid template ID');
	}

	// First check if template exists and user has permission
	const { data: existingTemplate, error: fetchError } = await locals.supabase
		.from('worksheet_templates')
		.select('id, created_by')
		.eq('id', params.id)
		.single();

	if (fetchError) {
		if (fetchError.code === 'PGRST116') {
			throw error(404, 'Template not found');
		}
		console.error('Failed to fetch template:', fetchError);
		throw error(500, 'Failed to fetch template');
	}

	// Check ownership (admins can update any template)
	if (existingTemplate.created_by !== user.id && profile.role !== 'admin') {
		throw error(403, 'You can only update your own templates');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = validateUpdateTemplate(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data;

	// Build update object (only include fields that were provided)
	const updateData: Record<string, unknown> = {};
	if (data.name !== undefined) updateData.name = data.name;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.template_content !== undefined) updateData.template_content = data.template_content;
	if (data.placeholders !== undefined) updateData.placeholders = data.placeholders;
	if (data.is_public !== undefined) updateData.is_public = data.is_public;

	// Update template
	const { data: template, error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.update(updateData)
		.eq('id', params.id)
		.select()
		.single();

	if (dbError) {
		console.error('Failed to update template:', dbError);
		throw error(500, 'Failed to update template');
	}

	// Validate response
	const validated = validateJsonResponse(
		templateResponseSchema,
		template,
		'PUT /api/worksheets/templates/[id]'
	);

	return json(validated);
};

/**
 * DELETE /api/worksheets/templates/[id]
 * Delete template
 * Teachers and admins only (can only delete their own templates)
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate ID parameter
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Invalid template ID');
	}

	// First check if template exists and user has permission
	const { data: existingTemplate, error: fetchError } = await locals.supabase
		.from('worksheet_templates')
		.select('id, created_by, name')
		.eq('id', params.id)
		.single();

	if (fetchError) {
		if (fetchError.code === 'PGRST116') {
			throw error(404, 'Template not found');
		}
		console.error('Failed to fetch template:', fetchError);
		throw error(500, 'Failed to fetch template');
	}

	// Check ownership (admins can delete any template)
	if (existingTemplate.created_by !== user.id && profile.role !== 'admin') {
		throw error(403, 'You can only delete your own templates');
	}

	// Check if template is in use by any worksheets
	const { count: worksheetCount, error: countError } = await locals.supabase
		.from('worksheets')
		.select('id', { count: 'exact', head: true })
		.eq('template_id', params.id);

	if (countError) {
		console.error('Failed to check template usage:', countError);
		throw error(500, 'Failed to check template usage');
	}

	if (worksheetCount && worksheetCount > 0) {
		throw error(
			400,
			`Cannot delete template: it is used by ${worksheetCount} worksheet(s). Remove the template from those worksheets first.`
		);
	}

	// Delete template
	const { error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.delete()
		.eq('id', params.id);

	if (dbError) {
		console.error('Failed to delete template:', dbError);
		throw error(500, 'Failed to delete template');
	}

	// Validate response
	const validated = validateJsonResponse(
		deleteTemplateResponseSchema,
		{
			success: true as const,
			message: `Template "${existingTemplate.name}" deleted successfully`
		},
		'DELETE /api/worksheets/templates/[id]'
	);

	return json(validated);
};
