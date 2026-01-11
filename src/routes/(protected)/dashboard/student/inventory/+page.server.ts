/**
 * Student Inventory Page - Server Load
 * =====================================
 *
 * Loads student's complete inventory with:
 * - All available VIP card templates
 * - Student's currently owned cards
 * - Student's card history (used/exchanged cards)
 *
 * Future: Will include other item types when inventory system is expanded.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import type { VipCardInstance, StudentVipCards } from '$lib/types/vip-card';
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';

/**
 * Represents the complete collection status for a single card template
 */
export interface CardCollectionStatus {
	template: VipCardTemplate;
	ownedInstances: VipCardInstance[]; // Currently owned instances
	historyCount: number; // Total times card was obtained (including used/exchanged)
	firstEarnedAt: string | null; // First time card was ever obtained
	lastEarnedAt: string | null; // Most recent time card was obtained
	hasActiveInstance: boolean; // Has at least one unused instance
	hasPendingRequest: boolean; // Has pending activation request
}

export const load: PageServerLoad = async ({ locals }) => {
	// Require student authentication
	const { user } = await requireRole(locals, 'student');
	const supabase = locals.supabase;

	// Fetch all enabled VIP card templates
	const { data: templates, error: templatesError } = await supabase
		.from('vip_card_templates')
		.select('*')
		.eq('is_enabled', true)
		.order('sort_order', { ascending: true });

	if (templatesError) {
		console.error('[inventory] Error fetching templates:', templatesError);
		return {
			studentId: user.id,
			templates: [],
			ownedCards: {},
			collectionData: {},
			collectionStats: {
				totalCards: 0,
				ownedCards: 0,
				historyCards: 0,
				neverObtainedCards: 0
			}
		};
	}

	// Fetch student's profile with vip_cards
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', user.id)
		.single();

	if (profileError) {
		console.error('[inventory] Error fetching profile:', profileError);
		return {
			studentId: user.id,
			templates: templates || [],
			ownedCards: {},
			collectionData: {},
			collectionStats: {
				totalCards: templates?.length || 0,
				ownedCards: 0,
				historyCards: 0,
				neverObtainedCards: templates?.length || 0
			}
		};
	}

	// Parse vip_cards JSONB field
	const vipCards = (profile.vip_cards || {}) as unknown as StudentVipCards;

	// Build collection data for each template
	const collectionData: Record<string, CardCollectionStatus> = {};
	let ownedCount = 0;
	let historyOnlyCount = 0;

	templates?.forEach((template) => {
		const cardInstances = Object.entries(vipCards).filter(
			([_, instance]) => instance.cardId === template.id
		);

		// Separate active (unused) instances from used instances
		const activeInstances = cardInstances
			.filter(([_, instance]) => !instance.usedAt)
			.map(([_, instance]) => instance);

		const usedInstances = cardInstances.filter(([_, instance]) => instance.usedAt);

		// Check if any active instance has pending activation request
		const hasPendingRequest = activeInstances.some(
			(instance) => instance.activationRequestedAt && !instance.usedAt
		);

		// Find earliest and latest earned times (from all instances)
		const allEarnedTimes = cardInstances.map(([_, instance]) => instance.earnedAt);
		const firstEarnedAt = allEarnedTimes.length > 0 ? allEarnedTimes.sort()[0] : null;
		const lastEarnedAt = allEarnedTimes.length > 0 ? allEarnedTimes.sort().reverse()[0] : null;

		collectionData[template.id] = {
			template,
			ownedInstances: activeInstances,
			historyCount: usedInstances.length,
			firstEarnedAt,
			lastEarnedAt,
			hasActiveInstance: activeInstances.length > 0,
			hasPendingRequest
		};

		// Update counts
		if (activeInstances.length > 0) {
			ownedCount++;
		} else if (usedInstances.length > 0) {
			historyOnlyCount++;
		}
	});

	const neverObtainedCount = (templates?.length || 0) - ownedCount - historyOnlyCount;

	return {
		studentId: user.id,
		templates: templates || [],
		ownedCards: vipCards,
		collectionData,
		collectionStats: {
			totalCards: templates?.length || 0,
			ownedCards: ownedCount,
			historyCards: historyOnlyCount,
			neverObtainedCards: neverObtainedCount
		}
	};
};
