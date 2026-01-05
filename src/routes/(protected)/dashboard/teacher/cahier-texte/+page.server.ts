/**
 * Teacher Class Journal (Cahier de Texte) Main Page Server
 * ========================================================
 *
 * Displays weekly view of journal entries for the teacher's classes.
 * Loads the teacher's classes and journal entries for the current week.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { getJournalEntriesForWeek } from '$lib/server/journal';
import type { JournalWeekView } from '$lib/types/journal';

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

export const load: PageServerLoad = async ({ locals, url }) => {
	// Only teachers can view this page
	const { user } = await requireRole(locals, 'teacher');

	// Get teacher's classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name, grade, is_active')
		.eq('teacher_id', user.id)
		.order('name');

	if (classesError) {
		console.error('[Cahier de Texte] Error fetching classes:', classesError);
		throw error(500, 'Erreur lors du chargement des classes');
	}

	// Get week start from URL params or default to current week
	const weekStartParam = url.searchParams.get('week');
	const weekStart = weekStartParam || getWeekStart();

	// Get selected class from URL params or default to first class
	const selectedClassId = url.searchParams.get('class') || classes?.[0]?.id || null;

	// Load week view for selected class if one exists
	let weekView: JournalWeekView | null = null;
	if (selectedClassId) {
		const { data, error: weekError } = await getJournalEntriesForWeek(
			locals.supabase,
			selectedClassId,
			weekStart
		);

		if (weekError) {
			console.error('[Cahier de Texte] Error fetching week view:', weekError);
			// Don't throw error, just show empty state
		} else {
			weekView = data;
		}
	}

	return {
		classes: classes || [],
		selectedClassId,
		weekStart,
		weekView
	};
};
