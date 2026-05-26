/**
 * Kanban validation schemas
 * =========================
 *
 * Zod schemas covering all input boundaries of /api/organisation/kanban/*.
 * Numeric / length bounds mirror DB CHECK constraints (see migration
 * `20260526190624_create_kanban_tables.sql`). `class_id` is intentionally
 * EXCLUDED from update schemas — boards cannot be moved between classes
 * post-creation (see KanbanBoardUpdate doc-comment in database-helpers.ts).
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';

// ----------------------------------------------------------------------------
// Primitives
// ----------------------------------------------------------------------------

/** Shared UUID schema with a clear FR error message. */
export const kanbanUuidSchema = z.string().uuid('Identifiant invalide');

/**
 * Validate a route param expected to be a Kanban entity UUID. Throws a 400
 * with a French message tailored to the entity kind on failure.
 */
export function parseKanbanId(
	raw: string | undefined,
	kind: 'tableau' | 'colonne' | 'carte'
): string {
	const parsed = kanbanUuidSchema.safeParse(raw);
	if (!parsed.success) {
		throw error(400, `Identifiant de ${kind} invalide`);
	}
	return parsed.data;
}

/**
 * Query parameters for `GET /api/organisation/kanban/boards`.
 *
 * `limit` is clamped to [1, 200] by the underlying RPC; the schema also
 * enforces the range so we 400 explicitly on invalid client input.
 * `cursor` is the `updated_at` ISO string of the last board from the previous
 * page (sort is DESC, so the next page contains boards strictly older).
 */
export const listBoardsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).optional(),
	cursor: z.string().datetime({ message: 'Curseur invalide' }).optional()
});

// ----------------------------------------------------------------------------
// Boards
// ----------------------------------------------------------------------------

/**
 * POST /api/organisation/kanban/boards
 *
 * `class_id` is optional / nullable: when absent or null the board is created
 * as a personal board owned by the calling user. When provided, the user must
 * be the teacher of that class (verified server-side, on top of RLS).
 */
export const createBoardSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200 caractères)'),
	class_id: kanbanUuidSchema.nullable().optional()
});

/**
 * PATCH /api/organisation/kanban/boards/[boardId]
 *
 * `class_id` and `owner_id` intentionally excluded — both are immutable
 * post-creation (changing class_id would silently shift access).
 */
export const updateBoardSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200 caractères)')
});

// ----------------------------------------------------------------------------
// Columns
// ----------------------------------------------------------------------------

/**
 * POST /api/organisation/kanban/boards/[boardId]/columns
 *
 * Position is provided by the client (fractional indexing). It must be finite
 * (rules out Infinity / NaN). We do NOT clamp to a range — fractional indices
 * naturally span the full DOUBLE PRECISION space, and the client is the one
 * picking values mid-way between siblings.
 */
export const createColumnSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(100, 'Titre trop long (max 100 caractères)'),
	position: z.number().finite('Position invalide')
});

/**
 * PATCH /api/organisation/kanban/columns/[columnId]
 *
 * Allows renaming OR repositioning (or both). At least one field is required.
 */
export const updateColumnSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, 'Titre requis')
			.max(100, 'Titre trop long (max 100 caractères)')
			.optional(),
		position: z.number().finite('Position invalide').optional()
	})
	.refine((d) => d.title !== undefined || d.position !== undefined, {
		message: 'Au moins un champ doit être fourni (title ou position)'
	});

// ----------------------------------------------------------------------------
// Cards
// ----------------------------------------------------------------------------

/**
 * Optional due date for a card. Accepts an ISO-8601 datetime string or null.
 * Stored as TIMESTAMPTZ in Postgres; the UI treats it as a calendar date and
 * sets the time component to 00:00:00 UTC, but we don't enforce that here.
 */
const dueDateSchema = z
	.string()
	.datetime({ message: 'Date invalide (format ISO 8601 attendu)' })
	.nullable()
	.optional();

/**
 * POST /api/organisation/kanban/columns/[columnId]/cards
 *
 * `description` may be omitted, null, or a string up to 50000 chars (ubumark
 * payload). No HTML sanitisation here — rendering is done client-side via the
 * ubumark renderer which is XSS-safe by design.
 *
 * `due_date` is optional and nullable. See dueDateSchema above.
 */
export const createCardSchema = z.object({
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long (max 200 caractères)'),
	description: z
		.string()
		.max(50000, 'Description trop longue (max 50000 caractères)')
		.nullable()
		.optional(),
	position: z.number().finite('Position invalide'),
	due_date: dueDateSchema
});

/**
 * PATCH /api/organisation/kanban/cards/[cardId]
 *
 * Edit fields and/or move (`column_id` + `position`).
 *
 * Cross-field rules:
 *   - At least one field must be provided.
 *   - When `column_id` is provided, `position` MUST also be provided. Moving
 *     without a position would land the card in indeterminate order.
 *
 * (Moving cross-board is forbidden at the API layer — checked in the handler
 * by looking up board_id of source vs destination column.)
 */
export const updateCardSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, 'Titre requis')
			.max(200, 'Titre trop long (max 200 caractères)')
			.optional(),
		description: z
			.string()
			.max(50000, 'Description trop longue (max 50000 caractères)')
			.nullable()
			.optional(),
		column_id: kanbanUuidSchema.optional(),
		position: z.number().finite('Position invalide').optional(),
		due_date: dueDateSchema
	})
	.refine(
		(d) =>
			d.title !== undefined ||
			d.description !== undefined ||
			d.column_id !== undefined ||
			d.position !== undefined ||
			d.due_date !== undefined,
		{ message: 'Au moins un champ doit être fourni' }
	)
	.refine((d) => !(d.column_id !== undefined && d.position === undefined), {
		message: 'Un déplacement requiert column_id ET position'
	});

// ----------------------------------------------------------------------------
// Inferred types (handy for handlers / service layer)
// ----------------------------------------------------------------------------

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
