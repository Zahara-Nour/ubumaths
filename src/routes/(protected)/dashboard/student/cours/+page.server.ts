/**
 * Student Chapters Page Server
 * ============================
 *
 * Loads all visible chapters for the student, grouped by class.
 * Fetches chapters with content counts for display in cards.
 */

import { fetchStaffDirectory, soleTeacher } from '$lib/server/staff-directory';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import type { ChapterSummary } from '$lib/types/chapters';

interface ClassWithChapters {
	classId: string;
	className: string;
	teacherName: string;
	chapters: ChapterSummary[];
}

export const load: PageServerLoad = async ({ locals }) => {
	// Only students can view this page
	const { user } = await requireRole(locals, 'student');

	// Get all visible chapters for this student with content counts
	const { data: chaptersData, error: chaptersError } = await locals.supabase
		.from('class_chapters')
		.select(
			`
			*,
			documents:chapter_documents(count),
			checklistItems:chapter_checklist_items(count),
			exercises:chapter_exercises(count)
		`
		)
		.eq('is_visible', true)
		.order('display_order', { ascending: true });

	if (chaptersError) {
		console.error('[Student Cours] Error fetching chapters:', chaptersError);
		throw error(500, 'Erreur lors du chargement des chapitres');
	}

	// Get student's class memberships with class details.
	// Mono-teacher: teacher_id was dropped from classes; resolve the sole teacher once below.
	const { data: memberships, error: membershipError } = await locals.supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes:class_id (
				id,
				name
			)
		`
		)
		.eq('student_id', user.id)
		.eq('status', 'active');

	if (membershipError) {
		console.error('[Student Cours] Error fetching memberships:', membershipError);
	}

	// Le professeur unique, pour l'attribution à l'affichage.
	//
	// ⚠️ Par l'ANNUAIRE, pas par `profiles` : la lecture des profils est bornée
	// aux camarades, amis et co-participants, et un professeur n'entre dans
	// aucune de ces cases. Un `.from('profiles')` rendrait `null` en silence.
	const enseignant = soleTeacher(await fetchStaffDirectory(locals.supabase));

	// Build class info map and set of enrolled class IDs
	const classMap = new Map<string, { className: string; teacherName: string }>();
	const enrolledClassIds = new Set<string>();

	for (const m of memberships || []) {
		const classData = Array.isArray(m.classes) ? m.classes[0] : m.classes;
		if (classData) {
			classMap.set(m.class_id, {
				className: classData.name,
				teacherName: enseignant?.full_name || 'Professeur'
			});
			enrolledClassIds.add(m.class_id);
		}
	}

	// Filter chapters to only those in student's classes and transform to ChapterSummary
	const chapters: ChapterSummary[] = (chaptersData || [])
		.filter((row) => enrolledClassIds.has(row.class_id))
		.map((row) => ({
			id: row.id,
			classId: row.class_id,
			teacherId: enseignant?.id || '',
			title: row.title,
			description: row.description,
			displayOrder: row.display_order,
			isVisible: row.is_visible,
			color: row.color as ChapterSummary['color'],
			icon: row.icon as ChapterSummary['icon'],
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			documentCount: (row.documents as unknown as { count: number }[])?.[0]?.count || 0,
			checklistItemCount: (row.checklistItems as unknown as { count: number }[])?.[0]?.count || 0,
			exerciseCount: (row.exercises as unknown as { count: number }[])?.[0]?.count || 0
		}));

	// Group chapters by class
	const chaptersByClass = new Map<string, ChapterSummary[]>();
	for (const chapter of chapters) {
		if (!chaptersByClass.has(chapter.classId)) {
			chaptersByClass.set(chapter.classId, []);
		}
		chaptersByClass.get(chapter.classId)!.push(chapter);
	}

	// Build the final structure
	const classesWithChapters: ClassWithChapters[] = [];
	for (const [classId, classChapters] of chaptersByClass) {
		const classInfo = classMap.get(classId);
		classesWithChapters.push({
			classId,
			className: classInfo?.className || 'Classe inconnue',
			teacherName: classInfo?.teacherName || 'Professeur',
			chapters: classChapters.sort((a, b) => a.displayOrder - b.displayOrder)
		});
	}

	// Sort classes by name
	classesWithChapters.sort((a, b) => a.className.localeCompare(b.className));

	return {
		classesWithChapters,
		totalChapters: chapters.length
	};
};
