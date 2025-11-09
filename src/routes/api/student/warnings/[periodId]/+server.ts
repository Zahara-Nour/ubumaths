/**
 * GET /api/student/warnings/[periodId]
 * ======================================
 *
 * Returns the logged-in student's warnings for a specific academic period.
 *
 * AUTH: Student only (must be logged in)
 *
 * NOTE: Currently students cannot view their own warnings in the UI.
 * This endpoint structure is ready for when/if this feature is added.
 *
 * RESPONSE:
 * {
 *   warnings: StudentWarnings
 * }
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { StudentWarnings } from '$lib/types/student-cache';
import type { Warning, WarningType, StudentWarningCounts } from '$lib/server/warnings';
import { z } from 'zod';

// Zod schema for periodId validation
const periodIdSchema = z.string().uuid();

export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile, supabaseServer } = await locals.safeGetSession();

	// Auth check: Must be logged in
	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	// Auth check: Must be a student
	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	// Validate periodId parameter
	const periodIdValidation = periodIdSchema.safeParse(params.periodId);
	if (!periodIdValidation.success) {
		throw error(400, 'Invalid period ID format');
	}
	const periodId = periodIdValidation.data;

	try {
		// Fetch warnings for the student in this period
		const { data: warningsData, error: fetchError } = await supabaseServer
			.from('student_warnings')
			.select('*')
			.eq('student_id', user.id)
			.eq('academic_period_id', periodId)
			.order('created_at', { ascending: false });

		if (fetchError) {
			console.error('[API] Error fetching student warnings:', fetchError);
			throw error(500, 'Failed to fetch warnings');
		}

		// Transform database rows to Warning objects
		const warnings: Warning[] = (warningsData || []).map((row) => ({
			id: row.id,
			student_id: row.student_id,
			class_id: row.class_id,
			academic_period_id: row.academic_period_id,
			warning_type: row.warning_type as WarningType,
			created_by: row.created_by,
			created_at: row.created_at,
			updated_at: row.updated_at
		}));

		// Calculate warning counts by type
		const counts: StudentWarningCounts = {
			C: 0,
			M: 0,
			R: 0,
			T: 0
		};

		warnings.forEach((warning) => {
			if (warning.warning_type in counts) {
				counts[warning.warning_type]++;
			}
		});

		const studentWarnings: StudentWarnings = {
			counts,
			warnings
		};

		return json({ warnings: studentWarnings });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/warnings/[periodId]:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
