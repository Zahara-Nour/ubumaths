/**
 * API Endpoint: /api/messages/templates/favorites
 *
 * Manage user favorite templates
 *
 * GET - List user's favorite templates
 * POST - Add template to favorites
 * DELETE - Remove template from favorites (via query param)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uuidSchema, validateRequest } from '$lib/server/validation';

// GET - List favorites
export const GET: RequestHandler = async ({ locals }) => {
	const { supabase, user } = locals;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	const { data: favorites, error: dbError } = await supabase
		.from('user_favorite_templates')
		.select(
			`
			created_at,
			message_templates (
				id,
				title,
				description,
				subject_template,
				trigger_type,
				scope,
				is_active,
				classes:class_id (name)
			)
		`
		)
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (dbError) {
		console.error('Error fetching favorites:', dbError);
		return error(500, 'Erreur lors de la récupération des favoris');
	}

	// Format response
	const formattedFavorites = favorites?.map((f) => ({
		...f.message_templates,
		favorited_at: f.created_at,
		class_name: f.message_templates?.classes?.name || null
	}));

	return json({
		favorites: formattedFavorites || [],
		count: formattedFavorites?.length || 0
	});
};

// POST - Add to favorites
export const POST: RequestHandler = async ({ locals, request }) => {
	const { supabase, user } = locals;

	// ====================================================================
	// SECURITY: Authentication Check
	// ====================================================================
	if (!user) {
		return error(401, 'Non authentifié');
	}

	// ====================================================================
	// SECURITY: Input Validation
	// ====================================================================
	const body = await request.json();
	const validation = validateRequest(uuidSchema, body.template_id);

	if (!validation.success) {
		return error(400, validation.error);
	}

	const templateId = validation.data;

	// Check if template exists and user has access
	const { data: template, error: templateError } = await supabase
		.from('message_templates')
		.select('id')
		.eq('id', templateId)
		.single();

	if (templateError || !template) {
		return error(404, 'Template non trouvé');
	}

	// Add to favorites (duplicate will be ignored by unique constraint)
	const { error: insertError } = await supabase
		.from('user_favorite_templates')
		.insert({
			user_id: user.id,
			template_id: templateId
		})
		.select()
		.single();

	if (insertError) {
		// Check if already favorited
		if (insertError.code === '23505') {
			return json({ message: 'Template déjà dans les favoris', already_favorited: true });
		}

		console.error('Error adding favorite:', insertError);
		return error(500, "Erreur lors de l'ajout aux favoris");
	}

	// Log action
	await supabase.rpc('log_template_action', {
		p_template_id: templateId,
		p_action: 'favorited',
		p_performed_by: user.id
	});

	return json({ message: 'Template ajouté aux favoris', success: true }, { status: 201 });
};

// DELETE - Remove from favorites
export const DELETE: RequestHandler = async ({ locals, url }) => {
	const { supabase, user } = locals;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	const templateId = url.searchParams.get('template_id');

	if (!templateId) {
		return error(400, 'template_id requis');
	}

	const { error: deleteError } = await supabase
		.from('user_favorite_templates')
		.delete()
		.eq('user_id', user.id)
		.eq('template_id', templateId);

	if (deleteError) {
		console.error('Error removing favorite:', deleteError);
		return error(500, 'Erreur lors de la suppression du favori');
	}

	// Log action
	await supabase.rpc('log_template_action', {
		p_template_id: templateId,
		p_action: 'unfavorited',
		p_performed_by: user.id
	});

	return json({ message: 'Template retiré des favoris', success: true });
};
