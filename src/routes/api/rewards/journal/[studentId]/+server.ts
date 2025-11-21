/**
 * Teacher Reward Journal API Endpoint
 *
 * GET /api/rewards/journal/[studentId]
 *
 * Returns paginated reward events for a specific student.
 * Teachers can only view events for students they teach.
 * Admins can view events for any student.
 *
 * Path Parameters:
 * - studentId: UUID of the student to retrieve events for
 *
 * Query Parameters:
 * - reward_type (optional): 'gidouilles' | 'bonus' | 'vip_card' | 'achievement' | 'item'
 * - event_type (optional): 'earned' | 'spent' | 'traded' | 'used' | 'expired' | 'unlocked' | 'purchased' | 'awarded' | 'removed'
 * - from (optional): ISO date string for start date filter
 * - to (optional): ISO date string for end date filter
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 20, max: 100)
 *
 * Response:
 * {
 *   events: RewardEvent[],
 *   pagination: { page, limit, total, totalPages, hasMore }
 * }
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import {
	rewardJournalQuerySchema,
	studentIdParamSchema
} from '$lib/server/validation/reward-journal';
import type { RewardEvent, RewardJournalResponse } from '$lib/types/reward-journal';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Require teacher or admin authentication
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;

	// Validate studentId path parameter
	const paramValidation = studentIdParamSchema.safeParse(params);

	if (!paramValidation.success) {
		throw error(400, paramValidation.error.issues[0].message);
	}

	const { studentId } = paramValidation.data;

	// Verify teacher-student relationship (admins bypass this check)
	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);

	if (!hasAccess) {
		throw error(403, 'Vous ne pouvez consulter que le journal de vos propres élèves');
	}

	// Parse and validate query parameters
	const rawParams = {
		reward_type: url.searchParams.get('reward_type') ?? undefined,
		event_type: url.searchParams.get('event_type') ?? undefined,
		from: url.searchParams.get('from') ?? undefined,
		to: url.searchParams.get('to') ?? undefined,
		page: url.searchParams.get('page') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	};

	const validation = rewardJournalQuerySchema.safeParse(rawParams);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { reward_type, event_type, from, to, page, limit } = validation.data;

	try {
		// Build the query for the specific student
		// Note: Uses user session with RLS. Teachers can only see events with class_id
		// that they teach. Events without class_id are not visible to teachers via RLS.
		// The verifyTeacherStudentWithRole middleware above provides the primary authorization.
		let query = supabase
			.from('reward_events')
			.select('*', { count: 'exact' })
			.eq('student_id', studentId)
			.order('created_at', { ascending: false });

		// Apply filters
		if (reward_type) {
			query = query.eq('reward_type', reward_type);
		}

		if (event_type) {
			query = query.eq('event_type', event_type);
		}

		if (from) {
			query = query.gte('created_at', from);
		}

		if (to) {
			query = query.lte('created_at', to);
		}

		// Apply pagination
		const offset = (page - 1) * limit;
		query = query.range(offset, offset + limit - 1);

		// Execute query
		const { data: events, count, error: queryError } = await query;

		if (queryError) {
			console.error('[RewardJournal/Teacher] Query error:', queryError);
			throw error(500, 'Erreur lors de la récupération du journal des récompenses');
		}

		// Calculate pagination metadata
		const total = count ?? 0;
		const totalPages = Math.ceil(total / limit);
		const hasMore = page < totalPages;

		const response: RewardJournalResponse = {
			events: (events as RewardEvent[]) ?? [],
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasMore
			}
		};

		return json(response);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[RewardJournal/Teacher] Unexpected error:', err);
		throw error(500, 'Erreur interne du serveur');
	}
};
