/**
 * Migration Batch Approve API
 * ============================
 *
 * Endpoint: POST /api/migration/batch/approve
 *
 * Approves multiple questions in a single request.
 * Useful for bulk review operations.
 * Currently updates in-memory state (future: database tracking).
 *
 * Security: Admin only
 * Validation: Zod (validates array of globalIndexes with bounds)
 *
 * @module api/migration/batch/approve
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { batchApproveSchema } from '$lib/server/validation/migration-review';
import { loadQuestionWithTransform, getQuestionCount } from '$lib/migration/question-data-loader';

/**
 * POST /api/migration/batch/approve
 *
 * Approve multiple questions at once
 *
 * Request body:
 * {
 *   globalIndexes: number[]  // Array of global indices (1-100 questions, each 0-632)
 * }
 *
 * Response: 200 with batch approval results
 * {
 *   success: true,
 *   message: "Batch approval completed",
 *   data: {
 *     approved: number[],         // Successfully approved indices
 *     failed: Array<{             // Failed approvals with reasons
 *       globalIndex: number,
 *       reason: string
 *     }>,
 *     approvedBy: string,         // User ID
 *     approvedAt: string          // ISO timestamp
 *   }
 * }
 *
 * Errors:
 *   - 400: Invalid body or validation error
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 500: Server error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// ✅ SECURITY: Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// ✅ SECURITY: Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	try {
		// ✅ SECURITY: Validate request body with Zod
		const body = await request.json();
		const bodyValidation = batchApproveSchema.safeParse(body);

		if (!bodyValidation.success) {
			throw error(400, bodyValidation.error.issues[0].message);
		}

		const { globalIndexes } = bodyValidation.data;

		// Get total question count for validation
		const totalQuestions = await getQuestionCount();

		// Track results
		const approved: number[] = [];
		const failed: Array<{ globalIndex: number; reason: string }> = [];

		// Process each question
		for (const globalIndex of globalIndexes) {
			try {
				// Verify index is within bounds
				if (globalIndex < 0 || globalIndex >= totalQuestions) {
					failed.push({
						globalIndex,
						reason: `Global index ${globalIndex} is out of bounds (0-${totalQuestions - 1})`
					});
					continue;
				}

				// Load and validate transformation
				const questionData = await loadQuestionWithTransform(globalIndex);

				if (!questionData) {
					failed.push({
						globalIndex,
						reason: 'Question not found'
					});
					continue;
				}

				// Check if transformation was successful
				if (!questionData.transformed) {
					failed.push({
						globalIndex,
						reason: `Transformation failed: ${questionData.transformError || 'Unknown error'}`
					});
					continue;
				}

				// TODO: Phase 4 - Store approval in database
				// For now, just track success
				approved.push(globalIndex);
			} catch (err) {
				failed.push({
					globalIndex,
					reason: err instanceof Error ? err.message : 'Unknown error'
				});
			}
		}

		// Return batch results
		return json({
			success: true,
			message: 'Batch approval completed',
			data: {
				approved,
				failed,
				approvedBy: locals.profile.id,
				approvedAt: new Date().toISOString(),
				summary: {
					total: globalIndexes.length,
					successCount: approved.length,
					failureCount: failed.length
				}
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log and return generic error
		console.error('Error in batch approval:', err);
		throw error(500, 'Failed to process batch approval');
	}
};
