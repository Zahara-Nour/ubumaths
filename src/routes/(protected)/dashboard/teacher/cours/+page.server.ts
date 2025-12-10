/**
 * Teacher Chapters Overview Page Server
 * ======================================
 *
 * Displays all chapters grouped by class for the teacher.
 * Allows creating new chapters and provides quick access to chapter management.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { getTeacherChapters } from '$lib/server/chapters';
import type { ChapterSummary } from '$lib/types/chapters';

interface ClassWithChapters {
	classId: string;
	className: string;
	chapters: ChapterSummary[];
}

export const load: PageServerLoad = async ({ locals }) => {
	// Only teachers can view this page
	const { user } = await requireRole(locals, 'teacher');

	// Get all chapters for this teacher
	const { data: chapters, error: chaptersError } = await getTeacherChapters(
		user.id,
		locals.supabase
	);

	if (chaptersError) {
		console.error('[Teacher Cours] Error fetching chapters:', chaptersError);
		throw error(500, 'Erreur lors du chargement des chapitres');
	}

	// Get teacher's classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name, is_active')
		.eq('teacher_id', user.id)
		.order('name');

	if (classesError) {
		console.error('[Teacher Cours] Error fetching classes:', classesError);
	}

	// Build class info map
	const classMap = new Map<string, { className: string; isActive: boolean }>();
	for (const c of classes || []) {
		classMap.set(c.id, {
			className: c.name,
			isActive: c.is_active
		});
	}

	// Group chapters by class
	const chaptersByClass = new Map<string, ChapterSummary[]>();
	for (const chapter of chapters) {
		if (!chaptersByClass.has(chapter.classId)) {
			chaptersByClass.set(chapter.classId, []);
		}
		chaptersByClass.get(chapter.classId)!.push(chapter);
	}

	// Build the final structure - include all classes even if no chapters
	const classesWithChapters: ClassWithChapters[] = [];
	for (const c of classes || []) {
		classesWithChapters.push({
			classId: c.id,
			className: c.name,
			chapters: (chaptersByClass.get(c.id) || []).sort((a, b) => a.displayOrder - b.displayOrder)
		});
	}

	return {
		classesWithChapters,
		totalChapters: chapters.length,
		classes: classes || []
	};
};
