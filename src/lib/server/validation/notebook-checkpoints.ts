/**
 * Notebook Checkpoint Runs validation schemas
 *
 * Zod schemas for the POST /api/python-notebooks/[id]/checkpoint-runs endpoint.
 * One row per (notebook_id, user_id, cell_id) — the API upserts the latest run.
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum length of a captured error message. */
export const MAX_ERROR_MESSAGE_LENGTH = 5000;

/** Maximum length of a cell ID (UUID-like string generated client-side). */
export const MAX_CELL_ID_LENGTH = 100;

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

/** Checkpoint run status — matches the DB CHECK constraint. */
export const checkpointStatusSchema = z.enum(['passed', 'failed']);

// =============================================================================
// CREATE / UPSERT SCHEMA
// =============================================================================

/**
 * Schema for upserting a checkpoint run.
 *
 * The API path provides `notebook_id`; the auth context provides `user_id`.
 * Body carries `cell_id`, `status`, and the optional `error_message`.
 *
 * Refinement: `error_message` MUST be absent when `status === 'passed'` and
 * MUST be present (non-empty) when `status === 'failed'`. This mirrors what
 * the UI assumes and avoids storing dangling text after a successful retry.
 */
export const upsertCheckpointRunSchema = z
	.object({
		cell_id: z.string().min(1).max(MAX_CELL_ID_LENGTH),
		status: checkpointStatusSchema,
		error_message: z.string().min(1).max(MAX_ERROR_MESSAGE_LENGTH).optional()
	})
	.refine((data) => data.status === 'failed' || data.error_message === undefined, {
		message: 'error_message is only allowed when status is failed',
		path: ['error_message']
	})
	.refine((data) => data.status === 'passed' || data.error_message !== undefined, {
		message: 'error_message is required when status is failed',
		path: ['error_message']
	});

export type UpsertCheckpointRunInput = z.infer<typeof upsertCheckpointRunSchema>;
export type CheckpointStatusInput = z.infer<typeof checkpointStatusSchema>;
