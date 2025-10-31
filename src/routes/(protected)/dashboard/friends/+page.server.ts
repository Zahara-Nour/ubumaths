/**
 * Friends Page Server Load
 * =========================
 *
 * This page is already protected by the parent (protected)/+layout.server.ts
 * which ensures authentication and loads the user profile.
 *
 * We need to fetch the session here because the WebSocket manager requires
 * an access token for authentication.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Get the session for WebSocket authentication
	const {
		data: { session }
	} = await supabase.auth.getSession();

	return {
		session
	};
};
