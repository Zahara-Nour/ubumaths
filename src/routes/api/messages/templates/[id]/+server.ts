/**
 * API Endpoint: /api/messages/templates/[id]
 *
 * Handles individual template operations.
 *
 * GET - Get template details
 * PATCH - Update template (admin/owner only)
 * DELETE - Delete template (admin/owner only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateTemplate } from '$lib/templates/templateEngine';

// =====================================================
// GET - Get template details
// =====================================================
export const GET: RequestHandler = async ({ locals, params }) => {
	const { supabase, user } = locals;
	const { id } = params;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	const { data: template, error: dbError } = await supabase
		.from('message_templates')
		.select(
			`
      *,
      classes:class_id (
        name
      ),
      creator:created_by (
        full_name
      )
    `
		)
		.eq('id', id)
		.single();

	if (dbError || !template) {
		return error(404, 'Template non trouvé');
	}

	// Format response
	const formattedTemplate = {
		...template,
		class_name: template.classes?.name || null,
		created_by_name: template.creator?.full_name || null
	};

	return json({ template: formattedTemplate });
};

// =====================================================
// PATCH - Update template
// =====================================================
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
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

	// Get existing template
	const { data: existingTemplate, error: fetchError } = await supabase
		.from('message_templates')
		.select('*')
		.eq('id', id)
		.single();

	if (fetchError || !existingTemplate) {
		return error(404, 'Template non trouvé');
	}

	// Check permissions
	const isAdmin = profile.role === 'admin';
	const isOwner = existingTemplate.created_by === user.id;
	const isSystemTemplate = existingTemplate.scope === 'system';

	// Teachers cannot modify system templates
	if (isSystemTemplate && !isAdmin) {
		return error(403, 'Vous ne pouvez pas modifier un template système');
	}

	// Non-admin, non-owner cannot modify
	if (!isAdmin && !isOwner) {
		return error(403, 'Vous ne pouvez modifier que vos propres templates');
	}

	// Parse update data
	let updates: Partial<typeof existingTemplate>;
	try {
		updates = await request.json();
	} catch {
		return error(400, 'Données invalides');
	}

	// Teachers cannot change scope to system
	if (updates.scope === 'system' && !isAdmin) {
		return error(403, 'Seuls les admins peuvent créer des templates système');
	}

	// Validate if content fields are being updated
	if (
		updates.title !== undefined ||
		updates.subject_template !== undefined ||
		updates.body_template !== undefined
	) {
		const validation = validateTemplate({
			title: updates.title || existingTemplate.title,
			subject_template: updates.subject_template || existingTemplate.subject_template,
			body_template: updates.body_template || existingTemplate.body_template,
			trigger_type: updates.trigger_type || existingTemplate.trigger_type
		});

		if (!validation.valid) {
			return json(
				{
					error: 'Validation échouée',
					errors: validation.errors
				},
				{ status: 400 }
			);
		}
	}

	// Validate scope and class_id consistency if being updated
	if (updates.scope !== undefined || updates.class_id !== undefined) {
		const newScope = updates.scope || existingTemplate.scope;
		const newClassId =
			updates.class_id !== undefined ? updates.class_id : existingTemplate.class_id;

		if (newScope === 'system' && newClassId) {
			return error(400, 'Un template système ne peut pas avoir de class_id');
		}

		if (newScope === 'class' && !newClassId) {
			return error(400, 'Un template de classe doit avoir un class_id');
		}

		// Verify teacher owns the class if changing class_id
		if (profile.role === 'teacher' && newScope === 'class') {
			const { data: classData } = await supabase
				.from('classes')
				.select('teacher_id')
				.eq('id', newClassId!)
				.single();

			if (!classData || classData.teacher_id !== user.id) {
				return error(403, 'Vous ne pouvez utiliser que vos propres classes');
			}
		}
	}

	// Prevent changing created_by
	delete (updates as any).created_by;
	delete (updates as any).created_at;

	// Update template
	const { data: updatedTemplate, error: updateError } = await supabase
		.from('message_templates')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (updateError) {
		console.error('Error updating template:', updateError);
		return error(500, 'Erreur lors de la mise à jour du template');
	}

	return json({
		template: updatedTemplate,
		message: 'Template mis à jour avec succès'
	});
};

// =====================================================
// DELETE - Delete template
// =====================================================
export const DELETE: RequestHandler = async ({ locals, params }) => {
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

	// Get existing template
	const { data: existingTemplate, error: fetchError } = await supabase
		.from('message_templates')
		.select('*')
		.eq('id', id)
		.single();

	if (fetchError || !existingTemplate) {
		return error(404, 'Template non trouvé');
	}

	// Check permissions
	const isAdmin = profile.role === 'admin';
	const isOwner = existingTemplate.created_by === user.id;
	const isSystemTemplate = existingTemplate.scope === 'system';

	// Teachers cannot delete system templates
	if (isSystemTemplate && !isAdmin) {
		return error(403, 'Vous ne pouvez pas supprimer un template système');
	}

	// Non-admin, non-owner cannot delete
	if (!isAdmin && !isOwner) {
		return error(403, 'Vous ne pouvez supprimer que vos propres templates');
	}

	// Delete template
	const { error: deleteError } = await supabase.from('message_templates').delete().eq('id', id);

	if (deleteError) {
		console.error('Error deleting template:', deleteError);
		return error(500, 'Erreur lors de la suppression du template');
	}

	return json({
		message: 'Template supprimé avec succès'
	});
};
