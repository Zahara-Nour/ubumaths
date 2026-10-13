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
import type { TablesUpdate } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/worksheets/templates/[id]/+server');

type ZodIssue = { path: (string | number)[]; message: string };

/**
 * GET /api/worksheets/templates/[id]
 * Get template details
 * Teachers and admins only (can view their own templates)
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate ID parameter
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'Identifiant de modèle invalide');
	}

	// Fetch template
	const { data: template, error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError) {
		if (dbError.code === 'PGRST116') {
			throw error(404, 'Modèle de fiche introuvable');
		}
		logger.error('Failed to fetch template:', dbError);
		throw error(500, 'Impossible de charger le modèle de fiche');
	}

	// Check access: must be owned by user (no inter-teacher sharing)
	if (template.created_by !== user.id) {
		throw error(403, 'Accès refusé à ce modèle de fiche');
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
		throw error(400, 'Identifiant de modèle invalide');
	}

	// First check if template exists and user has permission
	const { data: existingTemplate, error: fetchError } = await locals.supabase
		.from('worksheet_templates')
		.select('id, created_by')
		.eq('id', params.id)
		.single();

	if (fetchError) {
		if (fetchError.code === 'PGRST116') {
			throw error(404, 'Modèle de fiche introuvable');
		}
		logger.error('Failed to fetch template:', fetchError);
		throw error(500, 'Impossible de charger le modèle de fiche');
	}

	// Check ownership (admins can update any template)
	if (existingTemplate.created_by !== user.id && profile.role !== 'admin') {
		throw error(403, 'Seul l’auteur du modèle peut le modifier');
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête JSON invalide');
	}

	const validation = validateUpdateTemplate(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${(e as ZodIssue).message}`)
			.join('; ');
		throw error(400, `Données invalides : ${errorMsg}`);
	}

	const data = validation.data;

	// Build update object (only include fields that were provided)
	const updateData: TablesUpdate<'worksheet_templates'> = {};
	if (data.name !== undefined) updateData.name = data.name;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.template_content !== undefined) updateData.template_content = data.template_content;
	if (data.placeholders !== undefined) updateData.placeholders = data.placeholders;

	// Update template
	const { data: template, error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.update(updateData)
		.eq('id', params.id)
		.select()
		.single();

	if (dbError) {
		logger.error('Failed to update template:', dbError);
		throw error(500, 'Impossible de modifier le modèle de fiche');
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
		throw error(400, 'Identifiant de modèle invalide');
	}

	// First check if template exists and user has permission
	const { data: existingTemplate, error: fetchError } = await locals.supabase
		.from('worksheet_templates')
		.select('id, created_by, name')
		.eq('id', params.id)
		.single();

	if (fetchError) {
		if (fetchError.code === 'PGRST116') {
			throw error(404, 'Modèle de fiche introuvable');
		}
		logger.error('Failed to fetch template:', fetchError);
		throw error(500, 'Impossible de charger le modèle de fiche');
	}

	// Check ownership (admins can delete any template)
	if (existingTemplate.created_by !== user.id && profile.role !== 'admin') {
		throw error(403, 'Seul l’auteur du modèle peut le supprimer');
	}

	// Check if template is in use by any worksheets
	const { count: worksheetCount, error: countError } = await locals.supabase
		.from('worksheets')
		.select('id', { count: 'exact', head: true })
		.eq('template_id', params.id);

	if (countError) {
		logger.error('Failed to check template usage:', countError);
		throw error(500, 'Impossible de vérifier l’usage du modèle');
	}

	if (worksheetCount && worksheetCount > 0) {
		throw error(
			400,
			`Impossible de supprimer ce modèle : des fiches l’utilisent (${worksheetCount}). Retirer d’abord le modèle de ces fiches.`
		);
	}

	// Delete template
	const { error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.delete()
		.eq('id', params.id);

	if (dbError) {
		logger.error('Failed to delete template:', dbError);
		throw error(500, 'Impossible de supprimer le modèle de fiche');
	}

	// Validate response
	const validated = validateJsonResponse(
		deleteTemplateResponseSchema,
		{
			success: true as const,
			message: `Modèle « ${existingTemplate.name} » supprimé`
		},
		'DELETE /api/worksheets/templates/[id]'
	);

	return json(validated);
};
