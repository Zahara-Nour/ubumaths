/**
 * Teacher Class Chapters Page Server
 * ===================================
 *
 * Manages chapters for a specific class.
 * Supports CRUD operations via form actions.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import {
	getTeacherChapters,
	createChapter,
	updateChapter,
	deleteChapter,
	reorderChapters
} from '$lib/server/chapters';
import {
	listChapterTemplates,
	instantiateTemplate,
	TemplateUnusableError
} from '$lib/server/chapter-templates';
import {
	createChapterSchema,
	updateChapterSchema,
	reorderChaptersSchema
} from '$lib/server/validation/chapters';
import { instantiateTemplateSchema } from '$lib/server/validation/chapter-templates';
import type { ChapterSummary } from '$lib/types/chapters';
import type { TemplateSummary } from '$lib/types/chapter-templates';
import { z } from 'zod';
import {
	getActiveCourseShareToken,
	revokeCourseShareToken,
	rotateCourseShareToken
} from '$lib/server/course-share-tokens';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/teacher/cours/[classId]/+page.server');

const classIdSchema = z.string().uuid('Identifiant de classe invalide');

export const load: PageServerLoad = async ({ locals, params }) => {
	// Only teachers can view this page
	const { user } = await requireRole(locals, 'teacher');

	const { classId } = params;

	// Verify class exists
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('id, name, is_active')
		.eq('id', classId)
		.single();

	if (classError || !classData) {
		throw error(404, 'Classe non trouvée');
	}

	// Get chapters for this class
	const { data: chapters, error: chaptersError } = await getTeacherChapters(
		user.id,
		locals.supabase,
		classId
	);

	if (chaptersError) {
		logger.error('[Teacher Class Chapters] Error:', chaptersError);
		throw error(500, 'Erreur lors du chargement des chapitres');
	}

	// Get active students in this class for progress view
	const { data: students, error: studentsError } = await locals.supabase
		.from('class_members')
		// `is_test` est une colonne de `profiles`, pas de `class_members` : le
		// filtre rendait la requête ENTIÈRE invalide, donc la liste des élèves de
		// la classe était toujours vide. L'embed passe en `!inner` pour que le
		// filtre sur la table liée s'applique.
		.select(
			`
			student_id,
			profiles!inner (
				id,
				full_name,
				avatar_url,
				is_test
			)
		`
		)
		.eq('class_id', classId)
		.eq('status', 'active')
		.eq('profiles.is_test', false);

	if (studentsError) {
		logger.error('Lecture impossible :', studentsError);
		throw error(500, 'Impossible de charger les données');
	}

	const studentList = (students || [])
		.map((s) => {
			const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
			return profile
				? {
						id: profile.id,
						name: profile.full_name || 'Etudiant',
						avatar: profile.avatar_url
					}
				: null;
		})
		.filter(Boolean);

	// Get available templates (own only)
	const { data: templates, error: templatesError } = await listChapterTemplates(
		{ page: 1, limit: 100, grades: undefined },
		user.id,
		locals.supabase
	);

	// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
	// laisse une trace.
	if (templatesError) {
		logger.error('Enrichissement illisible :', templatesError);
	}

	// Lien du cours (ADR 0025) : les élèves sans compte n'ont pas d'autre accès.
	// Une panne de lecture n'empêche pas de gérer les chapitres ; elle est journalisée.
	const { token: courseShareToken } = await getActiveCourseShareToken(locals.supabase, classId);

	return {
		classData,
		chapters: chapters.sort((a, b) => a.displayOrder - b.displayOrder) as ChapterSummary[],
		students: studentList,
		templates: (templates || []) as TemplateSummary[],
		courseShareToken
	};
};

export const actions: Actions = {
	/**
	 * Créer / renouveler le lien du cours (ADR 0025).
	 *
	 * `requireRole` est refait dans chaque action : le `load` ne protège pas les
	 * actions, qui sont des points d'entrée à part entière.
	 */
	shareCourseLink: async ({ locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');

		const parsed = classIdSchema.safeParse(params.classId);
		if (!parsed.success) return fail(400, { error: 'Classe invalide', action: 'shareCourseLink' });

		const { error: rotateError } = await rotateCourseShareToken(
			locals.supabase,
			parsed.data,
			user.id
		);
		if (rotateError) return fail(500, { error: rotateError, action: 'shareCourseLink' });

		return { success: true, action: 'shareCourseLink' };
	},

	/**
	 * Révoquer le lien du cours. Zéro ligne désactivée n'est pas un succès : la
	 * RLS échoue en silence, et le professeur croirait le lien coupé.
	 */
	revokeCourseLink: async ({ locals, params }) => {
		await requireRole(locals, 'teacher');

		const parsed = classIdSchema.safeParse(params.classId);
		if (!parsed.success) return fail(400, { error: 'Classe invalide', action: 'revokeCourseLink' });

		const { revoked, error: revokeError } = await revokeCourseShareToken(
			locals.supabase,
			parsed.data
		);
		if (revokeError) return fail(500, { error: revokeError, action: 'revokeCourseLink' });
		if (revoked === 0) {
			return fail(404, { error: 'Aucun lien actif à révoquer', action: 'revokeCourseLink' });
		}

		return { success: true, action: 'revokeCourseLink' };
	},

	/**
	 * Create a new chapter
	 */
	create: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { classId } = params;

		// Verify class exists
		const { data: classData, error: classDataError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime. Toute
		// AUTRE panne produisait le même « accès refusé ».
		if (classDataError && classDataError.code !== 'PGRST116') {
			logger.error('Vérification impossible :', classDataError);
			return fail(500, { error: 'Verification impossible' });
		}

		if (!classData) {
			return fail(403, { error: 'Acces refuse', action: 'create' });
		}

		const formData = await request.formData();
		const data = {
			classId,
			title: formData.get('title'),
			description: formData.get('description') || undefined,
			isVisible: formData.get('isVisible') === 'true',
			color: formData.get('color') || undefined,
			icon: formData.get('icon') || undefined
		};

		// Validate input
		const validation = createChapterSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'create'
			});
		}

		// Create chapter
		const { data: chapter, error: createError } = await createChapter(
			validation.data,
			locals.supabase
		);

		if (createError) {
			logger.error('[Create Chapter] Error:', createError);
			return fail(500, { error: 'Erreur lors de la creation', action: 'create' });
		}

		return { success: true, action: 'create', chapterId: chapter?.id };
	},

	/**
	 * Update an existing chapter
	 */
	update: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const chapterId = formData.get('chapterId') as string;

		// Verify chapter exists and belongs to this class
		const { data: chapterData, error: chapterDataError } = await locals.supabase
			.from('class_chapters')
			.select('id, class_id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime. Toute
		// AUTRE panne produisait le même « accès refusé ».
		if (chapterDataError && chapterDataError.code !== 'PGRST116') {
			logger.error('Vérification impossible :', chapterDataError);
			return fail(500, { error: 'Verification impossible' });
		}

		if (!chapterData || chapterData.class_id !== classId) {
			return fail(403, { error: 'Acces refuse', action: 'update' });
		}

		const data = {
			title: formData.get('title') as string | undefined,
			description: formData.get('description') as string | undefined,
			isVisible: formData.has('isVisible') ? formData.get('isVisible') === 'true' : undefined,
			color: formData.get('color') as string | undefined,
			icon: formData.get('icon') as string | undefined
		};

		// Remove undefined fields
		const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

		// Validate input
		const validation = updateChapterSchema.safeParse(cleanData);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'update'
			});
		}

		// Update chapter
		const { error: updateError } = await updateChapter(chapterId, validation.data, locals.supabase);

		if (updateError) {
			logger.error('[Update Chapter] Error:', updateError);
			return fail(500, { error: 'Erreur lors de la mise a jour', action: 'update' });
		}

		return { success: true, action: 'update' };
	},

	/**
	 * Delete a chapter
	 */
	delete: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const chapterId = formData.get('chapterId') as string;

		// Verify chapter exists and belongs to this class
		const { data: chapterData, error: chapterDataError } = await locals.supabase
			.from('class_chapters')
			.select('id, class_id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime. Toute
		// AUTRE panne produisait le même « accès refusé ».
		if (chapterDataError && chapterDataError.code !== 'PGRST116') {
			logger.error('Vérification impossible :', chapterDataError);
			return fail(500, { error: 'Verification impossible' });
		}

		if (!chapterData || chapterData.class_id !== classId) {
			return fail(403, { error: 'Acces refuse', action: 'delete' });
		}

		// Delete chapter (orphan trigger handles documents)
		const { error: deleteError } = await deleteChapter(chapterId, locals.supabase);

		if (deleteError) {
			logger.error('[Delete Chapter] Error:', deleteError);
			return fail(500, { error: 'Erreur lors de la suppression', action: 'delete' });
		}

		return { success: true, action: 'delete' };
	},

	/**
	 * Reorder chapters
	 */
	reorder: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { classId } = params;

		// Verify class exists
		const { data: classData, error: classDataError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime. Toute
		// AUTRE panne produisait le même « accès refusé ».
		if (classDataError && classDataError.code !== 'PGRST116') {
			logger.error('Vérification impossible :', classDataError);
			return fail(500, { error: 'Verification impossible' });
		}

		if (!classData) {
			return fail(403, { error: 'Acces refuse', action: 'reorder' });
		}

		const formData = await request.formData();
		const orderJson = formData.get('order') as string;

		let orderUpdates: Array<{ id: string; displayOrder: number }>;
		try {
			orderUpdates = JSON.parse(orderJson);
		} catch {
			return fail(400, { error: 'Format invalide', action: 'reorder' });
		}

		// Validate input
		const validation = reorderChaptersSchema.safeParse({
			chapters: orderUpdates
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'reorder'
			});
		}

		// Reorder chapters
		const { error: reorderError } = await reorderChapters(
			classId,
			validation.data.chapters,
			locals.supabase
		);

		if (reorderError) {
			logger.error('[Reorder Chapters] Error:', reorderError);
			return fail(500, { error: 'Erreur lors du reordonnancement', action: 'reorder' });
		}

		return { success: true, action: 'reorder' };
	},

	/**
	 * Toggle chapter visibility
	 */
	toggleVisibility: async ({ request, locals, params }) => {
		await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const chapterId = formData.get('chapterId') as string;
		const isVisible = formData.get('isVisible') === 'true';

		// Verify chapter exists and belongs to this class
		const { data: chapterData, error: chapterDataError } = await locals.supabase
			.from('class_chapters')
			.select('id, class_id')
			.eq('id', chapterId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime. Toute
		// AUTRE panne produisait le même « accès refusé ».
		if (chapterDataError && chapterDataError.code !== 'PGRST116') {
			logger.error('Vérification impossible :', chapterDataError);
			return fail(500, { error: 'Verification impossible' });
		}

		if (!chapterData || chapterData.class_id !== classId) {
			return fail(403, { error: 'Acces refuse', action: 'toggleVisibility' });
		}

		// Update visibility
		const { error: updateError } = await updateChapter(chapterId, { isVisible }, locals.supabase);

		if (updateError) {
			logger.error('[Toggle Visibility] Error:', updateError);
			return fail(500, { error: 'Erreur lors de la mise a jour', action: 'toggleVisibility' });
		}

		return { success: true, action: 'toggleVisibility' };
	},

	/**
	 * Create chapter from template
	 */
	instantiateFromTemplate: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		// Verify class exists
		const { data: classData, error: classDataError } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.single();

		// PGRST116 = la ligne n'existe pas, et le refus qui suit est légitime. Toute
		// AUTRE panne produisait le même « accès refusé ».
		if (classDataError && classDataError.code !== 'PGRST116') {
			logger.error('Vérification impossible :', classDataError);
			return fail(500, { error: 'Verification impossible' });
		}

		if (!classData) {
			return fail(403, { error: 'Acces refuse', action: 'instantiateFromTemplate' });
		}

		const formData = await request.formData();
		const data = {
			templateId: formData.get('templateId'),
			classId,
			title: formData.get('title') || undefined,
			isVisible: formData.get('isVisible') === 'true'
		};

		// Validate input
		const validation = instantiateTemplateSchema.safeParse(data);
		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'instantiateFromTemplate'
			});
		}

		// Instantiate template
		const { data: result, error: instError } = await instantiateTemplate(
			validation.data,
			user.id,
			locals.supabase
		);

		// Brouillon, archivé : le professeur doit lire quoi faire (« publiez-le
		// d'abord »). Le message générique ne le disait pas.
		if (instError instanceof TemplateUnusableError) {
			return fail(409, { error: instError.message, action: 'instantiateFromTemplate' });
		}

		if (instError || !result) {
			logger.error('[Instantiate Template] Error:', instError);
			return fail(500, {
				error: 'Erreur lors de la creation du chapitre depuis le template',
				action: 'instantiateFromTemplate'
			});
		}

		return {
			success: true,
			action: 'instantiateFromTemplate',
			chapterId: result.chapterId
		};
	}
};
