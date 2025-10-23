/**
 * API Endpoint: /api/messages/templates/[id]/preview
 *
 * Generates a preview of a template with provided data.
 * Useful for testing templates before sending messages.
 *
 * POST - Generate preview
 * Body: { data: Record<string, string | number> }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { previewTemplate } from '$lib/templates/templateEngine';

// =====================================================
// POST - Generate preview
// =====================================================
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { supabase, user } = locals;
	const { id } = params;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// Get template
	const { data: template, error: dbError } = await supabase
		.from('message_templates')
		.select('*')
		.eq('id', id)
		.single();

	if (dbError || !template) {
		return error(404, 'Template non trouvé');
	}

	// Parse request body
	let customData: Record<string, string | number> = {};
	try {
		const body = await request.json();
		customData = body.data || {};
	} catch {
		// If no data provided, use example data
	}

	// Generate preview
	const preview = previewTemplate(template, customData);

	return json({
		preview,
		template_id: template.id,
		template_title: template.title
	});
};
