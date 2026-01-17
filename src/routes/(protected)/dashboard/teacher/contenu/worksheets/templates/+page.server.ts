/**
 * Server-side logic for the template management page
 * GET - Load templates (public + user's own)
 * POST actions - Create, duplicate, delete templates
 */

import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireRoles } from '$lib/server/middleware/auth';
import { DEFAULT_TEMPLATES } from '$lib/worksheets/default-templates';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Parse query parameters
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const limit = 20;
	const search = url.searchParams.get('search') || '';
	const includePublic = url.searchParams.get('include_public') !== 'false';

	// Build query
	let query = locals.supabase
		.from('worksheet_templates')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false });

	// Filter: public templates OR created by current user
	if (includePublic) {
		query = query.or(`is_public.eq.true,created_by.eq.${user.id}`);
	} else {
		query = query.eq('created_by', user.id);
	}

	// Apply search filter
	if (search) {
		query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
	}

	// Apply pagination
	const from = (page - 1) * limit;
	const to = from + limit - 1;
	query = query.range(from, to);

	const { data: templates, error, count } = await query;

	if (error) {
		console.error('Failed to fetch templates:', error);
		return {
			templates: [],
			defaultTemplates: DEFAULT_TEMPLATES,
			pagination: { page, limit, total: 0, totalPages: 0 },
			filters: { search, includePublic },
			userId: user.id
		};
	}

	const total = count ?? 0;
	const totalPages = Math.ceil(total / limit);

	return {
		templates: templates ?? [],
		defaultTemplates: DEFAULT_TEMPLATES,
		pagination: { page, limit, total, totalPages },
		filters: { search, includePublic },
		userId: user.id
	};
};

export const actions: Actions = {
	/**
	 * Create a new template from a default template
	 */
	createFromDefault: async ({ locals, request }) => {
		const { user } = await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const templateId = formData.get('template_id')?.toString();

		if (!templateId) {
			return fail(400, { message: 'Template ID is required' });
		}

		// Find the default template
		const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
		if (!defaultTemplate) {
			return fail(400, { message: 'Default template not found' });
		}

		// Create a new template based on the default
		const { data: template, error } = await locals.supabase
			.from('worksheet_templates')
			.insert({
				name: `${defaultTemplate.name} (copie)`,
				description: defaultTemplate.description,
				template_content: defaultTemplate.template_content,
				placeholders: defaultTemplate.placeholders,
				is_public: false,
				created_by: user.id
			})
			.select()
			.single();

		if (error) {
			console.error('Failed to create template:', error);
			return fail(500, { message: 'Failed to create template' });
		}

		throw redirect(303, `/dashboard/teacher/contenu/worksheets/templates/${template.id}`);
	},

	/**
	 * Duplicate an existing template
	 */
	duplicate: async ({ locals, request }) => {
		const { user } = await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const templateId = formData.get('template_id')?.toString();

		if (!templateId) {
			return fail(400, { message: 'Template ID is required' });
		}

		// Fetch the original template
		const { data: original, error: fetchError } = await locals.supabase
			.from('worksheet_templates')
			.select('*')
			.eq('id', templateId)
			.single();

		if (fetchError || !original) {
			return fail(404, { message: 'Template not found' });
		}

		// Check access: must be public or owned by user
		if (!original.is_public && original.created_by !== user.id) {
			return fail(403, { message: 'Access denied' });
		}

		// Create duplicate
		const { data: template, error } = await locals.supabase
			.from('worksheet_templates')
			.insert({
				name: `${original.name} (copie)`,
				description: original.description,
				template_content: original.template_content,
				placeholders: original.placeholders,
				is_public: false,
				created_by: user.id
			})
			.select()
			.single();

		if (error) {
			console.error('Failed to duplicate template:', error);
			return fail(500, { message: 'Failed to duplicate template' });
		}

		return { success: true, message: 'Template duplique', templateId: template.id };
	},

	/**
	 * Delete a template
	 */
	delete: async ({ locals, request }) => {
		const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const templateId = formData.get('template_id')?.toString();

		if (!templateId) {
			return fail(400, { message: 'Template ID is required' });
		}

		// Check ownership
		const { data: template, error: fetchError } = await locals.supabase
			.from('worksheet_templates')
			.select('id, created_by, name')
			.eq('id', templateId)
			.single();

		if (fetchError || !template) {
			return fail(404, { message: 'Template not found' });
		}

		// Only owner or admin can delete
		if (template.created_by !== user.id && profile.role !== 'admin') {
			return fail(403, { message: 'You can only delete your own templates' });
		}

		// Check if template is in use
		const { count, error: countError } = await locals.supabase
			.from('worksheets')
			.select('id', { count: 'exact', head: true })
			.eq('template_id', templateId);

		if (countError) {
			console.error('Failed to check template usage:', countError);
			return fail(500, { message: 'Failed to check template usage' });
		}

		if (count && count > 0) {
			return fail(400, {
				message: `Ce template est utilise par ${count} feuille(s). Retirez-le d'abord de ces feuilles.`
			});
		}

		// Delete template
		const { error } = await locals.supabase
			.from('worksheet_templates')
			.delete()
			.eq('id', templateId);

		if (error) {
			console.error('Failed to delete template:', error);
			return fail(500, { message: 'Failed to delete template' });
		}

		return { success: true, message: `Template "${template.name}" supprime` };
	}
};
