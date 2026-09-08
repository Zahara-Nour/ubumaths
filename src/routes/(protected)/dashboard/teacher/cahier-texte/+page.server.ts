/**
 * Teacher Class Journal (Cahier de Texte) Main Page Server
 * ========================================================
 *
 * Displays weekly view of journal entries for the teacher's classes.
 * Loads the teacher's classes and journal entries for the current week.
 */

import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import {
	getActiveShareToken,
	revokeShareToken,
	rotateShareToken
} from '$lib/server/journal-share-tokens';

const classIdSchema = z.string().uuid('Identifiant de classe invalide');
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
	await requireRole(locals, 'teacher');

	// Get teacher's classes
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('id, name, grade, is_active')
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

	// Lien de partage de la classe affichée : tous les élèves n'ont pas de compte,
	// et sans ce lien ceux-là n'ont aucun moyen de savoir ce qu'il y a à faire.
	const shareToken = selectedClassId
		? (await getActiveShareToken(locals.supabase, selectedClassId)).token
		: null;

	return {
		classes: classes || [],
		selectedClassId,
		weekStart,
		weekView,
		shareToken
	};
};

/**
 * Créer / renouveler et révoquer le lien de partage.
 *
 * `requireRole` est refait dans chaque action : un `load` qui a autorisé
 * l'affichage ne protège pas les actions, qui sont des points d'entrée à part
 * entière.
 */
export const actions: Actions = {
	shareLink: async ({ locals, request }) => {
		const { user } = await requireRole(locals, 'teacher');

		const form = await request.formData();
		const parsed = classIdSchema.safeParse(form.get('classId'));
		if (!parsed.success) return fail(400, { error: 'Classe invalide' });

		const { error: rotateError } = await rotateShareToken(locals.supabase, parsed.data, user.id);
		if (rotateError) return fail(500, { error: rotateError });

		return { success: true };
	},

	revokeShareLink: async ({ locals, request }) => {
		await requireRole(locals, 'teacher');

		const form = await request.formData();
		const parsed = classIdSchema.safeParse(form.get('classId'));
		if (!parsed.success) return fail(400, { error: 'Classe invalide' });

		const { error: revokeError } = await revokeShareToken(locals.supabase, parsed.data);
		if (revokeError) return fail(500, { error: revokeError });

		return { success: true };
	}
};
