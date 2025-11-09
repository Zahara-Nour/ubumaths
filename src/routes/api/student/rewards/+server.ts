/**
 * GET /api/student/rewards
 * =========================
 *
 * Returns the logged-in student's rewards (gidouilles + VIP cards).
 *
 * AUTH: Student only (must be logged in)
 *
 * CACHING:
 * - Called automatically by studentCache.getRewards() on cache miss
 * - Can also be hydrated from +layout.server.ts to avoid this API call
 * - Cache TTL: 10 minutes (rewards change frequently)
 * - Supports optimistic updates for instant UI feedback
 *
 * RESPONSE:
 * {
 *   rewards: {
 *     gidouilles: number,
 *     vip_cards: {
 *       [instanceId: string]: {
 *         cardId: string,
 *         earnedAt: string,
 *         usedAt: string | null
 *       }
 *     }
 *   }
 * }
 *
 * USAGE:
 * ```typescript
 * // Auto-fetch via cache (recommended)
 * const rewards = await studentCache.getRewards();
 *
 * // With optimistic updates
 * studentCache.updateGidouillesOptimistic(+5);
 * await updateServerAPI(+5);
 * studentCache.invalidateRewards();
 * await studentCache.getRewards(); // Sync with server
 * ```
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { StudentRewards } from '$lib/types/student-cache';
import type { StudentVipCards } from '$lib/types/vip-card';

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Auth check: Must be logged in
	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	// Auth check: Must be a student
	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	try {
		// Fetch student rewards from profiles table
		const { data: studentData, error: fetchError } = await supabase
			.from('profiles')
			.select('gidouilles, vip_cards')
			.eq('id', user.id)
			.single();

		if (fetchError) {
			console.error('[API] Error fetching student rewards:', fetchError);
			throw error(500, 'Failed to fetch student rewards');
		}

		if (!studentData) {
			throw error(404, 'Student profile not found');
		}

		// Parse VIP cards (JSONB field)
		let vipCards: StudentVipCards = {};
		if (studentData.vip_cards) {
			try {
				// vip_cards is already parsed as object by Supabase
				vipCards = studentData.vip_cards as StudentVipCards;
			} catch (parseError) {
				console.error('[API] Error parsing VIP cards:', parseError);
				vipCards = {};
			}
		}

		const rewards: StudentRewards = {
			gidouilles: studentData.gidouilles || 0,
			vip_cards: vipCards
		};

		return json({ rewards });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/rewards:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
