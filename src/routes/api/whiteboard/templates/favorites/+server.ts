/**
 * Whiteboard Template Favorites Endpoint
 * ======================================
 *
 * Endpoint: GET/POST/DELETE /api/whiteboard/templates/favorites
 * Purpose: Manage user's favorite templates
 *
 * Features:
 * - GET: List all favorite template IDs for the current user
 * - POST: Add a template to favorites
 * - DELETE: Remove a template from favorites
 *
 * Security:
 * - All operations require authentication
 * - Users can only manage their own favorites (enforced by RLS)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { templateFavoriteSchema } from '$lib/server/validation/whiteboard-templates';

/**
 * List user's favorite template IDs
 *
 * GET /api/whiteboard/templates/favorites
 */
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireAuth(locals);

	try {
		const { data, error: dbError } = await locals.supabase
			.from('user_whiteboard_template_favorites')
			.select('template_id, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (dbError) {
			console.error('[Template Favorites] Query error:', dbError);
			throw error(500, 'Erreur lors de la recuperation des favoris');
		}

		const favorites = (data ?? []).map((f) => ({
			templateId: f.template_id as string,
			createdAt: f.created_at as string
		}));

		return json({ favorites });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[Template Favorites] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};

/**
 * Add a template to favorites
 *
 * POST /api/whiteboard/templates/favorites
 * Body: { templateId: string }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const validation = templateFavoriteSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { templateId } = validation.data;

	try {
		// Verify the template exists
		const { data: template, error: templateError } = await locals.supabase
			.from('whiteboard_templates')
			.select('id')
			.eq('id', templateId)
			.eq('is_public', true)
			.single();

		if (templateError || !template) {
			throw error(404, 'Template non trouve');
		}

		// Insert favorite (upsert to handle duplicates gracefully)
		const { error: insertError } = await locals.supabase
			.from('user_whiteboard_template_favorites')
			.upsert(
				{
					user_id: user.id,
					template_id: templateId
				},
				{
					onConflict: 'user_id,template_id'
				}
			);

		if (insertError) {
			console.error('[Template Favorites] Insert error:', insertError);
			throw error(500, "Erreur lors de l'ajout aux favoris");
		}

		return json({ success: true, templateId });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[Template Favorites] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};

/**
 * Remove a template from favorites
 *
 * DELETE /api/whiteboard/templates/favorites?template_id=xxx
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);

	const templateId = url.searchParams.get('template_id');
	if (!templateId) {
		throw error(400, 'template_id requis');
	}

	// Validate UUID format
	const validation = templateFavoriteSchema.safeParse({ templateId });
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	try {
		const { error: deleteError } = await locals.supabase
			.from('user_whiteboard_template_favorites')
			.delete()
			.eq('user_id', user.id)
			.eq('template_id', templateId);

		if (deleteError) {
			console.error('[Template Favorites] Delete error:', deleteError);
			throw error(500, 'Erreur lors de la suppression du favori');
		}

		return json({ success: true, templateId });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('[Template Favorites] Error:', err);
		throw error(500, 'Une erreur interne est survenue');
	}
};
