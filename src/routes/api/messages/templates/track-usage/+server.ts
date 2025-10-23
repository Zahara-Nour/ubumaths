/**
 * API Endpoint: /api/messages/templates/track-usage
 *
 * Track template usage for analytics
 *
 * POST - Record template usage
 * Body: {
 *   template_id: string,
 *   completed: boolean,
 *   time_to_complete?: number,
 *   class_id?: string
 * }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { supabase, user } = locals;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// Parse body
	let body: {
		template_id: string;
		completed: boolean;
		time_to_complete?: number;
		class_id?: string;
	};

	try {
		body = await request.json();
	} catch {
		return error(400, 'Données invalides');
	}

	if (!body.template_id) {
		return error(400, 'template_id requis');
	}

	// Verify template exists
	const { data: template } = await supabase
		.from('message_templates')
		.select('id')
		.eq('id', body.template_id)
		.single();

	if (!template) {
		return error(404, 'Template non trouvé');
	}

	// Insert usage record
	const { error: insertError } = await supabase.from('template_usage_stats').insert({
		template_id: body.template_id,
		user_id: user.id,
		class_id: body.class_id || null,
		completed: body.completed,
		time_to_complete: body.time_to_complete || null
	});

	if (insertError) {
		console.error('Error tracking usage:', insertError);
		return error(500, "Erreur lors de l'enregistrement de l'utilisation");
	}

	// Log usage action
	await supabase.rpc('log_template_action', {
		p_template_id: body.template_id,
		p_action: 'used',
		p_performed_by: user.id,
		p_metadata: {
			completed: body.completed,
			time_to_complete: body.time_to_complete
		}
	});

	return json(
		{
			message: 'Utilisation enregistrée',
			success: true
		},
		{ status: 201 }
	);
};
