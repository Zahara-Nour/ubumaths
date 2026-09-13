/**
 * Template Detail Page - Server Load & Actions
 * =============================================
 *
 * View and manage a specific chapter template.
 * Supports: update, publish, archive, instantiate.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import {
	getChapterTemplate,
	updateChapterTemplate,
	publishTemplate,
	archiveTemplate,
	deleteChapterTemplate,
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

	// Check access: owner only (no inter-teacher sharing)
	const isOwner = template.createdBy === user.id;
	if (!isOwner) {
		throw error(403, 'Accès refusé');
	}

	// Fetch versions
	const { data: versions, error: versionsError } = await getTemplateVersions(
		templateId,
		locals.supabase
	);

	if (versionsError) {
		console.error('Lecture impossible :', versionsError);
		throw error(500, 'Impossible de charger les données');
	}

	// Fetch teacher's classes for instantiation
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name, grade, is_active')
		.eq('is_active', true)
		.order('name');

	// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
	// laisse une trace.
	if (classesError) {
		console.error('Enrichissement illisible :', classesError);
	}

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
		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			console.error('Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

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
	publish: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { templateId } = params;

		// Check ownership
		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status, content_snapshot')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			console.error('Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

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
				// Les cinq types que `hasContent` accepte, dans les mots de la
				// fiche : une fiche seule suffit à publier, et le message le disait
				// le contraire.
				error:
					'Un modèle doit contenir au moins un élément : document, question de quiz, tâche, corvée ou fiche',
				action: 'publish'
			});
		}

		// Publish template
		const { error: publishError } = await publishTemplate(templateId, locals.supabase);

		if (publishError) {
			console.error('[Publish Template] Error:', publishError);
			return fail(500, { error: 'Erreur lors de la publication', action: 'publish' });
		}

		return { success: true, action: 'publish' };
	},

	/**
	 * Supprimer définitivement un modèle, brouillon ou publié.
	 *
	 * Les chapitres qui en sont issus survivent : leur rattachement passe à NULL
	 * et leur bandeau affiche « Template supprimé ». Seul l'historique des
	 * versions part avec le modèle. Un modèle archivé, lui, est une trace et
	 * n'est pas supprimable.
	 */
	delete: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { templateId } = params;

		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by, status')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que le refus suivant traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			console.error('[Delete Template] Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible', action: 'delete' });
		}

		if (!templateCheck || templateCheck.created_by !== user.id) {
			return fail(403, { error: 'Accès refusé', action: 'delete' });
		}

		if (templateCheck.status === 'archived') {
			return fail(400, {
				error: 'Un modèle archivé ne peut pas être supprimé',
				action: 'delete'
			});
		}

		const { error: deleteError } = await deleteChapterTemplate(templateId, locals.supabase);

		if (deleteError) {
			console.error('[Delete Template] Suppression impossible :', deleteError);
			return fail(500, { error: 'Erreur lors de la suppression du modèle', action: 'delete' });
		}

		throw redirect(303, '/dashboard/teacher/contenu/templates');
	},

	/**
	 * Archive template
	 */
	archive: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { templateId } = params;

		// Check ownership
		const { data: templateCheck, error: templateCheckError } = await locals.supabase
			.from('chapter_templates')
			.select('created_by')
			.eq('id', templateId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (templateCheckError && templateCheckError.code !== 'PGRST116') {
			console.error('Lecture impossible :', templateCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

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
			// formData.get returns null when absent; instantiateTemplateSchema.title is
			// .optional() (rejects null) -> coerce to undefined
			title: formData.get('title') ?? undefined,
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

		// Verify class exists
		const { data: classCheck, error: classCheckError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', validation.data.classId)
			.single();

		// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà.
		if (classCheckError && classCheckError.code !== 'PGRST116') {
			console.error('Lecture impossible :', classCheckError);
			return fail(500, { error: 'Lecture impossible' });
		}

		if (!classCheck) {
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
