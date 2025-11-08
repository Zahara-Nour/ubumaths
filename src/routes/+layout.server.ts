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
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	console.log('🎨 [ROOT LAYOUT SERVER] Exécution');

	// ✅ Seulement les cookies Supabase (pour l'initialisation client)
	const supabaseAuthCookies = cookies.getAll().filter(
		(cookie) => cookie.name.startsWith('sb-') // sb-access-token, sb-refresh-token, etc.
	);

	// Load VIP card templates from database (for client-side store)
	let vipCardTemplates: VipCardTemplate[] = [];
	try {
		const { data, error } = await locals.supabase
			.from('vip_card_templates')
			.select('*')
			.order('sort_order', { ascending: true });

		if (error) {
			console.error('❌ [ROOT LAYOUT SERVER] Error loading VIP card templates:', error);
		} else {
			vipCardTemplates = (data as VipCardTemplate[]) || [];
			console.log(`✅ [ROOT LAYOUT SERVER] Loaded ${vipCardTemplates.length} VIP card templates`);
		}
	} catch (err) {
		console.error('❌ [ROOT LAYOUT SERVER] Exception loading VIP card templates:', err);
	}

	return {
		// User and profile are already loaded in locals by userProfileHandle (hooks.server.ts)
		user: locals.user,
		profile: locals.profile,

		// ✅ Cookies filtrés - ne se réexécute que si cookies Supabase changent
		cookies: supabaseAuthCookies,

		// VIP card templates for client-side store initialization
		vipCardTemplates
	};
};
