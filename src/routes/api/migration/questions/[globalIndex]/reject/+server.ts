/**
 * Migration Question Reject API
 * ===============================
 *
 * Endpoint: POST /api/migration/questions/[globalIndex]/reject
 *
 * Marks a question as rejected during migration review.
 * Requires a rejection reason.
 * Currently updates in-memory state (future: database tracking).
 *
 * Security: Admin only
 * Validation: Zod (globalIndex and body validated)
 *
 * @module api/migration/questions/[globalIndex]/reject
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { globalIndexSchema, rejectQuestionSchema } from '$lib/server/validation/migration-review';
import { isValidGlobalIndex } from '$lib/migration/question-data-loader';

/**
 * POST /api/migration/questions/[globalIndex]/reject
 *
 * Reject a question from migration
 *
 * Path params:
 *   - globalIndex: number (0-632)
 *
 * Request body:
 * {
 *   reason: string  // Required rejection reason (1-1000 chars)
 * }
 *
 * Response: 200 with rejection confirmation
 * {
 *   success: true,
 *   message: "Question rejected",
 *   data: {
 *     globalIndex: number,
 *     rejected: true,
 *     rejectedBy: string,  // User ID
 *     rejectedAt: string,  // ISO timestamp
 *     reason: string
 *   }
 * }
 *
 * Errors:
 *   - 400: Invalid global index, missing reason, or validation error
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Question not found
 *   - 500: Server error
 */
export const POST: RequestHandler = async ({ request, locals, params }) => {
	// ✅ SECURITY: Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// ✅ SECURITY: Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	try {
		// ✅ SECURITY: Validate globalIndex parameter
		const globalIndexStr = params.globalIndex;
		const globalIndexNum = parseInt(globalIndexStr, 10);

		if (isNaN(globalIndexNum)) {
			throw error(400, 'Global index must be a valid number');
		}

		const indexValidation = globalIndexSchema.safeParse(globalIndexNum);

		if (!indexValidation.success) {
			throw error(400, indexValidation.error.issues[0].message);
		}

		const globalIndex = indexValidation.data;

		// ✅ SECURITY: Validate request body with Zod
		const body = await request.json();
		const bodyValidation = rejectQuestionSchema.safeParse(body);

		if (!bodyValidation.success) {
			throw error(400, bodyValidation.error.issues[0].message);
		}

		const { reason } = bodyValidation.data;

		// Verify question exists
		const questionExists = await isValidGlobalIndex(globalIndex);

		if (!questionExists) {
			throw error(404, `Question with global index ${globalIndex} not found`);
		}

		// TODO: Phase 4 - Store rejection in database (migration_tracking table)
		// For now, we'll just return success
		// Future implementation will:
		// 1. Update migration_tracking.migration_status = 'failed'
		// 2. Add rejection reason to conversion_errors array
		// 3. Set migration_tracking.updated_at = NOW()

		const rejectionData = {
			globalIndex,
			rejected: true,
			rejectedBy: locals.profile.id,
			rejectedAt: new Date().toISOString(),
			reason
		};

		return json({
			success: true,
			message: 'Question rejected',
			data: rejectionData
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log and return generic error
		console.error('Error rejecting question:', err);
		throw error(500, 'Failed to reject question');
	}
};
