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
import { asVipCardAction } from '$lib/types/vip-card';
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	console.log('🎨 [ROOT LAYOUT SERVER] Exécution');

	// ✅ Seulement les cookies Supabase (pour l'initialisation client)
	const supabaseAuthCookies = cookies.getAll().filter(
		(cookie) => cookie.name.startsWith('sb-') // sb-access-token, sb-refresh-token, etc.
	);

	// Catalogue des cartes VIP (store client) : lu seulement avec une session.
	// Le visiteur n'a aucun droit sur `vip_card_templates` : l'interroger sans
	// connexion ne rendrait rien, à chaque page vue.
	let vipCardTemplates: VipCardTemplate[] = [];
	if (locals.user) {
		vipCardTemplates = await loadVipCardTemplates(locals.supabase);
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

/** Catalogue complet ; une erreur est journalisée et rend un tableau vide. */
async function loadVipCardTemplates(supabase: App.Locals['supabase']): Promise<VipCardTemplate[]> {
	try {
		const { data, error } = await supabase
			.from('vip_card_templates')
			.select('*')
			.order('sort_order', { ascending: true });

		if (error) {
			console.error('❌ [ROOT LAYOUT SERVER] Error loading VIP card templates:', error);
			return [];
		}
		// Le store conserve la ligne telle quelle et ne rétrécit que `action`,
		// colonne jsonb : c'est son contrat, distinct du type d'administration.
		const templates = (data ?? []).map((row) => ({
			...row,
			action: asVipCardAction(row.action)
		}));
		console.log(`✅ [ROOT LAYOUT SERVER] Loaded ${templates.length} VIP card templates`);
		return templates;
	} catch (err) {
		console.error('❌ [ROOT LAYOUT SERVER] Exception loading VIP card templates:', err);
		return [];
	}
}
