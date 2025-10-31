/**
 * API Endpoint: /api/messages/templates/match
 *
 * Finds the most appropriate template for a given context.
 * Prefers class-specific templates over system templates.
 *
 * GET - Find matching template
 * Query params:
 *   - trigger_type: Type of trigger (required)
 *   - class_id: Class context (optional)
 *   - entity_id: Related entity ID (optional)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TriggerType } from '$lib/types/messageTemplates';

// =====================================================
// GET - Find matching template
// =====================================================
export const GET: RequestHandler = async ({ locals, url }) => {
	const { supabase, user } = locals;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// Parse query parameters
	const triggerType = url.searchParams.get('trigger_type') as TriggerType;
	const classId = url.searchParams.get('class_id');
	const _entityId = url.searchParams.get('entity_id'); // For future use

	if (!triggerType) {
		return error(400, 'trigger_type est requis');
	}

	// Validate trigger type
	const validTriggers = [
		'assessment_question',
		'srs_help',
		'system_notification',
		'enigma_answer',
		'general'
	];
	if (!validTriggers.includes(triggerType)) {
		return error(400, 'trigger_type invalide');
	}

	// Get user's class IDs if not provided
	let userClassIds: string[] = [];
	if (!classId) {
		const { data: classMembers } = await supabase
			.from('class_members')
			.select('class_id')
			.eq('student_id', user.id);

		userClassIds = classMembers?.map((cm) => (cm as { class_id: string }).class_id) || [];
	} else {
		userClassIds = [classId];
	}

	// Try to find a class-specific template first
	if (userClassIds.length > 0) {
		const { data: classTemplate, error: classError } = await supabase
			.from('message_templates')
			.select(
				`
        *,
        classes:class_id (
          name
        )
      `
			)
			.eq('trigger_type', triggerType)
			.eq('scope', 'class')
			.in('class_id', userClassIds)
			.eq('is_active', true)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (!classError && classTemplate) {
			return json({
				template: {
					...classTemplate,
					class_name: classTemplate.classes?.name || null
				},
				match_type: 'class',
				message: 'Template de classe trouvé'
			});
		}
	}

	// Fall back to system template
	const { data: systemTemplate, error: systemError } = await supabase
		.from('message_templates')
		.select('*')
		.eq('trigger_type', triggerType)
		.eq('scope', 'system')
		.eq('is_active', true)
		.order('created_at', { ascending: false })
		.limit(1)
		.single();

	if (systemError || !systemTemplate) {
		return json(
			{
				template: null,
				match_type: 'none',
				message: 'Aucun template trouvé pour ce contexte'
			},
			{ status: 404 }
		);
	}

	return json({
		template: systemTemplate,
		match_type: 'system',
		message: 'Template système trouvé'
	});
};
