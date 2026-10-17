/**
 * Spreadsheet List Page - Server Load
 * Loads user's spreadsheets for the list view
 */

import type { PageServerLoad } from './$types';
import { requireSpreadsheetUser } from '$lib/server/spreadsheet-access';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/spreadsheet/+page.server');

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireSpreadsheetUser(locals);

	// Fetch user's spreadsheets (most recent first)
	const { data: spreadsheets, error } = await locals.supabase
		.from('spreadsheets')
		.select('id, name, description, created_at, updated_at')
		.eq('user_id', user.id)
		.order('updated_at', { ascending: false })
		.limit(20);

	if (error) {
		logger.error('Error loading spreadsheets:', error);
		return {
			spreadsheets: []
		};
	}

	return {
		spreadsheets: spreadsheets ?? []
	};
};
