/**
 * Kanban Server Utilities
 * =======================
 *
 * Server-side helpers for the kanban_boards / kanban_columns / kanban_cards
 * stack. Authorization is enforced by RLS at the DB level (see migration
 * `20260526190624_create_kanban_tables.sql`), but the API layer also runs
 * explicit checks via the `assertBoard*` helpers below so we can surface
 * clear 403/404 responses rather than RLS silently filtering rows.
 *
 * All functions take a SupabaseClient parameter so they can be used from
 * either the user-scoped request client (`locals.supabase`) or the service-
 * role client when needed.
 */

import { json, error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { RateLimitResult } from '$lib/server/rateLimiter';
import type {
	KanbanBoard,
	KanbanBoardWithCounts,
	KanbanColumn,
	KanbanCard
} from '$lib/types/database-helpers';

type AnySupabase = SupabaseClient<Database>;

// ============================================================================
// Composite return shapes
// ============================================================================

/** Board with nested columns (each with its cards), all sorted by position. */
export interface KanbanBoardWithContent extends KanbanBoard {
	columns: KanbanColumnWithCards[];
}

/** Column with its cards sorted by position. */
export interface KanbanColumnWithCards extends KanbanColumn {
	cards: KanbanCard[];
}

// ============================================================================
// Rate-limit helper
// ============================================================================

/**
 * If the rate-limit check failed, build a 429 Response and return it. Caller
 * is expected to `return` the result immediately so the endpoint short-
 * circuits. We return a Response rather than `throw error()` because
 * SvelteKit's error envelope doesn't carry a `Retry-After` header, which is
 * the whole point of a 429.
 */
export function rateLimitResponse(result: RateLimitResult): Response | null {
	if (result.allowed) return null;
	return json(
		{ message: result.message ?? 'Trop de requêtes' },
		{
			status: 429,
			headers: { 'Retry-After': result.retryAfter?.toString() ?? '3600' }
		}
	);
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Pagination shape for the boards list. The cursor is the `updated_at`
 * ISO string of the last item on the previous page (we sort DESC, so the next
 * page starts at boards strictly older than the cursor).
 */
export interface BoardsPage {
	boards: KanbanBoardWithCounts[];
	nextCursor: string | null;
}

/**
 * Default page size for `getAccessibleBoards`. The RPC clamps to [1, 200];
 * 100 strikes a balance between one-shot UX (most users have well under that)
 * and avoiding huge payloads if a user accumulates many boards over years.
 */
export const DEFAULT_BOARDS_PAGE_SIZE = 100;

/**
 * Fetch a page of boards the calling user can see, with column / card counts.
 * Visibility is enforced by RLS inside the underlying RPC (perso = owner
 * only, class = teacher + class members), sorted by `updated_at DESC` with a
 * stable `id DESC` tie-break for deterministic pagination.
 *
 * `cursor` is the `updated_at` of the last board from the previous page; pass
 * `null` for the first page. `nextCursor` is null when the page wasn't full
 * (i.e. no more boards to fetch).
 */
export async function getAccessibleBoards(
	supabase: AnySupabase,
	options: { limit?: number; cursor?: string | null } = {}
): Promise<BoardsPage> {
	const limit = options.limit ?? DEFAULT_BOARDS_PAGE_SIZE;
	const cursor = options.cursor ?? null;

	const { data, error: dbError } = await supabase.rpc('get_accessible_kanban_boards', {
		p_limit: limit,
		p_cursor: cursor
	});

	if (dbError) {
		console.error('[kanban] getAccessibleBoards failed:', dbError);
		throw error(500, 'Erreur lors du chargement des tableaux');
	}

	type Row = {
		id: string;
		owner_id: string;
		class_id: string | null;
		title: string;
		created_at: string;
		updated_at: string;
		column_count: number | string;
		card_count: number | string;
	};

	const rows = (data ?? []) as Row[];

	const boards: KanbanBoardWithCounts[] = rows.map((row) => ({
		id: row.id,
		owner_id: row.owner_id,
		class_id: row.class_id,
		title: row.title,
		created_at: row.created_at,
		updated_at: row.updated_at,
		// Counts come back as bigint → number|string depending on driver.
		column_count: Number(row.column_count) || 0,
		card_count: Number(row.card_count) || 0
	}));

	// A full page means there might be more; an under-full page is the last.
	const nextCursor =
		boards.length === limit && boards.length > 0 ? boards[boards.length - 1].updated_at : null;

	return { boards, nextCursor };
}

/**
 * Fetch a single board with its columns and cards, both already sorted by
 * `position ASC`. Returns null when the board doesn't exist OR is invisible to
 * the calling user (RLS).
 */
export async function getBoardWithContent(
	supabase: AnySupabase,
	boardId: string
): Promise<KanbanBoardWithContent | null> {
	const { data, error: dbError } = await supabase
		.from('kanban_boards')
		.select(
			`
			id,
			owner_id,
			class_id,
			title,
			created_at,
			updated_at,
			columns:kanban_columns(
				id,
				board_id,
				title,
				position,
				created_at,
				cards:kanban_cards(
					id,
					column_id,
					title,
					description,
					position,
					due_date,
					created_at,
					updated_at
				)
			)
		`
		)
		.eq('id', boardId)
		// PostgREST nested ordering: sort columns by position, and cards within
		// each column also by position. Indexes (column_id, position) and
		// (board_id, position) added in 20260527000101 keep this O(log n).
		.order('position', { referencedTable: 'kanban_columns' })
		.order('position', { referencedTable: 'kanban_columns.kanban_cards' })
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] getBoardWithContent failed:', dbError);
		throw error(500, 'Erreur lors du chargement du tableau');
	}

	if (!data) return null;

	return data as unknown as KanbanBoardWithContent;
}

/**
 * Fetch a column's `board_id`, or null when invisible / missing. Used by
 * cross-board move guards.
 */
export async function getColumnBoardId(
	supabase: AnySupabase,
	columnId: string
): Promise<string | null> {
	const { data, error: dbError } = await supabase
		.from('kanban_columns')
		.select('board_id')
		.eq('id', columnId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] getColumnBoardId failed:', dbError);
		throw error(500, 'Erreur lors de la lecture de la colonne');
	}

	const row = data as { board_id: string } | null;
	return row?.board_id ?? null;
}

/**
 * Fetch a card's `column_id`, or null when invisible / missing.
 */
export async function getCardColumnId(
	supabase: AnySupabase,
	cardId: string
): Promise<string | null> {
	const { data, error: dbError } = await supabase
		.from('kanban_cards')
		.select('column_id')
		.eq('id', cardId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] getCardColumnId failed:', dbError);
		throw error(500, 'Erreur lors de la lecture de la carte');
	}

	const row = data as { column_id: string } | null;
	return row?.column_id ?? null;
}

// ============================================================================
// Authorization helpers (defensive checks on top of RLS)
// ============================================================================

/**
 * Throws 404 if the board doesn't exist OR is invisible to the user.
 * Throws 403 if it exists / is visible but the user is not the owner.
 * Returns the loaded board on success.
 */
export async function assertBoardOwner(
	supabase: AnySupabase,
	boardId: string,
	userId: string
): Promise<KanbanBoard> {
	const { data, error: dbError } = await supabase
		.from('kanban_boards')
		.select('id, owner_id, class_id, title, created_at, updated_at')
		.eq('id', boardId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] assertBoardOwner failed:', dbError);
		throw error(500, 'Erreur lors de la vérification du propriétaire');
	}

	if (!data) {
		throw error(404, 'Tableau introuvable');
	}

	const board = data as unknown as KanbanBoard;
	if (board.owner_id !== userId) {
		throw error(403, 'Action réservée au propriétaire du tableau');
	}

	return board;
}

/**
 * Throws 404 if the board doesn't exist OR is invisible to the user. Returns
 * the loaded board on success. Use when the action only requires read-level
 * access (e.g. creating a card on a board the user is a member of).
 */
export async function assertBoardAccess(
	supabase: AnySupabase,
	boardId: string
): Promise<KanbanBoard> {
	const { data, error: dbError } = await supabase
		.from('kanban_boards')
		.select('id, owner_id, class_id, title, created_at, updated_at')
		.eq('id', boardId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] assertBoardAccess failed:', dbError);
		throw error(500, 'Erreur lors de la vérification du tableau');
	}

	if (!data) {
		throw error(404, 'Tableau introuvable');
	}

	return data as unknown as KanbanBoard;
}

/**
 * Verify that `userId` is the teacher of `classId`. Returns true/false; the
 * handler decides whether to throw 403 (when creating a class board) or
 * return a different code (e.g. 404 to mask existence).
 */
export async function isClassTeacher(
	supabase: AnySupabase,
	classId: string,
	userId: string
): Promise<boolean> {
	const { data, error: dbError } = await supabase
		.from('classes')
		.select('teacher_id')
		.eq('id', classId)
		.maybeSingle();

	if (dbError) {
		console.error('[kanban] isClassTeacher failed:', dbError);
		throw error(500, 'Erreur lors de la vérification de la classe');
	}

	if (!data) return false;
	return (data as { teacher_id: string }).teacher_id === userId;
}
