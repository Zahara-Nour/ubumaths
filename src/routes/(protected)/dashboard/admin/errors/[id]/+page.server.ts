/**
 * Error Detail Page - Server Load & Actions
 */

import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getErrorLog, resolveError } from '$lib/server/errorMonitoring';
import { loadMonitor } from '$lib/utils/loadTracer';

export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { params } = event;
	const { locals } = event;

	const { id } = params;

	// Check authentication
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(302, '/auth');
	}

	// Check if user is admin
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	// Load error log
	const result = await getErrorLog(locals.supabase, id);

	if (!result.success || !result.data) {
		throw error(404, 'Error not found');
	}

	return {
		error: result.data
});
};

export const actions: Actions = {
	/**
	 * Resolve error action
	 */
	resolve: async ({ params, request, locals }) => {
		const { id } = params;

		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Check if user is admin
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Forbidden - Admin access required' });
		}

		const formData = await request.formData();
		const notes = formData.get('notes') as string;

		const result = await resolveError(locals.supabase, id, user.id, notes);

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to resolve error' });
		}

		return { success: true };
	}
};
