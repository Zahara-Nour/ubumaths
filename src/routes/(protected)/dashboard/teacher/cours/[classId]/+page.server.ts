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
import { listChapterTemplates, instantiateTemplate } from '$lib/server/chapter-templates';
import {
	createChapterSchema,
	updateChapterSchema,
	reorderChaptersSchema
} from '$lib/server/validation/chapters';
import { instantiateTemplateSchema } from '$lib/server/validation/chapter-templates';
import type { ChapterSummary } from '$lib/types/chapters';
import type { TemplateSummary } from '$lib/types/chapter-templates';

export const load: PageServerLoad = async ({ locals, params }) => {
	// Only teachers can view this page
	const { user } = await requireRole(locals, 'teacher');

	const { classId } = params;

	// Verify teacher owns this class
	const { data: classData, error: classError } = await locals.supabase
		.from('classes')
		.select('id, name, is_active')
		.eq('id', classId)
		.eq('teacher_id', user.id)
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
		console.error('[Teacher Class Chapters] Error:', chaptersError);
		throw error(500, 'Erreur lors du chargement des chapitres');
	}

	// Get students in this class for progress view
	const { data: students } = await locals.supabase
		.from('class_members')
		.select(
			`
			student_id,
			profiles:student_id (
				id,
				full_name,
				avatar_url
			)
		`
		)
		.eq('class_id', classId)
		.eq('is_test', false);

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

	// Get available templates (own + public published)
	const { data: templates } = await listChapterTemplates(
		{ page: 1, limit: 100, grades: undefined, ownOnly: false, publicOnly: false },
		user.id,
		locals.supabase
	);

	return {
		classData,
		chapters: chapters.sort((a, b) => a.displayOrder - b.displayOrder) as ChapterSummary[],
		students: studentList,
		templates: (templates || []) as TemplateSummary[]
	};
};

export const actions: Actions = {
	/**
	 * Create a new chapter
	 */
	create: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		// Verify teacher owns this class
		const { data: classData } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', user.id)
			.single();

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
			console.error('[Create Chapter] Error:', createError);
			return fail(500, { error: 'Erreur lors de la creation', action: 'create' });
		}

		return { success: true, action: 'create', chapterId: chapter?.id };
	},

	/**
	 * Update an existing chapter
	 */
	update: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const chapterId = formData.get('chapterId') as string;

		// Verify teacher owns this chapter
		const { data: chapterData } = await locals.supabase
			.from('class_chapters')
			.select('id, class_id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

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
			console.error('[Update Chapter] Error:', updateError);
			return fail(500, { error: 'Erreur lors de la mise a jour', action: 'update' });
		}

		return { success: true, action: 'update' };
	},

	/**
	 * Delete a chapter
	 */
	delete: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const chapterId = formData.get('chapterId') as string;

		// Verify teacher owns this chapter
		const { data: chapterData } = await locals.supabase
			.from('class_chapters')
			.select('id, class_id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapterData || chapterData.class_id !== classId) {
			return fail(403, { error: 'Acces refuse', action: 'delete' });
		}

		// Delete chapter (orphan trigger handles documents)
		const { error: deleteError } = await deleteChapter(chapterId, locals.supabase);

		if (deleteError) {
			console.error('[Delete Chapter] Error:', deleteError);
			return fail(500, { error: 'Erreur lors de la suppression', action: 'delete' });
		}

		return { success: true, action: 'delete' };
	},

	/**
	 * Reorder chapters
	 */
	reorder: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		// Verify teacher owns this class
		const { data: classData } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', user.id)
			.single();

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
			console.error('[Reorder Chapters] Error:', reorderError);
			return fail(500, { error: 'Erreur lors du reordonnancement', action: 'reorder' });
		}

		return { success: true, action: 'reorder' };
	},

	/**
	 * Toggle chapter visibility
	 */
	toggleVisibility: async ({ request, locals, params }) => {
		const { user } = await requireRole(locals, 'teacher');
		const { classId } = params;

		const formData = await request.formData();
		const chapterId = formData.get('chapterId') as string;
		const isVisible = formData.get('isVisible') === 'true';

		// Verify teacher owns this chapter
		const { data: chapterData } = await locals.supabase
			.from('class_chapters')
			.select('id, class_id')
			.eq('id', chapterId)
			.eq('teacher_id', user.id)
			.single();

		if (!chapterData || chapterData.class_id !== classId) {
			return fail(403, { error: 'Acces refuse', action: 'toggleVisibility' });
		}

		// Update visibility
		const { error: updateError } = await updateChapter(chapterId, { isVisible }, locals.supabase);

		if (updateError) {
			console.error('[Toggle Visibility] Error:', updateError);
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

		// Verify teacher owns this class
		const { data: classData } = await locals.supabase
			.from('classes')
			.select('id')
			.eq('id', classId)
			.eq('teacher_id', user.id)
			.single();

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

		if (instError || !result) {
			console.error('[Instantiate Template] Error:', instError);
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
