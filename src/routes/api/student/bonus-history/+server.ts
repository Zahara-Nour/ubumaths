/**
 * GET /api/student/bonus-history
 * ==============================
 *
 * Returns the logged-in student's bonus history (earned, used, removed).
 *
 * AUTH: Student only (must be logged in)
 *
 * QUERY PARAMS:
 * - limit: number (1-100, default 50) - max entries to return
 *
 * RESPONSE:
 * {
 *   history: BonusHistoryEntry[]
 * }
 *
 * Each entry contains:
 * - id: string - unique identifier
 * - delta: number - positive for earned, negative for used/removed
 * - reason: string | null - description of the bonus change
 * - created_at: string - ISO timestamp
 * - created_by_name: string | null - name of teacher who made the change
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// Validation schema for query parameters
const getBonusHistorySchema = z.object({
	limit: z.coerce.number().int().positive().max(100).default(50)
});

export interface BonusHistoryEntry {
	id: string;
	delta: number;
	reason: string | null;
	created_at: string;
	created_by_name: string | null;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, profile, supabase } = locals;

	// Auth check: Must be logged in
	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	// Auth check: Must be a student
	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	// Validate query parameters
	const validation = getBonusHistorySchema.safeParse({
		limit: url.searchParams.get('limit') ?? 50
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { limit } = validation.data;

	try {
		// Fetch bonus history with creator's name
		// Using left join to get creator's display_name
		const { data: historyData, error: fetchError } = await supabase
			.from('bonus_history')
			.select(
				`
				id,
				delta,
				reason,
				created_at,
				created_by,
				creator:profiles!bonus_history_created_by_fkey(full_name)
			`
			)
			.eq('student_id', user.id)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (fetchError) {
			console.error('[API] Error fetching bonus history:', fetchError);
			throw error(500, 'Failed to fetch bonus history');
		}

		// Transform data to include creator name
		// Note: Supabase returns the joined table as an array, take first element
		const history: BonusHistoryEntry[] = (historyData || []).map((entry) => {
			// Handle the joined creator data (Supabase returns array for joins)
			const creator = Array.isArray(entry.creator) ? entry.creator[0] : entry.creator;
			return {
				id: entry.id,
				delta: entry.delta,
				reason: entry.reason,
				created_at: entry.created_at,
				created_by_name: creator?.full_name ?? null
			};
		});

		return json({ history });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/bonus-history:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
