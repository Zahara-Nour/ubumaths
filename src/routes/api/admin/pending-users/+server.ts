/**
 * Pending Users List API
 * =======================
 *
 * Endpoint: GET /api/admin/pending-users
 *
 * Fetches a paginated list of users with status 'pending'.
 * Teachers and admins can both view pending users.
 *
 * Security: Teacher OR Admin role required
 * Validation: Zod (query parameters)
 *
 * @module api/admin/pending-users
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireRoles } from '$lib/server/middleware/auth';
import type { Database } from '$lib/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ExtendedProfile = Profile & {
	schools?: { name: string } | null;
};

// Query parameters validation schema
const queryParamsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50)
});

/**
 * GET /api/admin/pending-users
 *
 * Get paginated list of pending users
 *
 * Query parameters:
 * - page: number (default 1)
 * - limit: number (default 50, max 100)
 *
 * Response: 200 with users and pagination
 * {
 *   users: ExtendedProfile[],
 *   pagination: {
 *     page: number,
 *     limit: number,
 *     total: number,
 *     totalPages: number
 *   }
 * }
 *
 * Errors:
 *   - 400: Invalid query parameters
 *   - 401: Not authenticated
 *   - 403: Not teacher or admin
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Authentication and authorization: teacher OR admin
	await requireRoles(locals, ['teacher', 'admin']);

	const supabase = locals.supabase;

	// Validate query parameters
	const validation = queryParamsSchema.safeParse({
		page: url.searchParams.get('page') || undefined,
		limit: url.searchParams.get('limit') || undefined
	});

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { page, limit } = validation.data;
	const offset = (page - 1) * limit;

	try {
		// Get total count of pending users
		const { count, error: countError } = await supabase
			.from('profiles')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'pending');

		if (countError) {
			console.error('Error counting pending users:', countError);
			throw error(500, 'Failed to count pending users');
		}

		const total = count ?? 0;
		const totalPages = Math.ceil(total / limit);

		// If no pending users, return empty result
		if (total === 0) {
			return json({
				users: [],
				pagination: {
					page,
					limit,
					total: 0,
					totalPages: 0
				}
			});
		}

		// Fetch pending users with school info
		const { data: users, error: fetchError } = await supabase
			.from('profiles')
			.select(
				`
				*,
				schools (name)
			`
			)
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (fetchError) {
			console.error('Error fetching pending users:', fetchError);
			throw error(500, 'Failed to fetch pending users');
		}

		const extendedProfiles: ExtendedProfile[] = users || [];

		return json({
			users: extendedProfiles,
			pagination: {
				page,
				limit,
				total,
				totalPages
			}
		});
	} catch (err) {
		console.error('Error in GET /api/admin/pending-users:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};
