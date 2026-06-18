/**
 * Error Detail Page - Server Load & Actions
 */

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getErrorLog, resolveError } from '$lib/server/errorMonitoring';
import { requireAdmin } from '$lib/server/middleware/auth';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;

	// Admin gate (admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

	// Load error log
	const result = await getErrorLog(supabase, id);

	if (!result.success || !result.data) {
		throw error(404, 'Error not found');
	}

	return {
		error: result.data
	};
};

export const actions: Actions = {
	/**
	 * Resolve error action
	 */
	resolve: async ({ params, request, locals }) => {
		const { id } = params;

		// Admin gate (admin login OR step-up elevation)
		const { supabase, adminUserId } = await requireAdmin(locals);

		const formData = await request.formData();
		const notes = formData.get('notes') as string;

		// adminUserId is the acting admin recorded as the resolver (audit).
		const result = await resolveError(supabase, id, adminUserId, notes);

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to resolve error' });
		}

		return { success: true };
	}
};
