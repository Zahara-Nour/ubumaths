import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { listWorksheetStyles } from '$lib/server/worksheets/worksheet-styles';

/**
 * Load page data for creating new worksheet
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	return {
		user,
		// Le menu « Style » : ceux de Chiphre, puis ceux du prof (lot 3b)
		styles: await listWorksheetStyles(locals.supabase, user.id)
	};
};
