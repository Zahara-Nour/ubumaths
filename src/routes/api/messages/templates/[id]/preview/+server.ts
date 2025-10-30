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
import { previewTemplateSchema } from '$lib/server/validation/message-templates';

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

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = previewTemplateSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { data: customData = {} } = validation.data;

	// Generate preview
	const preview = previewTemplate(template, customData);

	return json({
		preview,
		template_id: template.id,
		template_title: template.title
	});
};
