/**
 * API Endpoint: /api/messages/templates
 *
 * Handles listing and creating message templates.
 *
 * GET - List templates (filtered by permissions)
 * POST - Create new template (admin/teacher only)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateTemplate } from '$lib/templates/templateEngine';
import type { MessageTemplateInput } from '$lib/types/messageTemplates';

// =====================================================
// GET - List templates
// =====================================================
export const GET: RequestHandler = async ({ locals, url }) => {
	const { supabase, user } = locals;

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

	// Parse query parameters
	const scope = url.searchParams.get('scope'); // 'system' | 'class' | null
	const triggerType = url.searchParams.get('trigger_type');
	const classId = url.searchParams.get('class_id');
	const isActive = url.searchParams.get('is_active');

	// Build query
	let query = supabase
		.from('message_templates')
		.select(
			`
      id,
      title,
      description,
      subject_template,
      body_template,
      trigger_type,
      trigger_config,
      scope,
      class_id,
      variables,
      is_active,
      created_at,
      updated_at,
      classes:class_id (
        name
      )
    `
		)
		.order('created_at', { ascending: false });

	// Apply filters based on role and params
	if (profile.role === 'admin') {
		// Admins can see all templates
		if (scope) query = query.eq('scope', scope);
		if (classId) query = query.eq('class_id', classId);
	} else if (profile.role === 'teacher') {
		// Teachers see:
		// 1. System templates
		// 2. Their own class templates
		query = query.or(`scope.eq.system,and(scope.eq.class,created_by.eq.${user.id})`);

		if (scope === 'class') {
			query = query.eq('scope', 'class').eq('created_by', user.id);
		} else if (scope === 'system') {
			query = query.eq('scope', 'system');
		}
	} else {
		// Students only see active templates from their classes and system
		query = query.eq('is_active', true);

		// Get student's class IDs
		const { data: classMembers } = await supabase
			.from('class_members')
			.select('class_id')
			.eq('student_id', user.id);

		const studentClassIds = classMembers?.map((cm) => cm.class_id) || [];

		if (studentClassIds.length > 0) {
			query = query.or(
				`scope.eq.system,and(scope.eq.class,class_id.in.(${studentClassIds.join(',')}))`
			);
		} else {
			// No classes, only system templates
			query = query.eq('scope', 'system');
		}
	}

	// Additional filters
	if (triggerType) query = query.eq('trigger_type', triggerType);
	if (isActive !== null) query = query.eq('is_active', isActive === 'true');

	const { data: templates, error: dbError } = await query;

	if (dbError) {
		console.error('Error fetching templates:', dbError);
		return error(500, 'Erreur lors de la récupération des templates');
	}

	// Format response
	const formattedTemplates = templates?.map((t) => ({
		...t,
		class_name: t.classes?.name || null
	}));

	return json({
		templates: formattedTemplates || [],
		count: formattedTemplates?.length || 0
	});
};

// =====================================================
// POST - Create template
// =====================================================
export const POST: RequestHandler = async ({ locals, request }) => {
	const { supabase, user } = locals;

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

	// Only admins and teachers can create templates
	if (profile.role !== 'admin' && profile.role !== 'teacher') {
		return error(403, 'Permissions insuffisantes');
	}

	// Parse request body
	let templateInput: MessageTemplateInput;
	try {
		templateInput = await request.json();
	} catch {
		return error(400, 'Données invalides');
	}

	// Teachers can only create class templates
	if (profile.role === 'teacher' && templateInput.scope === 'system') {
		return error(403, 'Les professeurs ne peuvent créer que des templates de classe');
	}

	// Validate template
	const validation = validateTemplate({
		title: templateInput.title,
		subject_template: templateInput.subject_template,
		body_template: templateInput.body_template,
		trigger_type: templateInput.trigger_type
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

	// Validate scope and class_id consistency
	if (templateInput.scope === 'system' && templateInput.class_id) {
		return error(400, 'Un template système ne peut pas avoir de class_id');
	}

	if (templateInput.scope === 'class' && !templateInput.class_id) {
		return error(400, 'Un template de classe doit avoir un class_id');
	}

	// If teacher creating class template, verify they own the class
	if (profile.role === 'teacher' && templateInput.scope === 'class') {
		const { data: classData } = await supabase
			.from('classes')
			.select('teacher_id')
			.eq('id', templateInput.class_id!)
			.single();

		if (!classData || classData.teacher_id !== user.id) {
			return error(403, 'Vous ne pouvez créer des templates que pour vos propres classes');
		}
	}

	// Insert template
	const { data: newTemplate, error: insertError } = await supabase
		.from('message_templates')
		.insert({
			title: templateInput.title,
			description: templateInput.description || null,
			subject_template: templateInput.subject_template,
			body_template: templateInput.body_template,
			trigger_type: templateInput.trigger_type,
			trigger_config: templateInput.trigger_config || {},
			scope: templateInput.scope,
			created_by: user.id,
			class_id: templateInput.class_id || null,
			variables: templateInput.variables || [],
			is_active: templateInput.is_active !== undefined ? templateInput.is_active : true
		})
		.select()
		.single();

	if (insertError) {
		console.error('Error creating template:', insertError);
		return error(500, 'Erreur lors de la création du template');
	}

	return json(
		{
			template: newTemplate,
			message: 'Template créé avec succès',
			warnings: validation.warnings
		},
		{ status: 201 }
	);
};
