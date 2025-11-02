/**
 * Root Layout Server Load Function
 *
 * AUTHENTICATION FLOW - Step 2 (Server-Side Data Loading):
 * This runs on the server for every page request and provides verified auth data
 * to the client-side layout.
 *
 * FLOW:
 * 1. User and profile are loaded in hooks.server.ts (userProfileHandle)
 * 2. We simply pass them through from locals
 * 3. Also returns cookies needed for client-side Supabase initialization
 *
 * SECURITY:
 * - The session and user are VERIFIED by safeGetSession() via getUser()
 * - Profile is loaded in the server hook with getUserProfile()
 * - This data is safe to use throughout the app
 *
 * USED BY:
 * - +layout.ts (client-side layout) receives this data
 * - All child routes inherit this data via SvelteKit's data flow
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	console.log('🎨 [ROOT LAYOUT] Exécution');

	// ✅ Seulement les cookies Supabase (pour l'initialisation client)
	const supabaseAuthCookies = cookies.getAll().filter((cookie) =>
		cookie.name.startsWith('sb-') // sb-access-token, sb-refresh-token, etc.
	);

	return {
		// User and profile are already loaded in locals by userProfileHandle (hooks.server.ts)
		user: locals.user,
		profile: locals.profile,

		// ✅ Cookies filtrés - ne se réexécute que si cookies Supabase changent
		cookies: supabaseAuthCookies
	};
};
