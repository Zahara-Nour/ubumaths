/**
 * Migration Question Detail API
 * ==============================
 *
 * Endpoint: GET /api/migration/questions/[globalIndex]
 *
 * Returns full question data for migration review including:
 * - Original question data
 * - Transformed question template
 * - Transformation errors/warnings
 *
 * Security: Admin only
 * Validation: Zod (globalIndex parameter validated)
 *
 * @module api/migration/questions/[globalIndex]
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { globalIndexSchema } from '$lib/server/validation/migration-review';
import { loadQuestionWithTransform } from '$lib/migration/question-data-loader';

/**
 * GET /api/migration/questions/[globalIndex]
 *
 * Retrieve question data for migration review
 *
 * Path params:
 *   - globalIndex: number (0-632)
 *
 * Response: 200 with question data
 * {
 *   success: true,
 *   data: {
 *     globalIndex: number,
 *     original: QuestionBase,
 *     transformed: QuestionTemplate | null,
 *     transformError: string | null
 *   }
 * }
 *
 * Errors:
 *   - 400: Invalid global index
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: Question not found
 *   - 500: Server error
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	// ✅ SECURITY: Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// ✅ SECURITY: Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	try {
		// ✅ SECURITY: Input validation with Zod
		const globalIndexStr = params.globalIndex;
		const globalIndexNum = parseInt(globalIndexStr, 10);

		if (isNaN(globalIndexNum)) {
			throw error(400, 'Global index must be a valid number');
		}

		const validation = globalIndexSchema.safeParse(globalIndexNum);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const globalIndex = validation.data;

		// Load question with transformation
		const questionData = await loadQuestionWithTransform(globalIndex);

		if (!questionData) {
			throw error(404, `Question with global index ${globalIndex} not found`);
		}

		// Return structured response
		return json({
			success: true,
			data: questionData
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log and return generic error
		console.error('Error loading question:', err);
		throw error(500, 'Failed to load question data');
	}
};
