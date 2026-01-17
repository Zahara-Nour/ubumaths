/**
 * Template Detail Page - Server Load & Actions
 * =============================================
 *
 * View and manage a specific chapter template.
 * Supports: update, publish, archive, instantiate.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import {
	getChapterTemplate,
	updateChapterTemplate,
	publishTemplate,
	archiveTemplate,
	getTemplateVersions,
	instantiateTemplate
} from '$lib/server/chapter-templates';
import {
	updateChapterTemplateSchema,
	instantiateTemplateSchema
} from '$lib/server/validation/chapter-templates';
import { hasContent, parseContentSnapshot } from '$lib/types/chapter-templates';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'teacher');
	const { templateId } = params;

	// Fetch template
	const { data: template, error: templateError } = await getChapterTemplate(
		templateId,
		locals.supabase
	);

	if (templateError || !template) {
		throw error(404, 'Template non trouvé');
	}

	// Check access: owner can view any status, others only published public
	const isOwner = template.createdBy === user.id;
	if (!isOwner) {
		if (template.status !== 'published' || !template.isPublic) {
			throw error(403, 'Accès refusé');
		}
	}

	// Fetch versions
	const { data: versions } = await getTemplateVersions(templateId, locals.supabase);

	// Fetch teacher's classes for instantiation
	const { data: classes } = await locals.supabase
		.from('classes')
		.select('id, name, grade, is_active')
		.eq('teacher_id', user.id)
		.eq('is_active', true)
		.order('name');

	return {
		template,
		versions: versions || [],
		classes: classes || [],
		isOwner
	};
};

export const actions: Actions = {
	/**
	 * Update template metadata (draft only)
	 */
	update: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { templateId } = params;

		// Check ownership
		const { data: templateCheck } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status')
			.eq('id', templateId)
			.single();

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'update' });
		}

		const formData = await request.formData();

		// Parse grades
		const gradesString = formData.get('grades') as string | null;
		const grades = gradesString ? gradesString.split(',').filter(Boolean) : undefined;

		const data = {
			title: formData.get('title') as string | undefined,
			description: formData.get('description') as string | undefined,
			grades,
			color: formData.get('color') as string | undefined,
			icon: formData.get('icon') as string | undefined
		};

		// Remove undefined fields
		const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

		// Validate input
		const validation = updateChapterTemplateSchema.safeParse(cleanData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'update'
			});
		}

		// Update template
		const { error: updateError } = await updateChapterTemplate(
			templateId,
			validation.data,
			user.id,
			locals.supabase
		);

		if (updateError) {
			console.error('[Update Template] Error:', updateError);
			return fail(500, { error: 'Erreur lors de la mise à jour', action: 'update' });
		}

		return { success: true, action: 'update' };
	},

	/**
	 * Publish template (validates content exists)
	 */
	publish: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { templateId } = params;

		// Check ownership
		const { data: templateCheck } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status, content_snapshot')
			.eq('id', templateId)
			.single();

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'publish' });
		}

		if (templateCheck.status !== 'draft') {
			return fail(400, { error: 'Seuls les brouillons peuvent être publiés', action: 'publish' });
		}

		// Validate content exists
		const snapshot = parseContentSnapshot(
			templateCheck.content_snapshot as Record<string, unknown>
		);
		if (!hasContent(snapshot)) {
			return fail(400, {
				error:
					'Le template doit contenir au moins un élément (document, quiz, checklist ou exercice)',
				action: 'publish'
			});
		}

		const formData = await request.formData();
		const isPublic = formData.get('isPublic') === 'true';

		// Publish template
		const { error: publishError } = await publishTemplate(templateId, isPublic, locals.supabase);

		if (publishError) {
			console.error('[Publish Template] Error:', publishError);
			return fail(500, { error: 'Erreur lors de la publication', action: 'publish' });
		}

		return { success: true, action: 'publish' };
	},

	/**
	 * Archive template
	 */
	archive: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { templateId } = params;

		// Check ownership
		const { data: templateCheck } = await locals.supabase
			.from('chapter_templates')
			.select('created_by')
			.eq('id', templateId)
			.single();

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'archive' });
		}

		// Archive template
		const { error: archiveError } = await archiveTemplate(templateId, locals.supabase);

		if (archiveError) {
			console.error('[Archive Template] Error:', archiveError);
			return fail(500, { error: "Erreur lors de l'archivage", action: 'archive' });
		}

		return { success: true, action: 'archive' };
	},

	/**
	 * Instantiate template into a chapter
	 */
	instantiate: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { templateId } = params;

		const formData = await request.formData();

		const data = {
			templateId,
			classId: formData.get('classId') as string,
			title: formData.get('title') as string | undefined,
			isVisible: formData.get('isVisible') === 'true'
		};

		// Validate input
		const validation = instantiateTemplateSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'instantiate'
			});
		}

		// Verify class ownership
		const { data: classCheck } = await locals.supabase
			.from('classes')
			.select('teacher_id')
			.eq('id', validation.data.classId)
			.single();

		if (!classCheck || classCheck.teacher_id !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'instantiate' });
		}

		// Instantiate template
		const { data: result, error: instError } = await instantiateTemplate(
			validation.data,
			user.id,
			locals.supabase
		);

		if (instError || !result) {
			console.error('[Instantiate Template] Error:', instError);
			return fail(500, { error: "Erreur lors de l'instantiation", action: 'instantiate' });
		}

		return {
			success: true,
			action: 'instantiate',
			chapterId: result.chapterId
		};
	}
};
