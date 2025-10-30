/**
 * API Endpoint: /api/messages/templates/[id]/versions
 *
 * Get version history for a template
 *
 * GET - List all versions
 * POST - Restore a specific version
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { templateVersionSchema } from '$lib/server/validation/message-templates';

// GET - List versions
export const GET: RequestHandler = async ({ locals, params }) => {
	const { supabase, user } = locals;
	const { id } = params;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// Check access to template
	const { data: template } = await supabase
		.from('message_templates')
		.select('created_by, scope')
		.eq('id', id)
		.single();

	if (!template) {
		return error(404, 'Template non trouvé');
	}

	// Get user profile
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	// Check permissions
	const isAdmin = profile?.role === 'admin';
	const isOwner = template.created_by === user.id;

	if (!isAdmin && !isOwner) {
		return error(403, 'Permissions insuffisantes');
	}

	// Fetch versions
	const { data: versions, error: fetchError } = await supabase
		.from('message_template_versions')
		.select(
			`
      *,
      modifier:modified_by (
        full_name
      )
    `
		)
		.eq('template_id', id)
		.order('version_number', { ascending: false });

	if (fetchError) {
		console.error('Error fetching versions:', fetchError);
		return error(500, 'Erreur lors de la récupération des versions');
	}

	// Format response
	const formattedVersions = versions?.map((v) => ({
		...v,
		modified_by_name: v.modifier?.full_name || 'Inconnu'
	}));

	return json({
		versions: formattedVersions || [],
		count: formattedVersions?.length || 0
	});
};

// POST - Restore version
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { supabase, user } = locals;
	const { id } = params;

	if (!user) {
		return error(401, 'Non authentifié');
	}

	// ✅ SECURITY: Validate request body with Zod
	const validation = templateVersionSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const body = validation.data;

	// Check template ownership
	const { data: template } = await supabase
		.from('message_templates')
		.select('created_by')
		.eq('id', id)
		.single();

	if (!template) {
		return error(404, 'Template non trouvé');
	}

	// Get user profile
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	const isAdmin = profile?.role === 'admin';
	const isOwner = template.created_by === user.id;

	if (!isAdmin && !isOwner) {
		return error(403, 'Permissions insuffisantes');
	}

	// Get the version to restore
	const { data: version, error: versionError } = await supabase
		.from('message_template_versions')
		.select('*')
		.eq('template_id', id)
		.eq('version_number', body.version_number)
		.single();

	if (versionError || !version) {
		return error(404, 'Version non trouvée');
	}

	// Restore the version (this will trigger version save via trigger)
	const { data: restored, error: restoreError } = await supabase
		.from('message_templates')
		.update({
			title: version.title,
			description: version.description,
			subject_template: version.subject_template,
			body_template: version.body_template,
			trigger_type: version.trigger_type,
			scope: version.scope,
			variables: version.variables,
			tags: version.tags
		})
		.eq('id', id)
		.select()
		.single();

	if (restoreError) {
		console.error('Error restoring version:', restoreError);
		return error(500, 'Erreur lors de la restauration de la version');
	}

	return json({
		template: restored,
		message: `Version ${body.version_number} restaurée avec succès`
	});
};
