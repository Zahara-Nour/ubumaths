/**
 * PUT /api/profile/python-settings
 * =================================
 *
 * Updates the logged-in user's Python playground settings.
 *
 * AUTH: Students + Teachers (must be logged in with one of these roles)
 *
 * REQUEST BODY:
 * {
 *   editorTheme: EditorTheme,  // 'default' | 'oneDark' | 'dracula' | ...
 *   fontSize: number,          // 10-24
 *   showPedagogicErrors: boolean
 * }
 *
 * RESPONSE:
 * {
 *   success: true,
 *   settings: { editorTheme, fontSize, showPedagogicErrors }
 * }
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pythonSettingsSchema } from '$lib/server/validation/python-settings';

export const PUT: RequestHandler = async ({ locals, request }) => {
	const { user, profile, supabase } = locals;

	// Auth check: Must be logged in
	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	// Auth check: Must be student or teacher
	if (profile.role !== 'student' && profile.role !== 'teacher') {
		throw error(403, 'This endpoint is only accessible to students and teachers');
	}

	try {
		// Parse and validate request body
		const body = await request.json();
		const validation = pythonSettingsSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const settings = validation.data;

		// Update profile with new python_settings
		const { error: updateError } = await supabase
			.from('profiles')
			.update({ python_settings: settings })
			.eq('id', user.id);

		if (updateError) {
			console.error('[API] Error updating python settings:', updateError);
			throw error(500, 'Failed to update settings');
		}

		return json({ success: true, settings });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in PUT /api/profile/python-settings:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
