/**
 * POST /api/cache/refresh-warnings
 *
 * Teacher-accessible endpoint to invalidate their own warnings cache.
 * Forces fresh data load from database on next request.
 *
 * Query Parameters:
 * - classId: UUID of class (required)
 * - periodId: UUID of academic period (optional)
 *
 * Response:
 * - success: boolean
 * - message: string
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	invalidateWarningsCache,
	invalidateAllClassWarningsCaches
} from '$lib/server/cache/warnings';

export const POST: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Authentication required');
	}

	const classId = url.searchParams.get('classId');
	const periodId = url.searchParams.get('periodId');

	if (!classId) {
		throw error(400, 'Missing classId parameter');
	}

	// Verify teacher owns this class
	const { data: classCheck, error: classError } = await supabase
		.from('classes')
		.select('id')
		.eq('id', classId)
		.eq('teacher_id', user.id)
		.maybeSingle();

	if (classError) {
		throw error(500, 'Failed to verify class ownership');
	}

	if (!classCheck) {
		throw error(403, 'You do not have permission to refresh cache for this class');
	}

	try {
		if (periodId) {
			// Invalidate specific class+period
			await invalidateWarningsCache(classId, periodId);
			console.log(
				`[Cache Refresh] Teacher ${user.id} invalidated warnings cache: class=${classId}, period=${periodId}`
			);
			return json({
				success: true,
				message: 'Warnings cache refreshed successfully'
			});
		} else {
			// Invalidate all periods for this class
			await invalidateAllClassWarningsCaches(classId);
			console.log(
				`[Cache Refresh] Teacher ${user.id} invalidated all warnings caches for class: ${classId}`
			);
			return json({
				success: true,
				message: 'All warnings caches refreshed successfully'
			});
		}
	} catch (err) {
		console.error('[Cache Refresh] Error:', err);
		throw error(500, 'Failed to refresh cache');
	}
};
