/**
 * API Route: /api/errors/bulk-resolve
 * POST - Bulk resolve error reports based on filters
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getErrorOccurrences,
	resolveErrorBySignature,
	type ErrorFilters
} from '$lib/server/errorMonitoring';
import { bulkResolveErrorsSchema } from '$lib/server/validation/errors';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * POST /api/errors/bulk-resolve
 * Bulk resolve errors matching the specified filters (admin only)
 *
 * Request body:
 * - error_type: Filter by error type (optional)
 * - severity: Filter by severity level (optional)
 * - resolved: Filter by resolution status (optional)
 * - user_id: Filter by user ID (optional)
 * - date_from: Filter by start date (optional)
 * - date_to: Filter by end date (optional)
 * - search: Search in error messages (optional)
 * - notes: Resolution notes to add (optional)
 *
 * At least one filter parameter must be specified to prevent accidentally
 * resolving all errors in the system.
 *
 * Response:
 * {
 *   success: true,
 *   resolved_count: number,      // Total error_logs resolved across all occurrences
 *   affected_occurrences: number // Number of unique error signatures resolved
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireRole(locals, 'admin');

	try {
		// SECURITY: Validate request body with Zod schema
		const body = await request.json();
		const validation = bulkResolveErrorsSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { notes, ...filterParams } = validation.data;

		// Build ErrorFilters object (excluding 'notes' which is not a filter)
		const filters: Omit<ErrorFilters, 'limit' | 'offset'> = {
			error_type: filterParams.error_type,
			severity: filterParams.severity,
			resolved: filterParams.resolved,
			user_id: filterParams.user_id,
			date_from: filterParams.date_from,
			date_to: filterParams.date_to,
			search: filterParams.search
		};

		// Fetch all error occurrences matching the filters
		const occurrencesResult = await getErrorOccurrences(locals.supabase, filters);

		if (!occurrencesResult.success) {
			throw error(500, occurrencesResult.error || 'Failed to fetch error occurrences');
		}

		const occurrences = occurrencesResult.data || [];

		// If no occurrences match, return early with zero counts
		if (occurrences.length === 0) {
			return json({
				success: true,
				resolved_count: 0,
				affected_occurrences: 0
			});
		}

		// Resolve each occurrence by signature
		let totalResolvedCount = 0;
		let affectedOccurrences = 0;

		for (const occurrence of occurrences) {
			const resolveResult = await resolveErrorBySignature(
				locals.supabase,
				occurrence.error_signature,
				user.id,
				notes
			);

			if (resolveResult.success && resolveResult.count !== undefined) {
				totalResolvedCount += resolveResult.count;
				affectedOccurrences++;
			} else {
				// Log the error but continue processing other occurrences
				console.error(
					`Failed to resolve error signature ${occurrence.error_signature}:`,
					resolveResult.error
				);
			}
		}

		return json({
			success: true,
			resolved_count: totalResolvedCount,
			affected_occurrences: affectedOccurrences
		});
	} catch (err) {
		// Re-throw SvelteKit errors (400, 500, etc.)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Error in POST /api/errors/bulk-resolve:', err);
		throw error(500, 'Internal server error');
	}
};
