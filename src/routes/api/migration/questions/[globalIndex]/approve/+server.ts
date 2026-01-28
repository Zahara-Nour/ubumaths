/**
 * Migration Question Approve API
 * ================================
 *
 * Endpoint: POST /api/migration/questions/[globalIndex]/approve
 *
 * Marks a question as approved during migration review.
 * Persists the approval status to the migration_tracking table.
 *
 * Security: Admin only
 * Validation: Zod (globalIndex and body validated)
 *
 * @module api/migration/questions/[globalIndex]/approve
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { globalIndexSchema, approveQuestionSchema } from '$lib/server/validation/migration-review';
import {
	loadQuestionWithTransform,
	isValidGlobalIndex,
	loadQuestionByIndex
} from '$lib/migration/question-data-loader';
import { MigrationStateManager } from '$lib/server/migration/state-manager';
import { generateStableQuestionHash } from '$lib/server/migration/hash-utils';

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

		// Load original question for hash generation
		const originalQuestion = await loadQuestionByIndex(globalIndex);
		if (!originalQuestion) {
			throw error(404, `Original question not found for index ${globalIndex}`);
		}

		// Generate hash from original question to check for edits
		const questionHash = generateStableQuestionHash(originalQuestion);

		// Check if there's an edited version of this question
		let editedJson: unknown = null;
		const { data: editData } = await locals.supabase
			.from('migration_edits')
			.select('edited_json')
			.eq('old_question_hash', questionHash)
			.single();

		if (editData?.edited_json) {
			editedJson = editData.edited_json;
		}

		// Persist approval to database using MigrationStateManager
		const stateManager = new MigrationStateManager();
		await stateManager.init(locals.supabase);

		await stateManager.recordQuestionProcessed(
			globalIndex,
			'validated', // status
			4, // phase 4 = validation
			originalQuestion,
			{
				notes: notes || undefined,
				// Store whether we used an edited version
				...(editedJson && { editedJson })
			}
		);

		const approvalData = {
			globalIndex,
			approved: true,
			approvedBy: locals.profile.id,
			approvedAt: new Date().toISOString(),
			usedEditedVersion: !!editedJson,
			...(notes && { notes })
		};

		return json({
			success: true,
			message: editedJson ? 'Question approved (with edits)' : 'Question approved',
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
