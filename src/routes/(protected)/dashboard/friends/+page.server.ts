/**
 * Friends Page Server Load
 * =========================
 *
 * This page is already protected by the parent (protected)/+layout.server.ts
 * which ensures authentication and loads the user profile.
 *
 * We need to fetch the user and session here because the WebSocket manager requires
 * an access token for authentication.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Get verified user first (validates with Supabase Auth server)
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser();

	if (userError || !user) {
		// This should not happen because parent layout already verified auth
		// but we handle it defensively
		return {
			accessToken: null
		};
	}

	// Now get the session for WebSocket authentication (safe after verification)
	// We only extract the access_token to avoid the security warning
	const {
		data: { session }
	} = await supabase.auth.getSession();

	return {
		accessToken: session?.access_token ?? null
	};
};
