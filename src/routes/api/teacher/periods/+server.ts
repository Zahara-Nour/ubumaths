/**
 * Teacher Periods API
 * ===================
 *
 * Endpoint: GET /api/teacher/periods
 * Purpose: Fetch academic periods for teacher's school (cache-friendly)
 *
 * Returns:
 * - currentPeriod: Current active academic period (or null)
 * - allPeriods: All periods for active school year
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	getCurrentAcademicPeriod,
	getSchoolYearPeriods,
	getActiveSchoolYear
} from '$lib/server/warnings';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/teacher/periods/+server');

export const GET: RequestHandler = async ({ locals }) => {
	// SECURITY (finding M5): teacher/admin only (defense in depth over the RPC guard).
	const { profile } = await requireRoles(locals, ['teacher', 'admin']);

	// School check
	const schoolId = profile.school_id;
	if (!schoolId) {
		throw error(400, 'No school associated with profile');
	}

	// Supabase is already available via locals (authenticated)
	const supabase = locals.supabase;

	try {
		// Fetch current period and active year in parallel
		const [period, activeYear] = await Promise.all([
			getCurrentAcademicPeriod({ schoolId, supabase }).catch(() => null),
			getActiveSchoolYear({ schoolId, supabase }).catch(() => null)
		]);

		// Fetch all periods for active year (if exists)
		let allPeriods: unknown[] = [];
		if (activeYear) {
			allPeriods = await getSchoolYearPeriods({
				schoolYearId: activeYear.id,
				supabase
			}).catch(() => []);
		}

		return json({
			currentPeriod: period,
			allPeriods
		});
	} catch (err) {
		logger.error('[API] Failed to load periods:', err);
		throw error(500, 'Failed to load academic periods');
	}
};
