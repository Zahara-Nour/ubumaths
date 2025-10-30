/**
 * API Endpoint: /api/messages/templates/[id]/duplicate
 *
 * Duplicate an existing template
 *
 * POST - Create a copy of the template
 * Body: { new_title?: string, class_id?: string }
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { duplicateTemplateSchema } from '$lib/server/validation/message-templates';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { supabase, user } = locals;
	const { id } = params;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// Get user profile
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile) {
		return error(404, 'Profil non trouvé');
	}

	// Only teachers and admins can duplicate
	if (profile.role !== 'admin' && profile.role !== 'teacher') {
		return error(403, 'Permissions insuffisantes');
	}

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = duplicateTemplateSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { new_title, class_id } = validation.data;

	// Call duplicate function
	const { data: newTemplateId, error: dupError } = await supabase.rpc('duplicate_template', {
		p_template_id: id,
		p_user_id: user.id,
		p_new_title: new_title || null
	});

	if (dupError) {
		console.error('Error duplicating template:', dupError);
		return error(500, dupError.message || 'Erreur lors de la duplication');
	}

	// If class_id provided, update the duplicate
	if (class_id) {
		// Verify user owns the class
		const { data: classData } = await supabase
			.from('classes')
			.select('teacher_id')
			.eq('id', class_id)
			.single();

		if (classData && classData.teacher_id === user.id) {
			await supabase
				.from('message_templates')
				.update({ class_id: class_id })
				.eq('id', newTemplateId);
		}
	}

	// Fetch the new template
	const { data: newTemplate, error: fetchError } = await supabase
		.from('message_templates')
		.select('*')
		.eq('id', newTemplateId)
		.single();

	if (fetchError) {
		console.error('Error fetching new template:', fetchError);
		return error(500, 'Template dupliqué mais erreur lors de la récupération');
	}

	return json(
		{
			template: newTemplate,
			message: 'Template dupliqué avec succès'
		},
		{ status: 201 }
	);
};
