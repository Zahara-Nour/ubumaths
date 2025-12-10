/**
 * Create Template Page - Server Load & Actions
 * =============================================
 *
 * Allows teachers to create new chapter templates from scratch.
 */

import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { createChapterTemplate } from '$lib/server/chapter-templates';
import { createChapterTemplateSchema } from '$lib/server/validation/chapter-templates';

export const actions: Actions = {
	/**
	 * Create a new chapter template
	 */
	create: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();

		// Parse grades from comma-separated string
		const gradesString = formData.get('grades') as string | null;
		const grades = gradesString ? gradesString.split(',').filter(Boolean) : [];

		const data = {
			title: formData.get('title') as string,
			description: (formData.get('description') as string | null) || undefined,
			grades,
			color: (formData.get('color') as string | null) || undefined,
			icon: (formData.get('icon') as string | null) || undefined
		};

		// Validate input
		const validation = createChapterTemplateSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'create'
			});
		}

		// Create template
		const { data: template, error } = await createChapterTemplate(
			validation.data,
			user.id,
			locals.supabase
		);

		if (error) {
			console.error('[Create Template] Error:', error);
			return fail(500, {
				error: 'Erreur lors de la création du template',
				action: 'create'
			});
		}

		// Redirect to template detail page
		throw redirect(303, `/dashboard/teacher/templates/${template!.id}`);
	}
};
