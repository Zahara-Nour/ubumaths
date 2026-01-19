/**
 * Whiteboard Template by ID Endpoint
 * ====================================
 *
 * Endpoint: GET/DELETE /api/whiteboard/templates/[id]
 * Purpose: Get or delete a specific whiteboard template
 *
 * Features:
 * - GET: Fetch template details
 * - DELETE: Remove template (owner or admin only, system templates protected)
 *
 * Security:
 * - GET: Any authenticated user
 * - DELETE: Template owner or Admin (system templates cannot be deleted)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireRoles } from '$lib/server/middleware/auth';
import { templateIdParamSchema } from '$lib/server/validation/whiteboard-templates';
import { rowToTemplate, type WhiteboardTemplateRow } from '$lib/whiteboard/types/templates';

/**
 * Get a single whiteboard template by ID
 *
 * GET /api/whiteboard/templates/[id]
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Require authentication (any role)
	await requireAuth(locals);

	// Validate UUID parameter
	const paramValidation = templateIdParamSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, 'ID de template invalide');
	}

	const { id } = paramValidation.data;

	try {
		const { data: row, error: dbError } = await locals.supabase
			.from('whiteboard_templates')
			.select('*')
			.eq('id', id)
			.eq('is_public', true)
			.single();

		if (dbError) {
			if (dbError.code === 'PGRST116') {
				throw error(404, 'Template non trouve');
			}
			console.error('[Whiteboard Template] Query error:', dbError);
			throw error(500, 'Erreur lors de la recuperation du template');
		}

		const template = rowToTemplate(row as WhiteboardTemplateRow);

		return json({ template });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Whiteboard Template] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};

/**
 * Delete a whiteboard template
 *
 * DELETE /api/whiteboard/templates/[id]
 *
 * Rules:
 * - System templates cannot be deleted
 * - Admins can delete any non-system template
 * - Teachers can only delete their own templates
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Require teacher or admin role
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate UUID parameter
	const paramValidation = templateIdParamSchema.safeParse(params);
	if (!paramValidation.success) {
		throw error(400, 'ID de template invalide');
	}

	const { id } = paramValidation.data;

	try {
		// First, fetch the template to check permissions
		const { data: existing, error: fetchError } = await locals.supabase
			.from('whiteboard_templates')
			.select('id, created_by, is_system')
			.eq('id', id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				throw error(404, 'Template non trouve');
			}
			console.error('[Whiteboard Template] Fetch error:', fetchError);
			throw error(500, 'Erreur lors de la verification du template');
		}

		// Check if system template
		if (existing.is_system) {
			throw error(403, 'Les templates systeme ne peuvent pas etre supprimes');
		}

		// Check ownership (admins can delete any non-system template)
		if (profile.role !== 'admin' && existing.created_by !== user.id) {
			throw error(403, 'Vous ne pouvez supprimer que vos propres templates');
		}

		// Delete the template
		const { error: deleteError } = await locals.supabase
			.from('whiteboard_templates')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('[Whiteboard Template] Delete error:', deleteError);
			throw error(500, 'Erreur lors de la suppression du template');
		}

		return json({ success: true });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[Whiteboard Template] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};
