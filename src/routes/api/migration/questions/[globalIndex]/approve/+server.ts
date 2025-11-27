/**
 * Migration Question Approve API
 * ================================
 *
 * Endpoint: POST /api/migration/questions/[globalIndex]/approve
 *
 * Marks a question as approved during migration review.
 * Currently updates in-memory state (future: database tracking).
 *
 * Security: Admin only
 * Validation: Zod (globalIndex and body validated)
 *
 * @module api/migration/questions/[globalIndex]/approve
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { globalIndexSchema, approveQuestionSchema } from '$lib/server/validation/migration-review';
import { loadQuestionWithTransform, isValidGlobalIndex } from '$lib/migration/question-data-loader';

/**
 * POST /api/migration/questions/[globalIndex]/approve
 *
 * Approve a question for migration
 *
 * Path params:
 *   - globalIndex: number (0-632)
 *
 * Request body:
 * {
 *   notes?: string  // Optional approval notes (max 1000 chars)
 * }
 *
 * Response: 200 with approval confirmation
 * {
 *   success: true,
 *   message: "Question approved",
 *   data: {
 *     globalIndex: number,
 *     approved: true,
 *     approvedBy: string,  // User ID
 *     approvedAt: string,  // ISO timestamp
 *     notes?: string
 *   }
 * }
 *
 * Errors:
 *   - 400: Invalid global index or body
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
		const bodyValidation = approveQuestionSchema.safeParse(body);

		if (!bodyValidation.success) {
			throw error(400, bodyValidation.error.issues[0].message);
		}

		const { notes } = bodyValidation.data;

		// Verify question exists
		const questionExists = await isValidGlobalIndex(globalIndex);

		if (!questionExists) {
			throw error(404, `Question with global index ${globalIndex} not found`);
		}

		// Load question to verify it can be transformed
		const questionData = await loadQuestionWithTransform(globalIndex);

		if (!questionData) {
			throw error(404, `Question with global index ${globalIndex} not found`);
		}

		// Check if transformation was successful
		if (!questionData.transformed) {
			throw error(
				400,
				`Cannot approve question with transformation errors: ${questionData.transformError || 'Unknown error'}`
			);
		}

		// TODO: Phase 4 - Store approval in database (migration_tracking table)
		// For now, we'll just return success
		// Future implementation will:
		// 1. Update migration_tracking.migration_status = 'validated'
		// 2. Set migration_tracking.validated_at = NOW()
		// 3. Store approval notes in a new field

		const approvalData = {
			globalIndex,
			approved: true,
			approvedBy: locals.profile.id,
			approvedAt: new Date().toISOString(),
			...(notes && { notes })
		};

		return json({
			success: true,
			message: 'Question approved',
			data: approvalData
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log and return generic error
		console.error('Error approving question:', err);
		throw error(500, 'Failed to approve question');
	}
};
