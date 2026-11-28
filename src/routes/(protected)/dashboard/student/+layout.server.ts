/**
 * Student Dashboard Layout (Server)
 * ==================================
 *
 * Pre-loads student data server-side and returns it for cache hydration.
 *
 * HYDRATION STRATEGY:
 * This layout fetches data on the server (single database query) and passes
 * it to the client. The client layout (+layout.svelte) then hydrates the
 * studentCache with this data, avoiding redundant API calls.
 *
 * WORKFLOW:
 * 1. Server: Fetch rewards (gidouilles + VIP cards) and buddy from database
 * 2. Server: Return them as layout data
 * 3. Client: Hydrate studentCache with server data
 * 4. Child pages: Access cached data instantly (no API calls)
 *
 * DATA LOADED:
 * - Rewards (gidouilles balance + VIP cards)
 * - Buddy (Palotin state, null before the choice quiz)
 *
 * PERFORMANCE:
 * - 2 database queries on server (rewards + buddy)
 * - 0 API calls on client (data already available)
 *
 * ERROR HANDLING:
 * - Non-critical failures (rewards, buddy) don't crash the page
 * - Returns minimal data to ensure dashboard remains functional
 */

import type { LayoutServerLoad } from './$types';
import type { StudentRewards } from '#lib/types/student-cache.ts';
import { asStudentVipCards } from '#lib/types/vip-card.ts';
import { error } from '@sveltejs/kit';
import { toBuddyState } from '#lib/types/buddy.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('(protected)/dashboard/student/+layout.server');

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Must be logged in as student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Accès refusé');
	}

	try {
		// Fetch student rewards
		const { data: rewardsData, error: rewardsError } = await supabase
			.from('profiles')
			.select('gidouilles, bonus, vip_cards')
			.eq('id', user.id)
			.single();

		if (rewardsError) {
			logger.error('[Layout] Error fetching rewards:', rewardsError);
			// Non-critical : pas de valeur de repli (`null`). Le layout la verserait au
			// cache à chaque relecture et effacerait des récompenses connues ; sans
			// elles, l'accueil relit l'API (`studentCache.getRewards()`).
		}

		// Parse VIP cards
		// Le `try/catch` d'origine ne pouvait jamais se déclencher : un cast ne
		// lève rien. La forme est désormais réellement vérifiée.
		const rewards: StudentRewards | null = rewardsData
			? {
					gidouilles: rewardsData.gidouilles || 0,
					bonus: rewardsData.bonus || 0,
					vip_cards: asStudentVipCards(rewardsData.vip_cards)
				}
			: null;

		// Fetch buddy data (may not exist yet if quiz not completed)
		const { data: buddyData, error: buddyDataError } = await supabase
			.from('student_buddies')
			.select('*')
			.eq('student_id', user.id)
			.maybeSingle();

		// Élément de contexte : le repli d'affichage existe déjà, mais son absence
		// ne doit pas se confondre avec une donnée réellement vide.
		if (buddyDataError && buddyDataError.code !== 'PGRST116') {
			logger.error('Contexte illisible :', buddyDataError);
		}

		// Return data for cache hydration on client
		// The +layout.svelte will call studentCache.hydrateRewards(), hydrateBuddy()
		return {
			rewards,
			// `palotin_type` est du texte simple en base : le rétrécir ici évite que
			// chaque consommateur ait à le faire, et garantit un compagnon parlant.
			// La Constance perdue et le retour à fêter sont lus après l'affichage par le
			// composant de présence (GET /api/student/buddy/presence, chantier `palotins`).
			// `undefined` = lecture en échec : le cache garde le Palotin connu
			// (`null` = pas encore de Palotin, versé au cache).
			buddy:
				buddyDataError && buddyDataError.code !== 'PGRST116'
					? undefined
					: buddyData
						? toBuddyState(buddyData)
						: null
		};
	} catch (err) {
		logger.error('[Layout] Unexpected error loading student dashboard:', err);
		// Rien à verser au cache (voir `rewardsError`) : l'accueil relit l'API
		return {
			rewards: null,
			buddy: undefined
		};
	}
};
