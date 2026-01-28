/**
 * Migration Question Edit API
 * ============================
 *
 * Endpoint: POST /api/migration/questions/[globalIndex]/edit
 *
 * Saves an edited version of a transformed question.
 * The edit is stored in the migration_edits table and will be used
 * when the question is approved instead of the auto-transformed version.
 *
 * Security: Admin only
 * Validation: Zod (globalIndex and body validated)
 *
 * @module api/migration/questions/[globalIndex]/edit
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { globalIndexSchema, saveEditSchema } from '$lib/server/validation/migration-review';
import { isValidGlobalIndex, loadQuestionByIndex } from '$lib/migration/question-data-loader';
import { generateStableQuestionHash } from '$lib/server/migration/hash-utils';

/**
 * POST /api/migration/questions/[globalIndex]/edit
 *
 * Save an edit to a question
 *
 * Path params:
 *   - globalIndex: number (0-632)
 *
 * Request body:
 * {
 *   editedTransformed: QuestionTemplate,  // Edited version of the transformed question
 *   notes?: string                        // Optional edit notes (max 2000 chars)
 * }
 *
 * Response: 200 with save confirmation
 * {
 *   success: true,
 *   message: "Edit saved",
 *   data: {
 *     globalIndex: number,
 *     editId: string,       // UUID of the edit record
 *     editedBy: string,     // User ID
 *     editedAt: string      // ISO timestamp
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
	// SECURITY: Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// SECURITY: Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	try {
		// SECURITY: Validate globalIndex parameter
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

		// SECURITY: Validate request body with Zod
		const body = await request.json();
		const bodyValidation = saveEditSchema.safeParse(body);

		if (!bodyValidation.success) {
			throw error(400, bodyValidation.error.issues[0].message);
		}

		const { editedTransformed, notes } = bodyValidation.data;

		// Verify question exists
		const questionExists = await isValidGlobalIndex(globalIndex);

		if (!questionExists) {
			throw error(404, `Question with global index ${globalIndex} not found`);
		}

		// Load original question for hash generation
		const originalQuestion = await loadQuestionByIndex(globalIndex);
		if (!originalQuestion) {
			throw error(404, `Original question not found for index ${globalIndex}`);
		}

		// Generate hash from original question
		const questionHash = generateStableQuestionHash(originalQuestion);

		// Find or create migration_tracking record for this question
		const { data: trackingRecord, error: trackingQueryError } = await locals.supabase
			.from('migration_tracking')
			.select('id')
			.eq('old_question_hash', questionHash)
			.single();

		if (trackingQueryError && trackingQueryError.code !== 'PGRST116') {
			// PGRST116 = no rows returned
			console.error('Error querying migration_tracking:', trackingQueryError);
			throw error(500, 'Database error while looking up tracking record');
		}

		let trackingId: string;

		if (trackingRecord) {
			trackingId = trackingRecord.id;
		} else {
			// Create a new tracking record if none exists
			const description = originalQuestion.description || `Question #${globalIndex}`;
			const { data: newTracking, error: insertError } = await locals.supabase
				.from('migration_tracking')
				.insert({
					old_question_hash: questionHash,
					old_question_index: globalIndex,
					old_description: description.slice(0, 500),
					migration_status: 'converted',
					phase: 4
				})
				.select('id')
				.single();

			if (insertError || !newTracking) {
				console.error('Error creating migration_tracking record:', insertError);
				throw error(500, 'Failed to create tracking record');
			}

			trackingId = newTracking.id;
		}

		// Upsert the edit record (one edit per question hash)
		const { data: editRecord, error: upsertError } = await locals.supabase
			.from('migration_edits')
			.upsert(
				{
					migration_tracking_id: trackingId,
					old_question_hash: questionHash,
					edited_json: editedTransformed,
					editor_id: locals.profile.id,
					edit_notes: notes || null
				},
				{
					onConflict: 'old_question_hash'
				}
			)
			.select('id, created_at, updated_at')
			.single();

		if (upsertError || !editRecord) {
			console.error('Error upserting migration_edits:', upsertError);
			throw error(500, 'Failed to save edit');
		}

		return json({
			success: true,
			message: 'Edit saved',
			data: {
				globalIndex,
				editId: editRecord.id,
				editedBy: locals.profile.id,
				editedAt: editRecord.updated_at || editRecord.created_at
			}
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Log and return generic error
		console.error('Error saving question edit:', err);
		throw error(500, 'Failed to save edit');
	}
};
