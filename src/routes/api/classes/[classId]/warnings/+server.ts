/**
 * GET /api/classes/[classId]/warnings?period_id=<uuid>
 * Fetch warning counts for all students in a class for a specific period
 *
 * Security:
 * - Requires authentication
 * - Teacher ownership verified via helper function (RLS)
 * - Input validated (classId, period_id query param)
 *
 * Query params:
 * - period_id: string (UUID) - Required
 *
 * Response:
 * - success: boolean
 * - warnings: Record<student_id, StudentWarningCounts>
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClassWarnings } from '$lib/server/warnings';

export const GET: RequestHandler = async ({
	params,
	url,
	locals: { safeGetSession, supabase }
}) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Extract and validate parameters
		const classId = params.classId;
		const periodId = url.searchParams.get('period_id');

		if (!classId) {
			throw error(400, 'Class ID is required');
		}

		if (!periodId) {
			throw error(400, 'Period ID is required (query param: period_id)');
		}

		// Fetch warnings for class (helper verifies teacher ownership)
		const warningsResult = await getClassWarnings({
			classId,
			periodId,
			teacherId: user.id,
			supabase
		});

		// Convert to Map if coming from cache (JSON deserialization converts Map to object)
		const warningsMap =
			warningsResult instanceof Map
				? warningsResult
				: new Map(Object.entries(warningsResult as Record<string, unknown>));

		// Convert Map to plain object for JSON serialization
		const warningsObject: Record<string, unknown> = {};
		for (const [studentId, counts] of warningsMap.entries()) {
			warningsObject[studentId] = counts;
		}

		return json({
			success: true,
			warnings: warningsObject
		});
	} catch (err) {
		console.error('Error fetching class warnings:', err);

		// Re-throw errors with status codes (from helper functions)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors du chargement des avertissements');
	}
};
