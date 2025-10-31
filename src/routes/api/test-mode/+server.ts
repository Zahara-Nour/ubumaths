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
import { testModeSchema } from '$lib/server/validation/common';
import { requireAuth } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		// ✅ SECURITY: Validate request body with Zod
		const validation = testModeSchema.safeParse(await request.json());
		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { enabled } = validation.data;

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
