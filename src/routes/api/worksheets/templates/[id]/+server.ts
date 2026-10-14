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
 * Le style propre au gabarit — créé avec lui, au même identifiant (D10) — ou
 * `null` (gabarit rattaché à un autre style, ou d'avant le lot 3 sans style).
 */
function ownStyleId(template: { id: string; style_id: string | null }): string | null {
	return template.style_id === template.id ? template.style_id : null;
}

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
		.select('id, created_by, style_id')
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

	// Le style du gabarit porte son nom dans le menu de la fiche (D10)
	if (ownStyleId(existingTemplate) && (data.name !== undefined || data.description !== undefined)) {
		const styleUpdate: TablesUpdate<'worksheet_styles'> = {};
		if (data.name !== undefined) styleUpdate.name = data.name;
		if (data.description !== undefined) styleUpdate.description = data.description;
		const { data: styles, error: styleError } = await locals.supabase
			.from('worksheet_styles')
			.update(styleUpdate)
			.eq('id', existingTemplate.id)
			.select('id');
		// La RLS refuse en silence : zéro ligne, sans erreur
		if (styleError || (styles ?? []).length === 0) {
			logger.error('Failed to rename template style:', styleError ?? 'aucune ligne');
		}
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
		.select('id, created_by, name, style_id')
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

	// Une fiche qui désigne ce gabarit, ou son style (D10), perdrait sa mise en
	// page sans le dire : la suppression est refusée.
	const styleId = ownStyleId(existingTemplate);
	const { count: worksheetCount, error: countError } = await locals.supabase
		.from('worksheets')
		.select('id', { count: 'exact', head: true })
		.or(
			styleId ? `template_id.eq.${params.id},style_id.eq.${styleId}` : `template_id.eq.${params.id}`
		);

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

	// Supprimer le style emporte le gabarit (`on delete cascade`) ; la RLS refuse
	// en silence, d'où la relecture des lignes supprimées.
	const { data: deleted, error: dbError } = styleId
		? await locals.supabase.from('worksheet_styles').delete().eq('id', styleId).select('id')
		: await locals.supabase.from('worksheet_templates').delete().eq('id', params.id).select('id');

	if (dbError || (deleted ?? []).length === 0) {
		logger.error('Failed to delete template:', dbError ?? 'aucune ligne');
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
