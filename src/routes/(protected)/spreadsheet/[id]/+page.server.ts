/**
 * Spreadsheet Edit Page - Server Load
 * Loads a single spreadsheet with full data for editing
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await requireRole(locals, 'student');

	// Fetch full spreadsheet data
	const { data, error: dbError } = await locals.supabase
		.from('spreadsheets')
		.select('*')
		.eq('id', params.id)
		.eq('user_id', user.id) // Ensure user owns this spreadsheet
		.single();

	if (dbError || !data) {
		throw error(404, 'Feuille de calcul non trouvée');
	}

	return {
		spreadsheet: data
	};
};
