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
import { validateUuidParam } from '$lib/server/validation/params';
import { toMessageTemplate } from '$lib/types/messageTemplates';

// =====================================================
// POST - Generate preview
// =====================================================
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { supabase, user, profile } = locals;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// SECURITY (finding M11): message templates are a teacher/admin tool — every
	// sibling route gates on role; this one only checked `!user`.
	if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
		return error(403, 'Réservé aux enseignants');
	}

	// SECURITY (finding M11): validate the id as a UUID (was passed straight into
	// .eq('id', id), yielding raw 22P02 errors on malformed input).
	const id = validateUuidParam(params.id);

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
	// `trigger_type` et `scope` sont du texte, `trigger_config` et `variables` du
	// jsonb : la ligne est convertie plutôt qu'affirmée.
	const preview = previewTemplate(toMessageTemplate(template), customData);

	return json({
		preview,
		template_id: template.id,
		template_title: template.title
	});
};
