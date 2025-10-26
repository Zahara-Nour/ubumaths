/**
 * Test Mode API Endpoint
 * =======================
 *
 * Handles updating teacher's test mode preference.
 * Called when teacher toggles test mode in UI.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setTeacherTestMode } from '$lib/server/test-mode';

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const { enabled } = await request.json();

		if (typeof enabled !== 'boolean') {
			throw error(400, 'Invalid request body');
		}

		// Update test mode preference in database
		const success = await setTeacherTestMode(user.id, enabled, supabase);

		if (!success) {
			throw error(500, 'Failed to update test mode preference');
		}

		return json({ success: true, enabled });
	} catch (err) {
		console.error('Error updating test mode:', err);
		throw error(500, 'Failed to update test mode');
	}
};
