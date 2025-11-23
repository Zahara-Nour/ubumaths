/**
 * Server-side logic for template detail/edit page
 * GET - Load template
 * POST actions - Update template
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireRoles } from '$lib/server/middleware/auth';
import { z } from 'zod';

// Validation schema for updating template
const updateTemplateSchema = z.object({
	name: z.string().trim().min(1, 'Le nom est requis').max(255, 'Nom trop long'),
	description: z.string().trim().max(2000, 'Description trop longue').optional().nullable(),
	template_content: z
		.string()
		.min(1, 'Le contenu du template est requis')
		.max(50000, 'Template trop long'),
	is_public: z.boolean().optional().default(false)
});

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Handle "new" as a special case
	if (params.id === 'new') {
		return {
			template: null,
			isNew: true,
			canEdit: true,
			userId: user.id
		};
	}

	// Validate UUID format
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(params.id)) {
		throw error(400, 'Invalid template ID');
	}

	// Fetch template
	const { data: template, error: dbError } = await locals.supabase
		.from('worksheet_templates')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError) {
		if (dbError.code === 'PGRST116') {
			throw error(404, 'Template not found');
		}
		console.error('Failed to fetch template:', dbError);
		throw error(500, 'Failed to fetch template');
	}

	// Check access: must be public or owned by user
	if (!template.is_public && template.created_by !== user.id) {
		throw error(403, 'Access denied');
	}

	// Can edit if owned by user or admin
	const canEdit = template.created_by === user.id || profile.role === 'admin';

	return {
		template,
		isNew: false,
		canEdit,
		userId: user.id
	};
};

export const actions: Actions = {
	/**
	 * Create a new template
	 */
	create: async ({ locals, request }) => {
		const { user } = await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const name = formData.get('name')?.toString() || '';
		const description = formData.get('description')?.toString() || null;
		const template_content = formData.get('template_content')?.toString() || '';
		const is_public = formData.get('is_public') === 'true';

		// Validate input
		const validation = updateTemplateSchema.safeParse({
			name,
			description,
			template_content,
			is_public
		});

		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return fail(400, { message: firstError.message });
		}

		// Create template
		const { data: template, error: dbError } = await locals.supabase
			.from('worksheet_templates')
			.insert({
				name: validation.data.name,
				description: validation.data.description,
				template_content: validation.data.template_content,
				placeholders: [], // Will be extracted from content later
				is_public: validation.data.is_public,
				created_by: user.id
			})
			.select()
			.single();

		if (dbError) {
			console.error('Failed to create template:', dbError);
			return fail(500, { message: 'Erreur lors de la creation du template' });
		}

		throw redirect(303, `/dashboard/teacher/worksheets/templates/${template.id}`);
	},

	/**
	 * Update an existing template
	 */
	update: async ({ locals, request, params }) => {
		const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

		// Check ownership
		const { data: existingTemplate, error: fetchError } = await locals.supabase
			.from('worksheet_templates')
			.select('id, created_by')
			.eq('id', params.id)
			.single();

		if (fetchError || !existingTemplate) {
			return fail(404, { message: 'Template not found' });
		}

		// Only owner or admin can update
		if (existingTemplate.created_by !== user.id && profile.role !== 'admin') {
			return fail(403, { message: 'Vous ne pouvez modifier que vos propres templates' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString() || '';
		const description = formData.get('description')?.toString() || null;
		const template_content = formData.get('template_content')?.toString() || '';
		const is_public = formData.get('is_public') === 'true';

		// Validate input
		const validation = updateTemplateSchema.safeParse({
			name,
			description,
			template_content,
			is_public
		});

		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return fail(400, { message: firstError.message });
		}

		// Extract placeholders from content
		const placeholderMatches = template_content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
		const placeholderKeys = [
			...new Set(placeholderMatches.map((m) => m.replace(/\{\{|\}\}/g, '')))
		];
		const placeholders = placeholderKeys.map((key) => ({
			key,
			type:
				key === 'date' || key === 'due_date' ? 'date' : key === 'exercises' ? 'dynamic' : 'text',
			label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
		}));

		// Update template
		const { error: dbError } = await locals.supabase
			.from('worksheet_templates')
			.update({
				name: validation.data.name,
				description: validation.data.description,
				template_content: validation.data.template_content,
				placeholders,
				is_public: validation.data.is_public
			})
			.eq('id', params.id);

		if (dbError) {
			console.error('Failed to update template:', dbError);
			return fail(500, { message: 'Erreur lors de la mise a jour du template' });
		}

		return { success: true, message: 'Template mis a jour' };
	}
};
