/**
 * Error Detail Page - Server Load & Actions
 */

import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getErrorLog, resolveError } from '$lib/server/errorMonitoring';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;

	// Check authentication
	const session = await locals.safeGetSession();
	if (!session) {
		throw redirect(302, '/auth');
	}

	// Check if user is admin
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', session.user.id)
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
	};
};

export const actions: Actions = {
	/**
	 * Resolve error action
	 */
	resolve: async ({ params, request, locals }) => {
		const { id } = params;

		const session = await locals.safeGetSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Check if user is admin
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', session.user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { error: 'Forbidden - Admin access required' });
		}

		const formData = await request.formData();
		const notes = formData.get('notes') as string;

		const result = await resolveError(locals.supabase, id, session.user.id, notes);

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to resolve error' });
		}

		return { success: true };
	}
};
