/**
 * Student Class Journal (Cahier de Texte) Page Server
 * ====================================================
 *
 * Displays published journal entries and upcoming homework for the student.
 * Students can only see entries that are:
 * - Published (is_published = true)
 * - From their active class memberships
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { getUpcomingHomework } from '$lib/server/journal';
import type { UpcomingHomework, JournalDayView } from '$lib/types/journal';
import { z } from 'zod';

// Validation schemas for URL query parameters
const weekSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide');
const classIdSchema = z.string().uuid('ID de classe invalide');

// Days ahead for upcoming homework
const UPCOMING_HOMEWORK_DAYS = 14;

/**
 * Helper to get Monday of the current week (or specified date)
 */
function getWeekStart(date: Date = new Date()): string {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay();
	// Adjust for Sunday (0) to get previous Monday
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	return d.toISOString().split('T')[0];
}

/**
 * Helper to get the end of the week (Sunday)
 */
function getWeekEnd(weekStart: string): string {
	const d = new Date(weekStart);
	d.setDate(d.getDate() + 6);
	return d.toISOString().split('T')[0];
}

export const load: PageServerLoad = async ({ locals, url }) => {
	// Only students can view this page
	const { user } = await requireRole(locals, 'student');

	// Get student's active class memberships
	const { data: memberships, error: membershipError } = await locals.supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes!inner(
				id,
				name,
				level
			)
		`
		)
		.eq('student_id', user.id)
		.eq('status', 'active');

	if (membershipError) {
		console.error('[Student Cahier de Texte] Error fetching memberships:', membershipError);
	}

	// Transform class data
	const classes = (memberships || []).map((item) => {
		const classData = item.classes as unknown as { id: string; name: string; level: string };
		return {
			id: classData.id,
			name: classData.name,
			level: classData.level
		};
	});

	const classIds = classes.map((c) => c.id);

	// Get week navigation params with validation
	const weekStartParam = url.searchParams.get('week');
	let weekStart: string;
	if (weekStartParam) {
		const weekValidation = weekSchema.safeParse(weekStartParam);
		weekStart = weekValidation.success ? weekStartParam : getWeekStart();
	} else {
		weekStart = getWeekStart();
	}
	const weekEnd = getWeekEnd(weekStart);
	const today = new Date().toISOString().split('T')[0];

	// Selected class filter (optional) with validation
	const selectedClassIdParam = url.searchParams.get('class');
	let selectedClassId: string | null = null;
	if (selectedClassIdParam) {
		const classValidation = classIdSchema.safeParse(selectedClassIdParam);
		if (classValidation.success && classIds.includes(selectedClassIdParam)) {
			selectedClassId = selectedClassIdParam;
		}
	}
	const filteredClassIds = selectedClassId ? [selectedClassId] : classIds;

	// Fetch published journal entries for the week (only past/today dates)
	let weekEntries: Array<{
		id: string;
		entry_date: string;
		lesson_content: string | null;
		homework_content: string | null;
		homework_due_date: string | null;
		class_id: string;
		classes: { name: string; level: string };
	}> = [];

	if (filteredClassIds.length > 0) {
		const { data: entries, error: entriesError } = await locals.supabase
			.from('class_journal_entries')
			.select(
				`
				id,
				entry_date,
				lesson_content,
				homework_content,
				homework_due_date,
				class_id,
				classes!inner(name, level)
			`
			)
			.in('class_id', filteredClassIds)
			.eq('is_published', true)
			.gte('entry_date', weekStart)
			.lte('entry_date', weekEnd)
			.lte('entry_date', today) // Only show past or today's entries
			.order('entry_date', { ascending: false });

		if (entriesError) {
			console.error('[Student Cahier de Texte] Error fetching entries:', entriesError);
		} else {
			weekEntries = (entries || []).map((e) => ({
				...e,
				classes: e.classes as unknown as { name: string; level: string }
			}));
		}
	}

	// Build week view with days
	const days: JournalDayView[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(weekStart);
		d.setDate(d.getDate() + i);
		const dateStr = d.toISOString().split('T')[0];
		const isToday = dateStr === today;
		const isPast = dateStr < today;
		const dayOfWeek = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][d.getDay()];

		// Find entries for this day
		const dayEntries = weekEntries
			.filter((e) => e.entry_date === dateStr)
			.map((e) => ({
				id: e.id,
				hasLesson: !!e.lesson_content,
				hasHomework: !!e.homework_content,
				homeworkDueDate: e.homework_due_date,
				isPublished: true, // All visible entries are published
				className: e.classes.name,
				classId: e.class_id
			}));

		days.push({
			date: d,
			dayOfWeek,
			isToday,
			entries: isToday || isPast ? dayEntries : [] // Only show entries for past/today
		});
	}

	// Get upcoming homework for the student
	let upcomingHomework: UpcomingHomework[] = [];
	if (classIds.length > 0) {
		const { data: homeworkData, error: homeworkError } = await getUpcomingHomework(
			locals.supabase,
			user.id,
			UPCOMING_HOMEWORK_DAYS
		);

		if (homeworkError) {
			console.error('[Student Cahier de Texte] Error fetching homework:', homeworkError);
			// Continue with empty array - homework is supplementary info
		}
		upcomingHomework = homeworkData || [];
	}

	return {
		classes,
		selectedClassId,
		weekStart,
		days,
		weekEntries: weekEntries.map((e) => ({
			id: e.id,
			entryDate: e.entry_date,
			lessonContent: e.lesson_content,
			homeworkContent: e.homework_content,
			homeworkDueDate: e.homework_due_date,
			className: e.classes.name,
			classLevel: e.classes.level,
			classId: e.class_id
		})),
		upcomingHomework
	};
};
